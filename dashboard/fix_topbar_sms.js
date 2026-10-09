const fs = require('fs');
let content = fs.readFileSync('src/components/layout/Topbar.tsx', 'utf8');

const regex = /const handleSaveNewCustomer = async \([\s\S]*?console\.error\("Failed to add customer globally", e\);\s*\}\s*\};/;

const replacement = `const handleSaveNewCustomer = async (data: Omit<Customer, 'id' | 'createdAt' | 'points'>) => {
    if (!user) return;
    try {
      await shopTransactionService.createCustomer(data, user.name || user.email || 'Unknown');
      handleCloseCustomerModal();
      
      // Send Welcome SMS
      const { smsConfigService } = await import('@/lib/services/smsConfig');
      const { sendSMS } = await import('@/lib/sms');
      
      const smsSettings = await smsConfigService.getSettings();
      if (smsSettings.enabled && smsSettings.apiKey && smsSettings.senderId && data.phone) {
        const msg = smsSettings.welcomeTemplate
          .replace(/{name}/g, data.name || '')
          .replace(/{phone}/g, data.phone || '')
          .replace(/{brand}/g, data.deviceBrand || '')
          .replace(/{type}/g, data.deviceType || '')
          .replace(/{problem}/g, data.deviceProblem || '')
          .replace(/{total}/g, \`\${data.totalBill || 0}\`)
          .replace(/{advance}/g, \`\${data.advance || 0}\`)
          .replace(/{due}/g, \`\${data.due || 0}\`);
          
        await sendSMS(data.phone, msg, smsSettings.apiKey, smsSettings.senderId, smsSettings.apiUrl);
      }
      
    } catch (e) {
      console.error("Failed to add customer globally", e);
    }
  };`;

if (regex.test(content)) {
  content = content.replace(regex, replacement);
  fs.writeFileSync('src/components/layout/Topbar.tsx', content);
  console.log('Added SMS logic to Topbar');
} else {
  console.log('Regex failed');
}
