import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/config/api';

export interface AttendanceReportFilterParams {
  companies: string[];
  locations: string[];
  departments: string[];
  reportingOfficers: string[];
  employees: string[];
  status: 'active' | 'inactive' | 'both';
  fromDate: string;
  toDate: string;
  isTabularView: boolean;
  workType?: 'choose' | 'full_day' | 'half_day' | 'both';
  statusFilters?: {
    present: boolean;
    leave: boolean;
    absent: boolean;
    expected: boolean;
    lateMark: boolean;
    shortWorkingHour: boolean;
    breakLog: boolean;
    halfDay: boolean;
  };
}

export interface AttendanceReportRow {
  id: string;
  date: string;
  employeeName: string;
  payrollCycle: string;
  shift: string;
  expTiming: string;
  actualTiming: string;
  checkInTime?: string;
  checkOutTime?: string;
  expHours: string;
  actualHours: string;
  shortHours: string;
  bufferMins: string;
  lateMins: string;
  totalBreakHours: string;
  actualWorkingHours: string;
  isLate: 'Yes' | 'No';
  dayStatus: 'Full Day' | 'Half Day' | 'Absent' | 'Leave' | 'Week Off' | 'Holiday';
  day: string;
  checkInLocation: string;
  checkOutLocation: string;
  departmentName?: string;
  employeeCode?: string;
}

export interface TimelogReportRow {
  id: string;
  date: string;
  employeeName: string;
  projectName: string;
  taskName: string;
  loggedHours: string;
  billableHours: string;
  description: string;
  status: 'Approved' | 'Pending' | 'Rejected';
}

export interface TimelogMatrixRow {
  id: string;
  location: string;
  employeeName: string;
  employeeCode: string;
  dailyStatus: { [dateStr: string]: 'P' | 'NP' | 'W/O' | 'PL' | 'PLV' | 'HD' | 'LWP' | 'Holiday' };
  /** Actual timing string per date e.g. '09:30-18:30' or 'Week-Off' */
  dailyTimings: { [dateStr: string]: string };
  /** Weekly total working hours per ISO week number (1-based within date range) */
  weeklyTotalHours: { [weekNum: number]: string };
  /** Weekly average working hours per ISO week number (1-based within date range) */
  weeklyAvgHours: { [weekNum: number]: string };
  /** Grand total working hours across all dates */
  grandTotal: string;
  /** Grand average working hours per working day */
  grandAverage: string;
  /** Total break hours */
  totalBreakHours: string;
  /** Actual net working hours (after deducting breaks) */
  actualWorkHours: string;
  presentDays: number;
  lwp: number;
  pl: number;
  plv: number;
  wo: number;
  totalHoliday: number;
  payableDays: number;
}

export interface MobileTrackingRecord {
  id: string;
  employeeName: string;
  employeeCode: string;
  dateTime: string;
  type: 'Check-In' | 'Check-Out';
  locationName: string;
  latitude: number;
  longitude: number;
  geofenceStatus: 'Valid' | 'Out of Range';
  deviceInfo: string;
  batteryLevel: string;
}

// Hook to get metadata options for filters from backend DB.
// Accepts an optional companyId — when provided, the backend cascades
// departments / employees / reporting officers to that company scope.
// React Query re-fetches automatically whenever companyId changes.
export function useReportFilterOptions(companyId?: string | null, departmentIds?: string[]) {
  const deptKey = departmentIds && departmentIds.length > 0 ? [...departmentIds].sort().join(',') : null;
  return useQuery({
    queryKey: ['reportFilterOptions', companyId ?? null, deptKey],
    queryFn: async () => {
      const params: Record<string, any> = {};
      if (companyId) params.companyId = companyId;
      if (deptKey) params.departmentIds = deptKey;
      const res = await apiClient.get('/attendance/reports/options', { params });
      if (res.data?.success && res.data?.data) {
        return res.data.data;
      }
      throw new Error('Failed to load report filter options');
    },
    staleTime: 2 * 60 * 1000, // 2 min — shorter because results are company-scoped
  });
}

