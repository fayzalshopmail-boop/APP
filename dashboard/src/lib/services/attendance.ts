import { collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export type AttendanceStatus = 'Present' | 'Late' | 'Half Day' | 'Leave' | 'Absent';

export interface AttendanceRecord {
  id?: string;
  userId: string;       // Staff email
  userName: string;     // Staff name
  userRole: string;     // Staff role
  date: string;         // 'YYYY-MM-DD'
  checkInTime: string;  // e.g. '09:30 AM'
  checkOutTime?: string;// e.g. '07:15 PM'
  status: AttendanceStatus;
  workingHours?: string;// e.g. '8h 30m'
  note?: string;
  verifiedBy?: 'GPS + Wi-Fi' | 'GPS' | 'Wi-Fi' | 'Manual / Owner' | 'Unrestricted';
  distanceMeters?: number;
  clientIp?: string;
  createdAt?: any;
  updatedAt?: any;
}

const COLLECTION_NAME = 'attendance';

export const getLocalDateStr = (d = new Date()): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getLocalTimeStr = (d = new Date()): string => {
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
};

// Calculate duration between check-in and check-out
export const calculateWorkingHours = (checkInTimeStr: string, checkOutTimeStr: string): string => {
  try {
    const parseTimeToMinutes = (timeStr: string) => {
      const [time, modifier] = timeStr.trim().split(' ');
      const parts = time.split(':').map(Number);
      let hours = parts[0];
      const minutes = parts[1] || 0;
      if (modifier?.toUpperCase() === 'PM' && hours < 12) hours += 12;
      if (modifier?.toUpperCase() === 'AM' && hours === 12) hours = 0;
      return hours * 60 + minutes;
    };

    const inMinutes = parseTimeToMinutes(checkInTimeStr);
    const outMinutes = parseTimeToMinutes(checkOutTimeStr);
    const diff = Math.max(0, outMinutes - inMinutes);

    const h = Math.floor(diff / 60);
    const m = diff % 60;
    return `${h}h ${m}m`;
  } catch {
    return 'N/A';
  }
};

export const attendanceService = {
  /**
   * Check in staff member for today
   */
  async checkIn(
    staff: { email: string; name: string; role: string },
    note: string = '',
    verification?: {
      verifiedBy?: 'GPS + Wi-Fi' | 'GPS' | 'Wi-Fi' | 'Manual / Owner' | 'Unrestricted';
      distanceMeters?: number;
      clientIp?: string;
    }
  ): Promise<AttendanceRecord> {
    if (!db) throw new Error('Database not initialized');
    const today = getLocalDateStr();
    const timeNow = getLocalTimeStr();
    const docId = `${staff.email.replace(/[^\w]/g, '_')}_${today}`;
    const docRef = doc(db, COLLECTION_NAME, docId);

    const existingSnap = await getDoc(docRef);
    if (existingSnap.exists()) {
      return { id: docId, ...existingSnap.data() } as AttendanceRecord;
    }

    // Determine default status: if check in after 10:30 AM, mark as Late
    const currentHour = new Date().getHours();
    const currentMinute = new Date().getMinutes();
    const isLate = currentHour > 10 || (currentHour === 10 && currentMinute > 30);
    const status: AttendanceStatus = isLate ? 'Late' : 'Present';

    const record: AttendanceRecord = {
      userId: staff.email,
      userName: staff.name,
      userRole: staff.role,
      date: today,
      checkInTime: timeNow,
      status,
      note,
      verifiedBy: verification?.verifiedBy || 'Unrestricted',
      ...(verification?.distanceMeters !== undefined ? { distanceMeters: verification.distanceMeters } : {}),
      ...(verification?.clientIp ? { clientIp: verification.clientIp } : {}),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    await setDoc(docRef, record);

    // Send real-time in-app & push notification to Owner if a staff member checks in
    if (staff.role !== 'Owner') {
      try {
        const { notificationService } = await import('./notification');
        notificationService.add({
          title: 'নতুন স্টাফ হাজিরা (Check-in)',
          message: `${staff.name} (${staff.role}) আজ ${timeNow}-এ হাজিরা দিয়েছেন। স্ট্যাটাস: ${status === 'Late' ? 'দেরি (Late)' : 'উপস্থিত (Present)'}`,
          type: status === 'Late' ? 'warning' : 'success',
          targetRole: 'Owner',
          link: '/staff'
        }).catch(err => console.warn('Failed to send checkin notification:', err));
      } catch (err) {
        console.warn('Failed to import notificationService:', err);
      }
    }

    return { id: docId, ...record };
  },

  /**
   * Check out staff member for today
   */
  async checkOut(staffEmail: string, note?: string): Promise<void> {
    if (!db) throw new Error('Database not initialized');
    const today = getLocalDateStr();
    const timeNow = getLocalTimeStr();
    const docId = `${staffEmail.replace(/[^\w]/g, '_')}_${today}`;
    const docRef = doc(db, COLLECTION_NAME, docId);

    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      throw new Error('Check-in record not found for today. Please check in first.');
    }

    const data = snap.data() as AttendanceRecord;
    const workingHours = calculateWorkingHours(data.checkInTime, timeNow);

    const updates: Partial<AttendanceRecord> = {
      checkOutTime: timeNow,
      workingHours,
      updatedAt: serverTimestamp(),
      ...(note ? { note } : {})
    };

    await updateDoc(docRef, updates);

    // Send real-time in-app & push notification to Owner if a staff member checks out
    if (data.userRole !== 'Owner') {
      try {
        const { notificationService } = await import('./notification');
        notificationService.add({
          title: 'স্টাফ প্রস্থান (Check-out)',
          message: `${data.userName} (${data.userRole}) আজ ${timeNow}-এ চেক-আউট করেছেন। মোট কাজের সময়: ${workingHours}`,
          type: 'info',
          targetRole: 'Owner',
          link: '/staff'
        }).catch(err => console.warn('Failed to send checkout notification:', err));
      } catch (err) {
        console.warn('Failed to import notificationService:', err);
      }
    }
  },

  /**
   * Fetch attendance for a specific date (defaults to today)
   */
  async getByDate(dateStr: string = getLocalDateStr()): Promise<AttendanceRecord[]> {
    if (!db) return [];
    try {
      const q = query(collection(db, COLLECTION_NAME), where('date', '==', dateStr));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...(d.data() as object) } as AttendanceRecord));
    } catch (e) {
      console.error('Error fetching attendance by date:', e);
      return [];
    }
  },

  /**
   * Fetch attendance records for a whole month (e.g. '2026-10')
   */
  async getByMonth(monthStr: string): Promise<AttendanceRecord[]> {
    if (!db) return [];
    try {
      // Query where date >= 'YYYY-MM-01' and date <= 'YYYY-MM-31'
      const startDate = `${monthStr}-01`;
      const endDate = `${monthStr}-31`;
      const q = query(
        collection(db, COLLECTION_NAME),
        where('date', '>=', startDate),
        where('date', '<=', endDate)
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...(d.data() as object) } as AttendanceRecord));
    } catch (e) {
      console.error('Error fetching attendance by month:', e);
      return [];
    }
  },

  /**
   * Fetch attendance history for a single staff member
   */
  async getStaffHistory(staffEmail: string): Promise<AttendanceRecord[]> {
    if (!db) return [];
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('userId', '==', staffEmail)
      );
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...(d.data() as object) } as AttendanceRecord));
      // Sort by date descending
      return list.sort((a, b) => b.date.localeCompare(a.date));
    } catch (e) {
      console.error('Error fetching staff history:', e);
      return [];
    }
  },

  /**
   * Manual attendance entry by Owner / Manager
   */
  async saveManualAttendance(record: Omit<AttendanceRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
    if (!db) throw new Error('Database not initialized');
    const docId = `${record.userId.replace(/[^\w]/g, '_')}_${record.date}`;
    const docRef = doc(db, COLLECTION_NAME, docId);
    
    let workingHours = record.workingHours;
    if (!workingHours && record.checkInTime && record.checkOutTime) {
      workingHours = calculateWorkingHours(record.checkInTime, record.checkOutTime);
    }

    await setDoc(docRef, {
      ...record,
      verifiedBy: record.verifiedBy || 'Manual / Owner',
      workingHours: workingHours || '',
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp()
    }, { merge: true });
  },

  /**
   * Delete attendance record
   */
  async deleteRecord(id: string): Promise<void> {
    if (!db) throw new Error('Database not initialized');
    await deleteDoc(doc(db, COLLECTION_NAME, id));
  }
};
