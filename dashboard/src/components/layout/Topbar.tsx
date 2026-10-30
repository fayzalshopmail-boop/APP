'use client';

import { Bell, Lock, Menu, CheckCircle2, AlertTriangle, Info, BellRing, X, UserPlus, PackagePlus, PlusCircle, Wrench, Truck, Wallet, ShoppingCart, Receipt, Coins, WifiOff, ChevronLeft } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { notificationService, AppNotification } from '@/lib/services/notification';
import { systemTasksService } from '@/lib/services/systemTasks';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import { shopTransactionService } from '@/lib/services/shopTransaction';
import { Customer } from '@/lib/services/customer';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';

const CustomerModal = dynamic(
  () => import('@/components/ui/CustomerModal').then((m) => m.CustomerModal),
  { ssr: false }
);

const headerAddButtons: Record<string, { label: string; icon: any; event?: string }> = {
  '/customers': { label: 'নতুন কাস্টমার', icon: UserPlus, event: 'app:add-customer' },
  '/inventory': { label: 'নতুন পার্টস', icon: PackagePlus, event: 'app:add-inventory' },
  '/loans': { label: 'নতুন এন্ট্রি', icon: PlusCircle, event: 'app:add-loan' },
  '/mechanics': { label: 'নতুন মেকানিক', icon: Wrench, event: 'app:add-mechanic' },
  '/suppliers': { label: 'নতুন সাপ্লায়ার', icon: Truck, event: 'app:add-supplier' },
  '/expenses': { label: 'নতুন খরচ', icon: Wallet, event: 'app:add-expense' },
};

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
  '/staff': 'My Attendance',
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
  '/sms': 'SMS packages and delivery history.',
  '/staff': 'Track your daily check-in, working hours, and attendance records.'
};

