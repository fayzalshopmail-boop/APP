import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { notificationService } from './notification';

let isRunning = false;

export const systemTasksService = {
  async runDailyChecks() {
    if (!db || isRunning) return;
    isRunning = true;

    try {
      const taskDocRef = doc(db, 'settings', 'systemTasks');
      const snap = await getDoc(taskDocRef);
      const data = snap.exists() ? snap.data() : { lastOverdueCheck: 0 };
      
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0]; // "2026-10-06"
      
      // If already checked today, skip
      if (data.lastOverdueCheck === todayStr) return;

      // Update the date immediately to prevent other devices from running it concurrently
      await setDoc(taskDocRef, { lastOverdueCheck: todayStr }, { merge: true });

      // Run Overdue Dues Check
      const qDues = query(collection(db, 'customers'), where('due', '>', 0));
      const duesSnap = await getDocs(qDues);
      
      const nowMs = now.getTime();
      let overdueCustomers: {name: string, due: number}[] = [];

      duesSnap.forEach(doc => {
        const c = doc.data();
        if (c.dueDate) {
          const dueMs = new Date(c.dueDate).getTime();
          // If due date has passed
          if (nowMs > dueMs) {
            overdueCustomers.push({name: c.name, due: c.due});
          }
        }
      });

      if (overdueCustomers.length > 0) {
        const names = overdueCustomers.slice(0, 3).map(c => c.name).join(', ');
        const more = overdueCustomers.length > 3 ? ` and ${overdueCustomers.length - 3} others` : '';
        await notificationService.add({
          title: 'Overdue Payments Alert',
          message: `${names}${more} have crossed their payment due dates!`,
          type: 'alert',
          targetRole: 'Owner',
          link: '/due'
        });
      }

      // Run Approaching Delivery Dates Check
      const qDeliveries = query(collection(db, 'customers'));
      const delSnap = await getDocs(qDeliveries);
      
      const tomorrowMs = nowMs + (24 * 60 * 60 * 1000); // Now + 24 hours
      let upcomingDeliveries: {name: string, date: string}[] = [];

      delSnap.forEach(doc => {
        const c = doc.data();
        if (c.expectedDeliveryDate && c.status !== 'Delivered' && c.status !== 'Returned (Unrepaired)') {
          const expectedMs = new Date(c.expectedDeliveryDate).getTime();
          // If expected date is today or tomorrow (or passed but not delivered)
          if (expectedMs <= tomorrowMs) {
            upcomingDeliveries.push({name: c.name, date: c.expectedDeliveryDate});
          }
        }
      });

      if (upcomingDeliveries.length > 0) {
        const names = upcomingDeliveries.slice(0, 3).map(c => c.name).join(', ');
        const more = upcomingDeliveries.length > 3 ? ` and ${upcomingDeliveries.length - 3} others` : '';
        await notificationService.add({
          title: 'Upcoming Deliveries',
          message: `Product delivery due for ${names}${more} today/tomorrow!`,
          type: 'warning',
          targetRole: 'Owner',
          link: '/customers'
        });
      }

    } catch (e) {
      console.error("Failed to run daily checks", e);
    } finally {
      isRunning = false;
    }
  }
};

