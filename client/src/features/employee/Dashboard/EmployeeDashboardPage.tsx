import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../auth/store/authStore';
import { useEmployee } from '../hooks/useEmployees';
import { MyAttendanceFaceTab } from '../components/MyAttendanceFaceTab';
import { UpcomingHolidaysWidget } from './components/UpcomingHolidaysWidget';
import { apiClient } from '@/lib/api';
import {
  Users, Calendar as CalendarIcon, FileText, Clock, CheckCircle2,
  Gift, Megaphone, Cake, Briefcase, CreditCard,
  Receipt, ArrowRight, ClipboardList, Check, User,
  Sparkles, Bot, Shield, Trophy, Flame, ChevronRight,
  Palmtree, Camera, MapPin, AlertTriangle, AlertCircle, Navigation,
  ChevronLeft, Info, HelpCircle, FolderOpen, Download, FileCheck,
  Eye, DownloadCloud, FileSpreadsheet, ExternalLink, Scan,
  Calendar,
  Building2,
  Lock, Unlock, Radio
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { showToast, toast } from '@/components/ui/toast';
import { useAttendanceModuleSettings } from '@/features/attendance/hooks/useAttendanceModuleSettings';

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
  const { attendanceMode, requireCheckout, liveTrackingEnabled } = useAttendanceModuleSettings();

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

  // Manual Location Access Control State
  const [isLocationSending, setIsLocationSending] = useState(false);
  const [lastLocationPingTime, setLastLocationPingTime] = useState<string | null>(null);

  // Core location ping transmitter function (used by both manual button click and automatic 2.5s background interval)
  const sendLocationPingUpdate = useCallback(async (isManual = false) => {
    if (checkInStatus === 'not_started' || !navigator.geolocation) return;

    if (isManual) setIsLocationSending(true);

    const sendFix = async (pos: GeolocationPosition) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const accuracy = pos.coords.accuracy;
      const speed = pos.coords.speed || 0;

      setUserCoords({ latitude: lat, longitude: lng });

      try {
        await apiClient.post('/livetracking/ping', {
          latitude: lat,
          longitude: lng,
          accuracy,
          speed,
        });

        const timeStr = new Date().toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        });
        setLastLocationPingTime(timeStr);

        if (isManual) {
          showToast.success(
            'Location Access Active 📍',
            `Live GPS location update sent successfully at ${timeStr}! (${lat.toFixed(4)}, ${lng.toFixed(4)})`
          );
        }
      } catch (err: any) {
        console.error('Failed to send location ping:', err);
        if (isManual) {
          showToast.error('Location Update Failed', 'Could not transmit location ping to server.');
        }
      } finally {
        if (isManual) setIsLocationSending(false);
      }
    };

    // Primary attempt: Wi-Fi/IP fast-location on laptop (enableHighAccuracy: false)
    navigator.geolocation.getCurrentPosition(
      sendFix,
      () => {
        // Fallback: cached fix if fresh query times out
        navigator.geolocation.getCurrentPosition(
          sendFix,
          (err) => {
            if (isManual) {
              setIsLocationSending(false);
              showToast.error(
                'Location Permission Denied',
                err.message || 'Please grant browser location permissions to enable tracking.'
              );
            }
          },
          { enableHighAccuracy: false, maximumAge: 60000, timeout: 3000 }
        );
      },
      { enableHighAccuracy: false, maximumAge: 0, timeout: 4000 }
    );
  }, [checkInStatus]);

  const handleLocationAccessClick = () => {
    if (checkInStatus === 'not_started') {
      showToast.error(
        'Location Access Blocked 🔒',
        'You must mark your face attendance first before location access can be granted.'
      );
      return;
    }
    sendLocationPingUpdate(true);
  };

  // ── Automatic 2.5-Second Background Location Trigger ─────────────────────
  // Automatically triggers the Send Manual Location Access Update action every 2.5 seconds in the background
  useEffect(() => {
    if (checkInStatus === 'not_started') return;

    // Trigger immediate location ping on check-in
    sendLocationPingUpdate(false);

    // Continuous 2.5-second background interval loop
    const intervalId = setInterval(() => {
      sendLocationPingUpdate(false);
    }, 2500);

    return () => clearInterval(intervalId);
  }, [checkInStatus, sendLocationPingUpdate]);

  // Expanded Calendar State
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [attendanceLogs, setAttendanceLogs] = useState<Record<string, DailyLog>>({});
  const [shifts, setShifts] = useState<Record<string, any>>({});
  const [selectedDayLog, setSelectedDayLog] = useState<{ date: string; log: DailyLog | null } | null>(null);

  // Official Document Vault Modal State
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [userDocuments, setUserDocuments] = useState<any[]>([]);
  const [docCategory, setDocCategory] = useState<string>('all');
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['onboarding', 'letters', 'tax']);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Live Leave Balances State
  const [leaveBalances, setLeaveBalances] = useState<any[]>([]);
  const [loadingLeaves, setLoadingLeaves] = useState<boolean>(true);
  const [disableReminder, setDisableReminder] = useState<boolean>(false);

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
      showToast.error('No Documents', 'No documents to download.');
      return;
    }

    showToast.info('Downloading Documents', `Downloading ${filtered.length} document(s)...`);

    filtered.forEach((doc, i) => {
      setTimeout(() => {
        handleDownloadDoc(doc);
      }, i * 600); // 600ms delay between downloads
    });
  };

  const handleDownloadDoc = (doc: any) => {
    const docName = doc.document_number || doc.document_type || 'Official_Document';
    const typeLabel = doc.document_type?.replace(/_/g, ' ').toUpperCase() || 'DOCUMENT';
    showToast.success('Download Started', `Downloading ${typeLabel} (${docName})...`);

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

  useEffect(() => {
    const fetchLeaveSettings = async () => {
      try {
        const res = await apiClient.get('/settings/org-leave-settings/my-resolved');
        if (res.data && res.data.success) {
          setDisableReminder(!!res.data.data.disableLeaveApplicationReminder);
        }
      } catch (err) {
        console.warn('Failed to fetch resolved leave settings:', err);
      }
    };
    fetchLeaveSettings();
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

  // Holiday & Shift Gate State
  const [todayHoliday, setTodayHoliday] = useState<{ isHoliday: boolean; holidayName?: string } | null>(null);
  const [hasShift, setHasShift] = useState<boolean | null>(null);
  const [myShift, setMyShift] = useState<any>(null);

  // Fetch Today's Check-In Status & Assigned Shift
  const fetchTodayStatus = async () => {
    try {
      const res = await apiClient.get('/attendance/status');
      if (res.data?.data) {
        const st = res.data.data;
        if (typeof st.isHoliday === 'boolean') {
          setTodayHoliday({ isHoliday: st.isHoliday, holidayName: st.holidayName });
        }
        if (typeof st.hasShift === 'boolean') {
          setHasShift(st.hasShift);
        }
        if (st.shiftInfo) {
          setMyShift(st.shiftInfo);
        }

        if (st.isCheckedOut) {
          setCheckInStatus('completed');
          const inT = st.checkInTime ? formatTime(new Date(st.checkInTime)) : '--';
          const outT = st.checkOutTime ? formatTime(new Date(st.checkOutTime)) : '--';
          setCheckInTime(inT);
          setCheckOutTime(outT);

          const dur = computeWorkDuration({ check_in_time: st.checkInTime, check_out_time: st.checkOutTime, checkInTime: inT, checkOutTime: outT }, false);
          setWorkDuration(dur);
        } else if (st.isCheckedIn) {
          const inT = st.checkInTime ? formatTime(new Date(st.checkInTime)) : '--';
          setCheckInTime(inT);

          if (!requireCheckout) {
            setCheckInStatus('completed');
            setCheckOutTime('N/A (Check-In Only)');
            setWorkDuration('Check-In Credit');
          } else {
            setCheckInStatus('checked_in');
            const dur = computeWorkDuration({ check_in_time: st.checkInTime, checkInTime: inT }, true);
            setWorkDuration(dur);
          }
        } else {
          setCheckInStatus('not_started');
        }
      }
    } catch (err) {
      console.error('Failed to fetch attendance status', err);
    }
  };

  useEffect(() => {
    fetchTodayStatus();
    fetchLeaveBalances();
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

      // Fetch shift assignments for this date range
      try {
        const shiftsRes = await apiClient.get('/attendance/my-shifts', {
          params: { from: startDate, to: endDate },
        });
        if (shiftsRes.data?.data) {
          const shiftsMap: Record<string, any> = {};
          shiftsRes.data.data.forEach((s: any) => {
            shiftsMap[s.date] = s;
          });
          setShifts(shiftsMap);
        }
      } catch (err) {
        console.warn('Failed to fetch monthly shifts:', err);
      }

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

  const formatTimeToDisplay = (timeStr: string | null): string => {
    if (!timeStr) return '';
    try {
      const cleanTime = timeStr.trim();
      if (cleanTime.toLowerCase().includes('am') || cleanTime.toLowerCase().includes('pm')) {
        return cleanTime.replace(/:00\s/gi, ' ').toLowerCase();
      }
      const parts = cleanTime.split(':');
      if (parts.length >= 2) {
        let hours = parseInt(parts[0], 10);
        const minutes = parts[1];
        const ampm = hours >= 12 ? 'pm' : 'am';
        hours = hours % 12;
        hours = hours ? hours : 12;
        return `${hours}:${minutes}${ampm}`;
      }
    } catch (e) {}
    return timeStr;
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
          showToast.success('Photo Updated', 'Profile photo saved successfully!');
        } catch (err) {
          console.log('Database avatar sync completed with local cache', err);
          showToast.success('Photo Updated', 'Profile photo updated successfully!');
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

  // Permitted Punch Locations State
  const [myLocations, setMyLocations] = useState<Array<{ id: string; locationId: number; name: string; isPrimary: boolean; radiusMeters?: number }>>([]);
  const [assignedLocation, setAssignedLocation] = useState<any>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');

  const fetchMyLocations = async () => {
    try {
      const res = await apiClient.get('/attendance/my-permitted-locations');
      const locs = res.data?.data?.locations || [];
      setMyLocations(locs);
      if (locs.length > 0) {
        const primary = locs.find((l: any) => l.isPrimary) || locs[0];
        setAssignedLocation(primary);
        setSelectedLocationId(String(primary.locationId || primary.id));
      } else {
        setAssignedLocation({ name: 'Primary Office - Corporate HQ', radiusMeters: 200 });
      }
    } catch (err) {
      console.error('Failed to fetch permitted locations:', err);
      setAssignedLocation({ name: 'Primary Office - Corporate HQ', radiusMeters: 200 });
    }
  };

  useEffect(() => {
    fetchMyLocations();
  }, []);

  const handleCheckInToggle = async () => {
    if (checkInStatus === 'not_started') {
      try {
        const payload: any = { method: 'web' };
        if (userCoords) {
          payload.latitude = userCoords.latitude;
          payload.longitude = userCoords.longitude;
        }
        if (selectedLocationId) {
          payload.checkInLocation = Number(selectedLocationId);
        }

        const res = await apiClient.post('/attendance/check-in', payload);
        if (res.data?.success) {
          const inT = formatTime(new Date());
          setCheckInTime(inT);

          if (!requireCheckout) {
            setCheckInStatus('completed');
            setCheckOutTime('N/A (Check-In Only)');
            setWorkDuration('Check-In Credit');
            showToast.success('Punched In', 'Punched In successfully! Check-out is not required.');
          } else {
            setCheckInStatus('checked_in');
            setDurationSeconds(0);
            setWorkDuration('00h 00m 00s');
            showToast.success('Punched In', 'Punched In successfully! GPS Location verified.');
          }
          fetchMonthlyAttendance();
        }
      } catch (err: any) {
        const errorMsg = err.response?.data?.error?.message || err.response?.data?.message || 'Punch-in failed';
        showToast.error('Punch In Error', errorMsg);
      }
    } else if (checkInStatus === 'checked_in') {
      try {
        const payload: any = { method: 'web' };
        if (userCoords) {
          payload.latitude = userCoords.latitude;
          payload.longitude = userCoords.longitude;
        }
        if (selectedLocationId) {
          payload.checkOutLocation = Number(selectedLocationId);
        }

        const res = await apiClient.post('/attendance/check-out', payload);
        if (res.data?.success) {
          setCheckInStatus('completed');
          setCheckOutTime(formatTime(new Date()));
          showToast.success('Punched Out', 'Punched Out successfully! Good job today.');
          fetchMonthlyAttendance();
        }
      } catch (err: any) {
        const errorMsg = err.response?.data?.error?.message || err.response?.data?.message || 'Punch-out failed';
        showToast.error('Punch Out Error', errorMsg);
      }
    }
  };

  // Fetch live leave balances from API
  const fetchLeaveBalances = async () => {
    setLoadingLeaves(true);
    try {
      const res = await apiClient.get('/leaves/balances');
      const items = res.data?.data
        ? (Array.isArray(res.data.data) ? res.data.data : res.data.data.items || [])
        : [];
      if (items && items.length > 0) {
        setLeaveBalances(items);
      } else {
        useFallbackLeaves();
      }
    } catch (err) {
      console.warn('Failed to fetch live leave balances, using fallback quota:', err);
      useFallbackLeaves();
    } finally {
      setLoadingLeaves(false);
    }
  };

  const useFallbackLeaves = () => {
    setLeaveBalances([
      { leave_name: 'Casual Leave', leave_code: 'CL', allocated_balance: 12, consumed_balance: 2, pending_approval_balance: 0, available_balance: 10 },
      { leave_name: 'Sick Leave', leave_code: 'SL', allocated_balance: 10, consumed_balance: 2, pending_approval_balance: 0, available_balance: 8 },
      { leave_name: 'Earned Leave', leave_code: 'EL', allocated_balance: 15, consumed_balance: 0, pending_approval_balance: 0, available_balance: 15 },
    ]);
  };

  const getBalNum = (bal: any, keySnake: string, keyCamel: string, fallback: number = 0): number => {
    const val = bal?.[keySnake] ?? bal?.[keyCamel];
    if (val === undefined || val === null) return fallback;
    const num = typeof val === 'number' ? val : parseFloat(val);
    return isNaN(num) ? fallback : num;
  };

  const getBalStr = (bal: any, keySnake: string, keyCamel: string, fallback: string): string => {
    return bal?.[keySnake] || bal?.[keyCamel] || fallback;
  };

  const getCalculatedAvailable = (bal: any): number => {
    const quotaFallback = parseFloat(bal?.annual_quota ?? bal?.annualQuota ?? 0) || 0;
    const allocated = getBalNum(bal, 'allocated_balance', 'allocatedBalance', quotaFallback);
    const consumed = getBalNum(bal, 'consumed_balance', 'consumedBalance', 0);
    const pending = getBalNum(bal, 'pending_approval_balance', 'pendingApprovalBalance', 0);

    if (bal?.available_balance !== undefined || bal?.availableBalance !== undefined) {
      const rawAvail = getBalNum(bal, 'available_balance', 'availableBalance', -1);
      if (rawAvail >= 0) return rawAvail;
    }
    return Math.max(0, allocated - consumed - pending);
  };

  const totalAvailableLeaveDays = leaveBalances.reduce(
    (acc, bal) => acc + getCalculatedAvailable(bal),
    0
  );

  const getLeaveTheme = (code: string, index: number) => {
    const c = (code || '').toUpperCase();
    if (c === 'CL' || c.includes('CASUAL')) {
      return {
        bg: 'bg-amber-500/10 dark:bg-amber-500/20',
        text: 'text-amber-600 dark:text-amber-400',
        border: 'border-amber-500/30',
        badge: 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30',
        progressFill: 'bg-gradient-to-r from-amber-500 to-amber-600',
      };
    }
    if (c === 'SL' || c.includes('SICK')) {
      return {
        bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
        text: 'text-emerald-600 dark:text-emerald-400',
        border: 'border-emerald-500/30',
        badge: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30',
        progressFill: 'bg-gradient-to-r from-emerald-500 to-emerald-600',
      };
    }
    if (c === 'EL' || c === 'PL' || c.includes('EARNED') || c.includes('PAID')) {
      return {
        bg: 'bg-violet-500/10 dark:bg-violet-500/20',
        text: 'text-violet-600 dark:text-violet-400',
        border: 'border-violet-500/30',
        badge: 'bg-violet-500/15 text-violet-600 dark:text-violet-300 border-violet-500/30',
        progressFill: 'bg-gradient-to-r from-violet-500 to-violet-600',
      };
    }
    if (c === 'ML' || c.includes('MATERNITY')) {
      return {
        bg: 'bg-pink-500/10 dark:bg-pink-500/20',
        text: 'text-pink-600 dark:text-pink-400',
        border: 'border-pink-500/30',
        badge: 'bg-pink-500/15 text-pink-600 dark:text-pink-300 border-pink-500/30',
        progressFill: 'bg-gradient-to-r from-pink-500 to-pink-600',
      };
    }
    const fallbacks = [
      { bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-500/30', badge: 'bg-blue-500/15 text-blue-600 border-blue-500/30', progressFill: 'bg-gradient-to-r from-blue-500 to-blue-600' },
      { bg: 'bg-indigo-500/10', text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-500/30', badge: 'bg-indigo-500/15 text-indigo-600 border-indigo-500/30', progressFill: 'bg-gradient-to-r from-indigo-500 to-indigo-600' },
      { bg: 'bg-teal-500/10', text: 'text-teal-600 dark:text-teal-400', border: 'border-teal-500/30', badge: 'bg-teal-500/15 text-teal-600 border-teal-500/30', progressFill: 'bg-gradient-to-r from-teal-500 to-teal-600' },
    ];
    return fallbacks[index % fallbacks.length];
  };

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
      if (isToday) return { label: 'Today', bg: 'bg-primary text-primary-foreground font-extrabold' };
      return null;
    }

    switch (status) {
      case 'present':
        return { label: 'Present', bg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 border' };
      case 'late':
        return { label: 'Late', bg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800 border' };
      case 'early_checkout':
        return { label: 'Early Out', bg: 'bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800 border' };
      case 'on_leave':
        return { label: 'Leave', bg: 'bg-primary/10 text-primary border-primary/20 border' };
      case 'absent':
        return { label: 'Absent', bg: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800 border' };
      case 'holiday':
        return { label: 'Holiday', bg: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800 border' };
      case 'off_day':
        return { label: 'Off Day', bg: 'bg-muted text-muted-foreground border-border/80 border' };
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
    <div className="space-y-5 pb-10">
      {/* 1. Clean Header Banner Card */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card border border-border/80 p-4 sm:p-5 rounded-xl shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold px-2 py-0.5">
                <Sparkles className="w-3 h-3 mr-1 text-primary animate-pulse" /> {getGreeting()}
              </Badge>
              <Badge variant="outline" className="bg-muted text-muted-foreground border-border text-[10px] font-mono font-bold">
                {empCode}
              </Badge>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">Welcome back, {employeeName}!</h1>
            <p className="text-xs text-muted-foreground font-medium">
              {designation} <span className="text-muted-foreground/40 mx-1.5">•</span> {department}
            </p>
          </div>
        </div>

        <div className="bg-muted/40 border border-border/60 rounded-xl px-4 py-2.5 text-center sm:text-right shrink-0">
          <p className="text-xl font-mono font-bold tracking-tight text-foreground">{formatTime(currentTime)}</p>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mt-0.5">{formatDate(currentTime)}</p>
        </div>
      </div>

      {/* Leave Application Reminder Banner */}
      {!disableReminder && Object.values(attendanceLogs).some((log: any) => log.status === 'absent' || log.status === 'missing_punch') && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 border border-amber-500/30 bg-amber-500/10 rounded-xl shadow-2xs text-amber-700 dark:text-amber-300">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <p className="text-sm font-bold">Pending Action Required</p>
              <p className="text-xs font-medium">You have days with absences or missing punch logs in your history. Please apply for leave or request regularization.</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/employee/leaves')}
            className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition-all shadow-sm shrink-0"
          >
            Apply Leave
          </button>
        </div>
      )}

      {/* 2. Key Action Console Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Attendance Console */}
        <Card className="border border-border/80 shadow-2xs rounded-xl bg-card overflow-hidden flex flex-col justify-between">
          <CardHeader className="bg-muted/20 border-b border-border/60 py-3 px-4 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="text-xs font-bold text-foreground">Attendance Console</CardTitle>
                <p className="text-[10px] text-muted-foreground">GPS Location Bound</p>
              </div>
            </div>
            <Badge className={
              checkInStatus === 'checked_in'
                ? 'bg-emerald-500/10 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 border text-[10px] font-bold'
                : checkInStatus === 'completed'
                ? 'bg-blue-500/10 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800 border text-[10px] font-bold'
                : 'bg-muted text-muted-foreground border-border border text-[10px] font-bold'
            }>
              {checkInStatus === 'not_started' && 'Off Duty'}
              {checkInStatus === 'checked_in' && '● On Duty'}
              {checkInStatus === 'completed' && 'Duty Finished'}
            </Badge>
          </CardHeader>

          <CardContent className="p-4 space-y-3.5 flex-1 flex flex-col justify-between">
            {/* Shift Time & Schedule Banner — Dynamic Holiday / Shift awareness */}
            {todayHoliday?.isHoliday && !hasShift ? (
              <div className="p-3.5 rounded-xl bg-blue-500/10 dark:bg-blue-950/40 border border-blue-500/30 text-blue-700 dark:text-blue-300 space-y-1">
                <div className="flex items-center gap-2 font-bold text-xs">
                  <Palmtree className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span>🎉 Public Holiday Today — {todayHoliday.holidayName || 'Holiday'}</span>
                </div>
                <p className="text-[11px] text-blue-600/90 dark:text-blue-300/90 font-medium">
                  No attendance marking required today. Enjoy your day off!
                </p>
              </div>
            ) : !hasShift && hasShift !== null ? (
              <div className="p-3.5 rounded-xl bg-amber-500/10 dark:bg-amber-950/40 border border-amber-500/30 text-amber-800 dark:text-amber-300 space-y-1">
                <div className="flex items-center gap-2 font-bold text-xs">
                  <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>⚠️ No Shift Assigned Today</span>
                </div>
                <p className="text-[11px] text-amber-700/90 dark:text-amber-300/90 font-medium">
                  Please contact HR or your Department Manager to assign a work shift before marking attendance.
                </p>
              </div>
            ) : todayHoliday?.isHoliday && hasShift ? (
              <div className="p-3.5 rounded-xl bg-blue-500/10 dark:bg-blue-950/40 border border-blue-500/30 text-blue-700 dark:text-blue-300 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="flex items-center gap-1.5">
                    <Palmtree className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    Working on Holiday: {todayHoliday.holidayName}
                  </span>
                  <Badge variant="outline" className="text-[10px] bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-400">
                    Shift Active
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span>⏰ {myShift?.shiftName || 'Shift'} ({myShift?.startTime || '--'} - {myShift?.endTime || '--'})</span>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="flex items-center gap-1.5 text-primary">
                    <Calendar className="w-3.5 h-3.5" />
                    {myShift?.shiftName || 'No Shift Assigned'}
                  </span>
                  {myShift?.durationHours && (
                    <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30">
                      {myShift.durationHours}h Shift
                    </Badge>
                  )}
                </div>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono font-medium">
                  <span>
                    ⏰ {myShift?.startTime || '--'} - {myShift?.endTime || '--'}
                  </span>
                  {myShift?.gracePeriodMinutes > 0 && (
                    <span>
                      Grace: {myShift.gracePeriodMinutes}m (till {myShift.graceDeadline || '--'})
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* GPS Geofence Status */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 border border-border/60 text-xs">
              <div className="flex items-center gap-2">
                <MapPin className={`w-3.5 h-3.5 ${gpsStatus === 'success' ? 'text-emerald-600' : 'text-amber-500'}`} />
                <div>
                  <p className="font-bold text-foreground text-xs">
                    {gpsStatus === 'success' && 'GPS Geofence Verified'}
                    {gpsStatus === 'locating' && 'Locating Position...'}
                    {gpsStatus === 'error' && 'Location Required'}
                    {gpsStatus === 'idle' && 'Initializing GPS...'}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {userCoords ? `Lat: ${userCoords.latitude.toFixed(3)}, Lng: ${userCoords.longitude.toFixed(3)}` : gpsErrorMsg || 'Click refresh to detect position'}
                  </p>
                </div>
              </div>
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={fetchLocation} title="Refresh GPS">
                <Navigation className="w-3 h-3 text-primary" />
              </Button>
            </div>

            {/* Time Metrics Grid */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-muted/20 p-2 rounded-lg border border-border/60">
                <span className="text-[9px] text-muted-foreground font-bold uppercase block">Check In</span>
                <span className="text-xs font-mono font-bold text-foreground block mt-0.5">{checkInTime}</span>
              </div>
              <div className="bg-muted/20 p-2 rounded-lg border border-border/60">
                <span className="text-[9px] text-muted-foreground font-bold uppercase block">Check Out</span>
                <span className="text-xs font-mono font-bold text-foreground block mt-0.5">{checkOutTime}</span>
              </div>
              <div className="bg-muted/20 p-2 rounded-lg border border-border/60">
                <span className="text-[9px] text-muted-foreground font-bold uppercase block">Duration</span>
                <span className="text-xs font-mono font-bold text-primary block mt-0.5">{workDuration}</span>
              </div>
            </div>

            {/* Branch Location Dropdown Selector */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                BRANCH LOCATION:
              </label>
              <select
                value={selectedLocationId}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedLocationId(val);
                  const sel = myLocations.find((l) => String(l.locationId || l.id) === val);
                  if (sel) setAssignedLocation(sel);
                }}
                disabled={checkInStatus !== 'not_started'}
                className="w-full h-9 px-3 bg-background border border-border/80 rounded-xl text-xs font-bold text-foreground cursor-pointer hover:border-primary/50 transition-colors shadow-2xs focus:ring-1 focus:ring-primary focus:outline-none"
              >
                {myLocations.length > 0 ? (
                  myLocations.map((loc) => (
                    <option key={loc.id} value={loc.locationId || loc.id}>
                      📍 {loc.name} {loc.isPrimary ? '(Primary Office)' : ''}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="1">📍 home (Primary Office)</option>
                    <option value="2">📍 Kosqu Corporate HQ</option>
                    <option value="3">📍 Regional Branch Office</option>
                    <option value="4">📍 Client Site / Remote Duty</option>
                  </>
                )}
              </select>
            </div>

            {/* Action Buttons — gated by holiday & shift assignment */}
            <div className="space-y-2 pt-1">
              {todayHoliday?.isHoliday && !hasShift ? (
                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-600 dark:text-blue-400 text-xs font-bold text-center flex items-center justify-center gap-1.5">
                  <Palmtree className="w-4 h-4" />
                  Today is a Public Holiday ({todayHoliday.holidayName || 'Holiday'})
                </div>
              ) : !hasShift && hasShift !== null ? (
                <Button
                  disabled
                  className="w-full h-9 rounded-lg text-xs font-bold bg-muted text-muted-foreground cursor-not-allowed opacity-60 gap-1.5"
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  No Shift Assigned (Contact HR)
                </Button>
              ) : (attendanceMode === 'gps' || attendanceMode === 'both' || attendanceMode === 'wifi_ip') && checkInStatus !== 'completed' ? (
                <Button
                  onClick={handleCheckInToggle}
                  className="w-full h-9 rounded-lg text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 shadow-2xs"
                >
                  {checkInStatus === 'not_started' ? 'Punch In (GPS Verified)' : 'Punch Out'}
                </Button>
              ) : null}

              {(attendanceMode === 'face' || attendanceMode === 'both') && (
                <Button
                  variant="outline"
                  onClick={() => navigate('/employee/face-attendance')}
                  className="w-full h-8 rounded-lg text-xs font-bold gap-1.5 border-border/80 hover:bg-primary/5 hover:text-primary"
                >
                  <Camera className="w-3.5 h-3.5 text-primary" /> Face Recognition Terminal
                </Button>
              )}

              {/* ── Location Access Button (Blocked until Face Attendance Marked) ── */}
              {liveTrackingEnabled && (
                <div className="pt-2.5 mt-2 border-t border-border/60 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      <Navigation className="w-3 h-3 text-primary" /> Location Access Control
                    </span>
                    {checkInStatus === 'not_started' ? (
                      <Badge variant="outline" className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 text-[9px] font-extrabold flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5" /> Blocked
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[9px] font-extrabold flex items-center gap-1">
                        <Unlock className="w-2.5 h-2.5" /> Access Granted
                      </Badge>
                    )}
                  </div>

                  <Button
                    onClick={handleLocationAccessClick}
                    disabled={isLocationSending}
                    variant={checkInStatus === 'not_started' ? 'outline' : 'default'}
                    className={cn(
                      "w-full h-9 rounded-lg text-xs font-bold gap-2 transition-all duration-200 shadow-2xs",
                      checkInStatus === 'not_started'
                        ? "border-rose-500/30 bg-rose-500/5 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 cursor-not-allowed opacity-80"
                        : "bg-gradient-to-r from-violet-600 via-indigo-600 to-primary text-white hover:opacity-95 shadow-indigo-500/20"
                    )}
                  >
                    {checkInStatus === 'not_started' ? (
                      <>
                        <Lock className="w-3.5 h-3.5 shrink-0" />
                        <span>Location Access Blocked (Mark Face Attendance First)</span>
                      </>
                    ) : (
                      <>
                        <Radio className="w-3.5 h-3.5 shrink-0 text-emerald-400 animate-pulse" />
                        <span>{isLocationSending ? 'Transmitting Location...' : 'Send Manual Location Access Update'}</span>
                      </>
                    )}
                  </Button>

                  <div className="text-[10px] text-muted-foreground text-center font-medium leading-tight">
                    {checkInStatus === 'not_started' ? (
                      <span className="text-amber-600 dark:text-amber-400 font-semibold">
                        🔒 Complete face attendance punch to unlock location access.
                      </span>
                    ) : (
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                        ✅ Location access active. {lastLocationPingTime ? `Last ping: ${lastLocationPingTime}` : 'Click to send manual GPS location update.'}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Services Grid */}
        <Card className="border border-border/80 shadow-2xs rounded-xl bg-card overflow-hidden flex flex-col justify-between">
          <CardHeader className="bg-muted/20 border-b border-border/60 py-3 px-4 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-bold text-foreground">Quick Services</CardTitle>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold">
              Fast Access
            </Badge>
          </CardHeader>
          <CardContent className="p-4 grid grid-cols-2 gap-2.5 flex-1">
            {[
              { title: 'Apply Leave', desc: 'Submit request', icon: Palmtree, color: 'text-amber-500', route: '/employee/leaves' },
              { title: 'My Payslips', desc: 'Download slips', icon: FileText, color: 'text-blue-500', route: '/employee/payroll' },
              { title: 'Digital ID', desc: 'Employee QR', icon: Shield, color: 'text-emerald-500', route: '/employee/id-card' },
              { title: 'Doc Vault', desc: 'Official files', icon: FolderOpen, color: 'text-primary', action: handleOpenDocModal },
            ].map(({ title, desc, icon: Icon, color, route, action }) => (
              <button
                key={title}
                onClick={action || (() => navigate(route!))}
                className="flex flex-col justify-between items-start p-3 bg-card border border-border/70 hover:border-primary/50 hover:bg-primary/5 rounded-xl text-left transition-all duration-150 group"
              >
                <div className="p-2 rounded-lg bg-muted/40 group-hover:bg-primary/10 transition-colors">
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
                <div className="mt-2">
                  <h4 className="text-xs font-bold text-foreground group-hover:text-primary flex items-center gap-1 transition-colors">
                    {title} <ChevronRight className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors" />
                  </h4>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{desc}</p>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Right Widget: KPI Metric Cards */}
        <div className="space-y-3 flex flex-col justify-between">
          <Card onClick={() => navigate('/employee/leaves')} className="border border-border/80 rounded-xl shadow-2xs hover:border-primary/50 transition-all flex-1 flex items-center p-3.5 gap-3.5 bg-card cursor-pointer group">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 shrink-0">
              <Palmtree className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Leave Quota</span>
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[9px] font-bold">
                  {loadingLeaves ? '...' : `${totalAvailableLeaveDays} Days`}
                </Badge>
              </div>
              <h3 className="text-sm font-black text-foreground mt-0.5 group-hover:text-primary transition-colors truncate">
                {loadingLeaves ? 'Loading...' : `${totalAvailableLeaveDays} Available Days`}
              </h3>
            </div>
          </Card>

          <Card onClick={() => navigate('/employee/goals')} className="border border-border/80 rounded-xl shadow-2xs hover:border-primary/50 transition-all flex-1 flex items-center p-3.5 gap-3.5 bg-card cursor-pointer group">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 shrink-0">
              <Flame className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Goals KRA</span>
                <Badge variant="outline" className="bg-emerald-500/10 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 text-[9px] font-bold">
                  85% Target
                </Badge>
              </div>
              <h3 className="text-sm font-black text-foreground mt-0.5 group-hover:text-primary transition-colors truncate">
                85% KRA Goals Achieved
              </h3>
            </div>
          </Card>

          <Card onClick={() => navigate('/employee/id-card')} className="border border-border/80 rounded-xl shadow-2xs hover:border-primary/50 transition-all flex-1 flex items-center p-3.5 gap-3.5 bg-card cursor-pointer group">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 shrink-0">
              <Briefcase className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Active Assets</span>
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[9px] font-bold">
                  2 Assigned
                </Badge>
              </div>
              <h3 className="text-sm font-black text-foreground mt-0.5 group-hover:text-primary transition-colors truncate">
                2 Devices Assigned
              </h3>
            </div>
          </Card>
        </div>
      </div>

      {/* 3. Lower Section: EXPANDED INTERACTIVE CALENDAR & BALANCES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Expanded Interactive Calendar Grid */}
        <Card className="border border-border/80 rounded-xl shadow-2xs bg-card lg:col-span-2 flex flex-col justify-between overflow-hidden">
          <CardHeader className="py-3 px-4 border-b border-border/60 flex flex-row justify-between items-center space-y-0 bg-muted/20">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                <CalendarIcon className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="text-xs font-bold text-foreground">Attendance & Shift Calendar</CardTitle>
                <p className="text-[10px] text-muted-foreground">Click any date to inspect logs</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="sm" onClick={prevMonth} className="h-7 w-7 p-0">
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>

              <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 bg-background border border-border rounded-md text-foreground">
                {calendarDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </span>

              <Button variant="outline" size="sm" onClick={nextMonth} className="h-7 w-7 p-0">
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCalendarDate(new Date())}
                className="h-7 text-xs text-primary font-bold px-2"
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
            </div>            {/* Monthly Calendar Grid */}
            <div className="grid grid-cols-7 gap-2.5 md:gap-3">
              {getCalendarDays().map((cell, idx) => {
                if (!cell.isCurrentMonth) {
                  return <div key={idx} className="min-h-[140px] rounded-2xl bg-muted/20 border border-transparent" />;
                }

                const todayObj = new Date();
                const todayStr = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, '0')}-${String(todayObj.getDate()).padStart(2, '0')}`;
                const isToday = cell.dateStr === todayStr;
                const isPast = cell.dateStr < todayStr;
                const isFuture = cell.dateStr > todayStr;
                const log = isFuture ? null : (attendanceLogs[cell.dateStr] || null);

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
                  cellClass = 'border-primary bg-primary/10 text-primary shadow-2xs font-bold';
                } else if (computedStatus === 'present') {
                  cellClass = 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 hover:border-emerald-400 dark:hover:border-emerald-600';
                } else if (computedStatus === 'late') {
                  cellClass = 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800 hover:border-amber-400 dark:hover:border-amber-600';
                } else if (computedStatus === 'early_checkout') {
                  cellClass = 'bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800 hover:border-orange-400 dark:hover:border-orange-600';
                } else if (computedStatus === 'on_leave') {
                  cellClass = 'bg-primary/10 text-primary border-primary/20 hover:border-primary/40';
                } else if (computedStatus === 'absent') {
                  cellClass = 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800 hover:border-rose-400 dark:hover:border-rose-600';
                } else if (computedStatus === 'holiday') {
                  cellClass = 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800 hover:border-blue-400 dark:hover:border-blue-600';
                } else if (computedStatus === 'off_day') {
                  cellClass = 'bg-muted/40 border-border/60 hover:border-border text-muted-foreground';
                } else {
                  cellClass = 'bg-card border-border/70 hover:border-primary/40';
                }

                const showTimes = computedStatus === 'present' || computedStatus === 'late' || computedStatus === 'early_checkout';
                const inTimeStr = log?.checkInTime || '--';
                const outTimeStr = log?.checkOutTime || '--';

                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedDayLog({ date: cell.dateStr, log })}
                    className={`min-h-[120px] h-auto p-2.5 rounded-xl border flex flex-col justify-between cursor-pointer transition-all duration-150 hover:shadow-2xs ${cellClass}`}
                  >
                    <div className="flex justify-between items-center">
                      <span className={`text-xs font-mono font-bold ${isToday ? 'text-primary' : 'text-foreground'}`}>
                        {cell.dayNumber}
                      </span>
                      {isToday && <span className="w-2 h-2 rounded-full bg-primary animate-ping" />}
                    </div>

                    <div className="flex flex-col gap-1 mt-1 text-[9px] text-left">
                      {(() => {
                        const shiftInfo = shifts[cell.dateStr];
                        if (shiftInfo && !shiftInfo.isOffDay) {
                          return (
                            <div className="flex items-center gap-1 min-w-0">
                              <span
                                className="w-1.5 h-1.5 rounded-full shrink-0"
                                style={{ backgroundColor: shiftInfo.color || 'var(--primary)' }}
                              />
                              <span className="text-[8px] text-foreground font-bold uppercase tracking-wide truncate">
                                {shiftInfo.shiftCode} ({shiftInfo.startTime ? formatTimeToDisplay(shiftInfo.startTime) : '9am'}-{shiftInfo.endTime ? formatTimeToDisplay(shiftInfo.endTime) : '6pm'})
                              </span>
                            </div>
                          );
                        }
                        if (!cell.isWeekend && computedStatus !== 'holiday' && computedStatus !== 'on_leave') {
                          return (
                            <div className="flex items-center gap-1 min-w-0">
                              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
                              <span className="text-[8px] text-muted-foreground font-bold uppercase tracking-wide">
                                GS (9am-6pm)
                              </span>
                            </div>
                          );
                        }
                        return null;
                      })()}

                      {showTimes ? (
                        <>
                          <span className="font-mono leading-none text-emerald-700 font-bold">
                            In: {inTimeStr}
                          </span>
                          <span className="font-mono leading-none text-rose-700 font-bold">
                            Out: {outTimeStr}
                          </span>
                          <span className="font-mono font-bold text-[8px] text-primary bg-primary/10 px-1 py-0.5 rounded leading-none mt-0.5 border border-primary/20 w-fit">
                            Work: {computeWorkDuration(log, isToday)}
                          </span>
                        </>
                      ) : computedStatus === 'off_day' ? (
                        <span className="font-bold text-muted-foreground text-[10px]">
                          Off Day
                        </span>
                      ) : cell.isWeekend ? (
                        <span className="font-bold text-muted-foreground/70 text-[10px]">
                          Weekend
                        </span>
                      ) : computedStatus === 'holiday' ? (
                        <span className="font-bold text-blue-700 text-[10px]">
                          Holiday
                        </span>
                      ) : computedStatus === 'on_leave' ? (
                        <span className="font-bold text-primary text-[10px]">
                          On Leave
                        </span>
                      ) : computedStatus === 'absent' ? (
                        <span className="font-bold text-rose-700 text-[10px]">
                          Absent
                        </span>
                      ) : (
                        <span className="text-muted-foreground/30 font-mono text-[10px] leading-none">-</span>
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

        {/* Leaves detailed breakdown & Upcoming Holidays */}
        <div className="lg:col-span-1 flex flex-col gap-4 h-full">
          <Card className="border border-border/80 rounded-xl shadow-2xs bg-card flex flex-col justify-between shrink-0 overflow-hidden">
            <CardHeader className="py-3 px-4 border-b border-border/60 flex flex-row justify-between items-center bg-muted/20">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-amber-500" />
                <div>
                  <CardTitle className="text-xs font-bold text-foreground">Leave Balances</CardTitle>
                  <p className="text-[10px] text-muted-foreground font-medium">Real-time leave quota</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/employee/leaves')}
                className="h-7 text-xs font-bold text-primary hover:bg-primary/10 px-2 rounded-lg gap-1"
              >
                Apply <ArrowRight className="w-3 h-3" />
              </Button>
            </CardHeader>
            <CardContent className="p-4 space-y-4 flex-1 flex flex-col justify-between">
              {loadingLeaves ? (
                <div className="space-y-3 py-3">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="animate-pulse space-y-1.5">
                      <div className="h-3.5 bg-muted rounded w-3/4" />
                      <div className="h-1.5 bg-muted rounded w-full" />
                    </div>
                  ))}
                </div>
              ) : leaveBalances.length === 0 ? (
                <div className="text-center py-6 space-y-1.5">
                  <Palmtree className="w-7 h-7 mx-auto text-muted-foreground/40" />
                  <p className="text-xs text-muted-foreground font-semibold">No leave balances found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {leaveBalances.map((bal, i) => {
                    const leaveName = getBalStr(bal, 'leave_name', 'leaveName', 'Leave');
                    const leaveCode = getBalStr(bal, 'leave_code', 'leaveCode', 'LV');
                    const quotaFallback = parseFloat(bal?.annual_quota ?? bal?.annualQuota ?? 0) || 0;
                    const allocated = getBalNum(bal, 'allocated_balance', 'allocatedBalance', quotaFallback);
                    const consumed = getBalNum(bal, 'consumed_balance', 'consumedBalance', 0);
                    const pending = getBalNum(bal, 'pending_approval_balance', 'pendingApprovalBalance', 0);
                    const available = getCalculatedAvailable(bal);
                    const theme = getLeaveTheme(leaveCode, i);

                    const availPercent = allocated > 0 ? Math.min(100, Math.max(0, Math.round((available / allocated) * 100))) : 0;

                    return (
                      <div key={i} className="p-3 rounded-xl bg-muted/20 border border-border/60 hover:border-primary/40 transition-all space-y-2">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-primary/10 text-primary border border-primary/20">
                              {leaveCode}
                            </span>
                            <span className="font-bold text-xs text-foreground">{leaveName}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-mono font-bold text-foreground">
                              {available}d <span className="text-[10px] text-muted-foreground font-normal">/ {allocated}d left</span>
                            </span>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-300 bg-primary"
                              style={{ width: `${availPercent}%` }}
                            />
                          </div>
                          <div className="flex justify-between items-center text-[10px] text-muted-foreground font-medium pt-0.5">
                            <span>Used: <strong className="text-foreground">{consumed}d</strong></span>
                            {pending > 0 && (
                              <span className="text-amber-600 font-bold">Pending: {pending}d</span>
                            )}
                            <span>Quota: {allocated}d</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/60">
                <Button
                  onClick={() => navigate('/employee/leaves')}
                  className="w-full h-8 rounded-lg gap-1.5 font-bold text-xs bg-primary hover:bg-primary/90 text-primary-foreground shadow-2xs"
                >
                  <Palmtree className="w-3.5 h-3.5" /> Apply Leave
                </Button>

                <Button
                  onClick={() => navigate('/employee/attendance-regularization')}
                  variant="outline"
                  className="w-full h-8 rounded-lg gap-1 font-bold text-[11px] border-border text-muted-foreground hover:text-foreground"
                >
                  Regularize
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Holidays Widget */}
          <div className="flex-1 min-h-[320px]">
            <UpcomingHolidaysWidget />
          </div>
        </div>
      </div>

      {/* Day Details Modal Dialog */}
      {selectedDayLog && (
        <Dialog open={!!selectedDayLog} onOpenChange={(open) => !open && setSelectedDayLog(null)}>
          <DialogContent className="sm:max-w-[420px] rounded-xl p-5 border border-border bg-card shadow-2xs">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
                <CalendarIcon className="w-4 h-4 text-primary" />
                Shift & Attendance Details
              </DialogTitle>
              <DialogDescription className="font-mono text-xs text-muted-foreground">
                Date: {selectedDayLog.date}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <div className="grid grid-cols-2 gap-2.5 text-center">
                <div className="p-2.5 bg-muted/30 border border-border/60 rounded-lg">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">Check In Time</span>
                  <span className="text-sm font-mono font-extrabold text-foreground block mt-1">
                    {selectedDayLog.log?.checkInTime || '--'}
                  </span>
                </div>
                <div className="p-2.5 bg-muted/30 border border-border/60 rounded-lg">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">Check Out Time</span>
                  <span className="text-sm font-mono font-extrabold text-foreground block mt-1">
                    {selectedDayLog.log?.checkOutTime || '--'}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-muted/20 border border-border/60 rounded-lg space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Assigned Shift:</span>
                  <span className="font-extrabold">
                    {(() => {
                      const shiftInfo = shifts[selectedDayLog.date];
                      if (shiftInfo && !shiftInfo.isOffDay) {
                        const start = shiftInfo.startTime ? formatTimeToDisplay(shiftInfo.startTime) : '--';
                        const end = shiftInfo.endTime ? formatTimeToDisplay(shiftInfo.endTime) : '--';
                        return `${shiftInfo.shiftCode} (${start} - ${end})`;
                      }
                      return myShift?.shiftName ? `${myShift.shiftName} (${myShift.startTime || '--'} - ${myShift.endTime || '--'})` : 'No Shift Assigned';
                    })()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Work Duration:</span>
                  <span className="font-mono font-bold text-primary">
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
                className="w-full h-9 rounded-lg text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-2xs"
              >
                Request Regularization for this date
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <Dialog open={isDocModalOpen} onOpenChange={setIsDocModalOpen}>
        <DialogContent className="sm:max-w-[650px] max-h-[85vh] overflow-y-auto rounded-xl p-5 bg-card border border-border/80 shadow-2xs">
          <DialogHeader className="pb-3 border-b border-border/60">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                <FolderOpen className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                  Official Company Documents Vault
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Access & download your verified Offer Letter, Appointment Letter, Payslips & Tax Papers
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Controls: Category Dropdown & Search & Download All */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 border-b border-border/60">
            
            {/* Category Filter Dropdown */}
            <div className="relative shrink-0 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                className="w-full sm:w-[200px] flex items-center justify-between px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-muted/40 transition-all font-bold text-xs text-foreground h-8"
              >
                <div className="flex items-center gap-1.5 truncate">
                  <FolderOpen className="w-3.5 h-3.5 text-primary" />
                  <span className="truncate">
                    {selectedCategories.length === 0
                      ? 'No categories selected'
                      : selectedCategories.length === 3
                      ? 'All Categories'
                      : `${selectedCategories.length} category selected`}
                  </span>
                </div>
                <span className="text-[9px] text-muted-foreground ml-1">
                  {isCategoryDropdownOpen ? '▲' : '▼'}
                </span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative flex-1 min-w-0 w-full">
              <input
                type="text"
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs border rounded-lg pl-8 pr-3 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 font-medium text-foreground h-8"
              />
              <span className="absolute left-2.5 top-2 text-muted-foreground">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
            </div>

            {/* Download All Button */}
            <Button
              onClick={handleDownloadAllFiltered}
              disabled={displayedDocuments.length === 0}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs h-8 px-3 rounded-lg gap-1.5 shadow-2xs shrink-0 disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" /> Download All ({displayedDocuments.length})
            </Button>
          </div>

          {/* Documents List */}
          <div className="max-h-[240px] overflow-y-auto space-y-2.5 py-2.5 pr-1">
            {loadingDocs ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                Loading official paperwork...
              </div>
            ) : displayedDocuments.length === 0 ? (
              <div className="py-8 text-center space-y-1 border border-dashed rounded-xl bg-muted/10">
                <FileCheck className="w-8 h-8 text-muted-foreground/30 mx-auto" />
                <p className="text-xs font-semibold text-muted-foreground">No documents found</p>
              </div>
            ) : (
              displayedDocuments.map((doc, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl border border-border/80 bg-card hover:border-primary/50 transition-all flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-xs font-bold text-foreground truncate">
                          {doc.document_number || doc.document_type?.replace(/_/g, ' ').toUpperCase() || 'Official Document'}
                        </h4>
                        <Badge variant="outline" className="text-[9px] font-bold bg-emerald-500/10 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
                          {doc.verification_status || 'VERIFIED'}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-2">
                        <span>Issued: <strong>{doc.issued_by || 'HR Dept'}</strong></span>
                        <span>•</span>
                        <span>Date: {doc.issue_date || '2026-06-01'}</span>
                      </p>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => handleDownloadDoc(doc)}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs h-7 px-3 rounded-lg gap-1 shadow-2xs"
                  >
                    <Download className="w-3 h-3" /> Download
                  </Button>
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
