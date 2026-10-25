import toast from 'react-hot-toast';
import { offlineSyncService } from './services/offlineSync';
import { auth } from './firebase';

export const sendSMS = async (number: string | string[], message: string, apiKey?: string, senderId?: string, apiUrl?: string) => {
  // Check if browser is offline
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    offlineSyncService.queueSMS({ number, message });
    return { success: true, queued: true };
  }

  try {
    let idToken: string | null = null;
    if (auth?.currentUser) {
      try {
        idToken = await auth.currentUser.getIdToken();
      } catch (tokenErr) {
        console.warn("Could not get auth token for SMS:", tokenErr);
      }
    }

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (idToken) {
      headers['Authorization'] = `Bearer ${idToken}`;
    }

    const res = await fetch('/api/sms', {
      method: 'POST',
      headers,
      body: JSON.stringify({ 
        number, 
        message, 
        ...(apiKey ? { apiKey } : {}), 
        ...(senderId ? { senderId } : {}), 
        ...(apiUrl ? { apiUrl } : {}) 
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error("SMS Error:", data.error);
      toast.error(`SMS Failed: ${data.error}`);
      return { success: false, error: data.error };
    }
    
    // Check BulkSMSBD specific response format
    try {
      const resultObj = typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
      if (resultObj.response_code && resultObj.response_code !== 202) {
        toast.error(`SMS Failed: ${resultObj.error_message || "BulkSMSBD Error"}`);
        return { success: false, error: resultObj.error_message || "BulkSMSBD Error" };
      }
    } catch {
      // Not JSON, assume success if HTTP was 200
    }
    
    toast.success("SMS Sent Successfully!");
    return { success: true, data: data.result };
  } catch (error: any) {
    console.error("Failed to send SMS:", error);
    // If failed due to sudden network loss, enqueue for background sync
    if (typeof navigator !== 'undefined' && (!navigator.onLine || error?.message?.includes('fetch'))) {
      offlineSyncService.queueSMS({ number, message });
      return { success: true, queued: true };
    }
    toast.error(`SMS Failed: ${error.message}`);
    return { success: false, error: error.message };
  }
};
