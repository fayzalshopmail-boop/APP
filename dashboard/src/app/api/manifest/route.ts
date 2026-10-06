import { NextResponse } from 'next/server';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { defaultShopSettings, ShopSettings } from '@/lib/services/shopSettings';

export const dynamic = 'force-dynamic';

export async function GET() {
  let shopSettings: ShopSettings = defaultShopSettings;

  try {
    if (db) {
      const docRef = doc(db, 'settings', 'shop');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        shopSettings = { ...defaultShopSettings, ...docSnap.data() } as ShopSettings;
      }
    }
  } catch (err) {
    console.error('Failed to fetch shop settings for manifest', err);
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

  return NextResponse.json(manifest, {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Content-Type': 'application/manifest+json'
    }
  });
}

