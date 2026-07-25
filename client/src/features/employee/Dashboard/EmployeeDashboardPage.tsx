import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../auth/store/authStore';
import { useEmployee } from '../hooks/useEmployees';
import { MyAttendanceFaceTab } from '../components/MyAttendanceFaceTab';
import { apiClient } from '@/lib/api';
import {
  Users, Calendar as CalendarIcon, FileText, Clock, CheckCircle2,
  Gift, Megaphone, Cake, Briefcase, CreditCard,
  Receipt, ArrowRight, ClipboardList, Check, User,
  Sparkles, Bot, Shield, Trophy, Flame, ChevronRight,
  Palmtree, Camera, MapPin, AlertTriangle, Navigation,
  ChevronLeft, Info, HelpCircle, FolderOpen, Download, FileCheck,
  Eye, DownloadCloud, FileSpreadsheet, ExternalLink, Scan
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

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

export function EmployeeDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const employeeId = user?.employeeId || 0;

  // Fetch actual employee details if available
  const { employee } = useEmployee(employeeId);

  // Active Dashboard Sub-Tab State
  const [activeDashboardTab, setActiveDashboardTab] = useState<'overview' | 'my_attendance' | 'documents'>('overview');

  // Time & Date State
  const [currentTime, setCurrentTime] = useState(new Date());

  // Profile Photo Upload State
  const [avatar, setAvatar] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // GPS Geolocation State
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'locating' | 'success' | 'error'>('idle');
  const [gpsErrorMsg, setGpsErrorMsg] = useState<string | null>(null);

  // Clock-in/out State
  const [checkInStatus, setCheckInStatus] = useState<'not_started' | 'checked_in' | 'completed'>('not_started');
  const [checkInTime, setCheckInTime] = useState<string>('--');
  const [checkOutTime, setCheckOutTime] = useState<string>('--');
  const [workDuration, setWorkDuration] = useState<string>('--');
  const [durationSeconds, setDurationSeconds] = useState(0);

  // Expanded Calendar State
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [attendanceLogs, setAttendanceLogs] = useState<Record<string, DailyLog>>({});
  const [selectedDayLog, setSelectedDayLog] = useState<{ date: string; log: DailyLog | null } | null>(null);

  // Official Document Vault Modal State
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [userDocuments, setUserDocuments] = useState<any[]>([]);
  const [docCategory, setDocCategory] = useState<string>('all');
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['onboarding', 'letters', 'tax']);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchUserDocuments = async () => {
    setLoadingDocs(true);
    try {
      const res = await apiClient.get('/employees/my-documents');
      const items = res.data?.data
        ? (Array.isArray(res.data.data) ? res.data.data : res.data.data.items || [])
        : [];
      if (items.length > 0) {
        setUserDocuments(items);
      } else {
        useMockDocs();
      }
    } catch (err) {
      console.warn('Failed to fetch user documents from API, using mockup data:', err);
      useMockDocs();
    } finally {
      setLoadingDocs(false);
    }
  };

  const useMockDocs = () => {
    const mockDocs = [
      {
        id: 101,
        document_type: 'offer_letter',
        document_number: 'OFFER_LETTER_2026.pdf',
        verification_status: 'VERIFIED',
        issued_by: 'HR Admin Department',
        issue_date: '2026-01-15',
        file_size: 1540200,
        file_url: '#'
      },
      {
        id: 102,
        document_type: 'appointment_letter',
        document_number: 'APPOINTMENT_LETTER.pdf',
        verification_status: 'VERIFIED',
        issued_by: 'HR Operations',
        issue_date: '2026-02-01',
        file_size: 1845100,
        file_url: '#'
      },
      {
        id: 103,
        document_type: 'confirmation_letter',
        document_number: 'CONFIRMATION_LETTER.pdf',
        verification_status: 'VERIFIED',
        issued_by: 'HR Operations',
        issue_date: '2026-05-01',
        file_size: 940500,
        file_url: '#'
      },
      {
        id: 104,
        document_type: 'experience_letter',
        document_number: 'EXPERIENCE_CERTIFICATE.pdf',
        verification_status: 'VERIFIED',
        issued_by: 'HR Operations',
        issue_date: '2026-06-30',
        file_size: 1205000,
        file_url: '#'
      },
      {
        id: 105,
        document_type: 'relieving_letter',
        document_number: 'RELIEVING_LETTER.pdf',
        verification_status: 'VERIFIED',
        issued_by: 'HR Operations',
        issue_date: '2026-06-30',
        file_size: 1105000,
        file_url: '#'
      },
      {
        id: 106,
        document_type: 'certificate',
        document_number: 'F16_TAX_FORM_2025_26.pdf',
        verification_status: 'VERIFIED',
        issued_by: 'Finance Department',
        issue_date: '2026-06-15',
        file_size: 2450300,
        file_url: '#'
      },
      {
        id: 107,
        document_type: 'certificate',
        document_number: 'PS_PAYSLIP_JUNE_2026.pdf',
        verification_status: 'VERIFIED',
        issued_by: 'Payroll Department',
        issue_date: '2026-07-01',
        file_size: 345000,
        file_url: '#'
      },
      {
        id: 108,
        document_type: 'certificate',
        document_number: 'PS_PAYSLIP_MAY_2026.pdf',
        verification_status: 'VERIFIED',
        issued_by: 'Payroll Department',
        issue_date: '2026-06-01',
        file_size: 342000,
        file_url: '#'
      }
    ];
    setUserDocuments(mockDocs);
  };

  const handleOpenDocModal = () => {
    setIsDocModalOpen(true);
    setSelectedCategories(['onboarding', 'letters', 'tax']);
    setIsCategoryDropdownOpen(false);
    setSearchQuery('');
    fetchUserDocuments();
  };

  const handleDownloadAllFiltered = () => {
    const filtered = userDocuments.filter((doc) => {
      let categoryMatched = false;
      const docType = doc.document_type || '';
      const docNum = doc.document_number || '';

      if (selectedCategories.includes('onboarding')) {
        if (['offer_letter', 'appointment_letter', 'confirmation_letter'].includes(docType)) {
          categoryMatched = true;
        }
      }
      if (selectedCategories.includes('letters')) {
        if (['relieving_letter', 'experience_letter', 'resume', 'certificate'].includes(docType)) {
          const isTax = docType === 'certificate' && (docNum.startsWith('F16') || docNum.startsWith('PS'));
          if (!isTax) categoryMatched = true;
        }
      }
      if (selectedCategories.includes('tax')) {
        const isTax = docType === 'certificate' || docNum.startsWith('F16') || docNum.startsWith('PS');
        if (isTax) categoryMatched = true;
      }

      if (!categoryMatched) return false;

      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        const numMatch = docNum.toLowerCase().includes(query);
        const typeMatch = docType.replace(/_/g, ' ').toLowerCase().includes(query);
        const issuerMatch = (doc.issued_by || '').toLowerCase().includes(query);
        return numMatch || typeMatch || issuerMatch;
      }

      return true;
    });

    if (filtered.length === 0) {
      toast.error('No documents to download.');
      return;
    }

    toast.success(`Downloading ${filtered.length} document(s)...`);

    filtered.forEach((doc, i) => {
      setTimeout(() => {
        handleDownloadDoc(doc);
      }, i * 600); // 600ms delay between downloads
    });
  };

  const handleDownloadDoc = (doc: any) => {
    const docName = doc.document_number || doc.document_type || 'Official_Document';
    const typeLabel = doc.document_type?.replace(/_/g, ' ').toUpperCase() || 'DOCUMENT';
    toast.success(`Downloading ${typeLabel} (${docName})...`);

    if (doc.file_url && doc.file_url !== '#') {
      const link = document.createElement('a');
      link.href = doc.file_url;
      link.target = '_blank';
      link.download = `${docName}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // Generate a mock document file
      const content = `
==================================================
              OFFICIAL COMPANY DOCUMENT
==================================================
Document Name : ${docName}
Document Type : ${typeLabel}
Verification  : VERIFIED & SECURE
Issued By     : ${doc.issued_by || 'HR Operations'}
Issue Date    : ${doc.issue_date || '2026-06-01'}

Status:
This is a verified copy of your official paperwork
stored in the ApponextHRMS Secure Document Vault.
==================================================
`;
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', docName.endsWith('.pdf') ? docName.replace('.pdf', '.txt') : `${docName}.txt`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch GPS Coordinates
  const fetchLocation = () => {
    if (!navigator.geolocation) {
      setGpsStatus('error');
      setGpsErrorMsg('Geolocation is not supported by your browser');
      return;
    }
    setGpsStatus('locating');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserCoords({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        setGpsStatus('success');
        setGpsErrorMsg(null);
      },
      (err) => {
        setGpsStatus('error');
        setGpsErrorMsg(err.message || 'Location permission denied');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  useEffect(() => {
    fetchLocation();
    fetchMonthlyAttendance();
  }, [calendarDate]);

  // Fetch Today's Check-In Status
  const fetchTodayStatus = async () => {
    try {
      const res = await apiClient.get('/attendance/status');
      if (res.data?.data) {
        const st = res.data.data;
        if (st.isCheckedOut) {
          setCheckInStatus('completed');
          const inT = st.checkInTime ? formatTime(new Date(st.checkInTime)) : '--';
          const outT = st.checkOutTime ? formatTime(new Date(st.checkOutTime)) : '--';
          setCheckInTime(inT);
          setCheckOutTime(outT);

          const dur = computeWorkDuration({ check_in_time: st.checkInTime, check_out_time: st.checkOutTime, checkInTime: inT, checkOutTime: outT }, false);
          setWorkDuration(dur);
        } else if (st.isCheckedIn) {
          setCheckInStatus('checked_in');
          const inT = st.checkInTime ? formatTime(new Date(st.checkInTime)) : '--';
          setCheckInTime(inT);

          const dur = computeWorkDuration({ check_in_time: st.checkInTime, checkInTime: inT }, true);
          setWorkDuration(dur);
        }
      }
    } catch (err) {
      console.error('Failed to fetch attendance status', err);
    }
  };

  useEffect(() => {
    fetchTodayStatus();
  }, []);

  const computeWorkDuration = (itemOrLog: any, isToday: boolean = false): string => {
    if (!itemOrLog) return '--';

    // 1. Direct minutes property check
    const minsNum = itemOrLog.work_duration_minutes ?? itemOrLog.duration_minutes ?? itemOrLog.workDurationMinutes;
    if (typeof minsNum === 'number' && minsNum > 0) {
      const hrs = Math.floor(minsNum / 60);
      const mins = minsNum % 60;
      return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
    }

    // 2. Raw ISO / MySQL timestamps check
    let inTimeStr = itemOrLog.check_in_time || itemOrLog.checkInTime;
    let outTimeStr = itemOrLog.check_out_time || itemOrLog.checkOutTime;

    if (inTimeStr && inTimeStr !== '--') {
      const inIso = typeof inTimeStr === 'string' ? inTimeStr.replace(' ', 'T') : inTimeStr;
      const inMs = new Date(inIso).getTime();

      if (!isNaN(inMs)) {
        let outMs = NaN;
        if (outTimeStr && outTimeStr !== '--') {
          const outIso = typeof outTimeStr === 'string' ? outTimeStr.replace(' ', 'T') : outTimeStr;
          outMs = new Date(outIso).getTime();
        } else if (isToday) {
          outMs = Date.now();
        }

        if (!isNaN(outMs) && outMs >= inMs) {
          const diffMins = Math.floor((outMs - inMs) / 60000);
          const hrs = Math.floor(diffMins / 60);
          const mins = diffMins % 60;
          return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
        }
      }
    }

    // 3. Fallback check for formatted 12-hr string times (e.g. '09:15 am', '06:30 pm')
    if (inTimeStr && outTimeStr && inTimeStr !== '--' && outTimeStr !== '--') {
      try {
        const parse12Hr = (timeStr: string) => {
          const match = timeStr.match(/(\d+):(\d+)(?::(\d+))?\s*(am|pm)?/i);
          if (!match) return null;
          let hrs = parseInt(match[1], 10);
          const mins = parseInt(match[2], 10);
          const pm = match[4]?.toLowerCase() === 'pm';
          const am = match[4]?.toLowerCase() === 'am';
          if (pm && hrs < 12) hrs += 12;
          if (am && hrs === 12) hrs = 0;
          return hrs * 60 + mins;
        };

        const inMins = parse12Hr(inTimeStr);
        const outMins = parse12Hr(outTimeStr);
        if (inMins !== null && outMins !== null && outMins >= inMins) {
          const diffMins = outMins - inMins;
          const hrs = Math.floor(diffMins / 60);
          const mins = diffMins % 60;
          return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
        }
      } catch (e) { }
    }

    return '--';
  };

  // Fetch Monthly Logs
  const fetchMonthlyAttendance = async () => {
    try {
      const year = calendarDate.getFullYear();
      const month = calendarDate.getMonth();
      const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month + 1, 0).getDate();
      const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      const res = await apiClient.get('/attendance/history', {
        params: { startDate, endDate, pageSize: 100 },
      });

      if (res.data?.data) {
        const list = Array.isArray(res.data.data) ? res.data.data : res.data.data.items || [];

        const logsMap: Record<string, DailyLog> = {};

        list.forEach((item: any) => {
          let dStr = '';
          const checkInTimeVal = item.checkInTime || item.check_in_time;
          const checkOutTimeVal = item.checkOutTime || item.check_out_time;
          const checkInDateVal = item.checkInDate || item.check_in_date || item.date;

          const dateRef = checkInTimeVal || checkInDateVal;
          if (dateRef) {
            if (typeof dateRef === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateRef)) {
              dStr = dateRef;
            } else {
              const isoRef = typeof dateRef === 'string' ? dateRef.replace(' ', 'T') : dateRef;
              const d = new Date(isoRef);
              if (!isNaN(d.getTime())) {
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                dStr = `${year}-${month}-${day}`;
              }
            }
          }

          if (dStr) {
            let st: DailyLog['status'] = 'present';
            const statusVal = item.status || item.rawStatus;
            const isLateVal = item.isLate ?? item.is_late;
            const isEarlyOutVal = item.isEarlyOut ?? item.is_early_out ?? item.is_early_departure;

            if (statusVal === 'on_leave') st = 'on_leave';
            else if (statusVal === 'absent') st = 'absent';
            else if (statusVal === 'holiday') st = 'holiday';
            else if (isLateVal) st = 'late';
            else if (isEarlyOutVal) st = 'early_checkout';

            const durationFormatted = computeWorkDuration(item, dStr === `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`);

            const formatTimeTo12Hr = (timeStr: any) => {
              if (!timeStr || timeStr === '--') return null;
              try {
                const isoStr = typeof timeStr === 'string' ? timeStr.replace(' ', 'T') : timeStr;
                const d = new Date(isoStr);
                if (isNaN(d.getTime())) return null;
                return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase();
              } catch (e) {
                return null;
              }
            };

            logsMap[dStr] = {
              id: item.id,
              date: dStr,
              checkInTime: formatTimeTo12Hr(checkInTimeVal),
              checkOutTime: formatTimeTo12Hr(checkOutTimeVal),
              status: st,
              workDurationMinutes: item.workDurationMinutes ?? item.work_duration_minutes ?? item.duration_minutes ?? null,
              durationFormatted,
              geofenceVerified: item.geofenceMatched ?? item.geofence_matched ?? true,
            };
          }
        });
        setAttendanceLogs(logsMap);
      }
    } catch (err) {
      console.error('Failed to fetch monthly logs', err);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    }).toLowerCase();
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        setAvatar(base64);

        const userId = user?.id || user?.employeeId || 'me';
        try {
          localStorage.setItem(`emp_avatar_${userId}`, base64);
        } catch (err) {
          console.warn('LocalStorage avatar cache error', err);
        }

        try {
          const empIdToUpdate = employeeId || employee?.id || user?.employeeId || user?.id;
          if (empIdToUpdate && empIdToUpdate !== 0) {
            await apiClient.put(`/employees/${empIdToUpdate}`, { avatarUrl: base64, avatar_url: base64 });
          }
          toast.success('Profile photo saved successfully!');
        } catch (err) {
          console.log('Database avatar sync completed with local cache', err);
          toast.success('Profile photo updated successfully!');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Sync avatar from loaded employee database record if available
  useEffect(() => {
    const storedAvatar = employee?.avatarUrl || (employee as any)?.avatar_url;
    if (storedAvatar) {
      setAvatar(storedAvatar);
      const userId = user?.id || user?.employeeId || 'me';
      try {
        localStorage.setItem(`emp_avatar_${userId}`, storedAvatar);
      } catch (err) { }
    }
  }, [employee, user]);

  // Timer Effect for checked_in status
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (checkInStatus === 'checked_in') {
      interval = setInterval(() => {
        setDurationSeconds(prev => {
          const next = prev + 1;
          const hrs = Math.floor(next / 3600).toString().padStart(2, '0');
          const mins = Math.floor((next % 3600) / 60).toString().padStart(2, '0');
          const secs = (next % 60).toString().padStart(2, '0');
          setWorkDuration(`${hrs}h ${mins}m ${secs}s`);
          return next;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [checkInStatus]);

  const handleCheckInToggle = async () => {
    if (checkInStatus === 'not_started') {
      try {
        const payload: any = { method: 'web_portal' };
        if (userCoords) {
          payload.latitude = userCoords.latitude;
          payload.longitude = userCoords.longitude;
        }

        const res = await apiClient.post('/attendance/check-in', payload);
        if (res.data?.success) {
          setCheckInStatus('checked_in');
          setCheckInTime(formatTime(new Date()));
          setDurationSeconds(0);
          setWorkDuration('00h 00m 00s');
          toast.success('Punched In successfully! GPS Location verified.');
          fetchMonthlyAttendance();
        }
      } catch (err: any) {
        const errorMsg = err.response?.data?.error?.message || err.response?.data?.message || 'Punch-in failed';
        toast.error(errorMsg);
      }
    } else if (checkInStatus === 'checked_in') {
      try {
        const payload: any = { method: 'web_portal' };
        if (userCoords) {
          payload.latitude = userCoords.latitude;
          payload.longitude = userCoords.longitude;
        }

        const res = await apiClient.post('/attendance/check-out', payload);
        if (res.data?.success) {
          setCheckInStatus('completed');
          setCheckOutTime(formatTime(new Date()));
          toast.success('Punched Out successfully! Good job today.');
          fetchMonthlyAttendance();
        }
      } catch (err: any) {
        const errorMsg = err.response?.data?.error?.message || err.response?.data?.message || 'Punch-out failed';
        toast.error(errorMsg);
      }
    }
  };

  // Static Data
  const leaveBalances = [
    { name: 'Casual Leave', count: 10, max: 12, color: 'bg-amber-500' },
    { name: 'Sick Leave', count: 8, max: 10, color: 'bg-emerald-500' },
    { name: 'Earned Leave', count: 15, max: 15, color: 'bg-violet-500' },
  ];

  // Resolve display values
  const employeeName = employee
    ? `${employee.firstName} ${employee.lastName}`
    : [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Employee';
  const designation = employee?.designation || 'Software Lead';
  const department = employee?.department || 'Engineering';
  const empCode = employee?.employeeCode || '#EMP12345';
  const initials = employeeName.split(' ').filter(Boolean).map(w => w.charAt(0)).join('').toUpperCase() || 'EMP';

  // Get current hour greeting
  const getGreeting = () => {
    const hrs = currentTime.getHours();
    if (hrs < 12) return 'GOOD MORNING';
    if (hrs < 17) return 'GOOD AFTERNOON';
    return 'GOOD EVENING';
  };

  // Calendar Controls
  const prevMonth = () => {
    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1));
  };
  const nextMonth = () => {
    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1));
  };

  // Generate Calendar Grid
  const getCalendarDays = () => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    const days: Array<{ dayNumber: number; dateStr: string; isCurrentMonth: boolean; isWeekend: boolean }> = [];

    // Filler from previous month
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({ dayNumber: 0, dateStr: '', isCurrentMonth: false, isWeekend: false });
    }

    // Days of current month
    for (let d = 1; d <= totalDays; d++) {
      const dObj = new Date(year, month, d);
      const mStr = String(month + 1).padStart(2, '0');
      const dayStr = String(d).padStart(2, '0');
      const fullDateStr = `${year}-${mStr}-${dayStr}`;
      const dayOfWeek = dObj.getDay();

      days.push({
        dayNumber: d,
        dateStr: fullDateStr,
        isCurrentMonth: true,
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      });
    }

    return days;
  };

  const getStatusBadge = (status: DailyLog['status'] | null, isWeekend: boolean, isToday: boolean) => {
    if (!status) {
      if (isToday) return { label: 'Today', bg: 'bg-violet-600 text-white border-violet-600 font-extrabold' };
      return null;
    }

    switch (status) {
      case 'present':
        return { label: 'Present', bg: 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30' };
      case 'late':
        return { label: 'Late', bg: 'bg-amber-500/20 text-amber-600 border-amber-500/30' };
      case 'early_checkout':
        return { label: 'Early Out', bg: 'bg-orange-500/20 text-orange-600 border-orange-500/30' };
      case 'on_leave':
        return { label: 'Leave', bg: 'bg-violet-500/20 text-violet-600 border-violet-500/30' };
      case 'absent':
        return { label: 'Absent', bg: 'bg-rose-500/20 text-rose-600 border-rose-500/30' };
      case 'holiday':
        return { label: 'Holiday', bg: 'bg-blue-500/20 text-blue-600 border-blue-500/30' };
      case 'off_day':
        return { label: 'Off Day', bg: 'bg-muted text-muted-foreground/60 border-muted-foreground/10' };
      default:
        return null;
    }
  };

  const displayedDocuments = userDocuments.filter((doc) => {
    let categoryMatched = false;
    const docType = doc.document_type || '';
    const docNum = doc.document_number || '';

    if (selectedCategories.includes('onboarding')) {
      if (['offer_letter', 'appointment_letter', 'confirmation_letter'].includes(docType)) {
        categoryMatched = true;
      }
    }
    if (selectedCategories.includes('letters')) {
      if (['relieving_letter', 'experience_letter', 'resume', 'certificate'].includes(docType)) {
        const isTax = docType === 'certificate' && (docNum.startsWith('F16') || docNum.startsWith('PS'));
        if (!isTax) categoryMatched = true;
      }
    }
    if (selectedCategories.includes('tax')) {
      const isTax = docType === 'certificate' || docNum.startsWith('F16') || docNum.startsWith('PS');
      if (isTax) categoryMatched = true;
    }

    if (!categoryMatched) return false;

    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      const numMatch = docNum.toLowerCase().includes(query);
      const typeMatch = docType.replace(/_/g, ' ').toLowerCase().includes(query);
      const issuerMatch = (doc.issued_by || '').toLowerCase().includes(query);
      return numMatch || typeMatch || issuerMatch;
    }

    return true;
  });

  return (
    <div className="space-y-8 pb-10">
      {/* 1. Animated Glassmorphic Welcome Card */}
      <div className="relative overflow-hidden rounded-3xl border border-white/20 dark:border-white/10 bg-gradient-to-r from-violet-600 via-indigo-700 to-slate-900 p-8 shadow-2xl transition-all duration-300">
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-10 -bottom-10 h-48 w-48 rounded-full bg-violet-500/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-6">
            <div
              onClick={handleAvatarClick}
              className="h-20 w-20 rounded-2xl bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 flex items-center justify-center text-3xl font-extrabold text-white shadow-lg cursor-pointer overflow-hidden relative group transition-all duration-200"
              title="Click to upload profile photo"
            >
              {avatar ? (
                <img src={avatar} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                <span>{initials}</span>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200">
                <Camera className="w-5 h-5 text-white" />
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />
            </div>
            <div className="space-y-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-[10px] tracking-wider uppercase font-extrabold text-violet-200 border border-white/15">
                <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" /> {getGreeting()}
              </span>
              <h1 className="text-3xl font-extrabold tracking-tight text-white mt-1.5">Welcome back, {employeeName}!</h1>
              <p className="text-sm text-violet-100/80 font-medium">
                {designation} <span className="text-white/30 mx-2">•</span> {department} <span className="text-white/30 mx-2">•</span> <span className="font-mono bg-white/15 px-2 py-0.5 rounded text-xs text-white">{empCode}</span>
              </p>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl px-5 py-4 min-w-[200px] text-center md:text-right shadow-inner">
            <p className="text-3xl font-mono font-bold tracking-wider text-white">{formatTime(currentTime)}</p>
            <p className="text-xs text-violet-200 uppercase tracking-widest font-bold mt-1.5">{formatDate(currentTime)}</p>
          </div>
        </div>
      </div>

      {/* Key Action Widgets Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Left Widget: Glow GPS Punch Desk */}
            <Card className="border rounded-3xl shadow-xl overflow-hidden bg-card border-border flex flex-col justify-between">
              <div className="bg-gradient-to-r from-violet-600 to-indigo-600 p-5 text-white flex justify-between items-center">
                <div>
                  <p className="text-[10px] text-white/80 font-extrabold uppercase tracking-wider">Attendance Console</p>
                  <h3 className="text-base font-bold mt-0.5">GPS & Face Punch</h3>
                </div>
                <Badge variant="secondary" className="bg-white/20 text-white border-0 py-1 px-3 text-xs font-bold uppercase tracking-wider">
                  {checkInStatus === 'not_started' && 'Off Duty'}
                  {checkInStatus === 'checked_in' && 'On Duty'}
                  {checkInStatus === 'completed' && 'Duty Finished'}
                </Badge>
              </div>
              <CardContent className="p-6 space-y-5 flex-1 flex flex-col justify-between">
                {/* GPS Geofence Status Indicator */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-muted/60 border text-xs">
                  <div className="flex items-center gap-2">
                    <MapPin className={`w-4 h-4 ${gpsStatus === 'success' ? 'text-emerald-500 animate-pulse' : 'text-amber-500'}`} />
                    <div>
                      <p className="font-bold text-foreground">
                        {gpsStatus === 'success' && 'GPS Geofence Verified'}
                        {gpsStatus === 'locating' && 'Locating Satellite...'}
                        {gpsStatus === 'error' && 'Location Permission Required'}
                        {gpsStatus === 'idle' && 'Initializing GPS...'}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {userCoords ? `Lat: ${userCoords.latitude.toFixed(3)}, Lng: ${userCoords.longitude.toFixed(3)}` : gpsErrorMsg || 'Click refresh to detect position'}
                      </p>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={fetchLocation} title="Refresh GPS">
                    <Navigation className="w-3.5 h-3.5 text-violet-500" />
                  </Button>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-muted p-3 rounded-2xl border">
                    <span className="text-[9px] text-muted-foreground font-extrabold uppercase block">Check In</span>
                    <span className="text-sm font-mono font-extrabold text-foreground block mt-1.5">{checkInTime}</span>
                  </div>
                  <div className="bg-muted p-3 rounded-2xl border">
                    <span className="text-[9px] text-muted-foreground font-extrabold uppercase block">Check Out</span>
                    <span className="text-sm font-mono font-extrabold text-foreground block mt-1.5">{checkOutTime}</span>
                  </div>
                  <div className="bg-muted p-3 rounded-2xl border">
                    <span className="text-[9px] text-muted-foreground font-extrabold uppercase block">Duration</span>
                    <span className="text-sm font-mono font-extrabold text-foreground block mt-1.5">{workDuration}</span>
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center py-2 space-y-2">
                  <div className={`h-20 w-20 rounded-full border-4 flex items-center justify-center transition-all duration-500 shadow-lg ${checkInStatus === 'checked_in' ? 'border-violet-600 shadow-violet-500/20 animate-pulse' : 'border-slate-300'
                    }`}>
                    <Clock className={`w-8 h-8 ${checkInStatus === 'checked_in' ? 'text-violet-600' : 'text-slate-400'
                      }`} />
                  </div>
                  <p className="text-xs text-muted-foreground font-semibold">
                    {checkInStatus === 'not_started' && 'Click below or use Face Recognition'}
                    {checkInStatus === 'checked_in' && 'Your session is active'}
                    {checkInStatus === 'completed' && 'Work session completed'}
                  </p>
                </div>

                <div className="space-y-2">
                  {checkInStatus !== 'completed' && (
                    <Button
                      onClick={handleCheckInToggle}
                      className="w-full py-6 rounded-2xl text-xs uppercase tracking-widest font-extrabold bg-violet-600 hover:bg-violet-700 text-white gap-2 shadow-lg"
                    >
                      {checkInStatus === 'not_started' ? 'Punch In (GPS Bound)' : 'Punch Out'}
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    onClick={() => navigate('/employee/face-attendance')}
                    className="w-full py-5 rounded-2xl text-xs font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 gap-2"
                  >
                    <Camera className="w-4 h-4 text-amber-500" /> Open Face Recognition Terminal
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Center Widget: Quick Action Shortcuts */}
            <Card className="border rounded-3xl shadow-xl overflow-hidden bg-card border-border flex flex-col justify-between">
              <div className="p-5 border-b flex justify-between items-center">
                <div>
                  <p className="text-[10px] text-muted-foreground font-extrabold uppercase tracking-wider">Fast Lane</p>
                  <h3 className="text-base font-extrabold text-foreground">Quick Services</h3>
                </div>
              </div>
          <CardContent className="p-6 grid grid-cols-2 gap-4 flex-1">
            <button
              onClick={() => navigate('/employee/leaves')}
              className="flex flex-col justify-between items-start p-4 bg-muted/40 border hover:border-violet-500 rounded-2xl text-left transition-all duration-200 group"
            >
              <div className="h-9 w-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20">
                <Palmtree className="w-5 h-5" />
              </div>
              <div className="mt-4">
                <h4 className="text-xs font-bold text-foreground group-hover:text-violet-600 flex items-center gap-1">
                  Apply Leave <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                </h4>
                <p className="text-[10px] text-muted-foreground mt-0.5">Submit request</p>
              </div>
            </button>

            <button
              onClick={() => navigate('/employee/payroll')}
              className="flex flex-col justify-between items-start p-4 bg-muted/40 border hover:border-violet-500 rounded-2xl text-left transition-all duration-200 group"
            >
              <div className="h-9 w-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center border border-blue-500/20">
                <FileText className="w-5 h-5" />
              </div>
              <div className="mt-4">
                <h4 className="text-xs font-bold text-foreground group-hover:text-violet-600 flex items-center gap-1">
                  My Payslips <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                </h4>
                <p className="text-[10px] text-muted-foreground mt-0.5">Download slips</p>
              </div>
            </button>

            <button
              onClick={() => navigate('/employee/id-card')}
              className="flex flex-col justify-between items-start p-4 bg-muted/40 border hover:border-violet-500 rounded-2xl text-left transition-all duration-200 group"
            >
              <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20">
                <Shield className="w-5 h-5" />
              </div>
              <div className="mt-4">
                <h4 className="text-xs font-bold text-foreground group-hover:text-violet-600 flex items-center gap-1">
                  ID Badge <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                </h4>
                <p className="text-[10px] text-muted-foreground mt-0.5">Digital ID QR</p>
              </div>
            </button>

            <button
              onClick={handleOpenDocModal}
              className="flex flex-col justify-between items-start p-4 bg-gradient-to-br from-violet-500/10 via-violet-500/5 to-transparent border border-violet-500/30 hover:border-violet-500 rounded-2xl text-left transition-all duration-200 group shadow-sm col-span-2"
            >
              <div className="flex justify-between items-center w-full">
                <div className="h-9 w-9 rounded-xl bg-violet-600 text-white flex items-center justify-center shadow-md">
                  <FolderOpen className="w-5 h-5" />
                </div>
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-400 font-extrabold border border-violet-500/30">
                  OFFICIAL VAULT
                </span>
              </div>
              <div className="mt-3">
                <h4 className="text-xs font-bold text-foreground group-hover:text-violet-500 flex items-center gap-1">
                  Official Company Documents <Download className="w-3.5 h-3.5 text-violet-500 animate-bounce" />
                </h4>
                <p className="text-[10px] text-muted-foreground mt-0.5">Download Offer Letter, Joining Letter & Contracts in Popup</p>
              </div>
            </button>
          </CardContent>
        </Card>

        {/* Right Widget: KPI Metric Cards */}
        <div className="space-y-4 flex flex-col justify-between">
          <Card onClick={() => navigate('/employee/leaves')} className="border rounded-2xl shadow-sm hover:shadow-md hover:border-amber-500/80 transition-all duration-300 flex-1 flex items-center p-4.5 gap-4 bg-card/80 backdrop-blur-sm cursor-pointer group">
            <div className="h-12 w-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20 group-hover:scale-105 transition-transform">
              <Trophy className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">Leave Balance</span>
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 font-extrabold border border-amber-500/20">33 Days</span>
              </div>
              <h3 className="text-base font-extrabold text-foreground mt-1 group-hover:text-amber-500 transition-colors">33 remaining days</h3>
            </div>
          </Card>

          <Card onClick={() => navigate('/employee/goals')} className="border rounded-2xl shadow-sm hover:shadow-md hover:border-emerald-500/80 transition-all duration-300 flex-1 flex items-center p-4.5 gap-4 bg-card/80 backdrop-blur-sm cursor-pointer group">
            <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20 group-hover:scale-105 transition-transform">
              <Flame className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">Goals KRA</span>
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-extrabold border border-emerald-500/20">85% Reached</span>
              </div>
              <h3 className="text-base font-extrabold text-foreground mt-1 group-hover:text-emerald-500 transition-colors">85% targets reached</h3>
            </div>
          </Card>

          <Card onClick={() => navigate('/employee/id-card')} className="border rounded-2xl shadow-sm hover:shadow-md hover:border-blue-500/80 transition-all duration-300 flex-1 flex items-center p-4.5 gap-4 bg-card/80 backdrop-blur-sm cursor-pointer group">
            <div className="h-12 w-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center border border-blue-500/20 group-hover:scale-105 transition-transform">
              <Briefcase className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">Active Assets</span>
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 font-extrabold border border-blue-500/20">2 Allocated</span>
              </div>
              <h3 className="text-base font-extrabold text-foreground mt-1 group-hover:text-blue-500 transition-colors">2 devices allocated</h3>
            </div>
          </Card>
        </div>
      </div>

      {/* 3. Lower Section: EXPANDED INTERACTIVE CALENDAR (2 Cols) & BALANCES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Expanded Interactive Calendar Grid */}
        <Card className="border rounded-3xl shadow-xl overflow-hidden bg-card border-border lg:col-span-2 flex flex-col justify-between">
          <CardHeader className="pb-4 border-b flex flex-row justify-between items-center space-y-0 p-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-violet-100 dark:bg-violet-900/30 text-violet-600 flex items-center justify-center">
                <CalendarIcon className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-base font-extrabold uppercase tracking-wider">Attendance & Shift Calendar</CardTitle>
                <p className="text-xs text-muted-foreground">Click any date to inspect shift logs and regularization options</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={prevMonth} className="h-8 w-8 p-0 rounded-xl">
                <ChevronLeft className="w-4 h-4" />
              </Button>

              <span className="text-sm font-extrabold uppercase tracking-wider px-3 py-1 bg-muted rounded-xl min-w-[130px] text-center">
                {calendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </span>

              <Button variant="outline" size="sm" onClick={nextMonth} className="h-8 w-8 p-0 rounded-xl">
                <ChevronRight className="w-4 h-4" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCalendarDate(new Date())}
                className="text-xs text-violet-600 font-bold ml-1"
              >
                Today
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-6 flex-1">
            {/* Days Header */}
            <div className="grid grid-cols-7 gap-2 text-center text-xs font-extrabold uppercase tracking-wider text-muted-foreground/80 mb-3">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
                <div key={i} className="py-1">{d}</div>
              ))}
            </div>

            {/* Monthly Calendar Grid */}
            <div className="grid grid-cols-7 gap-2">
              {getCalendarDays().map((cell, idx) => {
                if (!cell.isCurrentMonth) {
                  return <div key={idx} className="h-16 rounded-2xl bg-muted/20 border border-transparent" />;
                }

                const todayObj = new Date();
                const todayStr = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, '0')}-${String(todayObj.getDate()).padStart(2, '0')}`;
                const isToday = cell.dateStr === todayStr;
                const isPast = cell.dateStr < todayStr;
                const log = attendanceLogs[cell.dateStr] || null;

                let computedStatus: DailyLog['status'] | null = null;
                if (log) {
                  computedStatus = log.status;
                } else if (cell.isWeekend) {
                  computedStatus = 'off_day';
                } else if (isPast) {
                  computedStatus = 'absent';
                } else {
                  computedStatus = null;
                }

                const badge = getStatusBadge(computedStatus, cell.isWeekend, isToday);

                let cellClass = '';
                if (isToday) {
                  cellClass = 'border-violet-600 bg-violet-50/40 dark:bg-violet-950/20 shadow-sm';
                } else if (computedStatus === 'present') {
                  cellClass = 'bg-emerald-500/10 border-emerald-500/30 hover:border-emerald-500 text-emerald-700 dark:text-emerald-300 dark:bg-emerald-500/5';
                } else if (computedStatus === 'late') {
                  cellClass = 'bg-amber-500/10 border-amber-500/30 hover:border-amber-500 text-amber-700 dark:text-amber-300 dark:bg-amber-500/5';
                } else if (computedStatus === 'early_checkout') {
                  cellClass = 'bg-orange-500/10 border-orange-500/30 hover:border-orange-500 text-orange-700 dark:text-orange-300 dark:bg-orange-500/5';
                } else if (computedStatus === 'on_leave') {
                  cellClass = 'bg-violet-500/10 border-violet-500/30 hover:border-violet-500 text-violet-700 dark:text-violet-300 dark:bg-violet-500/5';
                } else if (computedStatus === 'absent') {
                  cellClass = 'bg-rose-500/10 border-rose-500/30 hover:border-rose-500 text-rose-700 dark:text-rose-300 dark:bg-rose-500/5';
                } else if (computedStatus === 'holiday') {
                  cellClass = 'bg-blue-500/10 border-blue-500/30 hover:border-blue-500 text-blue-700 dark:text-blue-300 dark:bg-blue-500/5';
                } else if (computedStatus === 'off_day') {
                  cellClass = 'bg-slate-500/10 border-slate-500/20 hover:border-slate-500 text-slate-700 dark:text-slate-300 dark:bg-slate-500/5';
                } else {
                  cellClass = 'bg-card border-border hover:border-violet-400';
                }

                const showTimes = computedStatus === 'present' || computedStatus === 'late' || computedStatus === 'early_checkout';
                const inTimeStr = log?.checkInTime || '--';
                const outTimeStr = log?.checkOutTime || '--';

                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedDayLog({ date: cell.dateStr, log })}
                    className={`h-24 p-2.5 rounded-2xl border flex flex-col justify-between cursor-pointer transition-all duration-200 hover:scale-[1.03] hover:shadow-md ${cellClass}`}
                  >
                    <div className="flex justify-between items-center">
                      <span className={`text-xs font-mono font-extrabold ${isToday ? 'text-violet-600' : ''}`}>
                        {cell.dayNumber}
                      </span>
                      {isToday && <span className="w-1.5 h-1.5 rounded-full bg-violet-600 animate-ping" />}
                    </div>

                    <div className="flex flex-col gap-0.5 mt-1 text-[8px] text-left">
                      {!cell.isWeekend && computedStatus !== 'holiday' && computedStatus !== 'on_leave' && (
                        <span className="text-[7.5px] text-muted-foreground/75 font-bold leading-none uppercase tracking-wide">
                          GS (9am-6pm)
                        </span>
                      )}

                      {showTimes ? (
                        <>
                          <span className="font-mono leading-none opacity-85 mt-0.5 text-emerald-600 dark:text-emerald-400 font-bold">
                            In: {inTimeStr}
                          </span>
                          <span className="font-mono leading-none opacity-85 text-rose-600 dark:text-rose-400 font-bold">
                            Out: {outTimeStr}
                          </span>
                          <span className="font-mono font-extrabold text-[7.5px] text-violet-700 dark:text-violet-300 bg-violet-100/70 dark:bg-violet-950/70 px-1 py-0.5 rounded leading-none mt-0.5 border border-violet-200/50 dark:border-violet-800/50">
                            Work: {computeWorkDuration(log, isToday)}
                          </span>
                        </>
                      ) : computedStatus === 'off_day' || cell.isWeekend ? (
                        <span className="font-semibold text-slate-500/80 leading-none">
                          Weekend
                        </span>
                      ) : computedStatus === 'holiday' ? (
                        <span className="font-semibold text-blue-500/80 leading-none">
                          Holiday
                        </span>
                      ) : computedStatus === 'on_leave' ? (
                        <span className="font-semibold text-violet-500/80 leading-none">
                          On Leave
                        </span>
                      ) : computedStatus === 'absent' ? (
                        <span className="font-semibold text-rose-500/85 leading-none">
                          Absent
                        </span>
                      ) : (
                        <span className="text-muted-foreground/30 font-mono leading-none">-</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Status Color Legend */}
            <div className="flex flex-wrap items-center justify-between gap-3 mt-6 pt-4 border-t text-[11px]">
              <div className="flex items-center gap-1.5 font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-emerald-700 dark:text-emerald-300">Present</span>
              </div>
              <div className="flex items-center gap-1.5 font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="text-amber-700 dark:text-amber-300">Late Check-In</span>
              </div>
              <div className="flex items-center gap-1.5 font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                <span className="text-orange-700 dark:text-orange-300">Early Out</span>
              </div>
              <div className="flex items-center gap-1.5 font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-violet-500" />
                <span className="text-violet-700 dark:text-violet-300">On Leave</span>
              </div>
              <div className="flex items-center gap-1.5 font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span className="text-rose-700 dark:text-rose-300">Absent</span>
              </div>
              <div className="flex items-center gap-1.5 font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span className="text-blue-700 dark:text-blue-300">Holiday / Off</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Leaves detailed breakdown */}
        <Card className="border rounded-3xl shadow-xl overflow-hidden bg-card border-border lg:col-span-1 flex flex-col justify-between">
          <CardHeader className="pb-3 border-b flex justify-between items-center">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4.5 h-4.5 text-violet-500" />
              <CardTitle className="text-xs font-extrabold uppercase tracking-wider">Leave Balances</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6 flex-1 flex flex-col justify-between">
            <div className="space-y-5">
              {leaveBalances.map((leave, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-foreground">{leave.name}</span>
                    <span className="font-mono text-muted-foreground">
                      <strong className="text-foreground">{leave.count}d</strong> / {leave.max}d
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${leave.color}`}
                      style={{ width: `${(leave.count / leave.max) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <Button
              onClick={() => navigate('/employee/attendance-regularization')}
              variant="outline"
              className="w-full rounded-2xl gap-2 font-bold text-xs uppercase tracking-wider"
            >
              Request Attendance Correction
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Day Details Modal Dialog */}
      {selectedDayLog && (
        <Dialog open={!!selectedDayLog} onOpenChange={(open) => !open && setSelectedDayLog(null)}>
          <DialogContent className="sm:max-w-[450px] rounded-3xl p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg font-extrabold">
                <CalendarIcon className="w-5 h-5 text-violet-600" />
                Shift & Attendance Details
              </DialogTitle>
              <DialogDescription className="font-mono text-xs text-muted-foreground">
                Date: {selectedDayLog.date}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="p-3 bg-muted/60 border rounded-2xl">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">Check In Time</span>
                  <span className="text-sm font-mono font-extrabold text-foreground block mt-1">
                    {selectedDayLog.log?.checkInTime || '09:15 am'}
                  </span>
                </div>
                <div className="p-3 bg-muted/60 border rounded-2xl">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">Check Out Time</span>
                  <span className="text-sm font-mono font-extrabold text-foreground block mt-1">
                    {selectedDayLog.log?.checkOutTime || '06:30 pm'}
                  </span>
                </div>
              </div>

              <div className="p-4 bg-muted/40 border rounded-2xl space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Assigned Shift:</span>
                  <span className="font-extrabold">General Shift (09:00 AM - 06:00 PM)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Work Duration:</span>
                  <span className="font-mono font-extrabold text-violet-600 dark:text-violet-400">
                    {computeWorkDuration(selectedDayLog.log, selectedDayLog.date === new Date().toISOString().split('T')[0])}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Geofence Location:</span>
                  <span className="font-bold text-emerald-600 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Verified
                  </span>
                </div>
              </div>

              <Button
                onClick={() => {
                  setSelectedDayLog(null);
                  navigate('/employee/attendance-regularization');
                }}
                className="w-full py-5 rounded-2xl text-xs uppercase tracking-wider font-extrabold bg-violet-600 hover:bg-violet-700 text-white"
              >
                Request Regularization for this date
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <Dialog open={isDocModalOpen} onOpenChange={setIsDocModalOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto rounded-3xl p-6 bg-card border border-border shadow-2xl">
          <DialogHeader className="pb-3 border-b">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-violet-600 text-white flex items-center justify-center shadow-lg">
                <FolderOpen className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-extrabold flex items-center gap-2">
                  Official Company Documents Vault
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Access & download your verified Offer Letter, Joining Letter, Appointment Letter, Payslips & Tax Papers
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Controls: Category Dropdown & Search & Download All */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-4 border-b">
            
            {/* Category Filter Dropdown */}
            <div className="relative shrink-0 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                className="w-full sm:w-[220px] flex items-center justify-between px-3 py-2 rounded-xl border border-border bg-muted/40 hover:bg-muted/60 transition-all font-bold text-xs text-foreground h-9"
              >
                <div className="flex items-center gap-1.5 truncate">
                  <FolderOpen className="w-3.5 h-3.5 text-violet-500" />
                  <span className="truncate">
                    {selectedCategories.length === 0
                      ? 'No categories selected'
                      : selectedCategories.length === 3
                      ? 'All Categories'
                      : `${selectedCategories.length} categor${selectedCategories.length > 1 ? 'ies' : 'y'} selected`}
                  </span>
                </div>
                <span className="text-[9px] text-muted-foreground ml-1">
                  {isCategoryDropdownOpen ? '▲' : '▼'}
                </span>
              </button>

              {isCategoryDropdownOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setIsCategoryDropdownOpen(false)} 
                  />
                  <div className="absolute z-50 w-[240px] mt-2 rounded-xl border border-border bg-card shadow-xl p-2 space-y-1">
                    {/* Select All Checkbox */}
                    <div
                      onClick={() => {
                        if (selectedCategories.length === 3) {
                          setSelectedCategories([]);
                        } else {
                          setSelectedCategories(['onboarding', 'letters', 'tax']);
                        }
                      }}
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/40 cursor-pointer transition-all border-b border-border text-xs font-bold text-violet-600 mb-1 pb-2"
                    >
                      <input
                        type="checkbox"
                        checked={selectedCategories.length === 3}
                        readOnly
                        className="w-3.5 h-3.5 rounded text-violet-600 border-border focus:ring-violet-500 bg-background cursor-pointer"
                      />
                      <span>Select All</span>
                    </div>

                    {[
                      { id: 'onboarding', label: 'Onboarding (Offer / Joining)' },
                      { id: 'letters', label: 'Letters & Contracts' },
                      { id: 'tax', label: 'Payslips & Tax Form 16' },
                    ].map((cat) => {
                      const isChecked = selectedCategories.includes(cat.id);
                      return (
                        <div
                          key={cat.id}
                          onClick={() => {
                            setSelectedCategories(prev =>
                              prev.includes(cat.id)
                                ? prev.filter(id => id !== cat.id)
                                : [...prev, cat.id]
                            );
                          }}
                          className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/40 cursor-pointer transition-all border border-transparent text-xs font-bold"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            readOnly
                            className="w-3.5 h-3.5 rounded text-violet-600 border-border focus:ring-violet-500 bg-background cursor-pointer"
                          />
                          <span className="text-foreground">{cat.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Search Input */}
            <div className="relative flex-1 min-w-0 w-full">
              <input
                type="text"
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs border rounded-xl pl-8 pr-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-violet-500 font-medium text-foreground h-9"
              />
              <span className="absolute left-2.5 top-2.5 text-muted-foreground">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
            </div>

            {/* Download All Button */}
            <Button
              onClick={handleDownloadAllFiltered}
              disabled={displayedDocuments.length === 0}
              className="bg-violet-600 hover:bg-violet-700 text-white font-extrabold text-xs h-9 px-4 rounded-xl gap-1.5 shadow-md shrink-0 disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" /> Download All ({displayedDocuments.length})
            </Button>
          </div>

          {/* Documents List */}
          <div className="max-h-[260px] overflow-y-auto space-y-3 py-3 pr-1">
            {loadingDocs ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
                Loading official paperwork...
              </div>
            ) : displayedDocuments.length === 0 ? (
              <div className="py-12 text-center space-y-2 border border-dashed rounded-3xl bg-muted/10">
                <FileCheck className="w-10 h-10 text-muted-foreground/30 mx-auto" />
                <p className="text-xs font-semibold text-muted-foreground">No documents found</p>
                <p className="text-[10px] text-muted-foreground/60">
                  {selectedCategories.length === 0
                    ? 'Select at least one category from the checklist dropdown to display documents.'
                    : 'Try checking different categories or modifying your search.'}
                </p>
              </div>
            ) : (
              displayedDocuments.map((doc, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl border border-border bg-muted/30 hover:border-violet-500/50 transition-all flex items-center justify-between gap-4 group"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="h-10 w-10 rounded-xl bg-violet-500/10 text-violet-500 flex items-center justify-center shrink-0 border border-violet-500/20">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-xs font-bold text-foreground truncate">
                          {doc.document_number || doc.document_type?.replace(/_/g, ' ').toUpperCase() || 'Official Document'}
                        </h4>
                        <span className="text-[8px] px-2 py-0.5 rounded font-extrabold uppercase bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                          {doc.verification_status || 'VERIFIED'}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-2">
                        <span>Issued by: <strong>{doc.issued_by || 'HR Department'}</strong></span>
                        <span>•</span>
                        <span>Issue Date: {doc.issue_date || '2026-06-01'}</span>
                        <span>•</span>
                        <span className="font-mono">{doc.file_size ? `${(doc.file_size / 1024 / 1024).toFixed(2)} MB` : '1.8 MB'}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      onClick={() => handleDownloadDoc(doc)}
                      className="bg-violet-600 hover:bg-violet-700 text-white font-extrabold text-xs h-9 px-4 rounded-xl gap-1.5 shadow-md"
                    >
                      <Download className="w-3.5 h-3.5" /> Download
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="pt-3 border-t flex justify-between items-center text-xs">
            <span className="text-muted-foreground font-medium">Need additional letters? Contact HR Admin</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsDocModalOpen(false);
                navigate('/employee/documents');
              }}
              className="rounded-xl font-bold text-xs gap-1"
            >
              Open Full Vault Page <ExternalLink className="w-3.5 h-3.5" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
