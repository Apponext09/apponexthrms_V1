import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Camera,
  Scan,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Clock,
  UserCheck,
  Sparkles,
  MapPin,
  Building2,
  Video,
  VideoOff,
  User,
  Zap,
  Volume2,
  VolumeX,
  Coffee,
  Utensils,
  Play,
  Pause,
  Square,
  Timer,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/config/api';
import { useAttendanceModuleSettings } from '@/features/attendance/hooks/useAttendanceModuleSettings';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useAttendanceStore } from '@/features/attendance/store/attendanceStore';
import { useEmployee } from '@/features/employee/hooks/useEmployees';
import { getUserRoleAndDept } from '@/lib/userProfile';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const friendlyBiometricError = (error: any, fallback: string): string => {
  const message = error?.response?.data?.message;
  if (typeof message !== 'string' || !message.trim()) return fallback;

  const containsTechnicalDetails =
    /(select\s+.+\s+from|insert\s+into|update\s+.+\s+set|delete\s+from|sql|query|knex|bindings?|errno|er_[a-z_]+|unknown column|doesn't exist|database)/i.test(
      message
    );

  return containsTechnicalDetails ? fallback : message;
};

const APPROVED_GEOFENCES = [
  { id: 'arham', name: 'Arham IT Solution, Ahilyanagar', lat: 19.0948, lng: 74.7480, radius: 700 },
  { id: 'kosqu', name: 'Kosqu Technolab, Navi Mumbai', lat: 19.0330, lng: 73.0297, radius: 700 },
];

const calculateDistanceMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
};

