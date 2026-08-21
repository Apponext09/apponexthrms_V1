import React, { useState, useEffect, useRef } from 'react';
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
  Video,
  VideoOff,
  Zap,
  Volume2,
  VolumeX,
  AlertTriangle,
  Crown,
  CalendarCheck,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/config/api';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useEmployee } from '@/features/employee/hooks/useEmployees';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const friendlyBiometricError = (error: any, fallback: string): string => {
  const message = error?.response?.data?.message;
  if (typeof message !== 'string' || !message.trim()) return fallback;
  const isTech =
    /(select\s+.+\s+from|insert\s+into|update\s+.+\s+set|delete\s+from|sql|query|knex|bindings?|errno|er_[a-z_]+|unknown column|doesn't exist|database)/i.test(
      message
    );
  return isTech ? fallback : message;
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function CeoFacePunchPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const employeeId = user?.employeeId || user?.id || 0;
  const { employee } = useEmployee(employeeId);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Camera state
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [savedProfilePhoto, setSavedProfilePhoto] = useState<string | null>(null);
  const [punchAction, setPunchAction] = useState<'check_in' | 'check_out'>('check_in');
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  // Today's status
  const [checkInStatus, setCheckInStatus] = useState<'not_started' | 'checked_in' | 'completed'>('not_started');
  const [checkInTime, setCheckInTime] = useState<string>('--');
  const [checkOutTime, setCheckOutTime] = useState<string>('--');

  // Biometric enrollment
  const [enrollmentStatus, setEnrollmentStatus] = useState<'loading' | 'enrolled' | 'not_enrolled'>('loading');

  const empName = employee
    ? `${employee.firstName} ${employee.lastName}`.trim()
    : `${user?.firstName || 'CEO'} ${user?.lastName || ''}`.trim();
  const empCode = employee?.employeeCode || (employeeId ? `EMP-${String(employeeId).padStart(4, '0')}` : 'CEO-0001');

  const formatTime = (d: Date) =>
    d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

  // ── Fetch today's attendance status ──────────────────────────────────────
  const fetchTodayStatus = async () => {
    try {
      const res = await apiClient.get('/attendance/status');
      const st = res.data?.data;
      if (!st) return;
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
        setCheckInTime('--');
        setCheckOutTime('--');
        setPunchAction('check_in');
      }
    } catch (err) {
      console.warn('CEO face punch: fetch status failed', err);
    }
  };

  // ── Enrollment check ──────────────────────────────────────────────────────
  const fetchEnrollmentStatus = async () => {
    if (!employeeId) return;
    try {
      const res = await apiClient.get('/attendance/biometric/status', {
        params: { employeeId: String(employeeId) },
      });
      const data = res.data?.data;
      setEnrollmentStatus(data?.isEnrolled ? 'enrolled' : 'not_enrolled');
    } catch {
      setEnrollmentStatus('not_enrolled');
    }
  };

  useEffect(() => {
    fetchTodayStatus();
    fetchEnrollmentStatus();
  }, []);

  // ── Camera ────────────────────────────────────────────────────────────────
  const startCamera = async () => {
    try {
      setCameraError(null);
      setCapturedImage(null);
      setSuccessMsg(null);
      setSavedProfilePhoto(null);
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError('Webcam not supported (requires HTTPS or localhost).');
        setIsCameraActive(false);
        return;
      }
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false,
      });
      setStream(mediaStream);
      setIsCameraActive(true);
      if (videoRef.current) videoRef.current.srcObject = mediaStream;
    } catch (err: any) {
      if (err?.name === 'NotAllowedError') setCameraError('Camera permission denied. Allow camera access and retry.');
      else if (err?.name === 'NotFoundError') setCameraError('No camera device found.');
      else setCameraError('Unable to access camera.');
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (stream) { stream.getTracks().forEach((t) => t.stop()); setStream(null); }
    setIsCameraActive(false);
  };

  useEffect(() => {
    startCamera();
    return () => { stopCamera(); };
  }, []);

  useEffect(() => {
    if (isCameraActive && stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [isCameraActive, stream]);

  const grabFrame = (): string | null => {
    if (videoRef.current && canvasRef.current) {
      const v = videoRef.current;
      const c = canvasRef.current;
      if (v.readyState >= 2 && v.videoWidth > 0) {
        c.width = v.videoWidth || 640;
        c.height = v.videoHeight || 480;
        const ctx = c.getContext('2d');
        if (ctx) { ctx.drawImage(v, 0, 0, c.width, c.height); return c.toDataURL('image/jpeg', 0.92); }
      }
    }
    return null;
  };

  const captureVerificationBurst = async (): Promise<string[]> => {
    const images: string[] = [];
    for (let i = 0; i < 3; i++) {
      const f = grabFrame();
      if (f) images.push(f);
      if (i < 2) await new Promise((r) => window.setTimeout(r, 180));
    }
    return images;
  };

  // ── Voice ─────────────────────────────────────────────────────────────────
  const speak = (text: string) => {
    if (!voiceEnabled) return;
    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utt = new SpeechSynthesisUtterance(text);
        utt.rate = 0.92;
        utt.lang = 'en-IN';
        const voices = window.speechSynthesis.getVoices();
        const indVoice = voices.find(
          (v) => v.lang === 'en-IN' || v.name.toLowerCase().includes('india')
        );
        if (indVoice) utt.voice = indVoice;
        window.speechSynthesis.speak(utt);
      }
    } catch { /* silent */ }
  };

  useEffect(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
    }
  }, []);

  // ── Biometric Punch (No Shift or Geofence Constraints for CEO) ────────────
  const handlePunch = async () => {
    if (enrollmentStatus === 'not_enrolled') {
      toast.error('Face not enrolled. Please enroll your face first.');
      speak('Face biometric not enrolled. Please contact HR to enroll your face.');
      return;
    }

    const images = capturedImage ? [capturedImage] : await captureVerificationBurst();
    if (images.length === 0) {
      toast.error('Face capture failed. Ensure camera is active.');
      speak('Face capture failed. Please position face inside frame.');
      return;
    }

    try {
      setBiometricLoading(true);
      setSuccessMsg(null);

      // We omit latitude/longitude in location object so backend geofence rule is not triggered
      const res = await apiClient.post('/attendance/biometric/verify-punch', {
        images,
        action: punchAction,
        employeeId: String(employeeId), // Lock to CEO's own employee record
      });

      if (res.data?.success) {
        const isCheckIn = res.data.action === 'check_in';
        const matchedName = res.data.matchedEmployee?.name || empName;
        const matchedCode = res.data.matchedEmployee?.employeeCode || empCode;
        const matchedPhoto = res.data.matchedEmployee?.profilePhoto;

        if (matchedPhoto) setSavedProfilePhoto(matchedPhoto);

        const msg = `${matchedName} has checked ${isCheckIn ? 'in' : 'out'} successfully`;
        setCapturedImage(images[0]);
        setSuccessMsg(msg);
        stopCamera();

        toast.success(msg, {
          description: `Executive Direct Punch • Code: ${matchedCode}`,
          duration: 6000,
        });

        speak(`${msg}. Executive attendance marked.`);
        fetchTodayStatus();
      } else {
        const errText = res.data?.message || 'Face recognition failed.';
        toast.error(errText);
        speak('Face match failed. Please position face clearly.');
      }
    } catch (err: any) {
      const errMsg = friendlyBiometricError(err, 'Unable to mark biometric attendance. Please try again.');
      toast.error(errMsg);
      speak('Attendance could not be marked. Please try again.');
    } finally {
      setBiometricLoading(false);
    }
  };

  // ── Derived values ────────────────────────────────────────────────────────
  const now = new Date();
  const todayStr = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  const statusBadge = checkInStatus === 'completed'
    ? { label: 'Checked Out', color: 'bg-rose-500/10 text-rose-600 border-rose-500/30' }
    : checkInStatus === 'checked_in'
    ? { label: 'Checked In', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' }
    : { label: 'Not Checked In', color: 'bg-amber-500/10 text-amber-700 border-amber-500/30' };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4 pb-12 select-none">
      <canvas ref={canvasRef} className="hidden" />

      {/* ── PAGE HEADER ────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-card border border-border/80 p-4 rounded-xl shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-primary/10 text-primary shrink-0">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-black text-foreground tracking-tight">
                CEO Face Punch Terminal
              </h1>
              <Badge className="bg-primary/10 text-primary border border-primary/20 font-bold text-[10px] px-2">
                <Crown className="w-2.5 h-2.5 mr-1" />
                EXECUTIVE DIRECT PUNCH
              </Badge>
              <Badge className={cn('font-bold text-[10px] px-2 border', statusBadge.color)}>
                {statusBadge.label}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {todayStr} · {timeStr}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setVoiceEnabled((v) => !v)}
            className="h-8 px-2 text-xs"
          >
            {voiceEnabled ? <Volume2 className="w-3.5 h-3.5 text-primary" /> : <VolumeX className="w-3.5 h-3.5 text-muted-foreground" />}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate('/analytics/ceo-attendance')}
            className="h-8 text-xs font-bold gap-1.5"
          >
            <CalendarCheck className="w-3.5 h-3.5 text-primary" />
            My Attendance Report
          </Button>
        </div>
      </div>

      {/* ── ENROLLMENT WARNING ──────────────────────────────────────────── */}
      {enrollmentStatus === 'not_enrolled' && (
        <div className="p-3.5 rounded-xl border border-amber-500/40 bg-amber-500/10 flex items-start gap-2.5 text-xs font-semibold text-amber-800 dark:text-amber-300">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Face Not Enrolled</p>
            <p className="font-medium text-amber-700 dark:text-amber-400 mt-0.5">
              Your biometric face has not been enrolled in the system. Please ask HR to enroll your face photo via the Employee Biometric Management panel before using this terminal.
            </p>
          </div>
        </div>
      )}

      {/* ── STATUS CARDS (NO SHIFT CONSTRAINTS FOR CEO) ────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Check-In Time', value: checkInTime, icon: Clock, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
          { label: 'Check-Out Time', value: checkOutTime, icon: Clock, color: 'text-rose-600', bg: 'bg-rose-50 border-rose-200' },
          { label: 'Attendance Mode', value: 'Executive Direct Punch', icon: Sparkles, color: 'text-primary', bg: 'bg-primary/5 border-primary/20' },
          {
            label: 'Shift Rules',
            value: 'Unrestricted (CEO)',
            icon: ShieldCheck,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50 border-emerald-200',
          },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className={cn('border p-3.5 flex items-center gap-3', bg)}>
            <div className={cn('p-2 rounded-lg', bg, 'shrink-0')}>
              <Icon className={cn('w-4 h-4', color)} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider truncate">{label}</p>
              <p className={cn('text-sm font-black mt-0.5 truncate', color)}>{value}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* ── MAIN PUNCH PANEL ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Camera feed — 3/5 width */}
        <Card className="lg:col-span-3 border border-border/80 shadow-2xs bg-card overflow-hidden">
          <div className="p-3 border-b border-border/60 flex items-center justify-between bg-muted/20">
            <div className="flex items-center gap-2">
              <Scan className="w-4 h-4 text-primary" />
              <h2 className="font-bold text-xs text-foreground uppercase tracking-wider">
                Face Biometric Scanner — CEO Terminal
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={cn(
                'text-[9px] font-black border px-2.5 py-0.5',
                punchAction === 'check_in'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              )}>
                {punchAction === 'check_in' ? 'Check In Mode' : 'Check Out Mode'}
              </Badge>
            </div>
          </div>

          <div className="relative aspect-video bg-black/90 flex items-center justify-center overflow-hidden">
            {/* Live video */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={cn('w-full h-full object-cover', !isCameraActive && 'hidden')}
              style={{ transform: 'scaleX(-1)' }}
            />

            {/* Success overlay */}
            {successMsg && (
              <div className="absolute inset-0 bg-emerald-950/90 flex flex-col items-center justify-center gap-3 z-10">
                <CheckCircle2 className="w-16 h-16 text-emerald-400 animate-bounce" />
                <p className="text-emerald-300 font-black text-base text-center px-6">{successMsg}</p>
                {savedProfilePhoto && (
                  <img
                    src={savedProfilePhoto}
                    alt="Matched Profile"
                    className="w-20 h-20 rounded-full border-4 border-emerald-400 object-cover shadow-lg"
                  />
                )}
              </div>
            )}

            {/* Camera error */}
            {!isCameraActive && !successMsg && cameraError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center p-6">
                <VideoOff className="w-10 h-10 text-rose-400" />
                <p className="text-xs text-rose-300 font-semibold">{cameraError}</p>
                <Button size="sm" variant="outline" onClick={startCamera} className="h-7 text-[10px] font-bold gap-1 border-rose-400/30 text-rose-300">
                  <RefreshCw className="w-3 h-3" /> Retry Camera
                </Button>
              </div>
            )}

            {/* Not started hint */}
            {!isCameraActive && !cameraError && !successMsg && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <Camera className="w-10 h-10 text-white/40" />
                <p className="text-xs text-white/50 font-semibold">Camera inactive</p>
                <Button size="sm" variant="outline" onClick={startCamera} className="h-7 text-[10px] font-bold gap-1">
                  <Video className="w-3 h-3" /> Start Camera
                </Button>
              </div>
            )}

            {/* Face guide overlay */}
            {isCameraActive && !successMsg && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-44 h-52 border-2 border-primary/60 rounded-full opacity-60" />
              </div>
            )}
          </div>

          {/* Punch button row */}
          <div className="p-4 border-t border-border/60 flex items-center justify-between gap-3 bg-muted/10">
            {successMsg ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setCapturedImage(null); setSuccessMsg(null); setSavedProfilePhoto(null); startCamera(); }}
                className="flex-1 h-9 text-xs font-bold gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                New Punch
              </Button>
            ) : (
              <Button
                size="sm"
                disabled={!isCameraActive || biometricLoading || enrollmentStatus === 'not_enrolled'}
                onClick={handlePunch}
                className={cn(
                  'flex-1 h-9 text-xs font-black gap-2 transition-all',
                  punchAction === 'check_in'
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-rose-600 hover:bg-rose-700 text-white'
                )}
              >
                {biometricLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4" />
                )}
                {biometricLoading
                  ? 'Verifying…'
                  : punchAction === 'check_in'
                  ? 'CEO Punch In'
                  : 'CEO Punch Out'}
              </Button>
            )}
          </div>
        </Card>

        {/* Info panel — 2/5 width */}
        <div className="lg:col-span-2 space-y-3">
          {/* CEO Identity Card */}
          <Card className="border border-border/80 shadow-2xs bg-card p-4">
            <div className="flex items-center gap-3 pb-3 border-b border-border/60">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-sm shrink-0">
                {empName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="font-black text-sm text-foreground truncate">{empName}</p>
                <p className="text-[10px] text-muted-foreground font-mono">{empCode}</p>
              </div>
              <Crown className="w-4 h-4 text-amber-500 shrink-0 ml-auto" />
            </div>

            <div className="mt-3 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground font-semibold">Biometric Status</span>
                {enrollmentStatus === 'loading' ? (
                  <span className="text-muted-foreground text-[10px]">Checking…</span>
                ) : enrollmentStatus === 'enrolled' ? (
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[9px] font-bold">
                    <ShieldCheck className="w-2.5 h-2.5 mr-1" /> Enrolled
                  </Badge>
                ) : (
                  <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-[9px] font-bold">
                    <AlertCircle className="w-2.5 h-2.5 mr-1" /> Not Enrolled
                  </Badge>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground font-semibold">Shift Timing</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">None (Direct Access)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground font-semibold">Punch Mode</span>
                <Badge className={cn(
                  'text-[9px] font-black border',
                  punchAction === 'check_in'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                )}>
                  {punchAction === 'check_in' ? 'PUNCH IN' : 'PUNCH OUT'}
                </Badge>
              </div>
            </div>
          </Card>

          {/* Quick instructions */}
          <Card className="border border-border/80 shadow-2xs bg-card p-4">
            <h3 className="font-bold text-xs text-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
              <UserCheck className="w-3.5 h-3.5 text-primary" />
              Executive Direct Punch
            </h3>
            <ul className="space-y-2">
              {[
                'Look directly into the camera',
                'Click "CEO Punch In" to start your attendance log',
                'Click "CEO Punch Out" whenever you leave or finish for the day',
                'No shift boundaries, grace periods, or location restrictions apply',
              ].map((tip, i) => (
                <li key={i} className="flex items-start gap-2 text-[11px] text-muted-foreground">
                  <span className="text-primary font-black shrink-0">{i + 1}.</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </Card>

          {/* Quick links */}
          <Card className="border border-border/80 shadow-2xs bg-card p-4">
            <h3 className="font-bold text-xs text-foreground uppercase tracking-wider mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full h-8 text-xs font-bold justify-start gap-2"
                onClick={() => navigate('/analytics/ceo-attendance')}
              >
                <CalendarCheck className="w-3.5 h-3.5 text-primary" />
                View CEO Attendance Report
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full h-8 text-xs font-bold justify-start gap-2"
                onClick={() => navigate('/attendance')}
              >
                <Clock className="w-3.5 h-3.5 text-primary" />
                Organization Attendance Dashboard
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
