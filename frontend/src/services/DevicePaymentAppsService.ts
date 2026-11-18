import { Capacitor } from '@capacitor/core';
import { AppLauncher } from '@capacitor/app-launcher';

export interface DevicePaymentApp {
  id: string;
  name: string;
  scheme: string;
  packageName?: string;
  isInstalled: boolean;
  iconName: string;
  brandColor: string;
  bgLight: string;
  description: string;
}

const AUTHORIZED_UPI_APPS: Omit<DevicePaymentApp, 'isInstalled'>[] = [
  {
    id: 'upi_phonepe',
    name: 'PhonePe',
    scheme: 'phonepe://pay',
    packageName: 'com.phonepe.app',
    iconName: 'phonepe',
    brandColor: '#5f259f',
    bgLight: 'bg-purple-50 text-purple-700 border-purple-200',
    description: 'Instant UPI transfer via PhonePe'
  },
  {
    id: 'upi_gpay',
    name: 'Google Pay',
    scheme: 'tez://upi/pay',
    packageName: 'com.google.android.apps.nbu.paisa.user',
    iconName: 'gpay',
    brandColor: '#1a73e8',
    bgLight: 'bg-blue-50 text-blue-700 border-blue-200',
    description: 'Pay directly via Google Pay'
  },
  {
    id: 'upi_paytm',
    name: 'Paytm UPI',
    scheme: 'paytmmp://pay',
    packageName: 'net.one97.paytm',
    iconName: 'paytm',
    brandColor: '#00b9f5',
    bgLight: 'bg-sky-50 text-sky-700 border-sky-200',
    description: 'Pay via Paytm UPI or Wallet'
  },
  {
    id: 'upi_bhim',
    name: 'BHIM UPI',
    scheme: 'upi://pay',
    packageName: 'in.org.npci.upiapp',
    iconName: 'bhim',
    brandColor: '#28a745',
    bgLight: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    description: 'National Payments Corporation BHIM'
  },
  {
    id: 'upi_cred',
    name: 'CRED Pay',
    scheme: 'cred://pay',
    packageName: 'com.dreamplug.androidapp',
    iconName: 'cred',
    brandColor: '#000000',
    bgLight: 'bg-slate-100 text-slate-800 border-slate-300',
    description: 'UPI payment via CRED'
  }
];

export class DevicePaymentAppsService {
  private static cachedApps: DevicePaymentApp[] | null = null;
  private static lastCheckTime = 0;

  /**
   * Scans client device ONLY for supported UPI / online payment apps.
   * Strictly respects privacy: never queries or inspects non-payment apps.
   */
  public static async getAvailablePaymentApps(): Promise<DevicePaymentApp[]> {
    const now = Date.now();
    // Cache detection results for 60 seconds during checkout
    if (this.cachedApps && (now - this.lastCheckTime < 60000)) {
      return this.cachedApps;
    }

    const isNative = Capacitor.isNativePlatform();

    if (!isNative) {
      // On web / desktop browsers, all authorized UPI options are presented
      const webApps: DevicePaymentApp[] = AUTHORIZED_UPI_APPS.map(app => ({
        ...app,
        isInstalled: false
      }));
      this.cachedApps = webApps;
      this.lastCheckTime = now;
      return webApps;
    }

    // On native Android / iOS, query only the authorized payment schemes
    const results: DevicePaymentApp[] = [];
    for (const app of AUTHORIZED_UPI_APPS) {
      let isInstalled = false;
      try {
        const canOpen = await AppLauncher.canOpenUrl({ url: app.scheme });
        isInstalled = Boolean(canOpen.value);
      } catch (e) {
        isInstalled = false;
      }

      results.push({
        ...app,
        isInstalled
      });
    }

    // Sort so installed apps appear prominently first
    results.sort((a, b) => (b.isInstalled ? 1 : 0) - (a.isInstalled ? 1 : 0));

    this.cachedApps = results;
    this.lastCheckTime = now;
    return results;
  }

  /**
   * Launches the selected payment app on native device, or falls back to UPI URI.
   */
  public static async launchPaymentApp(params: {
    appId: string;
    upiUrl?: string;
  }): Promise<boolean> {
    const { appId, upiUrl } = params;
    const target = AUTHORIZED_UPI_APPS.find(a => a.id === appId);

    if (!target) return false;

    const urlToOpen = upiUrl || target.scheme;

    if (Capacitor.isNativePlatform()) {
      try {
        const canOpen = await AppLauncher.canOpenUrl({ url: urlToOpen });
        if (canOpen.value) {
          await AppLauncher.openUrl({ url: urlToOpen });
          return true;
        }
      } catch (err) {
        console.warn('[DevicePaymentApps] Error launching payment app:', err);
      }
    }

    // Fallback: try window.location on mobile web
    if (typeof window !== 'undefined' && /android|iphone|ipad/i.test(navigator.userAgent)) {
      window.location.href = urlToOpen;
      return true;
    }

    return false;
  }
}
