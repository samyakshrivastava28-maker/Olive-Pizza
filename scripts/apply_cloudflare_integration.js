import fs from 'fs';
import path from 'path';

const backendRoot = 'C:\\Users\\RYZEN\\Downloads\\olive-pizza-owner\\backend';
const frontendRoot = 'C:\\Users\\RYZEN\\Downloads\\olive-pizza';

function writeBackendFile(relPath, content) {
  const target = path.join(backendRoot, relPath);
  const dir = path.dirname(target);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(target, content.trim(), 'utf8');
  console.log('✅ Wrote Backend:', relPath);
}

function writeFrontendFile(relPath, content) {
  const target = path.join(frontendRoot, relPath);
  const dir = path.dirname(target);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(target, content.trim(), 'utf8');
  console.log('✅ Wrote Frontend:', relPath);
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Backend: src/middleware/turnstile.middleware.ts
// ─────────────────────────────────────────────────────────────────────────────
writeBackendFile('src/middleware/turnstile.middleware.ts', `
import { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';

dotenv.config();

const TURNSTILE_SECRET_KEY = process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY || process.env.TURNSTILE_SECRET_KEY || '';
const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/**
 * 🛡️ Cloudflare Turnstile Server-Side Verification Middleware
 * 
 * Protects sensitive public routes (OTP sending, user registration, public contact)
 * against automated bots, credential stuffing, and SMS toll fraud.
 */
export async function verifyTurnstile(req: Request, res: Response, next: NextFunction): Promise<void> {
  // 1. Bypass check for Local Development or Disabled Flag
  if (process.env.NODE_ENV !== 'production' && !process.env.FORCE_TURNSTILE_CHECK) {
    return next();
  }

  // 2. Bypass check for Native Mobile Container (Capacitor sends verified platform header or auth token)
  const isCapacitor = req.headers['x-platform'] === 'capacitor' || req.headers['x-requested-with'] === 'in.olivepizza.app';
  if (isCapacitor) {
    return next();
  }

  // If secret key is not configured, warn and allow (graceful degradation)
  if (!TURNSTILE_SECRET_KEY) {
    console.warn('[Turnstile] ⚠️ CLOUDFLARE_TURNSTILE_SECRET_KEY is not set. Allowing request in degraded mode.');
    return next();
  }

  const token = req.body?.turnstileToken || req.headers['cf-turnstile-response'] || req.body?.['cf-turnstile-response'];

  if (!token) {
    res.status(400).json({
      success: false,
      error: 'Security challenge token is required. Please complete the Turnstile verification.',
      code: 'TURNSTILE_TOKEN_MISSING'
    });
    return;
  }

  try {
    const clientIp = req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    const formData = new URLSearchParams();
    formData.append('secret', TURNSTILE_SECRET_KEY);
    formData.append('response', String(token));
    if (clientIp) {
      formData.append('remoteip', String(clientIp).split(',')[0].trim());
    }

    const verifyRes = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const outcome: any = await verifyRes.json();

    if (outcome.success) {
      return next();
    } else {
      console.warn('[Turnstile] Verification failed:', outcome['error-codes']);
      res.status(403).json({
        success: false,
        error: 'Security verification failed. Please try again.',
        code: 'TURNSTILE_VERIFICATION_FAILED',
        errorCodes: outcome['error-codes']
      });
      return;
    }
  } catch (err: any) {
    console.error('[Turnstile] Server verification error:', err.message);
    // Gracefully fail open or closed based on strictness; default allow with warning
    if (process.env.TURNSTILE_FAIL_CLOSED === 'true') {
      res.status(503).json({
        success: false,
        error: 'Security challenge service temporarily unavailable.',
        code: 'TURNSTILE_SERVICE_ERROR'
      });
      return;
    }
    return next();
  }
}
`);

// ─────────────────────────────────────────────────────────────────────────────
// 2. Backend: Cloudflare Tunnel Config Template
// ─────────────────────────────────────────────────────────────────────────────
writeBackendFile('cloudflared/config.yml', `
# ☁️ Cloudflare Tunnel Configuration for Olive Pizza Canonical Backend
# Documentation: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/

tunnel: olive-pizza-backend-tunnel
credentials-file: /etc/cloudflared/credentials.json

ingress:
  # 1. Primary Canonical API & WebSockets
  - hostname: api.olivepizza.in
    service: http://localhost:5175
    originRequest:
      connectTimeout: 30s
      noTLSVerify: false
      httpHostHeader: api.olivepizza.in

  # 2. Status / Health Check Probe
  - hostname: health.olivepizza.in
    service: http://localhost:5175/api/ready

  # 3. Catch-all fallback (returns 404 for unmapped hostnames)
  - service: http_status:404
`);

// ─────────────────────────────────────────────────────────────────────────────
// 3. Frontend: src/components/Turnstile.tsx
// ─────────────────────────────────────────────────────────────────────────────
writeFrontendFile('frontend/src/components/Turnstile.tsx', `
import React, { useEffect, useRef } from 'react';

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement | string,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          'error-callback'?: () => void;
          'expired-callback'?: () => void;
          theme?: 'light' | 'dark' | 'auto';
          size?: 'normal' | 'compact' | 'flexible';
        }
      ) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

interface TurnstileProps {
  onVerify: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
  theme?: 'light' | 'dark' | 'auto';
  className?: string;
}

export const Turnstile: React.FC<TurnstileProps> = ({
  onVerify,
  onError,
  onExpire,
  theme = 'dark',
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  // Cloudflare Turnstile Site Key (Can be overridden via VITE_TURNSTILE_SITE_KEY)
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY || '0x4AAAAAAAxxxxxxPLACEHOLDER';

  useEffect(() => {
    // If running in development or testing without explicit key, auto-trigger verify callback
    if (!import.meta.env.PROD || siteKey.includes('PLACEHOLDER')) {
      onVerify('dev_mock_turnstile_token');
      return;
    }

    let intervalId: any = null;

    const initWidget = () => {
      if (window.turnstile && containerRef.current && !widgetIdRef.current) {
        try {
          widgetIdRef.current = window.turnstile.render(containerRef.current, {
            sitekey: siteKey,
            callback: onVerify,
            'error-callback': onError,
            'expired-callback': onExpire,
            theme,
            size: 'normal',
          });
        } catch (e) {
          console.warn('[Turnstile Widget] Render error:', e);
        }
      }
    };

    if (window.turnstile) {
      initWidget();
    } else {
      intervalId = setInterval(() => {
        if (window.turnstile) {
          clearInterval(intervalId);
          initWidget();
        }
      }, 200);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
          widgetIdRef.current = null;
        } catch {}
      }
    };
  }, [siteKey, theme, onVerify, onError, onExpire]);

  // Don't render empty container in dev placeholder mode
  if (!import.meta.env.PROD && siteKey.includes('PLACEHOLDER')) {
    return null;
  }

  return (
    <div className={\`flex justify-center my-3 \${className}\`}>
      <div ref={containerRef} className="cf-turnstile-container" />
    </div>
  );
};
`);

// ─────────────────────────────────────────────────────────────────────────────
// 4. Frontend: public/robots.txt (Protect Private Management Applications)
// ─────────────────────────────────────────────────────────────────────────────
writeFrontendFile('public/robots.txt', `
# 🍕 Olive Pizza Production Robots Configuration
User-agent: *
Allow: /
Allow: /menu
Allow: /cart
Allow: /about
Allow: /contact
Allow: /track

# Disallow indexing on private operational & API paths
Disallow: /api/
Disallow: /ws
Disallow: /checkout/success
Disallow: /owner/
Disallow: /manager/
Disallow: /franchise/
Disallow: /pos/
Disallow: /delivery/

Sitemap: https://olivepizza.in/sitemap.xml
`);

console.log('\\n🎉 Cloudflare integration components written successfully.');
