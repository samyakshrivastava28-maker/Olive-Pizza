import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.middleware.js';

const router = Router();
const GITHUB_REPO = 'samyakshrivastava28-maker/Olive-Pizza';

// Trigger a new Android APK Build
router.post('/build-apk', requireAuth, requireRole(['owner', 'admin']), async (req, res) => {
  try {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      return res.status(500).json({ error: 'GITHUB_TOKEN is not configured on the server.' });
    }

    const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/actions/workflows/build-android.yml/dispatches`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ref: 'main',
      }),
    });

    if (response.ok) {
      res.json({ success: true, message: 'Build triggered successfully' });
    } else {
      const errorText = await response.text();
      res.status(response.status).json({ error: 'Failed to trigger build', details: errorText });
    }
  } catch (error: any) {
    console.error('Error triggering APK build:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Get the latest Android APK Build status
router.get('/build-status', requireAuth, requireRole(['owner', 'admin']), async (req, res) => {
  try {
    const token = process.env.GITHUB_TOKEN;
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
    };
    
    // Use token if available to avoid rate limits, but public repos don't strictly need it for GET
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/actions/workflows/build-android.yml/runs?per_page=1`, {
      headers
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to fetch build status' });
    }

    const data = await response.json();
    const latestRun = data.workflow_runs?.[0];

    if (!latestRun) {
      return res.json({ status: 'No builds found', run: null });
    }

    res.json({
      status: latestRun.status,
      conclusion: latestRun.conclusion,
      run_number: latestRun.run_number,
      created_at: latestRun.created_at,
      updated_at: latestRun.updated_at,
      html_url: latestRun.html_url,
      head_sha: latestRun.head_sha,
      head_commit_message: latestRun.head_commit?.message
    });
  } catch (error: any) {
    console.error('Error fetching build status:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Get the latest APK Release
router.get('/latest-release', requireAuth, requireRole(['owner', 'admin']), async (req, res) => {
  try {
    const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/tags/android-latest`, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to fetch latest release' });
    }

    const data = await response.json();
    const apkAsset = data.assets?.find((asset: any) => asset.name.endsWith('.apk'));

    if (!apkAsset) {
      return res.json({ release: data, apk: null });
    }

    res.json({
      release: {
        name: data.name,
        body: data.body,
        published_at: data.published_at,
      },
      apk: {
        name: apkAsset.name,
        size: apkAsset.size,
        download_url: '/api/github/download-apk',
        github_download_url: apkAsset.browser_download_url,
        download_count: apkAsset.download_count
      }
    });
  } catch (error: any) {
    console.error('Error fetching latest release:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Stream direct APK download with explicit MIME headers to prevent Chrome/Android 100% download hang
router.get('/download-apk', async (req, res) => {
  try {
    const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/tags/android-latest`, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
      }
    });

    if (!response.ok) {
      return res.status(response.status).send('Release not found');
    }

    const data = await response.json();
    const apkAsset = data.assets?.find((asset: any) => asset.name.endsWith('.apk'));

    if (!apkAsset || !apkAsset.browser_download_url) {
      return res.status(404).send('APK asset not found');
    }

    // Fetch binary stream from GitHub/S3
    const fileRes = await fetch(apkAsset.browser_download_url, {
      headers: {
        'User-Agent': 'OlivePizza-Backend',
      },
    });

    if (!fileRes.ok || !fileRes.body) {
      return res.status(fileRes.status).send('Failed to stream APK from storage');
    }

    const contentLength = fileRes.headers.get('content-length');
    res.setHeader('Content-Type', 'application/vnd.android.package-archive');
    res.setHeader('Content-Disposition', `attachment; filename="${apkAsset.name || 'OlivePizza.apk'}"`);
    res.setHeader('Cache-Control', 'public, max-age=300');
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }

    // Stream directly to Express response
    const bodyReader = fileRes.body as any;
    if (typeof bodyReader.pipe === 'function') {
      bodyReader.pipe(res);
    } else {
      const reader = fileRes.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
      res.end();
    }
  } catch (error: any) {
    console.error('Error streaming APK:', error);
    if (!res.headersSent) {
      res.status(500).send('Internal server error');
    }
  }
});

export default router;
