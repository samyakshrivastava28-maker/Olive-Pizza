import { Router, Request, Response } from 'express';
import { adminDb } from '../config/firebase.js';

const router = Router();

// Get all available menu items
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const snapshot = await adminDb.collection('menu_items')
      .where('isAvailable', '==', true)
      .get();
      
    const items = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        description: data.description,
        basePrice: Number(data.basePrice),
        category: data.category,
        image: data.image,
        isVegetarian: data.isVegetarian || false,
        isSpicy: data.isSpicy || false,
        isAvailable: data.isAvailable || false,
        variants: data.variants || [],
        crusts: data.crusts || [],
        addons: data.addons || []
      };
    });
    
    // Sort by category, then name
    items.sort((a, b) => {
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }
      return a.name.localeCompare(b.name);
    });

    res.json(items);
  } catch (error) {
    console.error("Menu fetch error", error);
    res.status(500).json({ error: 'Failed to fetch menu' });
  }
});

export default router;
