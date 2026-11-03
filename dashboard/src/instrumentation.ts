export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startMidnightScheduler } = await import('@/lib/server/midnightScheduler');
    startMidnightScheduler();
  }
}
