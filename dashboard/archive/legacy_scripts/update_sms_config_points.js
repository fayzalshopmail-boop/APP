const fs = require('fs');
let content = fs.readFileSync('src/lib/services/smsConfig.ts', 'utf8');

content = content.replace(
  /pointsRedeemedTemplate:\s*'',/,
  `pointsRedeemedTemplate: 'সম্মানিত {name}, আপনি আমাদের শপ থেকে সফলভাবে {points} পয়েন্ট ব্যবহার করেছেন। আমাদের সাথে থাকার জন্য ধন্যবাদ!',`
);

fs.writeFileSync('src/lib/services/smsConfig.ts', content);
console.log('smsConfig updated');
