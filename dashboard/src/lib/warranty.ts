/**
 * Warranty calculation & validation helper
 */

export interface WarrantyStatusResult {
  hasWarranty: boolean;
  warrantyLabel: string;
  isPendingDelivery: boolean;
  isActive: boolean;
  isExpired: boolean;
  daysRemaining: number;
  daysExpired: number;
  expiryDate: Date | null;
  expiryDateStr: string;
  displayBadgeText: {
    bn: string;
    en: string;
  };
  colorClass: string;
}

export function parseWarrantyMonths(rawWarranty: string | number | undefined | null): number {
  if (!rawWarranty) return 0;
  const str = String(rawWarranty).toLowerCase().trim();
  if (!str) return 0;

  // Convert Bengali digits to English
  const bengaliToEnglish: Record<string, string> = {
    '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
    '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9'
  };
  const normalized = str.replace(/[০-৯]/g, (d) => bengaliToEnglish[d] || d);

  if (normalized.includes('year') || normalized.includes('বছর')) {
    const num = parseFloat(normalized) || 1;
    return Math.round(num * 12);
  }
  if (normalized.includes('day') || normalized.includes('দিন')) {
    const num = parseFloat(normalized) || 30;
    return Math.max(1, Math.round(num / 30));
  }
  // Default months
  const match = normalized.match(/[\d.]+/);
  if (match) {
    const parsed = parseFloat(match[0]);
    return isNaN(parsed) ? 0 : Math.round(parsed);
  }
  return 0;
}

export function getWarrantyStatus(
  rawWarranty: string | number | undefined | null,
  deliveredAt: string | Date | any | undefined | null,
  status?: string
): WarrantyStatusResult {
  const months = parseWarrantyMonths(rawWarranty);

  if (!rawWarranty || months <= 0) {
    return {
      hasWarranty: false,
      warrantyLabel: '',
      isPendingDelivery: false,
      isActive: false,
      isExpired: false,
      daysRemaining: 0,
      daysExpired: 0,
      expiryDate: null,
      expiryDateStr: '',
      displayBadgeText: { bn: 'কোনো ওয়ারেন্টি নেই', en: 'No Warranty' },
      colorClass: 'text-gray-400 border-gray-700 bg-gray-800/40'
    };
  }

  const warrantyLabel = String(rawWarranty).trim();

  // If not yet delivered, warranty is pending
  const isDelivered = status === 'Delivered';
  if (!isDelivered || !deliveredAt) {
    return {
      hasWarranty: true,
      warrantyLabel,
      isPendingDelivery: true,
      isActive: false,
      isExpired: false,
      daysRemaining: months * 30,
      daysExpired: 0,
      expiryDate: null,
      expiryDateStr: '',
      displayBadgeText: {
        bn: `ওয়ারেন্টি: ${warrantyLabel} (ডেলিভারির পর সচল হবে)`,
        en: `Warranty: ${warrantyLabel} (Starts after delivery)`
      },
      colorClass: 'text-amber-400 border-amber-500/30 bg-amber-500/10'
    };
  }

  // Parse delivery date
  let delDate: Date;
  if (deliveredAt?.toDate && typeof deliveredAt.toDate === 'function') {
    delDate = deliveredAt.toDate();
  } else if (deliveredAt?.seconds) {
    delDate = new Date(deliveredAt.seconds * 1000);
  } else {
    delDate = new Date(deliveredAt);
  }

  if (isNaN(delDate.getTime())) {
    return {
      hasWarranty: true,
      warrantyLabel,
      isPendingDelivery: false,
      isActive: true,
      isExpired: false,
      daysRemaining: months * 30,
      daysExpired: 0,
      expiryDate: null,
      expiryDateStr: '',
      displayBadgeText: {
        bn: `ওয়ারেন্টি: ${warrantyLabel}`,
        en: `Warranty: ${warrantyLabel}`
      },
      colorClass: 'text-purple-400 border-purple-500/30 bg-purple-500/10'
    };
  }

  // Calculate expiry date: delDate + months
  const expiryDate = new Date(delDate);
  expiryDate.setMonth(expiryDate.getMonth() + months);

  const now = new Date();
  const diffTimeMs = expiryDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTimeMs / (1000 * 60 * 60 * 24));

  const expiryDateStr = expiryDate.toLocaleDateString('bn-BD', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  const expiryDateStrEn = expiryDate.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  if (diffDays > 0) {
    return {
      hasWarranty: true,
      warrantyLabel,
      isPendingDelivery: false,
      isActive: true,
      isExpired: false,
      daysRemaining: diffDays,
      daysExpired: 0,
      expiryDate,
      expiryDateStr,
      displayBadgeText: {
        bn: `🟢 ওয়ারেন্টি সচল (আর ${diffDays} দিন বাকি • মেয়াদ: ${expiryDateStr})`,
        en: `🟢 Active Warranty (${diffDays} days left • Exp: ${expiryDateStrEn})`
      },
      colorClass: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
    };
  } else {
    const expiredDaysAgo = Math.abs(diffDays);
    return {
      hasWarranty: true,
      warrantyLabel,
      isPendingDelivery: false,
      isActive: false,
      isExpired: true,
      daysRemaining: 0,
      daysExpired: expiredDaysAgo,
      expiryDate,
      expiryDateStr,
      displayBadgeText: {
        bn: `🔴 ওয়ারেন্টি শেষ (${expiredDaysAgo === 0 ? 'আজ' : `${expiredDaysAgo} দিন আগে`} শেষ হয়েছে)`,
        en: `🔴 Expired (${expiredDaysAgo === 0 ? 'Today' : `${expiredDaysAgo}d ago`})`
      },
      colorClass: 'text-rose-400 border-rose-500/30 bg-rose-500/10'
    };
  }
}
