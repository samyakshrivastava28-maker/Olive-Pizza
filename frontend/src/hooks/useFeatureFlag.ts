import { useWebsiteConfigStore } from '../stores/websiteConfigStore';

export function useFeatureFlag(flagName: string, defaultValue = true): boolean {
  const featureFlags = useWebsiteConfigStore((state) => state.featureFlags);
  const flag = featureFlags[flagName];

  if (!flag) return defaultValue;
  if (flag.isKillSwitched) return false;
  if (!flag.enabled) return false;

  // Percentage Rollout computation based on anonymous session
  if (flag.rolloutPercent !== undefined && flag.rolloutPercent < 100) {
    const sessionId = typeof window !== 'undefined' ? window.sessionStorage.getItem('olive_session_id') || '0' : '0';
    const hash = sessionId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const bucket = hash % 100;
    return bucket < flag.rolloutPercent;
  }

  return true;
}
