import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const cfIp = request.headers.get('cf-connecting-ip');

    let ip = '';
    if (forwarded) {
      ip = forwarded.split(',')[0].trim();
    } else if (realIp) {
      ip = realIp.trim();
    } else if (cfIp) {
      ip = cfIp.trim();
    }

    // Strip port or ipv6 prefix if any
    if (ip.startsWith('::ffff:')) {
      ip = ip.replace('::ffff:', '');
    }

    return NextResponse.json({
      ip: ip || '127.0.0.1',
      headers: {
        forwarded,
        realIp
      }
    });
  } catch {
    return NextResponse.json({ ip: '127.0.0.1' }, { status: 200 });
  }
}
