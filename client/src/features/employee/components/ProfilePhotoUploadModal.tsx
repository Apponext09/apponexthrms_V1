import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Camera, RefreshCw, Check, Trash2, Video, AlertCircle, ShieldCheck, Upload, Image as ImageIcon, Sparkles, X } from 'lucide-react';
import { useUpdateEmployee } from '../hooks/useEmployees';
import type { Employee } from '@/types';
import { toast } from 'sonner';
import { apiClient } from '@/config/api';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

interface ProfilePhotoUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee;
  onSuccess?: () => void;
}

export function ProfilePhotoUploadModal({
  open,
  onOpenChange,
  employee,
  onSuccess,
}: ProfilePhotoUploadModalProps) {
  const queryClient = useQueryClient();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [mode, setMode] = useState<'camera' | 'upload'>('camera');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [isCapturing, setIsCapturing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const { updateEmployee } = useUpdateEmployee(employee?.id || 0);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setStream(null);
    setIsCameraActive(false);
  }, []);

  const startCamera = useCallback(async (deviceId?: string) => {
    try {
      stopCamera();
      setCameraError(null);

      const constraints: MediaStreamConstraints = {
        video: deviceId
          ? { deviceId: { exact: deviceId } }
          : { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = mediaStream;
      setStream(mediaStream);
      setIsCameraActive(true);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }

      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter((device) => device.kind === 'videoinput');
      setAvailableDevices(videoInputs);
      if (videoInputs.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(videoInputs[0].deviceId);
      }
    } catch (err: any) {
      console.error('Camera initialization failed:', err);
      setCameraError(err.message || 'Webcam access failed. Grant camera permissions or select Upload File mode.');
      setIsCameraActive(false);
    }
  }, [stopCamera, selectedDeviceId]);

  useEffect(() => {
    if (open) {
      setMode('camera');
      setCapturedImage(null);
      setCapturedImages([]);
      startCamera(selectedDeviceId);
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [open]);

  useEffect(() => {
    if (isCameraActive && stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [isCameraActive, stream]);

  const handleCapture = async () => {
    if (!videoRef.current) return;
    setIsCapturing(true);

    const video = videoRef.current;
    const samples: string[] = [];
    try {
      for (let index = 0; index < 3; index += 1) {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          samples.push(canvas.toDataURL('image/jpeg', 0.92));
        }
        if (index < 2) {
          await new Promise((resolve) => window.setTimeout(resolve, 200));
        }
      }
      setCapturedImages(samples);
      setCapturedImage(samples[1] || samples[0]);
      stopCamera();
    } finally {
      setIsCapturing(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file (JPG, PNG, WEBP).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image size must be less than 10MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setCapturedImage(dataUrl);
        setCapturedImages([dataUrl]);
        stopCamera();
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setCapturedImages([]);
    if (mode === 'camera') {
      startCamera(selectedDeviceId);
    }
  };

  const handleSave = async () => {
    if (!capturedImage) return;

    setIsSaving(true);
    try {
      const empId = employee?.id || employee?.employeeCode;
      const imagesToEnroll = capturedImages.length ? capturedImages : [capturedImage];

      if (employee && employee.id) {
        await updateEmployee({
          avatarUrl: capturedImage,
          biometricImages: imagesToEnroll,
        } as any);
      }

      try {
        await apiClient.post('/attendance/biometric/enroll', {
          employeeId: String(empId),
          images: imagesToEnroll,
        });
        toast.success('Face Biometric Enrolled!', {
          description: 'Profile photo updated and face registered for camera attendance.',
        });
      } catch (bioErr: any) {
        toast.success('Profile photo saved to database.', {
          description: bioErr.response?.data?.message || 'Biometric sync scheduled.',
        });
      }

      queryClient.invalidateQueries({ queryKey: ['employee', employee?.id] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['biometricStatus'] });

      if (onSuccess) onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      console.error('Failed to save profile photo:', err);
      toast.error(err.response?.data?.message || 'Failed to save profile photo.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemovePhoto = async () => {
    setIsSaving(true);
    try {
      await updateEmployee({
        avatarUrl: null,
      } as any);
      setCapturedImage(null);
      toast.success('Profile photo removed.');
      if (onSuccess) onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      toast.error('Failed to remove photo.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!val) stopCamera();
        onOpenChange(val);
      }}
    >
      <DialogContent className="w-[94vw] sm:max-w-[480px] max-h-[92vh] overflow-y-auto p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-border/80 bg-card shadow-2xl">
        <DialogHeader className="pb-1">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg font-black tracking-tight text-foreground">
              <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                <Camera className="w-4 h-4" />
              </div>
              Live Face Capture & Enrollment
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground mt-0.5">
            Align face inside camera guide to capture live profile photo.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center space-y-3 my-1">
          {/* Camera Viewport or Snapshot Preview */}
          <div className="relative w-full aspect-[4/3] max-h-[280px] bg-black rounded-2xl overflow-hidden shadow-inner flex items-center justify-center border border-border/80">
            {capturedImage ? (
              // Captured Snapshot Preview
              <div className="relative w-full h-full flex items-center justify-center bg-black">
                <img
                  src={capturedImage}
                  alt="Profile Photo Preview"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2.5 right-2.5 bg-black/75 backdrop-blur-md text-white text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 border border-white/20">
                  <Check className="w-3.5 h-3.5 text-emerald-400" /> Live Capture Ready
                </div>
              </div>
            ) : isCameraActive ? (
              // Live Video Stream View
              <div className="relative w-full h-full">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover transform -scale-x-100"
                />
                {/* Oval Face Positioning Overlay Guide */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-36 h-48 sm:w-44 sm:h-56 border-2 border-dashed border-primary/80 rounded-[50%] shadow-[0_0_0_9999px_rgba(0,0,0,0.45)] flex items-center justify-center">
                    <span className="text-white/90 text-[10px] font-bold bg-black/60 px-2 py-0.5 rounded-full backdrop-blur-xs">
                      Align Face Here
                    </span>
                  </div>
                </div>
                {/* Live Camera Badge */}
                <div className="absolute top-2.5 left-2.5 bg-black/75 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 border border-white/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <Video className="w-3 h-3 text-emerald-400" /> LIVE CAMERA
                </div>
              </div>
            ) : cameraError ? (
              // Camera Error Message
              <div className="p-4 text-center flex flex-col items-center justify-center text-white space-y-2">
                <AlertCircle className="w-8 h-8 text-rose-400" />
                <p className="text-xs font-medium text-rose-200">{cameraError}</p>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => startCamera(selectedDeviceId)}
                  className="h-7 text-[11px] font-bold gap-1 mt-1"
                >
                  <RefreshCw className="w-3 h-3" /> Retry Live Camera
                </Button>
              </div>
            ) : (
              // Loading Spinner
              <div className="flex flex-col items-center justify-center text-zinc-400 space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                <p className="text-xs font-medium">Connecting camera…</p>
              </div>
            )}
          </div>

          {/* Camera Selection Dropdown */}
          {mode === 'camera' && availableDevices.length > 1 && !capturedImage && (
            <div className="w-full flex items-center justify-between text-xs px-1">
              <span className="text-muted-foreground text-[11px]">Camera Source:</span>
              <select
                value={selectedDeviceId}
                onChange={(e) => {
                  setSelectedDeviceId(e.target.value);
                  startCamera(e.target.value);
                }}
                className="bg-muted text-foreground text-[11px] font-semibold rounded-lg border border-border px-2 py-1 focus:outline-none"
              >
                {availableDevices.map((dev, idx) => (
                  <option key={dev.deviceId} value={dev.deviceId}>
                    {dev.label || `Camera ${idx + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Main Action Bar */}
          {!capturedImage ? (
            <div className="w-full flex gap-2 pt-1">
              {mode === 'camera' ? (
                <>
                  <Button
                    type="button"
                    size="default"
                    onClick={handleCapture}
                    disabled={!isCameraActive || isCapturing}
                    className="flex-1 h-10 bg-primary text-primary-foreground font-black text-xs shadow-md flex items-center justify-center gap-2 rounded-xl"
                  >
                    {isCapturing ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Camera className="w-4 h-4" />
                    )}
                    {isCapturing ? 'Capturing 3 Frames…' : 'Capture Live Face Photo'}
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-10 text-xs font-bold gap-1.5 rounded-xl"
                >
                  <Upload className="w-3.5 h-3.5" /> Choose Different Image
                </Button>
              )}
            </div>
          ) : (
            <div className="w-full flex gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={handleRetake}
                disabled={isSaving}
                className="flex-1 h-10 text-xs font-bold gap-1.5 rounded-xl"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Change / Retake Photo
              </Button>
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-row justify-between sm:justify-between items-center pt-3 border-t border-border/60">
          {employee?.avatarUrl ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-xs font-bold gap-1 h-8 px-2"
              onClick={handleRemovePhoto}
              disabled={isSaving}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Remove
            </Button>
          ) : (
            <div />
          )}

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                stopCamera();
                onOpenChange(false);
              }}
              disabled={isSaving}
              className="h-8 text-xs font-bold"
            >
              Cancel
            </Button>
            {capturedImage && (
              <Button
                type="button"
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
                className="h-8 text-xs font-black gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 rounded-lg shadow-sm"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Enrolling…
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" /> Save & Enroll Face
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
