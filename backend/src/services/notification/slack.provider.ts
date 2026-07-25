import { WebClient } from '@slack/web-api';
import dotenv from 'dotenv';
dotenv.config();

export interface SlackMessagePayload {
  channel: string;
  text: string;
  blocks?: any[];
  thread_ts?: string;
}

export interface ConnectionInfo {
  ok: boolean;
  workspaceName?: string;
  botName?: string;
  error?: string;
}

export class SlackProvider {
  private client: WebClient | null = null;
  private isEnabled: boolean = false;

  constructor() {
    this.init();
  }

  private init() {
    const isExplicitlyEnabled = process.env.SLACK_ENABLED === 'true';
    const token = process.env.SLACK_BOT_TOKEN;
    if (isExplicitlyEnabled && token) {
      this.client = new WebClient(token);
      this.isEnabled = true;
      console.log('✅ SlackProvider initialized successfully.');
    } else {
      this.client = null;
      this.isEnabled = false;
    }
  }

  get enabled() {
    return this.isEnabled;
  }

  /**
   * Test connection and return workspace + bot metadata
   */
  async testConnection(): Promise<ConnectionInfo> {
    if (!this.isEnabled || !this.client) {
      return { ok: false, error: 'SLACK_ENABLED is false or SLACK_BOT_TOKEN is missing' };
    }
    try {
      const result = await this.client.auth.test();
      return {
        ok: true,
        workspaceName: result.team as string,
        botName: result.user as string,
      };
    } catch (err: any) {
      return { ok: false, error: err.message || 'Connection failed' };
    }
  }

  /**
   * Post a message to Slack. Returns null when Slack is disabled or on channel errors (no retries).
   */
  async postMessage(payload: SlackMessagePayload): Promise<{ ts: string; channel: string } | null> {
    if (!this.isEnabled || !this.client) {
      return null;
    }

    try {
      const response = await this.client.chat.postMessage({
        channel: payload.channel,
        text: payload.text,
        blocks: payload.blocks,
        thread_ts: payload.thread_ts,
      });

      if (response.ok) {
        return { ts: response.ts as string, channel: response.channel as string };
      } else {
        console.warn(`[Slack] Skipped message to channel "${payload.channel}": ${response.error}`);
        return null;
      }
    } catch (err: any) {
      console.warn(`[Slack] Provider skipped message for channel "${payload.channel}": ${err.message}`);
      return null;
    }
  }

  // ─── Block Kit Generators ────────────────────────────────────────────────────

  static generateOrderBlock(order: any) {
    const items = (order.items || [])
      .map((i: any) => `• ${i.quantity}x *${i.name}*`)
      .join('\n');

    return [
      {
        type: 'header',
        text: { type: 'plain_text', text: `🍕 New Order — #${(order.id || '').slice(-6).toUpperCase()}`, emoji: true },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Customer:*\n${order.user?.name || 'Guest'}` },
          { type: 'mrkdwn', text: `*Phone:*\n${order.user?.phone || 'N/A'}` },
          { type: 'mrkdwn', text: `*Total:*\n₹${order.total}` },
          { type: 'mrkdwn', text: `*Payment:*\n${order.paymentMethod || 'Online'}` },
        ],
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Delivery Address:*\n${order.address?.street || 'Pickup'}, ${order.address?.city || ''}`,
        },
      },
      { type: 'divider' },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `*Items:*\n${items || 'N/A'}` },
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: '✅  Accept Order', emoji: true },
            style: 'primary',
            value: `accept_order_${order.id}`,
            action_id: 'action_accept_order',
          },
          {
            type: 'button',
            text: { type: 'plain_text', text: '❌  Cancel Order', emoji: true },
            style: 'danger',
            value: `cancel_order_${order.id}`,
            action_id: 'action_cancel_order',
          },
        ],
      },
    ];
  }

  static generateDeliveryBlock(order: any, partnerName?: string) {
    return [
      {
        type: 'header',
        text: { type: 'plain_text', text: `🛵 Delivery Assigned — #${(order.id || '').slice(-6).toUpperCase()}`, emoji: true },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Partner:*\n${partnerName || 'Assigned Partner'}` },
          { type: 'mrkdwn', text: `*Customer:*\n${order.user?.name || 'Guest'}` },
          { type: 'mrkdwn', text: `*Order Total:*\n₹${order.total}` },
          { type: 'mrkdwn', text: `*Address:*\n${order.address?.street || 'N/A'}` },
        ],
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: '📦  Mark Picked Up', emoji: true },
            style: 'primary',
            value: `pickup_${order.id}`,
            action_id: 'action_pickup_order',
          },
          {
            type: 'button',
            text: { type: 'plain_text', text: '🎉  Mark Delivered', emoji: true },
            style: 'primary',
            value: `deliver_${order.id}`,
            action_id: 'action_deliver_order',
          },
          {
            type: 'button',
            text: { type: 'plain_text', text: '⚠️  Report Problem', emoji: true },
            style: 'danger',
            value: `problem_${order.id}`,
            action_id: 'action_delivery_problem',
          },
        ],
      },
    ];
  }

  static generateStatusBlock(emoji: string, title: string, detail: string) {
    return [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `${emoji} *${title}*\n${detail}`,
        },
      },
    ];
  }

  static generateSecurityBlock(title: string, detail: string) {
    return [
      {
        type: 'header',
        text: { type: 'plain_text', text: `🚨 Security Alert: ${title}`, emoji: true },
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `\`\`\`${detail}\`\`\`` },
      },
    ];
  }
}

export const slackProvider = new SlackProvider();

