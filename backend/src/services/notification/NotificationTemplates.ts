/**
 * Enterprise Notification Templates
 * Generates FCM Web Push payloads for Customer, Owner, and Delivery roles.
 *
 * KEY DESIGN DECISIONS:
 * - `tag`: Maps to orderId so the same OS notification card updates in-place (no duplicates).
 * - `renotify: true`: Re-alerts the user with sound even when the tag replaces an existing card.
 * - `actions`: Inline quick-action buttons processed by the Service Worker.
 * - `data.notificationId` / `data.version`: Enable dedup protection and tracking.
 * - Progress bars are rendered as Unicode block characters in the body.
 */

export type OrderStatus =
  | 'pending'
  | 'accepted'
  | 'preparing'
  | 'ready'
  | 'partner_assigned'
  | 'picked_up'
  | 'out_for_delivery'
  | 'delivered'
  | 'completed'
  | 'cancelled';

export type NotificationRole = 'customer' | 'owner' | 'delivery';
export type NotificationPriority = 'critical' | 'high' | 'normal';
export type NotificationCategory =
  | 'order'
  | 'delivery'
  | 'marketing'
  | 'coupon'
  | 'announcement'
  | 'alert'
  | 'reward'
  | 'system';

export interface NotificationPayload {
  /** FCM notification object (visible to user) */
  notification?: {
    title: string;
    body: string;
    image?: string;
  };
  /** Data payload — forwarded to service worker and app */
  data: {
    notificationId?: string;
    orderId?: string;
    tag?: string;
    version?: string;
    stage?: string;
    url?: string;
    category?: NotificationCategory;
    priority?: NotificationPriority;
    role?: NotificationRole;
    sound?: string;
    [key: string]: string | undefined;
  };
  /** Android-specific config */
  android?: {
    priority: 'normal' | 'high';
    notification?: {
      sound?: string;
      channelId?: string;
      tag?: string;
      icon?: string;
      clickAction?: string;
      defaultVibrateTimings?: boolean;
      defaultSound?: boolean;
      defaultLightSettings?: boolean;
      vibrateTimingsMillis?: number[];
      notificationCount?: number;
      notificationPriority?:
        | 'PRIORITY_MIN'
        | 'PRIORITY_LOW'
        | 'PRIORITY_DEFAULT'
        | 'PRIORITY_HIGH'
        | 'PRIORITY_MAX';
    };
  };
  /** APNS config for iOS PWA (Safari 16.4+, added to home screen) */
  apns?: {
    headers?: { 'apns-priority'?: string; 'apns-collapse-id'?: string };
    payload?: {
      aps: {
        alert?: { title?: string; body?: string };
        sound?: string;
        badge?: number;
        'mutable-content'?: number;
        'content-available'?: number;
      };
    };
  };
  /** Web Push specific config (used by FCM to set notification options in SW) */
  webpush?: {
    headers?: { Urgency?: string; TTL?: string };
    notification?: {
      icon?: string;
      badge?: string;
      tag?: string;
      renotify?: boolean;
      requireInteraction?: boolean;
      silent?: boolean;
      vibrate?: number[];
      actions?: Array<{ action: string; title: string; icon?: string }>;
      data?: Record<string, unknown>;
    };
    fcm_options?: {
      link?: string;
    };
  };
}

// ─── Progress Bar Generator ───────────────────────────────────────────────────
const PROGRESS_STEPS: Record<OrderStatus, number> = {
  pending: 1,
  accepted: 2,
  preparing: 3,
  ready: 4,
  partner_assigned: 5,
  picked_up: 6,
  out_for_delivery: 7,
  delivered: 8,
  completed: 8,
  cancelled: 0,
};
const TOTAL_STEPS = 8;
const FILLED = '█';
const EMPTY = '□';

function progressBar(status: OrderStatus): string {
  const step = PROGRESS_STEPS[status] || 0;
  if (status === 'cancelled') return '✖ Cancelled';
  const filled = Math.round((step / TOTAL_STEPS) * 10);
  return FILLED.repeat(filled) + EMPTY.repeat(10 - filled);
}

