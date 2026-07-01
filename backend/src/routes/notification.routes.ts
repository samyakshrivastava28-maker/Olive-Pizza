import { Router, Request, Response } from 'express';
import { adminDb as db } from '../config/firebase.js';
import * as admin from 'firebase-admin';
import { notificationScheduler } from '../services/notification/NotificationScheduler.js';
import { NotificationTemplates } from '../services/notification/NotificationTemplates.js';
import { notificationDebugger } from '../services/notification/NotificationDebugger.js';
import { verifyToken } from '../middleware/auth.middleware.js';

const router = Router();

/**
 * Handle notification action button clicks from Service Worker
 */
router.post('/action', verifyToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId, action, currentStage } = req.body;
    const userId = (req as any).user.uid;

    if (!orderId || !action || !currentStage) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const orderRef = db.collection('orders').doc(orderId);
    const orderDoc = await orderRef.get();

    if (!orderDoc.exists) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    const orderData = orderDoc.data()!;
    let newStatus = orderData.status;

    console.log(`[NotificationAction] User ${userId} triggered ${action} on order ${orderId} from stage ${currentStage}`);

    // State Machine Transitions
    if (currentStage === 'new_order') {
      if (action === 'accept') {
        newStatus = 'accepted';
        await notificationScheduler.stopAlarm(orderId, 'new_order');
        
        // Trigger next stage: Kitchen Control
        const payload = NotificationTemplates.kitchenControl(orderId, {
          customerName: orderData.customerInfo?.name || 'Customer',
          prepTime: '15'
        });
        // Send to owner immediately (just an example, normally we'd target all owners)
        await notificationScheduler.sendToUser(userId, payload);
      } else if (action === 'reject') {
        newStatus = 'cancelled';
        await notificationScheduler.stopAlarm(orderId, 'new_order');
      }
    } 
    else if (currentStage === 'kitchen_control') {
      if (action === 'start_cooking') {
        newStatus = 'preparing';
        
        // Trigger next stage: Assign Delivery
        const payload = NotificationTemplates.assignDelivery(orderId, {
          customerName: orderData.customerInfo?.name || 'Customer',
          availableCount: 3 // Mock count
        });
        await notificationScheduler.sendToUser(userId, payload);
      }
    }
    else if (currentStage === 'assign_delivery') {
      // Typically the 'assign' action would include a partnerId
      const partnerId = req.body.partnerId;
      if (action === 'assign' && partnerId) {
        newStatus = 'partner_assigned';
        await orderRef.update({ deliveryPartnerId: partnerId });
        
        // Trigger Delivery Partner Alarm
        const payload = NotificationTemplates.deliveryAssigned(orderId, {
          distance: '2.5 km',
          paymentMethod: orderData.paymentMethod || 'Online'
        });
        await notificationScheduler.startAlarm(orderId, partnerId, payload, 'delivery_assigned');
      }
    }
    else if (currentStage === 'delivery_assigned') {
      // Must be delivery partner
      if (orderData.deliveryPartnerId !== userId) {
         res.status(403).json({ error: 'Unauthorized' });
         return;
      }

      if (action === 'accept') {
        await notificationScheduler.stopAlarm(orderId, 'delivery_assigned');
        // Next stage
        const payload = NotificationTemplates.navigateToRestaurant(orderId, {
          restaurantAddress: 'Olive Pizza Main St'
        });
        await notificationScheduler.sendToUser(userId, payload);
      } else if (action === 'reject') {
        await notificationScheduler.stopAlarm(orderId, 'delivery_assigned');
        await orderRef.update({ deliveryPartnerId: null });
        newStatus = 'ready'; // Revert status so owner can reassign
      }
    }
    else if (currentStage === 'navigate_restaurant' && action === 'arrived') {
      const payload = NotificationTemplates.arrivedRestaurant(orderId, {
        customerName: orderData.customerInfo?.name || 'Customer'
      });
      await notificationScheduler.sendToUser(userId, payload);
    }
    else if (currentStage === 'arrived_restaurant' && action === 'picked_up') {
      newStatus = 'picked_up';
      const payload = NotificationTemplates.startDelivery(orderId, {
        deliveryAddress: orderData.deliveryAddress?.addressLine || 'Customer Address'
      });
      await notificationScheduler.sendToUser(userId, payload);
    }
    else if (currentStage === 'start_delivery' && action === 'arrived_customer') {
      const payload = NotificationTemplates.arrivedCustomer(orderId, {
        customerName: orderData.customerInfo?.name || 'Customer'
      });
      await notificationScheduler.sendToUser(userId, payload);
    }
    else if (currentStage === 'arrived_customer' && action === 'delivered') {
      newStatus = 'delivered';
      await orderRef.update({ deliveredAt: new Date().toISOString() });
    }

    // Update the final status in Firestore
    if (newStatus !== orderData.status) {
      await orderRef.update({ 
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
    }

    res.json({ success: true, newStatus });
  } catch (error) {
    console.error('[NotificationRoutes] Error processing action:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Handle custom push notifications from Owner Dashboard
 */
router.post('/send-custom', verifyToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, body, audience, type, category, schedule } = req.body;
    const userId = (req as any).user.uid;

    // Verify owner role
    const ownerDoc = await db.collection('users').doc(userId).get();
    if (!ownerDoc.exists || ownerDoc.data()?.role !== 'owner') {
      res.status(403).json({ error: 'Unauthorized: Owner access required' });
      return;
    }

    if (!title || !body) {
      res.status(400).json({ error: 'Title and body are required' });
      return;
    }

    // Fetch targets based on audience
    let usersQuery: FirebaseFirestore.Query = db.collection('users');
    
    if (audience === 'customers') {
      usersQuery = usersQuery.where('role', '==', 'customer');
    } else if (audience === 'delivery') {
      usersQuery = usersQuery.where('role', '==', 'delivery_partner');
    }

    const usersSnapshot = await usersQuery.get();
    let queuedCount = 0;

    const payload = {
      notification: { title, body },
      data: { url: '/', source: 'owner_broadcast' }
    };

    // Async processing for each user to track individual status
    const promises = usersSnapshot.docs.map(doc => {
      queuedCount++;
      // We will let NotificationScheduler handle the logging per user
      return notificationScheduler.sendToUser(doc.id, payload, category || 'custom');
    });

    // Fire and forget so we don't block the request if there are thousands
    Promise.allSettled(promises).catch(console.error);

    res.json({
      success: true,
      message: `Notification queued for ${queuedCount} users.`
    });
  } catch (error: any) {
    console.error('[NotificationRoutes] Error sending custom push:', error);
    res.status(500).json({ error: 'Failed to send notification', details: error.message });
  }
});

