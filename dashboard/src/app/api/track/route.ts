import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { getWarrantyStatus } from '@/lib/warranty';
import { verifyTrackingKey, parseTrackingInput } from '@/lib/trackingToken';

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
    const rawId = searchParams.get('id') || searchParams.get('q') || '';
    const rawKey = searchParams.get('key') || searchParams.get('token') || searchParams.get('t') || '';

    // Parse potential combined input (e.g. "1013-trk_xxx" or URL)
    let searchId = rawId;
    let providedKey = rawKey;

    if (!providedKey && searchId) {
      const parsed = parseTrackingInput(searchId);
      if (parsed.key) {
        providedKey = parsed.key;
        if (parsed.id) searchId = parsed.id;
      }
    }

    // Require both ID and Secret Key for access (Option 2: Secret Link System)
    if (!searchId || searchId.trim().length === 0) {
      return NextResponse.json(
        { error: 'অনুগ্রহ করে সঠিক সার্ভিস বা জব আইডি দিন।' },
        { status: 400 }
      );
    }

    if (!providedKey || providedKey.trim().length === 0) {
      return NextResponse.json(
        { 
          error: 'গোপনীয়তা ও নিরাপত্তার স্বার্থে সরাসরি আইডি লিখে অনুসন্ধান বন্ধ রয়েছে। আপনার ইনভয়েস বা মেসেজে থাকা সিক্রেট ট্র্যাকিং লিংকটি ব্যবহার করুন।',
          isRestricted: true 
        },
        { status: 403 }
      );
    }

    if (!adminDb) {
      return NextResponse.json(
        { error: 'সার্ভার সংযোগে সমস্যা হচ্ছে। অনুগ্রহ করে দোকানে যোগাযোগ করুন।' },
        { status: 503 }
      );
    }

    const { customIdNum, cleanStr } = normalizeSearchQuery(searchId);
    let customerDoc: any = null;

    // 1. Search by customId (numeric ID e.g. 1013)
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

    if (!customerDoc) {
      return NextResponse.json(
        { error: 'প্রদত্ত আইডি দিয়ে কোনো সার্ভিসের তথ্য পাওয়া যায়নি। অনুগ্রহ করে সঠিক লিংক ব্যবহার করুন।' },
        { status: 404 }
      );
    }

    const cData = { id: customerDoc.id, ...customerDoc.data() };

    // SEC-TRACK: Validate Secret Encrypted Key against the customer record
    const isValidKey = verifyTrackingKey(cData, providedKey);

    if (!isValidKey) {
      return NextResponse.json(
        { 
          error: 'সিক্রেট ট্র্যাকিং লিংকটি সঠিক নয়। অন্যের প্রোফাইল দেখার অনুমতি নেই।',
          isRestricted: true 
        },
        { status: 403 }
      );
    }

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

    // Filter parts used (exclude internal technician costs, show item name & quantity for customer transparency)
    const sanitizedParts = Array.isArray(cData.partsUsed)
      ? cData.partsUsed.map((p: any) => ({
          name: p.name || 'যন্ত্রাংশ',
          quantity: Number(p.quantity) || 1
        }))
      : [];

    // Authenticated Secret Link Payload (Full customer details unmasked for the verified customer)
    const publicData = {
      id: customerDoc.id,
      customId: cData.customId || null,
      customerName: cData.name || 'সম্মানিত গ্রাহক',
      customerPhone: cData.phone || '',
      customerAddress: cData.address || '',
      deviceBrand: cData.deviceBrand || 'Device',
      deviceType: cData.deviceType || 'TV',
      deviceProblem: cData.deviceProblem || 'N/A',
      deviceDetails: cData.deviceDetails || '',
      serialNumber: cData.serialNumber || '',
      status: cData.status || 'Received',
      isBillPending: Boolean(cData.isBillPending),
      totalBill: cData.isBillPending ? null : (Number(cData.totalBill) || 0),
      advance: Number(cData.advance) || 0,
      due: Number(cData.due) || 0,
      discount: Number(cData.discount) || 0,
      createdAt: createdAtIso,
      deliveredAt: deliveredAtIso,
      completedAt: completedAtIso,
      expectedDeliveryDate: cData.expectedDeliveryDate || null,
      isRescheduled: Boolean(cData.isRescheduled),
      rescheduleCount: Number(cData.rescheduleCount) || 0,
      rescheduleNote: cData.rescheduleNote || null,
      partsUsed: sanitizedParts,
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
