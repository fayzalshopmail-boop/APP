const fs = require('fs');

let content = fs.readFileSync('firestore.rules', 'utf8');

if (!content.includes('match /suppliers/{supplierId}')) {
  content = content.replace(
    "match /expenses/{expenseId} {\n      allow read, write: if isActiveUser();\n    }",
    "match /expenses/{expenseId} {\n      allow read, write: if isActiveUser();\n    }\n\n    match /suppliers/{supplierId} {\n      allow read, write: if isActiveUser();\n    }"
  );
  fs.writeFileSync('firestore.rules', content, 'utf8');
  console.log('Updated firestore.rules for suppliers');
}
