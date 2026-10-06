export const sendSMS = async (number: string | string[], message: string, apiKey: string, senderId: string, apiUrl?: string) => {
  try {
    const res = await fetch('/api/sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ number, message, apiKey, senderId, apiUrl }),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error("SMS Error:", data.error);
      return { success: false, error: data.error };
    }
    
    // Check BulkSMSBD specific response format
    try {
      const resultObj = typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
      if (resultObj.response_code && resultObj.response_code !== 202) {
        return { success: false, error: resultObj.error_message || "BulkSMSBD Error" };
      }
    } catch (e) {
      // Not JSON, assume success if HTTP was 200
    }
    
    return { success: true, data: data.result };
  } catch (error: unknown) {
    console.error("Failed to send SMS:", error);
    return { success: false, error: error.message };
  }
};
