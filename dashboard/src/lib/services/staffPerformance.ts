import { customerService, Customer } from './customer';
import { userService } from './user';

export interface StaffPerformanceMetric {
  staffEmail: string;
  staffName: string;
  role: string;
  avatar?: string;
  completedCount: number; // Delivered or Ready for Delivery
  inProgressCount: number; // In Progress or Waiting for Parts
  totalJobsAssigned: number;
  totalRevenue: number;   // Total bill or value of completed jobs
  jobs: Customer[];
}

export interface PerformanceSummary {
  filterRange: 'today' | 'week' | 'month' | 'all';
  totalCompleted: number;
  totalInProgress: number;
  totalRevenue: number;
  topTechnician: { name: string; count: number } | null;
  technicians: StaffPerformanceMetric[];
}

const parseDateToMs = (val: any): number => {
  if (!val) return 0;
  if (typeof val === 'object' && 'seconds' in val) return val.seconds * 1000;
  if (val instanceof Date) return val.getTime();
  const parsed = new Date(val).getTime();
  return isNaN(parsed) ? 0 : parsed;
};

export const staffPerformanceService = {
  /**
   * Calculate staff servicing metrics across a given time filter
   */
  async getPerformanceReport(
    range: 'today' | 'week' | 'month' | 'all' = 'today'
  ): Promise<PerformanceSummary> {
    const [customers, users] = await Promise.all([
      customerService.getAll(),
      userService.getAllUsers()
    ]);

    const now = new Date();
    let filterStartMs = 0;

    if (range === 'today') {
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      filterStartMs = todayStart.getTime();
    } else if (range === 'week') {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - 7);
      weekStart.setHours(0, 0, 0, 0);
      filterStartMs = weekStart.getTime();
    } else if (range === 'month') {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      filterStartMs = monthStart.getTime();
    }

    // Initialize map for all staff
    const staffMap = new Map<string, StaffPerformanceMetric>();
    
    // Add known users
    users.forEach(u => {
      staffMap.set(u.email.toLowerCase(), {
        staffEmail: u.email,
        staffName: u.name,
        role: u.role,
        avatar: u.avatar || '',
        completedCount: 0,
        inProgressCount: 0,
        totalJobsAssigned: 0,
        totalRevenue: 0,
        jobs: []
      });
    });

    // Also support fallback for unassigned/general
    const unassignedKey = 'unassigned';
    staffMap.set(unassignedKey, {
      staffEmail: 'unassigned',
      staffName: 'General / Unassigned',
      role: 'Staff',
      avatar: '',
      completedCount: 0,
      inProgressCount: 0,
      totalJobsAssigned: 0,
      totalRevenue: 0,
      jobs: []
    });

    let totalCompleted = 0;
    let totalInProgress = 0;
    let totalRevenue = 0;

    for (const c of customers) {
      // Determine date of servicing
      const activityMs = Math.max(
        parseDateToMs(c.deliveredAt),
        parseDateToMs(c.completedAt),
        parseDateToMs(c.updatedAt),
        parseDateToMs(c.createdAt)
      );

      // Check if within filter range
      if (range !== 'all' && activityMs < filterStartMs) {
        continue;
      }

      // Identify which staff serviced this
      const staffKey = (c.servicedBy || '').toLowerCase();
      let metric = staffMap.get(staffKey);
      
      if (!metric) {
        // Try matching by servicedByName
        const matchByName = Array.from(staffMap.values()).find(
          m => c.servicedByName && m.staffName.toLowerCase() === c.servicedByName.toLowerCase()
        );
        metric = matchByName || staffMap.get(unassignedKey)!;
      }

      const isCompleted = c.status === 'Delivered' || c.status === 'Ready for Delivery';
      const isInProgress = c.status === 'In Progress' || c.status === 'Waiting for Parts';

      metric.totalJobsAssigned++;
      metric.jobs.push(c);

      if (isCompleted) {
        metric.completedCount++;
        metric.totalRevenue += (c.totalBill || 0);
        totalCompleted++;
        totalRevenue += (c.totalBill || 0);
      } else if (isInProgress) {
        metric.inProgressCount++;
        totalInProgress++;
      }
    }

    // Convert to list and filter out unassigned if empty
    const allMetrics = Array.from(staffMap.values()).filter(m => {
      if (m.staffEmail === 'unassigned') {
        return m.jobs.length > 0;
      }
      return true;
    });

    // Sort technicians by completedCount desc, then totalRevenue desc
    allMetrics.sort((a, b) => b.completedCount - a.completedCount || b.totalRevenue - a.totalRevenue);

    const topTech = allMetrics.length > 0 && allMetrics[0].completedCount > 0
      ? { name: allMetrics[0].staffName, count: allMetrics[0].completedCount }
      : null;

    return {
      filterRange: range,
      totalCompleted,
      totalInProgress,
      totalRevenue,
      topTechnician: topTech,
      technicians: allMetrics
    };
  }
};
