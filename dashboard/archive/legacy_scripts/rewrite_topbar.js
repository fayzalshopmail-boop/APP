const fs = require('fs');
let content = fs.readFileSync('src/components/layout/Topbar.tsx', 'utf8');

// 1. Insert unreadCount right after isCustomerModalOpen
content = content.replace(
  /const \[isCustomerModalOpen, setIsCustomerModalOpen\] = useState\(false\);/,
  "const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);\n  const unreadCount = notifications.filter(n => !n.read).length;"
);

// 2. Replace the notification handler functions
const funcsRegex = /const handleDeleteNotification = async \([\s\S]*?await notificationService\.clearAll\(ids\);\s*\};/;
const newFuncs = `const handleDeleteNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await notificationService.delete(id);
  };

  const handleNotificationClick = async (notif: AppNotification) => {
    if (!notif.read) {
      await notificationService.markAsRead(notif.id!);
    }
    setIsNotifOpen(false);
    if (notif.link) {
      router.push(notif.link);
    }
  };

  const handleMarkAll = async () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id!);
    if (unreadIds.length === 0) return;
    await notificationService.markAllAsRead(unreadIds);
  };

  const handleClearAll = async () => {
    if (notifications.length === 0) return;
    const ids = notifications.map(n => n.id!);
    await notificationService.clearAll(ids);
  };`;

// Wait, the file currently has handleMarkAsRead or handleDeleteNotification?
// My previous script DID replace the functions because I see handleClearAll in the file printout!
// Let's replace the whole block from "const handleDeleteNotification" to "const getIcon".
content = content.replace(/const handleDeleteNotification = async [\s\S]*?const getIcon =/m, newFuncs + '\n\n  const getIcon =');

// 3. Fix the dropdown render
const dropdownRegex = /<AnimatePresence>[\s\S]*?<\/AnimatePresence>/;
const newDropdown = `<AnimatePresence>
          {isNotifOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute top-14 right-0 w-[320px] sm:w-[380px] bg-secondary border border-gray-800 rounded-2xl shadow-2xl overflow-hidden z-50"
            >
              <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-[#1a1d2d]">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  Notifications
                  {unreadCount > 0 && (
                    <span className="bg-blue-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                      {unreadCount} NEW
                    </span>
                  )}
                </h3>
                <div className="flex items-center gap-3">
                  {unreadCount > 0 && (
                    <button onClick={handleMarkAll} className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors">
                      Mark all read
                    </button>
                  )}
                  {notifications.length > 0 && (
                    <button onClick={handleClearAll} className="text-xs text-red-400 hover:text-red-300 font-medium transition-colors">
                      Clear all
                    </button>
                  )}
                </div>
              </div>

              <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <Bell className="w-8 h-8 mx-auto mb-3 opacity-20" />
                    <p className="text-sm">No notifications here.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-800/50">
                    {notifications.map((notif) => (
                      <div 
                        key={notif.id} 
                        onClick={() => handleNotificationClick(notif)}
                        className={\`p-4 transition-colors flex gap-3 group relative cursor-pointer \${notif.read ? 'opacity-60 hover:bg-gray-800/20' : 'bg-blue-500/5 hover:bg-blue-500/10'}\`}
                      >
                        <div className="shrink-0 mt-1">
                          {getIcon(notif.type)}
                        </div>
                        <div className="flex-1 pr-6">
                          <p className="text-sm text-gray-200 font-medium leading-snug mb-1">{notif.title}</p>
                          <p className="text-xs text-gray-400 leading-snug">{notif.message}</p>
                          <p className="text-[10px] text-gray-500 mt-2 font-medium">
                            {formatDistanceToNow(notif.createdAt, { addSuffix: true })}
                          </p>
                        </div>
                        {!notif.read && (
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-r-full" />
                        )}
                        <button 
                          onClick={(e) => handleDeleteNotification(notif.id!, e)}
                          className="absolute right-3 top-4 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Clear notification"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>`;

content = content.replace(dropdownRegex, newDropdown);
fs.writeFileSync('src/components/layout/Topbar.tsx', content);
console.log('Topbar fully updated');
