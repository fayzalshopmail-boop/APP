/**
 * Security and Cryptography Utilities for Shop Management & POS
 * Standard Web Crypto API implementation for high-speed, secure client-side hashing.
 */

const PIN_SALT = 'pos_vault_vsc_secure_salt_2026';

/**
 * Hash a PIN using SHA-256 with a unique application salt.
 */
export async function hashPin(pin: string): Promise<string> {
  if (!pin) return '';
  const encoder = new TextEncoder();
  const data = encoder.encode(`${PIN_SALT}:${pin.trim()}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verify an entered PIN against a stored PIN (supports legacy cleartext and SHA-256 hash).
 * If a legacy cleartext PIN is encountered and matches, needsUpgrade is returned as true.
 */
export async function verifyPin(
  enteredPin: string, 
  storedPinOrHash: string | null
): Promise<{ valid: boolean; needsUpgrade: boolean; newHash?: string }> {
  if (!storedPinOrHash || !enteredPin) {
    return { valid: false, needsUpgrade: false };
  }

  const cleanEntered = enteredPin.trim();

  // 1. If stored value is a 64-character SHA-256 hex string
  if (storedPinOrHash.length === 64 && /^[0-9a-f]{64}$/i.test(storedPinOrHash)) {
    const computedHash = await hashPin(cleanEntered);
    const valid = computedHash.toLowerCase() === storedPinOrHash.toLowerCase();
    return { valid, needsUpgrade: false };
  }

  // 2. Backward compatibility: if stored value is a legacy unhashed PIN (e.g. 4-6 digits)
  if (storedPinOrHash === cleanEntered) {
    const upgradedHash = await hashPin(cleanEntered);
    return { valid: true, needsUpgrade: true, newHash: upgradedHash };
  }

  return { valid: false, needsUpgrade: false };
}

// ==========================================
// Vault Session & Idle Auto-Lock Management
// ==========================================

const VAULT_SESSION_KEY = 'vsc_vault_unlocked';
const VAULT_LAST_ACTIVE_KEY = 'vsc_vault_last_active';
const VAULT_SIG_KEY = 'vsc_vault_signature';

async function computeVaultSignature(pinHash: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`vsc_session_${pinHash}_${PIN_SALT}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Record a successful vault unlock session in localStorage with a cryptographic signature.
 */
export async function recordVaultUnlock(pinHash: string): Promise<void> {
  if (typeof window === 'undefined' || !pinHash) return;
  try {
    const sig = await computeVaultSignature(pinHash);
    localStorage.setItem(VAULT_SESSION_KEY, 'true');
    localStorage.setItem(VAULT_LAST_ACTIVE_KEY, Date.now().toString());
    localStorage.setItem(VAULT_SIG_KEY, sig);
  } catch (e) {
    console.warn('Failed to record vault unlock:', e);
  }
}

/**
 * Update the last active timestamp for the current unlocked vault session.
 */
export function updateVaultActivity(): void {
  if (typeof window === 'undefined') return;
  try {
    const isUnlocked = localStorage.getItem(VAULT_SESSION_KEY);
    if (isUnlocked === 'true') {
      localStorage.setItem(VAULT_LAST_ACTIVE_KEY, Date.now().toString());
    }
  } catch {}
}

/**
 * Verify whether the vault session is still valid within the configured idle auto-lock duration.
 * @param pinHash Hashed PIN of the authenticated user
 * @param autoLockMinutes Number of minutes before idle timeout. 0 means manual lock only.
 */
export async function isVaultSessionValid(
  pinHash: string, 
  autoLockMinutes = 5
): Promise<boolean> {
  if (typeof window === 'undefined' || !pinHash) return false;
  try {
    const isUnlocked = localStorage.getItem(VAULT_SESSION_KEY);
    const lastActiveStr = localStorage.getItem(VAULT_LAST_ACTIVE_KEY);
    const storedSig = localStorage.getItem(VAULT_SIG_KEY);

    if (isUnlocked !== 'true' || !storedSig) {
      return false;
    }

    // Cryptographic signature check prevents localStorage tampering
    const expectedSig = await computeVaultSignature(pinHash);
    if (storedSig.toLowerCase() !== expectedSig.toLowerCase()) {
      clearVaultSession();
      return false;
    }

    // If autoLockMinutes <= 0, auto-lock is disabled (Manual Lock Only)
    if (autoLockMinutes <= 0) {
      return true;
    }

    // Check timeout
    const lastActive = Number(lastActiveStr) || 0;
    const elapsedMs = Date.now() - lastActive;
    const timeoutMs = autoLockMinutes * 60 * 1000;

    if (elapsedMs > timeoutMs) {
      // Expired due to idle timeout
      clearVaultSession();
      return false;
    }

    // Still valid! Refresh lastActive
    localStorage.setItem(VAULT_LAST_ACTIVE_KEY, Date.now().toString());
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Completely clear the vault session (used on manual lock, logout, or idle timeout).
 */
export function clearVaultSession(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(VAULT_SESSION_KEY);
    localStorage.removeItem(VAULT_LAST_ACTIVE_KEY);
    localStorage.removeItem(VAULT_SIG_KEY);
  } catch {}
}

