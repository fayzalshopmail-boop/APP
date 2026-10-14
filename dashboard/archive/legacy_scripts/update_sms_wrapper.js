const fs = require('fs');
const file = 'src/lib/sms.ts';
let content = fs.readFileSync(file, 'utf8');

const newContent = `import toast from 'react-hot-toast';

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
      toast.error(\`SMS Failed: \${data.error}\`);
      return { success: false, error: data.error };
    }
    
    // Check BulkSMSBD specific response format
    try {
      const resultObj = typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
      if (resultObj.response_code && resultObj.response_code !== 202) {
        toast.error(\`SMS Failed: \${resultObj.error_message || "BulkSMSBD Error"}\`);
        return { success: false, error: resultObj.error_message || "BulkSMSBD Error" };
      }
    } catch (e) {
      // Not JSON, assume success if HTTP was 200
    }
    
    toast.success("SMS Sent Successfully!");
    return { success: true, data: data.result };
  } catch (error: unknown) {
    console.error("Failed to send SMS:", error);
    toast.error(\`SMS Failed: \${(error as any).message}\`);
    return { success: false, error: (error as any).message };
  }
};
`;

fs.writeFileSync(file, newContent);
console.log('sms wrapper updated with toast');
