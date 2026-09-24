import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Clock,
  Award,
  ShieldCheck,
  Bell,
  FileText,
  Users,
  Database,
  Settings,
  Lock,
  Zap,
  Calendar,
  IndianRupee,
  Plus,
  Trash2,
  Save,
  RefreshCw,
  Search,
  ChevronRight,
  Sliders,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { HelpHint } from '../components/HelpHint';
import { apiClient } from '@/config/api';

export type ConfigTabId =
  | 'attendance-adjustment'
  | 'credit-hour'
  | 'roles-permissions'
  | 'notification-setting'
  | 'form-type'
  | 'user-configuration'
  | 'config-master'
  | 'general-setting'
  | 'restrict-ip'
  | 'overtime-access'
  | 'notice-period'
  | 'field-allowance';

interface ConfigTabItem {
  id: ConfigTabId;
  label: string;
  badge?: string;
  icon: React.ElementType;
  description: string;
  category: 'Attendance & Time' | 'Access & Security' | 'System & Workflow' | 'Policy & Compensation';
}

const CONFIG_TABS: ConfigTabItem[] = [
  {
    id: 'attendance-adjustment',
    label: 'Attendance Adjustment',
    icon: Clock,
    description: 'Regularization request limits, approval windows, late tolerance & deductions.',
    category: 'Attendance & Time',
  },
  {
    id: 'credit-hour',
    label: 'Credit Hour Setting',
    icon: Award,
    description: 'Comp-off credit multipliers, min extra hours, validity & balance caps.',
    category: 'Attendance & Time',
  },
  {
    id: 'roles-permissions',
    label: 'Roles & Permission',
    icon: ShieldCheck,
    description: 'RBAC user role definitions & fine-grained permission assignment matrix.',
    category: 'Access & Security',
  },
  {
    id: 'notification-setting',
    label: 'Notification Setting',
    icon: Bell,
    description: 'Configure In-App, Email, SMS & WhatsApp notifications and alert triggers.',
    category: 'System & Workflow',
  },
  {
    id: 'form-type',
    label: 'Form Type',
    icon: FileText,
    description: 'Custom document form types, mandatory field definitions & dynamic parameters.',
    category: 'System & Workflow',
  },
  {
    id: 'user-configuration',
    label: 'User Configuration',
    icon: Users,
    description: 'Password complexity rules, session timeout, MFA & login limits.',
    category: 'Access & Security',
  },
  {
    id: 'config-master',
    label: 'Config Master',
    icon: Database,
    description: 'System key-value master parameters, system defaults & dropdown choices.',
    category: 'System & Workflow',
  },
  {
    id: 'general-setting',
    label: 'General Setting',
    icon: Settings,
    description: 'Organization defaults, timezone, leave approval levels & company info.',
    category: 'System & Workflow',
  },
  {
    id: 'restrict-ip',
    label: 'Restrict IP',
    icon: Lock,
    description: 'IP whitelisting allowed addresses, subnet CIDR rules & remote bypass roles.',
    category: 'Access & Security',
  },
  {
    id: 'overtime-access',
    label: 'Over Time Access Setting',
    icon: Zap,
    description: 'OT pre-approval requirements, max daily OT hours & multiplier rates.',
    category: 'Attendance & Time',
  },
  {
    id: 'notice-period',
    label: 'Notice Period',
    icon: Calendar,
    description: 'Standard notice days by grade, buyout policy & leave usage rules.',
    category: 'Policy & Compensation',
  },
  {
    id: 'field-allowance',
    label: 'Field Allowance Setting',
    icon: IndianRupee,
    description: 'Daily field duty rates, per-km travel reimbursements & approval thresholds.',
    category: 'Policy & Compensation',
  },
];

