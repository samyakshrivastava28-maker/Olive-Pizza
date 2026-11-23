/**
 * E2E API & Network Helper for Olive Pizza Frontend Test Suite
 * Provides genuine HTTP and WebSocket clients against http://localhost:5000
 */

import WebSocket from 'ws';

export const BACKEND_URL = 'http://localhost:5000';
export const WS_URL = 'ws://localhost:5000/ws';

export async function fetchApi(path: string, options?: RequestInit): Promise<{
  status: number;
  ok: boolean;
  headers: Headers;
  json: () => Promise<any>;
  text: () => Promise<string>;
}> {
  const url = path.startsWith('http') ? path : `${BACKEND_URL}${path.startsWith('/') ? '' : '/'}${path}`;
  const res = await fetch(url, options);
  return {
    status: res.status,
    ok: res.ok,
    headers: res.headers,
    json: () => res.json(),
    text: () => res.text(),
  };
}

export function openWebSocket(url: string = WS_URL): Promise<{
  ws: WebSocket;
  messages: any[];
  waitForMessage: (predicate: (msg: any) => boolean, timeoutMs?: number) => Promise<any>;
  sendJson: (payload: any) => void;
  close: () => void;
}> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    const messages: any[] = [];
    const waiters: Array<{ predicate: (m: any) => boolean; resolve: (m: any) => void; reject: (err: any) => void }> = [];

    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error(`WebSocket connection timeout to ${url}`));
    }, 10000);

    ws.on('open', () => {
      clearTimeout(timeout);
      resolve({
        ws,
        messages,
        waitForMessage: (predicate: (msg: any) => boolean, timeoutMs: number = 8000) => {
          // Check if message already received
          const existing = messages.find(predicate);
          if (existing) return Promise.resolve(existing);

          return new Promise((res, rej) => {
            const timer = setTimeout(() => {
              const idx = waiters.findIndex((w) => w.resolve === res);
              if (idx !== -1) waiters.splice(idx, 1);
              rej(new Error(`Timed out waiting for WebSocket message matching predicate after ${timeoutMs}ms`));
            }, timeoutMs);

            waiters.push({
              predicate,
              resolve: (m) => {
                clearTimeout(timer);
                res(m);
              },
              reject: (err) => {
                clearTimeout(timer);
                rej(err);
              },
            });
          });
        },
        sendJson: (payload: any) => {
          ws.send(JSON.stringify(payload));
        },
        close: () => {
          try {
            ws.close();
          } catch {}
        },
      });
    });

    ws.on('message', (data: WebSocket.RawData) => {
      try {
        const parsed = JSON.parse(data.toString());
        messages.push(parsed);
        for (let i = waiters.length - 1; i >= 0; i--) {
          if (waiters[i].predicate(parsed)) {
            const w = waiters.splice(i, 1)[0];
            w.resolve(parsed);
          }
        }
      } catch {
        messages.push(data.toString());
      }
    });

    ws.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}
