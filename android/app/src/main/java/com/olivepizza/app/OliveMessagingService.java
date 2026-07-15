package com.olivepizza.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.media.MediaPlayer;
import android.os.Build;
import android.os.PowerManager;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;

import com.capacitorjs.plugins.pushnotifications.MessagingService;
import com.google.firebase.messaging.RemoteMessage;

import java.util.Map;
import org.json.JSONArray;
import org.json.JSONObject;

public class OliveMessagingService extends MessagingService {
    private static final String TAG = "OliveMessagingService";
    private static MediaPlayer mediaPlayer;
    private static PowerManager.WakeLock wakeLock;

    @Override
    public void onMessageReceived(@NonNull RemoteMessage remoteMessage) {
        // Let Capacitor do its thing (JS foreground events)
        super.onMessageReceived(remoteMessage);
        
        Log.d(TAG, "From: " + remoteMessage.getFrom());

        // We ALSO intercept data payloads for background alarms and ongoing notifications
        if (remoteMessage.getData().size() > 0) {
            Log.d(TAG, "Message data payload: " + remoteMessage.getData());
            Map<String, String> data = remoteMessage.getData();
            
            if ("continuous".equals(data.get("alert"))) {
                startAlarm(this, data.get("sound"));
                showStandardNotification(data);
            } else {
                stopAlarm();
            }

            if ("true".equals(data.get("ongoing"))) {
                showOngoingNotification(data);
            }
        }
    }

    private void showOngoingNotification(Map<String, String> data) {
        String orderId = data.get("orderId");
        if (orderId == null) return;
        
        int notificationId = orderId.hashCode();
        String title = data.get("title");
        String body = data.get("body");
        String channelId = "olive_orders_ongoing"; // Needs to be created if not exists

        NotificationManager notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(channelId, "Live Orders", NotificationManager.IMPORTANCE_DEFAULT);
            notificationManager.createNotificationChannel(channel);
        }

        Intent intent = new Intent(this, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
        intent.putExtra("url", "/customer/orders/" + orderId);
        PendingIntent pendingIntent = PendingIntent.getActivity(this, notificationId, intent, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, channelId)
                .setSmallIcon(getResources().getIdentifier("ic_stat_icon_config_sample", "drawable", getPackageName())) // Or use default push icon
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                .setOngoing(true)
                .setOnlyAlertOnce(true)
                .setContentIntent(pendingIntent);

        // Cancel if delivered or cancelled and show a dismissable notification
        String status = data.get("stage");
        if ("delivered".equals(status) || "cancelled".equals(status) || "completed".equals(status)) {
            notificationManager.cancel(notificationId);
            
            // Create a new NON-ongoing notification for the final status
            NotificationCompat.Builder finalBuilder = new NotificationCompat.Builder(this, channelId)
                    .setSmallIcon(getResources().getIdentifier("ic_stat_icon_config_sample", "drawable", getPackageName()))
                    .setContentTitle(title)
                    .setContentText(body)
                    .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                    .setOngoing(false)
                    .setAutoCancel(true)
                    .setContentIntent(pendingIntent);
                    
            notificationManager.notify(notificationId + 1, finalBuilder.build());
            return;
        }

        notificationManager.notify(notificationId, builder.build());
    }

    private void showStandardNotification(Map<String, String> data) {
        String orderId = data.get("orderId");
        if (orderId == null) return;

        int notificationId = orderId.hashCode() + 1000; // Offset to avoid colliding with ongoing
        String title = data.get("title");
        String body = data.get("body");
        String channelId = "olive_orders_new";

        NotificationManager notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(channelId, "New Orders", NotificationManager.IMPORTANCE_HIGH);
            notificationManager.createNotificationChannel(channel);
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
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setOngoing(false) // Not ongoing, but high priority
                .setAutoCancel(true)
                .setFullScreenIntent(pendingIntent, true) // Wake up screen
                .setContentIntent(pendingIntent);

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
                            orderId.hashCode() + i, // Unique request code per action
                            actionIntent,
                            PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
                    );

                    builder.addAction(0, actionTitle, actionPendingIntent);
                }
            } catch (Exception e) {
                Log.e(TAG, "Error parsing actions", e);
            }
        }

        notificationManager.notify(notificationId, builder.build());
    }

    private void startAlarm(Context context, String soundName) {
        try {
            stopAlarm(); // Stop any existing alarm

            PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
            if (pm != null) {
                wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK |
                        PowerManager.ACQUIRE_CAUSES_WAKEUP |
                        PowerManager.ON_AFTER_RELEASE, "OlivePizza::AlarmWakeLock");
                wakeLock.acquire(10 * 60 * 1000L /*10 minutes*/);
            }

            int resId = context.getResources().getIdentifier("order_alert", "raw", context.getPackageName());
            if (soundName != null && soundName.contains(".")) {
                String name = soundName.split("\\.")[0];
                int specificResId = context.getResources().getIdentifier(name, "raw", context.getPackageName());
                if (specificResId != 0) resId = specificResId;
            }

            if (resId != 0) {
                mediaPlayer = MediaPlayer.create(context, resId);
                if (mediaPlayer != null) {
                    mediaPlayer.setLooping(true);
                    mediaPlayer.start();
                    Log.d(TAG, "Alarm started");
                }
            } else {
                Log.e(TAG, "Sound resource not found");
            }
        } catch (Exception e) {
            Log.e(TAG, "Error starting alarm", e);
        }
    }

    public static void stopAlarm() {
        if (mediaPlayer != null) {
            if (mediaPlayer.isPlaying()) {
                mediaPlayer.stop();
            }
            mediaPlayer.release();
            mediaPlayer = null;
            Log.d(TAG, "Alarm stopped");
        }
        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
            wakeLock = null;
        }
    }

    @Override
    public void onNewToken(@NonNull String token) {
        super.onNewToken(token);
        Log.d(TAG, "Refreshed token: " + token);
    }
}
