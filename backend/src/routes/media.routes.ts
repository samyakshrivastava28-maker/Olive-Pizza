import { Router, Request, Response } from 'express';
import { adminAuth } from '../config/firebase.js';
import cloudinary from '../config/cloudinary.js';

const router = Router();

// Middleware to verify admin/owner with checkRevoked
const verifyAdminOrOwner = async (req: Request, res: Response, next: Function) => {
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) return res.status(401).json({ success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' });
  try {
    const decoded = await adminAuth.verifyIdToken(token, true); // checkRevoked = true
    const isOwner = decoded.role === 'owner' || decoded.role === 'admin';
    if (!isOwner) {
      return res.status(403).json({ success: false, error: 'Forbidden: Admin or Owner role required', code: 'FORBIDDEN' });
    }
    (req as any).user = decoded;
    next();
  } catch (error) {
    console.error("Auth Verification Error:", error);
    res.status(401).json({ success: false, error: 'Invalid or revoked token', code: 'UNAUTHORIZED' });
  }
};

const ALLOWED_FOLDERS = [
  'olive-pizza/menu',
  'olive-pizza/ai-generated',
  'olive-pizza/ai-product-images',
  'olive-pizza/avatars',
  'olive-pizza/promotions',
  'olive-pizza/media'
];

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
    const requestedFolder = req.query.folder as string | undefined;
    const folder = requestedFolder && ALLOWED_FOLDERS.includes(requestedFolder) ? requestedFolder : 'olive-pizza/media';
    
    const paramsToSign: any = { timestamp, folder };

    const signature = cloudinary.utils.api_sign_request(
      paramsToSign, 
      cloudinary.config().api_secret as string
    );

    res.json({
      timestamp,
      signature,
      cloudName: cloudinary.config().cloud_name,
      apiKey: cloudinary.config().api_key,
      folder
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/ai-images', verifyAdminOrOwner, async (req: Request, res: Response) => {
  try {
    const result = await cloudinary.search
      .expression('folder:olive-pizza/ai-generated OR folder:olive-pizza/ai-product-images')
      .sort_by('created_at', 'desc')
      .max_results(500)
      .execute();
    res.json({ success: true, images: result.resources });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
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
