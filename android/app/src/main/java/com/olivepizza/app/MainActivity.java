package com.olivepizza.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.olivepizza.app.plugins.TruecallerPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(TruecallerPlugin.class);
        registerPlugin(DeliveryPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
