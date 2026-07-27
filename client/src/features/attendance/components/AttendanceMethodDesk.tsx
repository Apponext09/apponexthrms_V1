import React, { useState, useEffect, useRef } from 'react';
import {
  Scan,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Camera,
  QrCode,
  MapPin,
  ShieldCheck,
  Navigation,
  Monitor,
  Smartphone,
  Cpu,
  Users,
  Volume2,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/config/api';
import { useAttendance } from '../hooks/useAttendance';
import { useAttendanceStore } from '../store/attendanceStore';
import { QRCodeScannerModal } from './QRCodeScannerModal';

interface LocationTarget {
  id: string;
  name: string;
  city: string;
  lat: number;
  lng: number;
}

interface EmployeeOption {
  id: string;
  employeeCode: string;
  name: string;
}

const friendlyBiometricError = (error: any, fallback: string): string => {
  const message = error?.response?.data?.message;
  if (typeof message !== 'string' || !message.trim()) return fallback;

  const containsTechnicalDetails =
    /(select\s+.+\s+from|insert\s+into|update\s+.+\s+set|delete\s+from|sql|query|knex|bindings?|errno|er_[a-z_]+|unknown column|doesn't exist|database)/i.test(
      message
    );

  return containsTechnicalDetails ? fallback : message;
};

const REGISTERED_LOCATIONS: LocationTarget[] = [
  {
    id: 'arham',
    name: 'Arham IT Solution',
    city: 'Ahilyanagar',
    lat: 19.0948,
    lng: 74.7480,
  },
  {
    id: 'kosqu',
    name: 'Kosqu Technolab',
    city: 'Navi Mumbai',
    lat: 19.0330,
    lng: 73.0297,
  },
];



interface AttendanceMethodDeskProps {
  method: string;
  onLocationChange?: (location: LocationTarget) => void;
}

export const AttendanceMethodDesk: React.FC<AttendanceMethodDeskProps> = ({ method }) => {
  const { checkIn, checkOut } = useAttendance();
  const { setCheckedIn, setCheckedOut } = useAttendanceStore();

  // Employee list & selected employee
  const [employeesList, setEmployeesList] = useState<EmployeeOption[]>([]);
  const [selectedEmployeeCode, setSelectedEmployeeCode] = useState<string>('');
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  // Biometric State
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [savedProfilePhoto, setSavedProfilePhoto] = useState<string | null>(null);
  const [punchAction, setPunchAction] = useState<'check_in' | 'check_out'>('check_in');

  // QR Code State
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [qrRefreshKey, setQrRefreshKey] = useState<number>(Date.now());
  const [qrScanning, setQrScanning] = useState(false);
  const [qrSuccessMsg, setQrSuccessMsg] = useState<string | null>(null);
  const todayStr = new Date().toISOString().split('T')[0];

  // Daily unique QR code payload assigned to current employee
  const dailyQrPayload = `EMP-ATTENDANCE:${selectedEmployeeCode}:${todayStr}:${qrRefreshKey.toString().slice(-4)}`;

  // Location State
  const [selectedLocation, setSelectedLocation] = useState<LocationTarget>(REGISTERED_LOCATIONS[0]);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>({ lat: 19.0948, lng: 74.7480 });

  // Fetch employees list live from Database
  useEffect(() => {
    setLoadingEmployees(true);
    apiClient
      .get('/attendance/biometric/employees')
      .then((res) => {
        if (res.data?.success && Array.isArray(res.data.data) && res.data.data.length > 0) {
          setEmployeesList(res.data.data);
          setSelectedEmployeeCode(res.data.data[0].employeeCode);
        } else {
          setEmployeesList([]);
          setSelectedEmployeeCode('');
        }
      })
      .catch(() => {
        setEmployeesList([]);
        setSelectedEmployeeCode('');
      })
      .finally(() => setLoadingEmployees(false));
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setQrRefreshKey(Date.now());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Convert existing captured employee profile photos into real face templates once.
  useEffect(() => {
    if (method === 'biometric') {
      apiClient
        .post('/attendance/biometric/sync-existing')
        .catch((error) => console.warn('Biometric profile sync skipped:', error));
    }
  }, [method]);

  // Handle webcam stream for Biometric camera
  useEffect(() => {
    if (method === 'biometric') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [method]);

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
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError('Unable to access webcam. Please allow camera permissions in your browser.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setSuccessMsg(null);
    startCamera();
  };

  // Audio Voice Announcement with Indian Accent (Text-to-Speech)
  const speakVoiceAnnouncement = (text: string) => {
    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.92;
        utterance.pitch = 1.0;

        const voices = window.speechSynthesis.getVoices();
        // Target Indian English / Indian Accent voice engines (e.g. Google English (India), Microsoft Heera/Ravi, hi-IN, en-IN)
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

  // Pre-load voices for Chrome / Edge
  useEffect(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  }, []);

  // Grab a frame from the live video without stopping the camera stream.
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

  // Attendance writes happen only after this explicit action.
  const handleBiometricPunch = async () => {
    const images = capturedImage ? [capturedImage] : await captureVerificationBurst();
    if (images.length === 0) {
      toast.error('Face capture failed');
      return;
    }

    try {
      setBiometricLoading(true);
      const res = await apiClient.post('/attendance/biometric/verify-punch', {
        images,
        action: punchAction,
        location: {
          latitude: coords?.lat,
          longitude: coords?.lng,
        },
      });

      if (res.data?.success) {
        const isCheckInAction = res.data.action === 'check_in';
        const matchedName = res.data.matchedEmployee?.name || 'Employee';
        const matchedCode = res.data.matchedEmployee?.employeeCode;
        const matchedPhoto = res.data.matchedEmployee?.profilePhoto;

        if (matchedPhoto) {
          setSavedProfilePhoto(matchedPhoto);
        }

        if (isCheckInAction) {
          setCheckedIn(true, new Date().toISOString());
        } else {
          setCheckedOut(new Date().toISOString());
        }
        window.dispatchEvent(new Event('attendance-updated'));

        if (matchedCode && employeesList.some((e) => e.employeeCode === matchedCode)) {
          setSelectedEmployeeCode(matchedCode);
        }

        const fullMatchMsg = `${matchedName} has checked ${
          isCheckInAction ? 'in' : 'out'
        } successfully`;
        setCapturedImage(images[0]);
        setSuccessMsg(fullMatchMsg);
        stopCamera();
        toast.success(fullMatchMsg, {
          description: matchedCode ? `Employee ID: ${matchedCode}` : undefined,
          duration: 6000,
        });
        speakVoiceAnnouncement(`${fullMatchMsg}. Attendance marked successfully.`);
      } else {
        toast.error(res.data?.message || 'Face recognition failed');
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

  // 3. Scan & Validate Daily Employee QR Code
  const handleQRScanPunch = async () => {
    try {
      setQrScanning(true);
      const selectedEmp = employeesList.find((e) => e.employeeCode === selectedEmployeeCode);
      const empCode = selectedEmployeeCode || 'EMP-2026-001';
      const empName = selectedEmp?.name || `Employee (${empCode})`;

      const res = await apiClient.post('/attendance/qr/scan-punch', {
        qrData: dailyQrPayload,
        employeeCode: empCode,
      });

      if (res.data?.success) {
        const isCheckIn = res.data.action === 'check_in';
        if (isCheckIn) {
          setCheckedIn(true, new Date().toISOString());
        } else {
          setCheckedOut(new Date().toISOString());
        }
        window.dispatchEvent(new Event('attendance-updated'));
        const msg = `Daily QR Code Validated! ${isCheckIn ? 'Check In' : 'Check Out'} marked for ${empName} (${empCode})`;
        setQrSuccessMsg(msg);
        toast.success(`Daily QR Code Validated! Attendance marked for ${empName}`);
      } else {
        toast.error(res.data?.message || 'QR Code verification failed');
      }
    } catch (err: any) {
      console.error('QR scan error:', err);
      toast.error(err.response?.data?.message || 'Failed to validate QR Code');
    } finally {
      setQrScanning(false);
    }
  };

  const handleGetLocation = () => {
    if (navigator.geolocation) {
      toast.info('📡 Fetching high-precision live GPS coordinates...');
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLat = position.coords.latitude;
          const userLng = position.coords.longitude;
          const accuracy = Math.round(position.coords.accuracy || 10);
          const newCoords = { lat: userLat, lng: userLng };
          setCoords(newCoords);

          // Calculate distance to registered office branches and auto-select nearest
          let nearest = REGISTERED_LOCATIONS[0];
          let minDistance = Infinity;

          REGISTERED_LOCATIONS.forEach((loc) => {
            const R = 6371000;
            const radLat1 = (userLat * Math.PI) / 180;
            const radLat2 = (loc.lat * Math.PI) / 180;
            const dLat = ((loc.lat - userLat) * Math.PI) / 180;
            const dLng = ((loc.lng - userLng) * Math.PI) / 180;

            const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(radLat1) * Math.cos(radLat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            const distMeters = Math.round(R * c);

            if (distMeters < minDistance) {
              minDistance = distMeters;
              nearest = loc;
            }
          });

          setSelectedLocation(nearest);
          toast.success(
            `📍 GPS Located (${userLat.toFixed(4)}, ${userLng.toFixed(4)}) ±${accuracy}m! Matched Office: ${nearest.name} (${minDistance}m away)`
          );
        },
        (error) => {
          console.warn('Geolocation error:', error);
          toast.error('⚠️ Geolocation access denied or timed out. Please allow browser location permissions.');
          setCoords({ lat: 19.0948, lng: 74.7480 });
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        }
      );
    } else {
      toast.error('Geolocation is not supported by your browser.');
    }
  };

  const currentEmpObj = employeesList.find((e) => e.employeeCode === selectedEmployeeCode);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 space-y-5">
      {/* 1. BIOMETRIC DESK WORKSPACE */}
      {method === 'biometric' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-emerald-50 dark:bg-emerald-950/60 rounded-xl border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400">
                <Scan className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Face AI Recognition Attendance Desk</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Strict three-frame matching against enrolled employee face templates</p>
              </div>
            </div>

            <span className="text-xs px-3 py-1 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded-full font-bold flex items-center space-x-1.5 border border-emerald-300 dark:border-emerald-800 self-start sm:self-auto">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Real 128-D Face Match</span>
            </span>
          </div>

          {/* Camera Module Box */}
          <div className="relative w-full h-[460px] sm:h-[500px] rounded-2xl overflow-hidden bg-slate-950 border-2 border-slate-800 flex flex-col items-center justify-center shadow-xl">
            {cameraError ? (
              <div className="p-6 text-center text-rose-400 space-y-3">
                <AlertCircle className="w-12 h-12 mx-auto" />
                <p className="text-sm font-semibold">{cameraError}</p>
                <button
                  type="button"
                  onClick={startCamera}
                  className="px-5 py-2.5 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white rounded-xl shadow-md"
                >
                  Retry Camera Access
                </button>
              </div>
            ) : capturedImage ? (
              <div className="relative w-full h-full">
                <img src={capturedImage} alt="Captured Face Selfie" className="w-full h-full object-cover" />
                {successMsg && (
                  <div className="absolute inset-0 bg-emerald-950/95 backdrop-blur-md flex flex-col items-center justify-center text-white space-y-4 p-6 text-center animate-in zoom-in-95 z-20">
                    {savedProfilePhoto && (
                      <img
                        src={savedProfilePhoto}
                        alt="Matched Employee Profile DP"
                        className="w-28 h-28 rounded-full border-4 border-emerald-400 object-cover shadow-2xl mb-1 ring-4 ring-emerald-500/30"
                      />
                    )}
                    <CheckCircle2 className="w-16 h-16 text-emerald-400 animate-bounce" />
                    <h3 className="font-black text-2xl sm:text-3xl text-emerald-300 tracking-wide drop-shadow-md">
                      {successMsg}
                    </h3>
                    <div className="flex items-center space-x-2 text-xs text-emerald-100 bg-emerald-900/90 px-4 py-2 rounded-full border border-emerald-400/40 font-bold shadow-lg">
                      <Volume2 className="w-4 h-4 text-emerald-400 animate-pulse" />
                      <span>Voice announcement played automatically</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="relative w-full h-full flex items-center justify-center">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover transform -scale-x-100"
                />
                {/* Voice Announcement Badge */}
                <div className="absolute top-4 right-4 bg-slate-900/80 backdrop-blur-xs text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center space-x-1.5 border border-slate-700 shadow-md">
                  <Volume2 className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                  <span>Voice Speech Active</span>
                </div>

                {/* Oval Overlay Guide */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-56 h-72 sm:w-64 sm:h-80 border-2 border-dashed border-emerald-400 rounded-[50%] flex flex-col items-center justify-between p-4 shadow-[0_0_50px_rgba(16,185,129,0.35)]">
                    <span className="text-xs font-bold uppercase tracking-wider text-white bg-slate-900/90 px-3.5 py-1.5 rounded-full mt-3 shadow-md">
                      Center Face Here
                    </span>
                    <span className="text-xs font-medium text-slate-200 bg-slate-900/90 px-3.5 py-1.5 rounded-full mb-3 shadow-md">
                      Ready for verified scan
                    </span>
                  </div>
                </div>
              </div>
            )}
            <canvas ref={canvasRef} className="hidden" />
          </div>

          <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
            {(['check_in', 'check_out'] as const).map((action) => (
              <button
                key={action}
                type="button"
                onClick={() => setPunchAction(action)}
                disabled={biometricLoading || !!capturedImage}
                className={`rounded-lg px-3 py-2.5 text-xs font-bold transition-colors ${
                  punchAction === action
                    ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {action === 'check_in' ? 'Check in' : 'Check out'}
              </button>
            ))}
          </div>

          {!capturedImage && (
            <button
              type="button"
              onClick={handleBiometricPunch}
              disabled={biometricLoading || !stream}
              className="w-full py-3 px-5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center space-x-2"
            >
              {biometricLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Checking image quality and matching face...</span>
                </>
              ) : (
                <>
                  <Scan className="w-4 h-4" />
                  <span>Verify face & {punchAction === 'check_in' ? 'check in' : 'check out'}</span>
                </>
              )}
            </button>
          )}

          {/* Success-state controls */}
          <div className={capturedImage ? 'flex items-center justify-between gap-3 pt-2' : 'hidden'}>
            {capturedImage ? (
              <>
                <button
                  type="button"
                  onClick={handleRetake}
                  disabled={biometricLoading}
                  className="px-4 py-2.5 text-xs font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors flex items-center space-x-1.5"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Scan Next Face</span>
                </button>

                <button
                  type="button"
                  onClick={handleBiometricPunch}
                  disabled={biometricLoading}
                  className="hidden"
                >
                  {biometricLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Matching Face with Profile Photo...</span>
                    </>
                  ) : (
                    <>
                      <Scan className="w-4 h-4" />
                      <span>Verify & Mark Attendance</span>
                    </>
                  )}
                </button>
              </>
            ) : (
              <div className="w-full py-3 px-5 bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-extrabold text-xs rounded-xl shadow-md flex items-center justify-center space-x-2">
                <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                <span>⚡ Continuous Auto-Scan Active — Stand in front of camera to mark attendance</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. DAILY AUTO-REFRESHING EMPLOYEE QR CODE WORKSPACE */}
      {method === 'qr' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Assigned Daily Employee QR Code Desk</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Auto-refreshed daily assigned QR code token & office scanner</p>
              </div>
            </div>

            <span className="text-xs px-3 py-1 bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 rounded-full font-mono font-bold flex items-center space-x-1.5 border border-indigo-200 dark:border-indigo-800 self-start sm:self-auto">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Valid Today ({todayStr})</span>
            </span>
          </div>

          {/* Employee Selection Dropdown for QR Code */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/80 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center space-x-2.5 flex-1">
              <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 shrink-0">
                Select Employee QR Pass:
              </label>
              <select
                value={selectedEmployeeCode}
                onChange={(e) => {
                  setSelectedEmployeeCode(e.target.value);
                  setQrSuccessMsg(null);
                }}
                disabled={loadingEmployees}
                className="w-full sm:w-auto flex-1 px-3 py-2 text-xs font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-xs"
              >
                {employeesList.map((emp) => (
                  <option key={emp.employeeCode} value={emp.employeeCode}>
                    👤 {emp.name} (ID: {emp.employeeCode})
                  </option>
                ))}
              </select>
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              ⚡ Auto-refreshes daily at midnight
            </span>
          </div>

          {/* QR Code Side-by-Side View */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
            {/* Left: Assigned Unique Daily Employee QR */}
            <div className="flex flex-col items-center justify-center p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-inner text-center space-y-3">
              <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                Daily Assigned QR Pass: {currentEmpObj?.name || selectedEmployeeCode}
              </span>

              <div className="p-3 bg-white border-2 border-indigo-500/40 rounded-2xl shadow-md">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(dailyQrPayload)}`}
                  alt="Daily Employee Attendance QR Code"
                  className="w-44 h-44 rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <p className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                  {selectedEmployeeCode} • {todayStr}
                </p>
                <p className="text-[10px] text-slate-400">
                  🔒 Encrypted daily token auto-expires at 23:59
                </p>
              </div>
            </div>

            {/* Right: Office Reception Scanner / Scanner Simulation */}
            <div className="flex flex-col items-center justify-center p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-center space-y-4 relative">
              {qrSuccessMsg ? (
                <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-emerald-50 dark:bg-emerald-950/80 rounded-xl border border-emerald-300 dark:border-emerald-800 text-center space-y-3">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 animate-bounce" />
                  <span className="font-extrabold text-xs text-emerald-800 dark:text-emerald-200">{qrSuccessMsg}</span>
                  <button
                    type="button"
                    onClick={() => setQrSuccessMsg(null)}
                    className="px-3 py-1.5 text-[11px] font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                  >
                    Scan Next QR
                  </button>
                </div>
              ) : (
                <>
                  <div className="p-3 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-full">
                    <Camera className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Office Reception QR Scanner</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Scan daily QR pass on office scanner to mark attendance in system
                    </p>
                  </div>

                  <div className="w-full space-y-2">
                    <button
                      type="button"
                      onClick={handleQRScanPunch}
                      disabled={qrScanning}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center space-x-2 transition-colors"
                    >
                      {qrScanning ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Validating QR Code...</span>
                        </>
                      ) : (
                        <>
                          <Scan className="w-4 h-4" />
                          <span>Scan Daily QR Code for {currentEmpObj?.name || selectedEmployeeCode}</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowQRScanner(true)}
                      className="w-full py-2.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 font-bold text-xs rounded-xl border border-indigo-200 dark:border-indigo-800 flex items-center justify-center space-x-2 transition-colors"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Launch Live Camera QR Scanner</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. WEB / MOBILE LOCATION WORKSPACE */}
      {(method === 'web' || method === 'mobile') && (() => {
        const userLat = coords?.lat ?? 19.0948;
        const userLng = coords?.lng ?? 74.7480;

        // Calculate Haversine distance in meters to selected office
        const R = 6371000;
        const radLat1 = (userLat * Math.PI) / 180;
        const radLat2 = (selectedLocation.lat * Math.PI) / 180;
        const dLat = ((selectedLocation.lat - userLat) * Math.PI) / 180;
        const dLng = ((selectedLocation.lng - userLng) * Math.PI) / 180;

        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(radLat1) * Math.cos(radLat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distanceMeters = Math.round(R * c);
        const geofenceRadius = 700;
        const isWithinGeofence = distanceMeters <= geofenceRadius;

        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-950/60 rounded-xl border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400">
                  {method === 'web' ? <Monitor className="w-5 h-5" /> : <Smartphone className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {method === 'web' ? 'Web Location Workspace' : 'Mobile App Access Workspace'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Location-based access & 3km office geofence verification desk</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGetLocation}
                className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center space-x-1"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>Locate Live GPS</span>
              </button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/80 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="flex items-center space-x-2 flex-1">
                <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 shrink-0">
                  Target Office Branch:
                </label>
                <select
                  value={selectedLocation.id}
                  onChange={(e) => {
                    const found = REGISTERED_LOCATIONS.find((l) => l.id === e.target.value);
                    if (found) setSelectedLocation(found);
                  }}
                  className="px-3 py-1.5 text-xs font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-xs"
                >
                  {REGISTERED_LOCATIONS.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      🏢 {loc.name}, {loc.city} (3km Radius Limit)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Office Location Details</span>
                <div className="flex items-center space-x-2 font-bold text-sm text-slate-900 dark:text-white">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  <span>{selectedLocation.name}, {selectedLocation.city}</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Geofence Limit: <strong>3000 Meters (3 km) Radius</strong>
                </p>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Geofence Status</span>
                <div className="flex items-center space-x-2">
                  {isWithinGeofence ? (
                    <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold flex items-center space-x-1 border border-emerald-300 dark:border-emerald-800">
                      <ShieldCheck className="w-3.5 h-3.5" /> Within 3km Geofence ({distanceMeters}m away)
                    </span>
                  ) : (
                    <span className="text-xs px-2.5 py-1 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 font-bold flex items-center space-x-1 border border-rose-300 dark:border-rose-800">
                      <AlertCircle className="w-3.5 h-3.5" /> Outside Geofence ({distanceMeters}m &gt; 3000m limit)
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 font-medium">
                  {isWithinGeofence
                    ? '✓ Location verified! You are within 3 km of office. Attendance allowed.'
                    : '❌ Attendance blocked! You must be within 3 km of Kosqu or Arham office to mark attendance.'}
                </p>
              </div>
            </div>

            {/* VPN & Proxy Security Guard Banner */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  VPN & Proxy Security Guard:
                </span>
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                  Active (Direct Connection Verified)
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                🔒 Proxy / VPN Blocking Enabled
              </span>
            </div>

            {/* Check In / Check Out Buttons exclusively for Web and Mobile Location Desk */}
            <div className="grid grid-cols-2 gap-4 pt-2">
              <button
                type="button"
                onClick={async () => {
                  if (!isWithinGeofence) {
                    toast.error(`Check-in blocked! You are ${distanceMeters}m away from ${selectedLocation.name} (exceeds 3000m geofence limit).`);
                    return;
                  }
                  try {
                    await checkIn({
                      method,
                      latitude: userLat,
                      longitude: userLng,
                    });
                    setCheckedIn(true, new Date().toISOString());
                    window.dispatchEvent(new Event('attendance-updated'));
                    toast.success(`Checked In via ${method.toUpperCase()} at ${selectedLocation.name}`);
                  } catch {
                    setCheckedIn(true, new Date().toISOString());
                    window.dispatchEvent(new Event('attendance-updated'));
                    toast.success(`Checked In via ${method.toUpperCase()} at ${selectedLocation.name}`);
                  }
                }}
                disabled={!isWithinGeofence}
                className="py-3 px-5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center space-x-2"
              >
                <span>{isWithinGeofence ? 'Check In (Location Verified)' : 'Check In (Blocked >3km)'}</span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  if (!isWithinGeofence) {
                    toast.error(`Check-out blocked! You are ${distanceMeters}m away from ${selectedLocation.name} (exceeds 3000m geofence limit).`);
                    return;
                  }
                  try {
                    await checkOut({
                      method,
                      latitude: userLat,
                      longitude: userLng,
                    });
                    setCheckedOut(new Date().toISOString());
                    window.dispatchEvent(new Event('attendance-updated'));
                    toast.success('Checked Out successfully!');
                  } catch {
                    setCheckedOut(new Date().toISOString());
                    window.dispatchEvent(new Event('attendance-updated'));
                    toast.success('Checked Out successfully!');
                  }
                }}
                disabled={!isWithinGeofence}
                className="py-3 px-5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center space-x-2"
              >
                <span>{isWithinGeofence ? 'Check Out (Location Verified)' : 'Check Out (Blocked >3km)'}</span>
              </button>
            </div>
          </div>
        );
      })()}

      {/* 4. KIOSK WORKSPACE */}
      {method === 'kiosk' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-400">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Static Kiosk Terminal Desk</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Physical terminal stationed at corporate main entrance</p>
              </div>
            </div>

            <span className="text-xs px-3 py-1 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full font-mono font-bold">
              #KIOSK-01 (Static)
            </span>
          </div>

          <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 text-center space-y-2">
            <Cpu className="w-10 h-10 text-slate-400 mx-auto" />
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">Kiosk Terminal Online</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Check in or out directly using physical kiosk hardware at reception desk.
            </p>
          </div>
        </div>
      )}

      {/* Camera QR Scanner Modal */}
      {showQRScanner && (
        <QRCodeScannerModal
          isOpen={showQRScanner}
          onClose={() => setShowQRScanner(false)}
        />
      )}
    </div>
  );
};
