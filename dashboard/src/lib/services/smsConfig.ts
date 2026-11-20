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
  waitingForPartsTemplate?: string;
  loanGivenTemplate?: string;
  loanTakenTemplate?: string;
}

export const defaultSmsSettings: SmsSettings = {
  enabled: false,
  apiUrl: 'https://bulksmsbd.net/api/smsapi',
  apiKey: '',
  senderId: '',
  welcomeTemplate: 'প্রিয় {name}, আপনার {brand} {type} মেরামতের জন্য VVSC তে জমা নেওয়া হয়েছে। সার্ভিস আইডি: #{id}। সমস্যা: {problem}। ধন্যবাদ!\nলাইভ ট্র্যাকিং: {link}',
  readyTemplate: 'প্রিয় {name}, আপনার {brand} {type} (আইডি: #{id}) এর কাজ শেষ এবং ডেলিভারির জন্য প্রস্তুত! বকেয়া: {due} টাকা। দয়া করে VVSC থেকে সংগ্রহ করুন। ধন্যবাদ!\nলাইভ ট্র্যাকিং: {link}',
  deliveredTemplate: 'প্রিয় {name}, আপনার {brand} {type} (আইডি: #{id}) সফলভাবে ডেলিভারি দেওয়া হয়েছে। VVSC এর সেবা নেওয়ার জন্য আপনাকে ধন্যবাদ!',
  whatsappTemplate: 'হ্যালো {name}, VVSC তে আপনার {brand} {type} (আইডি: #{id}) মেরামতের ইনভয়েস: মোট বিল: {total} টাকা, অগ্রিম: {advance} টাকা, বকেয়া: {due} টাকা।\n\nলাইভ ট্র্যাকিং লিংক:\n{link}',
  paymentReminderTemplate: 'প্রিয় {name}, VVSC তে আপনার {brand} {type} মেরামতের বকেয়া {due} টাকা এখনও পরিশোধ করা হয়নি। অনুগ্রহ করে দ্রুত বকেয়া পরিশোধ করুন। ধন্যবাদ!',
  followupTemplate: 'হ্যালো {name}, VVSC থেকে আপনার {brand} {type} মেরামতের ৬ মাস পূর্ণ হয়েছে। আশা করি এটি ঠিকঠাক চলছে! কোনো চেকাপের প্রয়োজন হলে আমাদের সাথে যোগাযোগ করুন।',
  pointsRedeemedTemplate: 'সম্মানিত {name}, আপনি আমাদের শপ থেকে সফলভাবে {points} পয়েন্ট ব্যবহার করেছেন। আমাদের সাথে থাকার জন্য ধন্যবাদ!',
  returnedTemplate: 'প্রিয় {name}, আপনার {brand} {type} ডিভাইসটি চেক করা হয়েছে এবং আনরিপেয়ার্ড অবস্থায় ফেরত দেওয়া হচ্ছে। VVSC এ আসার জন্য ধন্যবাদ!\nলাইভ ট্র্যাকিং: {link}',
  waitingForPartsTemplate: 'প্রিয় {name}, আপনার {brand} {type} মেরামতের জন্য প্রয়োজনীয় পার্টসের অপেক্ষা করা হচ্ছে। পার্টস পাওয়া মাত্রই কাজটি দ্রুত সম্পন্ন করা হবে। ধন্যবাদ!\nলাইভ ট্র্যাকিং: {link}',
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