// ─── Icon per App ─────────────────────────────────────────────────────────────
const ICON = 'https://res.cloudinary.com/dxmlvkff1/image/upload/v1782376898/olive-pizza/brand/logo.png';
const BADGE = 'https://res.cloudinary.com/dxmlvkff1/image/upload/v1782376898/olive-pizza/brand/badge_mono.png';

// ─── Sound mapping ────────────────────────────────────────────────────────────
export const SOUNDS = {
  new_order: 'order_alert.mp3',
  delivery_assigned: 'delivery_chime.mp3',
  delivered: 'success_ding.mp3',
  cancelled: 'cancel_buzz.mp3',
  marketing: 'soft_pop.mp3',
  system: 'system_alert.mp3',
  default: 'default',
} as const;

// ─── Base builder ─────────────────────────────────────────────────────────────
function buildPayload(
  title: string,
  body: string,
  options: {
    tag: string;
    orderId?: string;
    url?: string;
    sound?: keyof typeof SOUNDS;
    category?: NotificationCategory;
    priority?: NotificationPriority;
    role?: NotificationRole;
    requireInteraction?: boolean;
    actions?: Array<{ action: string; title: string }>;
    stage?: string;
    version?: number;
    alert?: 'continuous' | 'single';
    notificationId?: string;
    vibrate?: number[];
  }
): NotificationPayload {
  const soundFile = options.sound ? SOUNDS[options.sound] : SOUNDS.default;
  const urgency =
    options.priority === 'critical' ? 'high' : options.priority === 'high' ? 'high' : 'normal';

  // 1. Build a strict string-only map for FCM top-level data
  const safeData: Record<string, string> = {
    title: title,
    body: body,
    url: options.url || '/',
    category: options.category || 'order',
    priority: options.priority || 'normal',
    sound: soundFile,
    version: String(options.version || 1),
  };
  if (options.tag) safeData.tag = options.tag;
  if (options.actions) safeData.actions = JSON.stringify(options.actions);
  if (options.requireInteraction) safeData.requireInteraction = 'true';
  if (options.vibrate) safeData.vibrate = JSON.stringify(options.vibrate);
  if (options.orderId) safeData.orderId = options.orderId;
  if (options.role) safeData.role = options.role;
  if (options.alert) safeData.alert = options.alert;
  if (options.stage) safeData.stage = options.stage;
  if (options.notificationId) safeData.notificationId = options.notificationId;

  // 2. Build webpush notification data (can be anything, but let's keep it safe)
  const webpushData: Record<string, any> = {
    url: options.url || '/',
    sound: soundFile,
  };
  if (options.orderId) webpushData.orderId = options.orderId;
  if (options.stage) webpushData.stage = options.stage;
  if (options.alert) webpushData.alert = options.alert;

  return {
    // Top-level notification is specifically removed to force Data-Only mode. 
    // This allows firebase-messaging-sw.js to handle custom actions/buttons on Android Chrome.
    data: safeData,
    android: {
      priority: urgency === 'high' ? 'high' : 'normal',
      notification: {
        sound: soundFile,
        channelId: `olive_${options.category || 'order'}`,
        tag: options.tag,
        icon: 'ic_notification',
        clickAction: options.role === 'owner' ? 'owner_order_actions' : options.role === 'delivery' ? 'delivery_actions' : 'customer_order_actions',
        defaultVibrateTimings: !options.vibrate,
        vibrateTimingsMillis: options.vibrate,
        notificationPriority:
          options.priority === 'critical'
            ? 'PRIORITY_MAX'
            : options.priority === 'high'
            ? 'PRIORITY_HIGH'
            : 'PRIORITY_DEFAULT',
      },
    },
    apns: {
      headers: {
        'apns-priority': urgency === 'high' ? '10' : '5',
        'apns-collapse-id': options.tag || 'default',
      },
      payload: {
        aps: {
          alert: { title, body },
          sound: soundFile,
          badge: 1,
          'mutable-content': 1,
        },
      },
    },
    webpush: {
      headers: { Urgency: urgency, TTL: '3600' },
      fcm_options: { link: options.url || '/' },
    },
  };
}

