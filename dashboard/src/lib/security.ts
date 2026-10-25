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
