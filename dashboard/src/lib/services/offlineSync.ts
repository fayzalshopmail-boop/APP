import toast from 'react-hot-toast';

export interface QueuedSMS {
  id: string;
  number: string | string[];
  message: string;
  apiKey: string;
  senderId: string;
  apiUrl?: string;
  createdAt: number;
  customerName?: string;
}

const STORAGE_KEY = 'shop_offline_sms_queue';

class OfflineSyncService {
  private isSyncing = false;
  private initialized = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initListeners();
    }
  }

  public initListeners() {
    if (this.initialized || typeof window === 'undefined') return;
    this.initialized = true;

    window.addEventListener('online', () => {
      window.dispatchEvent(new CustomEvent('app:network-status', { detail: { online: true } }));
      toast.success('📶 ইন্টারনেট সংযুক্ত হয়েছে! অফলাইন ডাটা ক্লাউডে সিঙ্ক হচ্ছে...', { id: 'network-status', duration: 4000 });
      this.syncPendingQueue();
    });

    window.addEventListener('offline', () => {
      window.dispatchEvent(new CustomEvent('app:network-status', { detail: { online: false } }));
      toast('📴 অফলাইন মোড সক্রিয়। কাজ চালিয়ে যান, ডাটা লোকালি সংরক্ষিত হচ্ছে।', { 
        id: 'network-status', 
        icon: '⚠️',
        duration: 5000 
      });
    });

    // Check if there are already pending items from previous session
    if (navigator.onLine) {
      setTimeout(() => this.syncPendingQueue(), 3000);
    }
  }

  public isOnline(): boolean {
    if (typeof navigator === 'undefined') return true;
    return navigator.onLine;
  }

  public getQueue(): QueuedSMS[] {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Error reading offline SMS queue', e);
      return [];
    }
  }

  public getPendingCount(): number {
    return this.getQueue().length;
  }

  public queueSMS(item: Omit<QueuedSMS, 'id' | 'createdAt'>): void {
    if (typeof window === 'undefined') return;
    try {
      const queue = this.getQueue();
      const newEntry: QueuedSMS = {
        ...item,
        id: `sms_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        createdAt: Date.now()
      };
      queue.push(newEntry);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
      window.dispatchEvent(new CustomEvent('app:offline-sync-queue-updated', { detail: { count: queue.length } }));
      toast('📴 অফলাইনে এন্ট্রি সংরক্ষিত হয়েছে। ইন্টারনেট আসলে SMS পাঠানো হবে।', { icon: '⏳' });
    } catch (e) {
      console.error('Failed to queue SMS for offline sync', e);
    }
  }

  public async syncPendingQueue(): Promise<void> {
    if (this.isSyncing || !this.isOnline() || typeof window === 'undefined') return;

    const queue = this.getQueue();
    if (queue.length === 0) return;

    this.isSyncing = true;
    window.dispatchEvent(new CustomEvent('app:sync-in-progress', { detail: { syncing: true } }));

    const remaining: QueuedSMS[] = [];
    let successCount = 0;

    for (const item of queue) {
      try {
        const res = await fetch('/api/sms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            number: item.number,
            message: item.message,
            apiKey: item.apiKey,
            senderId: item.senderId,
            apiUrl: item.apiUrl
          })
        });

        if (res.ok) {
          successCount++;
        } else {
          remaining.push(item);
        }
      } catch (err) {
        remaining.push(item);
      }
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));
    this.isSyncing = false;
    window.dispatchEvent(new CustomEvent('app:sync-in-progress', { detail: { syncing: false } }));
    window.dispatchEvent(new CustomEvent('app:offline-sync-queue-updated', { detail: { count: remaining.length } }));

    if (successCount > 0) {
      toast.success(`✅ ${successCount}টি অফলাইন SMS সফলভাবে পাঠানো হয়েছে!`, { duration: 4000 });
    }
  }
}

export const offlineSyncService = new OfflineSyncService();
