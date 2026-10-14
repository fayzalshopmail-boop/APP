const fs = require('fs');

let content = fs.readFileSync('firestore.rules', 'utf8');

if (!content.includes('match /loans/{loanId}')) {
  content = content.replace(
    "match /suppliers/{supplierId} {\n      allow read, write: if isActiveUser();\n    }",
    "match /suppliers/{supplierId} {\n      allow read, write: if isActiveUser();\n    }\n\n    match /loans/{loanId} {\n      allow read, write: if isActiveUser();\n    }"
  );
  fs.writeFileSync('firestore.rules', content, 'utf8');
  console.log('Updated firestore.rules for loans');
}
