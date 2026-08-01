import { useState, useEffect } from 'react';
import { apiClient } from '@/config/api';

export type AttendanceMode = 'face' | 'gps' | 'both' | 'wifi_ip';

export interface AttendanceModuleSettings {
  attendanceMode: AttendanceMode;
  geofenceRadiusMeters: number;
  whitelistedIPs: string;
  requireCheckout: boolean;
  autoCheckoutEnabled: boolean;
  autoCheckoutBufferMinutes: number;
  liveTrackingEnabled: boolean;
  trackingIntervalMinutes: number;
  loading: boolean;
}

export function useAttendanceModuleSettings(): AttendanceModuleSettings {
  const [settings, setSettings] = useState<AttendanceModuleSettings>({
    attendanceMode: 'gps',
    geofenceRadiusMeters: 100,
    whitelistedIPs: '192.168.1.1, 10.0.0.1',
    requireCheckout: true,
    autoCheckoutEnabled: false,
    autoCheckoutBufferMinutes: 0,
    liveTrackingEnabled: false,
    trackingIntervalMinutes: 15,
    loading: true,
  });

  useEffect(() => {
    let isMounted = true;
    apiClient
      .get('/settings/org-settings')
      .then((res) => {
        if (isMounted && res.data?.success && res.data?.data) {
          const data = res.data.data;
          setSettings({
            attendanceMode: (data.attendance_mode as AttendanceMode) || 'gps',
            geofenceRadiusMeters: Number(data.geofence_radius_meters ?? 100),
            whitelistedIPs: String(data.whitelisted_ips ?? ''),
            requireCheckout: data.require_checkout !== undefined ? Boolean(data.require_checkout) : true,
            autoCheckoutEnabled: Boolean(data.auto_checkout_enabled ?? false),
            autoCheckoutBufferMinutes: Number(data.auto_checkout_buffer_minutes ?? 0),
            liveTrackingEnabled: Boolean(data.live_tracking_enabled ?? false),
            trackingIntervalMinutes: Number(data.tracking_interval_minutes ?? 15),
            loading: false,
          });
        }
      })
      .catch((err) => {
        console.warn('[useAttendanceModuleSettings] Failed to fetch org settings:', err);
        if (isMounted) {
          setSettings((prev) => ({ ...prev, loading: false }));
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return settings;
}
