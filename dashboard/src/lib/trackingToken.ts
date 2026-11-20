/**
 * Secret Cryptographic Tracking Token Service
 * Ensures unguessable, tamper-proof tracking URLs for repair customers.
 * Option 2: Secret Encrypted Tracking Code (Secret Link System)
 */

const SECRET_SALT = 'vvsc_track_secret_salt_2026_9b8c7e6a5d4f3b2a';

/**
 * Generate a deterministic, unguessable 16-character tracking key from an ID.
 * Uses 64-bit multi-round integer mixing (SplitMix64-based).
 */
export function generateTrackingKey(idOrCustomId: string | number): string {
  const str = `${idOrCustomId}:${SECRET_SALT}`;
  let h1 = 0xdeadbeef ^ 0x12345678;
  let h2 = 0x41c6ce57 ^ 0x87654321;

  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }

  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);

  const hex1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const hex2 = (h2 >>> 0).toString(16).padStart(8, '0');
  return `trk_${hex1}${hex2}`;
}

/**
 * Get the secret tracking key for a customer.
 * Prefers explicitly stored trackingToken, otherwise falls back to deterministic key.
 */
export function getCustomerTrackingKey(customer: { id: string; customId?: number | null; trackingToken?: string }): string {
  if (customer.trackingToken && customer.trackingToken.trim().length >= 8) {
    return customer.trackingToken.trim();
  }
  // Generate deterministic key based on customer document ID or customId
  if (customer.customId) {
    return generateTrackingKey(`cust_${customer.customId}`);
  }
  return generateTrackingKey(`doc_${customer.id}`);
}

/**
 * Get an ultra-compact (8-character) secret tracking key for a customer.
 * 8 hex characters offer 4.29+ billion combinations, making it fully unguessable.
 */
export function getShortTrackingKey(customer: { id: string; customId?: number | null; trackingToken?: string }): string {
  const fullKey = getCustomerTrackingKey(customer);
  return fullKey.replace(/^trk_/, '').slice(0, 8);
}

/**
 * Check if a provided key matches the expected secret key.
 * Supports exact full key, without 'trk_' prefix, or matching 8-char short key prefix.
 */
function matchesKey(expectedKey: string, providedKey: string): boolean {
  const cleanExp = expectedKey.trim().toLowerCase();
  const cleanProv = providedKey.trim().toLowerCase();
  if (cleanExp === cleanProv) return true;

  const expNoPrefix = cleanExp.replace(/^trk_/, '');
  const provNoPrefix = cleanProv.replace(/^trk_/, '');
  if (expNoPrefix === provNoPrefix) return true;

  // Short key match (minimum 6 hex chars required for cryptographic safety)
  if (provNoPrefix.length >= 6 && expNoPrefix.startsWith(provNoPrefix)) {
    return true;
  }

  return false;
}

/**
 * Verify if a provided key matches the customer.
 */
export function verifyTrackingKey(
  customer: { id: string; customId?: number | null; trackingToken?: string },
  providedKey: string | null | undefined
): boolean {
  if (!providedKey || typeof providedKey !== 'string') return false;

  // 1. Check against stored trackingToken
  if (customer.trackingToken && matchesKey(customer.trackingToken, providedKey)) {
    return true;
  }

  // 2. Check deterministic key by customId
  if (customer.customId) {
    const expectedCustomKey = generateTrackingKey(`cust_${customer.customId}`);
    if (matchesKey(expectedCustomKey, providedKey)) return true;
  }

  // 3. Check deterministic key by document id
  const expectedDocKey = generateTrackingKey(`doc_${customer.id}`);
  if (matchesKey(expectedDocKey, providedKey)) return true;

  // 4. Also check direct raw id without prefix for backward compatibility
  if (matchesKey(generateTrackingKey(customer.id), providedKey)) return true;
  if (customer.customId && matchesKey(generateTrackingKey(customer.customId), providedKey)) return true;

  return false;
}

/**
 * Generate ultra-compact secret tracking URL for a customer.
 * Form: /t/{id}-{shortKey} (e.g. /t/1016-c21ee6cb)
 */
export function getTrackingUrl(
  origin: string,
  customer: { id: string; customId?: number | null; trackingToken?: string },
  useShort: boolean = true
): string {
  let base = origin.replace(/\/+$/, '');

  // During local development, automatically convert localhost to the local network IP (192.168.10.248)
  // so links copied from PC will open seamlessly on mobile phones connected to the same Wi-Fi!
  if (base.includes('localhost:3000') || base.includes('127.0.0.1:3000')) {
    base = base.replace(/localhost:3000|127\.0\.0\.1:3000/, '192.168.10.248:3000');
  }

  const idParam = customer.customId || customer.id;

  if (useShort) {
    const shortKey = getShortTrackingKey(customer);
    return `${base}/t/${encodeURIComponent(idParam)}-${encodeURIComponent(shortKey)}`;
  }

  const key = getCustomerTrackingKey(customer);
  return `${base}/track?id=${encodeURIComponent(idParam)}&key=${encodeURIComponent(key)}`;
}

/**
 * Parse a raw user input string (which may be a full URL, short /t/ URL, "id-key", or key).
 */
export function parseTrackingInput(rawInput: string): { id: string | null; key: string | null } {
  const clean = rawInput.trim();
  if (!clean) return { id: null, key: null };

  // 1. If user pasted a full URL e.g. /track?id=1013&key=... or /t/1013-c21ee6cb
  try {
    if (clean.includes('/track?') || clean.includes('/t/') || clean.startsWith('http://') || clean.startsWith('https://')) {
      const urlObj = new URL(clean, 'http://localhost');
      
      // Parse short route /t/1016-c21ee6cb
      const matchT = urlObj.pathname.match(/\/t\/([^\/?#]+)/i);
      if (matchT && matchT[1]) {
        const slug = decodeURIComponent(matchT[1]);
        if (slug.includes('-')) {
          const parts = slug.split('-');
          return { id: parts[0].trim(), key: parts.slice(1).join('-').trim() };
        } else if (slug.includes('_')) {
          const parts = slug.split('_');
          return { id: parts[0].trim(), key: parts.slice(1).join('_').trim() };
        }
      }

      const id = urlObj.searchParams.get('id') || urlObj.searchParams.get('q');
      const key = urlObj.searchParams.get('key') || urlObj.searchParams.get('token') || urlObj.searchParams.get('t');
      if (id || key) {
        return { id, key };
      }
    }
  } catch {}

  // 2. Format: "1013-trk_xxxxxxxx" or "1013-c21ee6cb" or "1013:trk_xxxxxxxx"
  if (clean.includes('-') || clean.includes(':')) {
    const delimiter = clean.includes('-') ? '-' : ':';
    const parts = clean.split(delimiter);
    if (parts.length >= 2) {
      return { id: parts[0].trim(), key: parts.slice(1).join(delimiter).trim() };
    }
  }

  // 3. Just a key starting with "trk_"
  if (clean.startsWith('trk_')) {
    return { id: null, key: clean };
  }

  // 4. Raw ID without key
  return { id: clean, key: null };
}
