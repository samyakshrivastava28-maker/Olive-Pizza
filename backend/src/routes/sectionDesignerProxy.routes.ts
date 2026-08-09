// backend/src/routes/sectionDesignerProxy.routes.ts
// Minimal proxy router — forwards Section Designer requests from the main Olive Pizza
// backend to the Olive Pizza Studio (SDUI) backend engine.
//
// This file is THIN by design:
// - Auth is handled by the main project's requireOwner middleware (source of truth)
// - Rate limiting is handled by the Studio backend
// - Heavy AI logic lives in Olive Pizza Studio (SDUI) backend
//
// SSE streams are proxied with proper headers (no buffering, long connection)

import { Router, Request, Response } from 'express';
import axios from 'axios';
import http from 'http';

const router = Router();

const OLIVE_STUDIO_URL = process.env['OLIVE_STUDIO_URL'] ?? 'http://localhost:3001';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build the Studio authorization header.
 * The Studio backend uses its own Firebase auth middleware, but for
 * the internal proxy we pass the original Authorization header through.
 */
function proxyHeaders(req: Request): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const auth = req.headers['authorization'];
  if (auth) headers['Authorization'] = auth;
  return headers;
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/section-designer/start
// ─────────────────────────────────────────────────────────────────────────────

router.post('/start', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await axios.post(
      `${OLIVE_STUDIO_URL}/api/section-designer/start`,
      req.body,
      { headers: proxyHeaders(req), timeout: 15_000 }
    );
    res.status(result.status).json(result.data);
  } catch (err: any) {
    const status = err.response?.status ?? 500;
    res.status(status).json(
      err.response?.data ?? { error: `Section Designer Studio unavailable: ${err.message}` }
    );
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/section-designer/stream/:sessionId — SSE proxy
// SSE streams must be proxied differently: we use Node http module directly
// to avoid axios buffering the SSE chunks.
// ─────────────────────────────────────────────────────────────────────────────

router.get('/stream/:sessionId', (req: Request, res: Response): void => {
  const { sessionId } = req.params;
  // EventSource cannot send headers, so the frontend passes the JWT in the query string ?token=...
  const token = req.query.token as string | undefined;
  const authHeader = token ? `Bearer ${token}` : (req.headers['authorization'] ?? '');

  // Set SSE headers on the client-facing response
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const studioUrl = new URL(`${OLIVE_STUDIO_URL}/api/section-designer/stream/${sessionId}`);

  const proxyReq = http.request(
    {
      hostname: studioUrl.hostname,
      port: studioUrl.port || 3001,
      path: studioUrl.pathname,
      method: 'GET',
      headers: {
        Authorization: authHeader,
        Accept: 'text/event-stream',
      },
    },
    (proxyRes) => {
      proxyRes.on('data', (chunk: Buffer) => {
        if (!res.writableEnded) res.write(chunk);
      });
      proxyRes.on('end', () => {
        if (!res.writableEnded) res.end();
      });
    }
  );

  proxyReq.on('error', (err) => {
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ type: 'error', message: `Studio connection failed: ${err.message}` })}\n\n`);
      res.end();
    }
  });

  proxyReq.end();

  // Clean up if client disconnects
  req.on('close', () => {
    proxyReq.destroy();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/section-designer/session/:sessionId — Cancel session
// ─────────────────────────────────────────────────────────────────────────────

router.delete('/session/:sessionId', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await axios.delete(
      `${OLIVE_STUDIO_URL}/api/section-designer/session/${req.params.sessionId}`,
      { headers: proxyHeaders(req), timeout: 10_000 }
    );
    res.status(result.status).json(result.data);
  } catch (err: any) {
    res.status(err.response?.status ?? 500).json(
      err.response?.data ?? { error: `Cancel failed: ${err.message}` }
    );
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/section-designer/answer/:sessionId — Answer AI question
// ─────────────────────────────────────────────────────────────────────────────

router.post('/answer/:sessionId', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await axios.post(
      `${OLIVE_STUDIO_URL}/api/section-designer/answer/${req.params.sessionId}`,
      req.body,
      { headers: proxyHeaders(req), timeout: 10_000 }
    );
    res.status(result.status).json(result.data);
  } catch (err: any) {
    res.status(err.response?.status ?? 500).json(
      err.response?.data ?? { error: `Answer failed: ${err.message}` }
    );
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/section-designer/stitch/verify
// ─────────────────────────────────────────────────────────────────────────────

router.get('/stitch/verify', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await axios.get(
      `${OLIVE_STUDIO_URL}/api/section-designer/stitch/verify`,
      { headers: proxyHeaders(req), timeout: 15_000 }
    );
    res.status(result.status).json(result.data);
  } catch (err: any) {
    res.status(err.response?.status ?? 503).json(
      err.response?.data ?? { error: `Stitch verify failed: ${err.message}` }
    );
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/section-designer/save-draft
// ─────────────────────────────────────────────────────────────────────────────

router.post('/save-draft', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await axios.post(
      `${OLIVE_STUDIO_URL}/api/section-designer/save-draft`,
      req.body,
      { headers: proxyHeaders(req), timeout: 15_000 }
    );
    res.status(result.status).json(result.data);
  } catch (err: any) {
    res.status(err.response?.status ?? 500).json(
      err.response?.data ?? { error: `Save draft failed: ${err.message}` }
    );
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/section-designer/publish
// ─────────────────────────────────────────────────────────────────────────────

router.post('/publish', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await axios.post(
      `${OLIVE_STUDIO_URL}/api/section-designer/publish`,
      req.body,
      { headers: proxyHeaders(req), timeout: 20_000 }
    );
    res.status(result.status).json(result.data);
  } catch (err: any) {
    res.status(err.response?.status ?? 500).json(
      err.response?.data ?? { error: `Publish failed: ${err.message}` }
    );
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/section-designer/health — Check Studio backend connectivity
// ─────────────────────────────────────────────────────────────────────────────

router.get('/health', async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await axios.get(`${OLIVE_STUDIO_URL}/api/health`, { timeout: 5_000 });
    res.json({ proxy: 'ok', studio: result.data });
  } catch (err: any) {
    res.status(503).json({
      proxy: 'ok',
      studio: 'unavailable',
      error: `Cannot reach Olive Studio backend at ${OLIVE_STUDIO_URL}: ${err.message}`,
    });
  }
});

export default router;
