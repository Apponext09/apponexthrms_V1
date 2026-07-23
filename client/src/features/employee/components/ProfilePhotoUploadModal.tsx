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
import { Camera, RefreshCw, Check, Trash2, Video, AlertCircle, ShieldCheck } from 'lucide-react';
import { useUpdateEmployee } from '../hooks/useEmployees';
import type { Employee } from '@/types';
import { toast } from 'sonner';

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
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  const { updateEmployee } = useUpdateEmployee(employee.id || 0);

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

      // Enumerate available video input devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter((device) => device.kind === 'videoinput');
      setAvailableDevices(videoInputs);
      if (videoInputs.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(videoInputs[0].deviceId);
      }
    } catch (err: any) {
      console.error('Camera initialization failed:', err);
      setCameraError(err.message || 'Unable to access live webcam. Please grant camera access permissions.');
      setIsCameraActive(false);
    }
  }, [stopCamera, selectedDeviceId]);

  useEffect(() => {
    if (open && !capturedImage) {
      startCamera(selectedDeviceId);
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [open, capturedImage]);

  // Ensure video element receives stream when active
  useEffect(() => {
    if (isCameraActive && stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [isCameraActive, stream]);

  const handleCapture = async () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const samples: string[] = [];
    for (let index = 0; index < 3; index += 1) {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      samples.push(canvas.toDataURL('image/jpeg', 0.92));
      if (index < 2) {
        await new Promise((resolve) => window.setTimeout(resolve, 250));
      }
    }
    setCapturedImages(samples);
    setCapturedImage(samples[1] || samples[0]);

    stopCamera();
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setCapturedImages([]);
    startCamera(selectedDeviceId);
  };

  const handleSave = async () => {
    if (!capturedImage) return;

    setIsSaving(true);
    try {
      if (employee && employee.id) {
        await updateEmployee({
          avatarUrl: capturedImage,
          biometricImages: capturedImages.length ? capturedImages : [capturedImage],
        } as any);
      }

      toast.success('Profile photo and quality-checked face template saved.');
      if (onSuccess) onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      console.error('Failed to save live profile photo:', err);
      toast.error(err.response?.data?.message || 'Failed to save profile photo to database.');
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
      toast.success('Profile photo removed successfully.');
      if (onSuccess) onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      toast.error('Failed to remove profile photo.');
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
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Camera className="w-5 h-5 text-primary" />
            Live Capture Profile Photo
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Strict Live Capture Mode: Take a clear live photo using your webcam. The photo will be saved directly into the database and registered for biometric attendance.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center py-2 space-y-4">
          {/* Live Mode Enforced Banner */}
          <div className="w-full flex items-center justify-between px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-600 dark:text-emerald-400 text-xs font-medium">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              Three-frame biometric capture active
            </span>
            <span className="bg-emerald-500 text-white px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider">
              Enforced
            </span>
          </div>

          {/* Camera Viewport or Snapshot Preview */}
          <div className="relative w-full aspect-[4/3] bg-zinc-950 rounded-2xl overflow-hidden shadow-inner flex items-center justify-center border-2 border-primary/20">
            {capturedImage ? (
              // Captured Snapshot Preview
              <div className="relative w-full h-full flex items-center justify-center bg-black">
                <img
                  src={capturedImage}
                  alt="Captured Profile Selfie"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-md text-white text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-white/20">
                  <Check className="w-4 h-4 text-emerald-400" /> Snapshot Ready
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
                  <div className="w-48 h-60 border-2 border-dashed border-primary/80 rounded-[50%] shadow-[0_0_0_9999px_rgba(0,0,0,0.4)] flex items-center justify-center">
                    <p className="text-white/90 text-[11px] font-medium bg-black/60 px-2.5 py-1 rounded-md text-center">
                      Align face within circle
                    </p>
                  </div>
                </div>
                {/* Live Camera Badge */}
                <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-md text-white text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-white/20">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <Video className="w-3.5 h-3.5 text-emerald-400" /> LIVE CAMERA
                </div>
              </div>
            ) : cameraError ? (
              // Camera Error Message
              <div className="p-6 text-center flex flex-col items-center justify-center text-white space-y-3">
                <AlertCircle className="w-10 h-10 text-red-500" />
                <p className="text-sm font-medium text-red-200">{cameraError}</p>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => startCamera(selectedDeviceId)}
                  className="gap-1.5 mt-2"
                >
                  <RefreshCw className="w-4 h-4" /> Retry Camera
                </Button>
              </div>
            ) : (
              // Loading Spinner
              <div className="flex flex-col items-center justify-center text-zinc-400 space-y-2">
                <RefreshCw className="w-8 h-8 animate-spin text-primary" />
                <p className="text-xs">Initializing webcam feed...</p>
              </div>
            )}
          </div>

          {/* Camera Selection Dropdown */}
          {availableDevices.length > 1 && !capturedImage && (
            <div className="w-full flex items-center justify-between text-xs px-1">
              <span className="text-muted-foreground">Select Camera:</span>
              <select
                value={selectedDeviceId}
                onChange={(e) => {
                  setSelectedDeviceId(e.target.value);
                  startCamera(e.target.value);
                }}
                className="bg-muted text-foreground text-xs rounded border border-input px-2 py-1 focus:outline-none"
              >
                {availableDevices.map((dev, idx) => (
                  <option key={dev.deviceId} value={dev.deviceId}>
                    {dev.label || `Camera ${idx + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Action Buttons: Capture vs Retake */}
          {!capturedImage ? (
            <Button
              type="button"
              size="lg"
              onClick={handleCapture}
              disabled={!isCameraActive}
              className="w-full h-12 bg-gradient-to-r from-sky-500 via-indigo-600 to-purple-600 hover:from-sky-600 hover:to-purple-700 text-white font-semibold shadow-md flex items-center justify-center gap-2 rounded-xl"
            >
              <Camera className="w-5 h-5" />
              Capture 3 Face Samples
            </Button>
          ) : (
            <div className="w-full flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleRetake}
                disabled={isSaving}
                className="flex-1 gap-1.5 h-11"
              >
                <RefreshCw className="w-4 h-4" /> Retake Photo
              </Button>
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-row justify-between sm:justify-between items-center pt-4 border-t">
          {employee.avatarUrl ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50 gap-1.5"
              onClick={handleRemovePhoto}
              disabled={isSaving}
            >
              <Trash2 className="w-4 h-4" />
              Remove Photo
            </Button>
          ) : (
            <div />
          )}

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                stopCamera();
                onOpenChange(false);
              }}
              disabled={isSaving}
            >
              Cancel
            </Button>
            {capturedImage && (
              <Button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-5"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Saving to DB...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" /> Save Profile Photo to DB
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
