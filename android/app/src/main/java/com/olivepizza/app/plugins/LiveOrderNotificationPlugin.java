package com.olivepizza.app.plugins;

import android.app.Notification;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.util.Log;

import androidx.core.app.NotificationCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.olivepizza.app.MainActivity;

/**
 * LiveOrderNotificationPlugin
 *
 * Provides persistent ongoing live order tracking notifications on Android.
 * - Uses stable tag (`olive_order_${orderId}`) and ID.
 * - Updates in-place with real-time order stages (PLACED -> ACCEPTED -> PREPARING -> OUT_FOR_DELIVERY -> DELIVERED).
 * - Displays status title, ETA, progress steps, and quick action buttons (Track Order, Call Rider).
 * - Deep links directly to `/order-tracking/:id`.
 * - When DELIVERED or CANCELLED, cancels the ongoing notification and posts a final completion notification.
 */
@CapacitorPlugin(name = "LiveOrderNotification")
public class LiveOrderNotificationPlugin extends Plugin {
    private static final String TAG = "LiveOrderNotification";

    @PluginMethod
    public void updateNotification(PluginCall call) {
        Context context = getContext();
        if (context == null) {
            call.reject("Context is null");
            return;
        }

        String orderId = call.getString("orderId");
        if (orderId == null || orderId.trim().isEmpty()) {
            call.reject("orderId is required");
            return;
        }

        String status = call.getString("status", "placed").toLowerCase();
        String title = call.getString("title", "Live Order Update");
        String body = call.getString("body", "Your order status has been updated.");
        int step = call.getInt("step", 1);
        String url = call.getString("url", "/order-tracking/" + orderId);
        String riderPhone = call.getString("riderPhone", "");

        String tag = "olive_order_" + orderId;
        int notificationId = Math.abs(orderId.hashCode());

        NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) {
            call.reject("NotificationManager is null");
            return;
        }

        boolean isTerminal = "delivered".equals(status) || "cancelled".equals(status) || "completed".equals(status);

        if (isTerminal) {
            // Cancel ongoing tracking notification
            try {
                nm.cancel(tag, notificationId);
            } catch (Exception e) {
                Log.w(TAG, "Error cancelling ongoing notification: " + e.getMessage());
            }

            // Post terminal completion notification (non-ongoing, auto-dismissible)
            Intent intent = new Intent(context, MainActivity.class);
            intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            intent.putExtra("url", url);
            intent.putExtra("orderId", orderId);
            intent.setData(Uri.parse("olivepizza://app" + url));

            PendingIntent pendingIntent = PendingIntent.getActivity(
                context,
                notificationId + 1,
                intent,
                PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
            );

            NotificationCompat.Builder builder = new NotificationCompat.Builder(context, MainActivity.CHANNEL_ORDER_COMPLETED)
                .setSmallIcon(getSmallIconResId(context))
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                .setContentIntent(pendingIntent)
                .setColor(0xFFFF6B00)
                .setOngoing(false)
                .setAutoCancel(true)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setCategory(NotificationCompat.CATEGORY_STATUS)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC);

            // Action: View Order / Receipt
            builder.addAction(0, "📍 View Order", pendingIntent);

            nm.notify(tag, notificationId + 1, builder.build());
            Log.i(TAG, "Posted terminal order notification for " + tag + " [status=" + status + "]");

            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("terminal", true);
            call.resolve(ret);
            return;
        }

        // Active ongoing tracking notification
        Intent intent = new Intent(context, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        intent.putExtra("url", url);
        intent.putExtra("orderId", orderId);
        intent.setData(Uri.parse("olivepizza://app" + url));

        PendingIntent pendingIntent = PendingIntent.getActivity(
            context,
            notificationId,
            intent,
            PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
        );

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, MainActivity.CHANNEL_ORDER_TRACKING)
            .setSmallIcon(getSmallIconResId(context))
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
            .setContentIntent(pendingIntent)
            .setColor(0xFFFF6B00)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_PROGRESS)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC);

        if (step > 0 && step <= 7) {
            builder.setProgress(7, step, false);
        }

        // Action 1: Track Order deep link
        builder.addAction(0, "📍 Track Order", pendingIntent);

        // Action 2: Call Rider if on the way & phone is available
        if (riderPhone != null && !riderPhone.trim().isEmpty() && !riderPhone.contains("*") &&
            ("out_for_delivery".equals(status) || "picked_up".equals(status) || "partner_assigned".equals(status))) {
            try {
                Intent dialIntent = new Intent(Intent.ACTION_DIAL, Uri.parse("tel:" + riderPhone.trim()));
                PendingIntent dialPendingIntent = PendingIntent.getActivity(
                    context,
                    notificationId + 2,
                    dialIntent,
                    PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
                );
                builder.addAction(0, "📞 Call Rider", dialPendingIntent);
            } catch (Exception e) {
                Log.w(TAG, "Could not attach dial action: " + e.getMessage());
            }
        }

        nm.notify(tag, notificationId, builder.build());
        Log.i(TAG, "Updated ongoing live order notification for " + tag + " [step=" + step + ", status=" + status + "]");

        JSObject ret = new JSObject();
        ret.put("success", true);
        ret.put("tag", tag);
        ret.put("notificationId", notificationId);
        call.resolve(ret);
    }

    @PluginMethod
    public void clearNotification(PluginCall call) {
        Context context = getContext();
        if (context == null) {
            call.reject("Context is null");
            return;
        }

        String orderId = call.getString("orderId");
        if (orderId == null || orderId.trim().isEmpty()) {
            call.reject("orderId is required");
            return;
        }

        String tag = "olive_order_" + orderId;
        int notificationId = Math.abs(orderId.hashCode());

        NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) {
            nm.cancel(tag, notificationId);
            nm.cancel(tag, notificationId + 1);
            Log.i(TAG, "Cleared notifications for " + tag);
        }

        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }

    private int getSmallIconResId(Context context) {
        int resId = context.getResources().getIdentifier("ic_stat_icon_config_sample", "drawable", context.getPackageName());
        if (resId == 0) {
            resId = context.getApplicationInfo().icon;
        }
        if (resId == 0) {
            resId = android.R.drawable.ic_dialog_info;
        }
        return resId;
    }
}
