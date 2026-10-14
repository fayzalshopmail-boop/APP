const fs = require('fs');

let content = fs.readFileSync('firestore.rules', 'utf8');

if (!content.includes('match /mechanics/{mechanicId}')) {
  content = content.replace(
    "match /loans/{loanId} {\n      allow read, write: if isActiveUser();\n    }",
    "match /loans/{loanId} {\n      allow read, write: if isActiveUser();\n    }\n\n    match /mechanics/{mechanicId} {\n      allow read, write: if isActiveUser();\n    }"
  );
  fs.writeFileSync('firestore.rules', content, 'utf8');
  console.log('Updated firestore.rules for mechanics');
}
