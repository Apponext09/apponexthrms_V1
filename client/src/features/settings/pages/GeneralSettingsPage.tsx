import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ShieldCheck,
  Settings,
  Clock,
  MapPin,
  Save,
  RefreshCw,
  Sliders,
  CheckCircle2,
  Building2,
  Lock,
  Layers,
  ArrowRight,
  Palette,
  Sparkles,
  GitBranch,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/config/api';
import { Link, useNavigate } from 'react-router-dom';

export function GeneralSettingsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Settings State
  const [approvalLevels, setApprovalLevels] = useState<number>(2);
  const [sickLeaveDocThreshold, setSickLeaveDocThreshold] = useState<number>(3);
  const [liveTrackingEnabled, setLiveTrackingEnabled] = useState<boolean>(false);
  const [trackingInterval, setTrackingInterval] = useState<number>(15);
  const [geofenceRadius, setGeofenceRadius] = useState<number>(100);
  const [attendanceMode, setAttendanceMode] = useState<string>('gps');
  const [requireCheckout, setRequireCheckout] = useState<boolean>(true);

  // ... fetchSettings and saveSettings logic ...


  // Fetch Settings from API
  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/settings/org-settings');
      if (res.data?.success && res.data?.data) {
        const data = res.data.data;
        if (data.LEAVE_APPROVAL_LEVELS !== undefined) {
          setApprovalLevels(Number(data.LEAVE_APPROVAL_LEVELS));
        }
        if (data.sick_leave_doc_threshold !== undefined) {
          setSickLeaveDocThreshold(Number(data.sick_leave_doc_threshold));
        }
        if (data.live_tracking_enabled !== undefined) {
          setLiveTrackingEnabled(Boolean(data.live_tracking_enabled));
        }
        if (data.tracking_interval_minutes !== undefined) {
          setTrackingInterval(Number(data.tracking_interval_minutes));
        }
        if (data.geofence_radius_meters !== undefined) {
          setGeofenceRadius(Number(data.geofence_radius_meters));
        }
        if (data.attendance_mode !== undefined) {
          setAttendanceMode(String(data.attendance_mode));
        }
        if (data.require_checkout !== undefined) {
          setRequireCheckout(Boolean(data.require_checkout));
        }
      }
    } catch (err: any) {
      console.error('Failed to fetch org settings:', err);
      toast.error('Failed to load organization settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // Save Settings to API
  const saveSettings = async (override?: Record<string, any>) => {
    try {
      setSaving(true);
      const payload = {
        LEAVE_APPROVAL_LEVELS: approvalLevels,
        sick_leave_doc_threshold: sickLeaveDocThreshold,
        live_tracking_enabled: liveTrackingEnabled,
        tracking_interval_minutes: trackingInterval,
        geofence_radius_meters: geofenceRadius,
        attendance_mode: attendanceMode,
        require_checkout: requireCheckout,
        ...(override || {}),
      };

      const res = await apiClient.put('/settings/org-settings', payload);
      if (res.data?.success) {
        toast.success('Organization settings updated successfully!');
      } else {
        toast.error('Failed to update settings');
      }
    } catch (err: any) {
      console.error('Failed to save settings:', err);
      toast.error(err.response?.data?.message || 'Error saving organization settings');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleApprovalWorkflow = (checked: boolean) => {
    const newLevel = checked ? 2 : 1;
    setApprovalLevels(newLevel);
    saveSettings({ LEAVE_APPROVAL_LEVELS: newLevel });
  };

  const handleChangeSickLeaveThreshold = (val: number) => {
    setSickLeaveDocThreshold(val);
    saveSettings({ sick_leave_doc_threshold: val });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto font-sans select-none pb-14">
      {/* ─── HEADER ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2.5">
            <Settings className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            General Organization Settings
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Configure core approval workflows, medical compliance policies, attendance rules, and organizational defaults.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchSettings}
            className="gap-2 text-xs font-bold rounded-xl h-9 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => saveSettings()}
            disabled={saving}
            className="gap-2 text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-9 px-4 shadow-sm cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" /> {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* ─── CORE WORKFLOW & COMPLIANCE SETTINGS (Uploaded Design Matching) ─── */}
      <div className="space-y-3.5">
        <h2 className="text-xs font-black uppercase tracking-wider text-muted-foreground">
          Workflow &amp; Policy Rules
        </h2>

        {/* Custom Workflow Engine Settings */}
        <Card className="border border-indigo-500/30 rounded-2xl shadow-xs bg-indigo-50/30 dark:bg-indigo-950/20 hover:border-indigo-500/50 transition-colors">
          <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5 min-w-0">
              <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5 sm:mt-0">
                <GitBranch className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-foreground tracking-tight flex items-center gap-2">
                  Custom Workflow Engine Settings
                  <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full font-bold">Configurable</span>
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Configure custom multi-stage approval workflows, step roles (Reporting Officer, Employee, Dept, Role), form permissions, escalation SLA timers, and event notifications.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40">
              <Button
                size="sm"
                onClick={() => navigate('/settings/workflows')}
                className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs cursor-pointer shadow-xs"
              >
                Configure Workflows <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 1. Leave Approval Workflow */}
        <Card className="border border-border/80 rounded-2xl shadow-xs bg-card hover:border-border transition-colors">
          <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5 min-w-0">
              <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5 sm:mt-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-foreground tracking-tight">
                  Leave Approval Workflow
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Toggle between two-stage approval (requires Team Lead/Manager AND Admin/HR) or one-stage approval (Team Lead/Manager is final).
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40">
              <span className="text-xs font-bold text-muted-foreground whitespace-nowrap">
                {approvalLevels === 2
                  ? 'Two-Stage Approval (TL/Manager + HR)'
                  : 'Single-Stage Approval (TL/Manager Only)'}
              </span>
              <Switch
                checked={approvalLevels === 2}
                onCheckedChange={handleToggleApprovalWorkflow}
              />
            </div>
          </CardContent>
        </Card>

        {/* 2. Sick Leave Medical Proof Threshold (Days) */}
        <Card className="border border-border/80 rounded-2xl shadow-xs bg-card hover:border-border transition-colors">
          <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5 min-w-0">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5 sm:mt-0">
                <Sliders className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-foreground tracking-tight">
                  Sick Leave Medical Proof Threshold (Days)
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Specify the minimum duration of Sick Leave (SL) in days that will mandate employees to upload a supporting medical document.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40 w-full sm:w-auto">
              <select
                value={sickLeaveDocThreshold}
                onChange={(e) => handleChangeSickLeaveThreshold(Number(e.target.value))}
                className="w-full sm:w-60 h-10 px-3 rounded-xl border border-border bg-background text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-2xs cursor-pointer"
              >
                <option value={1}>1 Day or more</option>
                <option value={2}>2 Days or more</option>
                <option value={3}>3 Days or more (Default)</option>
                <option value={4}>4 Days or more</option>
                <option value={5}>5 Days or more</option>
              </select>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── DIGITAL ID CARD CUSTOMIZATION STUDIO ─── */}
      <div className="space-y-3.5 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-black uppercase tracking-wider text-muted-foreground">
              Digital ID Card &amp; Security Credentials
            </h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Design organization ID badges, header branding, photo styles, fields, QR codes, and print layouts
            </p>
          </div>

          <Link to="/settings/id-card-designer">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs font-bold rounded-xl h-8 text-primary border-primary/30 hover:bg-primary/10"
            >
              <ShieldCheck className="w-3.5 h-3.5" /> ID Card Designer <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>

        <Card className="border border-border/80 rounded-2xl shadow-xs bg-card hover:border-border transition-colors">
          <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5 min-w-0">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-foreground tracking-tight">
                  Visual ID Card Designer &amp; Templates
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Customize card background gradients, organization logo, employee photo shapes, drag-and-drop fields ordering, QR codes, back side return disclaimers, and N-up print sheets.
                </p>
              </div>
            </div>

            <Link to="/settings/id-card-designer" className="shrink-0">
              <Button
                size="sm"
                className="gap-2 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl h-9 px-4 shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5" /> Launch ID Designer
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* ─── CAREER & RECRUITMENT PORTAL CONFIGURATION ─── */}
      <div className="space-y-3.5 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-black uppercase tracking-wider text-muted-foreground">
              Career &amp; Recruitment Portal Configuration
            </h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Customize public job application fields, branding colors, banner images, and candidate submission rules
            </p>
          </div>

          <Link to="/settings/career-customization">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs font-bold rounded-xl h-8 text-indigo-600 border-indigo-500/30 hover:bg-indigo-50 dark:hover:bg-indigo-950/20"
            >
              <Palette className="w-3.5 h-3.5" /> Career Portal Studio <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>

        <Card className="border border-border/80 rounded-2xl shadow-xs bg-card hover:border-border transition-colors">
          <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5 min-w-0">
              <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0">
                <Palette className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-foreground tracking-tight">
                  Public Career Page Customizer
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Configure custom fields for candidate application forms, change portal colors, upload brand banners, and manage public job listing settings.
                </p>
              </div>
            </div>

            <Link to="/settings/career-customization" className="shrink-0">
              <Button
                size="sm"
                className="gap-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-9 px-4 shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5" /> Customize Career Portal
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* ─── ATTENDANCE MODULE CONFIGURATION SECTION ─── */}
      <div className="space-y-3.5 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-black uppercase tracking-wider text-muted-foreground">
              Attendance Module Configuration
            </h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Configure verification modes, geofencing, IP whitelists, check-in/out rules and live tracking
            </p>
          </div>

          <Link to="/settings/attendance-module">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs font-bold rounded-xl h-8 text-sky-600 border-sky-500/30 hover:bg-sky-50 dark:hover:bg-sky-950/20"
            >
              <Clock className="w-3.5 h-3.5" /> Full Attendance Module Studio <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* Live Tracking Policy */}
          <Card className="border border-border/80 rounded-2xl shadow-xs bg-card p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">Live Geolocation Tracking</p>
                <p className="text-[11px] text-muted-foreground">Log field employee coordinates during shift</p>
              </div>
            </div>
            <Switch
              checked={liveTrackingEnabled}
              onCheckedChange={(checked) => {
                setLiveTrackingEnabled(checked);
                saveSettings({ live_tracking_enabled: checked });
              }}
            />
          </Card>

          {/* Mandatory Check-Out */}
          <Card className="border border-border/80 rounded-2xl shadow-xs bg-card p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">Mandatory Clock-Out Verification</p>
                <p className="text-[11px] text-muted-foreground">Require clock-out punch before midnight</p>
              </div>
            </div>
            <Switch
              checked={requireCheckout}
              onCheckedChange={(checked) => {
                setRequireCheckout(checked);
                saveSettings({ require_checkout: checked });
              }}
            />
          </Card>

          {/* Verification Mode Selector */}
          <Card className="border border-border/80 rounded-2xl shadow-xs bg-card p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">Punch Verification Mode</p>
                <p className="text-[11px] text-muted-foreground">GPS Location, Facial Biometric or IP</p>
              </div>
            </div>
            <select
              value={attendanceMode}
              onChange={(e) => {
                const val = e.target.value;
                setAttendanceMode(val);
                saveSettings({ attendance_mode: val });
              }}
              className="h-9 px-2.5 rounded-xl border border-border bg-background text-xs font-bold text-foreground focus:outline-none cursor-pointer"
            >
              <option value="gps">GPS Geofencing</option>
              <option value="face">Facial Recognition</option>
              <option value="both">GPS + Face AI</option>
              <option value="wifi_ip">Office IP / WiFi</option>
            </select>
          </Card>

          {/* Geofence Radius */}
          <Card className="border border-border/80 rounded-2xl shadow-xs bg-card p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">Geofence Radius (Meters)</p>
                <p className="text-[11px] text-muted-foreground">Allowed distance from branch coordinate</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <Input
                type="number"
                value={geofenceRadius}
                onChange={(e) => setGeofenceRadius(Number(e.target.value))}
                onBlur={() => saveSettings({ geofence_radius_meters: geofenceRadius })}
                className="w-20 h-9 text-xs font-bold text-center"
              />
              <span className="text-xs font-bold text-muted-foreground">m</span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
