package com.olivepizza.app;

import android.os.Bundle;
import android.os.Build;
import android.view.WindowManager;
import com.getcapacitor.BridgeActivity;
import com.olivepizza.app.plugins.TruecallerPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
        } else {
            getWindow().addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
                                 WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON);
        }
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        registerPlugin(TruecallerPlugin.class);
        registerPlugin(DeliveryPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
