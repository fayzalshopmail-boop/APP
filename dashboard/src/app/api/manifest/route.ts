import { NextResponse } from 'next/server';
import { defaultShopSettings, ShopSettings } from '@/lib/services/shopSettings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

let cachedManifest: any = null;
let lastManifestFetch = 0;
const CACHE_TTL_MS = 60 * 1000; // 60 seconds in-memory cache

export async function GET() {
  const now = Date.now();
  if (cachedManifest && (now - lastManifestFetch < CACHE_TTL_MS)) {
    return NextResponse.json(cachedManifest, {
      headers: {
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
        'Content-Type': 'application/manifest+json'
      }
    });
  }

  let shopSettings: ShopSettings = defaultShopSettings;

  try {
    const { adminDb } = await import('@/lib/firebase-admin');
    if (adminDb) {
      const docSnap = await adminDb.collection('settings').doc('shop').get();
      if (docSnap.exists) {
        shopSettings = { ...defaultShopSettings, ...docSnap.data() } as ShopSettings;
      }
    }
  } catch (err) {
    console.warn('Failed to fetch shop settings for manifest via adminDb:', err);
  }

  const isPng = shopSettings.logoUrl?.includes('image/png');
  const isJpeg = shopSettings.logoUrl?.includes('image/jpeg') || shopSettings.logoUrl?.includes('image/jpg');

  const manifest = {
    name: shopSettings.shopTitle || shopSettings.shopName || "Shop Dashboard",
    short_name: shopSettings.shopName || "POS",
    description: "Modern POS and Shop Management Dashboard",
    start_url: "/",
    display: "standalone",
    background_color: "#0b0e14",
    theme_color: "#0b0e14",
    icons: [
      {
        src: "/api/favicon",
        sizes: "192x192 512x512",
        type: isPng ? 'image/png' : (isJpeg ? 'image/jpeg' : 'image/svg+xml'),
        purpose: "any maskable"
      },
      {
        src: "/api/favicon",
        sizes: "192x192",
        type: isPng ? 'image/png' : (isJpeg ? 'image/jpeg' : 'image/svg+xml')
      },
      {
        src: "/api/favicon",
        sizes: "512x512",
        type: isPng ? 'image/png' : (isJpeg ? 'image/jpeg' : 'image/svg+xml')
      }
    ]
  };

  cachedManifest = manifest;
  lastManifestFetch = now;

  return NextResponse.json(manifest, {
    headers: {
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      'Content-Type': 'application/manifest+json'
    }
  });
}
