import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { defaultShopSettings, ShopSettings } from '@/lib/services/shopSettings';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
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

  const fallbackUrl = new URL('/icon.svg', req.url);

  // If there's no custom logo, redirect to default icon.svg
  if (!shopSettings.logoUrl) {
    return NextResponse.redirect(fallbackUrl);
  }

  // logoUrl is expected to be a data URI (e.g. data:image/png;base64,iVBORw0KGgo...)
  try {
    const matches = shopSettings.logoUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return NextResponse.redirect(fallbackUrl);
    }

    const mimeType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      },
    });
  } catch (error) {
    console.error('Error parsing logo data URL:', error);
    return NextResponse.redirect(fallbackUrl);
  }
}
