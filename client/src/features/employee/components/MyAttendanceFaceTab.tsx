import {
  Camera,
  Scan,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
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
  AlertCircle,
  Calendar,
  CalendarOff,
  Send,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { apiClient } from '@/config/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface MyAttendanceFaceTabProps {
  user: any;
  employee: any;
  checkInStatus: 'not_started' | 'checked_in' | 'completed';
  checkInTime: string;
  checkOutTime: string;
  workDuration: string;
  onPunchSuccess?: () => void;
}

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

export function MyAttendanceFaceTab({
  user,
  employee,
  checkInStatus,
  checkInTime,
  checkOutTime,
  workDuration,
  onPunchSuccess,
}: MyAttendanceFaceTabProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [lastPunchResult, setLastPunchResult] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // GPS Geofence Location State (700m Radius Limit)
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

        let minDistance = Infinity;
        let matchedOffice = APPROVED_GEOFENCES[0];

        APPROVED_GEOFENCES.forEach((office) => {
          const dist = calculateDistanceMeters(userLat, userLng, office.lat, office.lng);
          if (dist < minDistance) {
            minDistance = dist;
            matchedOffice = office;
          }
        });

        const within700m = minDistance <= 700;

        if (within700m) {
          setGeofenceStatus({
            isValid: true,
            distanceMeters: minDistance,
            nearestOfficeName: matchedOffice.name,
            message: `Inside 700m Geofence: ${matchedOffice.name} (${minDistance}m away)`,
          });
        } else {
          setGeofenceStatus({
            isValid: false,
            distanceMeters: minDistance,
            nearestOfficeName: matchedOffice.name,
            message: `Outside 700m office radius! You are ${minDistance}m away from ${matchedOffice.name}.`,
          });
        }
        setLocLoading(false);
      },
      (err) => {
        console.warn('GPS location error:', err);
        setGeofenceStatus({
          isValid: false,
          distanceMeters: 0,
          nearestOfficeName: 'Arham IT Solution / Kosqu Technolab',
          message: 'Unable to access GPS location. Click the tune/lock icon 🔒 in browser address bar to allow Location permission.',
        });
        setLocLoading(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    fetchUserGpsLocation();
  }, []);

  const empId = user?.employeeId || user?.id || employee?.id || 0;
  const empName = employee
    ? `${employee.firstName} ${employee.lastName}`.trim()
    : `${user?.firstName || 'Employee'} ${user?.lastName || ''}`.trim();
  const empCode = employee?.employeeCode || user?.employeeCode || `EMP-${String(empId).padStart(4, '0')}`;

  // Assigned Shift State
  const [shiftInfo, setShiftInfo] = useState<{
    name: string;
    startTime: string;
    endTime: string;
    hours: string;
  }>({
    name: '',
    startTime: '',
    endTime: '',
    hours: '',
  });

  useEffect(() => {
    const fetchShift = async () => {
      try {
        const res = await apiClient.get('/attendance/my-shift');
        const s = res.data?.data;
        if (s) {
          setShiftInfo({
            name: s.shift_name || s.shiftName || 'No Shift Assigned',
            startTime: s.start_time || s.startTime || '--',
            endTime: s.end_time || s.endTime || '--',
            hours: s.duration_hours ? `${s.duration_hours} Hours` : '--',
          });
        }
      } catch (e) {
        console.warn('Failed to fetch assigned shift in MyAttendanceFaceTab:', e);
      }
    };
    fetchShift();
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // ── Holiday / Week-Off Gate State ─────────────────────────────────
  const [todayHoliday, setTodayHoliday] = useState<{
    isHoliday: boolean;
    isWeekOff: boolean;
    holidayName?: string;
    isPunchAllowed: boolean;
  } | null>(null);
  const [isAttendanceBlocked, setIsAttendanceBlocked] = useState<boolean>(false);
  const [hasPendingRequest, setHasPendingRequest] = useState<boolean>(false);

  // Request Holiday Work Modal State
  const [isRequestModalOpen, setIsRequestModalOpen] = useState<boolean>(false);
  const [requestReason, setRequestReason] = useState<string>('');
  const [requestHours, setRequestHours] = useState<number>(8);
  const [requestSubmitting, setRequestSubmitting] = useState<boolean>(false);

  useEffect(() => {
    const fetchHolidayStatus = async () => {
      try {
        const res = await apiClient.get('/attendance/status');
        if (res.data?.data) {
          const st = res.data.data;
          if (typeof st.isHoliday === 'boolean' || typeof st.isWeekOff === 'boolean') {
            setTodayHoliday({
              isHoliday: !!st.isHoliday,
              isWeekOff: !!st.isWeekOff,
              holidayName: st.holidayName,
              isPunchAllowed: st.isPunchAllowedOnHoliday !== false,
            });
          }
          if (typeof st.isAttendanceBlocked === 'boolean') {
            setIsAttendanceBlocked(st.isAttendanceBlocked);
          }
          if (typeof st.hasPendingRequest === 'boolean') {
            setHasPendingRequest(st.hasPendingRequest);
          }
        }
      } catch (e) {
        console.warn('[MyAttendanceFaceTab] Holiday status fetch error:', e);
      }
    };
    fetchHolidayStatus();
  }, []);

  const handleHolidayWorkRequest = async () => {
    if (!requestReason.trim()) {
      toast.error('Please enter a reason for working on this holiday.');
      return;
    }
    setRequestSubmitting(true);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      await apiClient.post('/attendance/overtime', {
        overtimeDate: todayStr,
        overtimeHours: Number(requestHours) || 8,
        overtimeType: todayHoliday?.isHoliday ? 'holiday_work' : 'weekend_work',
        reason: requestReason,
      });
      toast.success('Holiday work permission request submitted successfully to HR/Manager!');
      setHasPendingRequest(true);
      setIsRequestModalOpen(false);
      setRequestReason('');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to submit request. Please try again.');
    } finally {
      setRequestSubmitting(false);
    }
  };

  useEffect(() => {
    if (isCameraActive && stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [isCameraActive, stream]);

  const startCamera = async () => {
    try {
      setCameraError(null);
      setErrorMsg(null);
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
      console.error('Camera access error:', err);
      setCameraError('Unable to access webcam. Please allow camera permissions in your browser.');
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

  const handleBiometricPunch = async (requestedAction: 'auto' | 'check_in' | 'check_out' = 'auto') => {
    if (!geofenceStatus.isValid) {
      toast.error(geofenceStatus.message || 'Check-in blocked! You must be within 700m radius of Arham IT Solution or Kosqu Technolab.');
      return;
    }

    // Holiday / Week-Off Gate
    if (isAttendanceBlocked) {
      const label = todayHoliday?.isHoliday
        ? `Today is a public holiday (${todayHoliday.holidayName})`
        : todayHoliday?.isWeekOff
        ? `Today is a weekly off (${todayHoliday.holidayName})`
        : 'Attendance is disabled today';
      toast.error(`${label}. Contact HR to enable holiday work permission.`);
      return;
    }

    if (!isCameraActive || !videoRef.current || !canvasRef.current) {
      toast.error('Please start the camera before verifying face biometric.');
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setErrorMsg(null);
    setIsProcessing(true);

    try {
      // Capture 3 continuous frames for robust liveness & face identification
      const images: string[] = [];
      for (let i = 0; i < 3; i++) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        images.push(canvas.toDataURL('image/jpeg', 0.92));
        if (i < 2) {
          await new Promise((resolve) => setTimeout(resolve, 150));
        }
      }

      // CRITICAL: Explicitly pass employeeId so backend restricts matching ONLY to this logged-in employee account!
      const res = await apiClient.post('/attendance/biometric/verify-punch', {
        images,
        action: requestedAction,
        employeeId: String(empId),
        location: gpsLocation ? { latitude: gpsLocation.lat, longitude: gpsLocation.lng } : undefined,
      });

      if (res.data?.success || res.data?.attendanceRecord || res.data?.record) {
        setLastPunchResult(res.data);
        const actionType = res.data.action === 'check_in' ? 'Check In' : 'Check Out';
        const formattedPunchTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        toast.success(
          `Face Verified Successfully! ${actionType} recorded for ${empName} at ${formattedPunchTime}. Status: Present (${shiftInfo.name} ${shiftInfo.startTime} - ${shiftInfo.endTime})`
        );

        if (onPunchSuccess) {
          onPunchSuccess();
        }
      } else {
        const message = res.data?.message || 'Face recognition verification failed';
        setErrorMsg(message);
        toast.error(message);
      }
    } catch (err: any) {
      console.error('Biometric punch error:', err);
      const apiMsg = err.response?.data?.message || err.message || 'Face verification failed.';
      const cleanError = apiMsg.includes('did not match')
        ? `Face Mismatch: The captured face does not match the registered profile for ${empName}.`
        : apiMsg;
      setErrorMsg(cleanError);
      toast.error(cleanError);
    } font: {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto font-sans select-none">
      <canvas ref={canvasRef} className="hidden" />

      {/* ─────────────────────────────────────────────────────────────
          ASSIGNED SHIFT & EMPLOYEE LOCK CARD
      ───────────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/20 rounded-3xl p-6 shadow-xl text-white relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-indigo-500/10 blur-2xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-2xl font-black text-white shadow-lg overflow-hidden shrink-0">
              {employee?.avatarUrl || user?.avatarUrl ? (
                <img src={employee?.avatarUrl || user?.avatarUrl} alt={empName} className="h-full w-full object-cover" />
              ) : (
                <span>{empName.slice(0, 2).toUpperCase()}</span>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-extrabold text-white">{empName}</h2>
                <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                  Verified Account
                </Badge>
              </div>

              <p className="text-xs text-indigo-200/90 font-medium mt-0.5">
                Employee Code: <span className="font-mono font-bold text-white bg-white/15 px-2 py-0.5 rounded">{empCode}</span>
              </p>

              <p className="text-[11px] text-emerald-400 font-semibold mt-1 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Locked to Account ID #{empId} (Single Employee Matching)
              </p>
            </div>
          </div>

          {/* ASSIGNED SHIFT TIMING BANNER */}
          <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-3.5 min-w-[220px] text-right shadow-inner w-full md:w-auto">
            <div className="flex items-center justify-end gap-1.5 text-amber-300 text-xs font-bold">
              <Clock className="w-3.5 h-3.5 animate-pulse" /> {shiftInfo.name}
            </div>
            <p className="text-sm font-black text-white mt-1">
              {shiftInfo.startTime} – {shiftInfo.endTime}
            </p>
            <p className="text-[10px] text-indigo-200 font-medium">Standard 9-Hour Working Shift</p>
          </div>
        </div>
      </div>

      {/* ── HOLIDAY / WEEK-OFF BLOCKED BANNER ────────────────────────────── */}
      {todayHoliday && (todayHoliday.isHoliday || todayHoliday.isWeekOff) && (
        <div className={cn(
          'relative overflow-hidden rounded-3xl border-2 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl transition-all',
          isAttendanceBlocked
            ? todayHoliday.isHoliday
              ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-600 text-blue-900 dark:text-blue-200'
              : 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-600 text-amber-900 dark:text-amber-200'
            : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-600 text-emerald-900 dark:text-emerald-200'
        )}>
          <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full opacity-20 blur-3xl pointer-events-none"
            style={{ background: isAttendanceBlocked ? (todayHoliday.isHoliday ? '#3b82f6' : '#f97316') : '#10b981' }} />

          <div className="flex items-start gap-3.5 flex-1 min-w-0">
            <div className={cn(
              'p-2.5 rounded-2xl shrink-0 mt-0.5 border shadow-2xs',
              isAttendanceBlocked
                ? todayHoliday.isHoliday
                  ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-300 border-blue-200 dark:border-blue-700'
                  : 'bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-300 border-amber-200 dark:border-amber-700'
                : 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700'
            )}>
              {todayHoliday.isHoliday ? <Calendar className="w-5 h-5" /> : <CalendarOff className="w-5 h-5" />}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-black tracking-tight">
                  {todayHoliday.isHoliday
                    ? `Public Holiday — ${todayHoliday.holidayName}`
                    : `Weekly Off — ${todayHoliday.holidayName ?? 'Rest Day'}`}
                </h2>
                <span className={cn(
                  'text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider',
                  isAttendanceBlocked
                    ? 'bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-900/40 dark:text-rose-300 dark:border-rose-700'
                    : 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700'
                )}>
                  {isAttendanceBlocked ? 'Punch Blocked' : 'Punch Allowed'}
                </span>
              </div>
              <p className="text-xs font-medium opacity-85 mt-1">
                {isAttendanceBlocked
                  ? 'Attendance punch is disabled today. You can submit a work permission request for manager/HR approval.'
                  : `You are permitted to punch attendance today (${todayHoliday.isHoliday ? 'holiday' : 'week-off'} work approved).`}
              </p>
            </div>
          </div>

          {/* RIGHT SIDE BUTTON / STATUS BADGE */}
          {isAttendanceBlocked && (
            <div className="shrink-0 z-10 w-full sm:w-auto">
              {hasPendingRequest ? (
                <div className="flex items-center gap-2 bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-200 px-3.5 py-2 rounded-2xl text-xs font-bold shadow-xs">
                  <Clock className="w-4 h-4 animate-spin text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>Request Pending HR Approval</span>
                </div>
              ) : (
                <Button
                  size="sm"
                  onClick={() => setIsRequestModalOpen(true)}
                  className="h-9 px-4 text-xs font-bold gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm rounded-xl w-full sm:w-auto"
                >
                  <Send className="w-3.5 h-3.5" /> Request Permission to Work Today
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          FACE RECOGNITION TERMINAL & CAMERA SCREEN
      ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* CAMERA FEED & SCANNER DISPLAY (2 Columns) */}
        <Card className="lg:col-span-2 border rounded-3xl shadow-xl overflow-hidden bg-card border-border">
          <CardHeader className="border-b border-border/60 bg-muted/20 pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-extrabold text-foreground flex items-center gap-2">
                <Camera className="w-5 h-5 text-indigo-500" /> Face Recognition Attendance Terminal
              </CardTitle>
              <Badge variant="outline" className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 text-xs font-bold">
                {isCameraActive ? 'Live Video Stream' : 'Camera Standby'}
              </Badge>
            </div>
            <CardDescription className="text-xs text-muted-foreground">
              Position your face inside the targeting frame to check in or check out for today's shift.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 space-y-4">
            {/* GPS GEOFENCE LOCATION STATUS BANNER (700m Radius Limit) */}
            <div className={cn(
              "p-3 rounded-2xl border text-xs flex items-center justify-between gap-3 font-semibold transition-all",
              geofenceStatus.isValid
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                : "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300"
            )}>
              <div className="flex items-center gap-2.5">
                <MapPin className={cn("w-4 h-4 shrink-0", geofenceStatus.isValid ? "text-emerald-500" : "text-rose-500")} />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold">{geofenceStatus.isValid ? 'GPS Geofence Verified (700m Radius)' : 'Outside Geofence Area (700m Limit)'}</span>
                    <Badge className={cn("text-[9px] font-bold px-2 py-0.5", geofenceStatus.isValid ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-rose-500/20 text-rose-400 border-rose-500/30")}>
                      {geofenceStatus.isValid ? 'Check-In Allowed' : 'Check-In Blocked'}
                    </Badge>
                  </div>
                  <p className="text-[11px] opacity-90 font-medium mt-0.5">{geofenceStatus.message}</p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={fetchUserGpsLocation}
                disabled={locLoading}
                className="h-8 px-3 rounded-xl border-current text-[11px] font-bold gap-1 shrink-0"
              >
                <RefreshCw className={cn("w-3 h-3", locLoading && "animate-spin")} /> Re-check GPS
              </Button>
            </div>

            {cameraError && (
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" /> {cameraError}
              </div>
            )}

            {errorMsg && (
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" /> {errorMsg}
              </div>
            )}

            {/* VIDEO FEED TERMINAL CONTAINER */}
            <div className="relative rounded-2xl bg-slate-950 overflow-hidden aspect-video border-2 border-indigo-500/30 shadow-2xl flex items-center justify-center">
              {isCameraActive ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover transform -scale-x-100"
                  />

                  {/* FUTURISTIC SCANNER OVERLAY FRAME */}
                  <div className="absolute inset-0 pointer-events-none border-4 border-indigo-500/40 rounded-2xl m-3 flex flex-col justify-between p-4">
                    <div className="flex justify-between">
                      <div className="w-8 h-8 border-t-4 border-l-4 border-indigo-400 rounded-tl-lg" />
                      <div className="w-8 h-8 border-t-4 border-r-4 border-indigo-400 rounded-tr-lg" />
                    </div>

                    {/* Scanning Laser Line */}
                    <div className="w-full h-1 bg-gradient-to-r from-transparent via-indigo-400 to-transparent animate-pulse shadow-lg shadow-indigo-500/50" />

                    <div className="flex justify-between items-end">
                      <div className="w-8 h-8 border-b-4 border-l-4 border-indigo-400 rounded-bl-lg" />
                      <div className="w-8 h-8 border-b-4 border-r-4 border-indigo-400 rounded-br-lg" />
                    </div>
                  </div>

                  {/* Top Scan Status Badge */}
                  <div className="absolute top-4 left-4 bg-slate-950/80 backdrop-blur-md px-3 py-1 rounded-full border border-indigo-500/40 text-[10px] text-white font-bold flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    Targeting: {empName} ({empCode})
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center p-8 text-center space-y-3">
                  <div className="h-16 w-16 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                    <VideoOff className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Webcam Standby</h4>
                    <p className="text-xs text-slate-400 mt-0.5">Click "Start Camera Terminal" to launch face recognition</p>
                  </div>
                  <Button
                    onClick={startCamera}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-2 rounded-xl shadow-lg gap-2"
                  >
                    <Video className="w-4 h-4" /> Start Camera Terminal
                  </Button>
                </div>
              )}
            </div>

            {/* ACTION CONTROLS */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              {isCameraActive ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={stopCamera}
                  className="text-xs font-semibold rounded-xl"
                >
                  <VideoOff className="w-3.5 h-3.5 mr-1 text-rose-500" /> Close Camera
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={startCamera}
                  className="text-xs font-semibold rounded-xl"
                >
                  <Video className="w-3.5 h-3.5 mr-1 text-indigo-500" /> Turn On Camera
                </Button>
              )}

              <div className="flex items-center gap-2">
                <Button
                  disabled={!geofenceStatus.isValid || locLoading || !isCameraActive || isProcessing || checkInStatus === 'completed' || isAttendanceBlocked}
                  onClick={() => handleBiometricPunch(checkInStatus === 'checked_in' ? 'check_out' : 'check_in')}
                  className={cn(
                    'text-xs font-extrabold px-6 py-2.5 rounded-xl shadow-md gap-2 transition-all',
                    (!geofenceStatus.isValid || isAttendanceBlocked)
                      ? 'bg-slate-400 dark:bg-slate-800 text-slate-200 dark:text-slate-400 cursor-not-allowed border border-rose-500/30'
                      : checkInStatus === 'checked_in'
                      ? 'bg-amber-600 hover:bg-amber-700 text-white'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  )}
                  title={
                    isAttendanceBlocked && (todayHoliday?.isHoliday || todayHoliday?.isWeekOff)
                      ? `${todayHoliday?.isHoliday ? 'Public Holiday' : 'Weekly Off'}: ${todayHoliday?.holidayName}. Contact HR to allow punch.`
                      : !geofenceStatus.isValid
                      ? 'Check-in is disabled outside 700m office radius'
                      : ''
                  }
                >
                  {locLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Verifying GPS...
                    </>
                  ) : isProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Verifying Face...
                    </>
                  ) : isAttendanceBlocked && todayHoliday?.isHoliday ? (
                    <>
                      <Calendar className="w-4 h-4 text-blue-400" /> Holiday ({todayHoliday.holidayName})
                    </>
                  ) : isAttendanceBlocked && todayHoliday?.isWeekOff ? (
                    <>
                      <CalendarOff className="w-4 h-4 text-amber-400" /> Week Off ({todayHoliday?.holidayName})
                    </>
                  ) : !geofenceStatus.isValid ? (
                    <>
                      <MapPin className="w-4 h-4 text-rose-400" /> Outside 700m Radius (Blocked)
                    </>
                  ) : (
                    <>
                      <Scan className="w-4 h-4" />
                      {checkInStatus === 'not_started' && 'Verify & Check In (09:30 AM Shift)'}
                      {checkInStatus === 'checked_in' && 'Verify & Check Out (18:30 PM Shift)'}
                      {checkInStatus === 'completed' && 'Shift Completed Today'}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* RIGHT SIDE: TODAY'S PUNCH STATUS & SHIFT SUMMARY */}
        <Card className="border rounded-3xl shadow-xl overflow-hidden bg-card border-border flex flex-col justify-between">
          <CardHeader className="border-b border-border/60 bg-muted/20 pb-3">
            <CardTitle className="text-base font-extrabold text-foreground flex items-center gap-2">
              <Clock className="w-4.5 h-4.5 text-emerald-500" /> Today's Attendance
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Real-time check-in, check-out & shift status
            </CardDescription>
          </CardHeader>

          <CardContent className="p-5 space-y-4 flex-1 flex flex-col justify-between">
            {/* Status Badge Box */}
            <div className="p-4 rounded-2xl bg-muted/30 border border-border/60 text-center space-y-1">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-extrabold block">Shift Duty Status</span>
              <Badge
                className={cn(
                  'px-3 py-1 text-xs font-black uppercase tracking-wider',
                  checkInStatus === 'not_started' && 'bg-slate-500/20 text-slate-700 dark:text-slate-300 border-slate-500/30',
                  checkInStatus === 'checked_in' && 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
                  checkInStatus === 'completed' && 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                )}
              >
                {checkInStatus === 'not_started' && 'Off Duty (Pending Check In)'}
                {checkInStatus === 'checked_in' && 'On Duty (Present)'}
                {checkInStatus === 'completed' && 'Completed (Present)'}
              </Badge>
            </div>

            {/* Time Grid */}
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="bg-muted/40 p-3 rounded-2xl border border-border/50">
                <span className="text-[10px] text-muted-foreground font-extrabold uppercase block">Check In Time</span>
                <span className="text-base font-mono font-black text-foreground block mt-1">{checkInTime}</span>
              </div>

              <div className="bg-muted/40 p-3 rounded-2xl border border-border/50">
                <span className="text-[10px] text-muted-foreground font-extrabold uppercase block">Check Out Time</span>
                <span className="text-base font-mono font-black text-foreground block mt-1">{checkOutTime}</span>
              </div>
            </div>

            {/* Work Duration Card */}
            <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-center space-y-0.5">
              <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-extrabold uppercase block">Total Shift Work Duration</span>
              <span className="text-lg font-mono font-black text-indigo-600 dark:text-indigo-400 block">{workDuration}</span>
            </div>

            {/* Shift Rules Box */}
            <div className="p-3 rounded-2xl bg-muted/20 border border-border/40 text-[11px] space-y-1 text-muted-foreground">
              <p className="font-bold text-foreground flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-500" /> Shift Rules ({shiftInfo.name || 'No Shift'})
              </p>
              <p>• Standard Check-In: 09:30 AM</p>
              <p>• Standard Check-Out: 06:30 PM (18:30)</p>
              <p>• Stored in Attendance Reports as <strong className="text-emerald-600 dark:text-emerald-400">Present</strong>.</p>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* ── REQUEST HOLIDAY WORK PERMISSION DIALOG ───────────────────────── */}
      <Dialog open={isRequestModalOpen} onOpenChange={setIsRequestModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" /> Request Holiday Work Permission
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Submit a request to HR/Manager for permission to punch attendance on today's {todayHoliday?.isHoliday ? 'holiday' : 'weekly off'}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="p-3 rounded-xl bg-muted/40 border border-border/60 text-xs space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-medium">Holiday / Off Day:</span>
                <strong className="text-foreground font-bold">{todayHoliday?.holidayName || 'Public Holiday'}</strong>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-medium">Date:</span>
                <span className="font-mono text-foreground font-semibold">{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Expected Work Hours</label>
              <Input
                type="number"
                min={1}
                max={24}
                value={requestHours}
                onChange={(e) => setRequestHours(Number(e.target.value))}
                placeholder="e.g. 8"
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Reason / Business Description *</label>
              <Textarea
                rows={3}
                value={requestReason}
                onChange={(e) => setRequestReason(e.target.value)}
                placeholder="Describe why you need to work today (e.g. Urgent deployment, client support, maintenance)..."
                className="text-xs resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsRequestModalOpen(false)}
              disabled={requestSubmitting}
              className="text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleHolidayWorkRequest}
              disabled={requestSubmitting || !requestReason.trim()}
              className="text-xs font-bold gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {requestSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              {requestSubmitting ? 'Submitting...' : 'Submit Work Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
