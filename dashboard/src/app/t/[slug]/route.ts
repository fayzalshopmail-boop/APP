import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  if (!slug) {
    return NextResponse.redirect(new URL('/track', req.url));
  }

  const cleanSlug = decodeURIComponent(slug).trim();
  let id = '';
  let key = '';

  if (cleanSlug.includes('-')) {
    const idx = cleanSlug.indexOf('-');
    id = cleanSlug.slice(0, idx).trim();
    key = cleanSlug.slice(idx + 1).trim();
  } else if (cleanSlug.includes('_')) {
    const idx = cleanSlug.indexOf('_');
    id = cleanSlug.slice(0, idx).trim();
    key = cleanSlug.slice(idx + 1).trim();
  } else {
    id = cleanSlug;
  }

  if (id && key) {
    return NextResponse.redirect(
      new URL(`/track?id=${encodeURIComponent(id)}&key=${encodeURIComponent(key)}`, req.url)
    );
  } else if (id) {
    return NextResponse.redirect(
      new URL(`/track?id=${encodeURIComponent(id)}`, req.url)
    );
  } else {
    return NextResponse.redirect(new URL('/track', req.url));
  }
}
