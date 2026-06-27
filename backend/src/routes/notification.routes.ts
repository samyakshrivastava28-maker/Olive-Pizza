import { Router, Request, Response } from 'express';
import { adminDb as db } from '../config/firebase.js';
import * as admin from 'firebase-admin';
import { notificationScheduler } from '../services/notification/NotificationScheduler';
import { NotificationTemplates } from '../services/notification/NotificationTemplates';
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
    const { title, body, audience } = req.body;
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
    
    // Collect all valid FCM tokens
    const tokens: string[] = [];
    usersSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.fcmTokens && Array.isArray(data.fcmTokens)) {
        tokens.push(...data.fcmTokens);
      }
    });

    if (tokens.length === 0) {
      res.json({ success: true, sentCount: 0, message: 'No registered devices found for this audience' });
      return;
    }

    // Batch send via Firebase Admin
    const message = {
      notification: { title, body },
      data: { url: '/', source: 'owner_broadcast' },
      tokens: tokens,
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    
    console.log(`[NotificationRoutes] Broadcast sent: ${response.successCount} successful, ${response.failureCount} failed.`);
    
    // Optionally: prune failed tokens here (e.g., if error.code === 'messaging/invalid-registration-token')

    res.json({
      success: true,
      sentCount: response.successCount,
      failedCount: response.failureCount
    });
  } catch (error: any) {
    console.error('[NotificationRoutes] Error sending custom push:', error);
    res.status(500).json({ error: 'Failed to send notification', details: error.message });
  }
});

export default router;
