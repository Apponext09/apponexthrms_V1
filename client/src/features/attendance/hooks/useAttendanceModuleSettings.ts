import { useQuery } from '@tanstack/react-query';
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

const DEFAULT_SETTINGS: AttendanceModuleSettings = {
  attendanceMode: 'both',
  geofenceRadiusMeters: 100,
  whitelistedIPs: '192.168.1.1, 10.0.0.1',
  requireCheckout: true,
  autoCheckoutEnabled: false,
  autoCheckoutBufferMinutes: 0,
  liveTrackingEnabled: false,
  trackingIntervalMinutes: 15,
  loading: false,
};

/**
 * useAttendanceModuleSettings
 *
 * Fetches org-level attendance settings via React Query.
 * Result is cached for 5 minutes — eliminates the repeated API call
 * that previously fired on every Sidebar render (which happened on
 * every route change because location.pathname was in the dep array).
 */
export function useAttendanceModuleSettings(): AttendanceModuleSettings {
  const { data, isLoading } = useQuery({
    queryKey: ['org-settings', 'attendance-module'],
    queryFn: async () => {
      const res = await apiClient.get('/settings/org-settings');
      if (!res.data?.success || !res.data?.data) return null;
      return res.data.data;
    },
    staleTime: 1000 * 60 * 5,   // 5 minutes — no re-fetch on navigation
    gcTime: 1000 * 60 * 10,     // 10 minutes in memory cache
    enabled: !!localStorage.getItem('accessToken'),
    retry: 1,
  });

  if (isLoading || !data) {
    return { ...DEFAULT_SETTINGS, loading: isLoading };
  }

  return {
    attendanceMode: (data.attendance_mode as AttendanceMode) || 'both',
    geofenceRadiusMeters: Number(data.geofence_radius_meters ?? 100),
    whitelistedIPs: String(data.whitelisted_ips ?? ''),
    requireCheckout: data.require_checkout !== undefined ? Boolean(data.require_checkout) : true,
    autoCheckoutEnabled: Boolean(data.auto_checkout_enabled ?? false),
    autoCheckoutBufferMinutes: Number(data.auto_checkout_buffer_minutes ?? 0),
    liveTrackingEnabled: Boolean(data.live_tracking_enabled ?? false),
    trackingIntervalMinutes: Number(data.tracking_interval_minutes ?? 15),
    loading: false,
  };
}
