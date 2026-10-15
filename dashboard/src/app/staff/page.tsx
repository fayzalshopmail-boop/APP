'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function StaffRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/settings?tab=staff');
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-gray-400">
      <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      <p className="text-sm">সেটিংস কর্মী ব্যবস্থাপনায় রিডাইরেক্ট করা হচ্ছে...</p>
    </div>
  );
}
