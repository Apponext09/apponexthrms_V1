import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { showToast } from '@/components/ui/toast';
import {
  CalendarCheck,
  Scan,
  MapPin,
  ShieldCheck,
  Wifi,
  Clock,
  Navigation,
  Save,
  RotateCcw,
  Info,
  Check,
  Activity,
  Timer
} from 'lucide-react';

export type AttendanceMode = 'face' | 'gps' | 'both' | 'wifi_ip';

export function AttendanceModulePage(): JSX.Element {
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);

  // 1. Attendance Verification Mode
  const [attendanceMode, setAttendanceMode] = useState<AttendanceMode>('gps');
  const [geofenceRadiusMeters, setGeofenceRadiusMeters] = useState<number>(100);
  const [whitelistedIPs, setWhitelistedIPs] = useState<string>('192.168.1.1, 10.0.0.1');

  // 2. Check-In & Check-Out Configurations
  const [requireCheckout, setRequireCheckout] = useState<boolean>(true);
  const [autoCheckoutEnabled, setAutoCheckoutEnabled] = useState<boolean>(false);
  const [autoCheckoutBufferMinutes, setAutoCheckoutBufferMinutes] = useState<number>(0);

  // 3. Live Tracking Configurations
  const [liveTrackingEnabled, setLiveTrackingEnabled] = useState<boolean>(false);
  const [trackingIntervalMinutes, setTrackingIntervalMinutes] = useState<number>(15);

  // Load existing organization settings
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/settings/org-settings');
      if (res.data?.success && res.data?.data) {
        const data = res.data.data;

        if (data.attendance_mode) setAttendanceMode(data.attendance_mode as AttendanceMode);
        if (data.geofence_radius_meters !== undefined) setGeofenceRadiusMeters(Number(data.geofence_radius_meters));
        if (data.whitelisted_ips !== undefined) setWhitelistedIPs(String(data.whitelisted_ips));

        if (data.require_checkout !== undefined) setRequireCheckout(Boolean(data.require_checkout));
        if (data.auto_checkout_enabled !== undefined) setAutoCheckoutEnabled(Boolean(data.auto_checkout_enabled));
        if (data.auto_checkout_buffer_minutes !== undefined) setAutoCheckoutBufferMinutes(Number(data.auto_checkout_buffer_minutes));

        if (data.live_tracking_enabled !== undefined) setLiveTrackingEnabled(Boolean(data.live_tracking_enabled));
        if (data.tracking_interval_minutes !== undefined) setTrackingIntervalMinutes(Number(data.tracking_interval_minutes));
      }
    } catch (error) {
      console.error('Failed to load attendance settings:', error);
      showToast.error('Could not load attendance module configuration');
    } finally {
      setLoading(false);
      setHasUnsavedChanges(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        attendance_mode: attendanceMode,
        geofence_radius_meters: geofenceRadiusMeters,
        whitelisted_ips: whitelistedIPs,
        require_checkout: requireCheckout,
        auto_checkout_enabled: autoCheckoutEnabled,
        auto_checkout_buffer_minutes: autoCheckoutBufferMinutes,
        live_tracking_enabled: liveTrackingEnabled,
        tracking_interval_minutes: trackingIntervalMinutes,
      };

      await apiClient.put('/settings/org-settings', payload);
      showToast.success('Attendance Module configuration saved successfully!');
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Failed to save attendance settings:', error);
      showToast.error('Failed to save attendance module settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    fetchSettings();
    showToast.info('Settings reset to last saved state');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] w-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="text-xs text-muted-foreground mt-3 font-semibold">Loading Attendance Module Configuration...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full pb-16 p-4 sm:p-6">
      {/* Top Header Card */}
      <Card className="border border-border/80 shadow-2xs rounded-xl bg-card">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 px-5 pt-5 border-b border-border/50 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 text-primary rounded-xl shrink-0">
              <CalendarCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-bold tracking-tight">Attendance Module Configuration</CardTitle>
                <Badge className="text-[10px] font-bold py-0.5 px-2 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
                  Active System
                </Badge>
                {hasUnsavedChanges && (
                  <Badge className="text-[10px] font-bold py-0.5 px-2 bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30">
                    Unsaved Changes
                  </Badge>
                )}
              </div>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Configure punch verification methods, check-in/check-out rules, and live employee GPS tracking options.
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={saving}
              className="h-8 text-xs font-semibold gap-1.5 px-3"
            >
              <RotateCcw className="w-3.5 h-3.5 text-muted-foreground" />
              Reset
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className="h-8 text-xs font-semibold gap-1.5 px-4 bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? 'Saving...' : 'Save Configuration'}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* SECTION 1: ATTENDANCE VERIFICATION MODES */}
      <Card className="border border-border/80 shadow-2xs rounded-xl bg-card">
        <CardHeader className="pb-3 px-5 pt-5 border-b border-border/50">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm font-bold">1. Attendance Verification Mode</CardTitle>
          </div>
          <CardDescription className="text-xs text-muted-foreground mt-0.5">
            Select the mandatory method employees must use to log daily attendance.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-5 space-y-5">
          {/* Mode Selection Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* 1. Face Recognition */}
            <div
              onClick={() => {
                setAttendanceMode('face');
                setHasUnsavedChanges(true);
              }}
              className={`flex flex-col justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                attendanceMode === 'face'
                  ? 'bg-primary/5 border-primary ring-2 ring-primary/20 shadow-2xs'
                  : 'bg-card border-border/80 hover:border-border hover:bg-muted/30'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
                    <Scan className="w-5 h-5" />
                  </div>
                  {attendanceMode === 'face' && (
                    <span className="p-1 rounded-full bg-primary text-primary-foreground">
                      <Check className="w-3 h-3" />
                    </span>
                  )}
                </div>
                <h4 className="text-xs font-bold text-foreground">1) Face Recognition</h4>
                <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                  Requires biometrics and AI camera face match validation on mobile or kiosk.
                </p>
              </div>
              <Badge variant="outline" className="mt-3 text-[10px] w-fit font-semibold">
                Biometric Camera
              </Badge>
            </div>

            {/* 2. GPS Punch */}
            <div
              onClick={() => {
                setAttendanceMode('gps');
                setHasUnsavedChanges(true);
              }}
              className={`flex flex-col justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                attendanceMode === 'gps'
                  ? 'bg-primary/5 border-primary ring-2 ring-primary/20 shadow-2xs'
                  : 'bg-card border-border/80 hover:border-border hover:bg-muted/30'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600">
                    <MapPin className="w-5 h-5" />
                  </div>
                  {attendanceMode === 'gps' && (
                    <span className="p-1 rounded-full bg-primary text-primary-foreground">
                      <Check className="w-3 h-3" />
                    </span>
                  )}
                </div>
                <h4 className="text-xs font-bold text-foreground">2) GPS Punch</h4>
                <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                  Validates punch location within designated geofenced office coordinates.
                </p>
              </div>
              <Badge variant="outline" className="mt-3 text-[10px] w-fit font-semibold">
                Geofence GPS
              </Badge>
            </div>

            {/* 3. Both Face and GPS */}
            <div
              onClick={() => {
                setAttendanceMode('both');
                setHasUnsavedChanges(true);
              }}
              className={`flex flex-col justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                attendanceMode === 'both'
                  ? 'bg-primary/5 border-primary ring-2 ring-primary/20 shadow-2xs'
                  : 'bg-card border-border/80 hover:border-border hover:bg-muted/30'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  {attendanceMode === 'both' && (
                    <span className="p-1 rounded-full bg-primary text-primary-foreground">
                      <Check className="w-3 h-3" />
                    </span>
                  )}
                </div>
                <h4 className="text-xs font-bold text-foreground">3) Both Face & GPS</h4>
                <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                  Dual authentication. Must match face biometrics AND be inside GPS geofence.
                </p>
              </div>
              <Badge variant="outline" className="mt-3 text-[10px] w-fit font-semibold">
                High Security Dual
              </Badge>
            </div>

            {/* 4. Wifi IP */}
            <div
              onClick={() => {
                setAttendanceMode('wifi_ip');
                setHasUnsavedChanges(true);
              }}
              className={`flex flex-col justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                attendanceMode === 'wifi_ip'
                  ? 'bg-primary/5 border-primary ring-2 ring-primary/20 shadow-2xs'
                  : 'bg-card border-border/80 hover:border-border hover:bg-muted/30'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
                    <Wifi className="w-5 h-5" />
                  </div>
                  {attendanceMode === 'wifi_ip' && (
                    <span className="p-1 rounded-full bg-primary text-primary-foreground">
                      <Check className="w-3 h-3" />
                    </span>
                  )}
                </div>
                <h4 className="text-xs font-bold text-foreground">4) Wi-Fi IP Network</h4>
                <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                  Allows punch only when device is connected to company Wi-Fi network / static IP.
                </p>
              </div>
              <Badge variant="outline" className="mt-3 text-[10px] w-fit font-semibold">
                Office Wi-Fi IP
              </Badge>
            </div>
          </div>

          {/* Conditional Detail Configurations based on chosen mode */}
          {(attendanceMode === 'gps' || attendanceMode === 'both') && (
            <div className="p-4 rounded-xl bg-muted/40 border border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <h5 className="text-xs font-bold text-foreground">GPS Geofence Radius (Meters)</h5>
                  <p className="text-[11px] text-muted-foreground">
                    Maximum allowed distance from office GPS location coordinates.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="10"
                  max="5000"
                  value={geofenceRadiusMeters}
                  onChange={(e) => {
                    setGeofenceRadiusMeters(Number(e.target.value));
                    setHasUnsavedChanges(true);
                  }}
                  className="w-28 h-8 text-xs font-semibold bg-card border-border"
                />
                <span className="text-xs font-semibold text-muted-foreground">meters</span>
              </div>
            </div>
          )}

          {attendanceMode === 'wifi_ip' && (
            <div className="p-4 rounded-xl bg-muted/40 border border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <Wifi className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                <div>
                  <h5 className="text-xs font-bold text-foreground">Whitelisted Company IP / Subnets</h5>
                  <p className="text-[11px] text-muted-foreground">
                    Comma-separated list of static IP addresses or router gateways allowed for punch.
                  </p>
                </div>
              </div>
              <Input
                type="text"
                placeholder="192.168.1.1, 10.0.0.1"
                value={whitelistedIPs}
                onChange={(e) => {
                  setWhitelistedIPs(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                className="w-full sm:w-72 h-8 text-xs font-mono bg-card border-border"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* SECTION 2: CHECK-IN & CHECK-OUT TIME CONFIGURATION */}
      <Card className="border border-border/80 shadow-2xs rounded-xl bg-card">
        <CardHeader className="pb-3 px-5 pt-5 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm font-bold">2. Check-In & Check-Out Rules</CardTitle>
          </div>
          <CardDescription className="text-xs text-muted-foreground mt-0.5">
            Configure whether check-out is mandatory and set standard shift timings and grace periods.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-5 space-y-5">
          {/* Check-Out Requirement Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-border/60 bg-muted/20 gap-4">
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${requireCheckout ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                <Timer className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-foreground">Require Check-Out Punch</h4>
                  <Badge variant="outline" className="text-[10px] font-semibold">
                    {requireCheckout ? 'Check-In & Check-Out Required' : 'Check-In Only Mode'}
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {requireCheckout
                    ? 'Employees must log both Check-In and Check-Out. Work hours are computed from actual total duration.'
                    : 'Check-out is NOT required. Employees only need to Check-In once per day for attendance credit.'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs font-semibold text-muted-foreground">
                {requireCheckout ? 'Both Enabled' : 'Check-In Only'}
              </span>
              <Switch
                checked={requireCheckout}
                onCheckedChange={(checked) => {
                  setRequireCheckout(checked);
                  setHasUnsavedChanges(true);
                }}
              />
            </div>
          </div>


        </CardContent>
      </Card>

      {/* SECTION 3: LIVE TRACKING CONFIGURATION */}
      <Card className="border border-border/80 shadow-2xs rounded-xl bg-card">
        <CardHeader className="pb-3 px-5 pt-5 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Navigation className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm font-bold">3. Live Employee GPS Tracking</CardTitle>
          </div>
          <CardDescription className="text-xs text-muted-foreground mt-0.5">
            Enable real-time GPS location tracking for field workers and mobile employees during working hours.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-5 space-y-5">
          {/* Main Live Tracking Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-border/60 bg-muted/20 gap-4">
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${liveTrackingEnabled ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground'}`}>
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-foreground">Enable Live GPS Location Tracking</h4>
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-semibold ${liveTrackingEnabled ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30' : ''}`}
                  >
                    {liveTrackingEnabled ? 'Live Tracking Active' : 'Live Tracking Disabled'}
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Continuously records background GPS coordinates of checked-in mobile employees for field operations and live tracking maps.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs font-semibold text-muted-foreground">
                {liveTrackingEnabled ? 'Enabled' : 'Disabled'}
              </span>
              <Switch
                checked={liveTrackingEnabled}
                onCheckedChange={(checked) => {
                  setLiveTrackingEnabled(checked);
                  setHasUnsavedChanges(true);
                }}
              />
            </div>
          </div>

          {/* Sub-Options Grid (Active when live tracking enabled) */}
          {liveTrackingEnabled && (
            <div className="grid grid-cols-1 md:grid-cols-1 gap-4 pt-2">
              {/* Tracking Ping Interval */}
              <div className="p-4 rounded-xl border border-border/60 bg-card space-y-2">
                <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Navigation className="w-3.5 h-3.5 text-blue-600" /> Location Ping Interval
                </label>
                <select
                  value={trackingIntervalMinutes}
                  onChange={(e) => {
                    setTrackingIntervalMinutes(Number(e.target.value));
                    setHasUnsavedChanges(true);
                  }}
                  className="w-full h-9 px-3 text-xs bg-muted/30 border border-border rounded-md font-semibold text-foreground"
                >
                  <option value={5}>Every 5 Minutes (Real-time)</option>
                  <option value={10}>Every 10 Minutes</option>
                  <option value={15}>Every 15 Minutes (Recommended)</option>
                  <option value={30}>Every 30 Minutes</option>
                  <option value={60}>Every 60 Minutes</option>
                </select>
                <p className="text-[10px] text-muted-foreground">Frequency at which employee GPS coordinates are sent to server.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Action Footer */}
      <Card className="border border-border/80 shadow-2xs rounded-xl bg-card">
        <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between p-4 px-5 gap-3">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-primary shrink-0" />
            <p className="text-xs text-muted-foreground">
              Changes apply instantly across mobile apps, web portal check-in kiosks, and live tracking maps upon saving.
            </p>
          </div>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="h-8 text-xs font-semibold gap-1.5 px-5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs shrink-0"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Saving Settings...' : 'Save Configuration'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default AttendanceModulePage;
