/**
 * Service for sending real-time Telegram notifications for shop events.
 * Dispatches asynchronously to /api/telegram to prevent blocking user workflows.
 */

export interface TelegramCustomerData {
  customerName: string;
  phone: string;
  device?: string;
  problem?: string;
  advance?: number;
  totalBill?: number;
  isBillPending?: boolean;
  staffName?: string;
}

export interface TelegramSaleData {
  customerName: string;
  phone: string;
  device?: string;
  totalBill: number;
  advance: number;
  due: number;
  staffName?: string;
}

export interface TelegramPaymentData {
  customerName: string;
  phone: string;
  amount: number;
  paymentMethod?: string;
  remainingDue: number;
  staffName?: string;
}

export interface TelegramStatusData {
  customerName: string;
  phone: string;
  device?: string;
  status: string;
  due?: number;
  totalBill?: number;
  paid?: number;
  reason?: string;
  staffName?: string;
}

export interface TelegramAttendanceData {
  eventType: 'check_in' | 'check_out';
  staffName: string;
  role: string;
  time: string;
  date: string;
  status?: string;
  workingHours?: string;
}

export interface TelegramSupplierData {
  eventType: 'restock' | 'payment';
  supplierName: string;
  itemName?: string;
  quantity?: number;
  purchasePrice?: number;
  totalAmount?: number;
  amount?: number;
  remainingDue?: number;
  staffName?: string;
}

export interface TelegramSecurityData {
  title: string;
  details: string;
  user?: string;
}

export interface TelegramExpenseData {
  title: string;
  category: string;
  amount: number;
  staffName?: string;
}

export interface TelegramLowStockData {
  itemName: string;
  currentStock: number;
  minStock?: number;
}

async function postToTelegram(body: any): Promise<Response> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  try {
    const { auth } = await import('../firebase');
    if (auth) {
      if (typeof auth.authStateReady === 'function') {
        await auth.authStateReady();
      }
      let currentUser = auth.currentUser;
      if (!currentUser) {
        currentUser = await new Promise((resolve) => {
          const unsub = auth.onAuthStateChanged((u) => {
            unsub();
            resolve(u);
          });
          setTimeout(() => resolve(null), 1500);
        });
      }
      if (currentUser) {
        const token = await currentUser.getIdToken();
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
      }
    }
  } catch (err) {
    console.warn('Could not attach auth token to Telegram request:', err);
  }
  return fetch('/api/telegram', {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });
}

export const telegramService = {
  /**
   * Sends a test message to verify Bot Token and Chat ID.
   */
  async sendTestMessage(botToken: string, chatId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await postToTelegram({ action: 'test', botToken, chatId });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Failed to send test message' };
      }
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Network error sending test message' };
    }
  },

  /**
   * Triggers the daily closing summary report to be generated and sent.
   */
  async sendDailySummary(): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await postToTelegram({ action: 'send_daily_summary' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Failed to send daily summary' };
      }
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Network error sending daily summary' };
    }
  },

  /**
   * Triggers a notification for a new customer or repair intake.
   */
  notifyCustomerCreate(data: TelegramCustomerData): void {
    try {
      postToTelegram({ action: 'notify', type: 'customer_create', data })
        .catch(err => console.warn('Telegram notifyCustomerCreate error:', err));
    } catch (e) {
      console.warn('Telegram notifyCustomerCreate exception:', e);
    }
  },

  /**
   * Triggers a notification for a new sale or service invoice.
   */
  notifySale(data: TelegramSaleData): void {
    try {
      postToTelegram({ action: 'notify', type: 'sale', data })
        .catch(err => console.warn('Telegram notifySale error:', err));
    } catch (e) {
      console.warn('Telegram notifySale exception:', e);
    }
  },

  /**
   * Triggers a notification when a payment or due collection is received.
   */
  notifyPayment(data: TelegramPaymentData): void {
    try {
      postToTelegram({ action: 'notify', type: 'payment', data })
        .catch(err => console.warn('Telegram notifyPayment error:', err));
    } catch (e) {
      console.warn('Telegram notifyPayment exception:', e);
    }
  },

  /**
   * Triggers a notification for repair status transitions (Ready for Delivery, Delivered, etc.).
   */
  notifyStatusChange(data: TelegramStatusData): void {
    try {
      postToTelegram({ action: 'notify', type: 'status_change', data })
        .catch(err => console.warn('Telegram notifyStatusChange error:', err));
    } catch (e) {
      console.warn('Telegram notifyStatusChange exception:', e);
    }
  },

  /**
   * Triggers an attendance notification (Check-in or Check-out).
   */
  notifyAttendance(data: TelegramAttendanceData): void {
    try {
      postToTelegram({ action: 'notify', type: 'attendance', data })
        .catch(err => console.warn('Telegram notifyAttendance error:', err));
    } catch (e) {
      console.warn('Telegram notifyAttendance exception:', e);
    }
  },

  /**
   * Triggers a supplier restock or payment notification.
   */
  notifySupplier(data: TelegramSupplierData): void {
    try {
      postToTelegram({ action: 'notify', type: 'supplier', data })
        .catch(err => console.warn('Telegram notifySupplier error:', err));
    } catch (e) {
      console.warn('Telegram notifySupplier exception:', e);
    }
  },

  /**
   * Triggers a security, fraud prevention, or critical audit alert.
   */
  notifySecurity(data: TelegramSecurityData): void {
    try {
      postToTelegram({ action: 'notify', type: 'security', data })
        .catch(err => console.warn('Telegram notifySecurity error:', err));
    } catch (e) {
      console.warn('Telegram notifySecurity exception:', e);
    }
  },

  /**
   * Triggers a notification when a new expense is logged.
   */
  notifyExpense(data: TelegramExpenseData): void {
    try {
      postToTelegram({ action: 'notify', type: 'expense', data })
        .catch(err => console.warn('Telegram notifyExpense error:', err));
    } catch (e) {
      console.warn('Telegram notifyExpense exception:', e);
    }
  },

  /**
   * Triggers a notification for low stock items.
   */
  notifyLowStock(data: TelegramLowStockData): void {
    try {
      postToTelegram({ action: 'notify', type: 'low_stock', data })
        .catch(err => console.warn('Telegram notifyLowStock error:', err));
    } catch (e) {
      console.warn('Telegram notifyLowStock exception:', e);
    }
  },

  /**
   * Triggers a generic system alert or announcement.
   */
  notifyGeneral(title: string, message: string): void {
    try {
      postToTelegram({ action: 'notify', type: 'general', data: { title, message } })
        .catch(err => console.warn('Telegram notifyGeneral error:', err));
    } catch (e) {
      console.warn('Telegram notifyGeneral exception:', e);
    }
  }
};
