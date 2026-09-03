import React, { useState } from 'react';
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
  DollarSign,
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
    icon: DollarSign,
    description: 'Daily field duty rates, per-km travel reimbursements & approval thresholds.',
    category: 'Policy & Compensation',
  },
];

export function AdminConfigurationPage() {
  const [activeTab, setActiveTab] = useState<ConfigTabId>('attendance-adjustment');
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);

  // Form States for all 12 Tabs
  // Tab 1: Attendance Adjustment
  const [attAdjWindow, setAttAdjWindow] = useState(5);
  const [attAdjMaxPerMonth, setAttAdjMaxPerMonth] = useState(3);
  const [lateToleranceMins, setLateToleranceMins] = useState(15);
  const [halfDayDeductionLateCount, setHalfDayDeductionLateCount] = useState(3);

  // Tab 2: Credit Hour Setting
  const [creditMinHours, setCreditMinHours] = useState(2);
  const [creditHalfDayHours, setCreditHalfDayHours] = useState(4);
  const [creditValidityDays, setCreditValidityDays] = useState(60);
  const [creditMaxAccumulation, setCreditMaxAccumulation] = useState(10);
  const [creditEncashable, setCreditEncashable] = useState(true);

  // Tab 3: Roles and Permission
  const [selectedRole, setSelectedRole] = useState('organization_admin');
  const [permissions, setPermissions] = useState<Record<string, boolean>>({
    'employee.view': true,
    'employee.edit': true,
    'payroll.process': true,
    'attendance.approve': true,
    'leaves.approve': true,
    'settings.edit': true,
  });

  // Tab 4: Notification Setting
  const [notifChannels, setNotifChannels] = useState({
    email: true,
    inApp: true,
    sms: false,
    whatsapp: false,
  });

  // Tab 5: Form Type
  const [formTypes, setFormTypes] = useState([
    { id: 1, name: 'Medical Certificate', code: 'MED_CERT', mandatory: true },
    { id: 2, name: 'Expense Receipt', code: 'EXP_RCPT', mandatory: true },
    { id: 3, name: 'Address Proof', code: 'ADDR_PRF', mandatory: false },
    { id: 4, name: 'Relieving Letter', code: 'REL_LTR', mandatory: false },
  ]);
  const [newFormName, setNewFormName] = useState('');
  const [newFormCode, setNewFormCode] = useState('');

  // Tab 6: User Configuration
  const [minPasswordLength, setMinPasswordLength] = useState(8);
  const [sessionTimeoutMins, setSessionTimeoutMins] = useState(30);
  const [mfaEnforced, setMfaEnforced] = useState(true);

  // Tab 7: Config Master
  const [masterParams, setMasterParams] = useState([
    { key: 'ORG_FISCAL_YEAR_START', value: '04-01', desc: 'Fiscal year start date (MM-DD)' },
    { key: 'MAX_FILE_UPLOAD_MB', value: '10', desc: 'Maximum attachment file size in MB' },
    { key: 'DEFAULT_TIMEZONE', value: 'Asia/Kolkata', desc: 'System timezone string' },
    { key: 'CURRENCY_SYMBOL', value: '₹', desc: 'Default currency symbol' },
  ]);

  // Tab 8: General Setting
  const [companyName, setCompanyName] = useState('Apponext Enterprise');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [leaveApprovalLevels, setLeaveApprovalLevels] = useState(2);

  // Tab 9: Restrict IP
  const [ipRestricted, setIpRestricted] = useState(false);
  const [allowedIps, setAllowedIps] = useState([
    { id: 1, ip: '192.168.1.1', desc: 'Main Office Gateway' },
    { id: 2, ip: '10.0.0.0/24', desc: 'Corporate VPN Subnet' },
  ]);
  const [newIpAddress, setNewIpAddress] = useState('');
  const [newIpDesc, setNewIpDesc] = useState('');

  // Tab 10: Over Time Access Setting
  const [otPreApprovalRequired, setOtPreApprovalRequired] = useState(true);
  const [maxOtHoursPerDay, setMaxOtHoursPerDay] = useState(4);
  const [maxOtHoursPerMonth, setMaxOtHoursPerMonth] = useState(40);

  // Tab 11: Notice Period
  const [noticePeriodDays, setNoticePeriodDays] = useState(30);
  const [probationNoticeDays, setProbationNoticeDays] = useState(15);
  const [noticeBuyoutAllowed, setNoticeBuyoutAllowed] = useState(true);

  // Tab 12: Field Allowance Setting
  const [fieldDutyDailyAllowance, setFieldDutyDailyAllowance] = useState(500);
  const [perKmReimbursementRate, setPerKmReimbursementRate] = useState(12);

  // Filter tabs based on search
  const filteredTabs = CONFIG_TABS.filter(
    (t) =>
      t.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeTabMeta = CONFIG_TABS.find((t) => t.id === activeTab) || CONFIG_TABS[0];

  const handleSaveCurrentTab = async () => {
    setSaving(true);
    try {
      await new Promise((r) => setTimeout(r, 600));
      toast.success(`${activeTabMeta.label} configuration saved!`);
    } catch (err) {
      toast.error('Failed to save configuration');
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

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans select-none pb-14">
      {/* HEADER BAR — ADMIN INDIGO THEME */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2.5">
            <Sliders className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            System Configuration Hub
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
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-2 px-5 h-9 rounded-xl shadow-sm cursor-pointer"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Configuration
          </Button>
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
                      ? 'bg-indigo-600 text-white font-bold shadow-sm'
                      : 'text-foreground hover:bg-muted hover:text-foreground font-medium'
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <IconComp className={cn('w-4 h-4 flex-shrink-0', isActive ? 'text-white' : 'text-indigo-600 dark:text-indigo-400')} />
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
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
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
                      <Label className="text-xs font-bold">Regularization Window (Days)</Label>
                      <Input
                        type="number"
                        value={attAdjWindow}
                        onChange={(e) => setAttAdjWindow(Number(e.target.value))}
                        className="h-10 text-sm"
                      />
                      <p className="text-[11px] text-muted-foreground">Days past punch to allow adjustment request.</p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold">Max Requests / Month</Label>
                      <Input
                        type="number"
                        value={attAdjMaxPerMonth}
                        onChange={(e) => setAttAdjMaxPerMonth(Number(e.target.value))}
                        className="h-10 text-sm"
                      />
                      <p className="text-[11px] text-muted-foreground">Limit per employee per calendar month.</p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold">Late Grace Tolerance (Minutes)</Label>
                      <Input
                        type="number"
                        value={lateToleranceMins}
                        onChange={(e) => setLateToleranceMins(Number(e.target.value))}
                        className="h-10 text-sm"
                      />
                      <p className="text-[11px] text-muted-foreground">Grace period before marking late arrival.</p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold">Late Count for Half-Day Deduction</Label>
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
                      <Label className="text-xs font-bold">Min Overtime Hours for Credit</Label>
                      <Input
                        type="number"
                        value={creditMinHours}
                        onChange={(e) => setCreditMinHours(Number(e.target.value))}
                        className="h-10 text-sm"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold">Hours for Half-Day Comp-Off</Label>
                      <Input
                        type="number"
                        value={creditHalfDayHours}
                        onChange={(e) => setCreditHalfDayHours(Number(e.target.value))}
                        className="h-10 text-sm"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold">Credit Validity (Days)</Label>
                      <Input
                        type="number"
                        value={creditValidityDays}
                        onChange={(e) => setCreditValidityDays(Number(e.target.value))}
                        className="h-10 text-sm"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold">Max Credit Hours Bank Cap</Label>
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
                      <Label className="text-sm font-bold">Encashable Credit Hours</Label>
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
                    <Label className="text-xs font-bold">Select Role to Configure:</Label>
                    <select
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value)}
                      className="h-9 border rounded-xl px-3 text-xs font-bold bg-background font-sans"
                    >
                      <option value="organization_admin">Admin (Organization Admin)</option>
                      <option value="hr_admin">HR Admin / HR Manager</option>
                      <option value="department_head">Department Manager</option>
                      <option value="team_lead">Team Lead</option>
                      <option value="employee">Self-Service Employee</option>
                    </select>
                  </div>

                  <div className="border rounded-xl overflow-hidden divide-y text-xs">
                    {Object.entries(permissions).map(([permKey, enabled]) => (
                      <div key={permKey} className="flex items-center justify-between px-4 py-3 bg-card">
                        <span className="font-mono font-medium">{permKey}</span>
                        <Switch
                          checked={enabled}
                          onCheckedChange={(val) =>
                            setPermissions((prev) => ({ ...prev, [permKey]: val }))
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 4: NOTIFICATION SETTING */}
              {activeTab === 'notification-setting' && (
                <div className="space-y-6">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Notification Delivery Channels</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(notifChannels).map(([channel, enabled]) => (
                      <div key={channel} className="flex items-center justify-between p-3.5 border rounded-xl">
                        <span className="text-xs font-bold capitalize">{channel} Notifications</span>
                        <Switch
                          checked={enabled}
                          onCheckedChange={(v) => setNotifChannels((prev) => ({ ...prev, [channel]: v }))}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 5: FORM TYPE */}
              {activeTab === 'form-type' && (
                <div className="space-y-6">
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
                      className="h-9 text-xs"
                    />
                    <Button size="sm" onClick={handleAddFormType} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-9">
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
                          <Badge variant={f.mandatory ? 'default' : 'outline'} className="text-[10px]">
                            {f.mandatory ? 'Mandatory' : 'Optional'}
                          </Badge>
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
                      <Label className="text-xs font-bold">Min Password Length</Label>
                      <Input
                        type="number"
                        value={minPasswordLength}
                        onChange={(e) => setMinPasswordLength(Number(e.target.value))}
                        className="h-10 text-sm"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold">Session Timeout (Minutes)</Label>
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
                      <Label className="text-sm font-bold">Require MFA for Admins</Label>
                      <p className="text-xs text-muted-foreground">Enforce two-factor authentication for administrative users.</p>
                    </div>
                    <Switch checked={mfaEnforced} onCheckedChange={setMfaEnforced} />
                  </div>
                </div>
              )}

              {/* TAB 7: CONFIG MASTER */}
              {activeTab === 'config-master' && (
                <div className="space-y-4">
                  <div className="border rounded-xl overflow-hidden divide-y text-xs">
                    {masterParams.map((p, i) => (
                      <div key={i} className="p-4 space-y-2 bg-card">
                        <div className="flex justify-between font-mono font-bold text-indigo-600 dark:text-indigo-400">
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
                      <Label className="text-xs font-bold">Company Name</Label>
                      <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="h-10 text-sm" />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold">Timezone</Label>
                      <Input value={timezone} onChange={(e) => setTimezone(e.target.value)} className="h-10 text-sm" />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold">Leave Approval Tiers</Label>
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
                      <Label className="text-sm font-bold">Enable IP Whitelisting</Label>
                      <p className="text-xs text-muted-foreground">Restrict user logins strictly to whitelisted IP addresses.</p>
                    </div>
                    <Switch checked={ipRestricted} onCheckedChange={setIpRestricted} />
                  </div>

                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Allowed IP / Subnet (e.g. 192.168.1.100)..."
                      value={newIpAddress}
                      onChange={(e) => setNewIpAddress(e.target.value)}
                      className="h-9 text-xs"
                    />
                    <Input
                      placeholder="Description (e.g. HQ Gateway)..."
                      value={newIpDesc}
                      onChange={(e) => setNewIpDesc(e.target.value)}
                      className="h-9 text-xs"
                    />
                    <Button size="sm" onClick={handleAddIp} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-9">
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
                      <Label className="text-sm font-bold">Pre-Approval Required for Overtime</Label>
                      <p className="text-xs text-muted-foreground">Requires manager approval before extra hours count as OT.</p>
                    </div>
                    <Switch checked={otPreApprovalRequired} onCheckedChange={setOtPreApprovalRequired} />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold">Max OT Hours / Day</Label>
                      <Input
                        type="number"
                        value={maxOtHoursPerDay}
                        onChange={(e) => setMaxOtHoursPerDay(Number(e.target.value))}
                        className="h-10 text-sm"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold">Max OT Hours / Month</Label>
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
                      <Label className="text-xs font-bold">Standard Notice Period (Days)</Label>
                      <Input
                        type="number"
                        value={noticePeriodDays}
                        onChange={(e) => setNoticePeriodDays(Number(e.target.value))}
                        className="h-10 text-sm"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold">Probation Notice Period (Days)</Label>
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
                      <Label className="text-sm font-bold">Allow Notice Buyout</Label>
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
                      <Label className="text-xs font-bold">Daily Field Allowance (₹)</Label>
                      <Input
                        type="number"
                        value={fieldDutyDailyAllowance}
                        onChange={(e) => setFieldDutyDailyAllowance(Number(e.target.value))}
                        className="h-10 text-sm"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold">Per Km Travel Reimbursement (₹)</Label>
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
