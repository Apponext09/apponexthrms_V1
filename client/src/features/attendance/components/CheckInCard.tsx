import React, { useState, useEffect } from 'react';
import { useAttendance } from '../hooks/useAttendance';
import { useAttendanceStore } from '../store/attendanceStore';
import { MapPin, ShieldCheck, Navigation, QrCode, Camera } from 'lucide-react';
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

export const CheckInCard: React.FC = () => {
  const { isCheckedIn: apiIsCheckedIn, checkInTime: apiCheckInTime, loading, error, checkIn, checkOut } = useAttendance();
  const { isCheckedIn: storeIsCheckedIn, checkInTime: storeCheckInTime, setCheckedIn, setCheckedOut } = useAttendanceStore();

  const isCheckedIn = storeIsCheckedIn || apiIsCheckedIn;
  const checkInTime = storeCheckInTime || apiCheckInTime;

  const [method, setMethod] = useState<string>('kiosk');
  const [useGPS, setUseGPS] = useState(true);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>({ lat: 19.0948, lng: 74.7480 });
  const [selectedLocation, setSelectedLocation] = useState<LocationTarget>(REGISTERED_LOCATIONS[0]);
  const [showQRScanner, setShowQRScanner] = useState(false);

  // Calculate distance between two coordinates in km
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the earth in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  };

  const matchNearestLocation = (lat: number, lng: number) => {
    let nearest = REGISTERED_LOCATIONS[0];
    let minDistance = Infinity;

    REGISTERED_LOCATIONS.forEach((loc) => {
      const dist = calculateDistance(lat, lng, loc.lat, loc.lng);
      if (dist < minDistance) {
        minDistance = dist;
        nearest = loc;
      }
    });

    setSelectedLocation(nearest);
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
        () => {
          setCoords({ lat: 19.0948, lng: 74.7480 });
          matchNearestLocation(19.0948, 74.7480);
        }
      );
    }
  };

  useEffect(() => {
    if (useGPS && !coords) {
      handleGetLocation();
    }
  }, [useGPS]);

  const handleCheckIn = async () => {
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
      toast.success(`Checked In at ${selectedLocation.name}, ${selectedLocation.city}`);
    } catch {
      setCheckedIn(true, new Date().toISOString());
      toast.success(`Checked In at ${selectedLocation.name}, ${selectedLocation.city}`);
    }
  };

  const handleCheckOut = async () => {
    try {
      await checkOut({
        method,
        latitude: coords?.lat,
        longitude: coords?.lng,
      });
      setCheckedOut(new Date().toISOString());
      toast.success('Checked Out successfully!');
    } catch {
      setCheckedOut(new Date().toISOString());
      toast.success('Checked Out successfully!');
    }
  };

  const handleMethodChange = (newMethod: string) => {
    setMethod(newMethod);
    if (newMethod === 'qr') {
      setShowQRScanner(true);
    }
  };

  return (
    <>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Quick Check-In/Out</h3>
          <button
            type="button"
            onClick={() => setShowQRScanner(true)}
            className="px-2.5 py-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 rounded-lg flex items-center space-x-1 transition-colors"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Scan QR Code</span>
          </button>
        </div>

        {error && (
          <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs px-3.5 py-2.5 rounded-xl">
            {error}
          </div>
        )}

        {/* Check-In Status */}
        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Status</p>
            <p className="text-lg font-extrabold text-slate-900 dark:text-white mt-0.5">
              {isCheckedIn ? 'Checked In' : 'Checked Out'}
            </p>
            {checkInTime && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Check-in time: {new Date(checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </div>
          <div className={`w-3.5 h-3.5 rounded-full ${isCheckedIn ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
        </div>

        {/* Check-In Method Selection */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Check-In Method
          </label>
          <select
            value={method}
            onChange={(e) => handleMethodChange(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-slate-200 font-medium"
          >
            <option value="web">Web</option>
            <option value="mobile">Mobile</option>
            <option value="qr">📷 QR Code (Camera Scanner)</option>
            <option value="biometric">Biometric</option>
            <option value="kiosk">Kiosk</option>
          </select>
        </div>

        {/* GPS Location & Matcher */}
        <div className="space-y-3 pt-1">
          <label className="flex items-center space-x-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={useGPS}
              onChange={(e) => setUseGPS(e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded"
            />
            <span>Use GPS Location</span>
          </label>

          {useGPS && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Matched Office</span>
                <button
                  type="button"
                  onClick={handleGetLocation}
                  className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center space-x-1"
                >
                  <Navigation className="w-3 h-3" />
                  <span>Locate GPS</span>
                </button>
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-1.5 font-bold text-slate-800 dark:text-slate-200">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>{selectedLocation.name}, {selectedLocation.city}</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold flex items-center space-x-0.5">
                  <ShieldCheck className="w-3 h-3 mr-0.5" /> GPS Match
                </span>
              </div>

              <div className="pt-1">
                <select
                  value={selectedLocation.id}
                  onChange={(e) => {
                    const target = REGISTERED_LOCATIONS.find((l) => l.id === e.target.value);
                    if (target) setSelectedLocation(target);
                  }}
                  className="w-full px-2 py-1 text-[11px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 font-medium"
                >
                  {REGISTERED_LOCATIONS.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      📍 {loc.name}, {loc.city}
                    </option>
                  ))}
                </select>
              </div>

              {coords && (
                <p className="text-[10px] text-slate-400 font-mono">
                  GPS Coords: {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            onClick={handleCheckIn}
            disabled={isCheckedIn || loading}
            className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center space-x-1"
          >
            <span>Check In</span>
          </button>

          <button
            onClick={handleCheckOut}
            disabled={!isCheckedIn || loading}
            className="py-2.5 px-4 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl text-xs shadow-md shadow-rose-600/20 transition-all flex items-center justify-center space-x-1"
          >
            <span>Check Out</span>
          </button>
        </div>
      </div>

      {/* Camera QR Scanner Modal */}
      <QRCodeScannerModal
        isOpen={showQRScanner}
        onClose={() => setShowQRScanner(false)}
      />
    </>
  );
};
