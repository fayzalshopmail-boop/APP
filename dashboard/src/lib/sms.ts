import toast from 'react-hot-toast';
import { offlineSyncService } from './services/offlineSync';
import { auth } from './firebase';

export interface SmsTemplateReplacements {
  id?: string | number;
  name?: string;
  phone?: string;
  brand?: string;
  type?: string;
  problem?: string;
  total?: string | number;
  advance?: string | number;
  due?: string | number;
  shop?: string;
  points?: string | number;
  [key: string]: any;
}

/**
 * Formats an SMS message template by replacing placeholders and ensuring
 * that any tracking URL is cleanly placed at the very bottom on a new line.
 */
export function formatSmsMessage(
  template: string,
  replacements: SmsTemplateReplacements,
  trackUrl?: string
): string {
  let msg = template || '';

  if (trackUrl) {
    // Check if {link} or {track_url} is already at the very end of the template (e.g. "Working Progress: {link}")
    const trailingLinkRegex = /([^\n\r]*)(?:{link}|{track_url})[\s।]*$/i;
    const match = msg.match(trailingLinkRegex);

    if (match) {
      // The link token is already on the final line!
      // Preserve any custom label like "Working Progress:" or "লাইভ ট্র্যাকিং:"
      const label = match[1].trim();
      msg = msg.replace(trailingLinkRegex, label ? `${label} ${trackUrl}` : trackUrl).trim();
    } else {
      // The link token is either in the middle or missing.
      // Strip any middle tracking token and label so it never interrupts sentences
      msg = msg.replace(/(?:লাইভ\s*ট্র্যাকিং?|লাইভ\s*ট্র্যাক|Live\s*Track(?:ing)?)\s*:\s*(?:{link}|{track_url})\s*।?/gi, '');
      msg = msg.replace(/(?:{link}|{track_url})\s*।?/gi, '');
      msg = msg.replace(/।\s*।/g, '।');
      msg = msg.replace(/[ \t]{2,}/g, ' ');
      msg = msg.trim();
      msg += `\nলাইভ ট্র্যাকিং: ${trackUrl}`;
    }
  }

  // Perform placeholder replacements
  for (const [key, val] of Object.entries(replacements)) {
    const reg = new RegExp(`{${key}}`, 'g');
    msg = msg.replace(reg, val !== undefined && val !== null ? String(val) : '');
  }

  // Ensure Service ID is included if template didn't have {id}
  if (replacements.id && !template.includes('{id}')) {
    if (msg.includes('হয়েছে।')) {
      msg = msg.replace('হয়েছে।', `হয়েছে। সার্ভিস আইডি: #${replacements.id}।`);
    } else if (!msg.includes(`#${replacements.id}`)) {
      msg = `[আইডি: #${replacements.id}] ` + msg;
    }
  }

  return msg.trim();
}

export const sendSMS = async (
  number: string | string[], 
  message: string, 
  apiKey?: string, 
  senderId?: string, 
  apiUrl?: string,
  isBulkCampaign?: boolean
) => {
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
        ...(isBulkCampaign ? { isBulkCampaign: true } : {}),
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
