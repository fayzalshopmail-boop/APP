import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { number, message, apiKey, senderId, apiUrl } = await request.json();
    
    if (!apiKey || !senderId) {
      return NextResponse.json({ error: "SMS configuration missing. Please setup API Key and Sender ID in Settings." }, { status: 400 });
    }

    if (!number || number.length === 0) {
      return NextResponse.json({ error: "No recipient numbers provided." }, { status: 400 });
    }

    // Format phone numbers to ensure they have 880 prefix
    const formatPhone = (num: string) => {
      let f = num.replace(/\D/g, '');
      if (f.startsWith('01')) f = '88' + f;
      return f;
    };

    let targetNumbers = '';
    if (Array.isArray(number)) {
      targetNumbers = number.map(formatPhone).join(',');
    } else {
      targetNumbers = formatPhone(number);
    }

    const baseUrl = apiUrl || 'http://bulksmsbd.net/api/smsapi';
    const url = `${baseUrl}?api_key=${apiKey}&type=text&number=${targetNumbers}&senderid=${senderId}&message=${encodeURIComponent(message)}`;
    
    const response = await fetch(url);
    const result = await response.text();
    
    console.log("BulkSMSBD API Response:", result);
    
    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
