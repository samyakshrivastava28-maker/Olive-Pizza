package com.olivepizza.app;

import android.app.NotificationManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.widget.Toast;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;

import org.json.JSONObject;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

public class NotificationActionReceiver extends BroadcastReceiver {
    private static final String TAG = "NotificationAction";
    // Using relative path isn't possible here natively without build config, so we use the prod URL.
    // In a real app this would be injected via BuildConfig.
    private static final String BACKEND_URL = "https://olive-pizza-backend.onrender.com/api/notification/action";

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        String orderId = intent.getStringExtra("orderId");
        int notificationId = intent.getIntExtra("notificationId", -1);

        if (action == null || orderId == null) {
            return;
        }

        Log.d(TAG, "Received action: " + action + " for order: " + orderId);

        // For instantly stopping the alarm on this device before the network call completes
        OliveMessagingService.stopAlarm();

        final PendingResult pendingResult = goAsync();

        FirebaseUser user = FirebaseAuth.getInstance().getCurrentUser();
        if (user == null) {
            Log.e(TAG, "User not authenticated. Cannot perform action.");
            showToast(context, "Cannot complete action: You are logged out.");
            pendingResult.finish();
            return;
        }

        user.getIdToken(true).addOnCompleteListener(task -> {
            if (task.isSuccessful() && task.getResult() != null) {
                String token = task.getResult().getToken();
                performBackendAction(context, action, orderId, notificationId, token, pendingResult);
            } else {
                Log.e(TAG, "Failed to get Firebase token", task.getException());
                showToast(context, "Failed to authenticate. Please open the app.");
                pendingResult.finish();
            }
        });
    }

    private void performBackendAction(Context context, String action, String orderId, int notificationId, String token, PendingResult pendingResult) {
        new Thread(() -> {
            HttpURLConnection conn = null;
            try {
                URL url = new URL(BACKEND_URL);
                conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "application/json");
                conn.setRequestProperty("Authorization", "Bearer " + token);
                conn.setDoOutput(true);

                JSONObject payload = new JSONObject();
                payload.put("orderId", orderId);
                payload.put("action", action);
                payload.put("stage", "new_order");

                try (OutputStream os = conn.getOutputStream()) {
                    byte[] input = payload.toString().getBytes("utf-8");
                    os.write(input, 0, input.length);
                }

                int responseCode = conn.getResponseCode();
                Log.d(TAG, "Backend response code: " + responseCode);

                if (responseCode >= 200 && responseCode < 300) {
                    NotificationManager notificationManager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
                    if (notificationId != -1) {
                        notificationManager.cancel(notificationId);
                    }
                    showToast(context, "Order " + action + "ed successfully.");
                } else if (responseCode == 409) {
                    showToast(context, "Action failed: Order already processed.");
                } else {
                    showToast(context, "Action failed: Server error (" + responseCode + "). Open the app to complete.");
                }

            } catch (Exception e) {
                Log.e(TAG, "Exception during backend action", e);
                showToast(context, "Network error. Please open the app to complete.");
            } finally {
                if (conn != null) {
                    conn.disconnect();
                }
                pendingResult.finish();
            }
        }).start();
    }

    private void showToast(Context context, String message) {
        new Handler(Looper.getMainLooper()).post(() -> Toast.makeText(context, message, Toast.LENGTH_LONG).show());
    }
}
