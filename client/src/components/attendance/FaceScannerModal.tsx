import React, { useState, useRef, useEffect } from 'react';
import { Camera, Scan, CheckCircle2, AlertCircle, X, ShieldCheck, RefreshCw, Sparkles, UserCheck } from 'lucide-react';
import { apiClient } from '@/config/api';
import { toast } from 'sonner';

interface FaceScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (result: any) => void;
}

export const FaceScannerModal: React.FC<FaceScannerModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [loading, setLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [matchResult, setMatchResult] = useState<any | null>(null);

  useEffect(() => {
    if (isOpen) {
      setMatchResult(null);
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    try {
      setCameraError(null);
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
      setCameraError('Unable to access camera for biometric scanning.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const handleScanFace = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const images: string[] = [];
    for (let index = 0; index < 3; index += 1) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      images.push(canvas.toDataURL('image/jpeg', 0.92));
      if (index < 2) {
        await new Promise((resolve) => window.setTimeout(resolve, 180));
      }
    }

    try {
      setLoading(true);
      const res = await apiClient.post('/attendance/biometric/verify-punch', {
        images,
      });

      if (res.data?.success) {
        setMatchResult(res.data);
        stopCamera();
        toast.success(
          `Face Verified! ${res.data.matchedEmployee?.name || 'Employee'} ${
            res.data.action === 'check_in' ? 'Checked In' : 'Checked Out'
          }`
        );
        if (onSuccess) onSuccess(res.data);
      } else {
        toast.error(res.data?.message || 'Face verification failed');
      }
    } catch (err: any) {
      console.error('Biometric verification error:', err);
      toast.error(err.response?.data?.message || 'Face not recognized. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetScan = () => {
    setMatchResult(null);
    startCamera();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl bg-card border border-border shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-muted/40">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-500">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-foreground">AI Face Biometric Scanner</h3>
              <p className="text-xs text-muted-foreground">High-precision facial recognition attendance punch</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Live Camera Scanner / Match Result */}
        <div className="relative p-6 flex flex-col items-center justify-center bg-black/90 min-h-[350px]">
          {cameraError ? (
            <div className="flex flex-col items-center text-center p-6 text-destructive space-y-3">
              <AlertCircle className="h-12 w-12" />
              <p className="text-sm font-medium">{cameraError}</p>
            </div>
          ) : matchResult ? (
            /* Match Success Card */
            <div className="w-full max-w-sm rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-emerald-500/40 p-6 flex flex-col items-center text-center space-y-4 shadow-2xl animate-in zoom-in-95">
              <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 border-2 border-emerald-500/60 shadow-[0_0_25px_rgba(16,185,129,0.3)]">
                <UserCheck className="h-10 w-10" />
              </div>

              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  {matchResult.action === 'check_in' ? 'PUNCH CHECK-IN' : 'PUNCH CHECK-OUT'}
                </span>
                <h4 className="font-extrabold text-xl text-white mt-2">
                  {matchResult.matchedEmployee?.name || 'Verified Employee'}
                </h4>
                <p className="text-xs text-slate-400 font-semibold mt-1">
                  Match score: <span className="text-emerald-400">{matchResult.matchScore ?? matchResult.similarityPercentage}%</span>
                  <span className="block font-normal text-[10px]">Distance-based score, not a probability</span>
                </p>
              </div>

              <div className="w-full pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                <span>Verification Method</span>
                <span className="font-bold text-white flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-amber-400" /> dlib ResNet 128-D Engine
                </span>
              </div>
            </div>
          ) : (
            /* Live Camera Stream with Scan Oval Overlay */
            <div className="relative w-full max-w-sm aspect-4/3 rounded-xl overflow-hidden bg-slate-900 border border-slate-700 flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform -scale-x-100"
              />

              {/* Scanning Target Box */}
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                <div className="w-52 h-64 border-2 border-emerald-400/80 rounded-3xl flex flex-col items-center justify-between p-3 shadow-[0_0_30px_rgba(16,185,129,0.4)] animate-pulse">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 bg-black/70 px-2 py-0.5 rounded-full mt-2">
                    Align Face Here
                  </span>
                  <div className="flex items-center gap-1 text-[10px] text-slate-300 bg-black/70 px-2.5 py-0.5 rounded-full mb-2">
                    <Scan className="h-3 w-3 text-emerald-400 animate-spin" /> Ready for Recognition
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Hidden Canvas */}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Footer Action Buttons */}
        <div className="p-4 border-t border-border bg-card flex items-center justify-between gap-3">
          {matchResult ? (
            <>
              <button
                onClick={handleResetScan}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border text-xs font-semibold text-foreground hover:bg-muted"
              >
                <RefreshCw className="h-4 w-4" /> Scan Another Face
              </button>
              <button
                onClick={onClose}
                className="flex-1 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition-all"
              >
                Done / Close
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={handleScanFace}
                disabled={!stream || !!cameraError || loading}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition-all disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" /> Verifying Face AI...
                  </>
                ) : (
                  <>
                    <Scan className="h-4 w-4" /> Recognize Face & Punch
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
