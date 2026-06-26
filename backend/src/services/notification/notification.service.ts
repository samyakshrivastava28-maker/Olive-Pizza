import { adminDb as db } from '../../config/firebase.js';
import { slackProvider, SlackProvider, SlackMessagePayload } from './slack.provider.js';

export type NotificationCategory = 'orders' | 'delivery' | 'inventory' | 'security' | 'support' | 'general' | 'errors';

export interface NotificationEvent {
  type: string;
  category: NotificationCategory;
  title: string;
  details?: string;
  blocks?: any[];
  thread_ts?: string;
}

interface QueueItem {
  event: NotificationEvent;
  channel: string;
  attempts: number;
}

// Default channel fallback when Firestore config not yet saved
const DEFAULT_CHANNELS: Record<NotificationCategory, string> = {
  orders:    '#orders',
  delivery:  '#delivery',
  inventory: '#inventory',
  security:  '#security',
  support:   '#support',
  general:   '#general',
  errors:    '#errors',
};

class NotificationService {
  private config: any = null;
  private configReady = false;
  private queue: QueueItem[] = [];
  private isProcessing = false;
  private sentMessageIds = new Set<string>();

  constructor() {
    this.watchConfig();
  }

  /**
   * Listen to Firestore settings/slack to keep routing rules fresh
   */
  private watchConfig() {
    db.collection('settings').doc('slack').onSnapshot(
      (docSnap) => {
        if (docSnap.exists) {
          this.config = docSnap.data();
          this.configReady = true;
          console.log('🔄 Slack configuration refreshed from Firestore.');
        } else {
          // Document doesn't exist yet — use defaults so first order still fires
          this.config = null;
          this.configReady = true;
          console.log('ℹ️ No Slack config in Firestore — using channel defaults.');
        }
      },
      (error) => {
        console.error('Failed to watch Slack settings:', error);
        this.configReady = true; // allow fallback mode even on error
      }
    );
  }

  /**
   * Resolve the channel for an event:
   * - If Firestore config exists and has a mapping → use it
   * - Otherwise fall back to DEFAULT_CHANNELS
   * Returns null only if the specific rule is explicitly disabled.
   */
  private resolveChannel(event: NotificationEvent): string | null {
    // Check if Slack provider is even enabled
    if (!slackProvider.enabled) return null;

    // If Firestore config exists and integration is globally disabled → stop
    if (this.config && this.config.enabled === false) return null;

    // If rule is explicitly set to false → skip
    if (this.config?.notificationRules?.[event.type] === false) return null;

    // Prefer Firestore mapping, fall back to default
    const channel =
      this.config?.channelMappings?.[event.category] || DEFAULT_CHANNELS[event.category];

    return channel || null;
  }

  /**
   * Dispatch an event via the async queue (fire-and-forget).
   */
  public async dispatch(event: NotificationEvent): Promise<void> {
    const channel = this.resolveChannel(event);
    if (!channel) return;

    // De-duplicate: same event type + thread within 2s
    const dedupKey = `${event.type}:${event.thread_ts || 'main'}`;
    if (this.sentMessageIds.has(dedupKey)) return;
    this.sentMessageIds.add(dedupKey);
    setTimeout(() => this.sentMessageIds.delete(dedupKey), 2000);

    this.queue.push({ event, channel, attempts: 0 });
    this.processQueue();
  }

  /**
   * Send immediately and return the Slack message ts (used for new orders to capture thread_ts).
   */
  public async dispatchImmediate(event: NotificationEvent): Promise<string | null> {
    const channel = this.resolveChannel(event);
    if (!channel) {
      console.log(`[NotificationService] Skipping "${event.type}" — no channel resolved (Slack disabled or rule off)`);
      return null;
    }

    try {
      const payload = this.buildPayload(event, channel);
      const result = await slackProvider.postMessage(payload);
      console.log(`✅ Slack message sent to ${channel} for "${event.type}" (ts: ${result?.ts})`);
      return result?.ts || null;
    } catch (err) {
      console.error(`[NotificationService] dispatchImmediate failed for "${event.type}":`, err);
      return null;
    }
  }

  /**
   * Async queue processor with exponential backoff retry (up to 3 attempts).
   */
  private async processQueue() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.queue.length > 0) {
      const item = this.queue.shift()!;

      try {
        const payload = this.buildPayload(item.event, item.channel);
        await slackProvider.postMessage(payload);
        console.log(`✅ Queued Slack message sent to ${item.channel} for "${item.event.type}"`);
        // 300ms pacing between messages
        await new Promise((r) => setTimeout(r, 300));
      } catch (err) {
        item.attempts += 1;
        if (item.attempts < 3) {
          const delay = 2000 * item.attempts;
          console.warn(`[NotificationService] Retry #${item.attempts} for "${item.event.type}" in ${delay}ms`);
          setTimeout(() => {
            this.queue.unshift(item);
            if (!this.isProcessing) this.processQueue();
          }, delay);
        } else {
          console.error(`[NotificationService] Permanently failed to send "${item.event.type}" after 3 attempts.`);
        }
      }
    }

    this.isProcessing = false;
  }

  private buildPayload(event: NotificationEvent, channel: string): SlackMessagePayload {
    return {
      channel,
      text: `[${event.title}] ${event.details || ''}`,
      blocks: event.blocks || buildFallbackBlocks(event),
      thread_ts: event.thread_ts,
    };
  }
}

function buildFallbackBlocks(event: NotificationEvent): any[] {
  const categoryEmojis: Record<string, string> = {
    orders: '🍕', delivery: '🛵', inventory: '📦',
    security: '🚨', support: '💬', general: 'ℹ️',
  };
  const emoji = categoryEmojis[event.category] || 'ℹ️';
  return [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `${emoji} *${event.title}*${event.details ? `\n${event.details}` : ''}`,
      },
    },
  ];
}

export const notificationService = new NotificationService();
