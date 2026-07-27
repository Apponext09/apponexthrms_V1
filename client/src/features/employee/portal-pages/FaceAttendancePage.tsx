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
  Building2,
  Video,
  VideoOff,
  User,
  Zap,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/config/api';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useEmployee } from '@/features/employee/hooks/useEmployees';
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
  const { user } = useAuthStore();
  const employeeId = user?.employeeId || user?.id || 0;
  const { employee } = useEmployee(employeeId);

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
      }
    } catch (err) {
      console.error('Failed to fetch attendance status', err);
    }
  };

  useEffect(() => {
    fetchTodayStatus();
  }, []);

  // Convert existing captured profile photo into face embeddings once on page load
  useEffect(() => {
    apiClient
      .post('/attendance/biometric/sync-existing')
      .catch((error) => console.warn('Biometric profile sync skipped:', error));
  }, []);

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

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

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
          description: `Employee ID: ${matchedCode} • General Shift 09:30 - 18:30`,
          duration: 6000,
        });

        speakVoiceAnnouncement(`${fullMatchMsg}. Attendance marked as present.`);

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
    <div className="max-w-5xl mx-auto space-y-6 font-sans select-none pb-10">
      <canvas ref={canvasRef} className="hidden" />

      {/* HEADER TITLE CARD */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 rounded-3xl border border-indigo-500/20 shadow-xl text-white">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <Camera className="w-6 h-6 text-indigo-400" /> Biometric Face Attendance
            </h1>
            <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
              Exact Admin Engine
            </Badge>
          </div>
          <p className="text-xs text-indigo-200/90 font-medium">
            AI-powered face recognition attendance terminal • Restricted to {empName} ({empCode})
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            className="h-9 px-3 rounded-xl border-white/20 bg-white/10 hover:bg-white/20 text-white text-xs font-bold gap-1.5"
            title="Toggle Voice Announcements"
          >
            {voiceEnabled ? (
              <>
                <Volume2 className="w-4 h-4 text-emerald-400" /> Voice On
              </>
            ) : (
              <>
                <VolumeX className="w-4 h-4 text-rose-400" /> Voice Off
              </>
            )}
          </Button>

          <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl px-4 py-2 text-right">
            <span className="text-[10px] text-amber-300 font-extrabold uppercase block">General Shift</span>
            <span className="text-xs font-mono font-bold text-white">09:30 AM – 06:30 PM (18:30)</span>
          </div>
        </div>
      </div>

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
                  onClick={() => setPunchAction('check_in')}
                  className={cn(
                    'cursor-pointer text-xs font-extrabold px-3 py-1 rounded-full transition-all',
                    punchAction === 'check_in'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  )}
                >
                  Check In
                </Badge>
                <Badge
                  onClick={() => setPunchAction('check_out')}
                  className={cn(
                    'cursor-pointer text-xs font-extrabold px-3 py-1 rounded-full transition-all',
                    punchAction === 'check_out'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  )}
                >
                  Check Out
                </Badge>
              </div>
            </div>
            <CardDescription className="text-xs text-muted-foreground">
              Position your face clearly inside the frame and click Verify & Punch.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 space-y-5">
            {/* HR-ASSIGNED PUNCH LOCATION SELECTOR */}
            {myLocations.length > 0 && (
              <div className="p-3 bg-muted/40 rounded-2xl border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <label className="text-xs font-extrabold text-foreground flex items-center gap-2 shrink-0">
                  <MapPin className="w-4 h-4 text-rose-500" />
                  Select Punch Location (Assigned by HR):
                </label>
                <select
                  value={selectedLocationId}
                  onChange={(e) => setSelectedLocationId(e.target.value)}
                  className="h-9.5 px-3 bg-background border border-border rounded-xl text-xs font-extrabold text-foreground focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition cursor-pointer min-w-[260px]"
                >
                  {myLocations.map((loc) => (
                    <option key={loc.id} value={loc.locationId || loc.id}>
                      📍 {loc.name} {loc.isPrimary ? '(Primary Office)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* GPS GEOFENCE LOCATION STATUS BANNER */}
            <div className={cn(
              "p-3.5 rounded-2xl border text-xs flex items-center justify-between gap-3 font-semibold transition-all",
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
            <div className="relative rounded-2xl bg-slate-950 overflow-hidden aspect-video border-2 border-indigo-500/30 shadow-2xl flex items-center justify-center">
              {capturedImage ? (
                <div className="relative w-full h-full">
                  <img src={capturedImage} alt="Captured Face" className="w-full h-full object-cover transform -scale-x-100" />
                  <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center">
                    <div className="text-center space-y-2 p-4 bg-slate-900/90 rounded-2xl border border-emerald-500/40 shadow-2xl max-w-xs">
                      <div className="h-12 w-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <h4 className="text-sm font-bold text-white">Face Verified & Recorded</h4>
                      <p className="text-[11px] text-emerald-300">{empName} ({empCode})</p>
                      <Button
                        size="sm"
                        onClick={handleRetake}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl px-4 py-1.5 gap-1.5 shadow-md mt-2"
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

                  {/* FUTURISTIC SCANNING FRAME OVERLAY */}
                  <div className="absolute inset-0 pointer-events-none border-4 border-indigo-500/40 rounded-2xl m-3 flex flex-col justify-between p-4">
                    <div className="flex justify-between">
                      <div className="w-8 h-8 border-t-4 border-l-4 border-indigo-400 rounded-tl-lg" />
                      <div className="w-8 h-8 border-t-4 border-r-4 border-indigo-400 rounded-tr-lg" />
                    </div>

                    <div className="w-full h-1 bg-gradient-to-r from-transparent via-indigo-400 to-transparent animate-pulse shadow-lg shadow-indigo-500/50" />

                    <div className="flex justify-between items-end">
                      <div className="w-8 h-8 border-b-4 border-l-4 border-indigo-400 rounded-bl-lg" />
                      <div className="w-8 h-8 border-b-4 border-r-4 border-indigo-400 rounded-br-lg" />
                    </div>
                  </div>

                  <div className="absolute top-4 left-4 bg-slate-950/80 backdrop-blur-md px-3 py-1 rounded-full border border-indigo-500/40 text-[10px] text-white font-bold flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    Live Account Target: {empName} ({empCode})
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center p-8 text-center space-y-3">
                  <div className="h-16 w-16 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                    <VideoOff className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Camera Offline</h4>
                    <p className="text-xs text-slate-400 mt-0.5">Click Start Camera to launch face recognition</p>
                  </div>
                  <Button
                    onClick={startCamera}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-2 rounded-xl shadow-lg gap-2"
                  >
                    <Video className="w-4 h-4" /> Start Camera
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

              <Button
                disabled={!geofenceStatus.isValid || locLoading || biometricLoading || checkInStatus === 'completed'}
                onClick={handleBiometricPunch}
                className={cn(
                  'text-xs font-extrabold px-7 py-3 rounded-xl shadow-lg gap-2 transition-all',
                  !geofenceStatus.isValid
                    ? 'bg-slate-400 dark:bg-slate-800 text-slate-200 dark:text-slate-400 cursor-not-allowed border border-rose-500/30'
                    : punchAction === 'check_in'
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    : 'bg-amber-600 hover:bg-amber-700 text-white'
                )}
                title={!geofenceStatus.isValid ? 'Check-in is disabled outside 700m office radius' : ''}
              >
                {locLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Verifying GPS Geofence...
                  </>
                ) : biometricLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Verifying Face...
                  </>
                ) : !geofenceStatus.isValid ? (
                  <>
                    <MapPin className="w-4 h-4 text-rose-400" /> Outside 700m Radius (Blocked)
                  </>
                ) : (
                  <>
                    <Scan className="w-4 h-4" />
                    {punchAction === 'check_in' ? 'Verify & Check In (09:30 Shift)' : 'Verify & Check Out (18:30 Shift)'}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* RIGHT COLUMN: EMPLOYEE ACCOUNT LOCK & TODAY'S PUNCH STATUS */}
        <div className="space-y-6">
          
          {/* EMPLOYEE VERIFIED CARD */}
          <Card className="border rounded-3xl shadow-xl overflow-hidden bg-card border-border">
            <CardHeader className="border-b border-border/60 bg-muted/20 pb-3">
              <CardTitle className="text-xs font-extrabold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-emerald-500" /> Account Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-xl font-black text-indigo-600 dark:text-indigo-400 overflow-hidden shrink-0">
                  {savedProfilePhoto || employee?.avatarUrl || user?.avatarUrl ? (
                    <img src={savedProfilePhoto || employee?.avatarUrl || user?.avatarUrl} alt={empName} className="h-full w-full object-cover" />
                  ) : (
                    <span>{empName.slice(0, 2).toUpperCase()}</span>
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-bold text-foreground">{empName}</h3>
                  <p className="text-xs font-mono font-semibold text-muted-foreground mt-0.5">{empCode}</p>
                  <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[9px] font-bold mt-1">
                    Biometric Profile Active
                  </Badge>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-muted/30 border border-border/40 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-medium">Shift Type</span>
                  <span className="font-bold text-foreground">General Shift</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-medium">Timing</span>
                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">09:30 AM – 18:30 PM</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* TODAY'S RECORD SUMMARY CARD */}
          <Card className="border rounded-3xl shadow-xl overflow-hidden bg-card border-border">
            <CardHeader className="border-b border-border/60 bg-muted/20 pb-3">
              <CardTitle className="text-xs font-extrabold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-indigo-500" /> Today's Punch Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="bg-muted/40 p-3 rounded-2xl border border-border/50">
                  <span className="text-[10px] text-muted-foreground font-extrabold uppercase block">Check In Time</span>
                  <span className="text-sm font-mono font-black text-foreground block mt-1">{checkInTime}</span>
                </div>

                <div className="bg-muted/40 p-3 rounded-2xl border border-border/50">
                  <span className="text-[10px] text-muted-foreground font-extrabold uppercase block">Check Out Time</span>
                  <span className="text-sm font-mono font-black text-foreground block mt-1">{checkOutTime}</span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-center">
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-extrabold uppercase block">Status</span>
                <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 block mt-0.5 uppercase tracking-wider">
                  {checkInStatus === 'not_started' && 'Pending Check In'}
                  {checkInStatus === 'checked_in' && 'Present (On Duty)'}
                  {checkInStatus === 'completed' && 'Present (Shift Completed)'}
                </span>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
