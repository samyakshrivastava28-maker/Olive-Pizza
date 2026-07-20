package com.olivepizza.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;

import com.capacitorjs.plugins.pushnotifications.MessagingService;
import com.google.firebase.messaging.RemoteMessage;

import java.util.HashMap;
import java.util.Map;
import org.json.JSONArray;
import org.json.JSONObject;

import android.os.PowerManager;

/**
 * Olive Pizza — Custom Firebase Messaging Service
 *
 * RESPONSIBILITIES:
 *  1. Receive ALL FCM messages (data-only AND notification+data).
 *  2. For continuous alarms (alert=continuous) and ongoing trackers (ongoing=true),
 *     build a native notification with the correct channel, sound, full-screen intent,
 *     and action buttons — REGARDLESS of whether the message has a `notification` block.
 *  3. For notification+data messages where the app is KILLED, FCM auto-displays the
 *     notification via the system tray using the channel created at app startup
 *     (see MainActivity). When the app process IS alive, onMessageReceived fires and
 *     we build the rich native notification here.
 *  4. Register refreshed FCM tokens natively (onNewToken) so killed-app delivery
 *     always has a valid token even if the web JS bridge isn't running.
 *
 * CHANNEL STRATEGY (canonical IDs — NO suffix variants):
 *   olive_order_new           — Owner: New Orders    (MAX importance, order_alert sound)
 *   olive_order_status        — Updates              (HIGH importance, soft_pop sound)
 *   olive_order_completed     — Delivered/Cancelled  (HIGH importance, success_ding/cancel_buzz)
 *   olive_delivery_assignment — Delivery assignments (MAX importance, delivery_chime sound)
 *   olive_delivery_updates    — Navigation/progress  (HIGH importance, default)
 *   olive_marketing           — Promotions           (DEFAULT importance, soft_pop)
 *   olive_system              — Alerts               (HIGH importance, system_alert)
 *
 * These IDs MUST match the AndroidManifest default channel
 * (com.google.firebase.messaging.default_notification_channel_id = olive_order_new)
 * and the channels created in MainActivity.onCreate().
 */
public class OliveMessagingService extends MessagingService {
    private static final String TAG = "OliveMessagingService";

    @Override
    public void onMessageReceived(@NonNull RemoteMessage remoteMessage) {
        Log.d(TAG, "From: " + remoteMessage.getFrom());

        // 1. Acquire Partial WakeLock to ensure CPU doesn't sleep while processing
        PowerManager powerManager = (PowerManager) getSystemService(Context.POWER_SERVICE);
        PowerManager.WakeLock wakeLock = null;
        if (powerManager != null) {
            wakeLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "OlivePizza::NotificationWakeLock");
            wakeLock.acquire(10000); // 10 seconds max
        }

        try {
            // 2. Build a unified data map from BOTH the data payload AND the notification block.
            //    When the app is in the foreground, onMessageReceived fires for ALL message types
            //    (data-only AND notification+data). We normalize the fields so the native alarm
            //    logic works regardless of how the backend constructed the message.
            Map<String, String> data = new HashMap<>(remoteMessage.getData());

            // If a `notification` block is present, fall back to it for title/body when the
            // data block doesn't already carry them. This is the key fix for notification+data
            // messages: previously only data payloads were processed, so status-update messages
            // (which include a notification block) never triggered the native alarm path.
            RemoteMessage.Notification notif = remoteMessage.getNotification();
            if (notif != null) {
                if (!data.containsKey("title") && notif.getTitle() != null) {
                    data.put("title", notif.getTitle());
                }
                if (!data.containsKey("body") && notif.getBody() != null) {
                    data.put("body", notif.getBody());
                }
                // The notification block's click_action maps to our data "clickAction"
                if (!data.containsKey("clickAction") && notif.getClickAction() != null) {
                    data.put("clickAction", notif.getClickAction());
                }
            }

            Log.d(TAG, "Normalized data payload: " + data);

            // 3. Route to the correct native handler
            if (data.size() > 0) {
                String alert = data.get("alert");
                String ongoing = data.get("ongoing");
                String action = data.get("action");

                if ("continuous".equals(alert) || "true".equals(ongoing)) {
                    // Critical alarm or live tracker — build rich native notification
                    showNativeNotification(data);
                } else if ("stop_alert".equals(action)) {
                    stopNativeAlarm(data);
                }
                // For non-alarm status updates WITHOUT ongoing/continuous flags, the
                // notification block (if present) is already auto-displayed by FCM's
                // system tray path when the app is killed. When the app is in the
                // foreground, Capacitor's super.onMessageReceived() below forwards it
                // to the JS layer for in-app display. No native action needed here.
            }
        } catch (Exception e) {
            Log.e(TAG, "Error processing native notification", e);
        } finally {
            if (wakeLock != null && wakeLock.isHeld()) {
                wakeLock.release();
            }
        }

