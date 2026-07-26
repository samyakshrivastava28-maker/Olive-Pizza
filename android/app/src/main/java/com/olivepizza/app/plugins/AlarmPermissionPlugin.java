package com.olivepizza.app.plugins;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.olivepizza.app.MainActivity;

@CapacitorPlugin(name = "AlarmPermission")
public class AlarmPermissionPlugin extends Plugin {
    @PluginMethod
    public void setupPermissions(PluginCall call) {
        if (getActivity() != null) {
            getActivity().runOnUiThread(() -> {
                MainActivity.setupAlarmPermissionsForStaffRole(getActivity());
                call.resolve();
            });
        } else {
            call.reject("Activity is null");
        }
    }
}
