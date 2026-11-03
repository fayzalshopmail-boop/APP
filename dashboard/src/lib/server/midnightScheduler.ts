/**
 * Server-side in-process scheduler that monitors Dhaka time and automatically
 * triggers the Telegram Daily Closing Summary at exactly 12:00 AM midnight every day.
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

  setInterval(async () => {
    try {
      // Get current hour and minute in Dhaka timezone
      const timeParts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Dhaka',
        hour: 'numeric',
        minute: 'numeric',
        hour12: false
      }).formatToParts(new Date());

      const hour = parseInt(timeParts.find(p => p.type === 'hour')?.value || '-1', 10);
      const minute = parseInt(timeParts.find(p => p.type === 'minute')?.value || '-1', 10);

      // Check if it's 12:00 AM (00:00 to 00:02)
      if (hour === 0 && (minute >= 0 && minute <= 2)) {
        // Calculate yesterday's date (the day that just ended)
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Asia/Dhaka',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        }).format(yesterday);

        if (lastDispatchedDate !== yesterdayStr) {
          console.log(`[MidnightScheduler] 12:00 AM reached! Executing daily summary for ${yesterdayStr}...`);
          lastDispatchedDate = yesterdayStr;

          const { executeDailySummary } = await import('@/app/api/cron/daily-summary/route');
          const res = await executeDailySummary(yesterdayStr);
          console.log('[MidnightScheduler] Daily summary result:', res);
        }
      }
    } catch (err) {
      console.warn('[MidnightScheduler] Error in check interval:', err);
    }
  }, 30 * 1000); // Check every 30 seconds
}
