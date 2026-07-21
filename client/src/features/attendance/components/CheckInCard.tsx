import React, { useState } from 'react';
import { useAttendance } from '../hooks/useAttendance';
import { useAttendanceStore } from '../store/attendanceStore';

export const CheckInCard: React.FC = () => {
  const { isCheckedIn, checkInTime, loading, error, checkIn, checkOut } = useAttendance();
  const { setCheckedIn, setCheckedOut } = useAttendanceStore();
  const [method, setMethod] = useState<string>('web');
  const [useGPS, setUseGPS] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  const handleGetLocation = async () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        setCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      });
    }
  };

  const handleCheckIn = async () => {
    try {
      if (useGPS && !coords) {
        await handleGetLocation();
      }
      await checkIn({
        method,
        latitude: coords?.lat,
        longitude: coords?.lng,
      });
      setCheckedIn(true);
    } catch (err) {
      console.error('Check-in failed:', err);
    }
  };

  const handleCheckOut = async () => {
    try {
      if (useGPS && !coords) {
        await handleGetLocation();
      }
      await checkOut({
        method,
        latitude: coords?.lat,
        longitude: coords?.lng,
      });
      setCheckedOut(new Date().toISOString());
    } catch (err) {
      console.error('Check-out failed:', err);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
      <h3 className="text-lg font-semibold mb-4">Quick Check-In/Out</h3>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {/* Check-In Status */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded">
          <div>
            <p className="text-sm text-gray-600">Status</p>
            <p className="text-xl font-bold text-gray-900">
              {isCheckedIn ? 'Checked In' : 'Checked Out'}
            </p>
            {checkInTime && (
              <p className="text-xs text-gray-500 mt-1">
                {new Date(checkInTime).toLocaleTimeString()}
              </p>
            )}
          </div>
          <div className={`w-4 h-4 rounded-full ${isCheckedIn ? 'bg-green-500' : 'bg-gray-400'}`} />
        </div>

        {/* Method Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Check-In Method
          </label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="web">Web</option>
            <option value="mobile">Mobile</option>
            <option value="qr">QR Code</option>
            <option value="biometric">Biometric</option>
            <option value="kiosk">Kiosk</option>
          </select>
        </div>

        {/* GPS Option */}
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={useGPS}
            onChange={(e) => setUseGPS(e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded"
          />
          <span className="ml-2 text-sm text-gray-700">Use GPS Location</span>
        </label>

        {useGPS && !coords && (
          <button
            onClick={handleGetLocation}
            className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
          >
            Get Current Location
          </button>
        )}

        {coords && (
          <p className="text-xs text-gray-500">
            Location: {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
          </p>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-4">
          <button
            onClick={handleCheckIn}
            disabled={isCheckedIn || loading}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            {loading ? 'Processing...' : 'Check In'}
          </button>
          <button
            onClick={handleCheckOut}
            disabled={!isCheckedIn || loading}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            {loading ? 'Processing...' : 'Check Out'}
          </button>
        </div>
      </div>
    </div>
  );
};
