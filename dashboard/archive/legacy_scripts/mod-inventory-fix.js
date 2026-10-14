const fs = require('fs');
let code = fs.readFileSync('src/app/inventory/page.tsx', 'utf8');

const startIdx = code.indexOf('{/* Category Manage Modal */}');
const endIdx = code.indexOf('</div>\n  );\n}', startIdx) + '</div>\n  );\n}'.length;

if (startIdx !== -1 && endIdx !== -1) {
  const extractedBlock = code.substring(startIdx, endIdx);
  // Remove the block
  code = code.substring(0, startIdx) + '</div>\n    );\n  }' + code.substring(endIdx);
  
  // Now add it to the very end
  const veryEndIdx = code.lastIndexOf('</div>\n  );\n}');
  if (veryEndIdx !== -1) {
    code = code.substring(0, veryEndIdx) + extractedBlock + '\n' + code.substring(endIdx); // Wait, this might be broken. Let's just do replace.
  }
}

// Safer approach
let lines = fs.readFileSync('src/app/inventory/page.tsx', 'utf8').split('\n');
let newLines = [];
let modalLines = [];
let inModal = false;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('{/* Category Manage Modal */}')) {
    inModal = true;
  }
  
  if (inModal) {
    modalLines.push(lines[i]);
    if (lines[i].includes('</InventoryManageModal>')) {
       // get the last div as well
       let nextIdx = i + 1;
       while (nextIdx < lines.length && !lines[nextIdx].includes('</div>')) {
           modalLines.push(lines[nextIdx]);
           nextIdx++;
       }
       if (nextIdx < lines.length) modalLines.push(lines[nextIdx]);
       
       i = nextIdx; // skip
       inModal = false;
       newLines.push('      </div>'); // restore the early return div
       newLines.push('    );');
       newLines.push('  }');
       // Wait, we need to skip the incorrectly matched end return
       if (lines[i+1] && lines[i+1].includes(');')) i++;
       if (lines[i+1] && lines[i+1].includes('}')) i++;
       continue;
    }
  } else {
    newLines.push(lines[i]);
  }
}

// Inject at end
for (let i = newLines.length - 1; i >= 0; i--) {
    if (newLines[i].includes('</div>')) {
        // This is the last closing div of the main return
        newLines.splice(i, 0, ...modalLines.slice(0, -1)); // slice off the last </div> from modalLines if it had one, wait, no.
        break;
    }
}

fs.writeFileSync('src/app/inventory/page.tsx', newLines.join('\n'));
console.log("Attempted manual fix");
