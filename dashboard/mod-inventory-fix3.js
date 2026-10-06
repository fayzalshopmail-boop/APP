const fs = require('fs');
let code = fs.readFileSync('src/app/inventory/page.tsx', 'utf8');

// The block we want to move
const theBlock = `      {/* Category Manage Modal */}
      <InventoryManageModal 
        isOpen={manageCategoryModal}
        onClose={() => setManageCategoryModal(false)}
        title="Categories"
        options={invSettings.categories}
        onAdd={handleAddCategory}
        onRemove={handleRemoveCategory}
      />

      {/* Product Manage Modal */}
      <InventoryManageModal 
        isOpen={manageProductModal}
        onClose={() => setManageProductModal(false)}
        title={\`Products (\${formData.category})\`}
        options={invSettings.productNames[formData.category] || []}
        onAdd={handleAddProduct}
        onRemove={handleRemoveProduct}
      />`;

// 1. Remove it from wherever it currently is.
code = code.replace(theBlock, '');

// 2. Add it right before the final `</div>\n  );\n}` at the end of the file.
// We can find the very last occurrence of </div>
const lastIndex = code.lastIndexOf('</div>');
if (lastIndex !== -1) {
    code = code.substring(0, lastIndex) + '\n' + theBlock + '\n    ' + code.substring(lastIndex);
}

fs.writeFileSync('src/app/inventory/page.tsx', code);
console.log("Modals moved to the very bottom!");
