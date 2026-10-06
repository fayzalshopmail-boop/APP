const fs = require('fs');

let content = fs.readFileSync('firestore.rules', 'utf8');

if (!content.includes('match /expenses/{expenseId}')) {
  content = content.replace(
    "match /transactions/{transactionId} {\n      allow read, write: if isActiveUser();\n    }",
    "match /transactions/{transactionId} {\n      allow read, write: if isActiveUser();\n    }\n\n    match /expenses/{expenseId} {\n      allow read, write: if isActiveUser();\n    }"
  );
  fs.writeFileSync('firestore.rules', content, 'utf8');
  console.log('Updated firestore.rules');
}
