const fs = require('fs');
let content = fs.readFileSync('src/components/layout/Topbar.tsx', 'utf8');

const regexFuncs = /const handleMarkAsRead = async \([\s\S]*?await notificationService\.markAllAsRead\(ids\);\s*\};/;

const replacementFuncs = `const handleDeleteNotification = async (id: string, e: React.MouseEvent) => {
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

content = content.replace(regexFuncs, replacementFuncs);

const unreadCountInject = `  const title = routeTitles[pathname] || 'Dashboard';
  const subtitle = routeSubtitles[pathname] || '';
  const unreadCount = notifications.filter(n => !n.read).length;`;

content = content.replace(/  const title = routeTitles\[pathname\] \|\| 'Dashboard';\s*const subtitle = routeSubtitles\[pathname\] \|\| '';/, unreadCountInject);


const bellDotRegex = /\{notifications\.length > 0 && \(\s*<span className="absolute top-1\.5 right-1\.5 w-3 h-3 bg-red-500 border-2 border-background rounded-full flex items-center justify-center">\s*<\/span>\s*\)\}/;
const bellDotReplacement = `{unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-3 h-3 bg-red-500 border-2 border-background rounded-full flex items-center justify-center">
              </span>
            )}`;
content = content.replace(bellDotRegex, bellDotReplacement);

const dropdownRegex = /<h3 className="font-semibold text-white flex items-center gap-2">[\s\S]*?<\/div>\s*<\/div>\s*<\/motion\.div>/;

const dropdownReplacement = `<h3 className="font-semibold text-white flex items-center gap-2">
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
              </motion.div>`;
content = content.replace(dropdownRegex, dropdownReplacement);

fs.writeFileSync('src/components/layout/Topbar.tsx', content);
console.log('Topbar notifications updated');
