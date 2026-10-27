export { cn } from "cn";

export const getLocalDateString = (d: Date = new Date()): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Detects whether the current device is a phone / mobile device.
 * Matches mobile user-agents or small-screen touch devices (< 768px).
 */
export const isPhoneDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  const isMobileUA = /Android|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isSmallTouchScreen = window.innerWidth < 768 && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
  return isMobileUA || isSmallTouchScreen;
};

/**
 * Recursively cleans an object or array for Firestore writes.
 * Removes all keys with `undefined` values so Firestore WriteBatch,
 * updateDoc, and setDoc never throw "Unsupported field value: undefined".
 * Preserves FieldValue instances (serverTimestamp, increment, etc.), Timestamps, and Dates.
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return null as any;
  }
  if (Array.isArray(data)) {
    return data
      .filter(item => item !== undefined)
      .map(item => sanitizeForFirestore(item)) as any;
  }
  if (typeof data === 'object') {
    const isSpecial =
      data instanceof Date ||
      Boolean(
        data.constructor &&
        ['FieldValue', 'Timestamp', 'ServerTimestampTransform', 'NumericIncrementTransform'].includes(data.constructor.name)
      ) ||
      Boolean((data as any)._methodName);

    if (isSpecial) {
      return data;
    }

    const cleaned: Record<string, any> = {};
    for (const [key, val] of Object.entries(data)) {
      if (val !== undefined) {
        cleaned[key] = sanitizeForFirestore(val);
      }
    }
    return cleaned as T;
  }
  return data;
}