export function HRConfigurationPage() {
  const [activeTab, setActiveTab] = useState<ConfigTabId>('attendance-adjustment');
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);

  // ── Tab 1: Attendance Adjustment
  const [attAdjWindow, setAttAdjWindow] = useState(5);
  const [attAdjMaxPerMonth, setAttAdjMaxPerMonth] = useState(3);
  const [lateToleranceMins, setLateToleranceMins] = useState(15);
  const [halfDayDeductionLateCount, setHalfDayDeductionLateCount] = useState(3);

  // ── Tab 2: Credit Hour Setting
  const [creditMinHours, setCreditMinHours] = useState(2);
  const [creditHalfDayHours, setCreditHalfDayHours] = useState(4);
  const [creditValidityDays, setCreditValidityDays] = useState(60);
  const [creditMaxAccumulation, setCreditMaxAccumulation] = useState(10);
  const [creditEncashable, setCreditEncashable] = useState(true);

  // ── Tab 3: Roles & Permissions
  const [selectedRole, setSelectedRole] = useState('hr');
  const [roleMatrix, setRoleMatrix] = useState<Record<string, Record<string, boolean>>>({
    organization_admin: {
      'employee.view': true,
      'employee.edit': true,
      'payroll.process': true,
      'attendance.approve': true,
      'leaves.approve': true,
      'settings.edit': true,
    },
    hr: {
      'employee.view': true,
      'employee.edit': true,
      'payroll.process': true,
      'attendance.approve': true,
      'leaves.approve': true,
      'settings.edit': false,
    },
    department_head: {
      'employee.view': true,
      'employee.edit': false,
      'payroll.process': false,
      'attendance.approve': true,
      'leaves.approve': true,
      'settings.edit': false,
    },
    team_lead: {
      'employee.view': true,
      'employee.edit': false,
      'payroll.process': false,
      'attendance.approve': true,
      'leaves.approve': true,
      'settings.edit': false,
    },
    employee: {
      'employee.view': false,
      'employee.edit': false,
      'payroll.process': false,
      'attendance.approve': false,
      'leaves.approve': false,
      'settings.edit': false,
    },
  });

  // ── Tab 4: Notification Setting
  const [notifChannels, setNotifChannels] = useState({
    email: true,
    inApp: true,
    sms: false,
    whatsapp: false,
  });

  // ── Tab 5: Form Type
  const [formTypes, setFormTypes] = useState([
    { id: 1, name: 'Medical Certificate', code: 'MED_CERT', mandatory: true },
    { id: 2, name: 'Expense Receipt', code: 'EXP_RCPT', mandatory: true },
    { id: 3, name: 'Address Proof', code: 'ADDR_PRF', mandatory: false },
    { id: 4, name: 'Relieving Letter', code: 'REL_LTR', mandatory: false },
  ]);
  const [newFormName, setNewFormName] = useState('');
  const [newFormCode, setNewFormCode] = useState('');

  // ── Tab 6: User Configuration
  const [minPasswordLength, setMinPasswordLength] = useState(8);
  const [sessionTimeoutMins, setSessionTimeoutMins] = useState(30);
  const [mfaEnforced, setMfaEnforced] = useState(false);

  // ── Tab 7: Config Master
  const [masterParams, setMasterParams] = useState([
    { key: 'ORG_FISCAL_YEAR_START', value: '04-01', desc: 'Fiscal year start date (MM-DD)' },
    { key: 'MAX_FILE_UPLOAD_MB', value: '10', desc: 'Maximum attachment file size in MB' },
    { key: 'DEFAULT_TIMEZONE', value: 'Asia/Kolkata', desc: 'System timezone string' },
    { key: 'CURRENCY_SYMBOL', value: '₹', desc: 'Default currency symbol' },
  ]);

  // ── Tab 8: General Setting
  const [companyName, setCompanyName] = useState('Apponext Enterprise');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [leaveApprovalLevels, setLeaveApprovalLevels] = useState(2);

  // ── Tab 9: Restrict IP
  const [ipRestricted, setIpRestricted] = useState(false);
  const [allowedIps, setAllowedIps] = useState([
    { id: 1, ip: '192.168.1.1', desc: 'Main Office Gateway' },
    { id: 2, ip: '10.0.0.0/24', desc: 'Corporate VPN Subnet' },
  ]);
  const [newIpAddress, setNewIpAddress] = useState('');
  const [newIpDesc, setNewIpDesc] = useState('');

  // ── Tab 10: Overtime Access Setting
  const [otPreApprovalRequired, setOtPreApprovalRequired] = useState(true);
  const [maxOtHoursPerDay, setMaxOtHoursPerDay] = useState(4);
  const [maxOtHoursPerMonth, setMaxOtHoursPerMonth] = useState(40);

  // ── Tab 11: Notice Period
  const [noticePeriodDays, setNoticePeriodDays] = useState(30);
  const [probationNoticeDays, setProbationNoticeDays] = useState(15);
  const [noticeBuyoutAllowed, setNoticeBuyoutAllowed] = useState(true);

  // ── Tab 12: Field Allowance Setting
  const [fieldDutyDailyAllowance, setFieldDutyDailyAllowance] = useState(500);
  const [perKmReimbursementRate, setPerKmReimbursementRate] = useState(12);

  // ── Load live settings from backend on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await apiClient.get('/settings/org-settings');
        const data = res.data?.data || {};

        // Tab 1: Attendance Adjustment
        if (data.att_adj_window_days !== undefined) setAttAdjWindow(Number(data.att_adj_window_days));
        if (data.att_adj_max_per_month !== undefined) setAttAdjMaxPerMonth(Number(data.att_adj_max_per_month));
        if (data.late_tolerance_minutes !== undefined) setLateToleranceMins(Number(data.late_tolerance_minutes));
        if (data.half_day_deduction_late_count !== undefined) setHalfDayDeductionLateCount(Number(data.half_day_deduction_late_count));

        // Tab 2: Credit Hour
        if (data.credit_min_hours !== undefined) setCreditMinHours(Number(data.credit_min_hours));
        if (data.credit_half_day_hours !== undefined) setCreditHalfDayHours(Number(data.credit_half_day_hours));
        if (data.credit_validity_days !== undefined) setCreditValidityDays(Number(data.credit_validity_days));
        if (data.credit_max_accumulation !== undefined) setCreditMaxAccumulation(Number(data.credit_max_accumulation));
        if (data.credit_encashable !== undefined) setCreditEncashable(Boolean(data.credit_encashable));

        // Tab 3: Roles & Permission Matrix
        if (data.role_permissions_matrix !== undefined) {
          setRoleMatrix(typeof data.role_permissions_matrix === 'object' ? data.role_permissions_matrix : JSON.parse(data.role_permissions_matrix));
        }

        // Tab 4: Notification Setting
        setNotifChannels({
          email: data.notif_channel_email !== undefined ? Boolean(data.notif_channel_email) : true,
          inApp: data.notif_channel_in_app !== undefined ? Boolean(data.notif_channel_in_app) : true,
          sms: data.notif_channel_sms !== undefined ? Boolean(data.notif_channel_sms) : false,
          whatsapp: data.notif_channel_whatsapp !== undefined ? Boolean(data.notif_channel_whatsapp) : false,
        });

        // Tab 5: Form Type
        if (data.custom_form_types !== undefined) {
          setFormTypes(Array.isArray(data.custom_form_types) ? data.custom_form_types : JSON.parse(data.custom_form_types));
        }

        // Tab 6: User Configuration
        if (data.password_min_length !== undefined) setMinPasswordLength(Number(data.password_min_length));
        if (data.session_timeout_minutes !== undefined) setSessionTimeoutMins(Number(data.session_timeout_minutes));
        if (data.mfa_enforced !== undefined) setMfaEnforced(Boolean(data.mfa_enforced));

        // Tab 7: Config Master
        if (data.config_master_params !== undefined) {
          setMasterParams(Array.isArray(data.config_master_params) ? data.config_master_params : JSON.parse(data.config_master_params));
        }

        // Tab 8: General Setting
        if (data.company_display_name !== undefined) setCompanyName(String(data.company_display_name));
        if (data.default_timezone !== undefined) setTimezone(String(data.default_timezone));
        if (data.leave_approval_levels !== undefined) setLeaveApprovalLevels(Number(data.leave_approval_levels));

        // Tab 9: Restrict IP
        if (data.ip_restriction_enabled !== undefined) setIpRestricted(Boolean(data.ip_restriction_enabled));
        if (data.ip_whitelist_rules !== undefined) {
          setAllowedIps(Array.isArray(data.ip_whitelist_rules) ? data.ip_whitelist_rules : JSON.parse(data.ip_whitelist_rules));
        }

        // Tab 10: Overtime Access
        if (data.ot_pre_approval_required !== undefined) setOtPreApprovalRequired(Boolean(data.ot_pre_approval_required));
        if (data.ot_max_hours_per_day !== undefined) setMaxOtHoursPerDay(Number(data.ot_max_hours_per_day));
        if (data.ot_max_hours_per_month !== undefined) setMaxOtHoursPerMonth(Number(data.ot_max_hours_per_month));

        // Tab 11: Notice Period
        if (data.notice_period_days !== undefined) setNoticePeriodDays(Number(data.notice_period_days));
        if (data.probation_notice_days !== undefined) setProbationNoticeDays(Number(data.probation_notice_days));
        if (data.notice_buyout_allowed !== undefined) setNoticeBuyoutAllowed(Boolean(data.notice_buyout_allowed));

        // Tab 12: Field Allowance
        if (data.field_duty_daily_allowance !== undefined) setFieldDutyDailyAllowance(Number(data.field_duty_daily_allowance));
        if (data.per_km_reimbursement_rate !== undefined) setPerKmReimbursementRate(Number(data.per_km_reimbursement_rate));
      } catch (err) {
        console.error('[HRConfig] Failed to load org-settings:', err);
      } finally {
        setLoadingSettings(false);
      }
    };
    fetchSettings();
  }, []);

  // Filter tabs
  const filteredTabs = CONFIG_TABS.filter(
    (t) =>
      t.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeTabMeta = CONFIG_TABS.find((t) => t.id === activeTab) || CONFIG_TABS[0];

  const handleSaveCurrentTab = async () => {
    setSaving(true);
    try {
      if (activeTab === 'attendance-adjustment') {
        await apiClient.put('/settings/org-settings', {
          att_adj_window_days: attAdjWindow,
          att_adj_max_per_month: attAdjMaxPerMonth,
          late_tolerance_minutes: lateToleranceMins,
          half_day_deduction_late_count: halfDayDeductionLateCount,
        });
        toast.success('Attendance Adjustment settings saved successfully!');
      } else if (activeTab === 'credit-hour') {
        await apiClient.put('/settings/org-settings', {
          credit_min_hours: creditMinHours,
          credit_half_day_hours: creditHalfDayHours,
          credit_validity_days: creditValidityDays,
          credit_max_accumulation: creditMaxAccumulation,
          credit_encashable: creditEncashable,
        });
        toast.success('Credit Hour settings saved successfully!');
      } else if (activeTab === 'roles-permissions') {
        await apiClient.put('/settings/org-settings', {
          role_permissions_matrix: roleMatrix,
        });
        toast.success('Roles & Permission matrix saved successfully!');
      } else if (activeTab === 'notification-setting') {
        await apiClient.put('/settings/org-settings', {
          notif_channel_email: notifChannels.email,
          notif_channel_in_app: notifChannels.inApp,
          notif_channel_sms: notifChannels.sms,
          notif_channel_whatsapp: notifChannels.whatsapp,
        });
        toast.success('Notification channels updated successfully!');
      } else if (activeTab === 'form-type') {
        await apiClient.put('/settings/org-settings', {
          custom_form_types: formTypes,
        });
        toast.success('Form types saved successfully!');
      } else if (activeTab === 'user-configuration') {
        await apiClient.put('/settings/org-settings', {
          password_min_length: minPasswordLength,
          session_timeout_minutes: sessionTimeoutMins,
          mfa_enforced: mfaEnforced,
        });
        toast.success('User configuration saved successfully!');
      } else if (activeTab === 'config-master') {
        await apiClient.put('/settings/org-settings', {
          config_master_params: masterParams,
        });
        toast.success('Config Master parameters saved successfully!');
      } else if (activeTab === 'general-setting') {
        await apiClient.put('/settings/org-settings', {
          company_display_name: companyName,
          default_timezone: timezone,
          leave_approval_levels: leaveApprovalLevels,
        });
        toast.success('General settings saved successfully!');
      } else if (activeTab === 'restrict-ip') {
        await apiClient.put('/settings/org-settings', {
          ip_restriction_enabled: ipRestricted,
          ip_whitelist_rules: allowedIps,
        });
        toast.success('IP restriction settings saved successfully!');
      } else if (activeTab === 'overtime-access') {
        await apiClient.put('/settings/org-settings', {
          ot_pre_approval_required: otPreApprovalRequired,
          ot_max_hours_per_day: maxOtHoursPerDay,
          ot_max_hours_per_month: maxOtHoursPerMonth,
        });
        toast.success('Overtime access settings saved successfully!');
      } else if (activeTab === 'notice-period') {
        await apiClient.put('/settings/org-settings', {
          notice_period_days: noticePeriodDays,
          probation_notice_days: probationNoticeDays,
          notice_buyout_allowed: noticeBuyoutAllowed,
        });
        toast.success('Notice period configuration saved successfully!');
      } else if (activeTab === 'field-allowance') {
        await apiClient.put('/settings/org-settings', {
          field_duty_daily_allowance: fieldDutyDailyAllowance,
          per_km_reimbursement_rate: perKmReimbursementRate,
        });
        toast.success('Field allowance rates saved successfully!');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleAddIp = () => {
    if (!newIpAddress.trim()) {
      toast.error('Please enter a valid IP address or CIDR range');
      return;
    }
    setAllowedIps((prev) => [
      ...prev,
      { id: Date.now(), ip: newIpAddress.trim(), desc: newIpDesc.trim() || 'Custom IP' },
    ]);
    setNewIpAddress('');
    setNewIpDesc('');
    toast.success('IP address added to whitelist');
  };

  const handleDeleteIp = (id: number) => {
    setAllowedIps((prev) => prev.filter((item) => item.id !== id));
    toast.success('IP address removed');
  };

  const handleAddFormType = () => {
    if (!newFormName.trim()) {
      toast.error('Please enter form name');
      return;
    }
    const code = newFormCode.trim() || newFormName.toUpperCase().replace(/\s+/g, '_');
    setFormTypes((prev) => [
      ...prev,
      { id: Date.now(), name: newFormName.trim(), code, mandatory: false },
    ]);
    setNewFormName('');
    setNewFormCode('');
    toast.success('Form type added');
  };

  const handleDeleteFormType = (id: number) => {
    setFormTypes((prev) => prev.filter((f) => f.id !== id));
    toast.success('Form type removed');
  };

  // Helper to toggle permission for selected role
  const currentRolePermissions = roleMatrix[selectedRole] || {};
  const handleToggleRolePermission = (permKey: string, val: boolean) => {
    setRoleMatrix((prev) => ({
      ...prev,
      [selectedRole]: {
        ...(prev[selectedRole] || {}),
        [permKey]: val,
      },
    }));
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans select-none pb-14">
      {/* HEADER BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2.5">
            <Sliders className="w-7 h-7 text-rose-600 dark:text-rose-400" />
            HR Operations Configuration Hub
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Configure system rules, attendance policies, roles, IP restrictions, notice periods, and allowances.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            size="sm"
            onClick={handleSaveCurrentTab}
            disabled={saving}
            className="bg-rose-600 hover:bg-rose-700 text-white font-bold gap-2 px-5 h-9 rounded-xl shadow-sm cursor-pointer"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Configuration
          </Button>
        </div>
      </div>

      {/* Dynamic banner: Live connected banner */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-300/60 dark:border-emerald-700/40 text-emerald-800 dark:text-emerald-300">
        <span className="text-lg leading-none mt-0.5">✅</span>
        <div className="text-xs leading-relaxed">
          <span className="font-bold">Live — Backend Connected. </span>
          हे सेटिंग्ज Database मध्ये सेव्ह होतात आणि प्रत्यक्षात कार्यान्वित होतात.
          <span className="ml-1 text-emerald-600 dark:text-emerald-400 font-medium">| Changes take effect immediately across all modules after saving.</span>
        </div>
      </div>

      {/* MAIN TWO-COLUMN LAYOUT WITH SIDEBAR */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* SIDEBAR NAVIGATION (3 COLS) */}
        <div className="md:col-span-4 lg:col-span-3 space-y-4">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
            <Input
              placeholder="Search configuration tabs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 text-xs rounded-xl bg-background"
            />
          </div>

          {/* Sidebar Item List */}
          <div className="space-y-1 bg-card border rounded-2xl p-2 shadow-2xs">
            {filteredTabs.map((tab) => {
              const IconComp = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-left transition-all cursor-pointer',
                    isActive
                      ? 'bg-rose-600 text-white font-bold shadow-sm'
                      : 'text-foreground hover:bg-muted hover:text-foreground font-medium'
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <IconComp className={cn('w-4 h-4 flex-shrink-0', isActive ? 'text-white' : 'text-rose-600 dark:text-rose-400')} />
                    <span className="text-xs truncate">{tab.label}</span>
                  </div>
                  <ChevronRight className={cn('w-3.5 h-3.5 flex-shrink-0 opacity-70', isActive ? 'text-white' : 'text-muted-foreground')} />
                </button>
              );
            })}

            {filteredTabs.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-6">No matching configurations found.</p>
            )}
          </div>
        </div>

        {/* MAIN CONFIGURATION CONTENT (9 COLS) */}
        <div className="md:col-span-8 lg:col-span-9">
          <Card className="rounded-2xl border shadow-2xs overflow-hidden">
            <CardHeader className="bg-muted/30 border-b pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
                  {React.createElement(activeTabMeta.icon, { className: 'w-5 h-5' })}
                </div>
                <div>
                  <CardTitle className="text-lg font-bold">{activeTabMeta.label}</CardTitle>
                  <CardDescription className="text-xs mt-0.5">{activeTabMeta.description}</CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6">
              {/* TAB 1: ATTENDANCE ADJUSTMENT */}
              {activeTab === 'attendance-adjustment' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold flex items-center">
                        Regularization Window (Days)
                        <HelpHint
                          title="Regularization Window"
                          description="Number of days past the actual punch date within which an employee can submit an attendance regularization request."
                          effect="After this window expires, the employee cannot submit a regularization for that day — HR must manually correct it."
                          example="Window = 5 days: If punch was missed on Monday, employee can regularize until Saturday."
                          titleMr="नियमितीकरण विंडो (दिवस)"
                          descriptionMr="वास्तविक पंच तारखेनंतर किती दिवसांपर्यंत कर्मचारी हजेरी नियमितीकरण विनंती सादर करू शकतो."
                          effectMr="ही विंडो संपल्यावर कर्मचारी त्या दिवसासाठी नियमितीकरण करू शकत नाही — HR ला मॅन्युअली सुधारणा करावी लागेल."
                          exampleMr="विंडो = 5 दिवस: सोमवारी पंच चुकल्यास शनिवारपर्यंत नियमितीकरण करता येईल."
                        />
                      </Label>
                      <Input
                        type="number"
                        value={attAdjWindow}
                        onChange={(e) => setAttAdjWindow(Number(e.target.value))}
                        className="h-10 text-sm"
                      />
                      <p className="text-[11px] text-muted-foreground">Days past punch to allow adjustment request.</p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold flex items-center">
                        Max Requests / Month
                        <HelpHint
                          title="Max Regularization Requests per Month"
                          description="Limits the number of attendance regularization requests an employee can submit per calendar month."
                          effect="Once the limit is reached, the employee's regularization button is disabled until the next month."
                          example="Limit = 3: Employee can regularize at most 3 days per month."
                          titleMr="जास्तीत जास्त विनंत्या / महिना"
                          descriptionMr="एक कर्मचारी एका महिन्यात किती हजेरी नियमितीकरण विनंत्या सादर करू शकतो यावर मर्यादा घालतो."
                          effectMr="मर्यादा पोहोचल्यावर पुढील महिन्यापर्यंत कर्मचाऱ्याचा नियमितीकरण बटण बंद होतो."
                          exampleMr="मर्यादा = 3: कर्मचारी महिन्यात जास्तीत जास्त 3 दिवस नियमित करू शकतो."
                        />
                      </Label>
                      <Input
                        type="number"
                        value={attAdjMaxPerMonth}
                        onChange={(e) => setAttAdjMaxPerMonth(Number(e.target.value))}
                        className="h-10 text-sm"
                      />
                      <p className="text-[11px] text-muted-foreground">Limit per employee per calendar month.</p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold flex items-center">
                        Late Grace Tolerance (Minutes)
                        <HelpHint
                          title="Late Grace Tolerance"
                          description="Number of minutes after the scheduled shift start time that are NOT counted as late arrival."
                          effect="Arriving within grace period = On Time. Beyond grace = marked Late. Too many lates trigger deductions."
                          example="Grace = 15 mins, Shift starts 9:00 AM: Arrival at 9:14 AM = On Time. 9:16 AM = Late."
                          titleMr="उशीर सहनशीलता (मिनिटे)"
                          descriptionMr="शिफ्ट सुरू होण्याच्या वेळेनंतर किती मिनिटे उशीर होऊनही 'वेळेवर' मानला जाईल."
                          effectMr="या वेळेत आल्यास वेळेवर. त्यानंतर आल्यास उशीरा नोंद. जास्त उशीरा नोंदींमुळे कपात होते."
                          exampleMr="Grace = 15 मिनिटे, शिफ्ट 9:00: 9:14 ला आल्यास वेळेवर. 9:16 ला आल्यास उशीरा."
                        />
                      </Label>
                      <Input
                        type="number"
                        value={lateToleranceMins}
                        onChange={(e) => setLateToleranceMins(Number(e.target.value))}
                        className="h-10 text-sm"
                      />
                      <p className="text-[11px] text-muted-foreground">Grace period before marking late arrival.</p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold flex items-center">
                        Late Count for Half-Day Deduction
                        <HelpHint
                          title="Late Count for Half-Day Deduction"
                          description="Number of late arrivals in a month after which a half-day leave deduction is automatically applied."
                          effect="Each time this count is crossed, the system auto-deducts half a day from the employee's leave balance."
                          example="Count = 3: If employee is late 3 times in a month, 0.5 day leave is deducted automatically."
                          titleMr="अर्ध-दिवस कपातीसाठी उशीर मोजणी"
                          descriptionMr="महिन्यात किती वेळा उशीर झाल्यावर अर्धा दिवस रजा आपोआप कापली जाईल."
                          effectMr="ही संख्या ओलांडल्यावर सिस्टम कर्मचाऱ्याच्या रजा शिल्लकातून 0.5 दिवस आपोआप कापतो."
                          exampleMr="संख्या = 3: कर्मचारी महिन्यात 3 वेळा उशीरा आल्यास 0.5 दिवस रजा आपोआप कापली जाते."
                        />
                      </Label>
                      <Input
                        type="number"
                        value={halfDayDeductionLateCount}
                        onChange={(e) => setHalfDayDeductionLateCount(Number(e.target.value))}
                        className="h-10 text-sm"
                      />
                      <p className="text-[11px] text-muted-foreground">Cumulative late punches triggering half-day leave.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: CREDIT HOUR SETTING */}
              {activeTab === 'credit-hour' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold flex items-center">
                        Min Overtime Hours for Credit
                        <HelpHint
                          title="Min Overtime Hours for Credit"
                          description="The minimum number of extra hours worked in a day required to earn comp-off / credit hours."
                          effect="Work done below this threshold is not converted into credit leave."
                          example="Threshold = 2 hrs: Working 1.5 extra hours gives 0 credit; working 2+ hours earns credit."
                          titleMr="क्रेडिटसाठी किमान जादा तास"
                          descriptionMr="क्रेडिट / कॉम्प-ऑफ मिळवण्यासाठी दिवसात किमान किती जादा तास काम करणे आवश्यक आहे."
                          effectMr="या मर्यादेपेक्षा कमी काम केल्यास क्रेडिट रजा मिळत नाही."
                          exampleMr="मर्यादा = 2 तास: 1.5 तास काम केल्यास 0 क्रेडिट; 2 किंवा अधिक तास केल्यास क्रेडिट मिळेल."
                        />
                      </Label>
                      <Input
                        type="number"
                        value={creditMinHours}
                        onChange={(e) => setCreditMinHours(Number(e.target.value))}
                        className="h-10 text-sm"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold flex items-center">
                        Hours for Half-Day Comp-Off
                        <HelpHint
                          title="Hours for Half-Day Comp-Off"
                          description="The number of accumulated credit hours needed to grant a half-day compensatory leave."
                          effect="Employee can exchange this amount of credit hours for 0.5 day leave."
                          example="4 hours = 0.5 day comp-off leave."
                          titleMr="अर्ध-दिवस कॉम्प-ऑफसाठी तास"
                          descriptionMr="अर्धा दिवस कॉम्प-ऑफ रजा मिळण्यासाठी किती क्रेडिट तास आवश्यक आहेत."
                          effectMr="कर्मचारी हे तास 0.5 दिवसाच्या रजेमध्ये रूपांतरित करू शकतो."
                          exampleMr="4 तास = 0.5 दिवस कॉम्प-ऑफ रजा."
                        />
                      </Label>
                      <Input
                        type="number"
                        value={creditHalfDayHours}
                        onChange={(e) => setCreditHalfDayHours(Number(e.target.value))}
                        className="h-10 text-sm"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold flex items-center">
                        Credit Validity (Days)
                        <HelpHint
                          title="Credit Validity (Days)"
                          description="Number of days from the date earned before accrued credit hours expire."
                          effect="Unused credit hours are lapsed automatically after this number of days."
                          example="Validity = 60 days: Credit earned on Jan 1 must be availed before March 2."
                          titleMr="क्रेडिट वैधता (दिवस)"
                          descriptionMr="मिळवलेले क्रेडिट तास किती दिवसांत वापरणे आवश्यक आहे, त्यानंतर ते रद्द होतील."
                          effectMr="मुदत संपल्यावर न वापरलेले क्रेडिट तास आपोआप रद्द (lapse) होतात."
                          exampleMr="वैधता = 60 दिवस: 1 जानेवारीला मिळालेले क्रेडिट 2 मार्चपूर्वी वापरावे लागेल."
                        />
                      </Label>
                      <Input
                        type="number"
                        value={creditValidityDays}
                        onChange={(e) => setCreditValidityDays(Number(e.target.value))}
                        className="h-10 text-sm"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold flex items-center">
                        Max Credit Hours Bank Cap
                        <HelpHint
                          title="Max Credit Hours Bank Cap"
                          description="The maximum number of credit hours an employee can accumulate in their balance at any time."
                          effect="Any additional hours earned beyond this cap are discarded."
                          example="Cap = 10 hrs: If employee has 10 hrs, new overtime won't add more credit."
                          titleMr="कमाल क्रेडिट तास बँक मर्यादा"
                          descriptionMr="कर्मचाऱ्याच्या खात्यात एका वेळी जास्तीत जास्त किती क्रेडिट तास जमा राहू शकतात."
                          effectMr="या मर्यादेपेक्षा जास्त तास जमा झाल्यास ते आपोआप रद्द होतात."
                          exampleMr="मर्यादा = 10 तास: आधीच 10 तास असल्यास नवीन ओव्हरटाईम क्रेडिटमध्ये जोडला जाणार नाही."
                        />
                      </Label>
                      <Input
                        type="number"
                        value={creditMaxAccumulation}
                        onChange={(e) => setCreditMaxAccumulation(Number(e.target.value))}
                        className="h-10 text-sm"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t">
                    <div>
                      <Label className="text-sm font-bold flex items-center">
                        Encashable Credit Hours
                        <HelpHint
                          title="Encashable Credit Hours"
                          description="Whether unused credit hours can be encashed for money during Full & Final (FnF) exit settlement."
                          effect="Enabled: Employee gets paid for unused credit hours. Disabled: Remaining hours lapse on resignation."
                          example="Enabled: 8 remaining hours at exit are paid out in final paycheck."
                          titleMr="क्रेडिट तास रोखीकरण (Encashment)"
                          descriptionMr="कर्मचारी नोकरी सोडताना (FnF) न वापरलेल्या क्रेडिट तासांचे पैसे मिळतील का."
                          effectMr="चालू: कर्मचाऱ्याला पैशात मोबदला मिळतो. बंद: उरलेले तास आपोआप रद्द होतात."
                          exampleMr="चालू असल्यास: सोडताना उरलेल्या 8 तासांचे पैसे शेवटच्या पगारात मिळतील."
                        />
                      </Label>
                      <p className="text-xs text-muted-foreground">Allow unused credit hours to be encashed during FnF settlement.</p>
                    </div>
                    <Switch checked={creditEncashable} onCheckedChange={setCreditEncashable} />
                  </div>
                </div>
              )}

              {/* TAB 3: ROLES AND PERMISSION */}
              {activeTab === 'roles-permissions' && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <Label className="text-xs font-bold flex items-center">
                      Select Role to Configure:
                      <HelpHint
                        title="Role Permissions Matrix"
                        description="Controls functional module access and action permissions for each specific user role in the organization."
                        effect="Enabling/disabling switches immediately updates what screens and actions users with this role can perform."
                        example="Disable 'payroll.process' for HR to prevent running payroll calculations."
                        titleMr="भूमिका परवानग्या मॅट्रिक्स"
                        descriptionMr="संस्थेतील प्रत्येक विशिष्ट भूमिकेसाठी कार्यप्रणाली आणि कृती परवानग्या नियंत्रित करते."
                        effectMr="स्विच बदलल्यास त्या भूमिकेतील कर्मचाऱ्यांना संबंधित पर्याय दिसणे किंवा बंद होणे लगेच लागू होते."
                        exampleMr="HR साठी 'payroll.process' बंद केल्यास ते पगार प्रक्रिया करू शकणार नाहीत."
                      />
                    </Label>
                    <select
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value)}
                      className="h-9 border rounded-xl px-3 text-xs font-bold bg-background font-sans"
                    >
                      <option value="organization_admin">Admin (Organization Admin)</option>
                      <option value="hr">HR</option>
                      <option value="department_head">Department Manager</option>
                      <option value="team_lead">Team Lead</option>
                      <option value="employee">Self-Service Employee</option>
                    </select>
                  </div>

                  <div className="border rounded-xl overflow-hidden divide-y text-xs">
                    {[
                      { key: 'employee.view', label: 'View Employee Profiles & Rosters' },
                      { key: 'employee.edit', label: 'Edit & Onboard Employees' },
                      { key: 'payroll.process', label: 'Run & Finalize Payroll Batches' },
                      { key: 'attendance.approve', label: 'Approve Attendance & Regularizations' },
                      { key: 'leaves.approve', label: 'Approve Leave Applications' },
                      { key: 'settings.edit', label: 'Modify System Configurations & Master Data' },
                    ].map((item) => (
                      <div key={item.key} className="flex items-center justify-between px-4 py-3 bg-card">
                        <div>
                          <p className="font-bold text-foreground">{item.label}</p>
                          <span className="font-mono text-[10px] text-muted-foreground">{item.key}</span>
                        </div>
                        <Switch
                          checked={Boolean(currentRolePermissions[item.key])}
                          onCheckedChange={(val) => handleToggleRolePermission(item.key, val)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 4: NOTIFICATION SETTING */}
              {activeTab === 'notification-setting' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                      Notification Delivery Channels
                    </h4>
                    <HelpHint
                      title="Notification Channels"
                      description="Enables or disables system-wide delivery channels for transactional alerts (leaves, attendance, payroll, reminders)."
                      effect="If disabled, notifications for that gateway will not be dispatched to employees."
                      example="Disable SMS if no SMS gateway provider is configured to prevent delivery errors."
                      titleMr="सूचना वितरण माध्यमे"
                      descriptionMr="सिस्टममधील सर्व सूचना (रजा, हजेरी, पगार, स्मरणपत्रे) कोणत्या माध्यमांद्वारे पाठवायच्या ते ठरवते."
                      effectMr="माध्यम बंद केल्यास त्या चॅनेलवर कोणतीही सूचना कर्मचाऱ्याला जाणार नाही."
                      exampleMr="SMS गेटवे नसल्यास SMS बंद ठेवा जेणेकरून एरर येणार नाही."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { key: 'email', label: 'Email Notifications', desc: 'Send transactional emails via configured SMTP.' },
                      { key: 'inApp', label: 'In-App Notifications', desc: 'Display alerts inside the topbar notification bell.' },
                      { key: 'sms', label: 'SMS Notifications', desc: 'Send direct mobile SMS alerts via SMS gateway.' },
                      { key: 'whatsapp', label: 'WhatsApp Notifications', desc: 'Send automated alerts via WhatsApp Business API.' },
                    ].map((item) => (
                      <div key={item.key} className="flex items-center justify-between p-3.5 border rounded-xl bg-card">
                        <div>
                          <span className="text-xs font-bold capitalize">{item.label}</span>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{item.desc}</p>
                        </div>
                        <Switch
                          checked={notifChannels[item.key as keyof typeof notifChannels]}
                          onCheckedChange={(v) =>
                            setNotifChannels((prev) => ({ ...prev, [item.key]: v }))
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 5: FORM TYPE */}
              {activeTab === 'form-type' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">Manage organization document types and attachment templates.</p>
                    <HelpHint
                      title="Form & Document Types"
                      description="Defines authorized document types required during onboarding, claims, and medical leaves."
                      effect="Employees can select these document types when uploading proofs across the portal."
                      example="Add 'Passport Proof' with code 'PSP_PRF' for international travel claims."
                      titleMr="फॉर्म आणि दस्तऐवज प्रकार"
                      descriptionMr="ऑनबोर्डिंग, क्लेम आणि रजेसाठी आवश्यक असलेल्या अधिकृत कागदपत्रांचे प्रकार व्यवस्थापित करतो."
                      effectMr="कर्मचारी पुरावे अपलोड करताना या दस्तऐवज प्रकारांमधून निवड करू शकतात."
                      exampleMr="'Passport Proof' (PSP_PRF) जोडून आंतरराष्ट्रीय प्रवासासाठी पुरावा अनिवार्य करता येतो."
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Form Name (e.g. Passport Proof)..."
                      value={newFormName}
                      onChange={(e) => setNewFormName(e.target.value)}
                      className="h-9 text-xs"
                    />
                    <Input
                      placeholder="Form Code (e.g. PSP_PRF)..."
                      value={newFormCode}
                      onChange={(e) => setNewFormCode(e.target.value)}
                      className="h-9 text-xs font-mono"
                    />
                    <Button size="sm" onClick={handleAddFormType} className="bg-rose-600 hover:bg-rose-700 text-white font-bold h-9">
                      <Plus className="w-4 h-4" /> Add
                    </Button>
                  </div>

                  <div className="border rounded-xl overflow-hidden divide-y text-xs">
                    {formTypes.map((f) => (
                      <div key={f.id} className="flex items-center justify-between px-4 py-3 bg-card">
                        <div>
                          <p className="font-bold">{f.name}</p>
                          <p className="font-mono text-[10px] text-muted-foreground">{f.code}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() =>
                              setFormTypes((prev) =>
                                prev.map((item) => (item.id === f.id ? { ...item, mandatory: !item.mandatory } : item))
                              )
                            }
                            className="cursor-pointer"
                          >
                            <Badge variant={f.mandatory ? 'default' : 'outline'} className="text-[10px]">
                              {f.mandatory ? 'Mandatory' : 'Optional'}
                            </Badge>
                          </button>
                          <button onClick={() => handleDeleteFormType(f.id)} className="text-red-500 hover:text-red-700 p-1 cursor-pointer">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 6: USER CONFIGURATION */}
              {activeTab === 'user-configuration' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold flex items-center">
                        Min Password Length
                        <HelpHint
                          title="Min Password Length"
                          description="The minimum number of characters required when creating or changing user passwords."
                          effect="Users cannot set a password shorter than this number."
                          example="Length = 8: Passwords must be at least 8 characters long."
                          titleMr="किमान पासवर्ड लांबी"
                          descriptionMr="पासवर्ड तयार करताना किंवा बदलताना किमान किती अक्षरे असणे बंधनकारक आहे."
                          effectMr="यापेक्षा लहान पासवर्ड सिस्टम स्वीकारणार नाही."
                          exampleMr="लांबी = 8: पासवर्ड किमान 8 अक्षरांचा असावा लागेल."
                        />
                      </Label>
                      <Input
                        type="number"
                        value={minPasswordLength}
                        onChange={(e) => setMinPasswordLength(Number(e.target.value))}
                        className="h-10 text-sm"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold flex items-center">
                        Session Timeout (Minutes)
                        <HelpHint
                          title="Session Timeout"
                          description="The period of user inactivity after which the session automatically logs out for security."
                          effect="Inactive users are redirected to the login screen after this duration."
                          example="30 minutes: If user is idle for 30 minutes, they must re-authenticate."
                          titleMr="सत्र कालबाह्यता (मिनिटे)"
                          descriptionMr="वापरकर्त्याने काहीही हालचाल न केल्यास किती मिनिटांनंतर लॉगिन सत्र आपोआप बंद होईल."
                          effectMr="कालबाह्य झाल्यावर वापरकर्त्याला पुन्हा पासवर्ड टाकून लॉगिन करावे लागेल."
                          exampleMr="30 मिनिटे: 30 मिनिटे निष्क्रिय राहिल्यास पुन्हा लॉगिन करावे लागेल."
                        />
                      </Label>
                      <Input
                        type="number"
                        value={sessionTimeoutMins}
                        onChange={(e) => setSessionTimeoutMins(Number(e.target.value))}
                        className="h-10 text-sm"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t">
                    <div>
                      <Label className="text-sm font-bold flex items-center">
                        Require MFA for Admins
                        <HelpHint
                          title="Require MFA for Admins"
                          description="Enforces Multi-Factor Authentication (MFA / 2FA) on all administrative and HR accounts."
                          effect="Admins must enter a 6-digit OTP or authenticator code during login."
                          example="Enabled: CEO and HR must authenticate with OTP on every new device login."
                          titleMr="अॅडमिनसाठी MFA अनिवार्य"
                          descriptionMr="सर्व अॅडमिन आणि HR खात्यांसाठी टू-फॅक्टर ऑथेंटिकेशन (2FA / MFA) अनिवार्य करते."
                          effectMr="अॅडमिनला लॉगिन करताना पासवर्डसोबत 6-अंकी OTP टाकावा लागेल."
                          exampleMr="चालू: CEO आणि HR ला नवीन डिव्हाइसवर लॉगिन करताना OTP आवश्यक राहील."
                        />
                      </Label>
                      <p className="text-xs text-muted-foreground">Enforce two-factor authentication for administrative users.</p>
                    </div>
                    <Switch checked={mfaEnforced} onCheckedChange={setMfaEnforced} />
                  </div>
                </div>
              )}

              {/* TAB 7: CONFIG MASTER */}
              {activeTab === 'config-master' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">Master key-value parameters applied across all microservices.</p>
                    <HelpHint
                      title="Config Master"
                      description="Low-level environment key-value configurations for file limits, timezone defaults, and currency symbols."
                      effect="Updating these values changes calculation constants and upload limits system-wide."
                      example="Set MAX_FILE_UPLOAD_MB to 20 to allow larger resume and attachment uploads."
                      titleMr="कॉन्फिग मास्टर पॅरामीटर्स"
                      descriptionMr="सिस्टमच्या गाभ्यातील की-व्हॅल्यू सेटिंग्ज जसे की फाइल मर्यादा, टाइमझोन आणि चलन चिन्ह."
                      effectMr="हे बदलल्यास संपूर्ण पोर्टलमध्ये अपलोड मर्यादा आणि गणना बदलतात."
                      exampleMr="MAX_FILE_UPLOAD_MB = 20 केल्यास 20MB पर्यंतच्या फाइल्स अपलोड करता येतील."
                    />
                  </div>
                  <div className="border rounded-xl overflow-hidden divide-y text-xs">
                    {masterParams.map((p, i) => (
                      <div key={i} className="p-4 space-y-2 bg-card">
                        <div className="flex justify-between font-mono font-bold text-rose-600 dark:text-rose-400">
                          <span>{p.key}</span>
                        </div>
                        <Input
                          value={p.value}
                          onChange={(e) => {
                            const val = e.target.value;
                            setMasterParams((prev) => prev.map((item, idx) => (idx === i ? { ...item, value: val } : item)));
                          }}
                          className="h-9 text-xs font-mono"
                        />
                        <p className="text-[11px] text-muted-foreground">{p.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 8: GENERAL SETTING */}
              {activeTab === 'general-setting' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold flex items-center">
                        Company Name
                        <HelpHint
                          title="Company Name"
                          description="Display name of the organization used across payslips, emails, and header branding."
                          effect="Shown on login screen, PDF reports, and top navigation bar."
                          example="Apponext Technologies Pvt Ltd."
                          titleMr="कंपनीचे नाव"
                          descriptionMr="पेस्लिप, ईमेल्स आणि हेडरमध्ये दिसणारे संस्थेचे अधिकृत नाव."
                          effectMr="लॉगिन स्क्रीन, PDF रिपोर्ट्स आणि मुख्य मेनूमध्ये हे नाव दिसेल."
                          exampleMr="Apponext Technologies Pvt Ltd."
                        />
                      </Label>
                      <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="h-10 text-sm" />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold flex items-center">
                        Timezone
                        <HelpHint
                          title="Default Timezone"
                          description="The standard IANA timezone used for logging attendance punches and scheduling shifts."
                          effect="All biometric and mobile punches are normalized against this timezone."
                          example="Asia/Kolkata (IST: GMT+5:30)."
                          titleMr="डीफॉल्ट टाइमझोन"
                          descriptionMr="हजेरी पंच, शिफ्ट वेळ आणि लॉगिंगसाठी वापरला जाणारा प्रमाणित टाइमझोन."
                          effectMr="बायोमेट्रिक आणि मोबाइलवरील सर्व पंच या टाइमझोननुसार नोंदवले जातात."
                          exampleMr="Asia/Kolkata (IST: GMT+5:30)."
                        />
                      </Label>
                      <Input value={timezone} onChange={(e) => setTimezone(e.target.value)} className="h-10 text-sm" />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold flex items-center">
                        Leave Approval Tiers
                        <HelpHint
                          title="Leave Approval Tiers"
                          description="Number of hierarchical approval levels required before an employee leave is finalized (e.g. 1 = Manager only, 2 = Manager + HR)."
                          effect="Leave requests must be approved sequentially across all configured tiers."
                          example="Tiers = 2: Requires Department Manager approval first, then HR final approval."
                          titleMr="रजा मंजुरी स्तर (Tiers)"
                          descriptionMr="रजा मंजूर होण्यासाठी किती स्तरांची मंजुरी आवश्यक आहे (उदा. 1 = फक्त मॅनेजर, 2 = मॅनेजर + HR)."
                          effectMr="रजा अर्ज ठरवलेल्या सर्व स्तरांवरून मंजूर झाल्यानंतरच पूर्ण होतो."
                          exampleMr="स्तर = 2: आधी मॅनेजरची मंजुरी, त्यानंतर HR ची अंतिम मंजुरी आवश्यक."
                        />
                      </Label>
                      <Input
                        type="number"
                        value={leaveApprovalLevels}
                        onChange={(e) => setLeaveApprovalLevels(Number(e.target.value))}
                        className="h-10 text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 9: RESTRICT IP */}
              {activeTab === 'restrict-ip' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 border rounded-xl bg-muted/20">
                    <div>
                      <Label className="text-sm font-bold flex items-center">
                        Enable IP Whitelisting
                        <HelpHint
                          title="IP Whitelisting"
                          description="Restricts employee and manager logins strictly to listed corporate IP addresses and VPN subnets."
                          effect="Access from unlisted public IPs will be blocked with a security violation."
                          example="Enable in high-security offices to ensure staff only log in on-premise."
                          titleMr="IP व्हाइटलिस्टिंग"
                          descriptionMr="कर्मचाऱ्यांचे लॉगिन केवळ कार्यालयातील अधिकृत IP पत्ते आणि VPN सबनेटवर मर्यादित करते."
                          effectMr="बाहेरील अनोळखी IP वरून लॉगिन करण्याचा प्रयत्न केल्यास ब्लॉक केले जाईल."
                          exampleMr="उच्च सुरक्षेसाठी चालू ठेवा जेणेकरून कर्मचारी फक्त ऑफिसच्या नेटवर्कवरून लॉगिन करू शकतील."
                        />
                      </Label>
                      <p className="text-xs text-muted-foreground">Restrict user logins strictly to whitelisted IP addresses.</p>
                    </div>
                    <Switch checked={ipRestricted} onCheckedChange={setIpRestricted} />
                  </div>

                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Allowed IP / Subnet (e.g. 192.168.1.100)..."
                      value={newIpAddress}
                      onChange={(e) => setNewIpAddress(e.target.value)}
                      className="h-9 text-xs font-mono"
                    />
                    <Input
                      placeholder="Description (e.g. HQ Gateway)..."
                      value={newIpDesc}
                      onChange={(e) => setNewIpDesc(e.target.value)}
                      className="h-9 text-xs"
                    />
                    <Button size="sm" onClick={handleAddIp} className="bg-rose-600 hover:bg-rose-700 text-white font-bold h-9">
                      <Plus className="w-4 h-4" /> Add IP
                    </Button>
                  </div>

                  <div className="border rounded-xl overflow-hidden divide-y text-xs">
                    {allowedIps.map((item) => (
                      <div key={item.id} className="flex items-center justify-between px-4 py-3 bg-card">
                        <div>
                          <p className="font-mono font-bold">{item.ip}</p>
                          <p className="text-[11px] text-muted-foreground">{item.desc}</p>
                        </div>
                        <button onClick={() => handleDeleteIp(item.id)} className="text-red-500 hover:text-red-700 p-1 cursor-pointer">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 10: OVERTIME ACCESS SETTING */}
              {activeTab === 'overtime-access' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 border rounded-xl bg-muted/20">
                    <div>
                      <Label className="text-sm font-bold flex items-center">
                        Pre-Approval Required for Overtime
                        <HelpHint
                          title="Overtime Pre-Approval"
                          description="Requires team members to submit an OT request before performing extra hours."
                          effect="If enabled, punches beyond shift hours will NOT count as overtime unless prior approval is granted."
                          example="Employee must get OT approved by Manager before working late evening."
                          titleMr="ओव्हरटाईम पूर्व-मंजुरी"
                          descriptionMr="जादा तास काम करण्यापूर्वी मॅनेजरकडून पूर्व-मंजुरी घेणे अनिवार्य करते."
                          effectMr="चालू असल्यास, आधी मंजुरी नसल्यास शिफ्टनंतरचे अतिरिक्त तास ओव्हरटाईम म्हणून ग्राह्य धरले जाणार नाहीत."
                          exampleMr="उशीरा काम करण्यापूर्वी कर्मचाऱ्याला मॅनेजरची मंजुरी घ्यावी लागेल."
                        />
                      </Label>
                      <p className="text-xs text-muted-foreground">Requires manager approval before extra hours count as OT.</p>
                    </div>
                    <Switch checked={otPreApprovalRequired} onCheckedChange={setOtPreApprovalRequired} />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold flex items-center">
                        Max OT Hours / Day
                        <HelpHint
                          title="Max Daily OT Hours"
                          description="The maximum overtime duration an employee can log in a single working day."
                          effect="Any hours worked beyond this daily limit are capped and not paid."
                          example="Limit = 4 hrs: Maximum overtime recorded in a day is 4 hours."
                          titleMr="कमाल दैनिक ओव्हरटाईम तास"
                          descriptionMr="एका दिवसात कर्मचारी जास्तीत जास्त किती ओव्हरटाईम तास नोंदवू शकतो."
                          effectMr="या मर्यादेपेक्षा जास्त वेळ थांबल्यास त्यापुढील तासांचे पैसे मिळणार नाहीत."
                          exampleMr="मर्यादा = 4 तास: दिवसाला जास्तीत जास्त 4 तास ओव्हरटाईम धरला जाईल."
                        />
                      </Label>
                      <Input
                        type="number"
                        value={maxOtHoursPerDay}
                        onChange={(e) => setMaxOtHoursPerDay(Number(e.target.value))}
                        className="h-10 text-sm"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold flex items-center">
                        Max OT Hours / Month
                        <HelpHint
                          title="Max Monthly OT Hours"
                          description="The cumulative overtime ceiling allowed for an employee per calendar month."
                          effect="Prevents excessive fatigue and enforces compliance with statutory labor laws."
                          example="Limit = 40 hrs: Employee can log up to 40 overtime hours in a month."
                          titleMr="कमाल मासिक ओव्हरटाईम तास"
                          descriptionMr="कर्मचारी एका महिन्यात एकूण किती तास ओव्हरटाईम करू शकतो यावर मर्यादा."
                          effectMr="कामगार नियमांचे पालन करण्यासाठी आणि जास्त ताण टाळण्यासाठी हे बंधनकारक असते."
                          exampleMr="मर्यादा = 40 तास: महिन्यात जास्तीत जास्त 40 तास ओव्हरटाईम नोंदवता येईल."
                        />
                      </Label>
                      <Input
                        type="number"
                        value={maxOtHoursPerMonth}
                        onChange={(e) => setMaxOtHoursPerMonth(Number(e.target.value))}
                        className="h-10 text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 11: NOTICE PERIOD */}
              {activeTab === 'notice-period' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold flex items-center">
                        Standard Notice Period (Days)
                        <HelpHint
                          title="Standard Notice Period"
                          description="Number of mandatory working days a confirmed employee must serve after submitting resignation."
                          effect="Calculates relieving date and shortfall deductions during FnF settlement."
                          example="30 days: Relieving date will be set to 30 days from resignation date."
                          titleMr="प्रमाणित नोटीस कालावधी (दिवस)"
                          descriptionMr="राजीनामा दिल्यानंतर कायम कर्मचाऱ्याने काम करणे आवश्यक असलेला कालावधी."
                          effectMr="FnF सेटलमेंट दरम्यान कार्यमुक्तीची तारीख आणि कपातीची गणना यावरून केली जाते."
                          exampleMr="30 दिवस: राजीनाम्याच्या तारखेपासून 30 दिवसांनंतर कार्यमुक्त केले जाईल."
                        />
                      </Label>
                      <Input
                        type="number"
                        value={noticePeriodDays}
                        onChange={(e) => setNoticePeriodDays(Number(e.target.value))}
                        className="h-10 text-sm"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold flex items-center">
                        Probation Notice Period (Days)
                        <HelpHint
                          title="Probation Notice Period"
                          description="Notice duration applicable to employees currently in their probation period."
                          effect="Allows shorter transition periods before confirmation."
                          example="15 days during probation vs 30 days after confirmation."
                          titleMr="प्रोबेशन नोटीस कालावधी (दिवस)"
                          descriptionMr="प्रोबेशन (प्रशिक्षण) कालावधीत असलेल्या कर्मचाऱ्यांसाठी लागू असलेला नोटीस कालावधी."
                          effectMr="कायम होण्यापूर्वी कमी दिवसांत कार्यमुक्त होण्याची सुविधा मिळते."
                          exampleMr="प्रोबेशनमध्ये 15 दिवस आणि कायम झाल्यानंतर 30 दिवस."
                        />
                      </Label>
                      <Input
                        type="number"
                        value={probationNoticeDays}
                        onChange={(e) => setProbationNoticeDays(Number(e.target.value))}
                        className="h-10 text-sm"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t">
                    <div>
                      <Label className="text-sm font-bold flex items-center">
                        Allow Notice Buyout
                        <HelpHint
                          title="Notice Buyout"
                          description="Permits either employee or employer to waive notice days by paying the equivalent gross salary."
                          effect="Enabled: Employee can leave early by paying for remaining unserved notice days."
                          example="Enabled: Employee can pay 15 days basic salary to leave immediately."
                          titleMr="नोटीस बायआउट (Buyout)"
                          descriptionMr="पगार भरून नोटीस कालावधीचे दिवस कमी करून त्वरित सोडण्याची परवानगी."
                          effectMr="चालू असल्यास: कर्मचारी उर्वरित दिवसांचा पगार भरून त्वरित कार्यमुक्त होऊ शकतो."
                          exampleMr="चालू: 15 दिवसांचा पगार भरून कर्मचारी लवकर कार्यमुक्त होऊ शकतो."
                        />
                      </Label>
                      <p className="text-xs text-muted-foreground">Permit employee to pay salary in lieu of notice days.</p>
                    </div>
                    <Switch checked={noticeBuyoutAllowed} onCheckedChange={setNoticeBuyoutAllowed} />
                  </div>
                </div>
              )}

              {/* TAB 12: FIELD ALLOWANCE SETTING */}
              {activeTab === 'field-allowance' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold flex items-center">
                        Daily Field Allowance (₹)
                        <HelpHint
                          title="Daily Field Allowance"
                          description="Fixed daily per-diem allowance paid to field staff for on-site visits and client meetings."
                          effect="Added automatically to employee expense claims when field duty is verified."
                          example="₹500 per day spent on official site visits."
                          titleMr="दैनिक फील्ड भत्ता (₹)"
                          descriptionMr="फील्डवर किंवा क्लायंट भेटीसाठी जाणाऱ्या कर्मचाऱ्यांना दिला जाणारा दैनिक भत्ता."
                          effectMr="फील्ड ड्युटी मंजूर झाल्यावर हा भत्ता कर्मचाऱ्याच्या क्लेम किंवा पगारात जोडला जातो."
                          exampleMr="ऑफिसबाहेरील भेटींसाठी दररोज ₹500 भत्ता."
                        />
                      </Label>
                      <Input
                        type="number"
                        value={fieldDutyDailyAllowance}
                        onChange={(e) => setFieldDutyDailyAllowance(Number(e.target.value))}
                        className="h-10 text-sm"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold flex items-center">
                        Per Km Travel Reimbursement (₹)
                        <HelpHint
                          title="Per Km Travel Reimbursement"
                          description="Rate per kilometer paid to employees for using personal vehicle (two-wheeler/four-wheeler) for company travel."
                          effect="Total distance logged in travel tracking is multiplied by this rate."
                          example="₹12/km: Traveling 50 km gives ₹600 fuel reimbursement."
                          titleMr="प्रति किमी प्रवास परतावा (₹)"
                          descriptionMr="कंपनीच्या कामासाठी स्वतःचे वाहन वापरणाऱ्या कर्मचाऱ्यांना प्रति किलोमीटर दिला जाणारा दर."
                          effectMr="प्रवासाचे एकूण अंतर या दराने गुणून पेट्रोल/डिझेलचा परतावा दिला जातो."
                          exampleMr="₹12/किमी: 50 किमी प्रवास केल्यास ₹600 परतावा मिळेल."
                        />
                      </Label>
                      <Input
                        type="number"
                        value={perKmReimbursementRate}
                        onChange={(e) => setPerKmReimbursementRate(Number(e.target.value))}
                        className="h-10 text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
