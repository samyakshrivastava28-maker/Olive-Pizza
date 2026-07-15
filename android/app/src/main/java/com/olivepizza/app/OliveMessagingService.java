package com.olivepizza.app;

import android.content.Context;
import android.media.MediaPlayer;
import android.os.PowerManager;
import android.util.Log;

import androidx.annotation.NonNull;

import com.capacitorjs.plugins.pushnotifications.MessagingService;
import com.google.firebase.messaging.RemoteMessage;

import java.util.Map;

public class OliveMessagingService extends MessagingService {
    private static final String TAG = "OliveMessagingService";
    private static MediaPlayer mediaPlayer;
    private static PowerManager.WakeLock wakeLock;

    @Override
    public void onMessageReceived(@NonNull RemoteMessage remoteMessage) {
        // Let Capacitor do its thing (JS foreground events)
        super.onMessageReceived(remoteMessage);
        
        Log.d(TAG, "From: " + remoteMessage.getFrom());

        // We ALSO intercept data payloads for background alarms
        if (remoteMessage.getData().size() > 0) {
            Log.d(TAG, "Message data payload: " + remoteMessage.getData());
            Map<String, String> data = remoteMessage.getData();
            
            if ("continuous".equals(data.get("alert"))) {
                startAlarm(this, data.get("sound"));
            } else if ("stop_alert".equals(data.get("action"))) {
                stopAlarm();
            }
        }
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

    private void stopAlarm() {
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
