import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export interface AttendanceSecuritySettings {
  enabled: boolean;                 // Master switch: is security active?
  mode: 'strict' | 'flexible';      // 'strict' = both required, 'flexible' = at least one required
  
  // GPS Geofencing
  gpsEnabled: boolean;
  shopLatitude: number | null;
  shopLongitude: number | null;
  radiusMeters: number;            // Default 50m
  shopLocationName?: string;
  
  // Wi-Fi Restriction
  wifiEnabled: boolean;
  allowedIpAddresses: string[];    // e.g. ["103.xxx.xxx.xxx", "192.168.10.x"]
  shopWifiSsid?: string;           // Wi-Fi Name (for staff guidance)
  
  // Bypass permissions
  allowOwnerBypass: boolean;       // Owner/Manager can bypass if needed
  updatedAt?: any;
}

export const defaultAttendanceSecuritySettings: AttendanceSecuritySettings = {
  enabled: true,
  mode: 'strict',
  gpsEnabled: true,
  shopLatitude: null,
  shopLongitude: null,
  radiusMeters: 50,
  shopLocationName: 'দোকানের মূল শাখা',
  wifiEnabled: true,
  allowedIpAddresses: [],
  shopWifiSsid: '',
  allowOwnerBypass: false
};

export interface VerificationResult {
  allowed: boolean;
  error?: string;
  verifiedBy?: 'GPS + Wi-Fi' | 'GPS' | 'Wi-Fi' | 'Manual / Owner' | 'Unrestricted';
  distanceMeters?: number;
  clientIp?: string;
  wifiMatched: boolean;
  gpsMatched: boolean;
}

/**
 * Calculate distance between two coordinates in meters using the Haversine formula
 */
export function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

/**
 * Fetch client's current IP address
 */
export async function getCurrentClientIp(): Promise<string> {
  // 1. Try local API route first
  try {
    const res = await fetch('/api/ip', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data?.ip && data.ip !== '127.0.0.1' && data.ip !== '::1') {
        return data.ip;
      }
    }
  } catch (e) {
    // Continue to fallback
  }

  // 2. Fallback to public ipify service
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const res = await fetch('https://api.ipify.org?format=json', {
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      if (data?.ip) return data.ip;
    }
  } catch (e) {
    // Continue
  }

  // 3. Fallback to local origin host if on LAN
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return hostname;
    }
  }

  return '127.0.0.1';
}

/**
 * Retrieve user's current GPS Coordinates with high accuracy
 */
export function getCurrentGpsLocation(): Promise<{ latitude: number; longitude: number; accuracy: number }> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      reject(new Error('আপনার ব্রাউজারে GPS লোকেশন সাপোর্ট করে না।'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
      },
      (error) => {
        let msg = 'লোকেশন পাওয়া যায়নি।';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            msg = 'ফোনে লোকেশন পারমিশন দেওয়া হয়নি। ব্রাউজার সেটিংসে গিয়ে লোকেশন অন করুন।';
            break;
          case error.POSITION_UNAVAILABLE:
            msg = 'GPS অবস্থান নির্ণয় করা যায়নি। ফোনের GPS চালু করুন।';
            break;
          case error.TIMEOUT:
            msg = 'লোকেশন নির্ণয়ের সময় শেষ হয়েছে। পুনরায় চেষ্টা করুন।';
            break;
        }
        reject(new Error(msg));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 10000
      }
    );
  });
}