export function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { setUnlocked, user, toggleSidebar, dashboardTimeFilter, setDashboardTimeFilter, shop } = useAppStore();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const currentAddButton = headerAddButtons[pathname];

  const handleHeaderAdd = () => {
    if (!currentAddButton) return;
    if (pathname === '/') {
      setIsCustomerModalOpen(true);
    } else if (currentAddButton.event) {
      window.dispatchEvent(new CustomEvent(currentAddButton.event));
    }
  };

  const handleHeaderBack = () => {
    useAppStore.getState().setIsMoreMenuOpen(false);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('nav_opened_from_menu');
    }
    router.push('/');
  };

  useEffect(() => {
    const handleOpenAddCustomer = () => {
      setIsCustomerModalOpen(true);
    };
    window.addEventListener('app:open-add-customer', handleOpenAddCustomer);
    return () => window.removeEventListener('app:open-add-customer', handleOpenAddCustomer);
  }, []);

  const handleCloseCustomerModal = () => {
    setIsCustomerModalOpen(false);
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

  const handleDeleteNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    notificationService.delete(id).catch(console.error);
  };

  const handleNotificationClick = async (notif: AppNotification) => {
    // 1. Non-blocking markAsRead to keep mobile UI instant and fluid
    if (!notif.read && notif.id) {
      notificationService.markAsRead(notif.id).catch(console.error);
    }
    setIsNotifOpen(false);

    const rawLink = notif.link || '';
    let targetCustomerId: string | null = (notif as any).customerId || null;
    let targetCustomerSearch: string | null = (notif as any).customerName || null;
    let targetInventorySearch: string | null = (notif as any).inventorySearch || (notif as any).partName || null;

    if (rawLink) {
      try {
        const urlObj = new URL(rawLink, window.location.origin);
        if (!targetCustomerId) {
          targetCustomerId = urlObj.searchParams.get('customerId') || urlObj.searchParams.get('id');
        }
        if (!targetCustomerSearch) {
          targetCustomerSearch = urlObj.searchParams.get('search');
        }
        if (!targetInventorySearch && rawLink.includes('/inventory')) {
          targetInventorySearch = urlObj.searchParams.get('search');
        }
      } catch (e) {
        // Fallback parameter parsing if relative link wasn't parsed by URL
        const sMatch = rawLink.match(/[?&]search=([^&]+)/);
        if (sMatch) {
          const val = decodeURIComponent(sMatch[1]);
          if (rawLink.includes('/inventory')) targetInventorySearch = val;
          else targetCustomerSearch = val;
        }
        const idMatch = rawLink.match(/[?&](?:customerId|id)=([^&]+)/);
        if (idMatch && !targetCustomerId) {
          targetCustomerId = decodeURIComponent(idMatch[1]);
        }
      }
    }

    // Check if inventory-related
    const isInventoryNotif = rawLink.includes('/inventory') || (notif.title && /stock|inventory|part/i.test(notif.title));
    if (isInventoryNotif) {
      if (!targetInventorySearch) {
        const msg = notif.message || '';
        if (msg.includes(' stock has dropped')) {
          targetInventorySearch = msg.split(' stock has dropped')[0].trim();
        } else {
          targetInventorySearch = msg.split(/stock|dropped|restock/i)[0].trim() || null;
        }
      }

      if (targetInventorySearch) {
        useAppStore.getState().setHighlightInventorySearch(targetInventorySearch);
      }
      router.push('/inventory');
      return;
    }

    // Check if customer-related (links to /customers, or contains customer/delivery in title or message)
    const isCustomerNotif = 
      rawLink.includes('/customers') ||
      !!targetCustomerId ||
      (notif.title && /customer|delivery|deliveries/i.test(notif.title)) ||
      (notif.message && /was added|\(Returning Customer\)|delivery due|repair/i.test(notif.message));

    if (isCustomerNotif) {
      if (!targetCustomerId && !targetCustomerSearch) {
        const msg = notif.message || '';
        if (msg.includes(' was added')) {
          targetCustomerSearch = msg.split(' was added')[0].trim();
        } else if (msg.includes(' (Returning Customer)')) {
          targetCustomerSearch = msg.split(' (Returning Customer)')[0].trim();
        } else if (msg.toLowerCase().includes('due for ')) {
          const afterDue = msg.substring(msg.toLowerCase().indexOf('due for ') + 8).trim();
          const extracted = afterDue.split(/,|\sand\s|\stoday|\stomorrow|!|\./i)[0].trim();
          if (extracted) targetCustomerSearch = extracted;
        } else if (msg.toLowerCase().includes('crossed their payment')) {
          const beforeCrossed = msg.split(/have crossed|has crossed/i)[0].trim();
          const extracted = beforeCrossed.split(/,|\sand\s/i)[0].trim();
          if (extracted) targetCustomerSearch = extracted;
        } else if (msg.trim()) {
          // Pass the message directly for intelligent reverse matching against customer names
          targetCustomerSearch = msg.trim();
        }
      }

      // Update Zustand store
      if (targetCustomerId) {
        useAppStore.getState().setHighlightCustomerId(targetCustomerId);
      }
      if (targetCustomerSearch) {
        useAppStore.getState().setHighlightCustomerSearch(targetCustomerSearch);
      }

      // Dispatch instant custom event for when the user is already on /customers page
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('app:open-customer-profile', {
          detail: { customerId: targetCustomerId, search: targetCustomerSearch }
        }));
      }

      const params = new URLSearchParams();
      if (targetCustomerId) params.set('customerId', targetCustomerId);
      if (targetCustomerSearch) params.set('search', targetCustomerSearch);
      const queryStr = params.toString() ? `?${params.toString()}` : '';
      router.push(`/customers${queryStr}`);
      return;
    }

    if (rawLink) {
      router.push(rawLink);
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
      const staffName = data.receivedByName || user.name || user.email || 'Unknown';
      const staffEmail = data.receivedBy || user.email || user.name || 'Unknown';
      await shopTransactionService.createCustomer({
        ...data,
        receivedBy: staffEmail,
        receivedByName: staffName
      }, staffEmail, staffName);
      handleCloseCustomerModal();
      
      // Send Welcome SMS
      const { smsConfigService } = await import('@/lib/services/smsConfig');
      const { sendSMS } = await import('@/lib/sms');
      
      const smsSettings = await smsConfigService.getSettings();
      if (smsSettings.enabled && smsSettings.apiKey && smsSettings.senderId && data.phone) {
        const msg = smsSettings.welcomeTemplate
          .replace(/{name}/g, data.name || '')
          .replace(/{phone}/g, data.phone || '')
          .replace(/{brand}/g, data.deviceBrand || '')
          .replace(/{type}/g, data.deviceType || '')
          .replace(/{problem}/g, data.deviceProblem || '')
          .replace(/{total}/g, (data as any).isBillPending ? 'চেক করে জানানো হবে' : `${data.totalBill || 0}`)
          .replace(/{advance}/g, `${data.advance || 0}`)
          .replace(/{due}/g, (data as any).isBillPending ? 'পেন্ডিং' : `${data.due || 0}`);
          
        await sendSMS(data.phone, msg, smsSettings.apiKey, smsSettings.senderId, smsSettings.apiUrl);
      }
      
    } catch (e) {
      console.error("Failed to add customer globally", e);
    }
  };

  return (
    <header className="h-14 sm:h-16 px-3 sm:px-4 md:px-6 flex items-center justify-between bg-background sticky top-0 z-40 border-b border-gray-800 md:border-none shrink-0">
      <div className="flex items-center gap-2 sm:gap-3">
        {pathname !== '/' && (
          <button
            type="button"
            onClick={handleHeaderBack}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-secondary/80 hover:bg-secondary border border-gray-800 hover:border-gray-700 active:scale-95 flex items-center justify-center text-gray-300 hover:text-white transition-all shrink-0 cursor-pointer"
            title="ফিরে যান"
            aria-label="Back"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        <div className="flex flex-col min-w-0">
          <h1 className="text-base sm:text-lg md:text-xl font-bold text-white leading-tight truncate">{title}</h1>
          {subtitle && <p className="text-[10px] md:text-xs text-gray-400 leading-tight truncate">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        
        {/* DASHBOARD TOPBAR ACTION BUTTONS (DESKTOP ONLY) */}
        {pathname === '/' && (
          <div className="hidden sm:flex items-center">
            <button
              onClick={() => setIsCustomerModalOpen(true)}
              className="flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-95 text-white px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-md shadow-blue-500/20 shrink-0"
              title="নতুন কাস্টমার যোগ করুন"
            >
              <UserPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>+ নতুন কাস্টমার</span>
            </button>
          </div>
        )}

        {pathname !== '/' && currentAddButton && (
          <div className={`items-center ${pathname === '/customers' ? 'hidden sm:flex' : 'flex'}`}>
            {/* DYNAMIC PAGE ADD ACTION BUTTON */}
            <button
              onClick={handleHeaderAdd}
              className="flex items-center gap-1.5 sm:gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-95 text-white px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-md shadow-blue-500/20 mr-1 sm:mr-0 cursor-pointer"
              title={currentAddButton.label}
              aria-label={currentAddButton.label}
            >
              <currentAddButton.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">+ {currentAddButton.label}</span>
            </button>
          </div>
        )}

        {/* DASHBOARD TIME FILTER (NEXT TO NOTIFICATION) */}
        {pathname === '/' && (
          <div className="shrink-0">
            <Select 
              value={dashboardTimeFilter} 
              onValueChange={(val: any) => setDashboardTimeFilter(val)}
            >
              <SelectTrigger className="w-[110px] sm:w-[130px] h-9 sm:h-10 bg-secondary border border-gray-800 text-gray-200 rounded-xl text-xs sm:text-sm font-medium focus:ring-1 focus:ring-blue-500/50">
                <SelectValue placeholder="সময় নির্ধারণ" />
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                <SelectItem value="Today">আজকে</SelectItem>
                <SelectItem value="This Week">এই সপ্তাহ</SelectItem>
                <SelectItem value="This Month">এই মাস</SelectItem>
                <SelectItem value="This Year">এই বছর</SelectItem>
                <SelectItem value="All Time">সব সময়</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        
        {/* Offline Status Badge */}
        {!isOnline && (
          <div 
            className="flex items-center gap-1.5 bg-amber-500/15 text-amber-400 border border-amber-500/30 px-2 sm:px-2.5 py-1.5 rounded-xl text-xs font-semibold shrink-0"
            title="আপনি অফলাইনে আছেন। সমস্ত এন্ট্রি ফোনে সেভ হচ্ছে এবং ইন্টারনেট পেলে স্বয়ংক্রিয়ভাবে ক্লাউডে সিঙ্ক হবে।"
          >
            <WifiOff className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[11px] sm:text-xs">অফলাইন</span>
          </div>
        )}

        <div className="relative" ref={notifRef}>
          <button 
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors relative ${isNotifOpen ? 'bg-gray-800 text-white' : 'bg-secondary text-gray-400 hover:text-white hover:bg-gray-800'}`}
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
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
                className="absolute top-14 -right-2 sm:right-0 w-[calc(100vw-1rem)] max-w-[380px] sm:w-[380px] bg-secondary border border-gray-800 rounded-2xl shadow-2xl overflow-hidden z-50"
              >
                <div className="p-3 sm:p-4 border-b border-gray-800 flex items-center justify-between bg-[#1a1d2d] gap-2">
                  <h3 className="font-semibold text-white flex items-center gap-1.5 text-sm sm:text-base shrink-0">
                    Notifications
                    {unreadCount > 0 && (
                      <span className="bg-blue-500 text-white text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                        {unreadCount} NEW
                      </span>
                    )}
                  </h3>
                  <div className="flex items-center gap-2 shrink-0">
                    {unreadCount > 0 && (
                      <button onClick={handleMarkAll} className="text-[11px] sm:text-xs whitespace-nowrap text-blue-400 hover:text-blue-300 font-medium transition-colors">
                        Mark Read
                      </button>
                    )}
                    {notifications.length > 0 && (
                      <button onClick={handleClearAll} className="text-[11px] sm:text-xs whitespace-nowrap text-red-400 hover:text-red-300 font-medium transition-colors">
                        Clear All
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
                          className={`p-4 transition-colors flex gap-3 group relative cursor-pointer ${notif.read ? 'opacity-60 hover:bg-gray-800/20' : 'bg-blue-500/5 hover:bg-blue-500/10'}`}
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
          </AnimatePresence>
        </div>
      </div>

      {isCustomerModalOpen && (
        <CustomerModal 
          isOpen={isCustomerModalOpen}
          onClose={handleCloseCustomerModal}
          onSave={handleSaveNewCustomer}
          existingAddresses={[]}
        />
      )}
    </header>
  );
}