// =============================================================================
// OWNER TEMPLATES
// =============================================================================
export class OwnerTemplates {
  /** New Order Alert — CRITICAL, requires interaction, stays until acted on */
  static newOrder(
    orderId: string,
    payload: {
      customerName: string;
      orderNumber: string;
      totalAmount: number;
      itemsCount: number;
      paymentMethod: string;
      deliveryAddress: string;
      distance?: string;
      phone?: string;
      notes?: string;
      notificationId?: string;
      version?: number;
    }
  ): NotificationPayload {
    const title = `🍕 New Order • ₹${payload.totalAmount}`;
    const body = [
      `#${payload.orderNumber} — ${payload.customerName} • ${payload.itemsCount} items`,
      `${payload.paymentMethod} • ${payload.distance || '?'} away`,
      progressBar('pending'),
    ].join('\n');

    return buildPayload(title, body, {
      tag: `order_owner_${orderId}`,
      orderId,
      url: `/owner/orders/${orderId}`,
      sound: 'new_order',
      category: 'order',
      priority: 'critical',
      role: 'owner',
      requireInteraction: true,
      stage: 'new_order',
      alert: 'continuous',
      version: payload.version || 1,
      notificationId: payload.notificationId,
      vibrate: [300, 200, 300, 200, 300],
      actions: [
        { action: 'accept', title: '✅ Accept' },
        { action: 'reject', title: '❌ Reject' },
        { action: 'stop_alert', title: '🔕 Stop Alert' },
      ],
    });
  }

  /** Live Order Card Update — same tag, updates in-place */
  static orderStatusUpdate(
    orderId: string,
    payload: {
      orderNumber: string;
      customerName: string;
      status: OrderStatus;
      eta?: string;
      deliveryPartnerName?: string;
      totalAmount: number;
      notificationId?: string;
      version?: number;
    }
  ): NotificationPayload {
    const statusLabels: Record<OrderStatus, string> = {
      pending: '⏳ Pending',
      accepted: '✅ Accepted',
      preparing: '🔥 Preparing',
      ready: '🟢 Ready for Pickup',
      partner_assigned: '🚴 Partner Assigned',
      picked_up: '📦 Picked Up',
      out_for_delivery: '🛵 Out for Delivery',
      delivered: '✅ Delivered',
      completed: '🏁 Completed',
      cancelled: '❌ Cancelled',
    };

    const title = `${statusLabels[payload.status]} • #${payload.orderNumber}`;
    const body = [
      `${payload.customerName} • ₹${payload.totalAmount}`,
      payload.eta ? `ETA: ${payload.eta}` : '',
      payload.deliveryPartnerName ? `Partner: ${payload.deliveryPartnerName}` : '',
      progressBar(payload.status),
    ]
      .filter(Boolean)
      .join('\n');

    const actions =
      payload.status === 'preparing'
        ? [{ action: 'ready', title: '🟢 Mark Ready' }, { action: 'open', title: '📊 Open' }]
        : payload.status === 'ready'
        ? [{ action: 'assign_delivery', title: '🚴 Assign Partner' }, { action: 'open', title: '📊 Open' }]
        : [{ action: 'open', title: '📊 Open Dashboard' }];

    return buildPayload(title, body, {
      tag: `order_owner_${orderId}`,
      orderId,
      url: `/owner/orders/${orderId}`,
      sound: payload.status === 'delivered' ? 'delivered' : undefined,
      category: 'order',
      priority: 'high',
      role: 'owner',
      requireInteraction: payload.status !== 'completed' && payload.status !== 'cancelled',
      stage: payload.status,
      version: payload.version,
      notificationId: payload.notificationId,
      actions,
    });
  }
}

