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
  GraduationCap,
  BookOpen,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/config/api';
import { Link, useNavigate } from 'react-router-dom';
import { HelpHint } from '../components/HelpHint';

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
                <h3 className="text-sm font-bold text-foreground tracking-tight flex items-center">
                  Leave Approval Workflow
                  <HelpHint
                    title="Leave Approval Workflow"
                    description="Controls how many approval stages are required before a leave is finally approved."
                    effect="Two-Stage: Employee → Team Lead/Manager → HR/Admin. Single-Stage: Employee → Team Lead/Manager (final)."
                    example="If set to Two-Stage, an employee's leave needs both their Manager's approval AND HR's approval."
                    titleMr="रजा मंजुरी प्रक्रिया"
                    descriptionMr="रजा अंतिम मंजूर होण्यापूर्वी किती टप्प्यांची मंजुरी आवश्यक आहे हे नियंत्रित करते."
                    effectMr="दोन-टप्पे: कर्मचारी → टीम लीड/व्यवस्थापक → HR/Admin. एक-टप्पा: कर्मचारी → टीम लीड/व्यवस्थापक (अंतिम)."
                    exampleMr="जर दोन-टप्पे निवडले असतील, तर कर्मचाऱ्याच्या रजेसाठी व्यवस्थापक आणि HR या दोघांची मंजुरी आवश्यक आहे."
                  />
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
                <h3 className="text-sm font-bold text-foreground tracking-tight flex items-center">
                  Sick Leave Medical Proof Threshold (Days)
                  <HelpHint
                    title="Sick Leave Medical Proof Threshold"
                    description="Sets the minimum consecutive Sick Leave days after which the employee MUST upload a medical certificate."
                    effect="If set to 3 days, any sick leave of 3 days or more will show a mandatory document upload prompt to the employee."
                    example="Employee takes 4 days SL → System blocks approval until medical certificate is uploaded."
                    titleMr="आजारी रजा वैद्यकीय पुरावा थ्रेशोल्ड"
                    descriptionMr="किमान किती दिवसांच्या आजारी रजेनंतर कर्मचाऱ्याने वैद्यकीय प्रमाणपत्र अपलोड करणे बंधनकारक आहे हे ठरवते."
                    effectMr="जर 3 दिवस निवडले, तर 3 किंवा अधिक दिवसांच्या आजारी रजेसाठी वैद्यकीय कागदपत्र अनिवार्य होईल."
                    exampleMr="कर्मचारी 4 दिवसांची SL घेतो → वैद्यकीय प्रमाणपत्र अपलोड केल्याशिवाय मंजुरी मिळणार नाही."
                  />
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

        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* Live Tracking Policy */}
          <Card className="border border-border/80 rounded-2xl shadow-xs bg-card p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground flex items-center">
                  Live Geolocation Tracking
                  <HelpHint
                    title="Live Geolocation Tracking"
                    description="When enabled, the system logs GPS coordinates of field employees at regular intervals during their shift."
                    effect="Employee app will request location permission. Breadcrumb trail is stored and visible on the live tracking map."
                    example="A sales executive's location is logged every 15 minutes while on field duty."
                    titleMr="थेट जिओलोकेशन ट्रॅकिंग"
                    descriptionMr="सक्रिय केल्यावर, शिफ्ट दरम्यान फील्ड कर्मचाऱ्यांचे GPS निर्देशांक नियमित अंतराने नोंदवले जातात."
                    effectMr="कर्मचाऱ्याच्या अॅपला लोकेशन परवानगी मागितली जाईल. ब्रेडक्रम्ब नकाशावर दिसेल."
                    exampleMr="विक्री कार्यकारी फील्डवर असताना दर 15 मिनिटांनी त्यांचे स्थान नोंदवले जाते."
                  />
                </p>
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
                <p className="text-xs font-bold text-foreground flex items-center">
                  Mandatory Clock-Out Verification
                  <HelpHint
                    title="Mandatory Clock-Out"
                    description="Forces employees to punch out before the end of the day. If missed, attendance is marked as incomplete."
                    effect="Incomplete attendance cannot be approved without regularization. Payroll deductions may apply."
                    example="If an employee forgets to clock out, the system marks attendance as 'Incomplete' until regularized."
                    titleMr="अनिवार्य क्लॉक-आउट"
                    descriptionMr="कर्मचाऱ्यांना दिवसाच्या शेवटी पंच आउट करणे बंधनकारक करते. चुकल्यास हजेरी अपूर्ण म्हणून नोंदवली जाते."
                    effectMr="अपूर्ण हजेरी नियमितीकरणाशिवाय मंजूर होणार नाही. पगार कपातही होऊ शकते."
                    exampleMr="कर्मचारी क्लॉक आउट विसरला तर सिस्टम हजेरी 'अपूर्ण' म्हणून नोंदवते."
                  />
                </p>
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
                <p className="text-xs font-bold text-foreground flex items-center">
                  Punch Verification Mode
                  <HelpHint
                    title="Punch Verification Mode"
                    description="Defines how the system verifies an employee's identity and location when they punch in/out."
                    effect="GPS: Employee must be within geofence radius. Face: Biometric verification via camera. Both: GPS + Face required together. IP/WiFi: Must be on the office network."
                    example="Select 'GPS + Face AI' for highest security — requires both location and face match."
                    titleMr="पंच व्हेरिफिकेशन मोड"
                    descriptionMr="कर्मचारी पंच इन/आउट करताना सिस्टम त्यांची ओळख आणि स्थान कसे सत्यापित करते हे ठरवते."
                    effectMr="GPS: जिओफेन्सच्या आत असणे आवश्यक. चेहरा: कॅमेऱ्याद्वारे बायोमेट्रिक. दोन्ही: GPS + चेहरा एकत्र. IP/WiFi: ऑफिस नेटवर्कवर असणे आवश्यक."
                    exampleMr="सर्वाधिक सुरक्षिततेसाठी 'GPS + Face AI' निवडा — स्थान आणि चेहरा दोन्ही जुळणे आवश्यक."
                  />
                </p>
                <p className="text-[11px] text-muted-foreground">GPS Location, Facial Biometric or IP</p>
              </div>
            </div>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
              GPS + Face enabled
            </span>
          </Card>

          {/* Geofence Radius */}
          <Card className="border border-border/80 rounded-2xl shadow-xs bg-card p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground flex items-center">
                  Geofence Radius (Meters)
                  <HelpHint
                    title="Geofence Radius"
                    description="The maximum distance (in meters) from the branch's GPS coordinates within which an employee can punch in."
                    effect="If employee is outside this radius, their punch attempt will be rejected with a location error."
                    example="Set to 100m: Employees within 100 meters of office can punch in. Beyond that, punch is blocked."
                    titleMr="जिओफेन्स रेडियस"
                    descriptionMr="शाखेच्या GPS निर्देशांकापासून किती मीटर अंतरावर कर्मचारी पंच इन करू शकतो हे ठरवते."
                    effectMr="या रेडियसच्या बाहेर असलेल्या कर्मचाऱ्याचा पंच नाकारला जाईल."
                    exampleMr="100 मीटर सेट केले: ऑफिसपासून 100 मीटरच्या आत असलेले कर्मचारी पंच करू शकतात. बाहेर असल्यास पंच ब्लॉक होईल."
                  />
                </p>
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

      {/* ─── LMS PLATFORM INTEGRATIONS SUBMODULE ─── */}
      <div className="space-y-3.5 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-black uppercase tracking-wider text-muted-foreground">
              LMS Platform Integrations &amp; Connectors
            </h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Connect external learning platforms like Udemy for Business, Coursera, and LinkedIn Learning for automated course sync and completion tracking.
            </p>
          </div>

          <Link to="/settings/lms-integrations">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs font-bold rounded-xl h-8 text-violet-600 border-violet-500/30 hover:bg-violet-50 dark:hover:bg-violet-950/20"
            >
              <GraduationCap className="w-3.5 h-3.5" /> Integration Hub <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>

        <Card className="border border-violet-500/20 rounded-2xl shadow-xs bg-violet-50/20 dark:bg-violet-950/10 hover:border-violet-500/40 transition-colors">
          <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5 min-w-0">
              <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 shrink-0">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-foreground tracking-tight flex items-center gap-2">
                  External LMS Platforms
                  <span className="text-[10px] bg-violet-100 dark:bg-violet-900/60 text-violet-700 dark:text-violet-300 px-2 py-0.5 rounded-full font-bold">Udemy · Coursera · LinkedIn</span>
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Enable platform toggles, configure API credentials (Client ID, Client Secret, API Key), and sync courses directly into your LMS Course Management.
                </p>
              </div>
            </div>

            <Link to="/settings/lms-integrations" className="shrink-0">
              <Button
                size="sm"
                className="gap-2 text-xs font-bold bg-violet-600 hover:bg-violet-700 text-white rounded-xl h-9 px-4 shadow-sm cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5" /> Configure Integrations
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
