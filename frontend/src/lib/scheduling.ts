/**
 * Global Scheduling Engine
 * Used by: Ads, Coupons, Special Categories, Featured Products, Homepage Sections
 * Architecture: Firestore-only. No Supabase/Postgres business logic.
 */

export type RecurringRule =
  | { type: 'permanent' }
  | { type: 'weekdays' } // Mon-Fri
  | { type: 'weekends' } // Sat-Sun
  | { type: 'specific_days'; days: number[] } // 0=Sun, 1=Mon, ..., 6=Sat
  | { type: 'every_month'; dayOfMonth: number }
  | { type: 'every_year'; month: number; day: number };

export interface ScheduledItem {
  isActive?: boolean;
  status?: 'draft' | 'published' | 'archived';
  startDate?: string; // ISO string or date string
  endDate?: string;
  specificTime?: string; // "HH:MM"
  recurringRule?: RecurringRule;
}

/**
 * Determines if a scheduled item is currently visible/active.
 * Applies to: ads, coupons, special_categories, home sections, combos.
 */
export function isCurrentlyScheduled(item: ScheduledItem): boolean {
  // Must be active and published (not draft)
  if (item.isActive === false) return false;
  if (item.status === 'draft' || item.status === 'archived') return false;

  const now = new Date();

  // Check date range
  if (item.startDate) {
    const start = new Date(item.startDate);
    if (now < start) return false;
  }

  if (item.endDate) {
    const end = new Date(item.endDate);
    if (now > end) return false;
  }

  // Check specific time window (hour-level granularity)
  if (item.specificTime) {
    const [hours, minutes] = item.specificTime.split(':').map(Number);
    const nowHour = now.getHours();
    const nowMinute = now.getMinutes();
    const itemMinutes = hours * 60 + minutes;
    const nowMinutes = nowHour * 60 + nowMinute;
    // Show for up to 1 hour after specific time
    if (nowMinutes < itemMinutes || nowMinutes > itemMinutes + 60) return false;
  }

  // Check recurring rule
  if (item.recurringRule) {
    const rule = item.recurringRule;
    const dayOfWeek = now.getDay(); // 0=Sun, 6=Sat
    const dayOfMonth = now.getDate();
    const month = now.getMonth() + 1; // 1-indexed

    switch (rule.type) {
      case 'permanent':
        break; // Always active
      case 'weekdays':
        if (dayOfWeek === 0 || dayOfWeek === 6) return false;
        break;
      case 'weekends':
        if (dayOfWeek !== 0 && dayOfWeek !== 6) return false;
        break;
      case 'specific_days':
        if (!rule.days.includes(dayOfWeek)) return false;
        break;
      case 'every_month':
        if (dayOfMonth !== rule.dayOfMonth) return false;
        break;
      case 'every_year':
        if (month !== rule.month || dayOfMonth !== rule.day) return false;
        break;
    }
  }

  return true;
}

/**
 * Filters an array of scheduled items to only return currently active ones.
 * Sorts by priority (higher first) and then by creation date.
 */
export function filterActive<T extends ScheduledItem & { priority?: number; createdAt?: string }>(
  items: T[]
): T[] {
  return items
    .filter(isCurrentlyScheduled)
    .sort((a, b) => {
      const pa = a.priority ?? 0;
      const pb = b.priority ?? 0;
      if (pb !== pa) return pb - pa;
      // Secondary sort: newest first
      const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return db - da;
    });
}

/**
 * Returns a human-readable status label for an item.
 */
export function getScheduleStatus(item: ScheduledItem): {
  label: string;
  color: 'green' | 'orange' | 'red' | 'slate';
} {
  if (item.status === 'draft') return { label: 'Draft', color: 'slate' };
  if (item.isActive === false) return { label: 'Paused', color: 'orange' };

  const now = new Date();
  if (item.startDate && now < new Date(item.startDate)) {
    return { label: 'Scheduled', color: 'orange' };
  }
  if (item.endDate && now > new Date(item.endDate)) {
    return { label: 'Expired', color: 'red' };
  }
  if (isCurrentlyScheduled(item)) return { label: 'Live', color: 'green' };
  return { label: 'Inactive', color: 'slate' };
}

/**
 * Returns milliseconds until an item expires, or null if permanent.
 */
export function msUntilExpiry(item: ScheduledItem): number | null {
  if (!item.endDate) return null;
  const end = new Date(item.endDate).getTime();
  const now = Date.now();
  return Math.max(0, end - now);
}

/**
 * Format a countdown into { days, hours, minutes, seconds }
 */
export function formatCountdown(ms: number): {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
} {
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { days, hours, minutes, seconds };
}