export const attendanceSecurityService = {
  /**
   * Get attendance security settings
   */
  async getSettings(): Promise<AttendanceSecuritySettings> {
    try {
      if (!db) return defaultAttendanceSecuritySettings;
      const docRef = doc(db, 'settings', 'attendance_security');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { ...defaultAttendanceSecuritySettings, ...docSnap.data() } as AttendanceSecuritySettings;
      }
      return defaultAttendanceSecuritySettings;
    } catch (e) {
      console.error('Failed to load attendance security settings:', e);
      return defaultAttendanceSecuritySettings;
    }
  },

  /**
   * Save attendance security settings
   */
  async saveSettings(settings: AttendanceSecuritySettings): Promise<void> {
    if (!db) throw new Error('Database not initialized');
    const docRef = doc(db, 'settings', 'attendance_security');
    await setDoc(docRef, {
      ...settings,
      updatedAt: serverTimestamp()
    }, { merge: true });
  },

  /**
   * Run verification check for staff check-in/out
   */
  async verifyAttendanceAccess(userRole?: string, bypassOwner: boolean = false): Promise<VerificationResult> {
    const settings = await this.getSettings();

    // 1. If security is disabled entirely, allow immediately
    if (!settings.enabled) {
      return {
        allowed: true,
        verifiedBy: 'Unrestricted',
        wifiMatched: true,
        gpsMatched: true
      };
    }

    // 2. If user is Owner / Manager and manual bypass is explicitly requested
    if (bypassOwner && settings.allowOwnerBypass && (userRole === 'Owner' || userRole === 'Manager')) {
      return {
        allowed: true,
        verifiedBy: 'Manual / Owner',
        wifiMatched: true,
        gpsMatched: true
      };
    }

    let clientIp = '';
    let distanceMeters: number | undefined;
    let wifiMatched = false;
    let gpsMatched = false;
    const errors: string[] = [];

    // --- Wi-Fi Verification ---
    if (settings.wifiEnabled) {
      if (!settings.allowedIpAddresses || settings.allowedIpAddresses.length === 0) {
        wifiMatched = false;
        errors.push('দোকানের Wi-Fi আইপি এখনো লক করা হয়নি (সেটিংস থেকে লক করুন)');
      } else {
        try {
          clientIp = await getCurrentClientIp();
          // Check if clientIp matches any allowed IP
          const matched = settings.allowedIpAddresses.some(ip => {
            const cleanAllowed = ip.trim();
            const cleanClient = clientIp.trim();
            if (cleanAllowed === cleanClient) return true;
            // Check subnet match (e.g., 192.168.10.*)
            if (cleanAllowed.endsWith('*')) {
              const prefix = cleanAllowed.slice(0, -1);
              return cleanClient.startsWith(prefix);
            }
            return false;
          });

          if (matched) {
            wifiMatched = true;
          } else {
            const wifiHint = settings.shopWifiSsid ? `("${settings.shopWifiSsid}")` : '';
            errors.push(`দোকানের অনুমোদিত Wi-Fi ${wifiHint}-তে কানেক্ট করুন`);
          }
        } catch (e: any) {
          errors.push('Wi-Fi নেটওয়ার্ক যাচাই ব্যর্থ হয়েছে।');
        }
      }
    } else {
      wifiMatched = true; // Not enabled, counts as passed
    }

    // --- GPS Geofencing Verification ---
    if (settings.gpsEnabled) {
      if (settings.shopLatitude === null || settings.shopLongitude === null) {
        gpsMatched = false;
        errors.push('দোকানের GPS লোকেশন এখনো সেট করা হয়নি (সেটিংস থেকে সেট করুন)');
      } else {
        try {
          const loc = await getCurrentGpsLocation();
          distanceMeters = calculateDistanceMeters(
            loc.latitude,
            loc.longitude,
            settings.shopLatitude,
            settings.shopLongitude
          );

          const maxAllowed = settings.radiusMeters || 50;
          // Account for indoor mobile GPS hardware drift (accuracy tolerance)
          const accuracyTolerance = Math.min(Math.round((loc.accuracy || 0) * 0.5), 35);
          if (distanceMeters <= (maxAllowed + accuracyTolerance)) {
            gpsMatched = true;
          } else {
            errors.push(`আপনি দোকান থেকে ${distanceMeters}m দূরে আছেন (অনুমোদিত ${maxAllowed}m)`);
          }
        } catch (e: any) {
          errors.push(e.message || 'GPS লোকেশন যাচাই করা যায়নি।');
        }
      }
    } else {
      gpsMatched = true; // Not enabled, counts as passed
    }

    // --- Check based on Mode: Strict vs Flexible ---
    let allowed = false;
    let verifiedBy: VerificationResult['verifiedBy'] = 'Unrestricted';

    if (settings.mode === 'strict') {
      // Both must match
      if (wifiMatched && gpsMatched) {
        allowed = true;
        if (settings.gpsEnabled && settings.wifiEnabled) {
          verifiedBy = 'GPS + Wi-Fi';
        } else if (settings.gpsEnabled) {
          verifiedBy = 'GPS';
        } else {
          verifiedBy = 'Wi-Fi';
        }
      }
    } else {
      // Flexible: At least one must match
      if (wifiMatched || gpsMatched) {
        allowed = true;
        if (wifiMatched && gpsMatched) {
          verifiedBy = 'GPS + Wi-Fi';
        } else if (wifiMatched) {
          verifiedBy = 'Wi-Fi';
        } else {
          verifiedBy = 'GPS';
        }
      }
    }

    return {
      allowed,
      error: allowed ? undefined : errors.join(' এবং '),
      verifiedBy,
      distanceMeters,
      clientIp,
      wifiMatched,
      gpsMatched
    };
  }
};
