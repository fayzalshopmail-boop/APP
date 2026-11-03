/**
 * Service for sending real-time Telegram notifications for shop events.
 * Dispatches asynchronously to /api/telegram to prevent blocking user workflows.
 */

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

export const telegramService = {
  /**
   * Sends a test message to verify Bot Token and Chat ID.
   */
  async sendTestMessage(botToken: string, chatId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch('/api/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test', botToken, chatId })
      });
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
   * Triggers a notification for a new sale or service invoice.
   */
  notifySale(data: TelegramSaleData): void {
    try {
      fetch('/api/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'notify', type: 'sale', data })
      }).catch(err => console.warn('Telegram notifySale error:', err));
    } catch (e) {
      console.warn('Telegram notifySale exception:', e);
    }
  },

  /**
   * Triggers a notification when a payment or due collection is received.
   */
  notifyPayment(data: TelegramPaymentData): void {
    try {
      fetch('/api/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'notify', type: 'payment', data })
      }).catch(err => console.warn('Telegram notifyPayment error:', err));
    } catch (e) {
      console.warn('Telegram notifyPayment exception:', e);
    }
  },

  /**
   * Triggers a notification when a new expense is logged.
   */
  notifyExpense(data: TelegramExpenseData): void {
    try {
      fetch('/api/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'notify', type: 'expense', data })
      }).catch(err => console.warn('Telegram notifyExpense error:', err));
    } catch (e) {
      console.warn('Telegram notifyExpense exception:', e);
    }
  },

  /**
   * Triggers a notification for low stock items.
   */
  notifyLowStock(data: TelegramLowStockData): void {
    try {
      fetch('/api/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'notify', type: 'low_stock', data })
      }).catch(err => console.warn('Telegram notifyLowStock error:', err));
    } catch (e) {
      console.warn('Telegram notifyLowStock exception:', e);
    }
  },

  /**
   * Triggers a generic system alert or announcement.
   */
  notifyGeneral(title: string, message: string): void {
    try {
      fetch('/api/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'notify', type: 'general', data: { title, message } })
      }).catch(err => console.warn('Telegram notifyGeneral error:', err));
    } catch (e) {
      console.warn('Telegram notifyGeneral exception:', e);
    }
  }
};
