import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Customer App Startup Deadlock Prevention Verification', () => {
  const authProviderPath = path.resolve(__dirname, '../components/AuthProvider.tsx');
  const appPath = path.resolve(__dirname, '../App.tsx');
  const storePath = path.resolve(__dirname, '../lib/store.tsx');
  const mainPath = path.resolve(__dirname, '../main.tsx');

  it('should have non-blocking auth resolution with safety watchdog timer in AuthProvider.tsx', () => {
    const content = fs.readFileSync(authProviderPath, 'utf8');

    // 1. Must include watchdog timer to prevent indefinite loading on cold start
    expect(content).toContain('failsafeTimer = setTimeout(');
    expect(content).toContain('Watchdog safety timeout triggered');

    // 2. Must NOT synchronously await getDoc before calling setLoading(false)
    expect(content).not.toMatch(/await getDoc\(doc\(db,\s*'users',\s*firebaseUser\.uid\)\);[\s\S]*?setLoading\(false\)/);

    // 3. Must asynchronously fetch Firestore profile using .then() / background promise
    expect(content).toContain("getDoc(doc(db, 'users', firebaseUser.uid))");
    expect(content).toContain('.then((userDoc) => {');

    // 4. Must immediately call setLoading(false) upon receiving auth state
    expect(content).toContain('setUser(');
    expect(content).toContain('setLoading(false);');
  });

  it('should have a strict startup safety timeout in App.tsx to prevent indefinite loader freeze', () => {
    const content = fs.readFileSync(appPath, 'utf8');

    // Must have startup safety timeout in AppContent
    expect(content).toContain('initTimeoutReached');
    expect(content).toContain('setInitTimeoutReached(true)');

    // Loader condition must include initTimeoutReached guard
    expect(content).toContain('if (isLoading && !isAuthenticated && !initTimeoutReached)');
  });

  it('should clear loading in store.tsx on rehydration even for unauthenticated sessions', () => {
    const content = fs.readFileSync(storePath, 'utf8');

    // onRehydrateStorage must clear loading whenever state exists (not solely when isAuthenticated is true)
    expect(content).toContain('onRehydrateStorage: () => (state) => {');
    expect(content).toContain('if (state) {');
    expect(content).toContain('state.setLoading(false);');
  });

  it('should use Capacitor.isNativePlatform() directly in main.tsx fetch patch', () => {
    const content = fs.readFileSync(mainPath, 'utf8');

    // Must import and use Capacitor from @capacitor/core
    expect(content).toContain("import { Capacitor } from '@capacitor/core';");
    expect(content).toContain('Capacitor.isNativePlatform()');
  });
});
