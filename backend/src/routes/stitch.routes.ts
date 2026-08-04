import { Router, Response } from 'express';
import { verifyToken, requireRole, AuthRequest } from '../middleware/auth.middleware.js';
import { StitchService } from '../services/stitch/StitchService.js';

const router = Router();

// Ensure only authorized users (owners/developers) can access Stitch integration
router.use(verifyToken);
router.use(requireRole(['owner', 'developer']));

router.get('/designs', async (_req: AuthRequest, res: Response) => {
  try {
    const designs = await StitchService.listDesigns(20);
    res.json({ success: true, designs });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/import/:designId', async (req: AuthRequest, res: Response) => {
  try {
    const designId = req.params.designId;
    const design = await StitchService.getDesign(designId);
    
    // Convert to SDUI
    const sduiSection = StitchService.convertStitchToSDUI(design);
    
    res.json({ success: true, section: sduiSection });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

export default router;
