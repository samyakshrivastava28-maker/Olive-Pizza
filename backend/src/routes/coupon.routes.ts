import { Router, Request, Response } from 'express';
import { adminDb } from '../config/firebase.js';

const router = Router();

router.post('/validate', async (req: Request, res: Response) => {
  try {
    const { code, cartTotal, userId } = req.body;
    if (!code || !cartTotal) {
      return res.status(400).json({ error: 'Missing code or cartTotal' });
    }

    const snapshot = await adminDb.collection('coupons').where('code', '==', code).where('isActive', '==', true).get();
    
    if (snapshot.empty) {
      return res.status(404).json({ valid: false, error: 'Invalid or inactive coupon code' });
    }

    const coupon = snapshot.docs[0].data();
    
    // Check expiry
    if (coupon.endDate && new Date(coupon.endDate) < new Date()) {
      return res.status(400).json({ valid: false, error: 'Coupon has expired' });
    }

    let discount = 0;

    switch (coupon.type) {
      case 'fixed':
        if (cartTotal < (coupon.minOrderValue || 0)) {
          return res.status(400).json({ valid: false, error: `Minimum order value is ₹${coupon.minOrderValue}` });
        }
        discount = coupon.discountValue;
        break;
      case 'percentage':
        if (cartTotal < (coupon.minOrderValue || 0)) {
          return res.status(400).json({ valid: false, error: `Minimum order value is ₹${coupon.minOrderValue}` });
        }
        discount = (cartTotal * coupon.discountValue) / 100;
        if (coupon.maxDiscount && discount > coupon.maxDiscount) {
          discount = coupon.maxDiscount;
        }
        break;
      case 'tier':
        // Find applicable tier
        const sortedTiers = (coupon.tiers || []).sort((a: any, b: any) => b.minAmount - a.minAmount);
        const applicableTier = sortedTiers.find((t: any) => cartTotal >= t.minAmount);
        if (!applicableTier) {
          return res.status(400).json({ valid: false, error: 'Cart total does not meet any tier requirements' });
        }
        discount = applicableTier.discount;
        break;
      case 'free_delivery':
        // In a real app we'd need to know delivery fee to discount it.
        // Returning a flag or setting discount to delivery fee if passed in.
        discount = req.body.deliveryFee || 0;
        break;
      // Add more logic for BOGO, Combo, First Order, etc.
      default:
        return res.status(400).json({ valid: false, error: 'Unsupported coupon type' });
    }

    res.json({ valid: true, discountAmount: discount, finalTotal: cartTotal - discount });
  } catch (error: any) {
    res.status(500).json({ valid: false, error: error.message });
  }
});

export default router;
