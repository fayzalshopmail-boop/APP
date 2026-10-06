const fs = require('fs');
let content = fs.readFileSync('src/components/ui/PartsUsedModal.tsx', 'utf8');

const regex = /\{\/\* Confirm Action Button \*\/\}[\s\S]*?<\/Dialog>\r?\n\s*\);\r?\n\}/m;

const replacement = `            </div>
            )}
            
          </div>
          
          {/* Action Footer for BOTH states */}
          <div className="pt-5 mt-4 border-t border-gray-800/80">
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={pendingStatus === 'Delivered' ? (isOverpaid || (finalDue > 0 && !dueDate)) : false}
              className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 shadow-blue-900/20 text-white font-semibold"
            >
              <CheckCircle2 className="w-4 h-4" />
              {pendingStatus === 'Delivered' ? 'Complete & Deliver' : 'Save Parts Checklist'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}`;

content = content.replace(regex, replacement);

fs.writeFileSync('src/components/ui/PartsUsedModal.tsx', content, 'utf8');
console.log('Fixed syntax and button placement');
