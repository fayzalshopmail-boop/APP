import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { getWarrantyStatus } from '@/lib/warranty';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function normalizeSearchQuery(q: string): { customIdNum: number | null; cleanStr: string } {
  const trimmed = q.trim();
  const digitsOnly = trimmed.replace(/\D/g, '');
  const num = digitsOnly ? parseInt(digitsOnly, 10) : null;
  return { customIdNum: num, cleanStr: trimmed };
}

export async function GET(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rl = checkRateLimit(`track:${ip}`, 40, 60 * 1000); // 40 requests/min per IP
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'অতিরিক্ত অনুরোধ করা হয়েছে। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
      );
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('id') || searchParams.get('q') || '';

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'অনুগ্রহ করে সঠিক সার্ভিস বা জব আইডি দিন।' },
        { status: 400 }
      );
    }

    if (!adminDb) {
      return NextResponse.json(
        { error: 'সার্ভার সংযোগে সমস্যা হচ্ছে। অনুগ্রহ করে দোকানে যোগাযোগ করুন।' },
        { status: 503 }
      );
    }

    const { customIdNum, cleanStr } = normalizeSearchQuery(query);

    let customerDoc: any = null;

    // 1. Search by customId (numeric ID e.g. 1001)
    if (customIdNum !== null && customIdNum > 0) {
      const snapByCustomId = await adminDb
        .collection('customers')
        .where('customId', '==', customIdNum)
        .limit(1)
        .get();

      if (!snapByCustomId.empty) {
        customerDoc = snapByCustomId.docs[0];
      }
    }

    // 2. Search by document ID
    if (!customerDoc) {
      try {
        const docRef = await adminDb.collection('customers').doc(cleanStr).get();
        if (docRef.exists) {
          customerDoc = docRef;
        }
      } catch {
        // Not a valid doc ID
      }
    }

    // 3. Search by Phone number (matches last 10 digits)
    if (!customerDoc && cleanStr.length >= 10) {
      const phoneDigits = cleanStr.replace(/\D/g, '');
      const snapByPhone = await adminDb
        .collection('customers')
        .where('phone', '==', phoneDigits)
        .limit(1)
        .get();

      if (!snapByPhone.empty) {
        customerDoc = snapByPhone.docs[0];
      } else {
        // Try formatted variants e.g. +880
        const snapByPhoneWithPlus = await adminDb
          .collection('customers')
          .where('phone', '==', `+88${phoneDigits}`)
          .limit(1)
          .get();
        if (!snapByPhoneWithPlus.empty) {
          customerDoc = snapByPhoneWithPlus.docs[0];
        }
      }
    }

    if (!customerDoc) {
      return NextResponse.json(
        { error: 'প্রদত্ত আইডি দিয়ে কোনো সার্ভিসের তথ্য পাওয়া যায়নি। অনুগ্রহ করে সঠিক আইডি দিয়ে চেষ্টা করুন।' },
        { status: 404 }
      );
    }

    const cData = customerDoc.data();

    // Fetch Shop public profile
    let shopInfo = {
      name: 'TV Care Center',
      title: 'Expert LED TV Servicing',
      phone: '',
      address: ''
    };

    try {
      const shopSnap = await adminDb.collection('settings').doc('shop').get();
      if (shopSnap.exists) {
        const s = shopSnap.data();
        shopInfo = {
          name: s.shopName || shopInfo.name,
          title: s.shopTitle || shopInfo.title,
          phone: s.phone || '',
          address: s.address || ''
        };
      }
    } catch {
      // Use defaults
    }

    // Format timestamps safely
    const parseDateStr = (field: any) => {
      if (!field) return null;
      try {
        if (field.toDate && typeof field.toDate === 'function') {
          return field.toDate().toISOString();
        }
        if (field.seconds) {
          return new Date(field.seconds * 1000).toISOString();
        }
        const d = new Date(field);
        return isNaN(d.getTime()) ? null : d.toISOString();
      } catch {
        return null;
      }
    };

    const createdAtIso = parseDateStr(cData.createdAt);
    const deliveredAtIso = parseDateStr(cData.deliveredAt);
    const completedAtIso = parseDateStr(cData.completedAt);

    // Calculate warranty status
    const warrantyStatus = getWarrantyStatus(
      cData.warrantyMonths,
      cData.deliveredAt || cData.completedAt,
      cData.status
    );

    // Public Safe Payload (Strictly excludes internal technician costs, profit, private notes, full other records)
    const publicData = {
      id: customerDoc.id,
      customId: cData.customId || null,
      customerNameMasked: cData.name ? `${cData.name.slice(0, 1)}***${cData.name.slice(-1)}` : 'Customer',
      deviceBrand: cData.deviceBrand || 'Device',
      deviceType: cData.deviceType || 'TV',
      deviceProblem: cData.deviceProblem || 'N/A',
      status: cData.status || 'Received',
      isBillPending: Boolean(cData.isBillPending),
      totalBill: cData.isBillPending ? null : (Number(cData.totalBill) || 0),
      advance: Number(cData.advance) || 0,
      due: Number(cData.due) || 0,
      createdAt: createdAtIso,
      deliveredAt: deliveredAtIso,
      completedAt: completedAtIso,
      expectedDeliveryDate: cData.expectedDeliveryDate || null,
      isRescheduled: Boolean(cData.isRescheduled),
      rescheduleNote: cData.rescheduleNote || null,
      warranty: warrantyStatus,
      shop: shopInfo
    };

    return NextResponse.json({
      success: true,
      data: publicData
    });
  } catch (error: any) {
    console.error('[API /api/track] Error:', error);
    return NextResponse.json(
      { error: 'সার্ভারে অভ্যন্তরীণ ত্রুটি দেখা দিয়েছে। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।' },
      { status: 500 }
    );
  }
}
