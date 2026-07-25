/**
 * DevAlertService — Dedicated System Failure Alert Dispatcher
 *
 * Sends high-priority email alerts strictly to webhub2811@gmail.com
 * for critical backend exceptions, Google Drive upload failures, SMTP queue errors,
 * and background job failures.
 *
 * Features:
 *  - Recipient locked strictly to webhub2811@gmail.com
 *  - Rate-limiting (15-min cooldown per error key) to prevent inbox flooding
 *  - Asynchronous & non-blocking (never crashes caller)
 */

import { transporter } from '../email.service.js';

const DEVELOPER_EMAIL = 'webhub2811@gmail.com';
const alertCooldowns = new Map<string, number>();
const COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes

export interface DevAlertOptions {
  service: string;
  action: string;
  error: Error | string;
  context?: Record<string, any>;
  key?: string;
}

export class DevAlertService {
  /**
   * Send a critical alert to webhub2811@gmail.com
   */
  public static async sendAlert(options: DevAlertOptions): Promise<boolean> {
    const errorKey = options.key || `${options.service}_${options.action}`;
    const now = Date.now();
    const lastSent = alertCooldowns.get(errorKey) || 0;

    // Rate-limit duplicate errors within 15 minutes
    if (now - lastSent < COOLDOWN_MS) {
      console.log(`[DevAlertService] Suppressing duplicate alert for key: ${errorKey}`);
      return false;
    }

    alertCooldowns.set(errorKey, now);

    const errorMessage = typeof options.error === 'string' ? options.error : options.error.message;
    const errorStack = typeof options.error === 'object' ? options.error.stack : '';

    const subject = `🚨 [Olive Pizza Alert] ${options.service}: ${options.action} Failed`;

    const contextHtml = options.context ? Object.entries(options.context)
      .map(([k, v]) => `<tr><td style="padding:6px;font-weight:bold;color:#9ca3af;">${k}:</td><td style="padding:6px;color:#f3f4f6;">${typeof v === 'object' ? JSON.stringify(v) : String(v)}</td></tr>`)
      .join('') : '';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: monospace; background-color: #0B0F14; color: #f3f4f6; padding: 24px; }
          .card { max-width: 600px; margin: 0 auto; background: #111827; border: 1px solid #ef4444; border-radius: 12px; padding: 24px; }
          .header { border-bottom: 1px solid #1f2937; padding-bottom: 16px; margin-bottom: 16px; }
          .title { color: #ef4444; font-size: 20px; font-weight: bold; margin: 0; }
          .badge { background: #ef444422; color: #ef4444; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
          .error-box { background: #18181b; border: 1px solid #3f3f46; border-radius: 8px; padding: 16px; margin: 16px 0; overflow-x: auto; color: #f87171; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px; }
          .footer { margin-top: 24px; border-top: 1px solid #1f2937; pt-16; font-size: 11px; color: #6b7280; text-align: center; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <span class="badge">DEVELOPER ALERT</span>
            <h1 class="title" style="margin-top:8px;">${options.service} — ${options.action}</h1>
            <div style="color:#9ca3af;font-size:12px;margin-top:4px;">Timestamp: ${new Date().toISOString()}</div>
          </div>
          
          <div style="font-size:14px;color:#e5e7eb;">
            A system failure occurred in production requiring developer attention.
          </div>

          <div class="error-box">
            <strong>Error Message:</strong><br/>
            ${errorMessage}
            ${errorStack ? `<br/><br/><strong>Stack Trace:</strong><br/>${errorStack}` : ''}
          </div>

          ${contextHtml ? `
            <div style="font-weight:bold;color:#f3f4f6;margin-top:16px;">Context Metadata:</div>
            <table>${contextHtml}</table>
          ` : ''}

          <div class="footer">
            Olive Pizza Production DevOps Monitor • Targeted strictly to lead developer (${DEVELOPER_EMAIL})
          </div>
        </div>
      </body>
      </html>
    `;

    // Asynchronous non-blocking dispatch
    setImmediate(async () => {
      try {
        await transporter.sendMail({
          from: process.env.SMTP_FROM || '"Olive Pizza Alerts" <noreply@olivepizza.app>',
          to: DEVELOPER_EMAIL,
          subject,
          html: htmlContent,
        });
        console.log(`[DevAlertService] ✅ Developer alert dispatched to ${DEVELOPER_EMAIL}`);
      } catch (err: any) {
        console.error(`[DevAlertService] Failed to send developer alert:`, err.message);
      }
    });

    return true;
  }
}
