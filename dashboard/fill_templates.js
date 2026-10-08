const fs = require('fs');
let content = fs.readFileSync('src/app/sms/page.tsx', 'utf8');

const regex = /setSettings\(data\);/;
const replaceStr = `
        const updatedData = { ...data };
        if (!updatedData.loanGivenTemplate) {
          updatedData.loanGivenTemplate = 'সম্মানিত {name}, আমাদের শপ {shop} থেকে আপনার নেওয়া ধারের {due} টাকা বকেয়া রয়েছে। অনুগ্রহ করে আপনার বকেয়াটি পরিশোধ করুন। ধন্যবাদ।';
        }
        if (!updatedData.loanTakenTemplate) {
          updatedData.loanTakenTemplate = 'সম্মানিত {name}, আপনি আমাদের শপ {shop} এর কাছে {due} টাকা পান। আপনার পাওনাটি দ্রুত পরিশোধের ব্যবস্থা করা হচ্ছে। ধন্যবাদ।';
        }
        if (!updatedData.pointsRedeemedTemplate) {
          updatedData.pointsRedeemedTemplate = 'সম্মানিত {name}, আপনি আমাদের শপ থেকে সফলভাবে {points} পয়েন্ট ব্যবহার করেছেন। আমাদের সাথে থাকার জন্য ধন্যবাদ!';
        }
        setSettings(updatedData);
`;

content = content.replace(regex, replaceStr);
fs.writeFileSync('src/app/sms/page.tsx', content);
console.log('Injected auto-fill for empty templates');
