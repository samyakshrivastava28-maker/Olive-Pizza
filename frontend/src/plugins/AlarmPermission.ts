import { registerPlugin } from '@capacitor/core';

export interface AlarmPermissionPluginRegistry {
  setupPermissions(): Promise<void>;
}

export const AlarmPermission = registerPlugin<AlarmPermissionPluginRegistry>('AlarmPermission');
