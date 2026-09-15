import { registerPlugin, Capacitor } from '@capacitor/core';
import { fetchApi } from '../lib/config';

export interface TruecallerNativeResult {
  payload: string;
  signature: string;
  signatureAlgorithm?: string;
}

export interface TruecallerPlugin {
  isSupported(): Promise<{ isSupported: boolean }>;
  verify(): Promise<TruecallerNativeResult>;
}

export const Truecaller = registerPlugin<TruecallerPlugin>('Truecaller', {
  web: () => ({
    isSupported: async () => ({ isSupported: false }),
    verify: async () => {
      throw new Error('Native Truecaller SDK is available on Android devices. Use Web / QR verification on browsers.');
    }
  })
});

export interface TruecallerWebSessionResponse {
  success: boolean;
  requestId: string;
  deepLink: string;
  expiresAt: number;
}

export interface TruecallerSessionStatusResponse {
  success: boolean;
  status: 'PENDING' | 'VERIFIED' | 'FAILED' | 'CANCELLED';
  phone?: string;
  error?: string;
  name?: string;
  country?: string;
}

export const TruecallerService = {
  isNative: (): boolean => {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
  },

  isNativeSupported: async (): Promise<boolean> => {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
      return false;
    }
    try {
      const result = await Truecaller.isSupported();
      return Boolean(result?.isSupported);
    } catch {
      return false;
    }
  },

  verifyNative: async (): Promise<TruecallerNativeResult> => {
    return Truecaller.verify();
  },

  createWebSession: async (expectedPhone?: string, token?: string): Promise<TruecallerWebSessionResponse> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetchApi('/api/phone/truecaller/session', {
      method: 'POST',
      headers,
      body: JSON.stringify({ expectedPhone })
    });

    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.success) {
      const code = data?.code || (res.status === 429 ? 'RATE_LIMIT_EXCEEDED' : 'TRUECALLER_SESSION_CREATE_FAILED');
      let msg = data?.error;
      if (!msg) {
        if (res.status === 429) {
          msg = 'Too many verification attempts. Please verify via SMS or wait a few minutes.';
        } else if (code === 'TRUECALLER_CONFIG_MISSING') {
          msg = 'Truecaller verification is not configured for this environment. Please verify via SMS.';
        } else {
          msg = 'Truecaller verification is temporarily unavailable. Please verify via SMS.';
        }
      }
      const error: any = new Error(msg);
      error.code = code;
      throw error;
    }
    return data;
  },

  pollWebSession: async (requestId: string): Promise<TruecallerSessionStatusResponse> => {
    const res = await fetchApi(`/api/phone/truecaller/session/${requestId}`);
    const data = await res.json().catch(() => null);
    if (!res.ok || !data) {
      if (res.status === 404 || data?.code === 'TRUECALLER_SESSION_EXPIRED') {
        return {
          success: false,
          status: 'FAILED',
          error: 'Verification session expired. Please try again.'
        };
      }
      throw new Error(data?.error || 'Failed to query Truecaller session status.');
    }
    return data;
  },

  verifyOnBackend: async (payload: any, token?: string, expectedPhone?: string): Promise<any> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const bodyPayload = {
      ...payload,
      expectedPhone
    };

    const res = await fetchApi('/api/phone/truecaller', {
      method: 'POST',
      headers,
      body: JSON.stringify(bodyPayload)
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Truecaller verification failed on server.');
    }
    return data;
  }
};
