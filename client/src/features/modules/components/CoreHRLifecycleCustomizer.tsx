import { useState } from 'react';
import {
  useLifecycleCustomizationStore,
  AVAILABLE_LIFECYCLE_KPIS,
  CustomAuditField,
} from '@/features/employee-lifecycle/store/lifecycleCustomizationStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  Users,
  UserPlus,
  ArrowLeftRight,
  UserMinus,
  Table,
  Filter,
  BarChart3,
  RotateCcw,
  Save,
  Plus,
  Trash2,
  Sparkles,
  Building2,
  Briefcase,
  MapPin,
  Calendar,
  ShieldCheck,
  Clock,
  UserCheck,
  FileCheck,
  Edit,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function CoreHRLifecycleCustomizer() {
  const {
    config,
    toggleKpi,
    toggleFilter,
    toggleTableColumn,
    toggleOnboardingColumn,
    toggleTransferColumn,
    toggleOffboardingColumn,
    addCustomField,
    removeCustomField,
    resetToDefaults,
  } = useLifecycleCustomizationStore();

  const [activeTab, setActiveTab] = useState<
    'kpis' | 'filters' | 'directory_table' | 'onboarding_table' | 'transfers_table' | 'offboarding_table'
  >('kpis');

  // Custom Field Form State
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<'text' | 'number' | 'date' | 'select'>('text');
  const [newFieldOptions, setNewFieldOptions] = useState('');

  const activeKpisCount = Object.values(config.kpis).filter(Boolean).length;
  const activeFiltersCount = Object.values(config.filters).filter(Boolean).length;
  const activeDirectoryCols = Object.values(config.tableColumns).filter(Boolean).length;
  const activeOnboardingCols = Object.values(config.onboardingColumns).filter(Boolean).length;
  const activeTransferCols = Object.values(config.transferColumns).filter(Boolean).length;
  const activeOffboardingCols = Object.values(config.offboardingColumns).filter(Boolean).length;

  const handleSave = () => {
    toast.success('Employee Lifecycle audit table customizations saved successfully!');
  };

  const handleReset = () => {
    if (confirm('Reset all Employee Lifecycle audit configurations to factory defaults?')) {
      resetToDefaults();
      toast.info('Lifecycle configuration reset to defaults');
    }
  };

  const handleAddCustomField = (category: 'directory' | 'onboarding' | 'transfers' | 'offboarding') => {
    if (!newFieldName.trim()) {
      toast.error('Please enter a field name');
      return;
    }
    const optionsArray =
      newFieldType === 'select'
        ? newFieldOptions.split(',').map((s) => s.trim()).filter(Boolean)
        : undefined;

    addCustomField(category, {
      name: newFieldName.trim(),
      type: newFieldType,
      options: optionsArray,
    });

    setNewFieldName('');
    setNewFieldOptions('');
    toast.success(`Custom field "${newFieldName.trim()}" added to ${category} audit table!`);
  };

  const getKpiIcon = (iconName: string) => {
    switch (iconName) {
      case 'Users': return <Users className="w-4 h-4" />;
      case 'UserPlus': return <UserPlus className="w-4 h-4" />;
      case 'ArrowLeftRight': return <ArrowLeftRight className="w-4 h-4" />;
      case 'UserMinus': return <UserMinus className="w-4 h-4" />;
      case 'UserCheck': return <UserCheck className="w-4 h-4" />;
      case 'Clock': return <Clock className="w-4 h-4" />;
      case 'ShieldCheck': return <ShieldCheck className="w-4 h-4" />;
      case 'FileCheck': return <FileCheck className="w-4 h-4" />;
      case 'Building2': return <Building2 className="w-4 h-4" />;
      case 'MapPin': return <MapPin className="w-4 h-4" />;
      case 'Briefcase': return <Briefcase className="w-4 h-4" />;
      default: return <BarChart3 className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* ─── SUB-TAB NAVIGATION ─── */}
      <div className="flex items-center border-b border-border/80 pb-2 gap-1.5 overflow-x-auto text-xs font-bold">
        <button
          onClick={() => setActiveTab('kpis')}
          className={cn(
            'py-2 px-3 rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5',
            activeTab === 'kpis'
              ? 'bg-primary text-primary-foreground shadow-2xs font-bold'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          )}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          1. KPIs ({activeKpisCount})
        </button>

        <button
          onClick={() => setActiveTab('filters')}
          className={cn(
            'py-2 px-3 rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5',
            activeTab === 'filters'
              ? 'bg-primary text-primary-foreground shadow-2xs font-bold'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          )}
        >
          <Filter className="w-3.5 h-3.5" />
          2. Filters ({activeFiltersCount})
        </button>

        <button
          onClick={() => setActiveTab('directory_table')}
          className={cn(
            'py-2 px-3 rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5',
            activeTab === 'directory_table'
              ? 'bg-primary text-primary-foreground shadow-2xs font-bold'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          )}
        >
          <Users className="w-3.5 h-3.5" />
          3. Directory ({activeDirectoryCols})
        </button>

        <button
          onClick={() => setActiveTab('onboarding_table')}
          className={cn(
            'py-2 px-3 rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5',
            activeTab === 'onboarding_table'
              ? 'bg-sky-600 text-white shadow-2xs font-bold'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          )}
        >
          <UserPlus className="w-3.5 h-3.5 text-sky-500 group-hover:text-sky-600" />
          4. Onboarding Audit ({activeOnboardingCols})
        </button>

        <button
          onClick={() => setActiveTab('transfers_table')}
          className={cn(
            'py-2 px-3 rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5',
            activeTab === 'transfers_table'
              ? 'bg-emerald-600 text-white shadow-2xs font-bold'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          )}
        >
          <ArrowLeftRight className="w-3.5 h-3.5 text-emerald-500" />
          5. Transfer Audit ({activeTransferCols})
        </button>

        <button
          onClick={() => setActiveTab('offboarding_table')}
          className={cn(
            'py-2 px-3 rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5',
            activeTab === 'offboarding_table'
              ? 'bg-rose-600 text-white shadow-2xs font-bold'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          )}
        >
          <UserMinus className="w-3.5 h-3.5 text-rose-500" />
          6. Offboarding Audit ({activeOffboardingCols})
        </button>
      </div>

      {/* ─── TAB 1: KPI METRICS STUDIO ─── */}
      {activeTab === 'kpis' && (
        <div className="space-y-4 pt-1">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-foreground">Lifecycle Summary Metric Cards</h4>
              <p className="text-[11px] text-muted-foreground">
                Toggle existing cards or add additional analytical KPI metrics to the top banner:
              </p>
            </div>
            <Badge variant="outline" className="text-[10px] font-bold bg-primary/10 text-primary border-primary/20">
              {activeKpisCount} KPIs Displayed
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {AVAILABLE_LIFECYCLE_KPIS.map((kpi) => {
              const isChecked = config.kpis[kpi.id] ?? false;

              return (
                <Card
                  key={kpi.id}
                  onClick={() => toggleKpi(kpi.id)}
                  className={cn(
                    'border transition-all cursor-pointer rounded-xl bg-card shadow-2xs',
                    isChecked
                      ? 'border-primary/50 bg-primary/5'
                      : 'border-border/70 hover:bg-muted/30 opacity-70'
                  )}
                >
                  <CardContent className="p-3.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={cn(
                          'p-2.5 rounded-xl shrink-0 transition-colors',
                          isChecked ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                        )}
                      >
                        {getKpiIcon(kpi.icon)}
                      </div>
                      <div className="space-y-0.5 min-w-0 pr-1">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold text-foreground truncate">{kpi.label}</p>
                          {['total_workforce', 'in_onboarding', 'transferred_events', 'notice_exits'].includes(kpi.id) && (
                            <Badge variant="secondary" className="text-[9px] px-1 py-0 h-3.5">
                              Core
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate">{kpi.description}</p>
                      </div>
                    </div>
                    <Switch
                      checked={isChecked}
                      onCheckedChange={(checked) => toggleKpi(kpi.id, checked)}
                    />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── TAB 2: WORKING FILTERS ─── */}
      {activeTab === 'filters' && (
        <div className="space-y-4 pt-1">
          <div>
            <h4 className="text-xs font-bold text-foreground">Lifecycle Working Filters</h4>
            <p className="text-[11px] text-muted-foreground">
              Enable or disable specific filter controls and search capabilities in the lifecycle view:
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {([
              { key: 'searchBar', label: 'Global Keyword Search', desc: 'Search by employee name, code, email, designation' },
              { key: 'companyFilter', label: 'Organization / Company Filter', desc: 'Switch between parent company and sub-companies' },
              { key: 'stageFilter', label: 'Lifecycle Stage Filter', desc: 'Filter by Active, Onboarding, Probation, Notice, Exit' },
              { key: 'departmentFilter', label: 'Department Filter', desc: 'Filter employees by organizational departments' },
              { key: 'designationFilter', label: 'Designation / Role Filter', desc: 'Filter employees by job title / designation master' },
              { key: 'locationFilter', label: 'Office Location Filter', desc: 'Filter employees by office branch and physical city' },
              { key: 'employmentTypeFilter', label: 'Employment Type Filter', desc: 'Filter by Full Time, Part Time, Contract, Internship' },
            ] as const).map(({ key, label, desc }) => {
              const isChecked = config.filters[key] ?? true;

              return (
                <Card
                  key={key}
                  onClick={() => toggleFilter(key)}
                  className={cn(
                    'border transition-all cursor-pointer rounded-xl bg-card shadow-2xs',
                    isChecked
                      ? 'border-primary/50 bg-primary/5'
                      : 'border-border/70 hover:bg-muted/30 opacity-70'
                  )}
                >
                  <CardContent className="p-3.5 flex items-center justify-between gap-3">
                    <div className="space-y-0.5 min-w-0 pr-2">
                      <p className="text-xs font-bold text-foreground truncate">{label}</p>
                      <p className="text-[11px] text-muted-foreground">{desc}</p>
                    </div>
                    <Switch
                      checked={isChecked}
                      onCheckedChange={(checked) => toggleFilter(key, checked)}
                    />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── TAB 3: ORG DIRECTORY TABLE COLUMNS ─── */}
      {activeTab === 'directory_table' && (
        <div className="space-y-4 pt-1">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-foreground">Organization Employee Directory Columns</h4>
              <p className="text-[11px] text-muted-foreground">
                Select which columns and action buttons appear in the main lifecycle directory table:
              </p>
            </div>
            <Badge variant="outline" className="text-[10px] font-bold bg-primary/10 text-primary border-primary/20">
              {activeDirectoryCols} Columns Enabled
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {([
              { key: 'employeeNameAvatar', label: 'Employee Name & Avatar' },
              { key: 'employeeCode', label: 'Employee Code & Email' },
              { key: 'designation', label: 'Designation / Position' },
              { key: 'department', label: 'Department' },
              { key: 'company', label: 'Company / Entity' },
              { key: 'location', label: 'Office Location' },
              { key: 'lifecycleStage', label: 'Lifecycle Stage Badge' },
              { key: 'transfersCount', label: 'Transfers Count' },
              { key: 'joiningDate', label: 'Joining Date' },
              { key: 'reportingManager', label: 'Reporting Manager' },
              { key: 'actions', label: 'Actions Column' },
              { key: 'actionViewLifecycle', label: 'Action: View Lifecycle Flow' },
              { key: 'actionTransfer', label: 'Action: Transfer Employee' },
            ] as const).map(({ key, label }) => {
              const isChecked = config.tableColumns[key] ?? true;

              return (
                <div
                  key={key}
                  onClick={() => toggleTableColumn(key, !isChecked)}
                  className={cn(
                    'p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2',
                    isChecked
                      ? 'border-primary/50 bg-primary/5 shadow-2xs'
                      : 'border-border/70 bg-card hover:bg-muted/40 text-muted-foreground'
                  )}
                >
                  <span className="text-xs font-semibold truncate pr-1">{label}</span>
                  <Switch
                    checked={isChecked}
                    onCheckedChange={(val) => toggleTableColumn(key, val)}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── TAB 4: ONBOARDING & INTERVIEW AUDIT TABLE ─── */}
      {activeTab === 'onboarding_table' && (
        <div className="space-y-4 pt-1">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-sky-500" /> Onboarding &amp; Interview Audit Table Columns
              </h4>
              <p className="text-[11px] text-muted-foreground">
                Customize column visibility and custom fields for onboarding &amp; interviewer audit records:
              </p>
            </div>
            <Badge variant="outline" className="text-[10px] font-bold bg-sky-500/10 text-sky-600 border-sky-500/20">
              {activeOnboardingCols} Columns Active
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {([
              { key: 'employeeNameAvatar', label: 'Employee Name & Avatar' },
              { key: 'employeeCode', label: 'Code & Designation' },
              { key: 'interviewer', label: 'Interviewer Name' },
              { key: 'hrOnboarder', label: 'HR Onboarder Name' },
              { key: 'joiningDate', label: 'Official Joining Date' },
              { key: 'probationEndDate', label: 'Probation End Date' },
              { key: 'orientationStatus', label: 'Orientation Status (Done/Pending)' },
              { key: 'welcomeKitStatus', label: 'Welcome Kit Status' },
              { key: 'documentsStatus', label: 'Documents Verified Badge' },
              { key: 'interviewScore', label: 'Interviewer Rating / Score' },
              { key: 'lifecycleStage', label: 'Lifecycle Stage Badge' },
              { key: 'actions', label: 'Actions Column' },
              { key: 'actionEditOnboarding', label: 'Action: Edit Onboarding Details' },
            ] as const).map(({ key, label }) => {
              const isChecked = config.onboardingColumns[key] ?? true;

              return (
                <div
                  key={key}
                  onClick={() => toggleOnboardingColumn(key, !isChecked)}
                  className={cn(
                    'p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2',
                    isChecked
                      ? 'border-sky-500/40 bg-sky-500/5 shadow-2xs'
                      : 'border-border/70 bg-card hover:bg-muted/40 text-muted-foreground'
                  )}
                >
                  <span className="text-xs font-semibold truncate pr-1">{label}</span>
                  <Switch
                    checked={isChecked}
                    onCheckedChange={(val) => toggleOnboardingColumn(key, val)}
                  />
                </div>
              );
            })}
          </div>

          {/* ── Add Custom Field to Onboarding Table ── */}
          <div className="p-3.5 bg-sky-500/5 border border-sky-500/20 rounded-2xl space-y-3">
            <h5 className="text-xs font-black text-foreground flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-sky-500" /> Add Custom Field to Onboarding Audit Table
            </h5>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <Label className="text-[10px] font-bold text-muted-foreground uppercase">Field Label / Name</Label>
                <Input
                  value={newFieldName}
                  onChange={(e) => setNewFieldName(e.target.value)}
                  placeholder="e.g. Candidate Ref No, Buddy Name"
                  className="h-8 text-xs bg-background mt-1"
                />
              </div>
              <div>
                <Label className="text-[10px] font-bold text-muted-foreground uppercase">Field Type</Label>
                <select
                  value={newFieldType}
                  onChange={(e) => setNewFieldType(e.target.value as any)}
                  className="w-full h-8 px-2 mt-1 rounded-md border border-input bg-background text-xs font-semibold"
                >
                  <option value="text">Text / String</option>
                  <option value="number">Numeric Value</option>
                  <option value="date">Date Picker</option>
                  <option value="select">Dropdown Options</option>
                </select>
              </div>
              <div className="flex items-end">
                <Button
                  size="sm"
                  onClick={() => handleAddCustomField('onboarding')}
                  className="w-full h-8 text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white rounded-xl gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Field
                </Button>
              </div>
            </div>

            {/* List Existing Custom Fields */}
            {config.customFields.onboarding?.length > 0 && (
              <div className="pt-2 border-t border-sky-500/20">
                <p className="text-[11px] font-bold text-muted-foreground mb-1.5">Configured Custom Onboarding Fields:</p>
                <div className="flex flex-wrap gap-2">
                  {config.customFields.onboarding.map((f) => (
                    <div key={f.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-background border border-sky-500/30 text-xs font-semibold shadow-2xs">
                      <span>{f.name} ({f.type})</span>
                      <button
                        onClick={() => removeCustomField('onboarding', f.id)}
                        className="text-rose-500 hover:text-rose-700 p-0.5 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 5: TRANSFER AUDIT HISTORY TABLE ─── */}
      {activeTab === 'transfers_table' && (
        <div className="space-y-4 pt-1">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
                <ArrowLeftRight className="w-4 h-4 text-emerald-500" /> Transfer Audit History Table Columns
              </h4>
              <p className="text-[11px] text-muted-foreground">
                Customize column visibility and custom fields for departmental &amp; location transfer logs:
              </p>
            </div>
            <Badge variant="outline" className="text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
              {activeTransferCols} Columns Active
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {([
              { key: 'employeeNameAvatar', label: 'Employee Name & Avatar' },
              { key: 'employeeCode', label: 'Employee Code' },
              { key: 'department', label: 'Current Department' },
              { key: 'designation', label: 'Current Designation' },
              { key: 'location', label: 'Office Branch Location' },
              { key: 'reportingManager', label: 'Reporting Manager' },
              { key: 'transfersCount', label: 'Transfers Executed Count' },
              { key: 'lastTransferDate', label: 'Last Effective Date' },
              { key: 'transferReason', label: 'Transfer Reason / Type' },
              { key: 'actions', label: 'Actions Column' },
              { key: 'actionViewLog', label: 'Action: View Transfer Log' },
              { key: 'actionExecuteTransfer', label: 'Action: + Transfer Button' },
            ] as const).map(({ key, label }) => {
              const isChecked = config.transferColumns[key] ?? true;

              return (
                <div
                  key={key}
                  onClick={() => toggleTransferColumn(key, !isChecked)}
                  className={cn(
                    'p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2',
                    isChecked
                      ? 'border-emerald-500/40 bg-emerald-500/5 shadow-2xs'
                      : 'border-border/70 bg-card hover:bg-muted/40 text-muted-foreground'
                  )}
                >
                  <span className="text-xs font-semibold truncate pr-1">{label}</span>
                  <Switch
                    checked={isChecked}
                    onCheckedChange={(val) => toggleTransferColumn(key, val)}
                  />
                </div>
              );
            })}
          </div>

          {/* ── Add Custom Field to Transfer Table ── */}
          <div className="p-3.5 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl space-y-3">
            <h5 className="text-xs font-black text-foreground flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-emerald-500" /> Add Custom Field to Transfer Audit Table
            </h5>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <Label className="text-[10px] font-bold text-muted-foreground uppercase">Field Label / Name</Label>
                <Input
                  value={newFieldName}
                  onChange={(e) => setNewFieldName(e.target.value)}
                  placeholder="e.g. Approving Authority, Allowance"
                  className="h-8 text-xs bg-background mt-1"
                />
              </div>
              <div>
                <Label className="text-[10px] font-bold text-muted-foreground uppercase">Field Type</Label>
                <select
                  value={newFieldType}
                  onChange={(e) => setNewFieldType(e.target.value as any)}
                  className="w-full h-8 px-2 mt-1 rounded-md border border-input bg-background text-xs font-semibold"
                >
                  <option value="text">Text / String</option>
                  <option value="number">Numeric Value</option>
                  <option value="date">Date Picker</option>
                  <option value="select">Dropdown Options</option>
                </select>
              </div>
              <div className="flex items-end">
                <Button
                  size="sm"
                  onClick={() => handleAddCustomField('transfers')}
                  className="w-full h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Field
                </Button>
              </div>
            </div>

            {/* List Existing Custom Fields */}
            {config.customFields.transfers?.length > 0 && (
              <div className="pt-2 border-t border-emerald-500/20">
                <p className="text-[11px] font-bold text-muted-foreground mb-1.5">Configured Custom Transfer Fields:</p>
                <div className="flex flex-wrap gap-2">
                  {config.customFields.transfers.map((f) => (
                    <div key={f.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-background border border-emerald-500/30 text-xs font-semibold shadow-2xs">
                      <span>{f.name} ({f.type})</span>
                      <button
                        onClick={() => removeCustomField('transfers', f.id)}
                        className="text-rose-500 hover:text-rose-700 p-0.5 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 6: OFFBOARDING & EXIT RECORDS TABLE ─── */}
      {activeTab === 'offboarding_table' && (
        <div className="space-y-4 pt-1">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
                <UserMinus className="w-4 h-4 text-rose-500" /> Offboarding &amp; Exit Interview Records Columns
              </h4>
              <p className="text-[11px] text-muted-foreground">
                Customize column visibility and custom fields for exit interview &amp; offboarding records:
              </p>
            </div>
            <Badge variant="outline" className="text-[10px] font-bold bg-rose-500/10 text-rose-600 border-rose-500/20">
              {activeOffboardingCols} Columns Active
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {([
              { key: 'employeeNameAvatar', label: 'Employee Name & Avatar' },
              { key: 'employeeCode', label: 'Code & Department' },
              { key: 'exitType', label: 'Exit Type (Voluntary/Involuntary)' },
              { key: 'resignationDate', label: 'Resignation Date' },
              { key: 'lastWorkingDay', label: 'Last Working Day' },
              { key: 'noticePeriodDays', label: 'Notice Period Days' },
              { key: 'exitReason', label: 'Exit Reason' },
              { key: 'exitInterviewer', label: 'Exit Interviewer' },
              { key: 'assetsReturned', label: 'Assets Returned Check' },
              { key: 'fnfStatus', label: 'F&F Settlement Status' },
              { key: 'lifecycleStage', label: 'Lifecycle Stage Badge' },
              { key: 'actions', label: 'Actions Column' },
              { key: 'actionEditOffboarding', label: 'Action: Edit Offboarding Records' },
            ] as const).map(({ key, label }) => {
              const isChecked = config.offboardingColumns[key] ?? true;

              return (
                <div
                  key={key}
                  onClick={() => toggleOffboardingColumn(key, !isChecked)}
                  className={cn(
                    'p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2',
                    isChecked
                      ? 'border-rose-500/40 bg-rose-500/5 shadow-2xs'
                      : 'border-border/70 bg-card hover:bg-muted/40 text-muted-foreground'
                  )}
                >
                  <span className="text-xs font-semibold truncate pr-1">{label}</span>
                  <Switch
                    checked={isChecked}
                    onCheckedChange={(val) => toggleOffboardingColumn(key, val)}
                  />
                </div>
              );
            })}
          </div>

          {/* ── Add Custom Field to Offboarding Table ── */}
          <div className="p-3.5 bg-rose-500/5 border border-rose-500/20 rounded-2xl space-y-3">
            <h5 className="text-xs font-black text-foreground flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-rose-500" /> Add Custom Field to Offboarding Audit Table
            </h5>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <Label className="text-[10px] font-bold text-muted-foreground uppercase">Field Label / Name</Label>
                <Input
                  value={newFieldName}
                  onChange={(e) => setNewFieldName(e.target.value)}
                  placeholder="e.g. Exit Clearance Ref, NDA Status"
                  className="h-8 text-xs bg-background mt-1"
                />
              </div>
              <div>
                <Label className="text-[10px] font-bold text-muted-foreground uppercase">Field Type</Label>
                <select
                  value={newFieldType}
                  onChange={(e) => setNewFieldType(e.target.value as any)}
                  className="w-full h-8 px-2 mt-1 rounded-md border border-input bg-background text-xs font-semibold"
                >
                  <option value="text">Text / String</option>
                  <option value="number">Numeric Value</option>
                  <option value="date">Date Picker</option>
                  <option value="select">Dropdown Options</option>
                </select>
              </div>
              <div className="flex items-end">
                <Button
                  size="sm"
                  onClick={() => handleAddCustomField('offboarding')}
                  className="w-full h-8 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Field
                </Button>
              </div>
            </div>

            {/* List Existing Custom Fields */}
            {config.customFields.offboarding?.length > 0 && (
              <div className="pt-2 border-t border-rose-500/20">
                <p className="text-[11px] font-bold text-muted-foreground mb-1.5">Configured Custom Offboarding Fields:</p>
                <div className="flex flex-wrap gap-2">
                  {config.customFields.offboarding.map((f) => (
                    <div key={f.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-background border border-rose-500/30 text-xs font-semibold shadow-2xs">
                      <span>{f.name} ({f.type})</span>
                      <button
                        onClick={() => removeCustomField('offboarding', f.id)}
                        className="text-rose-500 hover:text-rose-700 p-0.5 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer Controls */}
      <div className="flex items-center justify-between pt-4 border-t border-border/60">
        <Button
          variant="outline"
          size="sm"
          onClick={handleReset}
          className="h-8 text-xs font-semibold gap-1.5 px-3 rounded-xl cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset Defaults
        </Button>
        <Button
          size="sm"
          onClick={handleSave}
          className="h-8 text-xs font-bold gap-1.5 px-4 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl shadow-2xs cursor-pointer"
        >
          <Save className="w-3.5 h-3.5" />
          Apply &amp; Save Lifecycle Customizations
        </Button>
      </div>
    </div>
  );
}
