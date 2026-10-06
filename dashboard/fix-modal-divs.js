const fs = require('fs');
let content = fs.readFileSync('src/components/ui/PartsUsedModal.tsx', 'utf8');

const regex = /\{\/\* Final Balance Status Box \*\/\}[\s\S]*?<\/Dialog>\r?\n\s*\);\r?\n\}/m;

const replacement = `{/* Final Balance Status Box */}
                    <div className={\`p-3.5 rounded-xl border transition-all \${
                      finalDue > 0 
                        ? 'bg-amber-500/10 border-amber-500/30' 
                        : 'bg-emerald-500/10 border-emerald-500/30'
                    }\`}>
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-xs uppercase tracking-wider text-gray-400 block font-medium">Final Remaining Due</span>
                          <span className={\`text-xl font-bold \${finalDue > 0 ? 'text-amber-400' : 'text-emerald-400'}\`}>
                            {formatCurrency(finalDue)}
                          </span>
                        </div>
                        <div className={\`px-2.5 py-1 rounded-full text-xs font-semibold \${
                          finalDue > 0 ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'
                        }\`}>
                          {finalDue > 0 ? 'Has Due' : 'Fully Paid / Settled'}
                        </div>
                      </div>

                      {isOverpaid && (
                        <div className="flex items-center gap-1.5 text-xs text-red-400 mt-2 font-medium">
                          <AlertCircle className="w-3.5 h-3.5" />
                          Payment & discount exceed current due!
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
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
console.log('Fixed JSX structure');
