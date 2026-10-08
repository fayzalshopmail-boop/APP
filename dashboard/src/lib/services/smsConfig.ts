import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

export interface SmsSettings {
  enabled: boolean;
  apiUrl: string;
  apiKey: string;
  senderId: string;
  welcomeTemplate: string; // Received Template
  readyTemplate: string;
  deliveredTemplate: string;
  whatsappTemplate: string;
  paymentReminderTemplate: string; // Due Reminder
  followupTemplate: string; // 6-Month Reminder
  pointsRedeemedTemplate: string;
  returnedTemplate?: string;
  loanGivenTemplate?: string;
  loanTakenTemplate?: string;
}

export const defaultSmsSettings: SmsSettings = {
  enabled: false,
  apiUrl: 'http://bulksmsbd.net/api/smsapi',
  apiKey: '',
  senderId: '',
  welcomeTemplate: 'প্রিয় {name}, আপনার {brand} {type} মেরামতের জন্য VISC তে জমা নেওয়া হয়েছে। সমস্যা: {problem}। মোট বিল: {total} টাকা, অগ্রিম: {advance} টাকা। ধন্যবাদ!',
  readyTemplate: 'প্রিয় {name}, আপনার {brand} {type} এর কাজ শেষ এবং ডেলিভারির জন্য প্রস্তুত! দয়া করে VISC থেকে সংগ্রহ করুন। বকেয়া: {due} টাকা। ধন্যবাদ!',
  deliveredTemplate: 'প্রিয় {name}, আপনার {brand} {type} সফলভাবে ডেলিভারি দেওয়া হয়েছে। VISC এর সেবা নেওয়ার জন্য আপনাকে ধন্যবাদ!',
  whatsappTemplate: 'হ্যালো {name}, VISC তে আপনার {brand} {type} মেরামতের ইনভয়েস: মোট বিল: {total} টাকা, অগ্রিম: {advance} টাকা, বকেয়া: {due} টাকা।',
  paymentReminderTemplate: 'প্রিয় {name}, VISC তে আপনার {brand} {type} মেরামতের বকেয়া {due} টাকা এখনও পরিশোধ করা হয়নি। অনুগ্রহ করে দ্রুত বকেয়া পরিশোধ করুন। ধন্যবাদ!',
  followupTemplate: 'হ্যালো {name}, VISC থেকে আপনার {brand} {type} মেরামতের ৬ মাস পূর্ণ হয়েছে। আশা করি এটি ঠিকঠাক চলছে! কোনো চেকাপের প্রয়োজন হলে আমাদের সাথে যোগাযোগ করুন।',
  pointsRedeemedTemplate: 'সম্মানিত {name}, আপনি আমাদের শপ থেকে সফলভাবে {points} পয়েন্ট ব্যবহার করেছেন। আমাদের সাথে থাকার জন্য ধন্যবাদ!',
  returnedTemplate: 'প্রিয় {name}, আপনার {brand} {type} ডিভাইসটি চেক করা হয়েছে এবং আনরিপেয়ার্ড অবস্থায় ফেরত দেওয়া হচ্ছে। VISC এ আসার জন্য ধন্যবাদ!',
  loanGivenTemplate: 'সম্মানিত {name}, আমাদের শপ {shop} থেকে আপনার নেওয়া ধারের {due} টাকা বকেয়া রয়েছে। অনুগ্রহ করে আপনার বকেয়াটি পরিশোধ করুন। ধন্যবাদ।',
  loanTakenTemplate: 'সম্মানিত {name}, আপনি আমাদের শপ {shop} এর কাছে {due} টাকা পান। আপনার পাওনাটি দ্রুত পরিশোধের ব্যবস্থা করা হচ্ছে। ধন্যবাদ।'
};

export const smsConfigService = {
  async getSettings(): Promise<SmsSettings> {
    try {
      if (!db) return defaultSmsSettings;
      const docRef = doc(db, 'settings', 'sms');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data() as SmsSettings;
      }
      return defaultSmsSettings;
    } catch (error) {
      console.error("Failed to fetch SMS settings", error);
      return defaultSmsSettings;
    }
  },
  
  async saveSettings(settings: SmsSettings): Promise<void> {
    if (!db) throw new Error("Database not initialized");
    const docRef = doc(db, 'settings', 'sms');
    await setDoc(docRef, settings);
  }
};
