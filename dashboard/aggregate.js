const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');
const outputFile = path.join(__dirname, 'audit_codebase.txt');

function getAllFiles(dirPath, arrayOfFiles) {
  files = fs.readdirSync(dirPath);

  arrayOfFiles = arrayOfFiles || [];

  files.forEach(function(file) {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
    } else {
      if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.css')) {
        arrayOfFiles.push(path.join(dirPath, "/", file));
      }
    }
  });

  return arrayOfFiles;
}

const allFiles = getAllFiles(srcDir);
let combinedContent = '';

allFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  combinedContent += `\n\n======================================================\n`;
  combinedContent += `FILE: ${file.replace(__dirname, '')}\n`;
  combinedContent += `======================================================\n\n`;
  combinedContent += content;
});

fs.writeFileSync(outputFile, combinedContent);
console.log(`Aggregated ${allFiles.length} files into audit_codebase.txt`);
