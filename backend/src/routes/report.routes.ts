import { Router, Request, Response } from 'express';
import { adminAuth, adminDb } from '../config/firebase.js';
import { MonthlyReportService } from '../lib/services/MonthlyReportService.js';

const router = Router();
const reportService = new MonthlyReportService();

// Middleware to verify admin (simplified for brevity, ensure you have actual admin check)
const verifyAdmin = async (req: Request, res: Response, next: Function) => {
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    // Add custom claim check if needed: if (!decoded.admin) throw new Error();
    next();
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
};

router.post('/generate', verifyAdmin, async (req: Request, res: Response) => {
  try {
    const url = await reportService.generateAndProcessReport(new Date()); // Force generation for current time as manual trigger
    res.json({ success: true, url });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/history', verifyAdmin, async (req: Request, res: Response) => {
  try {
    const snapshot = await adminDb.collection('monthly_reports')
      .orderBy('generatedAt', 'desc')
      .get();
    
    const reports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(reports);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
