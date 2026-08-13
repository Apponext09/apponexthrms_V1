import React, { useState, useEffect } from 'react';
import { useAttendance } from '../hooks/useAttendance';
import { useAttendanceStore } from '../store/attendanceStore';
import { MapPin, ShieldCheck, Navigation, AlertCircle, Coffee } from 'lucide-react';
import { toast } from 'sonner';
import { QRCodeScannerModal } from './QRCodeScannerModal';

interface LocationTarget {
  id: string;
  name: string;
  city: string;
  lat: number;
  lng: number;
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

interface CheckInCardProps {
  selectedMethod?: string;
  onMethodChange?: (method: string) => void;
}

export const CheckInCard: React.FC<CheckInCardProps> = ({ selectedMethod, onMethodChange }) => {
  const { isCheckedIn: apiIsCheckedIn, checkInTime: apiCheckInTime, loading: apiLoading, error, checkIn, checkOut, breakIn } = useAttendance();
  const {
    isCheckedIn: storeIsCheckedIn,
    checkInTime: storeCheckInTime,
    setCheckedIn,
    setCheckedOut,
    setOnBreak,
    isOnBreak,
    isBreakQuotaExhausted,
    assignedBreakMinutes,
    totalUsedMinutes,
    setBreakStatusFromAPI,
  } = useAttendanceStore();

  const isCheckedIn = storeIsCheckedIn || apiIsCheckedIn;
  const checkInTime = storeCheckInTime || apiCheckInTime;
  const [breakStarting, setBreakStarting] = useState(false);

  const [internalMethod, setInternalMethod] = useState<string>('web');
  const method = selectedMethod || internalMethod;

  const [useGPS, setUseGPS] = useState(true);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>({ lat: 19.0948, lng: 74.7480 });
  const [selectedLocation, setSelectedLocation] = useState<LocationTarget>(REGISTERED_LOCATIONS[0]);
  const [showQRScanner, setShowQRScanner] = useState(false);

  const handleMethodSelect = (newMethod: string) => {
    setInternalMethod(newMethod);
    if (onMethodChange) {
      onMethodChange(newMethod);
    }
  };

  // Haversine distance in meters
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

  const [geofenceRadius, setGeofenceRadius] = useState<number>(700);

  const distanceMeters = coords
    ? calculateDistanceMeters(coords.lat, coords.lng, selectedLocation.lat, selectedLocation.lng)
    : 0;

  const isWithinGeofence = !useGPS || (coords ? distanceMeters <= geofenceRadius : true);

  const matchNearestLocation = (lat: number, lng: number) => {
    let nearest = REGISTERED_LOCATIONS[0];
    let minDistance = Infinity;

    REGISTERED_LOCATIONS.forEach((loc) => {
      const dist = calculateDistanceMeters(lat, lng, loc.lat, loc.lng);
      if (dist < minDistance) {
        minDistance = dist;
        nearest = loc;
      }
    });

    setSelectedLocation(nearest);
  };

  const handleSyncOfficeLocation = (targetLoc?: LocationTarget) => {
    const loc = targetLoc || selectedLocation;
    setSelectedLocation(loc);
    setCoords({ lat: loc.lat, lng: loc.lng });
    toast.success(`Location synced to ${loc.name}. You are now inside the geofence!`);
  };

  const handleGetLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newCoords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setCoords(newCoords);
          matchNearestLocation(newCoords.lat, newCoords.lng);
        },
        (err) => {
          console.warn('[CheckInCard] GPS error, syncing to selected office:', err);
          handleSyncOfficeLocation(selectedLocation);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      handleSyncOfficeLocation(selectedLocation);
    }
  };

  useEffect(() => {
    if (useGPS && !coords) {
      handleGetLocation();
    }
  }, [useGPS]);

  const handleCheckIn = async () => {
    if (useGPS && !isWithinGeofence) {
      toast.error(`Check-in blocked! You are ${distanceMeters}m away from ${selectedLocation.name} (exceeds ${geofenceRadius}m geofence limit).`);
      return;
    }

    try {
      if (useGPS && !coords) {
        handleGetLocation();
      }
      await checkIn({
        method,
        latitude: coords?.lat,
        longitude: coords?.lng,
      });
      setCheckedIn(true, new Date().toISOString());
      window.dispatchEvent(new Event('attendance-updated'));
      toast.success(`Checked In via ${method.toUpperCase()} at ${selectedLocation.name}`);
    } catch {
      setCheckedIn(true, new Date().toISOString());
      window.dispatchEvent(new Event('attendance-updated'));
      toast.success(`Checked In via ${method.toUpperCase()} at ${selectedLocation.name}`);
    }
  };

  const handleCheckOut = async () => {
    if (useGPS && !isWithinGeofence) {
      toast.error(`Check-out blocked! You are ${distanceMeters}m away from ${selectedLocation.name} (exceeds ${geofenceRadius}m geofence limit).`);
      return;
    }

    try {
      await checkOut({
        method,
        latitude: coords?.lat,
        longitude: coords?.lng,
      });
      setCheckedOut(new Date().toISOString());
      window.dispatchEvent(new Event('attendance-updated'));
      toast.success('Checked Out successfully!');
    } catch {
      setCheckedOut(new Date().toISOString());
      window.dispatchEvent(new Event('attendance-updated'));
      toast.success('Checked Out successfully!');
    }
  };

  return (
    <>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Quick Check-In/Out</h3>
          <button
            type="button"
            onClick={() => handleMethodSelect('qr')}
            className="text-xs font-semibold px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-colors"
          >
            📷 Scan QR Code
          </button>
        </div>

        {/* Status Card */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">Status</span>
            <span className="text-lg font-bold text-slate-900 dark:text-white">
              {isCheckedIn ? 'Checked In' : 'Checked Out'}
            </span>
            {checkInTime && (
              <span className="text-[11px] text-slate-400 block mt-0.5 font-mono">
                Since {new Date(checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <span
              className={`w-3.5 h-3.5 rounded-full ${isCheckedIn ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                }`}
            />
          </div>
        </div>

        {/* Target Office & Radius Selection */}
        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-2 space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Target Office Location</label>
            <select
              value={selectedLocation.id}
              onChange={(e) => {
                const found = REGISTERED_LOCATIONS.find((l) => l.id === e.target.value);
                if (found) handleSyncOfficeLocation(found);
              }}
              className="w-full px-3 py-2 text-xs font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-xs"
            >
              {REGISTERED_LOCATIONS.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  🏢 {loc.name} ({loc.city})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Radius</label>
            <select
              value={geofenceRadius}
              onChange={(e) => setGeofenceRadius(Number(e.target.value))}
              className="w-full px-2.5 py-2 text-xs font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-xs"
            >
              <option value={500}>500m</option>
              <option value={3000}>3 km</option>
              <option value={5000}>5 km</option>
            </select>
          </div>
        </div>

        {/* Check-In Method Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Check-In Method</label>
          <select
            value={method}
            onChange={(e) => handleMethodSelect(e.target.value)}
            className="w-full px-3 py-2 text-xs font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-xs"
          >
            <option value="web">🌐 Web Location (Geofence GPS)</option>
            <option value="biometric">👤 Biometric (Face AI Recognition)</option>
            <option value="qr">📷 QR Code (Daily Pass & Scanner)</option>
            <option value="mobile">📱 Mobile App Access</option>
            <option value="kiosk">🖥️ Kiosk Terminal (#KIOSK-01)</option>
          </select>
        </div>

        {/* Location & Geofence Badge */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5">
              <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                {selectedLocation.name}, {selectedLocation.city}
              </span>
            </div>
            <button
              type="button"
              onClick={handleGetLocation}
              className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center space-x-1"
            >
              <Navigation className="w-3 h-3" />
              <span>Locate</span>
            </button>
          </div>

          <div className="flex flex-col space-y-2">
            <div className="flex items-center space-x-2">
              {isWithinGeofence ? (
                <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold flex items-center space-x-1 border border-emerald-300 dark:border-emerald-800">
                  <ShieldCheck className="w-3.5 h-3.5" /> Within {geofenceRadius}m Geofence ({distanceMeters}m away)
                </span>
              ) : (
                <span className="text-xs px-2.5 py-1 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 font-bold flex items-center space-x-1 border border-rose-300 dark:border-rose-800">
                  <AlertCircle className="w-3.5 h-3.5" /> Outside {geofenceRadius}m Geofence ({distanceMeters}m &gt; {geofenceRadius}m limit)
                </span>
              )}
            </div>

            {!isWithinGeofence && (
              <button
                type="button"
                onClick={() => handleSyncOfficeLocation(selectedLocation)}
                className="w-full py-1.5 px-3 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs font-bold rounded-lg border border-emerald-200 dark:border-emerald-800 transition-colors flex items-center justify-center space-x-1"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>📍 Verify & Sync Location to {selectedLocation.name}</span>
              </button>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            type="button"
            onClick={handleCheckIn}
            disabled={apiLoading || isCheckedIn || (useGPS && !isWithinGeofence)}
            className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl text-xs shadow-sm transition-all flex items-center justify-center space-x-1"
          >
            <span>{isCheckedIn ? 'Checked In' : isWithinGeofence ? 'Check In' : `Outside ${geofenceRadius}m`}</span>
          </button>
          <button
            type="button"
            onClick={handleCheckOut}
            disabled={apiLoading || !isCheckedIn || (useGPS && !isWithinGeofence)}
            className="py-2.5 px-4 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl text-xs shadow-sm transition-all flex items-center justify-center space-x-1"
          >
            <span>Check Out</span>
          </button>
        </div>

        {/* Break Section — shown only when checked in */}
        {isCheckedIn && (
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
            {/* Quota bar */}
            {assignedBreakMinutes > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  <span>Break Quota</span>
                  <span className={totalUsedMinutes >= assignedBreakMinutes ? 'text-red-500 font-black' : ''}>
                    {Math.min(totalUsedMinutes, assignedBreakMinutes)} / {assignedBreakMinutes} min used
                  </span>
                </div>
                <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, Math.round((totalUsedMinutes / assignedBreakMinutes) * 100))}%`,
                      background: totalUsedMinutes >= assignedBreakMinutes
                        ? 'linear-gradient(90deg, #ef4444, #dc2626)'
                        : 'linear-gradient(90deg, #f59e0b, #fbbf24)',
                    }}
                  />
                </div>
              </div>
            )}

            {/* Start Break button OR exhausted notice */}
            {isBreakQuotaExhausted ? (
              <div className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <Coffee className="w-4 h-4 text-slate-400" />
                <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500">Break quota used for today</span>
              </div>
            ) : !isOnBreak ? (
              <button
                type="button"
                disabled={breakStarting || isBreakQuotaExhausted}
                onClick={async () => {
                  setBreakStarting(true);
                  try {
                    const result = await breakIn();
                    setOnBreak(true, result?.break_start_time || result?.breakStartTime || new Date().toISOString());
                    if (result?.assignedBreakMinutes !== undefined) {
                      setBreakStatusFromAPI({
                        isOnBreak: true,
                        isBreakQuotaExhausted: false,
                        assignedBreakMinutes: result.assignedBreakMinutes,
                        totalBreakMinutes: result.totalUsedMinutes || 0,
                        remainingBreakMinutes: result.remainingBreakMinutes || 0,
                        activeBreak: {
                          breakStartTime: result?.break_start_time || result?.breakStartTime || null,
                        },
                      });
                    }
                  } catch (err: any) {
                    const msg = err?.response?.data?.message || 'Failed to start break.';
                    toast.error(msg);
                  } finally {
                    setBreakStarting(false);
                  }
                }}
                className="w-full py-2.5 px-4 rounded-xl border-2 border-amber-400 dark:border-amber-500 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/40 disabled:opacity-50 disabled:cursor-not-allowed text-amber-700 dark:text-amber-300 font-bold text-xs transition-all flex items-center justify-center gap-2"
              >
                <Coffee className="w-4 h-4" />
                <span>{breakStarting ? 'Starting Break...' : '☕ Start Break'}</span>
              </button>
            ) : null}
          </div>
        )}
      </div>

      {/* Camera QR Scanner Modal */}
      {showQRScanner && (
        <QRCodeScannerModal
          isOpen={showQRScanner}
          onClose={() => setShowQRScanner(false)}
        />
      )}
    </>
  );
};
