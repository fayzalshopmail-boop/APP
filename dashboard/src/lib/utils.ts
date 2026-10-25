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
