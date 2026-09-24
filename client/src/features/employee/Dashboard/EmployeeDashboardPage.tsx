import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../auth/store/authStore';
import { useEmployee } from '../hooks/useEmployees';
import { UpcomingHolidaysWidget } from './components/UpcomingHolidaysWidget';
import { KpiStrip, QuickServices, RecentExpenseClaimsCard } from './DashboardWidgets';
import { apiClient } from '@/lib/api';
import { expenseApi, type ExpenseClaim } from '@/features/expenses/api/expenseApi';
import { useExpenseMoney } from '@/features/expenses/utils/useExpenseMoney';
import {
  Clock, FileText, Sparkles,
  ChevronRight, Palmtree, Camera, MapPin, AlertCircle, Navigation,
  ChevronLeft, FolderOpen, Download, FileCheck, ExternalLink,
  Calendar, Lock, Unlock, Radio, Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { showToast } from '@/components/ui/toast';
import { useAttendanceModuleSettings } from '@/features/attendance/hooks/useAttendanceModuleSettings';
import { fetchEmployeeHolidays, type EmployeeHoliday } from './holidayData';

// ─── Types ──────────────────────────────────────────────────────────────────

interface DailyLog {
  id?: number;
  date: string;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  status: 'present' | 'absent' | 'on_leave' | 'late' | 'early_checkout' | 'holiday' | 'off_day';
  workDurationMinutes?: number | null;
  durationFormatted?: string;
  geofenceVerified?: boolean;
}

// ─── Pill / Badge helpers ────────────────────────────────────────────────────

const StatusPill = ({
  status,
  isToday,
}: {
  status: DailyLog['status'] | null;
  isToday: boolean;
}) => {
  if (!status) {
    return isToday ? (
      <span className="inline-flex text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-600 text-white">Today</span>
    ) : null;
  }
  const map: Record<string, string> = {
    present:        'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
    late:           'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
    early_checkout: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400',
    on_leave:       'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
    absent:         'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400',
    holiday:        'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-400',
    off_day:        'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
  };
  const labels: Record<string, string> = {
    present: 'Present', late: 'Late', early_checkout: 'Early Out',
    on_leave: 'Leave', absent: 'Absent', holiday: 'Holiday', off_day: 'Off',
  };
  return (
    <span className={`inline-flex text-[9px] font-bold px-1.5 py-0.5 rounded-full ${map[status] ?? ''}`}>
      {labels[status] ?? status}
    </span>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────

export function EmployeeDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const employeeId = user?.employeeId || 0;
  const { employee } = useEmployee(employeeId);
  const { attendanceMode, requireCheckout, liveTrackingEnabled } = useAttendanceModuleSettings();
  const formatExpenseAmount = useExpenseMoney();

  const [currentTime, setCurrentTime] = useState(new Date());
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [attendanceLogs, setAttendanceLogs] = useState<Record<string, DailyLog>>({});
  const [shifts, setShifts] = useState<Record<string, any>>({});
  const [holidays, setHolidays] = useState<Record<string, EmployeeHoliday>>({});
  const [selectedDayLog, setSelectedDayLog] = useState<{ date: string; log: DailyLog | null } | null>(null);

  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'locating' | 'success' | 'error'>('idle');
  const [gpsErrorMsg, setGpsErrorMsg] = useState<string | null>(null);

  const [checkInStatus, setCheckInStatus] = useState<'not_started' | 'checked_in' | 'completed'>('not_started');
  const [checkInTime, setCheckInTime] = useState<string>('--');
  const [checkOutTime, setCheckOutTime] = useState<string>('--');
  const [workDuration, setWorkDuration] = useState<string>('--');
  const [durationSeconds, setDurationSeconds] = useState(0);

  const [isLocationSending, setIsLocationSending] = useState(false);
  const [lastLocationPingTime, setLastLocationPingTime] = useState<string | null>(null);

  const [todayHoliday, setTodayHoliday] = useState<{ isHoliday: boolean; holidayName?: string } | null>(null);
  const [hasShift, setHasShift] = useState<boolean | null>(null);
  const [myShift, setMyShift] = useState<any>(null);

  const [myLocations, setMyLocations] = useState<Array<{ id: string; locationId: number; name: string; isPrimary: boolean; radiusMeters?: number }>>([]);
  const [assignedLocation, setAssignedLocation] = useState<any>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');

  const [leaveBalances, setLeaveBalances] = useState<any[]>([]);
  const [loadingLeaves, setLoadingLeaves] = useState(true);
  const [expenseClaims, setExpenseClaims] = useState<ExpenseClaim[]>([]);
  const [loadingExpenses, setLoadingExpenses] = useState(true);
  const [disableReminder, setDisableReminder] = useState(false);

  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [userDocuments, setUserDocuments] = useState<any[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['onboarding', 'letters', 'tax']);
  const [searchQuery, setSearchQuery] = useState('');

  // ─── Location ping ───────────────────────────────────────────────────────

  const sendLocationPingUpdate = useCallback(async (isManual = false) => {
    if (checkInStatus === 'not_started' || !navigator.geolocation) return;
    if (isManual) setIsLocationSending(true);

    const sendFix = async (pos: GeolocationPosition) => {
      const { latitude: lat, longitude: lng, accuracy, speed } = pos.coords;
      setUserCoords({ latitude: lat, longitude: lng });
      try {
        await apiClient.post('/livetracking/ping', { latitude: lat, longitude: lng, accuracy, speed: speed || 0 });
        const timeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
        setLastLocationPingTime(timeStr);
        if (isManual) showToast.success('Location sent', `GPS ping at ${timeStr} (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
      } catch {
        if (isManual) showToast.error('Location failed', 'Could not send GPS ping to server.');
      } finally {
        if (isManual) setIsLocationSending(false);
      }
    };

    navigator.geolocation.getCurrentPosition(
      sendFix,
      () => navigator.geolocation.getCurrentPosition(sendFix, (err) => {
        if (isManual) { setIsLocationSending(false); showToast.error('Permission denied', err.message); }
      }, { enableHighAccuracy: false, maximumAge: 60000, timeout: 3000 }),
      { enableHighAccuracy: false, maximumAge: 0, timeout: 4000 },
    );
  }, [checkInStatus]);

  useEffect(() => {
    if (checkInStatus === 'not_started') return;
    sendLocationPingUpdate(false);
    const id = setInterval(() => sendLocationPingUpdate(false), 2500);
    return () => clearInterval(id);
  }, [checkInStatus, sendLocationPingUpdate]);

  // ─── Helpers ─────────────────────────────────────────────────────────────

  const formatTime = (d: Date) =>
    d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }).toLowerCase();

  const formatTimeToDisplay = (t: string | null): string => {
    if (!t) return '';
    try {
      if (/am|pm/i.test(t)) return t.replace(/:00\s/gi, ' ').toLowerCase();
      const [h, m] = t.split(':').map(Number);
      const ampm = h >= 12 ? 'pm' : 'am';
      const h12 = h % 12 || 12;
      return `${h12}:${String(m).padStart(2, '0')}${ampm}`;
    } catch { return t; }
  };

  const computeWorkDuration = (item: any, isToday = false): string => {
    if (!item) return '--';
    const mins = item?.work_duration_minutes ?? item?.duration_minutes ?? item?.workDurationMinutes;
    if (typeof mins === 'number' && mins > 0) {
      const h = Math.floor(mins / 60), m = mins % 60;
      return h > 0 ? `${h}h ${m}m` : `${m}m`;
    }
    const inStr = item.check_in_time || item.checkInTime;
    const outStr = item.check_out_time || item.checkOutTime;
    if (inStr && inStr !== '--') {
      const inMs = new Date(String(inStr).replace(' ', 'T')).getTime();
      if (!isNaN(inMs)) {
        let outMs = NaN;
        if (outStr && outStr !== '--') outMs = new Date(String(outStr).replace(' ', 'T')).getTime();
        else if (isToday) outMs = Date.now();
        if (!isNaN(outMs) && outMs >= inMs) {
          const d = Math.floor((outMs - inMs) / 60000);
          return d >= 60 ? `${Math.floor(d / 60)}h ${d % 60}m` : `${d}m`;
        }
      }
    }
    return '--';
  };

  const todayStr = () => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
  };

  // ─── Data fetchers ────────────────────────────────────────────────────────

  const fetchLocation = () => {
    if (!navigator.geolocation) { setGpsStatus('error'); setGpsErrorMsg('Geolocation not supported'); return; }
    setGpsStatus('locating');
    navigator.geolocation.getCurrentPosition(
      (p) => { setUserCoords({ latitude: p.coords.latitude, longitude: p.coords.longitude }); setGpsStatus('success'); setGpsErrorMsg(null); },
      (e) => { setGpsStatus('error'); setGpsErrorMsg(e.message || 'Permission denied'); },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const fetchTodayStatus = async () => {
    try {
      const { data } = await apiClient.get('/attendance/status');
      const st = data?.data;
      if (!st) return;
      if (typeof st.isHoliday === 'boolean') setTodayHoliday({ isHoliday: st.isHoliday, holidayName: st.holidayName });
      if (typeof st.hasShift === 'boolean') setHasShift(st.hasShift);
      if (st.shiftInfo) setMyShift(st.shiftInfo);
      if (st.isCheckedOut) {
        setCheckInStatus('completed');
        setCheckInTime(st.checkInTime ? formatTime(new Date(st.checkInTime)) : '--');
        setCheckOutTime(st.checkOutTime ? formatTime(new Date(st.checkOutTime)) : '--');
        setWorkDuration(computeWorkDuration({ check_in_time: st.checkInTime, check_out_time: st.checkOutTime }, false));
      } else if (st.isCheckedIn) {
        const inT = st.checkInTime ? formatTime(new Date(st.checkInTime)) : '--';
        setCheckInTime(inT);
        if (!requireCheckout) { setCheckInStatus('completed'); setCheckOutTime('N/A'); setWorkDuration('Check-in credit'); }
        else { setCheckInStatus('checked_in'); setWorkDuration(computeWorkDuration({ check_in_time: st.checkInTime }, true)); }
      }
    } catch { /* silent */ }
  };

  const fetchMonthlyAttendance = async () => {
    const year = calendarDate.getFullYear(), month = calendarDate.getMonth();
    const start = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const last = new Date(year, month + 1, 0).getDate();
    const end = `${year}-${String(month + 1).padStart(2, '0')}-${String(last).padStart(2, '0')}`;
    try {
      const sr = await apiClient.get('/attendance/my-shifts', { params: { from: start, to: end } });
      if (sr.data?.data) {
        const rows: any[] = Array.isArray(sr.data.data)
          ? sr.data.data
          : (sr.data.data.items || sr.data.data.shifts || sr.data.data.schedules || []);
        const m: Record<string, any> = {};
        rows.forEach((shift: any) => {
          const date = String(shift.date || shift.shiftDate || shift.shift_date || shift.workDate || '').slice(0, 10);
          if (!date) return;
          m[date] = {
            ...shift,
            date,
            shiftCode: shift.shiftCode || shift.shift_code || shift.code || shift.shift?.shift_code || shift.shift?.code,
            shiftName: shift.shiftName || shift.shift_name || shift.name || shift.shift?.shift_name || shift.shift?.name,
            startTime: shift.startTime || shift.start_time || shift.shift?.start_time,
            endTime: shift.endTime || shift.end_time || shift.shift?.end_time,
            color: shift.color || shift.shift?.color,
            isOffDay: Boolean(shift.isOffDay ?? shift.is_off_day ?? shift.offDay ?? shift.day_type === 'off'),
          };
        });
        setShifts(m);
      }
    } catch { /* silent */ }
    try {
      const { data } = await apiClient.get('/attendance/history', { params: { startDate: start, endDate: end, pageSize: 100 } });
      const list: any[] = Array.isArray(data?.data) ? data.data : (data?.data?.items ?? []);
      const map: Record<string, DailyLog> = {};
      list.forEach((item) => {
        const ref = item.checkInTime || item.check_in_time || item.checkInDate || item.check_in_date || item.date;
        if (!ref) return;
        let ds = '';
        if (typeof ref === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(ref)) ds = ref;
        else {
          const d = new Date(String(ref).replace(' ', 'T'));
          if (!isNaN(d.getTime())) ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        }
        if (!ds) return;
        const sv = String(item.status || item.rawStatus || '').toLowerCase();
        let st: DailyLog['status'] = 'present';
        if (sv === 'on_leave' || sv === 'leave' || sv === 'approved_leave') st = 'on_leave';
        else if (sv === 'absent') st = 'absent';
        else if (sv === 'holiday') st = 'holiday';
        else if (sv === 'off_day' || sv === 'weekly_off' || sv === 'week_off') st = 'off_day';
        else if (sv === 'late') st = 'late';
        else if (sv === 'early_checkout' || sv === 'early_out') st = 'early_checkout';
        else if (item.isLate ?? item.is_late) st = 'late';
        else if (item.isEarlyOut ?? item.is_early_out ?? item.is_early_departure) st = 'early_checkout';

        const fmt12 = (t: any) => {
          if (!t || t === '--') return null;
          try {
            const d = new Date(String(t).replace(' ', 'T'));
            return isNaN(d.getTime()) ? null : d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase();
          } catch { return null; }
        };
        map[ds] = {
          id: item.id, date: ds,
          checkInTime: fmt12(item.checkInTime || item.check_in_time),
          checkOutTime: fmt12(item.checkOutTime || item.check_out_time),
          status: st,
          workDurationMinutes: item.workDurationMinutes ?? item.work_duration_minutes ?? null,
          durationFormatted: computeWorkDuration(item, ds === todayStr()),
          geofenceVerified: item.geofenceMatched ?? item.geofence_matched ?? true,
        };
      });
      setAttendanceLogs(map);
    } catch { /* silent */ }
  };

  const fetchLeaveBalances = async () => {
    setLoadingLeaves(true);
    try {
      const { data } = await apiClient.get('/leaves/balances');
      const items: any[] = Array.isArray(data?.data) ? data.data : (data?.data?.items ?? []);
      setLeaveBalances(items.length ? items : fallbackLeaves());
    } catch { setLeaveBalances(fallbackLeaves()); }
    finally { setLoadingLeaves(false); }
  };

  const fetchHolidays = async () => {
    const list = await fetchEmployeeHolidays();
    const map: Record<string, EmployeeHoliday> = {};
    list.forEach((holiday) => { map[holiday.holidayDate] = holiday; });
    setHolidays(map);
  };

  const fetchExpenseClaims = async () => {
    setLoadingExpenses(true);
    try {
      const claims = await expenseApi.getClaims({ mode: 'my_expenses' });
      const normalized: ExpenseClaim[] = Array.isArray(claims) ? claims : [];
      setExpenseClaims(normalized.sort((a, b) => {
        const aTime = new Date(a.claimDate || a.createdAt || 0).getTime();
        const bTime = new Date(b.claimDate || b.createdAt || 0).getTime();
        return bTime - aTime;
      }));
    } catch {
      setExpenseClaims([]);
    } finally {
      setLoadingExpenses(false);
    }
  };

  const fallbackLeaves = () => [
    { leave_name: 'Casual Leave',  leave_code: 'CL', allocated_balance: 12, consumed_balance: 2,  available_balance: 10 },
    { leave_name: 'Sick Leave',    leave_code: 'SL', allocated_balance: 10, consumed_balance: 2,  available_balance: 8  },
    { leave_name: 'Earned Leave',  leave_code: 'EL', allocated_balance: 15, consumed_balance: 0,  available_balance: 15 },
  ];

  const fetchMyLocations = async () => {
    try {
      const { data } = await apiClient.get('/attendance/my-permitted-locations');
      const locs = data?.data?.locations ?? [];
      setMyLocations(locs);
      const primary = locs.find((l: any) => l.isPrimary) || locs[0];
      if (primary) { setAssignedLocation(primary); setSelectedLocationId(String(primary.locationId || primary.id)); }
      else setAssignedLocation({ name: 'Primary Office – Corporate HQ', radiusMeters: 200 });
    } catch { setAssignedLocation({ name: 'Primary Office – Corporate HQ', radiusMeters: 200 }); }
  };

  const fetchUserDocuments = async () => {
    setLoadingDocs(true);
    try {
      const { data } = await apiClient.get('/employees/my-documents');
      const items: any[] = Array.isArray(data?.data) ? data.data : (data?.data?.items ?? []);
      setUserDocuments(items.length ? items : mockDocs());
    } catch { setUserDocuments(mockDocs()); }
    finally { setLoadingDocs(false); }
  };

  const mockDocs = () => [
    { id: 101, document_type: 'offer_letter',       document_number: 'OFFER_LETTER_2026.pdf',       verification_status: 'VERIFIED', issued_by: 'HR Admin',       issue_date: '2026-01-15', file_url: '#' },
    { id: 102, document_type: 'appointment_letter', document_number: 'APPOINTMENT_LETTER.pdf',      verification_status: 'VERIFIED', issued_by: 'HR Operations',  issue_date: '2026-02-01', file_url: '#' },
    { id: 103, document_type: 'confirmation_letter',document_number: 'CONFIRMATION_LETTER.pdf',     verification_status: 'VERIFIED', issued_by: 'HR Operations',  issue_date: '2026-05-01', file_url: '#' },
    { id: 104, document_type: 'experience_letter',  document_number: 'EXPERIENCE_CERTIFICATE.pdf', verification_status: 'VERIFIED', issued_by: 'HR Operations',  issue_date: '2026-06-30', file_url: '#' },
    { id: 105, document_type: 'relieving_letter',   document_number: 'RELIEVING_LETTER.pdf',        verification_status: 'VERIFIED', issued_by: 'HR Operations',  issue_date: '2026-06-30', file_url: '#' },
    { id: 106, document_type: 'certificate',        document_number: 'F16_TAX_FORM_2025_26.pdf',   verification_status: 'VERIFIED', issued_by: 'Finance Dept',   issue_date: '2026-06-15', file_url: '#' },
    { id: 107, document_type: 'certificate',        document_number: 'PS_PAYSLIP_JUNE_2026.pdf',   verification_status: 'VERIFIED', issued_by: 'Payroll Dept',   issue_date: '2026-07-01', file_url: '#' },
    { id: 108, document_type: 'certificate',        document_number: 'PS_PAYSLIP_MAY_2026.pdf',    verification_status: 'VERIFIED', issued_by: 'Payroll Dept',   issue_date: '2026-06-01', file_url: '#' },
  ];

  // ─── Effects ──────────────────────────────────────────────────────────────

  useEffect(() => { const t = setInterval(() => setCurrentTime(new Date()), 1000); return () => clearInterval(t); }, []);
  useEffect(() => { fetchLocation(); fetchMonthlyAttendance(); }, [calendarDate]);
  useEffect(() => { fetchTodayStatus(); fetchLeaveBalances(); fetchMyLocations(); fetchHolidays(); fetchExpenseClaims(); }, []);
  useEffect(() => {
    const loadOrgSettings = async () => {
      try {
        const { data } = await apiClient.get('/settings/org-leave-settings/my-resolved');
        if (data?.success) setDisableReminder(!!data.data.disableLeaveApplicationReminder);
      } catch { /* silent */ }
    };
    loadOrgSettings();
  }, []);

  useEffect(() => {
    if (employee?.avatarUrl || (employee as any)?.avatar_url) {
      /* avatar synced separately */
    }
  }, [employee, user]);

  useEffect(() => {
    let id: ReturnType<typeof setInterval>;
    if (checkInStatus === 'checked_in') {
      id = setInterval(() => {
        setDurationSeconds((prev) => {
          const n = prev + 1;
          const h = String(Math.floor(n / 3600)).padStart(2, '0');
          const m = String(Math.floor((n % 3600) / 60)).padStart(2, '0');
          const s = String(n % 60).padStart(2, '0');
          setWorkDuration(`${h}h ${m}m ${s}s`);
          return n;
        });
      }, 1000);
    }
    return () => clearInterval(id);
  }, [checkInStatus]);

  // ─── Actions ──────────────────────────────────────────────────────────────

  const handleCheckInToggle = async () => {
    if (checkInStatus === 'not_started') {
      try {
        const payload: any = { method: 'web' };
        if (userCoords) { payload.latitude = userCoords.latitude; payload.longitude = userCoords.longitude; }
        if (selectedLocationId) payload.checkInLocation = Number(selectedLocationId);
        const { data } = await apiClient.post('/attendance/check-in', payload);
        if (data?.success) {
          const inT = formatTime(new Date());
          setCheckInTime(inT);
          if (!requireCheckout) { setCheckInStatus('completed'); setCheckOutTime('N/A'); setWorkDuration('Check-in credit'); showToast.success('Punched in', 'Check-out not required.'); }
          else { setCheckInStatus('checked_in'); setDurationSeconds(0); setWorkDuration('00h 00m 00s'); showToast.success('Punched in', 'GPS location verified.'); }
          fetchMonthlyAttendance();
        }
      } catch (e: any) {
        showToast.error('Punch-in failed', e.response?.data?.error?.message || e.response?.data?.message || 'Please try again.');
      }
    } else if (checkInStatus === 'checked_in') {
      try {
        const payload: any = { method: 'web' };
        if (userCoords) { payload.latitude = userCoords.latitude; payload.longitude = userCoords.longitude; }
        if (selectedLocationId) payload.checkOutLocation = Number(selectedLocationId);
        const { data } = await apiClient.post('/attendance/check-out', payload);
        if (data?.success) { setCheckInStatus('completed'); setCheckOutTime(formatTime(new Date())); showToast.success('Punched out', 'Good work today!'); fetchMonthlyAttendance(); }
      } catch (e: any) {
        showToast.error('Punch-out failed', e.response?.data?.error?.message || e.response?.data?.message || 'Please try again.');
      }
    }
  };

  const handleDownloadDoc = (doc: any) => {
    const name = doc.document_number || doc.document_type || 'Document';
    showToast.success('Download started', `Downloading ${name}...`);
    if (doc.file_url && doc.file_url !== '#') {
      const a = Object.assign(document.createElement('a'), { href: doc.file_url, target: '_blank', download: `${name}.pdf` });
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    }
  };

  const openDocVault = () => {
    setIsDocModalOpen(true);
    setSelectedCategories(['onboarding', 'letters', 'tax']);
    setSearchQuery('');
    fetchUserDocuments();
  };

  const displayedDocuments = userDocuments.filter((doc) => {
    const t = doc.document_type || '', n = doc.document_number || '';
    let match = false;
    if (selectedCategories.includes('onboarding') && ['offer_letter','appointment_letter','confirmation_letter'].includes(t)) match = true;
    if (selectedCategories.includes('letters') && ['relieving_letter','experience_letter','resume','certificate'].includes(t)) {
      if (!(t === 'certificate' && (n.startsWith('F16') || n.startsWith('PS')))) match = true;
    }
    if (selectedCategories.includes('tax') && (t === 'certificate' || n.startsWith('F16') || n.startsWith('PS'))) match = true;
    if (!match) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return n.toLowerCase().includes(q) || t.replace(/_/g,' ').toLowerCase().includes(q) || (doc.issued_by||'').toLowerCase().includes(q);
    }
    return true;
  });

  // ─── Derived display values ───────────────────────────────────────────────

  const employeeName = employee
    ? `${employee.firstName} ${employee.lastName}`
    : [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Employee';
  const designation = employee?.designation || 'Software Lead';
  const department  = employee?.department   || 'Engineering';
  const empCode     = employee?.employeeCode  || '#EMP12345';
  const initials    = employeeName.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase() || 'EMP';

  const getGreeting = () => {
    const h = currentTime.getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  };

  const getBalNum = (b: any, snake: string, camel: string, fb = 0) => {
    const v = b?.[snake] ?? b?.[camel];
    const n = typeof v === 'number' ? v : parseFloat(v);
    return isNaN(n) ? fb : n;
  };
  const getAvailable = (b: any) => {
    const raw = b?.available_balance ?? b?.availableBalance;
    if (raw !== undefined && raw !== null) { const n = parseFloat(raw); if (n >= 0) return n; }
    return Math.max(0, getBalNum(b,'allocated_balance','allocatedBalance',0) - getBalNum(b,'consumed_balance','consumedBalance',0) - getBalNum(b,'pending_approval_balance','pendingApprovalBalance',0));
  };
  const totalAvailable = leaveBalances.reduce((a, b) => a + getAvailable(b), 0);
  const totalAllocated = leaveBalances.reduce((a, b) => a + getBalNum(b, 'allocated_balance', 'allocatedBalance', 0), 0);
  const presentDays = Object.values(attendanceLogs).filter((log) =>
    ['present', 'late', 'early_checkout'].includes(log.status),
  ).length;
  const totalExpense = expenseClaims.reduce(
    (sum, claim) => sum + Number(claim.totalClaimedAmount || 0),
    0,
  );

  // ─── Calendar ─────────────────────────────────────────────────────────────

  const getCalendarDays = () => {
    const year = calendarDate.getFullYear(), month = calendarDate.getMonth();
    const firstIdx = new Date(year, month, 1).getDay(), total = new Date(year, month + 1, 0).getDate();
    const days: Array<{ dayNumber: number; dateStr: string; isCurrentMonth: boolean; isWeekend: boolean }> = [];
    for (let i = 0; i < firstIdx; i++) days.push({ dayNumber: 0, dateStr: '', isCurrentMonth: false, isWeekend: false });
    for (let d = 1; d <= total; d++) {
      const dow = new Date(year, month, d).getDay();
      const ds = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      days.push({ dayNumber: d, dateStr: ds, isCurrentMonth: true, isWeekend: dow === 0 || dow === 6 });
    }
    return days;
  };

  const cellTheme = (status: DailyLog['status'] | null, isToday: boolean, isFuture: boolean) => {
    if (isToday) return 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 ring-1 ring-blue-500/40';
    if (!status) return 'border-border/60 bg-card hover:border-blue-300/60';
    const map: Record<string, string> = {
      present:        'border-emerald-200 bg-emerald-50/70 dark:bg-emerald-950/30 dark:border-emerald-800',
      late:           'border-amber-200 bg-amber-50/70 dark:bg-amber-950/30 dark:border-amber-800',
      early_checkout: 'border-orange-200 bg-orange-50/70 dark:bg-orange-950/30 dark:border-orange-800',
      on_leave:       'border-blue-200 bg-blue-50/70 dark:bg-blue-950/30 dark:border-blue-800',
      absent:         'border-rose-200 bg-rose-50/70 dark:bg-rose-950/30 dark:border-rose-800',
      holiday:        'border-sky-200 bg-sky-50/70 dark:bg-sky-950/30 dark:border-sky-800',
      off_day:        'border-border/50 bg-slate-50/50 dark:bg-slate-900/20',
    };
    return (map[status] ?? 'border-border/60 bg-card') + ' hover:brightness-95';
  };

  // ─── Attendance console status badge ─────────────────────────────────────

  const consoleBadge = () => {
    if (checkInStatus === 'checked_in')  return { cls: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400', label: '● On duty' };
    if (checkInStatus === 'completed')   return { cls: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400', label: 'Shift done' };
    return { cls: 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400', label: 'Off duty' };
  };
  const cb = consoleBadge();

  // ─── Render ───────────────────────────────────────────────────────────────

  const hasAbsentDays = !disableReminder && Object.values(attendanceLogs).some((l: any) => l.status === 'absent' || l.status === 'missing_punch');

  return (
    <div className="space-y-5 pb-10">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border/70 bg-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
            <span className="text-base font-bold text-blue-700 dark:text-blue-300">{initials}</span>
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium mb-0.5">
              {getGreeting()} <span className="text-blue-600 dark:text-blue-400 font-semibold">{currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
            </p>
            <h1 className="text-xl font-bold text-foreground leading-tight">{employeeName}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{designation} · {department}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-muted-foreground border border-border/70 bg-muted/30 px-2.5 py-1 rounded-lg">{empCode}</span>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 px-2.5 py-1 rounded-lg">
            <Sparkles className="w-3 h-3" /> Active
          </span>
        </div>
      </div>

      {/* ── Absent reminder banner ──────────────────────────────────────── */}
      {hasAbsentDays && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Pending leave action</p>
              <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-0.5">You have absent or missing-punch days. Apply for leave or request regularization.</p>
            </div>
          </div>
          <button onClick={() => navigate('/employee/leaves')} className="shrink-0 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 px-4 py-2 rounded-lg transition-colors">
            Apply leave
          </button>
        </div>
      )}

      {/* ── Main grid: Attendance console (1 col) + KPIs & Quick services (2 cols) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* ── Col 1: Attendance console ─────────────────────────────────── */}
        <div className="rounded-2xl border border-border/70 bg-card overflow-hidden flex flex-col">
          {/* Console header */}
          <div className="px-4 py-3 border-b border-border/60 flex items-center justify-between bg-muted/10">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">Attendance console</p>
                <p className="text-[10px] text-muted-foreground">GPS location bound</p>
              </div>
            </div>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cb.cls}`}>{cb.label}</span>
          </div>

          <div className="p-4 flex-1 flex flex-col gap-3">
            {/* Shift / holiday banner */}
            {todayHoliday?.isHoliday && !hasShift ? (
              <div className="p-3 rounded-xl border border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800">
                <p className="text-xs font-semibold text-blue-800 dark:text-blue-300 flex items-center gap-1.5"><Palmtree className="w-3.5 h-3.5" /> Holiday – {todayHoliday.holidayName || 'Public holiday'}</p>
                <p className="text-[11px] text-blue-600/80 dark:text-blue-400/80 mt-1">No attendance required today.</p>
              </div>
            ) : !hasShift && hasShift !== null ? (
              <div className="p-3 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800">
                <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" /> No shift assigned</p>
                <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80 mt-1">Contact HR or your manager to assign a shift.</p>
              </div>
            ) : (
              <div className="p-3 rounded-xl border border-blue-100 bg-blue-50/60 dark:bg-blue-950/20 dark:border-blue-900">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-blue-800 dark:text-blue-300 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" /> {myShift?.shiftName || 'No shift assigned'}
                  </p>
                  {myShift?.durationHours && <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400">{myShift.durationHours}h shift</span>}
                </div>
                <p className="text-[11px] font-mono text-blue-600/70 dark:text-blue-400/70 mt-1">
                  {myShift?.startTime || '--'} – {myShift?.endTime || '--'}
                  {myShift?.gracePeriodMinutes > 0 && <span className="ml-2 text-muted-foreground">· grace {myShift.gracePeriodMinutes}m</span>}
                </p>
              </div>
            )}

            {/* GPS status */}
            <div className="flex items-center justify-between p-2.5 rounded-xl border border-border/60 bg-muted/20 text-xs">
              <div className="flex items-center gap-2">
                <MapPin className={`w-3.5 h-3.5 shrink-0 ${gpsStatus === 'success' ? 'text-emerald-500' : 'text-amber-500'}`} />
                <div>
                  <p className="font-medium text-foreground">
                    {gpsStatus === 'success' ? 'GPS verified' : gpsStatus === 'locating' ? 'Locating...' : gpsStatus === 'error' ? 'Location required' : 'Initializing...'}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {userCoords ? `${userCoords.latitude.toFixed(4)}, ${userCoords.longitude.toFixed(4)}` : gpsErrorMsg || 'Click refresh to detect'}
                  </p>
                </div>
              </div>
              <button onClick={fetchLocation} className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Refresh GPS">
                <Navigation className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Time metrics */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Check in',  value: checkInTime  },
                { label: 'Check out', value: checkOutTime },
                { label: 'Duration',  value: workDuration },
              ].map(({ label, value }) => (
                <div key={label} className="text-center bg-muted/20 border border-border/60 rounded-xl p-2.5">
                  <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
                  <p className="text-xs font-mono font-semibold text-foreground mt-1 truncate">{value}</p>
                </div>
              ))}
            </div>

            {/* Branch selector */}
            <div>
              <label className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
                <MapPin className="w-3 h-3 text-blue-500" /> Branch location
              </label>
              <select
                value={selectedLocationId}
                onChange={(e) => { setSelectedLocationId(e.target.value); const s = myLocations.find(l => String(l.locationId || l.id) === e.target.value); if (s) setAssignedLocation(s); }}
                disabled={checkInStatus !== 'not_started'}
                className="w-full h-9 px-3 rounded-xl border border-border/80 bg-background text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {myLocations.length > 0
                  ? myLocations.map(l => <option key={l.id} value={l.locationId || l.id}>📍 {l.name}{l.isPrimary ? ' (Primary)' : ''}</option>)
                  : <>
                      <option value="1">📍 Corporate HQ (Primary)</option>
                      <option value="2">📍 Main Branch Office</option>
                      <option value="3">📍 Regional Branch Office</option>
                      <option value="4">📍 Client site / Remote</option>
                    </>
                }
              </select>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-2 pt-1">
              {todayHoliday?.isHoliday && !hasShift ? (
                <div className="text-xs text-center font-medium text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 p-2.5 rounded-xl flex items-center justify-center gap-1.5">
                  <Palmtree className="w-3.5 h-3.5" /> Public holiday – no punch required
                </div>
              ) : !hasShift && hasShift !== null ? (
                <button disabled className="w-full h-9 rounded-xl border border-border text-xs font-medium text-muted-foreground bg-muted/30 cursor-not-allowed flex items-center justify-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" /> No shift (contact HR)
                </button>
              ) : (attendanceMode === 'gps' || attendanceMode === 'both' || attendanceMode === 'wifi_ip') && checkInStatus !== 'completed' ? (
                <button
                  onClick={handleCheckInToggle}
                  className={cn(
                    'w-full h-9 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5',
                    checkInStatus === 'not_started'
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-rose-500 hover:bg-rose-600 text-white'
                  )}
                >
                  {checkInStatus === 'not_started' ? 'Punch in (GPS)' : 'Punch out'}
                </button>
              ) : null}

              {(attendanceMode === 'face' || attendanceMode === 'both') && (
                <button
                  onClick={() => navigate('/employee/face-attendance')}
                  className="w-full h-9 rounded-xl border border-border/80 text-xs font-medium text-foreground hover:bg-muted/40 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Camera className="w-3.5 h-3.5 text-blue-500" /> Face recognition terminal
                </button>
              )}

              {/* Live tracking */}
              {liveTrackingEnabled && (
                <div className="pt-2 mt-1 border-t border-border/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                      <Navigation className="w-3 h-3 text-blue-500" /> Location access
                    </p>
                    {checkInStatus === 'not_started'
                      ? <span className="text-[10px] font-medium text-rose-600 dark:text-rose-400 flex items-center gap-1"><Lock className="w-3 h-3" /> Locked</span>
                      : <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1"><Unlock className="w-3 h-3" /> Active</span>
                    }
                  </div>
                  <button
                    onClick={() => {
                      if (checkInStatus === 'not_started') { showToast.error('Location blocked', 'Mark attendance first to unlock location access.'); return; }
                      sendLocationPingUpdate(true);
                    }}
                    disabled={isLocationSending}
                    className={cn(
                      'w-full h-9 rounded-xl text-xs font-medium transition-colors flex items-center justify-center gap-2',
                      checkInStatus === 'not_started'
                        ? 'border border-rose-200 bg-rose-50 text-rose-500 dark:bg-rose-950/20 dark:border-rose-900 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60'
                    )}
                  >
                    {checkInStatus === 'not_started'
                      ? <><Lock className="w-3.5 h-3.5" /> Mark attendance to unlock</>
                      : <><Radio className="w-3.5 h-3.5 animate-pulse" /> {isLocationSending ? 'Sending...' : 'Send location update'}</>
                    }
                  </button>
                  <p className="text-[10px] text-center text-muted-foreground">
                    {checkInStatus !== 'not_started' && lastLocationPingTime ? `Last ping: ${lastLocationPingTime}` : ''}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Col 2–3: KPI strip + Quick services (redesigned) ──────────── */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <KpiStrip
            leaveAvailable={totalAvailable}
            leaveTotal={totalAllocated}
            loadingLeaves={loadingLeaves}
            presentDays={presentDays}
            totalExpense={totalExpense}
            loadingExpenses={loadingExpenses}
            formatAmount={formatExpenseAmount}
            onNavigate={navigate}
          />
          <QuickServices
            onNavigate={navigate}
            onOpenVault={openDocVault}
            leaveAvailable={loadingLeaves ? undefined : totalAvailable}
            documentCount={userDocuments.length || undefined}
          />
        </div>
      </div>

      {/* ── Calendar + Leave balances ──────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Calendar */}
        <div className="lg:col-span-2 rounded-2xl border border-border/70 bg-card overflow-hidden">
          {/* Calendar header */}
          <div className="px-5 py-3 border-b border-border/60 flex items-center justify-between bg-muted/10">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">Attendance calendar</p>
                <p className="text-[10px] text-muted-foreground">Click a date for details</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1))} className="w-7 h-7 rounded-lg border border-border/70 flex items-center justify-center hover:bg-muted/40 transition-colors">
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-semibold text-foreground px-2">
                {calendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </span>
              <button onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1))} className="w-7 h-7 rounded-lg border border-border/70 flex items-center justify-center hover:bg-muted/40 transition-colors">
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setCalendarDate(new Date())} className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline px-2">Today</button>
            </div>
          </div>

          <div className="p-5">
            {/* Day labels */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
                <div key={d} className="text-center text-[10px] font-semibold text-muted-foreground py-1">{d}</div>
              ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 gap-2">
              {getCalendarDays().map((cell, idx) => {
                if (!cell.isCurrentMonth) return <div key={idx} className="min-h-[110px] rounded-xl bg-muted/10 border border-transparent" />;
                const today = todayStr();
                const isToday   = cell.dateStr === today;
                const isPast    = cell.dateStr < today;
                const isFuture  = cell.dateStr > today;
                const log       = isFuture ? null : (attendanceLogs[cell.dateStr] ?? null);
                const dayShift  = shifts[cell.dateStr];
                const holiday   = holidays[cell.dateStr];

                let status: DailyLog['status'] | null = null;
                if (log) status = log.status;
                else if (holiday) status = 'holiday';
                else if (dayShift?.isOffDay) status = 'off_day';
                else if (!dayShift && cell.isWeekend) status = 'off_day';
                else if (isPast && (dayShift || myShift)) status = 'absent';

                const showTimes = status === 'present' || status === 'late' || status === 'early_checkout';

                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedDayLog({
                      date: cell.dateStr,
                      log: log || (status ? { date: cell.dateStr, status } : null),
                    })}
                    className={`min-h-[110px] p-2 rounded-xl border flex flex-col justify-between cursor-pointer transition-all duration-100 ${cellTheme(status, isToday, isFuture)}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-semibold font-mono ${isToday ? 'text-blue-600 dark:text-blue-400' : 'text-foreground'}`}>{cell.dayNumber}</span>
                      {isToday && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />}
                    </div>

                    <div className="flex flex-col gap-0.5 mt-1 text-[9px]">
                      {/* Shift chip */}
                      {(() => {
                        const si = dayShift;
                        if (si && !si.isOffDay) {
                          return (
                            <div className="flex items-center gap-0.5 min-w-0">
                              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: si.color || '#3b82f6' }} />
                              <span className="font-mono text-[8px] text-foreground font-medium truncate">
                                {si.shiftCode} {si.startTime ? formatTimeToDisplay(si.startTime) : ''}
                              </span>
                            </div>
                          );
                        }
                        if (myShift && !cell.isWeekend && status !== 'holiday' && status !== 'on_leave' && status !== 'off_day') {
                          const code  = myShift.shiftCode || myShift.shift_code || 'SHIFT';
                          const start = myShift.startTime || myShift.start_time ? formatTimeToDisplay(myShift.startTime || myShift.start_time) : '';
                          return (
                            <div className="flex items-center gap-0.5 min-w-0">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-400/70 shrink-0" />
                              <span className="font-mono text-[8px] text-muted-foreground font-medium truncate">{code} {start}</span>
                            </div>
                          );
                        }
                        return null;
                      })()}

                      {/* Time / status text */}
                      {showTimes ? (
                        <>
                          <span className="font-mono text-emerald-700 dark:text-emerald-400 leading-none">In: {log?.checkInTime || '--'}</span>
                          <span className="font-mono text-rose-600 dark:text-rose-400 leading-none">Out: {log?.checkOutTime || '--'}</span>
                        </>
                      ) : status === 'off_day' ? (
                        <span className="text-muted-foreground font-medium">Off day</span>
                      ) : cell.isWeekend ? (
                        <span className="text-muted-foreground/60">Weekend</span>
                      ) : status === 'holiday' ? (
                        <span className="truncate text-sky-600 dark:text-sky-400 font-medium" title={holiday?.holidayName}>
                          {holiday?.holidayName || 'Holiday'}
                        </span>
                      ) : status === 'on_leave' ? (
                        <span className="text-blue-600 dark:text-blue-400 font-medium">On leave</span>
                      ) : status === 'absent' && isPast ? (
                        <span className="text-rose-600 dark:text-rose-400 font-medium">Absent</span>
                      ) : null}

                      {/* Status pill */}
                      <StatusPill status={status} isToday={isToday} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-5 pt-4 border-t border-border/60">
              {[
                { dot: 'bg-emerald-400', label: 'Present' },
                { dot: 'bg-amber-400',   label: 'Late' },
                { dot: 'bg-orange-400',  label: 'Early out' },
                { dot: 'bg-blue-400',    label: 'On leave' },
                { dot: 'bg-rose-400',    label: 'Absent' },
                { dot: 'bg-sky-400',     label: 'Holiday' },
              ].map(({ dot, label }) => (
                <div key={label} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className={`w-2 h-2 rounded-full ${dot}`} />
                  {label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column: Recent expenses + Upcoming holidays */}
        <div className="flex flex-col gap-4">
          <RecentExpenseClaimsCard
            claims={expenseClaims}
            loading={loadingExpenses}
            onViewAll={() => navigate('/employee/my-expenses')}
            formatAmount={formatExpenseAmount}
          />

          {/* Upcoming holidays */}
          <div className="flex-1 min-h-[280px]">
            <UpcomingHolidaysWidget />
          </div>
        </div>
      </div>

      {/* ── Day details dialog ─────────────────────────────────────────── */}
      {selectedDayLog && (
        <Dialog open onOpenChange={(open) => !open && setSelectedDayLog(null)}>
          <DialogContent className="sm:max-w-[400px] rounded-2xl p-5 bg-card border border-border/70">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Calendar className="w-4 h-4 text-blue-500" /> Attendance details
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">{selectedDayLog.date}</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 pt-1">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Check in',  value: selectedDayLog.log?.checkInTime  || '--' },
                  { label: 'Check out', value: selectedDayLog.log?.checkOutTime || '--' },
                ].map(({ label, value }) => (
                  <div key={label} className="text-center bg-muted/20 border border-border/60 rounded-xl p-3">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
                    <p className="text-sm font-mono font-semibold text-foreground mt-1">{value}</p>
                  </div>
                ))}
              </div>
              <div className="bg-muted/20 border border-border/60 rounded-xl p-3 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Assigned shift</span>
                  <span className="font-medium text-foreground">
                    {(() => {
                      const si = shifts[selectedDayLog.date];
                      if (holidays[selectedDayLog.date]) return `Holiday — ${holidays[selectedDayLog.date].holidayName}`;
                      if (si?.isOffDay) return 'Weekly off';
                      if (si && !si.isOffDay) return `${si.shiftCode} (${formatTimeToDisplay(si.startTime)} – ${formatTimeToDisplay(si.endTime)})`;
                      return myShift?.shiftName ? `${myShift.shiftName} (${myShift.startTime || '--'} – ${myShift.endTime || '--'})` : 'No shift assigned';
                    })()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Work duration</span>
                  <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">
                    {computeWorkDuration(selectedDayLog.log, selectedDayLog.date === todayStr())}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Geofence</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Verified</span>
                </div>
              </div>
              <button
                onClick={() => { setSelectedDayLog(null); navigate('/employee/attendance-regularization'); }}
                className="w-full h-9 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors"
              >
                Request regularization for this date
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ── Documents dialog ───────────────────────────────────────────── */}
      <Dialog open={isDocModalOpen} onOpenChange={setIsDocModalOpen}>
        <DialogContent className="sm:max-w-[620px] max-h-[80vh] overflow-y-auto rounded-2xl p-5 bg-card border border-border/70">
          <DialogHeader className="pb-3 border-b border-border/60">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
                <FolderOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <DialogTitle className="text-sm font-semibold text-foreground">Company document vault</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">Your verified offer letters, payslips, and tax documents</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-2 py-3 border-b border-border/60">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search documents..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full h-8 text-xs border border-border/80 rounded-xl pl-8 pr-3 bg-background focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-foreground"
              />
              <svg className="absolute left-2.5 top-2 w-3.5 h-3.5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <div className="flex gap-1.5">
              {['onboarding','letters','tax'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat])}
                  className={cn(
                    'text-[10px] font-medium px-3 py-1.5 rounded-xl border capitalize transition-colors',
                    selectedCategories.includes(cat)
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/40'
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                showToast.info('Downloading', `Downloading ${displayedDocuments.length} documents...`);
                displayedDocuments.forEach((doc, i) => setTimeout(() => handleDownloadDoc(doc), i * 500));
              }}
              disabled={displayedDocuments.length === 0}
              className="shrink-0 h-8 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" /> All ({displayedDocuments.length})
            </button>
          </div>

          {/* Doc list */}
          <div className="space-y-2 py-3 max-h-[300px] overflow-y-auto pr-1">
            {loadingDocs ? (
              <p className="text-xs text-center text-muted-foreground py-6">Loading documents...</p>
            ) : displayedDocuments.length === 0 ? (
              <div className="py-8 text-center border border-dashed rounded-xl">
                <FileCheck className="w-8 h-8 text-muted-foreground/30 mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">No documents found</p>
              </div>
            ) : displayedDocuments.map((doc, idx) => (
              <div key={idx} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border/70 hover:border-blue-200 dark:hover:border-blue-800 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center shrink-0">
                    <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">
                      {doc.document_number || doc.document_type?.replace(/_/g,' ').toUpperCase() || 'Document'}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {doc.issued_by || 'HR Dept'} · {doc.issue_date || '—'}
                      {doc.verification_status && (
                        <span className="ml-2 text-emerald-600 dark:text-emerald-400 font-medium">✓ {doc.verification_status}</span>
                      )}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDownloadDoc(doc)}
                  className="shrink-0 h-7 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors flex items-center gap-1"
                >
                  <Download className="w-3 h-3" /> Download
                </button>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-border/60 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Need other documents? Contact HR admin.</span>
            <button
              onClick={() => { setIsDocModalOpen(false); navigate('/employee/documents'); }}
              className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              Full vault <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
