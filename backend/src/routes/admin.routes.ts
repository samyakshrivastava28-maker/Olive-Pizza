import { Router, Request, Response } from 'express';
import { query } from '../lib/db.js';
import { verifyToken, requireRole, AuthRequest } from '../middleware/auth.middleware.js';
import { adminDb, adminMessaging } from '../config/firebase.js';
import { supabase } from '../lib/supabase.js';

const router = Router();

// Secure middleware sequence: Must have valid token AND role must be 'owner'
router.use(verifyToken);
router.use(requireRole(['owner']));

// --- DEPLOYMENT CENTER ---
router.post('/deploy', async (req: AuthRequest, res: Response) => {
  try {
    const { version, minimumVersion, mode, releaseNotes } = req.body;
    
    // 1. Update Settings in Supabase
    const { error: dbError } = await supabase
      .from('app_update_settings')
      .update({
        latest_version: version,
        minimum_version: minimumVersion,
        update_mode: mode,
        release_notes: releaseNotes,
        last_deployment_time: new Date().toISOString()
      })
      .eq('id', 1);

    if (dbError) throw dbError;

    // 2. Fetch all users with FCM tokens
    const usersSnapshot = await adminDb.collection('users')
      .where('notificationEnabled', '==', true)
      .get();

    let tokens: string[] = [];
    usersSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.fcmTokens && Array.isArray(data.fcmTokens)) {
        tokens.push(...data.fcmTokens);
      }
    });

    let successCount = 0;
    let failureCount = 0;

    // 3. Broadcast FCM Message (Multicast max 500 per batch)
    if (tokens.length > 0) {
      // deduplicate tokens
      tokens = [...new Set(tokens)];
      
      const payload = {
        data: {
          type: 'APP_UPDATE',
          version: version,
          mode: mode || 'optional',
          releaseNotes: releaseNotes || ''
        }
      };

      // Split into batches of 500
      for (let i = 0; i < tokens.length; i += 500) {
        const batchTokens = tokens.slice(i, i + 500);
        const response = await adminMessaging.sendEachForMulticast({
          tokens: batchTokens,
          ...payload,
          // Optional: Add notification payload if we want OS-level banners while closed
          // notification: {
          //   title: '🚀 Olive Pizza Update Available',
          //   body: 'A new version of Olive Pizza is ready. Tap to update.'
          // }
        });
        successCount += response.successCount;
        failureCount += response.failureCount;
      }
    }

    res.json({ 
      success: true, 
      message: 'Deployment successful', 
      stats: { targetedDevices: tokens.length, successCount, failureCount } 
    });
  } catch (error) {
    console.error("Deployment failed:", error);
    res.status(500).json({ error: 'Deployment failed' });
  }
});

// --- MENU MANAGEMENT ---

// Get all menu items (including unavailable ones) for admin
router.get('/menu', async (req: AuthRequest, res: Response) => {
  try {
    const result = await query('SELECT * FROM menu_items ORDER BY category, name');
    res.json(result.rows.map(item => ({
      id: item.id,
      name: item.name,
      description: item.description,
      basePrice: Number(item.base_price),
      category: item.category,
      image: item.image_url,
      isVegetarian: item.is_vegetarian,
      isSpicy: item.is_spicy,
      isAvailable: item.is_available,
      variants: item.variants || [],
      crusts: item.crusts || [],
      addons: item.addons || []
    })));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch menu items' });
  }
});

// Add new menu item
router.post('/menu', async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, basePrice, category, imageUrl, isVegetarian, isSpicy, isAvailable, variants, crusts, addons } = req.body;
    const sql = `
      INSERT INTO menu_items (name, description, base_price, category, image_url, is_vegetarian, is_spicy, is_available, variants, crusts, addons)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id;
    `;
    const result = await query(sql, [
      name, description, basePrice, category, imageUrl, 
      isVegetarian, isSpicy, isAvailable, 
      JSON.stringify(variants || []), 
      JSON.stringify(crusts || []), 
      JSON.stringify(addons || [])
    ]);
    
    res.status(201).json({ id: result.rows[0].id, message: 'Menu item created' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create menu item' });
  }
});

// Update menu item availability or details
router.put('/menu/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, basePrice, category, imageUrl, isVegetarian, isSpicy, isAvailable, variants, crusts, addons } = req.body;
    const sql = `
      UPDATE menu_items 
      SET name = COALESCE($1, name),
          description = COALESCE($2, description),
          base_price = COALESCE($3, base_price),
          category = COALESCE($4, category),
          image_url = COALESCE($5, image_url),
          is_vegetarian = COALESCE($6, is_vegetarian),
          is_spicy = COALESCE($7, is_spicy),
          is_available = COALESCE($8, is_available),
          variants = COALESCE($9, variants),
          crusts = COALESCE($10, crusts),
          addons = COALESCE($11, addons)
      WHERE id = $12
    `;
    await query(sql, [
      name, description, basePrice, category, imageUrl, 
      isVegetarian, isSpicy, isAvailable, 
      variants ? JSON.stringify(variants) : null,
      crusts ? JSON.stringify(crusts) : null,
      addons ? JSON.stringify(addons) : null,
      id
    ]);
    res.json({ message: 'Menu item updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update menu item' });
  }
});

// Delete menu item
router.delete('/menu/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM menu_items WHERE id = $1', [id]);
    res.json({ message: 'Menu item deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete menu item' });
  }
});

// --- ORDER MANAGEMENT ---

// Get all orders (recent first)
router.get('/orders', async (req: AuthRequest, res: Response) => {
  try {
    const result = await query('SELECT * FROM orders ORDER BY created_at DESC LIMIT 50');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Update order status (accept, prepare, dispatch)
router.patch('/orders/:id/status', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, deliveryPartnerId } = req.body;
    
    if (deliveryPartnerId) {
      await query('UPDATE orders SET status = $1, delivery_partner_id = $2, updated_at = NOW() WHERE id = $3', [status, deliveryPartnerId, id]);
    } else {
      await query('UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2', [status, id]);
    }

    res.json({ message: `Order status updated to ${status}` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

export default router;
