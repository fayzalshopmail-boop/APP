const fs = require('fs');
const file = 'src/app/api/sms/route.ts';
let content = fs.readFileSync(file, 'utf8');

// Replace the baseUrl logic and fetch
const newLogic = `    let baseUrl = apiUrl || 'https://bulksmsbd.net/api/smsapi';
    if (baseUrl.includes('bulksmsbd.net') && baseUrl.startsWith('http://')) {
      baseUrl = baseUrl.replace('http://', 'https://');
    }
    
    const url = \`\${baseUrl}?api_key=\${apiKey}&type=text&number=\${targetNumbers}&senderid=\${senderId}&message=\${encodeURIComponent(message)}\`;
    
    console.log("Sending SMS to URL:", url.replace(apiKey, 'HIDDEN'));
    
    const response = await fetch(url, { cache: 'no-store' });
    const resultText = await response.text();
    
    console.log("BulkSMSBD API Response:", resultText);
    
    let result = resultText;
    try {
      result = JSON.parse(resultText);
    } catch(e) {}
    
    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error("SMS API Route Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }`;

content = content.replace(/    const baseUrl = apiUrl[\s\S]*?return NextResponse\.json\(\{ error: error\.message \}, \{ status: 500 \}\);\n  \}/, newLogic);
fs.writeFileSync(file, content);
console.log('sms API route updated');
