import { Router, Request, Response } from 'express';
import { query } from '../lib/db.js';
import { verifyToken, AuthRequest } from '../middleware/auth.middleware.js';
import { adminDb } from '../config/firebase.js';
import { OwnerTemplates, CustomerTemplates } from '../services/notification/NotificationTemplates.js';
import { notificationQueue } from '../services/notification/NotificationQueueService.js';
import { orderEventService } from '../services/order/OrderEventService.js';
import { queueEmail } from '../services/email.service.js';
import { buildOrderStatusEmail } from '../services/emailTemplates.service.js';

const router = Router();

// Get orders for logged in user
router.get('/', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.uid;
    const result = await query(`
      SELECT o.* FROM orders o 
      JOIN users u ON o.user_id = u.id 
      WHERE u.firebase_uid = $1 
      ORDER BY o.created_at DESC
    `, [userId]);
    res.json(result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      status: row.status,
      totalAmount: Number(row.total_amount),
      deliveryFee: Number(row.delivery_fee),
      contactPhone: row.contact_phone,
      deliveryAddress: row.delivery_address,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    })));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Create a new order securely
router.post('/', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { items } = req.body;
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'Cart is empty' });
      return;
    }

    const userId = req.user?.uid;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // 1. Fetch user data
    const userResult = await query('SELECT * FROM users WHERE firebase_uid = $1', [userId]);
    const userData = userResult.rows[0];
    
    if (!userData || !userData.phone) {
      res.status(400).json({ error: 'Phone number missing. Please complete onboarding.' });
      return;
    }

    if (!userData.full_address) {
      res.status(400).json({ error: 'Delivery address missing. Please complete onboarding.' });
      return;
    }

    // 2. Validate prices
    let serverCalculatedTotal = 0;
    const validatedItems = [];

    for (const item of items) {
      const menuResult = await query('SELECT * FROM menu_items WHERE id = $1', [item.menuItemId]);
      if (menuResult.rows.length === 0) {
        res.status(400).json({ error: `Item ${item.name} no longer exists` });
        return;
      }
      const menuData = menuResult.rows[0];
      
      if (!menuData.is_available) {
        res.status(400).json({ error: `Item ${item.name} is currently unavailable` });
        return;
      }

      const itemPrice = Number(menuData.base_price);
      serverCalculatedTotal += itemPrice * item.quantity;

      validatedItems.push({
        menuItemId: item.menuItemId,
        name: menuData.name,
        price: itemPrice,
        quantity: item.quantity,
        size: item.size || 'regular',
        crust: item.crust || 'normal',
        image: menuData.image_url
      });
    }

    // 3. Create order in Postgres
    const orderInsertResult = await query(
      `INSERT INTO orders (user_id, status, total_amount, contact_phone, delivery_address_line, notification_version)
       VALUES ($1, 'pending', $2, $3, $4, 1)
       RETURNING id, created_at, updated_at`,
      [userData.id, serverCalculatedTotal, userData.phone, userData.full_address]
    );
    const newOrder = orderInsertResult.rows[0];

    // Insert order items
    for (const item of validatedItems) {
      await query(
        `INSERT INTO order_items (order_id, menu_item_id, quantity, size, crust, price_at_time)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [newOrder.id, item.menuItemId, item.quantity, item.size, item.crust, item.price]
      );
    }

    const shortId = newOrder.id.slice(-6).toUpperCase();
    const orderNumber = `OP-${shortId}`;

    // 4. Push Firestore document for real-time tracking
    try {
      await adminDb.collection('orders').doc(newOrder.id).set({
        id: newOrder.id,
        userId,
        items: validatedItems,
        totalAmount: serverCalculatedTotal,
        status: 'pending',
        notification_version: 1,
        deliveryAddress: { addressLine: userData.full_address, lat: userData.lat, lng: userData.lng },
        contactPhone: userData.phone,
        customerName: userData.name || 'Customer',
        daily_order_number: orderNumber,
        paymentMethod: 'COD',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    } catch (err) {
      console.warn('[Orders] Firestore sync failed (non-fatal):', err);
    }

    // 5. Emit canonical OrderEvent via OrderEventService
    try {
      const event = await orderEventService.emitNewOrder(newOrder.id);
      const eventId   = event?.eventId;
      const eventTimestamp = event?.eventTimestamp;

      // Push notification to all owners — critical wake-up
      const ownersSnap = await adminDb.collection('users').where('role', '==', 'owner').get();
      const ownerPayload = OwnerTemplates.newOrder(newOrder.id, {
        customerName: userData.name || 'Customer',
        orderNumber,
        totalAmount: serverCalculatedTotal,
        itemsCount: validatedItems.length,
        paymentMethod: 'COD',
        deliveryAddress: userData.full_address,
        phone: userData.phone,
        version: 1,
        eventId,
        previousStatus: undefined,
        eventTimestamp,
      });

      for (const ownerDoc of ownersSnap.docs) {
        notificationQueue.enqueue(
          ownerDoc.id,
          ownerPayload,
          'high',
          { tag: `order_owner_${newOrder.id}`, orderId: newOrder.id, category: 'order', priority: 'critical', version: 1 }
        ).catch(console.error);
      }

      // Customer push (persistent pinned tracker)
      if (userData.firebase_uid) {
        const customerPayload = CustomerTemplates.orderUpdate(newOrder.id, {
          orderNumber,
          totalAmount: serverCalculatedTotal,
          status: 'pending',
          version: 1,
          eventId,
          previousStatus: undefined,
          eventTimestamp,
        });
        notificationQueue.enqueue(
          userData.firebase_uid,
          customerPayload,
          'high',
          { tag: `order_customer_${newOrder.id}`, orderId: newOrder.id, category: 'order', version: 1 }
        ).catch(console.error);
      }
    } catch (pushErr) {
      console.error('[Orders] Push notification failed (non-blocking):', pushErr);
    }

    // 6. MANDATORY TRANSACTIONAL EMAIL — Order Placed (always sent, regardless of push)
    if (userData.email) {
      try {
        const subject = `Order Placed — #${orderNumber}`;
        const htmlBody = buildOrderStatusEmail({
          customerName: userData.name || 'Customer',
          subject,
          stage: 'pending',
          orderId: newOrder.id,
          data: {
            orderNumber,
            totalAmount: String(serverCalculatedTotal),
            paymentMethod: 'COD',
            deliveryAddress: userData.full_address,
          },
        });
        await queueEmail(userData.email, subject, htmlBody, 'transactional');
        console.log(`[Orders] 📧 Order Placed email queued → ${userData.email}`);
      } catch (emailErr) {
        console.error('[Orders] Order Placed email failed (non-blocking):', emailErr);
      }
    }

    res.status(201).json({ message: 'Order placed successfully', orderId: newOrder.id, orderNumber });
  } catch (error: any) {
    console.error('Order creation error:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

export default router;
