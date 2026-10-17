import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { defaultShopSettings, ShopSettings } from '@/lib/services/shopSettings';

export const dynamic = 'force-dynamic';

interface CachedFavicon {
  data: Uint8Array;
  mimeType: string;
  timestamp: number;
}

let memoryCachedFavicon: CachedFavicon | null = null;
let lastCheckTime = 0;
const CACHE_TTL_MS = 60 * 1000; // 60 seconds in-memory cache

export async function GET(req: NextRequest) {
  const fallbackUrl = new URL('/icon.svg', req.url);
  const now = Date.now();

  // Return from in-memory cache if fresh
  if (memoryCachedFavicon && (now - lastCheckTime < CACHE_TTL_MS)) {
    return new NextResponse(memoryCachedFavicon.data as any, {
      headers: {
        'Content-Type': memoryCachedFavicon.mimeType,
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      },
    });
  }

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
    console.error('Failed to fetch shop settings for favicon', err);
  }

  lastCheckTime = now;

  // If there's no custom logo, redirect to default icon.svg
  if (!shopSettings.logoUrl) {
    memoryCachedFavicon = null;
    const res = NextResponse.redirect(fallbackUrl);
    res.headers.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
    return res;
  }

  // logoUrl is expected to be a data URI (e.g. data:image/png;base64,iVBORw0KGgo...)
  try {
    const matches = shopSettings.logoUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      memoryCachedFavicon = null;
      const res = NextResponse.redirect(fallbackUrl);
      res.headers.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
      return res;
    }

    const mimeType = matches[1];
    const base64Data = matches[2];
    const uint8 = new Uint8Array(Buffer.from(base64Data, 'base64'));

    memoryCachedFavicon = {
      data: uint8,
      mimeType,
      timestamp: now,
    };

    return new NextResponse(uint8 as any, {
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400'
      },
    });
  } catch (error) {
    console.error('Error parsing logo data URL:', error);
    const res = NextResponse.redirect(fallbackUrl);
    res.headers.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
    return res;
  }
}