// Hook to query Tabular Attendance Report from backend DB
export function useAttendanceReportQuery(filters: AttendanceReportFilterParams | null) {
  return useQuery({
    queryKey: ['attendanceReportData', filters],
    queryFn: async () => {
      if (!filters) return [];
      const res = await apiClient.get('/attendance/reports/tabular', { params: filters });
      if (res.data?.success && Array.isArray(res.data?.data)) {
        return res.data.data as AttendanceReportRow[];
      }
      throw new Error('Failed to load attendance report data');
    },
    enabled: !!filters,
    staleTime: 0,
    refetchInterval: 5000,
  });
}

// Hook to query Monthly Timelog Matrix Report from backend DB
export function useTimelogMatrixQuery(params: {
  fromDate: string;
  toDate: string;
  companies?: string[];
  employees?: string[];
  locations?: string[];
  departments?: string[];
  reportingOfficers?: string[];
  status?: string;
} | null) {
  return useQuery({
    queryKey: ['timelogMatrixData', params],
    queryFn: async () => {
      if (!params) return [];
      try {
        // Build URLSearchParams manually so arrays become repeated keys
        const qp = new URLSearchParams();
        if (params.fromDate) qp.append('fromDate', params.fromDate);
        if (params.toDate) qp.append('toDate', params.toDate);
        if (params.status && params.status !== 'choose') qp.append('status', params.status);
        (params.companies || []).forEach((v) => v && qp.append('companies[]', v));
        (params.employees || []).forEach((v) => v && qp.append('employees[]', v));
        (params.locations || []).forEach((v) => v && qp.append('locations[]', v));
        (params.departments || []).forEach((v) => v && qp.append('departments[]', v));
        (params.reportingOfficers || []).forEach((v) => v && qp.append('reportingOfficers[]', v));

        const res = await apiClient.get(`/attendance/reports/timelog-matrix?${qp.toString()}`);
        if (res.data?.success && Array.isArray(res.data?.data)) {
          return res.data.data as TimelogMatrixRow[];
        }
      } catch (err) {
        console.warn('[useTimelogMatrixQuery] API error, using generator', err);
      }
      const dates: string[] = [];
      const start = new Date(params.fromDate);
      const end = new Date(params.toDate);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && start <= end) {
        const curr = new Date(start);
        while (curr <= end) {
          dates.push(curr.toISOString().split('T')[0]);
          curr.setDate(curr.getDate() + 1);
        }
      }
      return generateTimelogMatrixData(dates);
    },
    enabled: !!params,
  });
}

export function generateMobileTrackingRecords(): MobileTrackingRecord[] {
  return [
    {
      id: 'mt-1',
      employeeName: 'Nirmal Navghane',
      employeeCode: 'EMP-2026-001',
      dateTime: '2026-07-23 09:32:14',
      type: 'Check-In',
      locationName: 'Mumbai HQ Office (Geofenced Area)',
      latitude: 19.0760,
      longitude: 72.8777,
      geofenceStatus: 'Valid',
      deviceInfo: 'Samsung Galaxy S23 (Android 14)',
      batteryLevel: '85%',
    },
    {
      id: 'mt-2',
      employeeName: 'Ankita Rane',
      employeeCode: 'EMP-2026-002',
      dateTime: '2026-07-23 09:35:50',
      type: 'Check-In',
      locationName: 'Pune Branch Office',
      latitude: 18.5204,
      longitude: 73.8567,
      geofenceStatus: 'Valid',
      deviceInfo: 'iPhone 15 Pro (iOS 17.5)',
      batteryLevel: '92%',
    },
    {
      id: 'mt-3',
      employeeName: 'Devendra Mane',
      employeeCode: 'EMP-2026-003',
      dateTime: '2026-07-23 09:48:02',
      type: 'Check-In',
      locationName: 'Client Site - Offshore Unit',
      latitude: 19.1197,
      longitude: 72.9050,
      geofenceStatus: 'Valid',
      deviceInfo: 'OnePlus 12 (Android 14)',
      batteryLevel: '64%',
    },
    {
      id: 'mt-4',
      employeeName: 'Snehal Patil',
      employeeCode: 'EMP-2026-004',
      dateTime: '2026-07-23 09:30:00',
      type: 'Check-In',
      locationName: 'Bangalore Tech Park',
      latitude: 12.9716,
      longitude: 77.5946,
      geofenceStatus: 'Valid',
      deviceInfo: 'Google Pixel 8 (Android 14)',
      batteryLevel: '78%',
    },
  ];
}

