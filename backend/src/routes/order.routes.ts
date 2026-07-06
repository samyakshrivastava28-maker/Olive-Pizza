import { Router, Request, Response } from 'express';
import { query } from '../lib/db.js';
import { verifyToken, AuthRequest } from '../middleware/auth.middleware.js';
import { adminDb } from '../config/firebase.js';
import { OwnerTemplates, CustomerTemplates } from '../services/notification/NotificationTemplates.js';
import { notificationQueue } from '../services/notification/NotificationQueueService.js';


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

    // 1. Fetch user data for address and phone
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

    // 2. Validate Prices Against Server Database
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

      // Very simple price validation for Phase 4 (Assume base price)
      let itemPrice = Number(menuData.base_price);
      
      // Calculate total
      const lineTotal = itemPrice * item.quantity;
      serverCalculatedTotal += lineTotal;

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

    // 3. Create the order in Postgres
    const orderSql = `
      INSERT INTO orders (user_id, status, total_amount, contact_phone, delivery_address_line)
      VALUES ($1, 'pending', $2, $3, $4)
      RETURNING id, created_at, updated_at
    `;
    
    const orderInsertResult = await query(orderSql, [userData.id, serverCalculatedTotal, userData.phone, userData.full_address]);
    const newOrder = orderInsertResult.rows[0];

    // Insert order items
    for (const item of validatedItems) {
      await query(
        `INSERT INTO order_items (order_id, menu_item_id, quantity, size, crust, price_at_time) VALUES ($1, $2, $3, $4, $5, $6)`,
        [newOrder.id, item.menuItemId, item.quantity, item.size, item.crust, item.price]
      );
    }

    const orderData = {
      id: newOrder.id,
      userId,
      items: validatedItems,
      totalAmount: serverCalculatedTotal,
      status: 'pending',
      deliveryAddress: { addressLine: userData.full_address, lat: userData.lat, lng: userData.lng },
      contactPhone: userData.phone,
      createdAt: newOrder.created_at,
      updatedAt: newOrder.updated_at
    };

    // Push notification to all owners — no email
    try {
      const shortId = newOrder.id.slice(-6).toUpperCase();
      const ownersSnap = await adminDb.collection('users').where('role', '==', 'owner').get();
      const pushPayload = OwnerTemplates.newOrder(newOrder.id, {
        customerName: userData.name || 'Customer',
        orderNumber: shortId,
        totalAmount: serverCalculatedTotal,
        itemsCount: validatedItems.length,
        paymentMethod: 'COD',
        deliveryAddress: userData.full_address,
        phone: userData.phone,
        version: 1,
      });
      for (const ownerDoc of ownersSnap.docs) {
        notificationQueue.enqueue(
          ownerDoc.id,
          pushPayload,
          'high',
          { tag: `order_owner_${newOrder.id}`, orderId: newOrder.id, category: 'order', priority: 'critical', version: 1 }
        ).catch(console.error);
      }
      
      // Notify customer
      if (userData.firebase_uid) {
        const customerPayload = CustomerTemplates.orderUpdate(newOrder.id, {
          orderNumber: shortId,
          totalAmount: serverCalculatedTotal,
          status: 'pending',
          version: 1
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

    res.status(201).json({ message: 'Order placed successfully', orderId: newOrder.id });
  } catch (error: any) {
    console.error('Order creation error:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

export default router;
