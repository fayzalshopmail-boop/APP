'use client';

import { Bell, Lock, Menu, CheckCircle2, AlertTriangle, Info, BellRing, X, UserPlus } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { notificationService, AppNotification } from '@/lib/services/notification';
import { systemTasksService } from '@/lib/services/systemTasks';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { CustomerModal } from '@/components/ui/CustomerModal';
import { shopTransactionService } from '@/lib/services/shopTransaction';
import { Customer } from '@/lib/services/customer';

const routeTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/customers': 'Customer Details',
  '/inventory': 'Inventory',
  '/due': 'Due',
  '/loans': 'My Loans',
  '/loyalty': 'Loyalty',
  '/mechanics': 'Mechanics (B2B)',
  '/suppliers': 'Suppliers',
  '/expenses': 'Expenses',
  '/reports': 'Reports',
  '/settings': 'Shop Settings',
  '/sms': 'SMS Settings',
};

const routeSubtitles: Record<string, string> = {
  '/': 'Welcome back to your dashboard.',
  '/customers': 'Manage your TV repair customers and their records.',
  '/inventory': 'Manage parts, stock levels, and pricing.',
  '/due': 'Manage and collect outstanding balances from customers.',
  '/loans': 'Manage money you\'ve borrowed or lent to others.',
  '/loyalty': 'Manage customer reward points.',
  '/mechanics': 'Manage B2B technician repairs and billing.',
  '/suppliers': 'Manage your vendors and supply chain.',
  '/expenses': 'Track and manage shop expenses.',
  '/reports': 'View business analytics and insights.',
  '/settings': 'Configure your shop settings.',
  '/sms': 'SMS packages and delivery history.'
};

export function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { setUnlocked, user, toggleSidebar } = useAppStore();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);

  useEffect(() => {
    const handlePopState = () => {
      if (isCustomerModalOpen) {
        setIsCustomerModalOpen(false);
      }
    };
    if (isCustomerModalOpen) {
      window.history.pushState({ modal: 'add-customer' }, '');
      window.addEventListener('popstate', handlePopState);
    }
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isCustomerModalOpen]);

  const handleCloseCustomerModal = () => {
    setIsCustomerModalOpen(false);
    if (window.history.state && window.history.state.modal === 'add-customer') {
      window.history.back();
    }
  };
  const notifRef = useRef<HTMLDivElement>(null);
  
  const basePath = '/' + pathname.split('/')[1];
  const title = routeTitles[basePath] || routeTitles[pathname] || 'Dashboard';
  const subtitle = routeSubtitles[basePath] || routeSubtitles[pathname] || '';

  const prevCountRef = useRef(-1);

  useEffect(() => {
    if (!user) return;
    
    // Run daily automated checks (like overdue dues)
    if (user.role === 'Owner') {
      systemTasksService.runDailyChecks();
    }

    const unsubscribe = notificationService.subscribeToUnread(user.role, (notifs) => {
      if (prevCountRef.current !== -1 && notifs.length > prevCountRef.current) {
        try {
          const audio = new Audio('/notification.mp3');
          audio.play().catch(e => console.log('Audio play failed', e));
        } catch (e) {}
      }
      prevCountRef.current = notifs.length;
      setNotifications(notifs);
    });
    return () => unsubscribe();
  }, [user]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await notificationService.markAsRead(id);
  };

  const handleNotificationClick = async (notif: AppNotification) => {
    await notificationService.markAsRead(notif.id!);
    setIsNotifOpen(false);
    if (notif.link) {
      router.push(notif.link);
    }
  };

  const handleMarkAll = async () => {
    if (notifications.length === 0) return;
    const ids = notifications.map(n => n.id!);
    await notificationService.markAllAsRead(ids);
  };

  const getIcon = (type: string) => {
    switch(type) {
      case 'success': return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-orange-500" />;
      case 'alert': return <BellRing className="w-5 h-5 text-red-500" />;
      default: return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const handleSaveNewCustomer = async (data: Omit<Customer, 'id' | 'createdAt' | 'points'>) => {
    if (!user) return;
    try {
      await shopTransactionService.createCustomer(data, user.name || user.email || 'Unknown');
      handleCloseCustomerModal();
      // If we are not on customers page, maybe route there, or just show success?
      // Since it's a global action, just closing is fine. The user can go to customers page if they want.
    } catch (e) {
      console.error("Failed to add customer globally", e);
    }
  };

  return (
    <header className="h-16 md:h-20 px-4 md:px-8 flex items-center justify-between bg-background sticky top-0 z-40 border-b border-gray-800 md:border-none">
      <div className="flex items-center gap-4">
        <button 
          onClick={toggleSidebar}
          className="md:hidden w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-gray-400 hover:text-white"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex flex-col">
          <h1 className="text-lg md:text-2xl font-bold text-white leading-tight truncate max-w-[200px] md:max-w-[400px]">{title}</h1>
          {subtitle && <p className="text-[10px] md:text-sm text-gray-400 leading-tight truncate max-w-[200px] md:max-w-[400px]">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4 relative" ref={notifRef}>
        
        {pathname === '/' && (
          <div className="flex items-center">
            {/* ADD CUSTOMER BUTTON */}
            <button
              onClick={() => setIsCustomerModalOpen(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 md:px-4 md:py-2 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-blue-500/20 mr-1 sm:mr-0"
            >
              <UserPlus className="w-4 h-4 md:w-5 md:h-5" />
              <span className="hidden sm:inline">Add Customer</span>
            </button>
          </div>
        )}
        
        <button 
          onClick={() => setIsNotifOpen(!isNotifOpen)}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors relative ${isNotifOpen ? 'bg-gray-800 text-white' : 'bg-secondary text-gray-400 hover:text-white hover:bg-gray-800'}`}
        >
          <Bell className="w-5 h-5" />
          {notifications.length > 0 && (
            <span className="absolute top-1.5 right-1.5 w-3 h-3 bg-red-500 border-2 border-background rounded-full flex items-center justify-center">
            </span>
          )}
        </button>

        {/* Notifications Dropdown */}
        <AnimatePresence>
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
                  {notifications.length > 0 && (
                    <span className="bg-blue-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                      {notifications.length} NEW
                    </span>
                  )}
                </h3>
                {notifications.length > 0 && (
                  <button onClick={handleMarkAll} className="text-xs text-blue-400 hover:text-blue-300 font-medium">
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <Bell className="w-8 h-8 mx-auto mb-3 opacity-20" />
                    <p className="text-sm">You have no new notifications.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-800/50">
                    {notifications.map((notif) => (
                      <div 
                        key={notif.id} 
                        onClick={() => handleNotificationClick(notif)}
                        className="p-4 hover:bg-gray-800/30 transition-colors flex gap-3 group relative cursor-pointer"
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
                        <button 
                          onClick={(e) => handleMarkAsRead(notif.id!, e)}
                          className="absolute right-3 top-4 text-gray-500 hover:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Mark as read"
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
        </AnimatePresence>
      </div>

      <CustomerModal 
        isOpen={isCustomerModalOpen}
        onClose={handleCloseCustomerModal}
        onSave={handleSaveNewCustomer}
        existingAddresses={[]}
      />
    </header>
  );
}