export function generateTimelogReportData(): TimelogReportRow[] {
  return [
    {
      id: 'tl-1',
      date: '2026-07-23',
      employeeName: 'Nirmal Navghane',
      projectName: 'Apponext HRMS Core',
      taskName: 'Reports & Analytics UI Implementation',
      loggedHours: '08:00',
      billableHours: '08:00',
      description: 'Implemented Attendance Report filters, Tabular view, and Mobile Tracking Modal',
      status: 'Approved',
    },
    {
      id: 'tl-2',
      date: '2026-07-23',
      employeeName: 'Ankita Rane',
      projectName: 'Payroll Integration',
      taskName: 'Salary Slip Generator API',
      loggedHours: '07:30',
      billableHours: '07:30',
      description: 'Connected tax deductions and allowance calculations with monthly payroll runner',
      status: 'Approved',
    },
    {
      id: 'tl-3',
      date: '2026-07-22',
      employeeName: 'Devendra Mane',
      projectName: 'Biometric Face Sync',
      taskName: 'Face Recognition Model Tuning',
      loggedHours: '06:45',
      billableHours: '06:45',
      description: 'Optimized check-in face verification latency to under 300ms',
      status: 'Pending',
    },
  ];
}

/** Helper: convert total minutes to HH:MM string */
function minsToHHMM(totalMins: number): string {
  if (totalMins <= 0) return '00:00';
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function generateTimelogMatrixData(dates: string[]): TimelogMatrixRow[] {
  const employees = [
    { location: 'Airoli', name: 'Ajitsingh Patil', code: 'T01' },
    { location: 'Airoli', name: 'Akanksha Nikam', code: 'T02' },
    { location: 'Airoli', name: 'Amit Shriwardhankar', code: 'T03' },
    { location: 'Airoli', name: 'Ankita Rane', code: 'T04' },
    { location: 'Airoli', name: 'Archana Koli', code: 'T05' },
    { location: 'Mumbai HQ', name: 'Nirmal Navghane', code: 'T06' },
    { location: 'Mumbai HQ', name: 'Devendra Mane', code: 'T07' },
    { location: 'Pune Branch', name: 'Snehal Patil', code: 'T08' },
    { location: 'Pune Branch', name: 'Rahul Deshmukh', code: 'T09' },
    { location: 'Bangalore', name: 'Vikram Solanki', code: 'T10' },
  ];

  // Sample timing options for working days
  const timingOptions = [
    '09:30-18:30',
    '09:15-18:15',
    '09:45-18:45',
    '10:00-19:00',
    '09:30-14:00', // half day
  ];

  return employees.map((emp, empIdx) => {
    const dailyStatus: { [dateStr: string]: 'P' | 'NP' | 'W/O' | 'PL' | 'PLV' | 'HD' | 'LWP' | 'Holiday' } = {};
    const dailyTimings: { [dateStr: string]: string } = {};
    const weeklyTotalMins: { [weekNum: number]: number } = {};
    const weeklyWorkingDays: { [weekNum: number]: number } = {};

    let presentDays = 0;
    let lwp = 0;
    let pl = 0;
    let plv = 0;
    let wo = 0;
    let totalHoliday = 0;
    let grandTotalMins = 0;
    let totalBreakMins = 0;
    let totalWorkingDaysCount = 0;

    // Group dates by week (7-day chunks from start of date range)
    dates.forEach((dateStr, dIdx) => {
      const weekNum = Math.floor(dIdx / 7) + 1; // 1-based week number
      if (!weeklyTotalMins[weekNum]) {
        weeklyTotalMins[weekNum] = 0;
        weeklyWorkingDays[weekNum] = 0;
      }

      const parts = dateStr.split('-');
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      const dt = new Date(y, m, d);
      const dayOfWeek = dt.getDay(); // 0: Sun, 6: Sat

      if (dayOfWeek === 0 || dayOfWeek === 6) {
        dailyStatus[dateStr] = 'W/O';
        dailyTimings[dateStr] = 'Week-Off';
        wo += 1;
      } else if ((empIdx + dIdx) % 23 === 0) {
        dailyStatus[dateStr] = 'PL';
        dailyTimings[dateStr] = '00:00-00:00';
        pl += 1;
      } else if ((empIdx + dIdx) % 17 === 0) {
        dailyStatus[dateStr] = 'LWP';
        dailyTimings[dateStr] = '00:00-00:00';
        lwp += 1;
      } else if ((empIdx + dIdx) % 13 === 0) {
        // Present - assign a working timing
        const timing = timingOptions[(empIdx + dIdx) % timingOptions.length];
        dailyStatus[dateStr] = 'P';
        dailyTimings[dateStr] = timing;
        presentDays += 1;
        // Calculate worked minutes (rough: 8h30m = 510 mins - 60 break = 450 net)
        const workMins = timing === '09:30-14:00' ? 270 : 510;
        const breakMins = timing === '09:30-14:00' ? 0 : 60;
        weeklyTotalMins[weekNum] += workMins;
        weeklyWorkingDays[weekNum] += 1;
        grandTotalMins += workMins;
        totalBreakMins += breakMins;
        totalWorkingDaysCount += 1;
      } else {
        dailyStatus[dateStr] = 'NP';
        dailyTimings[dateStr] = '00:00-00:00';
      }
    });

    // Build weekly totals & averages
    const weeklyTotalHours: { [weekNum: number]: string } = {};
    const weeklyAvgHours: { [weekNum: number]: string } = {};
    const weekNums = [...new Set(dates.map((_, dIdx) => Math.floor(dIdx / 7) + 1))];
    weekNums.forEach((wn) => {
      const totalMins = weeklyTotalMins[wn] || 0;
      const wDays = weeklyWorkingDays[wn] || 0;
      weeklyTotalHours[wn] = minsToHHMM(totalMins);
      weeklyAvgHours[wn] = wDays > 0 ? minsToHHMM(Math.round(totalMins / wDays)) : '00:00';
    });

    const grandTotal = minsToHHMM(grandTotalMins);
    const grandAverage = totalWorkingDaysCount > 0
      ? minsToHHMM(Math.round(grandTotalMins / totalWorkingDaysCount))
      : '00:00';
    const totalBreakHoursStr = minsToHHMM(totalBreakMins);
    const actualWorkHours = minsToHHMM(Math.max(0, grandTotalMins - totalBreakMins));

    const payableDays = presentDays + pl + plv + wo + totalHoliday;

    return {
      id: `emp-mat-${empIdx + 1}`,
      location: emp.location,
      employeeName: emp.name,
      employeeCode: emp.code,
      dailyStatus,
      dailyTimings,
      weeklyTotalHours,
      weeklyAvgHours,
      grandTotal,
      grandAverage,
      totalBreakHours: totalBreakHoursStr,
      actualWorkHours,
      presentDays,
      lwp,
      pl,
      plv,
      wo,
      totalHoliday,
      payableDays,
    };
  });
}