export default function FaceAttendancePage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const roleInfo = getUserRoleAndDept(user);
  const employeeId = user?.employeeId || user?.id || 0;
  const { employee } = useEmployee(employeeId);
  const { attendanceMode } = useAttendanceModuleSettings();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [savedProfilePhoto, setSavedProfilePhoto] = useState<string | null>(null);
  const [punchAction, setPunchAction] = useState<'check_in' | 'check_out'>('check_in');
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  // Permitted HR-Assigned Locations State
  const [myLocations, setMyLocations] = useState<Array<{ id: string; locationId: number; name: string; radiusMeters: number; latitude: number; longitude: number; isPrimary: boolean }>>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');

  // GPS Geofence Location State
  const [gpsLocation, setGpsLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locLoading, setLocLoading] = useState<boolean>(true);
  const [geofenceStatus, setGeofenceStatus] = useState<{
    isValid: boolean;
    distanceMeters: number;
    nearestOfficeName: string;
    message: string;
  }>({
    isValid: false,
    distanceMeters: 0,
    nearestOfficeName: '',
    message: 'Acquiring GPS location...',
  });

  // Today's Status State
  const [checkInStatus, setCheckInStatus] = useState<'not_started' | 'checked_in' | 'completed'>('not_started');
  const [checkInTime, setCheckInTime] = useState<string>('--');
  const [checkOutTime, setCheckOutTime] = useState<string>('--');
  const [workDuration, setWorkDuration] = useState<string>('--');

  // Employee Assigned Shift State
  const [myShift, setMyShift] = useState<{
    shiftName: string;
    startTime: string;
    endTime: string;
    shiftCode?: string;
    breakDurationMinutes: number;
    gracePeriodMinutes: number;
    durationHours: number;
  }>({
    shiftName: '',
    startTime: '',
    endTime: '',
    breakDurationMinutes: 60,
    gracePeriodMinutes: 15,
    durationHours: 9,
  });

  // Holiday & Shift Gate State
  const [todayHoliday, setTodayHoliday] = useState<{ isHoliday: boolean; holidayName?: string } | null>(null);
  const [hasShift, setHasShift] = useState<boolean | null>(null);

  // Live shift entry zone state (updated from /attendance/status)
  const [shiftStatusInfo, setShiftStatusInfo] = useState<{
    graceDeadline: string;
    halfDayDeadline: string;
    currentEntryStatus: 'on_time' | 'late' | 'half_day' | 'no_shift';
    lateMinutesNow: number;
  } | null>(null);

  // Countdown to next deadline (seconds)
  const [deadlineCountdownSecs, setDeadlineCountdownSecs] = useState<number>(0);


  const fetchMyShift = async () => {
    try {
      const res = await apiClient.get('/attendance/my-shift');
      const s = res.data?.data;
      if (s) {
        setMyShift({
          shiftName: s.shift_name || s.shiftName || '',
          startTime: s.start_time || s.startTime || '',
          endTime: s.end_time || s.endTime || '',
          shiftCode: s.shift_code || s.shiftCode,
          breakDurationMinutes: Number(s.break_duration_minutes || s.breakDurationMinutes || 60),
          gracePeriodMinutes: Number(s.grace_period_minutes || s.gracePeriodMinutes || 15),
          durationHours: Number(s.duration_hours || s.durationHours || 9),
        });
      }
    } catch (err) {
      console.warn('Failed to fetch assigned shift:', err);
    }
  };


  // Active Break System State — synced with global useAttendanceStore
  const storeIsOnBreak = useAttendanceStore((state) => state.isOnBreak);
  const [isOnBreak, setIsOnBreak] = useState<boolean>(false);
  const [isBreakPaused, setIsBreakPaused] = useState<boolean>(false);
  const [isBreakCompleted, setIsBreakCompleted] = useState<boolean>(false);
  const [activeBreakInfo, setActiveBreakInfo] = useState<{
    id?: number;
    breakStartTime?: string | null;
    breakType?: string;
  } | null>(null);
  const [totalBreakMinutesTaken, setTotalBreakMinutesTaken] = useState<number>(0);
  const [remainingBreakMinutes, setRemainingBreakMinutes] = useState<number>(60);
  const [breakLoading, setBreakLoading] = useState<boolean>(false);

  const [breakTimerSecondsElapsed, setBreakTimerSecondsElapsed] = useState<number>(0);
  const [breakTimerSecondsRemaining, setBreakTimerSecondsRemaining] = useState<number>(0);

  const hasAutoEndedRef = useRef<boolean>(false);

  // Sync FaceAttendancePage state when break is stopped from full-screen overlay or anywhere in the app
  useEffect(() => {
    if (!storeIsOnBreak && isOnBreak) {
      setIsOnBreak(false);
      setIsBreakPaused(false);
      setActiveBreakInfo(null);
      fetchTodayStatus();
    }
  }, [storeIsOnBreak, isOnBreak]);

  // Live Break Countdown Interval
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isOnBreak && !isBreakPaused && activeBreakInfo?.breakStartTime) {
      const updateTimer = () => {
        const rawStart = activeBreakInfo.breakStartTime;
        if (!rawStart) return;
        const isoStart = typeof rawStart === 'string' ? rawStart.replace(' ', 'T') : rawStart;
        const startMs = new Date(isoStart).getTime();
        if (isNaN(startMs)) return;

        const nowMs = Date.now();
        const elapsed = Math.max(0, Math.floor((nowMs - startMs) / 1000));
        const availableSecs = (remainingBreakMinutes || myShift.breakDurationMinutes || 60) * 60;
        const remaining = Math.max(0, availableSecs - elapsed);

        setBreakTimerSecondsElapsed(elapsed);
        setBreakTimerSecondsRemaining(remaining);

        if (remaining <= 0 && !hasAutoEndedRef.current) {
          hasAutoEndedRef.current = true;
          handleEndBreak(true);
        }
      };

      updateTimer();
      interval = setInterval(updateTimer, 1000);
    } else if (!isOnBreak) {
      setBreakTimerSecondsElapsed(0);
      setBreakTimerSecondsRemaining(0);
      hasAutoEndedRef.current = false;
    }
    return () => clearInterval(interval);
  }, [isOnBreak, isBreakPaused, activeBreakInfo, remainingBreakMinutes, myShift.breakDurationMinutes]);

  const formatTimerMinSec = (totalSecs: number) => {
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const formatElapsedDuration = (totalSecs: number) => {
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  // Fetch HR-Assigned Locations for Employee
  const fetchMyLocations = async () => {
    try {
      const res = await apiClient.get('/attendance/my-permitted-locations');
      const locs = res.data?.data?.locations || [];
      setMyLocations(locs);
      if (locs.length > 0) {
        const primary = locs.find((l: any) => l.isPrimary) || locs[0];
        setSelectedLocationId(String(primary.locationId || primary.id));
      }
    } catch (err) {
      console.error('Failed to fetch permitted locations:', err);
    }
  };

  const fetchUserGpsLocation = () => {
    setLocLoading(true);
    if (!navigator.geolocation) {
      setGeofenceStatus({
        isValid: false,
        distanceMeters: 0,
        nearestOfficeName: 'Geofence Check Required',
        message: 'GPS geolocation is not supported by your browser.',
      });
      setLocLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;
        setGpsLocation({ lat: userLat, lng: userLng });
        setLocLoading(false);
      },
      (err) => {
        console.warn('GPS location error:', err);
        setGeofenceStatus({
          isValid: false,
          distanceMeters: 0,
          nearestOfficeName: 'Branch Location Check',
          message: 'Unable to access GPS location. Please enable location permission.',
        });
        setLocLoading(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  // Recalculate Geofence Status whenever selectedLocationId or gpsLocation changes
  useEffect(() => {
    if (!gpsLocation) return;
    if (myLocations.length === 0) {
      setGeofenceStatus({
        isValid: true,
        distanceMeters: 0,
        nearestOfficeName: 'Branch Location',
        message: 'GPS active. Position face clearly inside frame.',
      });
      return;
    }

    const selectedLoc = myLocations.find(l => String(l.locationId || l.id) === String(selectedLocationId)) || myLocations[0];
    if (!selectedLoc) return;

    const dist = calculateDistanceMeters(gpsLocation.lat, gpsLocation.lng, selectedLoc.latitude, selectedLoc.longitude);
    const radiusLimit = selectedLoc.radiusMeters || 500;
    const isWithinRadius = dist <= radiusLimit;

    if (isWithinRadius) {
      setGeofenceStatus({
        isValid: true,
        distanceMeters: dist,
        nearestOfficeName: selectedLoc.name,
        message: `Within ${radiusLimit}m Geofence: ${selectedLoc.name} (${dist}m away)`,
      });
    } else {
      setGeofenceStatus({
        isValid: false,
        distanceMeters: dist,
        nearestOfficeName: selectedLoc.name,
        message: `Outside permitted ${radiusLimit}m radius! You are ${dist}m away from ${selectedLoc.name}.`,
      });
    }
  }, [gpsLocation, selectedLocationId, myLocations]);

  useEffect(() => {
    fetchMyLocations();
    fetchUserGpsLocation();
  }, []);

  const empName = employee
    ? `${employee.firstName} ${employee.lastName}`.trim()
    : `${user?.firstName || 'Employee'} ${user?.lastName || ''}`.trim();
  const empCode = employee?.employeeCode || (employeeId ? `EMP-${String(employeeId).padStart(4, '0')}` : 'EMP-0001');

  const formatTime = (d: Date) => {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  };

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
        if (st.isCheckedOut) {
          setCheckInStatus('completed');
          setCheckInTime(st.checkInTime ? formatTime(new Date(st.checkInTime)) : '--');
          setCheckOutTime(st.checkOutTime ? formatTime(new Date(st.checkOutTime)) : '--');
          setPunchAction('check_out');
        } else if (st.isCheckedIn) {
          setCheckInStatus('checked_in');
          setCheckInTime(st.checkInTime ? formatTime(new Date(st.checkInTime)) : '--');
          setPunchAction('check_out');
        } else {
          setCheckInStatus('not_started');
          setPunchAction('check_in');
        }

        if (st.isOnBreak) {
          setIsOnBreak(true);
          setIsBreakPaused(!!st.isBreakPaused);
          setActiveBreakInfo({
            id: st.activeBreak?.id,
            breakStartTime: st.activeBreak?.breakStartTime || st.activeBreak?.break_start_time,
            breakType: st.activeBreak?.breakType || st.activeBreak?.break_type || 'lunch',
          });
          useAttendanceStore.getState().setBreakStatusFromAPI({
            isOnBreak: true,
            isBreakQuotaExhausted: !!st.isBreakQuotaExhausted,
            assignedBreakMinutes: Number(st.assignedBreakMinutes ?? 60),
            totalBreakMinutes: Number(st.totalBreakMinutes ?? 0),
            remainingBreakMinutes: Number(st.remainingBreakMinutes ?? 0),
            activeBreak: st.activeBreak ? { breakStartTime: st.activeBreak.breakStartTime || st.activeBreak.break_start_time } : null,
          });
        } else {
          setIsOnBreak(false);
          setIsBreakPaused(false);
          setActiveBreakInfo(null);
          if (useAttendanceStore.getState().isOnBreak) {
            useAttendanceStore.getState().clearBreakState();
          }
        }

        if (typeof st.remainingBreakMinutes === 'number') {
          setRemainingBreakMinutes(st.remainingBreakMinutes);
          setIsBreakCompleted(st.remainingBreakMinutes <= 0 && !st.isOnBreak);
        } else if (st.isBreakQuotaExhausted || st.isBreakCompleted) {
          setIsBreakCompleted(!st.isOnBreak);
        } else {
          setIsBreakCompleted(false);
        }

        if (typeof st.totalBreakMinutes === 'number') {
          setTotalBreakMinutesTaken(st.totalBreakMinutes);
        }

        // Update shift status info from backend
        if (st.shiftInfo) {
          setShiftStatusInfo({
            graceDeadline: st.shiftInfo.graceDeadline,
            halfDayDeadline: st.shiftInfo.halfDayDeadline,
            currentEntryStatus: st.shiftInfo.currentEntryStatus,
            lateMinutesNow: st.shiftInfo.lateMinutesNow,
          });
          // Also patch myShift with fresh grace/duration values
          setMyShift(prev => ({
            ...prev,
            gracePeriodMinutes: st.shiftInfo.gracePeriodMinutes ?? prev.gracePeriodMinutes,
            durationHours: st.shiftInfo.durationHours ?? prev.durationHours,
          }));
        }
      }
    } catch (err) {
      console.error('Failed to fetch attendance status', err);
    }
  };


  const handleStartBreak = async () => {
    if (checkInStatus !== 'checked_in') {
      toast.error('You must be checked in to start a break.');
      return;
    }
    if (isBreakCompleted) {
      toast.error('Break quota for today has already been used.');
      return;
    }
    try {
      setBreakLoading(true);
      const res = await apiClient.post('/attendance/break-in', { breakType: 'lunch' });
      if (res.data?.success) {
        const breakData = res.data.data?.activeBreak || res.data.data;
        const startTime = breakData?.break_start_time || breakData?.breakStartTime || new Date().toISOString();
        setIsOnBreak(true);
        setIsBreakPaused(false);
        setActiveBreakInfo({
          id: breakData?.id,
          breakStartTime: startTime,
          breakType: 'lunch',
        });
        useAttendanceStore.getState().setBreakStatusFromAPI({
          isOnBreak: true,
          isBreakQuotaExhausted: false,
          assignedBreakMinutes: Number(res.data.data?.assignedBreakMinutes || myShift.breakDurationMinutes || 60),
          totalBreakMinutes: Number(res.data.data?.totalUsedMinutes || 0),
          remainingBreakMinutes: Number(res.data.data?.remainingBreakMinutes || 60),
          activeBreak: { breakStartTime: startTime },
        });
        toast.success('Break started! Live countdown timer active.');
        speakVoiceAnnouncement('Break started. Enjoy your lunch break.');
        fetchTodayStatus();
      }
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to start break';
      toast.error(msg);
    } finally {
      setBreakLoading(false);
    }
  };

  const handlePauseBreak = async () => {
    try {
      setBreakLoading(true);
      const res = await apiClient.post('/attendance/pause-break', {});
      if (res.data?.success) {
        setIsBreakPaused(true);
        toast.success('Break paused. Timer frozen.');
        speakVoiceAnnouncement('Break paused.');
        fetchTodayStatus();
      }
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to pause break';
      toast.error(msg);
    } finally {
      setBreakLoading(false);
    }
  };

  const handleResumeBreak = async () => {
    try {
      setBreakLoading(true);
      const res = await apiClient.post('/attendance/resume-break', {});
      if (res.data?.success) {
        setIsBreakPaused(false);
        toast.success('Break resumed. Live countdown active.');
        speakVoiceAnnouncement('Break resumed.');
        fetchTodayStatus();
      }
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to resume break';
      toast.error(msg);
    } finally {
      setBreakLoading(false);
    }
  };

  const handleEndBreak = async (isAutoEnd = false) => {
    if (!isAutoEnd && !geofenceStatus.isValid) {
      toast.error('Break End Blocked! You must be within office geofenced location (700m) to stop your break.');
      speakVoiceAnnouncement('Ending break is blocked. You must be within office location.');
      return;
    }
    try {
      setBreakLoading(true);
      const payload: any = {};
      if (gpsLocation) {
        payload.latitude = gpsLocation.lat;
        payload.longitude = gpsLocation.lng;
      }
      const res = await apiClient.post('/attendance/break-out', payload);
      if (res.data?.success) {
        setIsOnBreak(false);
        setIsBreakPaused(false);
        setActiveBreakInfo(null);
        useAttendanceStore.getState().clearBreakState();
        if (isAutoEnd) {
          toast.info('Your assigned break time has ended. Welcome back to work.');
          speakVoiceAnnouncement('Assigned break time has ended. Welcome back to work.');
        } else {
          toast.success('Break ended successfully! Welcome back on duty.');
          speakVoiceAnnouncement('Break ended. Welcome back to work.');
        }
        fetchTodayStatus();
      }
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to end break';
      toast.error(msg);
    } finally {
      setBreakLoading(false);
    }
  };

  useEffect(() => {
    fetchTodayStatus();
    fetchMyShift();
  }, []);

  // Live countdown to next deadline (grace cutoff or half-day cutoff)
  useEffect(() => {
    if (!shiftStatusInfo || checkInStatus !== 'not_started') {
      setDeadlineCountdownSecs(0);
      return;
    }
    const { graceDeadline, halfDayDeadline, currentEntryStatus } = shiftStatusInfo;

    // Parse "HH:MM" deadline label into today's Date
    const parseDeadline = (label: string): Date | null => {
      if (!label || label === '--') return null;
      const [h, m] = label.split(':').map(Number);
      if (isNaN(h) || isNaN(m)) return null;
      const d = new Date();
      d.setHours(h, m, 0, 0);
      return d;
    };

    const graceDate    = parseDeadline(graceDeadline);
    const halfDayDate  = parseDeadline(halfDayDeadline);

    const tick = () => {
      const now = Date.now();
      let target: Date | null = null;
      if (currentEntryStatus === 'on_time' && graceDate) {
        target = graceDate;
      } else if (currentEntryStatus === 'late' && halfDayDate) {
        target = halfDayDate;
      }
      if (target) {
        const diff = Math.max(0, Math.floor((target.getTime() - now) / 1000));
        setDeadlineCountdownSecs(diff);
      } else {
        setDeadlineCountdownSecs(0);
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [shiftStatusInfo, checkInStatus]);

  // Audio Voice Announcement with Indian Accent (Text-to-Speech)
  const speakVoiceAnnouncement = (text: string) => {
    if (!voiceEnabled) return;
    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.92;
        utterance.pitch = 1.0;

        const voices = window.speechSynthesis.getVoices();
        const indianVoice = voices.find(
          (v) =>
            v.lang === 'en-IN' ||
            v.lang === 'hi-IN' ||
            v.lang.startsWith('en-IN') ||
            v.name.toLowerCase().includes('india') ||
            v.name.toLowerCase().includes('heera') ||
            v.name.toLowerCase().includes('ravi') ||
            v.name.toLowerCase().includes('hindi')
        );

        if (indianVoice) {
          utterance.voice = indianVoice;
          utterance.lang = indianVoice.lang;
        } else {
          utterance.lang = 'en-IN';
        }

        window.speechSynthesis.speak(utterance);
      }
    } catch (e) {
      console.warn('Voice synthesis warning:', e);
    }
  };

  useEffect(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  }, []);

  const startCamera = async () => {
    try {
      setCameraError(null);
      setCapturedImage(null);
      setSuccessMsg(null);
      setSavedProfilePhoto(null);

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Webcam access is not supported by your browser or environment (requires HTTPS or localhost).');
        setIsCameraActive(false);
        return;
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false,
      });
      setStream(mediaStream);
      setIsCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        setCameraError('Camera permission denied. Please allow camera access in your browser settings and try again.');
      } else if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
        setCameraError('No camera device found on your device.');
      } else {
        setCameraError('Unable to access camera. Please check your browser permissions.');
      }
      if (import.meta.env.DEV) {
        console.warn('Camera access status:', err?.name || err?.message);
      }
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  useEffect(() => {
    if (isCameraActive && stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [isCameraActive, stream]);

  const handleRetake = () => {
    setCapturedImage(null);
    setSuccessMsg(null);
    startCamera();
  };

  // Grab a frame from live video without interrupting stream
  const grabVideoFrame = (): string | null => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video.readyState >= 2 && video.videoWidth > 0) {
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          return canvas.toDataURL('image/jpeg', 0.92);
        }
      }
    }
    return null;
  };

  const captureVerificationBurst = async (): Promise<string[]> => {
    const images: string[] = [];
    for (let index = 0; index < 3; index += 1) {
      const frame = grabVideoFrame();
      if (frame) images.push(frame);
      if (index < 2) {
        await new Promise((resolve) => window.setTimeout(resolve, 180));
      }
    }
    return images;
  };

  // Exact Admin Side Biometric Punch Logic with Employee Lock
  const handleBiometricPunch = async () => {
    if (!geofenceStatus.isValid) {
      toast.error(geofenceStatus.message || 'Check-in blocked! You must be within 700m radius of Arham IT Solution or Kosqu Technolab.');
      speakVoiceAnnouncement('Check in blocked. You are outside the office 700 meter radius.');
      return;
    }

    const images = capturedImage ? [capturedImage] : await captureVerificationBurst();
    if (images.length === 0) {
      toast.error('Face capture failed. Please make sure camera is active.');
      speakVoiceAnnouncement('Face capture failed. Please position face clearly inside frame.');
      return;
    }

    try {
      setBiometricLoading(true);
      setSuccessMsg(null);

      // EXPLICIT EMPLOYEE LOCK: Pass employeeId so backend verifies face ONLY against this employee's embedding!
      const res = await apiClient.post('/attendance/biometric/verify-punch', {
        images,
        action: punchAction,
        employeeId: String(employeeId),
        location: {
          locationId: selectedLocationId ? Number(selectedLocationId) : undefined,
          latitude: gpsLocation?.lat,
          longitude: gpsLocation?.lng,
        },
      });

      if (res.data?.success) {
        const isCheckInAction = res.data.action === 'check_in';
        const matchedName = res.data.matchedEmployee?.name || empName;
        const matchedCode = res.data.matchedEmployee?.employeeCode || empCode;
        const matchedPhoto = res.data.matchedEmployee?.profilePhoto;
        // Entry status label from backend (if returned) or from current shiftStatusInfo
        const entryStatusRaw = res.data.entryStatus || res.data.entryResult?.entryStatus || shiftStatusInfo?.currentEntryStatus || 'on_time';
        const entryLabel = isCheckInAction
          ? entryStatusRaw === 'on_time'   ? ' On Time'
          : entryStatusRaw === 'late'      ? ' Late Entry'
          : entryStatusRaw === 'half_day'  ? ' Half Day'
          : ''
          : '';

        if (matchedPhoto) {
          setSavedProfilePhoto(matchedPhoto);
        }

        const fullMatchMsg = `${matchedName} has checked ${
          isCheckInAction ? 'in' : 'out'
        } successfully`;

        setCapturedImage(images[0]);
        setSuccessMsg(fullMatchMsg);
        stopCamera();

        toast.success(fullMatchMsg, {
          description: isCheckInAction
            ? `${entryLabel} • ${myShift.shiftName} (${myShift.startTime} - ${myShift.endTime})`
            : `Employee ID: ${matchedCode} • Shift end logged`,
          duration: 6000,
        });

        speakVoiceAnnouncement(`${fullMatchMsg}. Attendance marked${entryLabel ? `. ${entryLabel}` : ' as present'}.`);

        fetchTodayStatus();
      } else {
        const errText = res.data?.message || 'Face recognition failed';
        toast.error(errText);
        speakVoiceAnnouncement('Face match failed. Please position face clearly inside frame.');
      }
    } catch (err: any) {
      const failureMessage = friendlyBiometricError(
        err,
        'Unable to mark biometric attendance. Please try again.'
      );
      console.warn('Biometric attendance request failed');
      toast.error(failureMessage);
      speakVoiceAnnouncement('Attendance could not be marked. Please try again.');
    } finally {
      setBiometricLoading(false);
    }
  };

  return (
    <div className="space-y-4 pb-12 select-none">
      <canvas ref={canvasRef} className="hidden" />

      {/* MODE DISABLED NOTICE */}
      {(attendanceMode === 'gps' || attendanceMode === 'wifi_ip') && (
        <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-semibold shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Face Recognition is currently disabled by Organization Admin. Attendance verification is set to <strong>{attendanceMode === 'gps' ? 'GPS Punch' : 'Wi-Fi IP Network'}</strong> mode.
            </span>
          </div>
          <Button size="sm" variant="outline" className="h-7 text-xs font-bold shrink-0 border-amber-500/40 hover:bg-amber-500/20" onClick={() => navigate('/employee/dashboard')}>
            Go to Portal Dashboard
          </Button>
        </div>
      )}

      {/* TOP BANNER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-card border border-border/80 p-4 rounded-xl shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-primary/10 text-primary shrink-0">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black text-foreground tracking-tight flex items-center gap-2">
                Face Recognition Attendance
              </h1>
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-bold text-[10px]">
                {roleInfo.roleTitle}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Secure face recognition check-in & check-out with GPS geofence verification.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            className="h-8 text-xs font-semibold gap-1.5"
          >
            {voiceEnabled ? <Volume2 className="w-3.5 h-3.5 text-primary" /> : <VolumeX className="w-3.5 h-3.5 text-muted-foreground" />}
            {voiceEnabled ? 'Voice On' : 'Voice Off'}
          </Button>
        </div>
      </div>


      {/* ── SHIFT GRACE PERIOD STATUS BANNER ─────────────────────────────── */}
      {shiftStatusInfo && shiftStatusInfo.currentEntryStatus !== 'no_shift' && checkInStatus === 'not_started' && (
        <div className={cn(
          'p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all',
          shiftStatusInfo.currentEntryStatus === 'on_time'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
            : shiftStatusInfo.currentEntryStatus === 'late'
            ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300'
            : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
        )}>
          <div className="flex items-start gap-3">
            {/* Status icon */}
            <div className={cn(
              'text-2xl shrink-0 mt-0.5',
            )}>
              {shiftStatusInfo.currentEntryStatus === 'on_time'  && '🟢'}
              {shiftStatusInfo.currentEntryStatus === 'late'     && '🟡'}
              {shiftStatusInfo.currentEntryStatus === 'half_day' && '🔴'}
            </div>
            <div>
              <p className="text-sm font-extrabold">
                {shiftStatusInfo.currentEntryStatus === 'on_time'  && 'On Time — Check in before grace period ends!'}
                {shiftStatusInfo.currentEntryStatus === 'late'     && `Late Entry (+${shiftStatusInfo.lateMinutesNow} mins) — Full Day, but marked Late`}
                {shiftStatusInfo.currentEntryStatus === 'half_day' && 'Half Day Zone — Checking in now will mark Half Day'}
              </p>
              <p className="text-xs font-medium opacity-80 mt-0.5">
                {shiftStatusInfo.currentEntryStatus === 'on_time' && (
                  <>Grace period ends at <strong>{shiftStatusInfo.graceDeadline}</strong> · Half Day after <strong>{shiftStatusInfo.halfDayDeadline}</strong></>
                )}
                {shiftStatusInfo.currentEntryStatus === 'late' && (
                  <>Half Day marks if you check in after <strong>{shiftStatusInfo.halfDayDeadline}</strong></>
                )}
                {shiftStatusInfo.currentEntryStatus === 'half_day' && (
                  <>Half Day threshold crossed at <strong>{shiftStatusInfo.halfDayDeadline}</strong></>
                )}
              </p>
            </div>
          </div>

          {/* Live countdown pill */}
          {deadlineCountdownSecs > 0 && (
            <div className={cn(
              'shrink-0 flex flex-col items-center px-4 py-2 rounded-xl border font-mono font-black text-center',
              shiftStatusInfo.currentEntryStatus === 'on_time'
                ? 'bg-emerald-500/20 border-emerald-500/30'
                : 'bg-amber-500/20 border-amber-500/30'
            )}>
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-70 block">
                {shiftStatusInfo.currentEntryStatus === 'on_time' ? 'Grace Ends In' : 'Half Day In'}
              </span>
              <span className="text-lg leading-tight">
                {formatTimerMinSec(deadlineCountdownSecs)}
              </span>
            </div>
          )}
          {shiftStatusInfo.currentEntryStatus === 'half_day' && (
            <Badge className="bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30 text-xs font-extrabold shrink-0">
              Half Day
            </Badge>
          )}
        </div>
      )}

      {/* MAIN BIOMETRIC WORKSPACE DESK */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        
        {/* LEFT 2 COLUMNS: WEBCAM TERMINAL & CAMERA SCREEN */}
        <Card className="lg:col-span-2 border rounded-3xl shadow-xl overflow-hidden bg-card border-border">
          <CardHeader className="border-b border-border/60 bg-muted/20 pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-extrabold text-foreground flex items-center gap-2">
                <Scan className="w-5 h-5 text-indigo-500" /> Face Biometric Scanner Terminal
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge
                  onClick={() => {
                    if (checkInStatus === 'checked_in') {
                      toast.error('Check-In is blocked! You are already checked in. Please Check-Out to end your shift.');
                      return;
                    }
                    if (checkInStatus === 'completed') {
                      toast.error('Attendance is completed for today.');
                      return;
                    }
                    setPunchAction('check_in');
                  }}
                  className={cn(
                    'text-xs font-extrabold px-3 py-1 rounded-full transition-all select-none',
                    checkInStatus === 'checked_in' || checkInStatus === 'completed'
                      ? 'bg-muted/40 text-muted-foreground/40 cursor-not-allowed border border-border/40'
                      : punchAction === 'check_in'
                      ? 'bg-indigo-600 text-white shadow-md cursor-pointer'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80 cursor-pointer'
                  )}
                  title={checkInStatus === 'checked_in' ? 'Check-In blocked (Already checked in)' : ''}
                >
                  Check In
                </Badge>
                <Badge
                  onClick={() => {
                    if (checkInStatus === 'not_started') {
                      toast.error('Check-Out is blocked! You must Check-In first before Checking-Out.');
                      return;
                    }
                    if (checkInStatus === 'completed') {
                      toast.error('Attendance is completed for today.');
                      return;
                    }
                    setPunchAction('check_out');
                  }}
                  className={cn(
                    'text-xs font-extrabold px-3 py-1 rounded-full transition-all select-none',
                    checkInStatus === 'not_started' || checkInStatus === 'completed'
                      ? 'bg-muted/40 text-muted-foreground/40 cursor-not-allowed border border-border/40'
                      : punchAction === 'check_out'
                      ? 'bg-indigo-600 text-white shadow-md cursor-pointer'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80 cursor-pointer'
                  )}
                  title={checkInStatus === 'not_started' ? 'Check-Out blocked (Must check in first)' : ''}
                >
                  Check Out
                </Badge>
              </div>
            </div>
            <CardDescription className="text-xs text-muted-foreground">
              Position your face clearly inside the frame and click Verify & Punch.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-4 space-y-3.5">
            {/* HR-ASSIGNED PUNCH LOCATION SELECTOR */}
            {myLocations.length > 0 && (
              <div className="p-2.5 bg-muted/30 rounded-lg border border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="text-xs font-bold text-foreground flex items-center gap-1.5 shrink-0">
                  <MapPin className="w-3.5 h-3.5 text-primary" />
                  Punch Location:
                </label>
                <select
                  value={selectedLocationId}
                  onChange={(e) => setSelectedLocationId(e.target.value)}
                  className="h-8 px-2.5 bg-background border border-border rounded-md text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer min-w-[240px]"
                >
                  {myLocations.map((loc) => (
                    <option key={loc.id} value={loc.locationId || loc.id}>
                      {loc.name} {loc.isPrimary ? '(Primary Office)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* GPS GEOFENCE LOCATION STATUS BANNER */}
            <div className={cn(
              "p-3 rounded-lg border text-xs flex items-center justify-between gap-3 font-semibold transition-all",
              geofenceStatus.isValid
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-rose-50 text-rose-700 border-rose-200"
            )}>
              <div className="flex items-center gap-2">
                <MapPin className={cn("w-4 h-4 shrink-0", geofenceStatus.isValid ? "text-emerald-600" : "text-rose-600")} />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs">{geofenceStatus.isValid ? 'GPS Geofence Verified (700m Radius)' : 'Outside Geofence Area (700m Limit)'}</span>
                    <Badge className={cn("text-[9px] font-bold px-1.5 py-0.5", geofenceStatus.isValid ? "bg-emerald-600 text-white" : "bg-rose-600 text-white")}>
                      {geofenceStatus.isValid ? 'Check-In Allowed' : 'Check-In Blocked'}
                    </Badge>
                  </div>
                  <p className="text-[10px] opacity-90 font-medium mt-0.5">{geofenceStatus.message}</p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={fetchUserGpsLocation}
                disabled={locLoading}
                className="h-7 px-2.5 text-[10px] font-bold gap-1 shrink-0"
              >
                <RefreshCw className={cn("w-3 h-3", locLoading && "animate-spin")} /> Re-check GPS
              </Button>
            </div>

            {cameraError && (
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" /> {cameraError}
              </div>
            )}

            {successMsg && (
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in-50">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> {successMsg}
              </div>
            )}

            {/* LIVE CAMERA DISPLAY SCREEN */}
            <div className="relative rounded-xl bg-black overflow-hidden aspect-video border border-border/80 shadow-2xs flex items-center justify-center">
              {capturedImage ? (
                <div className="relative w-full h-full">
                  <img src={capturedImage} alt="Captured Face" className="w-full h-full object-cover transform -scale-x-100" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <div className="text-center space-y-2 p-4 bg-card rounded-xl border border-emerald-500/40 shadow-lg max-w-xs">
                      <div className="h-10 w-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <h4 className="text-xs font-bold text-foreground">Face Verified & Recorded</h4>
                      <p className="text-[10px] text-muted-foreground">{empName} ({empCode})</p>
                      <Button
                        size="sm"
                        onClick={handleRetake}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs rounded-md px-3 h-8 gap-1.5 mt-1"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Scan Again
                      </Button>
                    </div>
                  </div>
                </div>
              ) : isCameraActive ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover transform -scale-x-100"
                  />

                  {/* FRAME OVERLAY */}
                  <div className="absolute inset-0 pointer-events-none border-2 border-primary/30 rounded-xl m-2 flex flex-col justify-between p-3">
                    <div className="flex justify-between">
                      <div className="w-6 h-6 border-t-2 border-l-2 border-primary rounded-tl" />
                      <div className="w-6 h-6 border-t-2 border-r-2 border-primary rounded-tr" />
                    </div>

                    <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse" />

                    <div className="flex justify-between items-end">
                      <div className="w-6 h-6 border-b-2 border-l-2 border-primary rounded-bl" />
                      <div className="w-6 h-6 border-b-2 border-r-2 border-primary rounded-br" />
                    </div>
                  </div>

                  <div className="absolute top-3 left-3 bg-black/70 px-2.5 py-1 rounded-md text-[10px] text-white font-bold flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Target: {empName} ({empCode})
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center p-6 text-center space-y-2">
                  <div className="h-12 w-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                    <VideoOff className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Camera Offline</h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Click Start Camera to launch face recognition</p>
                  </div>
                  <Button
                    onClick={startCamera}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs px-4 h-8 rounded-md gap-1.5"
                  >
                    <Video className="w-3.5 h-3.5" /> Start Camera
                  </Button>
                </div>
              )}
            </div>

            {/* ACTION CONTROLS */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              {isCameraActive ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={stopCamera}
                  className="h-8 text-xs font-semibold"
                >
                  <VideoOff className="w-3.5 h-3.5 mr-1 text-rose-500" /> Close Camera
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={startCamera}
                  className="h-8 text-xs font-semibold"
                >
                  <Video className="w-3.5 h-3.5 mr-1 text-primary" /> Turn On Camera
                </Button>
              )}

              <Button
                disabled={!geofenceStatus.isValid || locLoading || biometricLoading || checkInStatus === 'completed' || (todayHoliday?.isHoliday && !hasShift) || (!hasShift && hasShift !== null)}
                onClick={handleBiometricPunch}
                className={cn(
                  'h-8 text-xs font-bold px-6 gap-1.5 transition-all',
                  (!geofenceStatus.isValid || (todayHoliday?.isHoliday && !hasShift) || (!hasShift && hasShift !== null))
                    ? 'bg-muted text-muted-foreground cursor-not-allowed border border-rose-200'
                    : 'bg-primary hover:bg-primary/90 text-primary-foreground'
                )}
                title={todayHoliday?.isHoliday && !hasShift ? `Public Holiday (${todayHoliday.holidayName})` : !hasShift ? 'No Shift Assigned' : !geofenceStatus.isValid ? 'Check-in is disabled outside 700m office radius' : ''}
              >
                {locLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Verifying GPS...
                  </>
                ) : biometricLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Verifying Face...
                  </>
                ) : todayHoliday?.isHoliday && !hasShift ? (
                  <>
                    <Palmtree className="w-3.5 h-3.5 text-blue-500" /> Holiday ({todayHoliday.holidayName})
                  </>
                ) : !hasShift && hasShift !== null ? (
                  <>
                    <AlertCircle className="w-3.5 h-3.5 text-amber-500" /> No Shift Assigned
                  </>
                ) : !geofenceStatus.isValid ? (
                  <>
                    <MapPin className="w-3.5 h-3.5 text-rose-500" /> Outside Geofence (Blocked)
                  </>
                ) : (
                  <>
                    <Scan className="w-3.5 h-3.5" />
                    {punchAction === 'check_in' ? `Verify & Check In${myShift.startTime ? ` (${myShift.startTime})` : ''}` : `Verify & Check Out${myShift.endTime ? ` (${myShift.endTime})` : ''}`}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* RIGHT COLUMN: EMPLOYEE PROFILE & PUNCH SUMMARY */}
        <div className="space-y-4">
          
          {/* EMPLOYEE VERIFIED CARD */}
          <Card className="border border-border/80 bg-card shadow-2xs overflow-hidden">
            <CardHeader className="border-b border-border/60 bg-muted/20 pb-3">
              <CardTitle className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-emerald-600" /> Account Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-md bg-primary/10 text-primary flex items-center justify-center text-sm font-bold overflow-hidden shrink-0">
                  {savedProfilePhoto || employee?.avatarUrl || user?.avatarUrl ? (
                    <img src={savedProfilePhoto || employee?.avatarUrl || user?.avatarUrl} alt={empName} className="h-full w-full object-cover" />
                  ) : (
                    <span>{empName.slice(0, 2).toUpperCase()}</span>
                  )}
                </div>

                <div>
                  <h3 className="text-xs font-bold text-foreground">{empName}</h3>
                  <p className="text-[10px] font-mono text-muted-foreground">{empCode}</p>
                  <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-bold mt-0.5">
                    Biometric Active
                  </Badge>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-muted/30 border border-border/40 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-medium">Shift Type</span>
                  <span className="font-bold text-foreground">{myShift.shiftName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-medium">Timing</span>
                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{myShift.startTime} – {myShift.endTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-medium">Grace Period</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {myShift.gracePeriodMinutes || 0} mins
                    {shiftStatusInfo?.graceDeadline && shiftStatusInfo.graceDeadline !== '--' && (
                      <span className="text-muted-foreground font-normal"> (till {shiftStatusInfo.graceDeadline})</span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-medium">Half Day After</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">
                    {shiftStatusInfo?.halfDayDeadline && shiftStatusInfo.halfDayDeadline !== '--'
                      ? shiftStatusInfo.halfDayDeadline
                      : '--'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-medium">Assigned Break</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">{myShift.breakDurationMinutes || 60} Mins (Lunch)</span>
                </div>

                {/* Live entry zone badge — only before check-in */}
                {shiftStatusInfo && checkInStatus === 'not_started' && shiftStatusInfo.currentEntryStatus !== 'no_shift' && (
                  <div className="pt-1 border-t border-border/30 flex justify-between items-center">
                    <span className="text-muted-foreground font-medium">Entry Zone Now</span>
                    <span className={cn(
                      'font-extrabold text-[10px] uppercase px-2 py-0.5 rounded-full border',
                      shiftStatusInfo.currentEntryStatus === 'on_time'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                        : shiftStatusInfo.currentEntryStatus === 'late'
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                        : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                    )}>
                      {shiftStatusInfo.currentEntryStatus === 'on_time'  && '🟢 On Time'}
                      {shiftStatusInfo.currentEntryStatus === 'late'     && '🟡 Late Entry'}
                      {shiftStatusInfo.currentEntryStatus === 'half_day' && '🔴 Half Day'}
                    </span>
                  </div>
                )}
              </div>

            </CardContent>
          </Card>

          {/* BREAK TIME CONTROL CARD */}
          {checkInStatus === 'checked_in' && (
            <Card className="border border-border/80 bg-card shadow-2xs overflow-hidden">
              <CardHeader className="border-b border-border/60 bg-muted/20 pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Coffee className="w-4 h-4 text-amber-600" /> Break Management
                </CardTitle>
                <Badge variant="outline" className="text-[10px] font-bold border-amber-200 text-amber-700 bg-amber-50">
                  {myShift.breakDurationMinutes || 60} Mins
                </Badge>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                {isBreakCompleted && !isOnBreak ? (
                  /* BREAK COMPLETED DISPLAY */
                  <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-2">
                    <div className="flex items-center justify-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-extrabold text-xs uppercase tracking-wider">
                      <CheckCircle2 className="w-4 h-4" /> Break Completed For Today
                    </div>
                    <p className="text-xs text-muted-foreground font-medium">
                      You have completed your assigned <span className="font-bold text-foreground">{myShift.breakDurationMinutes || 60} Mins</span> break session for today. Further break starts are disabled.
                    </p>
                  </div>
                ) : isOnBreak ? (
                  /* ACTIVE / PAUSED BREAK COUNTDOWN DISPLAY */
                  <div className="space-y-4 text-center">
                    <div className={cn(
                      "p-4 rounded-2xl border relative overflow-hidden transition-all",
                      isBreakPaused ? "bg-indigo-500/10 border-indigo-500/30" : "bg-amber-500/10 border-amber-500/30"
                    )}>
                      <span className={cn(
                        "text-[10px] font-extrabold uppercase tracking-widest block",
                        isBreakPaused ? "text-indigo-700 dark:text-indigo-300" : "text-amber-700 dark:text-amber-300"
                      )}>
                        {isBreakPaused ? '⏸ BREAK PAUSED' : '⚡ LIVE BREAK COUNTDOWN'}
                      </span>
                      <span className={cn(
                        "text-3xl font-mono font-black block mt-1 tracking-tight",
                        isBreakPaused ? "text-indigo-600 dark:text-indigo-400" : "text-amber-600 dark:text-amber-400"
                      )}>
                        {formatTimerMinSec(breakTimerSecondsRemaining)}
                      </span>
                      <p className="text-[11px] font-medium text-muted-foreground mt-1">
                        Elapsed: <span className="font-mono font-bold text-foreground">{formatElapsedDuration(breakTimerSecondsElapsed)}</span> / {myShift.breakDurationMinutes || 60}m
                      </p>
                      {/* Progress bar */}
                      <div className="w-full bg-muted h-2 rounded-full mt-3 overflow-hidden">
                        <div
                          className={cn("h-full transition-all duration-1000", isBreakPaused ? "bg-indigo-500" : "bg-amber-500")}
                          style={{
                            width: `${Math.min(100, (breakTimerSecondsElapsed / ((myShift.breakDurationMinutes || 60) * 60)) * 100)}%`
                          }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {/* PAUSE / RESUME BUTTON */}
                      {isBreakPaused ? (
                        <Button
                          onClick={handleResumeBreak}
                          disabled={breakLoading}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold py-3 rounded-2xl shadow-md gap-1.5"
                        >
                          {breakLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <><Play className="w-4 h-4 fill-white" /> Resume</>}
                        </Button>
                      ) : (
                        <Button
                          onClick={handlePauseBreak}
                          disabled={breakLoading}
                          className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold py-3 rounded-2xl shadow-md gap-1.5"
                        >
                          {breakLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <><Pause className="w-4 h-4 fill-white" /> Pause</>}
                        </Button>
                      )}

                      {/* END BREAK BUTTON */}
                      <Button
                        onClick={() => handleEndBreak(false)}
                        disabled={breakLoading}
                        className={cn(
                          'text-xs font-extrabold py-3 rounded-2xl shadow-md gap-1.5 transition-all',
                          !geofenceStatus.isValid
                            ? 'bg-slate-400 dark:bg-slate-800 text-slate-200 cursor-not-allowed border border-rose-500/30'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        )}
                        title={!geofenceStatus.isValid ? 'Break end requires office geofence location (700m)' : ''}
                      >
                        {breakLoading ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : !geofenceStatus.isValid ? (
                          <>
                            <MapPin className="w-4 h-4 text-rose-400" /> Outside
                          </>
                        ) : (
                          <>
                            <Square className="w-4 h-4 fill-white" /> End Break
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  /* START BREAK DISPLAY */
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-xs p-2.5 rounded-xl bg-muted/40 border border-border/50">
                      <span className="text-muted-foreground font-medium">Used: <strong className="text-foreground">{totalBreakMinutesTaken}m</strong> / {myShift.breakDurationMinutes || 60}m</span>
                      <span className="text-muted-foreground font-medium">Remaining: <strong className="text-amber-600 dark:text-amber-400">{remainingBreakMinutes}m</strong></span>
                    </div>

                    <Button
                      onClick={handleStartBreak}
                      disabled={breakLoading || checkInStatus !== 'checked_in' || remainingBreakMinutes <= 0}
                      className="w-full bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold py-3.5 rounded-2xl shadow-md gap-2"
                    >
                      {breakLoading ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Coffee className="w-4 h-4" /> Start Break ({remainingBreakMinutes} Mins Balance)
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* TODAY'S RECORD SUMMARY CARD */}
          <Card className="border border-border/80 bg-card shadow-2xs overflow-hidden">
            <CardHeader className="border-b border-border/60 bg-muted/20 pb-3">
              <CardTitle className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-primary" /> Today's Punch Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3.5 space-y-3">
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-muted/20 p-2.5 rounded-lg border border-border/60">
                  <span className="text-[9px] text-muted-foreground font-bold uppercase block">Check In Time</span>
                  <span className="text-xs font-mono font-bold text-foreground block mt-0.5">{checkInTime}</span>
                </div>

                <div className="bg-muted/20 p-2.5 rounded-lg border border-border/60">
                  <span className="text-[9px] text-muted-foreground font-bold uppercase block">Check Out Time</span>
                  <span className="text-xs font-mono font-bold text-foreground block mt-0.5">{checkOutTime}</span>
                </div>
              </div>

              <div className={cn(
                'p-3 rounded-2xl border text-center',
                checkInStatus === 'checked_in' && !isOnBreak
                  ? 'bg-emerald-500/10 border-emerald-500/20'
                  : checkInStatus === 'checked_in' && isOnBreak
                  ? 'bg-amber-500/10 border-amber-500/20'
                  : 'bg-indigo-500/10 border-indigo-500/20'
              )}>
                <span className="text-[10px] text-muted-foreground font-extrabold uppercase block">Attendance Status</span>
                <span className={cn(
                  'text-xs font-black block mt-0.5 uppercase tracking-wider',
                  checkInStatus === 'checked_in' && !isOnBreak ? 'text-emerald-600 dark:text-emerald-400'
                  : checkInStatus === 'checked_in' && isOnBreak ? 'text-amber-600 dark:text-amber-400'
                  : 'text-indigo-600 dark:text-indigo-400'
                )}>
                  {checkInStatus === 'not_started' && (
                    shiftStatusInfo?.currentEntryStatus === 'half_day' ? '🔴 Half Day Zone'
                    : shiftStatusInfo?.currentEntryStatus === 'late'   ? '🟡 Late Entry Zone'
                    : '⏳ Pending Check In'
                  )}
                  {checkInStatus === 'checked_in' && (isOnBreak ? '☕ On Break' : '✅ Present (On Duty)')}
                  {checkInStatus === 'completed' && '✅ Present (Shift Completed)'}
                </span>
              </div>

            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
