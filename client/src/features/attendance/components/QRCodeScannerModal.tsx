import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Camera, 
  QrCode, 
  CheckCircle2, 
  RefreshCw, 
  Sparkles, 
  Download, 
  UserCheck,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { useAttendanceStore } from '../store/attendanceStore';

interface QRCodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QRCodeScannerModal: React.FC<QRCodeScannerModalProps> = ({ isOpen, onClose }) => {
  const { setCheckedIn } = useAttendanceStore();
  const [activeTab, setActiveTab] = useState<'scan' | 'my_qr'>('scan');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scannedResult, setScannedResult] = useState<any | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Start Camera Stream
  const startCamera = async () => {
    setCameraError(null);
    setScannedResult(null);
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        mediaStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        setCameraActive(true);
      } else {
        setCameraError('Camera access not supported on this browser device.');
      }
    } catch {
      setCameraError('Camera permission denied or camera hardware unavailable.');
    }
  };

  // Stop Camera Stream
  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    if (isOpen && activeTab === 'scan') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, activeTab]);

  useEffect(() => {
    if (isOpen && cameraActive && mediaStreamRef.current && videoRef.current) {
      videoRef.current.srcObject = mediaStreamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [isOpen, cameraActive]);

  const handleSimulateScan = () => {
    const mockEmployeePayload = {
      empId: 'EMP-10293',
      name: 'Harsh Vardhan',
      department: 'Engineering',
      location: 'Kosqu Technolab, Navi Mumbai',
      timestamp: new Date().toLocaleTimeString(),
    };

    setScannedResult(mockEmployeePayload);
    setCheckedIn(true, new Date().toISOString());
    toast.success(`QR Scanned! Attendance marked for ${mockEmployeePayload.name} (${mockEmployeePayload.empId})`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-800/40">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">QR Code Attendance Desk</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Scan employee QR badge or present your attendance QR</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-slate-100 dark:border-slate-800 px-6 pt-3">
          <button
            type="button"
            onClick={() => setActiveTab('scan')}
            className={`pb-3 px-4 text-xs font-bold border-b-2 flex items-center space-x-2 transition-all ${
              activeTab === 'scan'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Open Camera & Scan QR</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('my_qr')}
            className={`pb-3 px-4 text-xs font-bold border-b-2 flex items-center space-x-2 transition-all ${
              activeTab === 'my_qr'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>My QR Code Badge</span>
          </button>
        </div>

        {/* Body Contents */}
        <div className="p-6 space-y-4">
          {activeTab === 'scan' ? (
            <div className="space-y-4">
              {/* Camera Viewfinder Box */}
              <div className="relative w-full h-64 bg-slate-950 rounded-2xl overflow-hidden flex items-center justify-center border-2 border-slate-800 shadow-inner">
                {cameraActive && !cameraError ? (
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center space-y-2 p-6">
                    <Camera className="w-10 h-10 text-slate-600 mx-auto animate-pulse" />
                    <p className="text-xs text-slate-400">
                      {cameraError || 'Activating camera scanner stream...'}
                    </p>
                  </div>
                )}

                {/* Animated Scanner Laser Overlay */}
                {cameraActive && !scannedResult && (
                  <div className="absolute inset-0 flex flex-col items-center justify-between p-8 pointer-events-none">
                    <div className="w-48 h-48 border-2 border-dashed border-emerald-400 rounded-2xl relative flex items-center justify-center">
                      <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-emerald-400" />
                      <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-emerald-400" />
                      <div className="absolute bottom-0 left-0 w-b-2 border-l-2 border-emerald-400" />
                      <div className="absolute bottom-0 right-0 w-b-2 border-r-2 border-emerald-400" />
                      <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-lg shadow-emerald-400 animate-pulse" />
                    </div>
                    <span className="text-[11px] font-semibold text-emerald-300 bg-slate-900/80 px-3 py-1 rounded-full border border-emerald-500/40 backdrop-blur-md">
                      Align QR Code within Frame
                    </span>
                  </div>
                )}

                {/* Success Result Overlay */}
                {scannedResult && (
                  <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-md p-6 flex flex-col items-center justify-center text-center space-y-3 animate-in fade-in">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-white">{scannedResult.name}</h4>
                      <p className="text-xs text-slate-300 font-mono">{scannedResult.empId} • {scannedResult.department}</p>
                      <p className="text-[11px] text-emerald-400 font-semibold mt-1">Attendance Registered Successfully!</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setScannedResult(null)}
                      className="px-4 py-1.5 text-xs font-bold text-slate-900 bg-white hover:bg-slate-100 rounded-xl transition-all"
                    >
                      Scan Another QR
                    </button>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={handleSimulateScan}
                  className="flex-1 py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-xl text-xs shadow-md flex items-center justify-center space-x-2 transition-all"
                >
                  <QrCode className="w-4 h-4" />
                  <span>Simulate QR Scan & Mark Attendance</span>
                </button>

                <button
                  type="button"
                  onClick={startCamera}
                  className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-200 transition-colors"
                  title="Restart Camera"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            /* My QR Badge View */
            <div className="text-center space-y-4 py-2">
              <div className="bg-slate-50 dark:bg-slate-800/80 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 max-w-xs mx-auto space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
                  <div className="text-left">
                    <h4 className="text-xs font-extrabold text-slate-900 dark:text-white">ApponextHRMS ID Badge</h4>
                    <p className="text-[10px] text-slate-400 font-mono">EMP-10293</p>
                  </div>
                  <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>

                {/* SVG Rendered QR Code */}
                <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-200 flex items-center justify-center">
                  <svg className="w-40 h-40" viewBox="0 0 100 100">
                    <rect width="100" height="100" fill="#ffffff" />
                    {/* Corner Position Detection Pattern Blocks */}
                    <rect x="5" y="5" width="30" height="30" fill="#0f172a" />
                    <rect x="10" y="10" width="20" height="20" fill="#ffffff" />
                    <rect x="15" y="15" width="10" height="10" fill="#0f172a" />

                    <rect x="65" y="5" width="30" height="30" fill="#0f172a" />
                    <rect x="70" y="10" width="20" height="20" fill="#ffffff" />
                    <rect x="75" y="15" width="10" height="10" fill="#0f172a" />

                    <rect x="5" y="65" width="30" height="30" fill="#0f172a" />
                    <rect x="10" y="70" width="20" height="20" fill="#ffffff" />
                    <rect x="15" y="75" width="10" height="10" fill="#0f172a" />

                    {/* Data Matrix Dots */}
                    <rect x="40" y="10" width="6" height="6" fill="#0f172a" />
                    <rect x="50" y="15" width="6" height="6" fill="#0f172a" />
                    <rect x="40" y="25" width="6" height="6" fill="#0f172a" />
                    <rect x="10" y="40" width="6" height="6" fill="#0f172a" />
                    <rect x="25" y="45" width="6" height="6" fill="#0f172a" />
                    <rect x="40" y="40" width="8" height="8" fill="#4f46e5" />
                    <rect x="52" y="40" width="8" height="8" fill="#0f172a" />
                    <rect x="65" y="45" width="6" height="6" fill="#0f172a" />
                    <rect x="80" y="40" width="6" height="6" fill="#0f172a" />
                    <rect x="45" y="55" width="6" height="6" fill="#0f172a" />
                    <rect x="60" y="65" width="8" height="8" fill="#0f172a" />
                    <rect x="75" y="70" width="8" height="8" fill="#4f46e5" />
                    <rect x="50" y="80" width="6" height="6" fill="#0f172a" />
                    <rect x="80" y="80" width="8" height="8" fill="#0f172a" />
                  </svg>
                </div>

                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Harsh Vardhan</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Senior Full Stack Lead</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => toast.success('QR Code Badge downloaded to device!')}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md inline-flex items-center space-x-1.5 transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download QR Badge</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
