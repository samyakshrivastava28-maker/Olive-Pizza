import { Router, Request, Response } from 'express';
import { query } from '../lib/db.js';

const router = Router();

// Get all available menu items
router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await query('SELECT * FROM menu_items WHERE is_available = true ORDER BY category, name');
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
    res.status(500).json({ error: 'Failed to fetch menu' });
  }
});

export default router;
