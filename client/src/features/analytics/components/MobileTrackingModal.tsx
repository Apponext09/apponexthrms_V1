import React from 'react';
import { Smartphone, MapPin, CheckCircle2, AlertCircle, Battery, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { generateMobileTrackingRecords, MobileTrackingRecord } from '../hooks/useAttendanceReports';

interface MobileTrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileTrackingModal({ isOpen, onClose }: MobileTrackingModalProps) {
  const records: MobileTrackingRecord[] = generateMobileTrackingRecords();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl sm:rounded-2xl p-0 overflow-hidden bg-card">
        {/* Header */}
        <div className="bg-emerald-700 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <Smartphone className="w-5 h-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-white">Mobile Tracking Records</DialogTitle>
              <p className="text-xs text-emerald-100 mt-0.5">
                Real-time GPS mobile check-in & geofence verification audit
              </p>
            </div>
          </div>
        </div>

        {/* Records Content */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto no-scrollbar">
          {records.map((rec) => (
            <div
              key={rec.id}
              className="p-4 rounded-xl border border-border/80 bg-muted/30 hover:bg-muted/60 transition-colors space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/50 pb-2">
                <div>
                  <h4 className="text-sm font-bold text-foreground">{rec.employeeName}</h4>
                  <p className="text-xs text-muted-foreground font-mono">{rec.employeeCode}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{rec.geofenceStatus} Geofence</span>
                  </span>
                  <span className="text-xs font-semibold px-2 py-1 rounded-md bg-primary/10 text-primary">
                    {rec.type}
                  </span>
                </div>
              </div>

              {/* Coordinates and Location details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center space-x-1.5 text-muted-foreground font-medium">
                    <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <span className="font-semibold text-foreground truncate">{rec.locationName}</span>
                  </div>
                  <p className="text-muted-foreground font-mono pl-5">
                    Lat: {rec.latitude}, Long: {rec.longitude}
                  </p>
                </div>

                <div className="space-y-1 sm:text-right">
                  <div className="flex items-center space-x-1.5 sm:justify-end text-muted-foreground font-medium">
                    <Battery className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>Battery: {rec.batteryLevel}</span>
                  </div>
                  <p className="text-muted-foreground text-[11px] font-mono">{rec.deviceInfo}</p>
                </div>
              </div>

              <div className="text-[11px] text-muted-foreground font-mono pt-1 text-right border-t border-border/40">
                Timestamp: {rec.dateTime}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 bg-muted/30 border-t border-border flex justify-end">
          <Button variant="outline" onClick={onClose} className="h-9 text-xs px-5">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
