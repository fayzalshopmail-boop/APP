const fs = require('fs');
let content = fs.readFileSync('src/lib/services/smsConfig.ts', 'utf8');

// Update Interface
content = content.replace(
  'returnedTemplate?: string;',
  'returnedTemplate?: string;\n  loanGivenTemplate?: string;\n  loanTakenTemplate?: string;'
);

// Update Default Settings
const defaultSmsSettingsRegex = /export const defaultSmsSettings: SmsSettings = \{[\s\S]*?pointsRedeemedTemplate: '',\n\s*returnedTemplate: '.*?'\s*};/;
// Let's just insert before `};` of defaultSmsSettings
content = content.replace(
  /(export const defaultSmsSettings: SmsSettings = \{[\s\S]*?)\n};/,
  `$1,\n  loanGivenTemplate: 'সম্মানিত {name}, আমাদের শপ {shop} থেকে আপনার নেওয়া ধারের {due} টাকা বকেয়া রয়েছে। অনুগ্রহ করে আপনার বকেয়াটি পরিশোধ করুন। ধন্যবাদ।',\n  loanTakenTemplate: 'সম্মানিত {name}, আপনি আমাদের শপ {shop} এর কাছে {due} টাকা পান। আপনার পাওনাটি দ্রুত পরিশোধের ব্যবস্থা করা হচ্ছে। ধন্যবাদ।'\n};`
);

fs.writeFileSync('src/lib/services/smsConfig.ts', content);
console.log('smsConfig updated');
