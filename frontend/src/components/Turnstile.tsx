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
    <div className={`flex justify-center my-3 ${className}`}>
      <div ref={containerRef} className="cf-turnstile-container" />
    </div>
  );
};