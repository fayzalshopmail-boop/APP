const fs = require('fs');
let content = fs.readFileSync('src/app/loans/page.tsx', 'utf8');

const smsLogic = `
  const handleSendSms = async (loan: Loan) => {
    try {
      setSendingSmsId(loan.id);
      const { smsConfigService } = await import('@/lib/services/smsConfig');
      const { sendSMS } = await import('@/lib/services/sms');
      const { useAppStore } = await import('@/store/useAppStore');
      const shopName = useAppStore.getState().shop?.shopName || 'আমাদের শপ';
      
      const smsSettings = await smsConfigService.getSettings();
      if (!smsSettings.enabled || !smsSettings.apiKey || !smsSettings.senderId) {
        toast.error("SMS is disabled or not configured.");
        return;
      }
      
      // We need a phone number. We don't store phone numbers in loans currently!
      // Wait, we can ask for a phone number using a prompt.
      const phone = window.prompt(\`Enter mobile number for \${loan.personName} to send SMS:\`, "");
      if (!phone || phone.length < 11) {
        toast.error("Valid phone number required.");
        return;
      }

      const dueAmount = loan.amount - (loan.paidAmount || 0);
      const msg = \`Dear \${loan.personName}, your unpaid loan of \${dueAmount} TK at \${shopName} is due. Please clear it ASAP. Thank you.\`;
      
      const result = await sendSMS([phone], msg, smsSettings.apiKey, smsSettings.senderId, smsSettings.apiUrl);
      if (result.success) {
        toast.success("SMS Reminder sent!");
      } else {
        toast.error("Failed to send SMS.");
      }
    } catch (e) {
      console.error(e);
      toast.error("Error sending SMS.");
    } finally {
      setSendingSmsId(null);
    }
  };

  const pendingGiven`;

content = content.replace("const pendingGiven", smsLogic);

// Now inject the History Modal right before the closing </div> of the page.
const historyModal = `
      {/* History Modal */}
      <Dialog open={!!historyModalData} onOpenChange={(open) => !open && setHistoryModalData(null)}>
        <DialogContent className="sm:max-w-[500px] bg-popover border-border max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">Loan History</DialogTitle>
            <DialogDescription className="text-gray-400">
              Transaction history for {historyModalData?.personName}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            {historyModalData?.history && historyModalData.history.length > 0 ? (
              <div className="space-y-3">
                {historyModalData.history.map((h, i) => (
                  <div key={i} className="flex justify-between items-center p-3 rounded-lg bg-background border border-gray-800">
                    <div>
                      <p className="text-sm font-medium text-gray-200">{h.type === 'Payment' ? 'Partial Payment' : 'Initial Entry'}</p>
                      <p className="text-xs text-gray-500">{new Date(h.date).toLocaleString()}</p>
                    </div>
                    <div className={\`font-bold \${h.type === 'Payment' ? 'text-emerald-400' : 'text-orange-400'}\`}>
                      {h.type === 'Payment' ? '+' : ''}{formatCurrency(h.amount)}
                    </div>
                  </div>
                ))}
                <div className="flex justify-between items-center p-3 rounded-lg bg-gray-800/50 mt-4 border border-gray-700">
                  <span className="text-sm font-bold text-white">Total Due</span>
                  <span className="text-lg font-bold text-red-400">{formatCurrency((historyModalData.amount || 0) - (historyModalData.paidAmount || 0))}</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500 text-sm">No detailed history found for this record.</div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}`;

content = content.replace(/<\/div>\s*\);\s*\}\s*$/, historyModal);
fs.writeFileSync('src/app/loans/page.tsx', content);
console.log('Features added');
