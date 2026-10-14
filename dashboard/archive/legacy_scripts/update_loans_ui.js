const fs = require('fs');
let content = fs.readFileSync('src/app/loans/page.tsx', 'utf8');

content = content.replace("Coins, CalendarClock } from 'lucide-react';", "Coins, CalendarClock, History, MessageSquare, Send } from 'lucide-react';");

const oldState = `const [deleteId, setDeleteId] = useState<string | null>(null);`;
const newState = `const [deleteId, setDeleteId] = useState<string | null>(null);
  const [historyModalData, setHistoryModalData] = useState<Loan | null>(null);
  const [sendingSmsId, setSendingSmsId] = useState<string | null>(null);`;
content = content.replace(oldState, newState);

const tableButtons = `{l.status === 'Pending' && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => { setPaymentModalData(l); setNextDate(''); }} 
                            className="h-8 w-8 text-blue-400 hover:text-blue-300 hover:bg-blue-400/10" 
                            title="Add Payment (আংশিক পরিশোধ)"
                          >
                            <Coins className="w-4 h-4" />
                          </Button>
                        )}`;

const newTableButtons = `{l.status === 'Pending' && (
                          <>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => { setPaymentModalData(l); setNextDate(''); }} 
                              className="h-8 w-8 text-blue-400 hover:text-blue-300 hover:bg-blue-400/10" 
                              title="Add Payment (আংশিক পরিশোধ)"
                            >
                              <Coins className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleSendSms(l)} 
                              disabled={sendingSmsId === l.id}
                              className="h-8 w-8 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-400/10" 
                              title="Send SMS Reminder"
                            >
                              <MessageSquare className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => setHistoryModalData(l)} 
                          className="h-8 w-8 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-400/10" 
                          title="View History"
                        >
                          <History className="w-4 h-4" />
                        </Button>`;
                        
if (content.includes(tableButtons)) {
  content = content.replace(tableButtons, newTableButtons);
} else {
  // Try regex if exact formatting fails
  content = content.replace(/\{l\.status === 'Pending' && \([\s\S]*?<Coins className="w-4 h-4" \/>\s*<\/Button>\s*\)\}/, newTableButtons);
}

fs.writeFileSync('src/app/loans/page.tsx', content);
console.log('UI updated');
