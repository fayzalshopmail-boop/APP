const fs = require('fs');

// 1. Update PartsUsedModal.tsx
let modalContent = fs.readFileSync('src/components/ui/PartsUsedModal.tsx', 'utf8');

modalContent = modalContent.replace(
  'customer: Customer | null;',
  'customer: Customer | null;\n  pendingStatus?: string;'
);

modalContent = modalContent.replace(
  'export function PartsUsedModal({ isOpen, onClose, onConfirm, customer }: PartsUsedModalProps) {',
  'export function PartsUsedModal({ isOpen, onClose, onConfirm, customer, pendingStatus }: PartsUsedModalProps) {'
);

modalContent = modalContent.replace(
  '<div className="lg:col-span-7 flex flex-col gap-4">',
  '<div className={`flex flex-col gap-4 ${pendingStatus === "Delivered" ? "lg:col-span-7" : "lg:col-span-12"}`}>'
);

modalContent = modalContent.replace(
  '{/* Right Column: Payment Settlement (5 cols) */}',
  '{/* Right Column: Payment Settlement (5 cols) */}\n            {pendingStatus === "Delivered" && ('
);

modalContent = modalContent.replace(
  '</div>\n            </div>\n\n          </div>\n\n          {/* Footer */}',
  '</div>\n            </div>\n            )}\n\n          </div>\n\n          {/* Footer */}'
);

fs.writeFileSync('src/components/ui/PartsUsedModal.tsx', modalContent, 'utf8');

// 2. Update customers/page.tsx
let pageContent = fs.readFileSync('src/app/customers/page.tsx', 'utf8');
pageContent = pageContent.replace(
  'customer={customers.find(c => c.id === partsModalCustomer?.id) || null}',
  'customer={customers.find(c => c.id === partsModalCustomer?.id) || null}\n        pendingStatus={partsModalCustomer?.pendingStatus}'
);

fs.writeFileSync('src/app/customers/page.tsx', pageContent, 'utf8');
console.log('Success');
