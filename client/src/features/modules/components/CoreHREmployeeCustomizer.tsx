import { useState } from 'react';
import {
  useEmployeeCustomizationStore,
  EmployeeCustomizationConfig,
} from '@/features/employee/store/employeeCustomizationStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  Users,
  Table,
  Sliders,
  ArrowLeftRight,
  FileSpreadsheet,
  KeyRound,
  Hash,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Save,
  Building2,
  Briefcase,
  MapPin,
  Calendar,
  CreditCard,
  GraduationCap,
  Sparkles,
  Layers,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

import { CoreHRLifecycleCustomizer } from './CoreHRLifecycleCustomizer';

export function CoreHREmployeeCustomizer() {
  const [subModule, setSubModule] = useState<'employees' | 'lifecycle' | 'departments' | 'designations' | 'org_structure'>('employees');

  const {
    config,
    updateConfig,
    updateBasicField,
    updatePersonalField,
    updateProfessionalField,
    updateBankField,
    updateTableColumn,
    generateEmployeeCode,
    generatePassword,
    resetToDefaults,
  } = useEmployeeCustomizationStore();

  const [activeTab, setActiveTab] = useState<
    'page_table' | 'basic_info' | 'personal_info' | 'professional_info' | 'bank_details'
  >('page_table');

  const handleSave = () => {
    toast.success('Core HR customization settings saved successfully!');
  };

  const handleReset = () => {
    if (await window.appConfirm('Reset all Core HR customizations to defaults?')) {
      resetToDefaults();
      toast.info('Core HR customization reset to factory defaults');
    }
  };

  return (
    <div className="space-y-4">
      {/* ─── TOP DROPDOWN SUB-MODULE SELECTOR ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-muted/30 border border-border/80 rounded-2xl shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-primary/10 text-primary rounded-xl shrink-0">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-black text-foreground">Select Core HR Sub-Module to Customize</p>
            <p className="text-[11px] text-muted-foreground">
              Configure fields, KPIs, filters, and tables for each specific Core HR feature
            </p>
          </div>
        </div>

        <div className="w-full sm:w-80">
          <select
            value={subModule}
            onChange={(e) => setSubModule(e.target.value as any)}
            className="w-full h-9 px-3 rounded-xl border border-border bg-card text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-2xs cursor-pointer"
          >
            <option value="employees">👥 1. Employee Management (Fields &amp; Tables)</option>
            <option value="lifecycle">🔄 2. Employee Lifecycle (KPIs, Filters &amp; Table)</option>
            <option value="departments">🏢 3. Department Management (Governance)</option>
            <option value="designations">💼 4. Designation &amp; Grade Matrix</option>
            <option value="org_structure">🌳 5. Organization Structure &amp; Chart</option>
          </select>
        </div>
      </div>

      {subModule === 'lifecycle' ? (
        <CoreHRLifecycleCustomizer />
      ) : subModule === 'departments' ? (
        <div className="space-y-4 pt-1">
          <div className="p-4 bg-muted/20 border border-border/70 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-foreground">Department Governance Fields</h4>
                <p className="text-[11px] text-muted-foreground">Configure active attributes and table fields in Departments:</p>
              </div>
              <Badge variant="outline" className="text-[10px] font-bold bg-primary/10 text-primary border-primary/20">
                Department Master
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {[
                { label: 'Department Code', desc: 'Auto-generated or custom dept identifier' },
                { label: 'Department Head / Manager', desc: 'Assign primary supervisor and escalation contact' },
                { label: 'Parent Department Hierarchy', desc: 'Support nested sub-departments' },
                { label: 'Assigned Branch Locations', desc: 'Multi-location branch mapping' },
                { label: 'Department Budget & Cost Center', desc: 'Financial cost center tagging' },
                { label: 'Active Employee Count Badge', desc: 'Show total member count pill' },
              ].map((item, idx) => (
                <div key={idx} className="p-3 rounded-xl border border-primary/40 bg-primary/5 shadow-2xs flex items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-foreground">{item.label}</p>
                    <p className="text-[11px] text-muted-foreground">{item.desc}</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : subModule === 'designations' ? (
        <div className="space-y-4 pt-1">
          <div className="p-4 bg-muted/20 border border-border/70 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-foreground">Designation &amp; Grade Band Matrix</h4>
                <p className="text-[11px] text-muted-foreground">Configure position titles, seniority grades, and bands:</p>
              </div>
              <Badge variant="outline" className="text-[10px] font-bold bg-primary/10 text-primary border-primary/20">
                Designation Master
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {[
                { label: 'Designation Code', desc: 'Standard job code format (e.g. SDE-01)' },
                { label: 'Seniority Grade Level', desc: 'Band hierarchy (e.g. L1, L2, L3, Executive)' },
                { label: 'Department Mapping', desc: 'Restrict title to specific organizational units' },
                { label: 'Notice Period Standard', desc: 'Default notice period days per position' },
                { label: 'Standard Salary Slab Link', desc: 'Attach base compensation range' },
                { label: 'Job Description Document', desc: 'Attach formal JD PDF to title' },
              ].map((item, idx) => (
                <div key={idx} className="p-3 rounded-xl border border-primary/40 bg-primary/5 shadow-2xs flex items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-foreground">{item.label}</p>
                    <p className="text-[11px] text-muted-foreground">{item.desc}</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : subModule === 'org_structure' ? (
        <div className="space-y-4 pt-1">
          <div className="p-4 bg-muted/20 border border-border/70 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-foreground">Organization Chart &amp; Hierarchy View</h4>
                <p className="text-[11px] text-muted-foreground">Configure visual tree nodes and reporting levels:</p>
              </div>
              <Badge variant="outline" className="text-[10px] font-bold bg-primary/10 text-primary border-primary/20">
                Org Structure
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {[
                { label: 'CEO / Executive Top Node', desc: 'Pin executive admin at the tree root' },
                { label: 'Department Heads Level', desc: 'Display Tier 1 management band' },
                { label: 'Team Leads & Supervisors', desc: 'Display Tier 2 team coordination tier' },
                { label: 'Individual Contributors Nodes', desc: 'Show employee child avatars' },
                { label: 'Direct Reports Counter Pill', desc: 'Count badge on each manager node' },
                { label: 'Quick Contact Action Buttons', desc: 'Email/call directly from chart nodes' },
              ].map((item, idx) => (
                <div key={idx} className="p-3 rounded-xl border border-primary/40 bg-primary/5 shadow-2xs flex items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-foreground">{item.label}</p>
                    <p className="text-[11px] text-muted-foreground">{item.desc}</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Sub-tab Navigation */}
          <div className="flex items-center border-b border-border/80 pb-2 gap-1.5 overflow-x-auto text-xs font-bold">
        <button
          onClick={() => setActiveTab('page_table')}
          className={cn(
            'py-2 px-3 rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5',
            activeTab === 'page_table'
              ? 'bg-primary text-primary-foreground shadow-2xs font-bold'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          )}
        >
          <Table className="w-3.5 h-3.5" />
          1. Page &amp; Table Columns
        </button>

        <button
          onClick={() => setActiveTab('basic_info')}
          className={cn(
            'py-2 px-3 rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5',
            activeTab === 'basic_info'
              ? 'bg-primary text-primary-foreground shadow-2xs font-bold'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          )}
        >
          <Hash className="w-3.5 h-3.5" />
          2. Basic Info &amp; Code Format
        </button>

        <button
          onClick={() => setActiveTab('personal_info')}
          className={cn(
            'py-2 px-3 rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5',
            activeTab === 'personal_info'
              ? 'bg-primary text-primary-foreground shadow-2xs font-bold'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          )}
        >
          <KeyRound className="w-3.5 h-3.5" />
          3. Personal Info &amp; Password
        </button>

        <button
          onClick={() => setActiveTab('professional_info')}
          className={cn(
            'py-2 px-3 rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5',
            activeTab === 'professional_info'
              ? 'bg-primary text-primary-foreground shadow-2xs font-bold'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          )}
        >
          <Briefcase className="w-3.5 h-3.5" />
          4. Professional Info
        </button>

        <button
          onClick={() => setActiveTab('bank_details')}
          className={cn(
            'py-2 px-3 rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5',
            activeTab === 'bank_details'
              ? 'bg-primary text-primary-foreground shadow-2xs font-bold'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          )}
        >
          <CreditCard className="w-3.5 h-3.5" />
          5. Bank &amp; Statutory
        </button>
      </div>

      {/* ─── TAB 1: PAGE ACTIONS & TABLE COLUMNS ─── */}
      {activeTab === 'page_table' && (
        <div className="space-y-4 pt-1">
          {/* Page Level Controls */}
          <div>
            <h4 className="text-xs font-bold text-foreground">Employee Directory Page Controls</h4>
            <p className="text-[11px] text-muted-foreground">
              Enable or disable primary actions, search, filters, and pagination:
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Bulk Upload Button */}
            <Card className="border border-border/80 shadow-2xs rounded-xl bg-card">
              <CardContent className="p-3.5 flex items-center justify-between">
                <div className="space-y-0.5 min-w-0 pr-3">
                  <p className="text-xs font-bold text-foreground truncate">Bulk Upload Excel Action</p>
                  <p className="text-[11px] text-muted-foreground">Show mass employee upload button in header</p>
                </div>
                <Switch
                  checked={config.enableBulkUpload}
                  onCheckedChange={(checked) => updateConfig({ enableBulkUpload: checked })}
                />
              </CardContent>
            </Card>

            {/* Add Employee Button */}
            <Card className="border border-border/80 shadow-2xs rounded-xl bg-card">
              <CardContent className="p-3.5 flex items-center justify-between">
                <div className="space-y-0.5 min-w-0 pr-3">
                  <p className="text-xs font-bold text-foreground truncate">Add Employee Action</p>
                  <p className="text-[11px] text-muted-foreground">Show primary single employee creation button</p>
                </div>
                <Switch
                  checked={config.enableAddEmployee}
                  onCheckedChange={(checked) => updateConfig({ enableAddEmployee: checked })}
                />
              </CardContent>
            </Card>

            {/* Search Bar */}
            <Card className="border border-border/80 shadow-2xs rounded-xl bg-card">
              <CardContent className="p-3.5 flex items-center justify-between">
                <div className="space-y-0.5 min-w-0 pr-3">
                  <p className="text-xs font-bold text-foreground truncate">Search Bar</p>
                  <p className="text-[11px] text-muted-foreground">Quick search by name, code, email, or department</p>
                </div>
                <Switch
                  checked={config.enableSearchBar}
                  onCheckedChange={(checked) => updateConfig({ enableSearchBar: checked })}
                />
              </CardContent>
            </Card>

            {/* Filter Options */}
            <Card className="border border-border/80 shadow-2xs rounded-xl bg-card">
              <CardContent className="p-3.5 flex items-center justify-between">
                <div className="space-y-0.5 min-w-0 pr-3">
                  <p className="text-xs font-bold text-foreground truncate">Multi-Filter Dropdown</p>
                  <p className="text-[11px] text-muted-foreground">Filter by status, employment type, dept, location</p>
                </div>
                <Switch
                  checked={config.enableFilterOption}
                  onCheckedChange={(checked) => updateConfig({ enableFilterOption: checked })}
                />
              </CardContent>
            </Card>

            {/* Pagination */}
            <Card className="border border-border/80 shadow-2xs rounded-xl bg-card sm:col-span-2">
              <CardContent className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5 min-w-0 pr-3">
                  <p className="text-xs font-bold text-foreground truncate">Table Pagination &amp; Page Size</p>
                  <p className="text-[11px] text-muted-foreground">Split long employee lists into discrete pages</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {config.enablePagination && (
                    <select
                      value={config.defaultPageSize}
                      onChange={(e) => updateConfig({ defaultPageSize: Number(e.target.value) })}
                      className="h-8 px-2.5 rounded-lg border border-border bg-card text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                    >
                      <option value="10">10 per page</option>
                      <option value="25">25 per page (Default)</option>
                      <option value="50">50 per page</option>
                      <option value="100">100 per page</option>
                    </select>
                  )}
                  <Switch
                    checked={config.enablePagination}
                    onCheckedChange={(checked) => updateConfig({ enablePagination: checked })}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Table Columns Customizer */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h4 className="text-xs font-bold text-foreground">Table Columns &amp; Action Fields</h4>
                <p className="text-[11px] text-muted-foreground">
                  Choose which columns and action buttons are visible in the employee table:
                </p>
              </div>
              <Badge variant="outline" className="text-[10px] font-bold bg-primary/10 text-primary border-primary/20">
                {Object.values(config.tableColumns).filter(Boolean).length} Columns Active
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {([
                { key: 'employeeNameAvatar', label: 'Employee Name & Avatar' },
                { key: 'employeeCode', label: 'Employee Code' },
                { key: 'contactInfo', label: 'Contact (Email & Phone)' },
                { key: 'statusBadge', label: 'Status Badge' },
                { key: 'accessRole', label: 'Access Role' },
                { key: 'department', label: 'Department' },
                { key: 'designation', label: 'Designation' },
                { key: 'employmentType', label: 'Employment Type' },
                { key: 'location', label: 'Office Location' },
                { key: 'reportingManager', label: 'Reporting Manager' },
                { key: 'dateOfJoining', label: 'Joining Date' },
                { key: 'actions', label: 'Actions Column' },
                { key: 'actionViewProfile', label: 'Action: View Profile' },
                { key: 'actionDelete', label: 'Action: Delete Employee' },
              ] as const).map(({ key, label }) => {
                const isChecked = config.tableColumns[key];

                return (
                  <div
                    key={key}
                    onClick={() => updateTableColumn(key, !isChecked)}
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
                      onCheckedChange={(val) => updateTableColumn(key, val)}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 2: BASIC INFO & CODE FORMAT ─── */}
      {activeTab === 'basic_info' && (
        <div className="space-y-4 pt-1">
          {/* Employee Code Customizer Card */}
          <Card className="border border-primary/40 bg-gradient-to-r from-primary/10 via-card to-card rounded-2xl p-4 sm:p-5 shadow-2xs">
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-primary text-primary-foreground rounded-lg shadow-2xs">
                    <Hash className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-foreground">Custom Employee Code Format</h4>
                    <p className="text-[11px] text-muted-foreground">
                      Define a company-specific prefix and sequence padding for newly generated codes.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground">
                    {config.enableCustomEmployeeCodeFormat ? 'Custom Format' : 'Common Format (EMP001)'}
                  </span>
                  <Switch
                    checked={config.enableCustomEmployeeCodeFormat}
                    onCheckedChange={(checked) => updateConfig({ enableCustomEmployeeCodeFormat: checked })}
                  />
                </div>
              </div>

              {config.enableCustomEmployeeCodeFormat && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-border/50">
                  <div>
                    <Label className="text-[11px] font-bold text-foreground">Custom Prefix</Label>
                    <Input
                      value={config.customEmployeeCodePrefix}
                      onChange={(e) => updateConfig({ customEmployeeCodePrefix: e.target.value })}
                      placeholder="e.g. EMP-, NX-2026-"
                      className="h-8 text-xs mt-1 bg-card"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] font-bold text-foreground">Digit Padding Length</Label>
                    <Input
                      type="number"
                      min={1}
                      max={6}
                      value={config.customEmployeeCodeDigits}
                      onChange={(e) => updateConfig({ customEmployeeCodeDigits: Number(e.target.value) })}
                      className="h-8 text-xs mt-1 bg-card"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] font-bold text-foreground">Live Generated Preview</Label>
                    <div className="h-8 mt-1 px-3 rounded-lg border border-primary/40 bg-primary/10 flex items-center font-mono font-bold text-xs text-primary">
                      {generateEmployeeCode(42)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Basic Info Fields Matrix */}
          <div>
            <h4 className="text-xs font-bold text-foreground mb-2">Basic Info Fields in Add Employee Modal</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {([
                { key: 'employeeCode', label: 'Employee Code' },
                { key: 'firstName', label: 'First Name' },
                { key: 'lastName', label: 'Last Name' },
                { key: 'email', label: 'Official Email' },
                { key: 'mobile', label: 'Mobile Number' },
                { key: 'dateOfJoining', label: 'Date of Joining' },
                { key: 'departmentId', label: 'Department' },
                { key: 'designationId', label: 'Designation' },
                { key: 'employmentType', label: 'Employment Type' },
                { key: 'status', label: 'Employee Status' },
                { key: 'locationId', label: 'Office Location' },
                { key: 'reportingManagerId', label: 'Reporting Manager' },
                { key: 'accessRole', label: 'Access Role' },
                { key: 'avatarUrl', label: 'Profile Photo Upload' },
              ] as const).map(({ key, label }) => {
                const isChecked = config.basicInfoFields[key];

                return (
                  <div
                    key={key}
                    onClick={() => updateBasicField(key, !isChecked)}
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
                      onCheckedChange={(val) => updateBasicField(key, val)}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 3: PERSONAL INFO & PASSWORD ─── */}
      {activeTab === 'personal_info' && (
        <div className="space-y-4 pt-1">
          {/* Password Customizer Card */}
          <Card className="border border-primary/40 bg-gradient-to-r from-primary/10 via-card to-card rounded-2xl p-4 sm:p-5 shadow-2xs">
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-primary text-primary-foreground rounded-lg shadow-2xs">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-foreground">Custom Default Password Rule</h4>
                    <p className="text-[11px] text-muted-foreground">
                      Set custom standard prefix for auto-generated temporary onboarding passwords.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground">
                    {config.enableCustomPasswordFormat ? 'Custom Rule' : 'Standard (Appo@2026)'}
                  </span>
                  <Switch
                    checked={config.enableCustomPasswordFormat}
                    onCheckedChange={(checked) => updateConfig({ enableCustomPasswordFormat: checked })}
                  />
                </div>
              </div>

              {config.enableCustomPasswordFormat && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border/50">
                  <div>
                    <Label className="text-[11px] font-bold text-foreground">Custom Password Prefix</Label>
                    <Input
                      value={config.customPasswordPrefix}
                      onChange={(e) => updateConfig({ customPasswordPrefix: e.target.value })}
                      placeholder="e.g. Appo@, Welcome@"
                      className="h-8 text-xs mt-1 bg-card"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] font-bold text-foreground">Generated Password Sample</Label>
                    <div className="h-8 mt-1 px-3 rounded-lg border border-primary/40 bg-primary/10 flex items-center font-mono font-bold text-xs text-primary">
                      {generatePassword()}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Personal Info Fields Matrix */}
          <div>
            <h4 className="text-xs font-bold text-foreground mb-2">Personal Info Fields in Add Employee Modal</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {([
                { key: 'password', label: 'Password Setup' },
                { key: 'gender', label: 'Gender' },
                { key: 'dateOfBirth', label: 'Date of Birth' },
                { key: 'maritalStatus', label: 'Marital Status' },
                { key: 'bloodGroup', label: 'Blood Group' },
                { key: 'personalEmail', label: 'Personal Email' },
                { key: 'emergencyContactName', label: 'Emergency Contact Name' },
                { key: 'emergencyContactPhone', label: 'Emergency Contact Phone' },
                { key: 'address', label: 'Residential Address' },
              ] as const).map(({ key, label }) => {
                const isChecked = config.personalInfoFields[key];

                return (
                  <div
                    key={key}
                    onClick={() => updatePersonalField(key, !isChecked)}
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
                      onCheckedChange={(val) => updatePersonalField(key, val)}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 4: PROFESSIONAL INFO ─── */}
      {activeTab === 'professional_info' && (
        <div className="space-y-4 pt-1">
          <div>
            <h4 className="text-xs font-bold text-foreground mb-2">Professional Info Fields in Add Employee Modal</h4>
            <p className="text-[11px] text-muted-foreground mb-3">
              Enable or disable professional history, qualification, and compensation bands:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {([
                { key: 'jobTitle', label: 'Job Title / Position' },
                { key: 'gradeId', label: 'Seniority Grade Band' },
                { key: 'highestQualification', label: 'Highest Qualification' },
                { key: 'workExperienceYears', label: 'Total Experience (Years)' },
                { key: 'previousCompany', label: 'Previous Organization' },
                { key: 'noticePeriodDays', label: 'Notice Period (Days)' },
                { key: 'probationMonths', label: 'Probation Period (Months)' },
                { key: 'skills', label: 'Key Competencies & Skills' },
              ] as const).map(({ key, label }) => {
                const isChecked = config.professionalInfoFields[key];

                return (
                  <div
                    key={key}
                    onClick={() => updateProfessionalField(key, !isChecked)}
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
                      onCheckedChange={(val) => updateProfessionalField(key, val)}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 5: BANK DETAILS ─── */}
      {activeTab === 'bank_details' && (
        <div className="space-y-4 pt-1">
          <div>
            <h4 className="text-xs font-bold text-foreground mb-2">Bank &amp; Statutory Fields in Add Employee Modal</h4>
            <p className="text-[11px] text-muted-foreground mb-3">
              Enable or disable financial disbursement accounts and statutory identification:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {([
                { key: 'bankName', label: 'Bank Name' },
                { key: 'accountNo', label: 'Account Number' },
                { key: 'ifscCode', label: 'IFSC / Branch Code' },
                { key: 'branchName', label: 'Bank Branch Name' },
                { key: 'pan', label: 'PAN Card Number' },
                { key: 'uanNo', label: 'UAN (PF Number)' },
                { key: 'esicNo', label: 'ESIC Insurance Number' },
                { key: 'salarySlabId', label: 'Salary Structure Slab' },
                { key: 'annualCtc', label: 'Annual CTC Amount' },
              ] as const).map(({ key, label }) => {
                const isChecked = config.bankDetailsFields[key];

                return (
                  <div
                    key={key}
                    onClick={() => updateBankField(key, !isChecked)}
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
                      onCheckedChange={(val) => updateBankField(key, val)}
                    />
                  </div>
                );
              })}
            </div>
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
          Apply &amp; Save Employee Customizations
        </Button>
      </div>
        </>
      )}
    </div>
  );
}
