import { registerPlugin } from '@capacitor/core';

export interface TruecallerPlugin {
  isSupported(): Promise<{ isSupported: boolean }>;
  verify(): Promise<{
    payload: string;
    signature: string;
    signatureAlgorithm: string;
  }>;
}

export const Truecaller = registerPlugin<TruecallerPlugin>('Truecaller');
