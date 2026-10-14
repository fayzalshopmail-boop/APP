const fs = require('fs');
let code = fs.readFileSync('src/app/inventory/page.tsx', 'utf8');

// The block we mistakenly added to the access denied section
const startRestock = code.indexOf('{/* Restock Modal */}');
const endSellModal = code.indexOf('</Dialog>', code.indexOf('{/* Direct Sell Modal */}')) + '</Dialog>'.length;

if (startRestock !== -1 && endSellModal !== -1) {
    const modalsText = code.substring(startRestock, endSellModal);
    
    // Remove it from the Access Denied block
    code = code.replace(modalsText, '');
    
    // Find the ACTUAL final </div> in the component
    // Let's do it by finding the last instance of </div>\n  );\n}
    
    const lastIndex = code.lastIndexOf('</div>');
    if (lastIndex !== -1) {
        code = code.substring(0, lastIndex) + '\n' + modalsText + '\n    ' + code.substring(lastIndex);
    }
    
    fs.writeFileSync('src/app/inventory/page.tsx', code);
    console.log("Moved Restock and Sell modals to the bottom!");
} else {
    console.log("Could not find the modals to move.");
}
