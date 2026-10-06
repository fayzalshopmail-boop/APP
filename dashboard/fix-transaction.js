const fs = require('fs');

let content = fs.readFileSync('src/lib/services/shopTransaction.ts', 'utf8');

const startString = `  /**
   * Marks a customer as returned (unrepaired).`;

const endString = `    await batch.commit();
  }
};`;

const startIndex = content.indexOf(startString);
const endIndex = content.indexOf(endString) + endString.length;

if (startIndex !== -1 && endIndex !== -1) {
  let injectedBlock = content.substring(startIndex, endIndex);
  
  // Remove the block from its current location
  content = content.replace(injectedBlock, "");
  
  // Restore the `};` that we originally blew away
  content = content.substring(0, startIndex) + "};\n" + content.substring(startIndex);
  
  // Extract just the methods
  let methodsOnly = injectedBlock.replace(/};\s*$/, '');
  
  // Append before the LAST `};`
  let lastBraceIndex = content.lastIndexOf('};');
  if (lastBraceIndex !== -1) {
    content = content.substring(0, lastBraceIndex) + ',\n\n' + methodsOnly + '\n};\n';
    fs.writeFileSync('src/lib/services/shopTransaction.ts', content, 'utf8');
    console.log('Fixed shopTransaction.ts');
  } else {
    console.log('Could not find last brace');
  }
} else {
  console.log('Could not find boundaries');
}