// =============================================================================
// DELIVERY PARTNER TEMPLATES
// =============================================================================
export class DeliveryTemplates {
  /** New delivery assignment — CRITICAL, must be accepted immediately */
  static newAssignment(
    orderId: string,
    payload: {
      orderNumber: string;
      customerName: string;
      customerPhone: string;
      deliveryAddress: string;
      distance: string;
      eta: string;
      totalAmount: number;
      paymentMethod: string;
      notificationId?: string;
      version?: number;
    }
  ): NotificationPayload {
    const title = `📦 Delivery Request • ${payload.distance}`;
    const body = [
      `#${payload.orderNumber} — ${payload.customerName}`,
      `₹${payload.totalAmount} • ${payload.paymentMethod}`,
      `📍 ${payload.deliveryAddress}`,
      `ETA: ${payload.eta}`,
    ].join('\n');

    return buildPayload(title, body, {
      tag: `order_delivery_${orderId}`,
      orderId,
      url: `/delivery/order/${orderId}`,
      sound: 'delivery_assigned',
      category: 'delivery',
      priority: 'critical',
      role: 'delivery',
      requireInteraction: true,
      stage: 'delivery_assigned',
      alert: 'continuous',
      version: payload.version || 1,
      notificationId: payload.notificationId,
      vibrate: [200, 100, 200, 100, 400],
      actions: [
        { action: 'accept_delivery', title: '✅ Accept' },
        { action: 'reject_delivery', title: '❌ Reject' },
        { action: 'stop_alert', title: '🔕 Stop Alert' },
      ],
    });
  }

  /** Live delivery status update — updates same card */
  static deliveryUpdate(
    orderId: string,
    payload: {
      orderNumber: string;
      customerName: string;
      deliveryAddress: string;
      stage: 'navigate_restaurant' | 'arrived_restaurant' | 'picked_up' | 'out_for_delivery' | 'arrived_customer';
      eta?: string;
      notificationId?: string;
      version?: number;
    }
  ): NotificationPayload {
    const stageConfig = {
      navigate_restaurant: { title: '📍 Navigate to Restaurant', action: [{ action: 'arrived_restaurant', title: '✅ Arrived' }] },
      arrived_restaurant: { title: '🍕 At Restaurant — Pick Up Order', action: [{ action: 'picked_up', title: '📦 Picked Up' }] },
      picked_up: { title: '🚴 Order Picked Up', action: [{ action: 'call_customer', title: '📞 Call' }, { action: 'navigate_customer', title: '🗺️ Navigate' }] },
      out_for_delivery: { title: `🛵 Delivering to ${payload.customerName}`, action: [{ action: 'arrived_customer', title: '📍 Arrived' }, { action: 'call_customer', title: '📞 Call' }] },
      arrived_customer: { title: '🏁 Arrived at Customer', action: [{ action: 'delivered', title: '✅ Delivered' }, { action: 'report_issue', title: '⚠️ Issue' }] },
    };

    const config = stageConfig[payload.stage];
    const body = [
      `#${payload.orderNumber} — ${payload.deliveryAddress}`,
      payload.eta ? `ETA: ${payload.eta}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    return buildPayload(config.title, body, {
      tag: `order_delivery_${orderId}`,
      orderId,
      url: `/delivery/order/${orderId}`,
      category: 'delivery',
      priority: 'high',
      role: 'delivery',
      requireInteraction: true,
      stage: payload.stage,
      version: payload.version,
      notificationId: payload.notificationId,
      actions: config.action,
    });
  }
}

// =============================================================================
// CUSTOMER TEMPLATES
// =============================================================================
export class CustomerTemplates {
  /** Live order card — single notification that updates as status changes */
  static orderUpdate(
    orderId: string,
    payload: {
      orderNumber: string;
      status: OrderStatus;
      eta?: string;
      deliveryPartnerName?: string;
      totalAmount: number;
      notificationId?: string;
      version?: number;
    }
  ): NotificationPayload {
    const statusConfig: Record<OrderStatus, { title: string; body: string; sound?: keyof typeof SOUNDS; requireInteraction?: boolean }> = {
      pending: {
        title: `🍕 Order Received • #${payload.orderNumber}`,
        body: `₹${payload.totalAmount} • We'll confirm shortly\n${progressBar('pending')}`,
      },
      accepted: {
        title: `✅ Order Confirmed • #${payload.orderNumber}`,
        body: `Kitchen is preparing your order${payload.eta ? ` • ETA: ${payload.eta}` : ''}\n${progressBar('accepted')}`,
      },
      preparing: {
        title: `🔥 Your Pizza is Being Made!`,
        body: `Order #${payload.orderNumber}${payload.eta ? ` • Est. ${payload.eta}` : ''}\n${progressBar('preparing')}`,
      },
      ready: {
        title: `🟢 Order Ready for Pickup!`,
        body: `#${payload.orderNumber} • Assigning delivery partner\n${progressBar('ready')}`,
      },
      partner_assigned: {
        title: `🚴 Delivery Partner Assigned`,
        body: `${payload.deliveryPartnerName || 'Partner'} is on the way to pick up your order\n${progressBar('partner_assigned')}`,
      },
      picked_up: {
        title: `📦 Order Picked Up`,
        body: `${payload.deliveryPartnerName || 'Partner'} has picked up your order\n${progressBar('picked_up')}`,
      },
      out_for_delivery: {
        title: `🛵 Out for Delivery!`,
        body: [
          `${payload.deliveryPartnerName || 'Your partner'} is heading your way`,
          payload.eta ? `Arriving in ~${payload.eta}` : '',
          progressBar('out_for_delivery'),
        ].filter(Boolean).join('\n'),
        sound: 'delivery_assigned',
      },
      delivered: {
        title: `✅ Order Delivered! Enjoy 🍕`,
        body: `Order #${payload.orderNumber} has been delivered. Rate your experience!\n${progressBar('delivered')}`,
        sound: 'delivered',
        requireInteraction: true,
      },
      completed: {
        title: `🏁 Order Completed`,
        body: `Thank you for ordering from Olive Pizza!\n${progressBar('completed')}`,
      },
      cancelled: {
        title: `❌ Order Cancelled`,
        body: `Order #${payload.orderNumber} has been cancelled. Contact us if you have questions.`,
        sound: 'cancelled',
      },
    };