/**
 * Public: Track notification opens/clicks from Service Worker or Client
 */
router.post('/track', async (req: Request, res: Response): Promise<void> => {
  try {
    const { notificationId, stage } = req.body; // stage: 'Delivered', 'Opened', 'Clicked'
    if (notificationId && stage) {
       await notificationDebugger.updateStage(notificationId, stage as any);
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Owner: Retry Failed Notifications
 */
router.post('/retry-failed', verifyToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.uid;
    const ownerDoc = await db.collection('users').doc(userId).get();
    if (ownerDoc.data()?.role !== 'owner') {
      res.status(403).json({ error: 'Unauthorized' });
      return;
    }

    // Query failed notifications
    const failedSnapshot = await db.collection('notification_history')
      .where('status', '==', 'failed')
      .get();
    
    let retriedCount = 0;
    const promises = failedSnapshot.docs.map(async (doc) => {
      const data = doc.data();
      const payload = {
        notification: { title: data.title, body: data.body },
        data: { source: 'retry' }
      };
      retriedCount++;
      // Clean up old log and send new one
      await doc.ref.delete();
      return notificationScheduler.sendToUser(data.userId, payload, data.category);
    });

    Promise.allSettled(promises).catch(console.error);
    res.json({ success: true, message: `Retrying ${retriedCount} notifications.` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Owner: Delete Notification Log
 */
router.delete('/log/:id', verifyToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.uid;
    const ownerDoc = await db.collection('users').doc(userId).get();
    if (ownerDoc.data()?.role !== 'owner') {
      res.status(403).json({ error: 'Unauthorized' });
      return;
    }
    
    await db.collection('notification_history').doc(req.params.id).delete();
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Owner: Delete History (Today or Yesterday)
 */
router.post('/clear-history', verifyToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.uid;
    const { timeRange } = req.body; // 'today' or 'yesterday'
    
    const ownerDoc = await db.collection('users').doc(userId).get();
    if (ownerDoc.data()?.role !== 'owner') {
      res.status(403).json({ error: 'Unauthorized' });
      return;
    }

    const now = new Date();
    let startTime, endTime;
    
    if (timeRange === 'today') {
      startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      endTime = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
    } else if (timeRange === 'yesterday') {
      startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toISOString();
      endTime = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    } else {
      res.status(400).json({ error: 'Invalid timeRange' });
      return;
    }

    const snapshot = await db.collection('notification_history')
      .where('timestamp', '>=', startTime)
      .where('timestamp', '<', endTime)
      .get();
      
    const batch = db.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();

    res.json({ success: true, deleted: snapshot.size });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
