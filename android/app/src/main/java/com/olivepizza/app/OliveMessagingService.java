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

import java.util.Map;
import org.json.JSONArray;
import org.json.JSONObject;

import android.os.PowerManager;

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
            // 2. We intercept data payloads for background alarms and ongoing notifications FIRST
            if (remoteMessage.getData().size() > 0) {
                Log.d(TAG, "Message data payload: " + remoteMessage.getData());
                Map<String, String> data = remoteMessage.getData();
                
                if ("continuous".equals(data.get("alert")) || "true".equals(data.get("ongoing"))) {
                    showNativeNotification(data);
                } else if (data.containsKey("action") && "stop_alert".equals(data.get("action"))) {
                    stopNativeAlarm(data);
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Error processing native notification", e);
        } finally {
            if (wakeLock != null && wakeLock.isHeld()) {
                wakeLock.release();
            }
        }

        // 3. Let Capacitor do its thing (JS foreground events) LAST
        // Wrapped in try-catch because if app is swiped away (dead), Capacitor might crash trying to init the JS bridge.
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
        
        // Use v2 channels to guarantee sound configuration applies
        String baseChannelId = data.get("channelId");
        if (baseChannelId == null) {
            baseChannelId = isOngoing ? "olive_orders_ongoing" : "olive_orders_new";
        }
        String channelId = baseChannelId + "_v4";

        NotificationManager notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        
        // Create Channel with Sound
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = notificationManager.getNotificationChannel(channelId);
            if (channel == null) {
                int importance = isContinuous ? NotificationManager.IMPORTANCE_MAX : 
                                 (isOngoing ? NotificationManager.IMPORTANCE_DEFAULT : NotificationManager.IMPORTANCE_HIGH);
                channel = new NotificationChannel(channelId, channelId.replace("_", " "), importance);
                
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
                // Set Bypass DND for critical alarms (Requires special permission on some OS versions)
                try {
                    channel.setBypassDnd(true);
                } catch (Exception e) {
                    Log.w(TAG, "Failed to set Bypass DND (missing permission): " + e.getMessage());
                }
                notificationManager.createNotificationChannel(channel);
            }
        }

        Intent intent = new Intent(this, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
        intent.putExtra("url", data.get("url"));
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

        // Actions
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
    
    private void stopNativeAlarm(Map<String, String> data) {
        String orderId = data.get("orderId");
        if (orderId != null) {
            int notificationId = orderId.hashCode() + 1000;
            NotificationManager notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            notificationManager.cancel(notificationId);
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

    @Override
    public void onNewToken(@NonNull String token) {
        super.onNewToken(token);
        Log.d(TAG, "Refreshed token: " + token);
    }
}