    const cfg = statusConfig[payload.status];
    const actions = payload.status === 'out_for_delivery' || payload.status === 'partner_assigned'
      ? [
          { action: 'track', title: '📍 Track Order' },
          { action: 'call_partner', title: '📞 Call Partner' },
        ]
      : payload.status === 'delivered'
      ? [
          { action: 'rate', title: '⭐ Rate Order' },
          { action: 'reorder', title: '🔄 Reorder' },
        ]
      : [{ action: 'open', title: '📍 Track Order' }];

    return buildPayload(cfg.title, cfg.body, {
      tag: `order_customer_${orderId}`,
      orderId,
      url: `/tracking/${orderId}`,
      sound: cfg.sound,
      category: 'order',
      priority: payload.status === 'delivered' || payload.status === 'cancelled' ? 'high' : 'normal',
      role: 'customer',
      requireInteraction: payload.status !== 'completed' && payload.status !== 'cancelled',
      stage: payload.status,
      version: payload.version,
      notificationId: payload.notificationId,
      actions,
    });
  }
}

// =============================================================================
// MARKETING & SYSTEM TEMPLATES
// =============================================================================
export class MarketingTemplates {
  static couponAlert(
    payload: { title: string; body: string; couponCode: string; expiryDate: string }
  ): NotificationPayload {
    return buildPayload(`🎟️ ${payload.title}`, `${payload.body}\nCode: ${payload.couponCode} • Expires: ${payload.expiryDate}`, {
      tag: `coupon_${payload.couponCode}`,
      url: '/menu',
      sound: 'marketing',
      category: 'coupon',
      priority: 'high',
      actions: [{ action: 'use_coupon', title: '🛍️ Order Now' }],
    });
  }

  static announcement(
    payload: { title: string; body: string; url?: string }
  ): NotificationPayload {
    return buildPayload(`📢 ${payload.title}`, payload.body, {
      tag: `announcement_${Date.now()}`,
      url: payload.url || '/',
      sound: 'marketing',
      category: 'announcement',
      priority: 'normal',
      actions: [{ action: 'open', title: '📖 Read More' }],
    });
  }

  static rewardEarned(
    payload: { customerName: string; points: number; message: string }
  ): NotificationPayload {
    return buildPayload(`🏆 ${payload.points} Points Earned!`, payload.message, {
      tag: `reward_${Date.now()}`,
      url: '/dashboard',
      sound: 'delivered',
      category: 'reward',
      priority: 'high',
    });
  }
}
