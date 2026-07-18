import { Router, Request, Response } from 'express';
import { adminDb } from '../config/firebase.js';
import { verifyToken, requireRole, AuthRequest } from '../middleware/auth.middleware.js';

const router = Router();

router.use(verifyToken);
router.use(requireRole(['owner', 'admin']));

// --- Combos / Offers ---
router.post('/combos', async (req: AuthRequest, res: Response) => {
  try {
    const docRef = await adminDb.collection('combos').add({
      ...req.body,
      createdAt: new Date().toISOString()
    });
    res.status(201).json({ id: docRef.id });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create combo' });
  }
});

router.put('/combos/:id', async (req: AuthRequest, res: Response) => {
  try {
    await adminDb.collection('combos').doc(req.params.id).update({
      ...req.body,
      updatedAt: new Date().toISOString()
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update combo' });
  }
});

router.delete('/combos/:id', async (req: AuthRequest, res: Response) => {
  try {
    await adminDb.collection('combos').doc(req.params.id).delete();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete combo' });
  }
});

// --- Settings ---
router.put('/settings/:id', async (req: AuthRequest, res: Response) => {
  try {
    await adminDb.collection('settings').doc(req.params.id).set(req.body, { merge: true });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// --- User Roles ---
import { adminAuth } from '../config/firebase.js';
router.put('/users/:id/role', async (req: AuthRequest, res: Response) => {
  try {
    const { role } = req.body;
    await adminDb.collection('users').doc(req.params.id).update({ role });
    await adminAuth.setCustomUserClaims(req.params.id, { role });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update role' });
  }
});

export default router;
