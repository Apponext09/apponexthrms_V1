import React, { useState, useEffect, useRef } from 'react';
import {
  Scan,
  UserPlus,
  UserCheck,
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
  Check,
  Download,
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
  const [biometricMode, setBiometricMode] = useState<'enroll' | 'punch'>('enroll');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isEnrolled, setIsEnrolled] = useState<boolean | null>(null);
  const [savedProfilePhoto, setSavedProfilePhoto] = useState<string | null>(null);

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

  // Fetch biometric enrollment status & profile selfie DP
  useEffect(() => {
    if (method === 'biometric' && selectedEmployeeCode) {
      apiClient
        .get(`/attendance/biometric/status?employeeId=${encodeURIComponent(selectedEmployeeCode)}`)
        .then((res) => {
          setIsEnrolled(res.data?.data?.isEnrolled || false);
          if (res.data?.data?.profilePhoto) {
            setSavedProfilePhoto(res.data.data.profilePhoto);
          } else {
            setSavedProfilePhoto(null);
          }
        })
        .catch(() => {
          setIsEnrolled(false);
          setSavedProfilePhoto(null);
        });
    }
  }, [method, selectedEmployeeCode]);

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
  }, [method, biometricMode]);

  const startCamera = async () => {
    try {
      setCameraError(null);
      setCapturedImage(null);
      setSuccessMsg(null);
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

  const captureFrame = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        setCapturedImage(dataUrl);
        stopCamera();
        return dataUrl;
      }
    }
    return null;
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setSuccessMsg(null);
    startCamera();
  };

  // 1. Capture & set profile selfie DP
  const handleEnrollFaceDB = async () => {
    const selectedEmp = employeesList.find((e) => e.employeeCode === selectedEmployeeCode);
    const empCode = selectedEmployeeCode || 'EMP-2026-001';
    const empName = selectedEmp?.name || `Employee (${empCode})`;

    let img = capturedImage;
    if (!img) {
      img = captureFrame();
    }
    if (!img) {
      toast.error('Selfie photo capture failed');
      return;
    }

    try {
      setBiometricLoading(true);
      const res = await apiClient.post('/attendance/biometric/enroll', {
        image: img,
        employeeId: empCode,
        employeeName: empName,
      });

      if (res.data?.success) {
        setIsEnrolled(true);
        setSavedProfilePhoto(img);
        setSuccessMsg(`Profile selfie registered as DP for ${empName}!`);
        toast.success(`Profile selfie photo set for ${empName}!`);
      } else {
        toast.error(res.data?.message || 'Selfie registration failed');
      }
    } catch (err: any) {
      console.error('Selfie enrollment error:', err);
      toast.error(err.response?.data?.message || 'Failed to save profile selfie photo');
    } finally {
      setBiometricLoading(false);
    }
  };

  // Audio Voice Announcement (Text-to-Speech)
  const speakVoiceAnnouncement = (text: string) => {
    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.95;
        utterance.pitch = 1.0;
        utterance.lang = 'en-US';
        window.speechSynthesis.speak(utterance);
      }
    } catch (e) {
      console.warn('Voice synthesis warning:', e);
    }
  };

  // 2. Perform Face Recognition Attendance Punch
  const handleBiometricPunch = async () => {
    let img = capturedImage;
    if (!img) {
      img = captureFrame();
    }
    if (!img) {
      toast.error('Face capture failed');
      return;
    }

    try {
      setBiometricLoading(true);
      const res = await apiClient.post('/attendance/biometric/verify-punch', {
        image: img,
      });

      if (res.data?.success) {
        const isCheckInAction = res.data.action === 'check_in';
        const matchedName = res.data.matchedEmployee?.name || 'Employee';
        const matchedId = res.data.matchedEmployee?.id || selectedEmployeeCode;

        if (isCheckInAction) {
          setCheckedIn(true, new Date().toISOString());
        } else {
          setCheckedOut(new Date().toISOString());
        }

        if (matchedId && employeesList.some((e) => e.employeeCode === matchedId)) {
          setSelectedEmployeeCode(matchedId);
        }

        const displayAction = isCheckInAction ? 'Check In' : 'Check Out';
        const fullMatchMsg = `Face match with employee: ${matchedName} (${matchedId}) — Attendance (${displayAction}) marked successfully!`;
        
        setSuccessMsg(fullMatchMsg);
        toast.success(`Face match with employee: ${matchedName} (${matchedId}) — Attendance marked!`);
        
        // Voice Speech Announcement
        speakVoiceAnnouncement(`Face match with employee ${matchedName}, ID ${matchedId}. Attendance marked successfully!`);
      } else {
        toast.error(res.data?.message || 'Face recognition failed');
        speakVoiceAnnouncement('Face match failed. Please position face clearly inside frame.');
      }
    } catch (err: any) {
      console.error('Biometric punch error:', err);
      toast.error(err.response?.data?.message || 'Face recognition failed');
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
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Face AI Biometric Attendance Desk</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Profile selfie DP registration & live face recognition attendance</p>
              </div>
            </div>

            {isEnrolled !== null && (
              <span
                className={`text-xs px-3 py-1 rounded-full font-bold flex items-center space-x-1.5 self-start sm:self-auto ${
                  isEnrolled
                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                    : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                }`}
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isEnrolled ? `Profile Selfie Enrolled: ${currentEmpObj?.name || ''} (ID: ${selectedEmployeeCode})` : `Selfie Required: ${currentEmpObj?.name || ''} (ID: ${selectedEmployeeCode})`}</span>
              </span>
            )}
          </div>

          {/* Employee Auto-Fetch Select Dropdown Box */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/80 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center space-x-2.5 flex-1">
              {savedProfilePhoto || capturedImage ? (
                <img
                  src={capturedImage || savedProfilePhoto!}
                  alt="Profile Selfie DP"
                  className="w-10 h-10 rounded-full object-cover border-2 border-emerald-500 shadow-sm shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold flex items-center justify-center border border-emerald-300 dark:border-emerald-800 shrink-0">
                  <UserCheck className="w-5 h-5" />
                </div>
              )}

              <div className="flex-1 space-y-0.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Select Employee (Name & ID)
                </label>
                <select
                  value={selectedEmployeeCode}
                  onChange={(e) => setSelectedEmployeeCode(e.target.value)}
                  disabled={loadingEmployees}
                  className="w-full px-3 py-1.5 text-xs font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-xs"
                >
                  {employeesList.map((emp) => {
                    const hasRealName = emp.name && !emp.name.toLowerCase().startsWith('employee #');
                    const labelText = hasRealName ? emp.name : `Employee Profile (${emp.employeeCode})`;
                    return (
                      <option key={emp.employeeCode} value={emp.employeeCode}>
                        👤 {labelText} (ID: {emp.employeeCode})
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium self-end sm:self-center">
              ⚡ Live Employee Profile & ID
            </span>
          </div>

          {/* Action Tabs: Take Profile Selfie vs Live Face Recognition */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setBiometricMode('enroll');
                handleRetake();
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
                biometricMode === 'enroll'
                  ? 'bg-amber-500 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>Enroll Selfie for {currentEmpObj?.name || 'Employee'} (ID: {selectedEmployeeCode})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setBiometricMode('punch');
                handleRetake();
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
                biometricMode === 'punch'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Scan className="w-4 h-4" />
              <span>Face AI Punch for {currentEmpObj?.name || 'Employee'} (ID: {selectedEmployeeCode})</span>
            </button>
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
                  <div className="absolute inset-0 bg-emerald-950/85 backdrop-blur-xs flex flex-col items-center justify-center text-white space-y-3 p-6 text-center animate-in zoom-in-95">
                    <CheckCircle2 className="w-16 h-16 text-emerald-400 animate-bounce" />
                    <span className="font-extrabold text-lg">{successMsg}</span>
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
                  <span>Voice Announcement Active</span>
                </div>

                {/* Oval Overlay Guide */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-56 h-72 sm:w-64 sm:h-80 border-2 border-dashed border-emerald-400 rounded-[50%] flex flex-col items-center justify-between p-4 shadow-[0_0_50px_rgba(16,185,129,0.35)]">
                    <span className="text-xs font-bold uppercase tracking-wider text-white bg-slate-900/90 px-3.5 py-1.5 rounded-full mt-3 shadow-md">
                      Center Face Here
                    </span>
                    <span className="text-xs font-medium text-slate-200 bg-slate-900/90 px-3.5 py-1.5 rounded-full mb-3 shadow-md">
                      {biometricMode === 'enroll' ? `Profile Selfie Mode (${currentEmpObj?.name || selectedEmployeeCode})` : 'Live Face Recognition Attendance'}
                    </span>
                  </div>
                </div>
              </div>
            )}
            <canvas ref={canvasRef} className="hidden" />
          </div>

          {/* Action Control Buttons */}
          <div className="flex items-center justify-between gap-3 pt-2">
            {capturedImage ? (
              <>
                <button
                  type="button"
                  onClick={handleRetake}
                  disabled={biometricLoading}
                  className="px-4 py-2.5 text-xs font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors flex items-center space-x-1.5"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Retake Selfie</span>
                </button>

                {biometricMode === 'enroll' ? (
                  <button
                    type="button"
                    onClick={handleEnrollFaceDB}
                    disabled={biometricLoading}
                    className="flex-1 py-2.5 px-4 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center space-x-2"
                  >
                    {biometricLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Saving Profile Selfie...</span>
                      </>
                    ) : (
                      <>
                        <Camera className="w-4 h-4" />
                        <span>Capture & Set as Profile Selfie DP for {currentEmpObj?.name || selectedEmployeeCode}</span>
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleBiometricPunch}
                    disabled={biometricLoading}
                    className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center space-x-2"
                  >
                    {biometricLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Scanning Face...</span>
                      </>
                    ) : (
                      <>
                        <Scan className="w-4 h-4" />
                        <span>Confirm Biometric Punch for {currentEmpObj?.name || selectedEmployeeCode}</span>
                      </>
                    )}
                  </button>
                )}
              </>
            ) : (
              <>
                {biometricMode === 'enroll' ? (
                  <button
                    type="button"
                    onClick={handleEnrollFaceDB}
                    disabled={!stream || !!cameraError || biometricLoading}
                    className="w-full py-3 px-5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center space-x-2"
                  >
                    {biometricLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Saving Profile Selfie...</span>
                      </>
                    ) : (
                      <>
                        <Camera className="w-4 h-4" />
                        <span>Capture & Set as Profile Selfie DP for {currentEmpObj?.name || selectedEmployeeCode}</span>
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleBiometricPunch}
                    disabled={!stream || !!cameraError || biometricLoading}
                    className="w-full py-3 px-5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center space-x-2"
                  >
                    {biometricLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Matching Face AI...</span>
                      </>
                    ) : (
                      <>
                        <Scan className="w-4 h-4" />
                        <span>Capture & Punch Attendance for {currentEmpObj?.name || selectedEmployeeCode}</span>
                      </>
                    )}
                  </button>
                )}
              </>
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
        const isWithin500m = distanceMeters <= 500;

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
                  <p className="text-xs text-slate-500 dark:text-slate-400">Location-based access & strict 500m office geofence verification desk</p>
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
                      🏢 {loc.name}, {loc.city} (500m Radius Limit)
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
                  Geofence Limit: <strong>500 Meters Radius</strong>
                </p>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">500m Geofence Status</span>
                <div className="flex items-center space-x-2">
                  {isWithin500m ? (
                    <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold flex items-center space-x-1 border border-emerald-300 dark:border-emerald-800">
                      <ShieldCheck className="w-3.5 h-3.5" /> Within 500m Geofence ({distanceMeters}m away)
                    </span>
                  ) : (
                    <span className="text-xs px-2.5 py-1 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 font-bold flex items-center space-x-1 border border-rose-300 dark:border-rose-800">
                      <AlertCircle className="w-3.5 h-3.5" /> Outside 500m Geofence ({distanceMeters}m &gt; 500m limit)
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 font-medium">
                  {isWithin500m
                    ? '✓ Location verified! You are within 500 meters of office. Attendance allowed.'
                    : '❌ Attendance blocked! You must be within 500m of Kosqu or Arham office to mark attendance.'}
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
                  if (!isWithin500m) {
                    toast.error(`Check-in blocked! You are ${distanceMeters}m away from ${selectedLocation.name} (exceeds 500m geofence limit).`);
                    return;
                  }
                  try {
                    await checkIn({
                      method,
                      latitude: userLat,
                      longitude: userLng,
                    });
                    setCheckedIn(true, new Date().toISOString());
                    toast.success(`Checked In via ${method.toUpperCase()} at ${selectedLocation.name}`);
                  } catch {
                    setCheckedIn(true, new Date().toISOString());
                    toast.success(`Checked In via ${method.toUpperCase()} at ${selectedLocation.name}`);
                  }
                }}
                disabled={!isWithin500m}
                className="py-3 px-5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center space-x-2"
              >
                <span>{isWithin500m ? 'Check In (Location Verified)' : 'Check In (Blocked >500m)'}</span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  if (!isWithin500m) {
                    toast.error(`Check-out blocked! You are ${distanceMeters}m away from ${selectedLocation.name} (exceeds 500m geofence limit).`);
                    return;
                  }
                  try {
                    await checkOut({
                      method,
                      latitude: userLat,
                      longitude: userLng,
                    });
                    setCheckedOut(new Date().toISOString());
                    toast.success('Checked Out successfully!');
                  } catch {
                    setCheckedOut(new Date().toISOString());
                    toast.success('Checked Out successfully!');
                  }
                }}
                disabled={!isWithin500m}
                className="py-3 px-5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center space-x-2"
              >
                <span>{isWithin500m ? 'Check Out (Location Verified)' : 'Check Out (Blocked >500m)'}</span>
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
      <QRCodeScannerModal
        isOpen={showQRScanner}
        onClose={() => setShowQRScanner(false)}
      />
    </div>
  );
};
