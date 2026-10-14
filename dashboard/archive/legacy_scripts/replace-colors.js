const fs = require('fs');
const path = require('path');

const replacements = [
  { from: /bg-\[#0b0e14\]/g, to: 'bg-background' },
  { from: /bg-\[#151828\]/g, to: 'bg-card' },
  { from: /bg-\[#0f111a\]/g, to: 'bg-popover' },
  { from: /bg-\[#161925\]/g, to: 'bg-secondary' },
  { from: /border-\[#1f2937\]/g, to: 'border-border' },
];

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(filePath));
    } else if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
      results.push(filePath);
    }
  });
  return results;
}

const files = walk('./src');
let changedCount = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let newContent = content;
  
  replacements.forEach(r => {
    newContent = newContent.replace(r.from, r.to);
  });
  
  if (content !== newContent) {
    fs.writeFileSync(file, newContent, 'utf8');
    changedCount++;
  }
});

console.log(`Updated colors in ${changedCount} files`);
