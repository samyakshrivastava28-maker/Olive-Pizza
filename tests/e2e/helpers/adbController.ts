/**
 * Resilient Wi-Fi ADB Controller for Olive Pizza Physical Device Verification
 * Target: Samsung Galaxy S21 FE 5G (SM_G990E, Android 16)
 * Supports auto-reconnect, keep-awake, app launch, screencap pull, and logcat assertion.
 * If device is offline, gracefully marks physical tests as [NOT TESTED (DEVICE_OFFLINE)].
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

export class DeviceOfflineError extends Error {
  code = 'DEVICE_OFFLINE';
  constructor(message: string) {
    super(message);
    this.name = 'DeviceOfflineError';
  }
}

export interface AdbDeviceInfo {
  serial: string;
  model: string;
  product: string;
  isOnline: boolean;
  ip: string;
}

export class AdbController {
  private adbPath: string;
  private primaryIp = '172.29.114.58:5555';
  private secondaryIp = '192.168.31.181:5555';
  private connectedSerial: string | null = null;
  private lastCheckTime = 0;
  private isCachedOnline = false;
  private cacheTtlMs = 5000; // 5s cache

  constructor() {
    this.adbPath = this.resolveAdbPath();
  }

  private resolveAdbPath(): string {
    const defaultLocalPath = 'C:\\Users\\RYZEN\\Downloads\\platform-tools\\adb.exe';
    if (fs.existsSync(defaultLocalPath)) {
      return defaultLocalPath;
    }
    return 'adb';
  }

  private exec(cmd: string, timeoutMs: number = 3000): string {
    try {
      return execSync(`"${this.adbPath}" ${cmd}`, {
        timeout: timeoutMs,
        stdio: ['pipe', 'pipe', 'pipe'],
        encoding: 'utf-8',
      }).trim();
    } catch (err: any) {
      return (err.stdout || err.stderr || err.message || '').toString().trim();
    }
  }

  /**
   * Connect to physical device trying both primary Wi-Fi Direct and secondary LAN IPs
   */
  public async ensureConnected(): Promise<string | null> {
    if (this.connectedSerial) {
      const state = this.exec(`-s ${this.connectedSerial} get-state`, 1500);
      if (state === 'device') {
        this.isCachedOnline = true;
        this.lastCheckTime = Date.now();
        return this.connectedSerial;
      }
    }

    // First try connecting to secondary (LAN) IP, then primary (Wi-Fi Direct)
    const candidateIps = [this.secondaryIp, this.primaryIp];

    for (const ip of candidateIps) {
      try {
        const connectOut = this.exec(`connect ${ip}`, 3000);
        if (connectOut.includes('connected to') || connectOut.includes('already connected to')) {
          const state = this.exec(`-s ${ip} get-state`, 1500);
          if (state === 'device') {
            this.connectedSerial = ip;
            this.isCachedOnline = true;
            this.lastCheckTime = Date.now();
            await this.enforceKeepAwake(ip);
            return ip;
          }
        }
      } catch {
        // Try next candidate
      }
    }

    // Check if device is attached in devices list
    const devicesOut = this.exec('devices', 1500);
    const lines = devicesOut.split('\n').slice(1);
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 2 && parts[1] === 'device') {
        this.connectedSerial = parts[0];
        this.isCachedOnline = true;
        this.lastCheckTime = Date.now();
        await this.enforceKeepAwake(parts[0]);
        return parts[0];
      }
    }

    this.connectedSerial = null;
    this.isCachedOnline = false;
    this.lastCheckTime = Date.now();
    return null;
  }

  /**
   * Checks if device is currently online without throwing
   */
  public async isDeviceOnline(): Promise<boolean> {
    const serial = await this.ensureConnected();
    return serial !== null;
  }

  /**
   * Enforces keep-awake via Android shell command
   */
  public async enforceKeepAwake(serial: string): Promise<boolean> {
    try {
      const res = this.exec(`-s ${serial} shell svc power stayon true`, 1500);
      return !res.includes('Error');
    } catch {
      return false;
    }
  }

  /**
   * Launches Capacitor app by package name
   */
  public async launchApp(packageName: string): Promise<{ success: boolean; output: string }> {
    const serial = await this.ensureConnected();
    if (!serial) {
      throw new DeviceOfflineError('Samsung Galaxy S21 FE 5G is not reachable via Wi-Fi ADB.');
    }

    this.exec(`-s ${serial} shell am force-stop ${packageName}`, 2000);
    const out = this.exec(`-s ${serial} shell am start -n ${packageName}/.MainActivity`, 2500);
    const success = out.includes('Starting') || !out.includes('Error');
    return { success, output: out };
  }

  /**
   * Force stop app
   */
  public async forceStopApp(packageName: string): Promise<void> {
    const serial = await this.ensureConnected();
    if (!serial) return;
    this.exec(`-s ${serial} shell am force-stop ${packageName}`, 1500);
  }

  /**
   * Pulls physical device screenshot to destination file
   */
  public async pullScreencap(destinationPath: string): Promise<boolean> {
    const serial = await this.ensureConnected();
    if (!serial) return false;

    try {
      const dir = path.dirname(destinationPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      this.exec(`-s ${serial} shell screencap -p /sdcard/olive_test_cap.png`, 3000);
      this.exec(`-s ${serial} pull /sdcard/olive_test_cap.png "${destinationPath}"`, 3000);
      this.exec(`-s ${serial} shell rm /sdcard/olive_test_cap.png`, 1500);
      return fs.existsSync(destinationPath);
    } catch {
      return false;
    }
  }

  /**
   * Checks logcat for fatal exceptions or crashes
   */
  public async checkLogcatErrors(): Promise<{ hasFatalError: boolean; fatalErrors: string[] }> {
    const serial = await this.ensureConnected();
    if (!serial) return { hasFatalError: false, fatalErrors: [] };

    try {
      const logs = this.exec(
        `-s ${serial} logcat -d -s Capacitor:V Capacitor/Console:V AndroidRuntime:E -t 200`,
        2000
      );
      const fatalErrors = logs
        .split('\n')
        .filter((l) => l.includes('FATAL EXCEPTION') || l.includes('AndroidRuntime:E'));
      return {
        hasFatalError: fatalErrors.length > 0,
        fatalErrors,
      };
    } catch {
      return { hasFatalError: false, fatalErrors: [] };
    }
  }
}

export const adbController = new AdbController();
