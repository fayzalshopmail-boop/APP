/**
 * Server-side in-process scheduler that monitors Dhaka time and automatically
 * triggers the Telegram Daily Closing Summary at 12:00 AM midnight every day,
 * with resilient catch-up if the server was sleeping or offline at midnight.
 */

declare global {
  // eslint-disable-next-line no-var
  var __midnightSchedulerStarted: boolean | undefined;
}

export function startMidnightScheduler() {
  if (global.__midnightSchedulerStarted) {
    return;
  }
  global.__midnightSchedulerStarted = true;

  console.log('[MidnightScheduler] Initialized. Monitoring Dhaka time for 12:00 AM daily summary trigger...');

  let lastDispatchedDate = '';

  const checkSchedule = async () => {
    try {
      // Get current hour and date in Dhaka timezone
      const now = new Date();
      const timeParts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Dhaka',
        hour: 'numeric',
        minute: 'numeric',
        hour12: false
      }).formatToParts(now);

      const hour = parseInt(timeParts.find(p => p.type === 'hour')?.value || '-1', 10);
      const minute = parseInt(timeParts.find(p => p.type === 'minute')?.value || '-1', 10);

      // Calculate yesterday's date (the day that concluded at midnight)
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Dhaka',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(yesterday);

      // Trigger condition:
      // 1. Midnight window: hour === 0
      // 2. Or night/early morning window (00:00 - 08:00) if yesterday was missed due to sleeping server
      const isMidnightWindow = hour === 0;
      const isEarlyMorningCatchup = hour >= 1 && hour <= 8;

      if ((isMidnightWindow || isEarlyMorningCatchup) && lastDispatchedDate !== yesterdayStr) {
        // Verify with Firestore to prevent duplicate dispatch
        const { adminDb } = await import('@/lib/firebase-admin');
        let alreadyDispatched = false;

        if (adminDb) {
          try {
            const [tgSnap, shopSnap] = await Promise.all([
              adminDb.collection('settings').doc('telegram').get().catch(() => null),
              adminDb.collection('settings').doc('shop').get().catch(() => null)
            ]);
            const tgDate = tgSnap?.data()?.lastAutoSummaryDate;
            const shopDate = shopSnap?.data()?.telegram?.lastAutoSummaryDate;
            if (tgDate === yesterdayStr || shopDate === yesterdayStr) {
              alreadyDispatched = true;
              lastDispatchedDate = yesterdayStr;
            }
          } catch (e) {
            console.warn('[MidnightScheduler] Error checking last summary date:', e);
          }
        }

        if (!alreadyDispatched) {
          console.log(`[MidnightScheduler] Triggering daily summary for ${yesterdayStr} at hour ${hour}:${minute}...`);
          lastDispatchedDate = yesterdayStr;

          const { executeDailySummary } = await import('@/app/api/cron/daily-summary/route');
          const res = await executeDailySummary(yesterdayStr);
          console.log('[MidnightScheduler] Daily summary result:', res);
        }
      }
    } catch (err) {
      console.warn('[MidnightScheduler] Error in check interval:', err);
    }
  };

  // Run initial check 6 seconds after startup, then every 30 seconds
  setTimeout(checkSchedule, 6000);
  setInterval(checkSchedule, 30 * 1000);
}
