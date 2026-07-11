/**
 * Android Notification Channel Configuration
 *
 * Defines all 7 channels with correct importance, sound, vibration, and LED settings.
 * Channels are created once at app startup on Android.
 * Each channel uses a specific sound so that different events have distinct alerts.
 *
 * NOTE: On Android, each channel is bound to exactly one sound (set at channel creation).
 * Changing a sound after channel creation requires the user to manually reset it in Settings.
 * Therefore, we use separate channels for separate sounds.
 */

import type { Channel } from '@capacitor/push-notifications';

// Importance levels (Android)
const IMPORTANCE_MAX  = 5; // Heads-up notification, makes sound, interrupts
const IMPORTANCE_HIGH = 4; // Makes sound, does not interrupt
const IMPORTANCE_DEFAULT = 3; // Makes sound
const IMPORTANCE_LOW  = 2; // No sound

// Visibility
const VISIBILITY_PUBLIC  = 1;  // Shown on lock screen
const VISIBILITY_PRIVATE = 0;  // Hidden on lock screen (default for sensitive)

export const NOTIFICATION_CHANNELS: Channel[] = [
  // Owner receives new order — MAXIMUM importance, wakes device
  {
    id: 'olive_order_new',
    name: 'New Orders',
    description: 'Critical alerts for new incoming orders',
    importance: IMPORTANCE_MAX,
    visibility: VISIBILITY_PUBLIC,
    vibration: true,
    // sound: 'order_alert', // Uncomment when custom sound files are placed in android/app/src/main/res/raw/
  },

  // Status updates (preparing, ready, etc.) — HIGH importance
  {
    id: 'olive_order_status',
    name: 'Order Status Updates',
    description: 'Order progress notifications (preparing, packed, etc.)',
    importance: IMPORTANCE_HIGH,
    visibility: VISIBILITY_PUBLIC,
    vibration: true,
    // sound: 'soft_pop',
  },

  // Delivered or Cancelled — HIGH importance with specific sound
  {
    id: 'olive_order_completed',
    name: 'Order Completed / Cancelled',
    description: 'Notifications when an order is delivered or cancelled',
    importance: IMPORTANCE_HIGH,
    visibility: VISIBILITY_PUBLIC,
    vibration: true,
    // sound: 'success_ding',
  },

  // Delivery partner: new assignment — MAXIMUM importance, wakes device
  {
    id: 'olive_delivery_assignment',
    name: 'Delivery Assignments',
    description: 'Critical new delivery assignment alerts',
    importance: IMPORTANCE_MAX,
    visibility: VISIBILITY_PUBLIC,
    vibration: true,
    // sound: 'delivery_chime',
  },

  // Delivery partner: navigation / progress — HIGH importance
  {
    id: 'olive_delivery_updates',
    name: 'Delivery Updates',
    description: 'Delivery navigation and progress updates',
    importance: IMPORTANCE_HIGH,
    visibility: VISIBILITY_PUBLIC,
    vibration: false,
  },

  // Marketing: promotions, coupons — DEFAULT importance
  {
    id: 'olive_marketing',
    name: 'Promotions & Offers',
    description: 'Promotional notifications, coupons, and announcements',
    importance: IMPORTANCE_DEFAULT,
    visibility: VISIBILITY_PRIVATE,
    vibration: false,
  },

  // System alerts — HIGH importance
  {
    id: 'olive_system',
    name: 'System Alerts',
    description: 'Critical system alerts and account updates',
    importance: IMPORTANCE_HIGH,
    visibility: VISIBILITY_PUBLIC,
    vibration: true,
  },
];

/**
 * Action types for native notification action buttons.
 * Each type corresponds to an FCM clickAction value.
 */
export const NOTIFICATION_ACTION_TYPES = [
  {
    id: 'owner_order_actions',
    actions: [
      { id: 'accept',     title: 'Accept',     foreground: true  },
      { id: 'reject',     title: 'Reject',     destructive: true },
      { id: 'view',       title: 'View Order', foreground: true  },
    ],
  },
  {
    id: 'customer_order_actions',
    actions: [
      { id: 'track',    title: 'Track Order',  foreground: true },
      { id: 'rate',     title: 'Rate Order',   foreground: true },
      { id: 'reorder',  title: 'Reorder',      foreground: true },
    ],
  },
  {
    id: 'delivery_actions',
    actions: [
      { id: 'accept_delivery', title: 'Accept',   foreground: true  },
      { id: 'navigate',        title: 'Navigate', foreground: true  },
      { id: 'reject_delivery', title: 'Reject',   destructive: true },
    ],
  },
];