        // 4. Let Capacitor do its thing (JS foreground events) LAST
        // Wrapped in try-catch because if app is swiped away (dead), Capacitor might
        // crash trying to init the JS bridge. This is expected and safe to swallow.
        try {
            super.onMessageReceived(remoteMessage);
        } catch (Exception e) {
            Log.e(TAG, "Capacitor MessagingService failed (expected if app is closed)", e);
        }
    }

    private void showNativeNotification(Map<String, String> data) {
        String orderId = data.get("orderId");
        if (orderId == null) return;

        boolean isOngoing = "true".equals(data.get("ongoing"));
        boolean isContinuous = "continuous".equals(data.get("alert"));

        // Ongoing tracker uses same ID. Alarms use offset to not collide.
        int notificationId = isOngoing ? orderId.hashCode() : (orderId.hashCode() + 1000);

        String title = data.get("title");
        String body = data.get("body");
        String soundName = data.get("sound");

        // ── CANONICAL CHANNEL ID (no _v4 suffix) ─────────────────────────────
        // The previous code appended "_v4" which mismatched the manifest default
        // channel (olive_order_new). When the app is killed and FCM falls back to
        // the system tray using the manifest default, that channel didn't exist
        // → Android 8+ silently dropped the notification. Now we use the canonical
        // IDs that MainActivity.onCreate() creates at startup.
        String channelId = data.get("channelId");
        if (channelId == null || channelId.isEmpty()) {
            channelId = isOngoing ? "olive_order_status" : "olive_order_new";
        }
        // Strip any legacy "_v4" suffix to migrate to canonical IDs
        if (channelId.endsWith("_v4")) {
            channelId = channelId.substring(0, channelId.length() - 3);
        }

        NotificationManager notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);

        // Ensure the channel exists (safety net — MainActivity creates them at startup,
        // but if this service runs in a fresh process before MainActivity, we create it here).
        ensureChannelExists(notificationManager, channelId, isContinuous, isOngoing, soundName);

        Intent intent;
        if (isContinuous) {
            intent = new Intent(this, AlarmActivity.class);
            intent.putExtra("orderId", orderId);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        } else {
            intent = new Intent(this, MainActivity.class);
            intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
            intent.putExtra("url", data.get("url"));
        }
        PendingIntent pendingIntent = PendingIntent.getActivity(this, notificationId, intent, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, channelId)
                .setSmallIcon(getResources().getIdentifier("ic_stat_icon_config_sample", "drawable", getPackageName()))
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                .setContentIntent(pendingIntent);

        if (isOngoing) {
            builder.setOngoing(true).setOnlyAlertOnce(true);

            String status = data.get("stage");
            if ("delivered".equals(status) || "cancelled".equals(status) || "completed".equals(status)) {
                notificationManager.cancel(notificationId);
                builder.setOngoing(false).setAutoCancel(true);
                notificationManager.notify(notificationId + 1, builder.build());
                return;
            }
        } else {
            builder.setPriority(NotificationCompat.PRIORITY_MAX)
                   .setCategory(NotificationCompat.CATEGORY_ALARM)
                   .setAutoCancel(true)
                   .setFullScreenIntent(pendingIntent, true);
        }

        // Actions (Accept / Reject / Stop Alert)
        String actionsStr = data.get("actions");
        if (actionsStr != null) {
            try {
                JSONArray actionsArr = new JSONArray(actionsStr);
                for (int i = 0; i < actionsArr.length(); i++) {
                    JSONObject actionObj = actionsArr.getJSONObject(i);
                    String actionName = actionObj.getString("action");
                    String actionTitle = actionObj.getString("title");

                    Intent actionIntent = new Intent(this, NotificationActionReceiver.class);
                    actionIntent.setAction(actionName);
                    actionIntent.putExtra("orderId", orderId);
                    actionIntent.putExtra("notificationId", notificationId);

                    PendingIntent actionPendingIntent = PendingIntent.getBroadcast(
                            this,
                            orderId.hashCode() + i,
                            actionIntent,
                            PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
                    );
                    builder.addAction(0, actionTitle, actionPendingIntent);
                }
            } catch (Exception e) {
                Log.e(TAG, "Error parsing actions", e);
            }
        }

        Notification notification = builder.build();

        if (isContinuous) {
            notification.flags |= Notification.FLAG_INSISTENT; // Continuous loop sound!
        }

        notificationManager.notify(notificationId, notification);
    }

    /**
     * Ensures a notification channel exists with the correct importance + sound.
     * This is a safety net — MainActivity.onCreate() creates all channels at startup,
     * but if OliveMessagingService runs in a fresh process (e.g., after a force-stop
     * followed by a high-priority FCM data message), the channels may not exist yet.
     */
    private void ensureChannelExists(NotificationManager notificationManager,
                                     String channelId, boolean isContinuous, boolean isOngoing,
                                     String soundName) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        if (notificationManager.getNotificationChannel(channelId) != null) return;

        int importance = isContinuous ? NotificationManager.IMPORTANCE_MAX :
                         (isOngoing ? NotificationManager.IMPORTANCE_DEFAULT : NotificationManager.IMPORTANCE_HIGH);
        NotificationChannel channel = new NotificationChannel(channelId, channelId.replace("_", " "), importance);

        if (soundName != null && !soundName.isEmpty() && !"default".equals(soundName)) {
            String cleanSoundName = soundName.contains(".") ? soundName.split("\\.")[0] : soundName;
            int resId = getResources().getIdentifier(cleanSoundName, "raw", getPackageName());
            if (resId != 0) {
                Uri soundUri = Uri.parse("android.resource://" + getPackageName() + "/" + resId);
                AudioAttributes audioAttributes = new AudioAttributes.Builder()
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .setUsage(isContinuous ? AudioAttributes.USAGE_ALARM : AudioAttributes.USAGE_NOTIFICATION)
                        .build();
                channel.setSound(soundUri, audioAttributes);
            }
        }
        channel.enableVibration(true);
        try {
            channel.setBypassDnd(true);
        } catch (Exception e) {
            Log.w(TAG, "Failed to set Bypass DND (missing permission): " + e.getMessage());
        }
        notificationManager.createNotificationChannel(channel);
    }

    private void stopNativeAlarm(Map<String, String> data) {
        String orderId = data.get("orderId");
        if (orderId != null) {
            int notificationId = orderId.hashCode() + 1000;
            NotificationManager notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (notificationManager != null) {
                notificationManager.cancel(notificationId);
            }
        }
    }

    // Static helper for NotificationActionReceiver to cancel
    public static void stopAlarm(Context context, int notificationId) {
        NotificationManager notificationManager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (notificationManager != null) {
            notificationManager.cancel(notificationId);
        }
    }

    public static void stopAlarm() {
        // Fallback for any lingering calls that expected the old parameterless stopAlarm()
    }

    /**
     * Called when the FCM token is refreshed. We POST it to the backend so the
     * backend always has a valid token for killed-app delivery, even if the web
     * JS bridge isn't running (e.g., app is in background or was killed).
     */
    @Override
    public void onNewToken(@NonNull String token) {
        super.onNewToken(token);
        Log.d(TAG, "Refreshed FCM token: " + token);
        // Delegate to MainActivity's native token registration helper which handles
        // the authenticated POST to /api/notifications/token.
        MainActivity.registerTokenNatively(this, token, null);
    }
}
