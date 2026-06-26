import { Router, Request, Response } from 'express';
import { adminAuth } from '../config/firebase.js';
import cloudinary from '../config/cloudinary.js';

const router = Router();

// Middleware to verify admin/owner (simplified, adjust according to your auth schema)
const verifyAdminOrOwner = async (req: Request, res: Response, next: Function) => {
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    // Basic verification; in a real app, you'd check custom claims or a user document
    await adminAuth.verifyIdToken(token);
    next();
  } catch (error) {
    console.error("Auth Verification Error:", error);
    res.status(401).json({ error: 'Unauthorized' });
  }
};

router.get('/test', async (req: Request, res: Response) => {
  try {
    const config = cloudinary.config();
    res.json({
      success: true,
      cloudinaryConnected: !!config.cloud_name && !!config.api_key && !!config.api_secret,
      cloudName: config.cloud_name
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/sign-upload', verifyAdminOrOwner, (req: Request, res: Response) => {
  try {
    const timestamp = Math.round((new Date).getTime() / 1000);
    const folder = req.query.folder as string | undefined;
    
    const paramsToSign: any = { timestamp };
    if (folder) {
      paramsToSign.folder = folder;
    }

    const signature = cloudinary.utils.api_sign_request(
      paramsToSign, 
      cloudinary.config().api_secret as string
    );

    res.json({
      timestamp,
      signature,
      cloudName: cloudinary.config().cloud_name,
      apiKey: cloudinary.config().api_key
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:publicId(*)', verifyAdminOrOwner, async (req: Request, res: Response) => {
  try {
    const { publicId } = req.params;
    if (!publicId) {
      return res.status(400).json({ error: 'Missing publicId' });
    }

    const result = await cloudinary.uploader.destroy(publicId, { invalidate: true });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint to fetch Cloudinary usage stats
router.get('/usage', verifyAdminOrOwner, async (req: Request, res: Response) => {
  try {
    // Usage API requires provisioned access, but we can try to fetch it
    const usage = await cloudinary.api.usage();
    res.json(usage);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
