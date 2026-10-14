const fs = require('fs');
let code = fs.readFileSync('src/app/inventory/page.tsx', 'utf8');

const wrongInsertion = `
      {/* Category Manage Modal */}
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
      />
    </div>
  );
}`;

if (code.includes(wrongInsertion)) {
  code = code.replace(wrongInsertion, `    </div>\n    );\n  }`);
  
  const correctInsertion = `
      {/* Category Manage Modal */}
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
      />
    </div>
  );
}`;

  const lastDivRegex = /<\/div>\s*\)\;\s*\}/;
  code = code.replace(lastDivRegex, correctInsertion);
  
  fs.writeFileSync('src/app/inventory/page.tsx', code);
  console.log("Success!");
} else {
  console.log("Wrong insertion not found.");
}
