import React, { useState, useRef, useEffect } from 'react';
import { Camera, RefreshCw, CheckCircle2, AlertCircle, X, Shield, Sparkles } from 'lucide-react';
import { apiClient } from '@/config/api';
import { toast } from 'sonner';

interface FaceEnrollmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const FaceEnrollmentModal: React.FC<FaceEnrollmentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [enrolledSuccess, setEnrolledSuccess] = useState(false);

  useEffect(() => {
    if (isOpen && !capturedImage) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, capturedImage]);

  useEffect(() => {
    if (isOpen && stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [isOpen, stream]);

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
      setCameraError('Unable to access webcam. Please ensure camera permissions are allowed.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const handleCapture = () => {
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
      }
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setEnrolledSuccess(false);
    startCamera();
  };

  const handleSaveEnrollment = async () => {
    if (!capturedImage) return;

    try {
      setLoading(true);
      const res = await apiClient.post('/attendance/biometric/enroll', {
        image: capturedImage,
      });

      if (res.data?.success) {
        setEnrolledSuccess(true);
        toast.success('Face biometric registered successfully!');
        if (onSuccess) onSuccess();
        setTimeout(() => {
          onClose();
        }, 1800);
      } else {
        toast.error(res.data?.message || 'Face enrollment failed');
      }
    } catch (err: any) {
      console.error('Enrollment error:', err);
      toast.error(err.response?.data?.message || 'Failed to enroll face biometric');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl bg-card border border-border shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-muted/40">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-foreground">Face Biometric Enrollment</h3>
              <p className="text-xs text-muted-foreground">Register baseline photo for AI Face Punching</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Camera View / Captured Image */}
        <div className="relative p-6 flex flex-col items-center justify-center bg-black/90 min-h-[340px]">
          {cameraError ? (
            <div className="flex flex-col items-center text-center p-6 text-destructive space-y-3">
              <AlertCircle className="h-12 w-12" />
              <p className="text-sm font-medium">{cameraError}</p>
              <button
                onClick={startCamera}
                className="mt-2 px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:opacity-90"
              >
                Retry Camera Access
              </button>
            </div>
          ) : capturedImage ? (
            <div className="relative w-full max-w-sm rounded-xl overflow-hidden border-2 border-primary/50 shadow-lg">
              <img src={capturedImage} alt="Captured Face" className="w-full h-auto object-cover" />
              {enrolledSuccess && (
                <div className="absolute inset-0 bg-emerald-950/80 backdrop-blur-xs flex flex-col items-center justify-center text-white space-y-2 animate-in zoom-in-95">
                  <CheckCircle2 className="h-16 w-16 text-emerald-400 animate-bounce" />
                  <span className="font-bold text-lg">Biometric Registered!</span>
                  <span className="text-xs text-emerald-200">Face baseline saved securely</span>
                </div>
              )}
            </div>
          ) : (
            <div className="relative w-full max-w-sm aspect-4/3 rounded-xl overflow-hidden bg-slate-900 border border-slate-700 flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform -scale-x-100"
              />

              {/* Face Alignment Oval Grid */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-48 h-64 border-2 border-dashed border-primary/80 rounded-[50%] flex flex-col items-center justify-between p-4 shadow-[0_0_30px_rgba(59,130,246,0.3)]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-background/80 px-2 py-0.5 rounded-full mt-2">
                    Center Your Face
                  </span>
                  <span className="text-[10px] font-medium text-muted-foreground bg-background/80 px-2 py-0.5 rounded-full mb-2">
                    Face Front Camera & Smile
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Hidden Canvas for Frame Capture */}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Action Controls */}
        <div className="p-4 border-t border-border bg-card flex items-center justify-between gap-3">
          {capturedImage ? (
            <>
              <button
                onClick={handleRetake}
                disabled={loading || enrolledSuccess}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border text-xs font-semibold text-foreground hover:bg-muted transition-colors disabled:opacity-50"
              >
                <RefreshCw className="h-4 w-4" /> Retake Photo
              </button>
              <button
                onClick={handleSaveEnrollment}
                disabled={loading || enrolledSuccess}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-md hover:opacity-90 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" /> Processing Face AI...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" /> Save Face Template
                  </>
                )}
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
                onClick={handleCapture}
                disabled={!stream || !!cameraError}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-md hover:opacity-90 transition-all disabled:opacity-50"
              >
                <Camera className="h-4 w-4" /> Capture Face Photo
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
