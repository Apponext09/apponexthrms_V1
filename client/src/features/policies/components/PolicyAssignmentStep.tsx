import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { TargetAssignment } from '../types/policy';
import { policiesApi } from '../api/policiesApi';
import {
  Shield,
  Building2,
  Users,
  Briefcase,
  MapPin,
  Check,
  Bell,
  FileCheck,
  Download,
  ArrowLeft,
  ArrowRight,
  Save,
  RotateCw,
  AlertCircle,
  Search,
  Clock,
  UserCheck,
  Tag,
} from 'lucide-react';

interface TargetOptionItem {
  id: string | number;
  name: string;
  code?: string;
  description?: string;
  email?: string;
  city?: string;
  [key: string]: any;
}

interface TargetOptionsState {
  roles: TargetOptionItem[];
  departments: TargetOptionItem[];
  employees: TargetOptionItem[];
  designations: TargetOptionItem[];
  locations: TargetOptionItem[];
  employeeTypes: TargetOptionItem[];
  shifts: TargetOptionItem[];
  reportingManagers: TargetOptionItem[];
}

interface PolicyAssignmentStepProps {
  assignments: TargetAssignment[];
  onChangeAssignments: (assignments: TargetAssignment[]) => void;
  options: {
    sendNotification: boolean;
    requireAcknowledgement: boolean;
    allowDownload: boolean;
  };
  onChangeOptions: (opts: Partial<{
    sendNotification: boolean;
    requireAcknowledgement: boolean;
    allowDownload: boolean;
  }>) => void;
  onBack: () => void;
  onNext: () => void;
  onSaveDraft: () => void;
  isSubmitting?: boolean;
}

export const PolicyAssignmentStep: React.FC<PolicyAssignmentStepProps> = ({
  assignments,
  onChangeAssignments,
  options,
  onChangeOptions,
  onBack,
  onNext,
  onSaveDraft,
  isSubmitting = false,
}) => {
  const [activeTab, setActiveTab] = useState<'roles' | 'departments' | 'employees' | 'designations' | 'custom'>('roles');
  
  const [targetData, setTargetData] = useState<TargetOptionsState>({
    roles: [],
    departments: [],
    employees: [],
    designations: [],
    locations: [],
    employeeTypes: [],
    shifts: [],
    reportingManagers: [],
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search states for tabs
  const [roleSearch, setRoleSearch] = useState('');
  const [deptSearch, setDeptSearch] = useState('');
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [desigSearch, setDesigSearch] = useState('');

  const loadTargetOptions = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await policiesApi.getTargetOptions();
      setTargetData({
        roles: Array.isArray(data?.roles) ? data.roles : [],
        departments: Array.isArray(data?.departments) ? data.departments : [],
        employees: Array.isArray(data?.employees) ? data.employees : [],
        designations: Array.isArray(data?.designations) ? data.designations : [],
        locations: Array.isArray(data?.locations) ? data.locations : [],
        employeeTypes: Array.isArray(data?.employeeTypes) ? data.employeeTypes : [],
        shifts: Array.isArray(data?.shifts) ? data.shifts : [],
        reportingManagers: Array.isArray(data?.reportingManagers) ? data.reportingManagers : [],
      });
    } catch (err: any) {
      console.error('Failed to load target options:', err);
      setError(err?.message || 'Failed to load organizational target options. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTargetOptions();
  }, []);

  // Generic check for target assignment
  const isTargetAssigned = (targetType: string, targetId: string | number) => {
    const idStr = String(targetId);
    return assignments.some((a) => a.targetType === targetType && String(a.targetId) === idStr);
  };

  // Toggle single item target
  const toggleTarget = (targetType: string, targetId: string | number) => {
    const idStr = String(targetId);
    const exists = isTargetAssigned(targetType, idStr);

    if (idStr === 'all') {
      const withoutType = assignments.filter((a) => a.targetType !== targetType);
      if (exists) {
        onChangeAssignments(withoutType);
      } else {
        onChangeAssignments([...withoutType, { targetType: targetType as any, targetId: 'all' }]);
      }
    } else {
      const withoutAll = assignments.filter((a) => !(a.targetType === targetType && String(a.targetId) === 'all'));
      if (exists) {
        onChangeAssignments(withoutAll.filter((a) => !(a.targetType === targetType && String(a.targetId) === idStr)));
      } else {
        onChangeAssignments([...withoutAll, { targetType: targetType as any, targetId: idStr }]);
      }
    }
  };

  // Filtered lists
  const filteredRoles = targetData.roles.filter((r) => {
    const name = (r.name || '').toLowerCase();
    const code = (r.code || '').toLowerCase();
    const q = roleSearch.toLowerCase().trim();
    return name.includes(q) || code.includes(q);
  });

  const filteredDepts = targetData.departments.filter((d) => {
    const name = (d.name || '').toLowerCase();
    const q = deptSearch.toLowerCase().trim();
    return name.includes(q);
  });

  const filteredEmployees = targetData.employees.filter((e) => {
    const name = (e.name || `${e.first_name || ''} ${e.last_name || ''}`).toLowerCase();
    const email = (e.email || '').toLowerCase();
    const q = employeeSearch.toLowerCase().trim();
    return name.includes(q) || email.includes(q);
  });

  const filteredDesignations = targetData.designations.filter((des) => {
    const name = (des.name || '').toLowerCase();
    const q = desigSearch.toLowerCase().trim();
    return name.includes(q);
  });

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-xl p-6 shadow-2xs space-y-6">
        <div>
          <h3 className="text-base font-bold text-foreground">Step 3: Target Assignment ⭐</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure dynamic targeting rules. Assign policy by Roles, Departments, Employees, Designations, or Custom Scope (Location, Shift, Employee Type).
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border pb-2">
          <Button
            type="button"
            variant={activeTab === 'roles' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('roles')}
            className="h-8 text-xs font-bold gap-1.5"
          >
            <Shield className="w-3.5 h-3.5" /> Roles
          </Button>
          <Button
            type="button"
            variant={activeTab === 'departments' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('departments')}
            className="h-8 text-xs font-bold gap-1.5"
          >
            <Building2 className="w-3.5 h-3.5" /> Departments
          </Button>
          <Button
            type="button"
            variant={activeTab === 'employees' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('employees')}
            className="h-8 text-xs font-bold gap-1.5"
          >
            <Users className="w-3.5 h-3.5" /> Employees
          </Button>
          <Button
            type="button"
            variant={activeTab === 'designations' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('designations')}
            className="h-8 text-xs font-bold gap-1.5"
          >
            <Briefcase className="w-3.5 h-3.5" /> Designations
          </Button>
          <Button
            type="button"
            variant={activeTab === 'custom' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('custom')}
            className="h-8 text-xs font-bold gap-1.5"
          >
            <MapPin className="w-3.5 h-3.5" /> Custom / Scope
          </Button>
        </div>

        {/* Global Loading / Error States */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-3 bg-muted/10 border border-border/60 rounded-xl">
            <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <p className="text-xs font-medium text-muted-foreground">Loading master organizational targeting data...</p>
          </div>
        ) : error ? (
          <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl space-y-3 text-xs text-rose-600">
            <div className="flex items-center gap-2 font-bold">
              <AlertCircle className="w-4 h-4" /> Failed to Load Master Target Options
            </div>
            <p className="text-muted-foreground">{error}</p>
            <Button type="button" variant="outline" size="sm" onClick={loadTargetOptions} className="h-8 text-xs font-bold gap-1.5">
              <RotateCw className="w-3.5 h-3.5" /> Retry Loading Options
            </Button>
          </div>
        ) : (
          <>
            {/* Tab 1: Roles */}
            {activeTab === 'roles' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-bold text-foreground">Select Target Roles (Check all that apply):</div>
                  <Input
                    placeholder="Search roles..."
                    value={roleSearch}
                    onChange={(e) => setRoleSearch(e.target.value)}
                    className="h-8 text-xs max-w-xs bg-background"
                  />
                </div>

                {filteredRoles.length === 0 ? (
                  <div className="p-6 text-center border border-dashed border-border rounded-xl text-xs text-muted-foreground">
                    No roles found matching criteria.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {filteredRoles.map((r) => {
                      const roleIdentifier = r.code || String(r.id);
                      const checked = isTargetAssigned('role', roleIdentifier);
                      return (
                        <div
                          key={r.id || r.code}
                          onClick={() => toggleTarget('role', roleIdentifier)}
                          className={`border rounded-xl p-3.5 cursor-pointer transition-all flex items-center justify-between select-none ${
                            checked
                              ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                              : 'border-border/80 bg-background hover:border-primary/40'
                          }`}
                        >
                          <div className="space-y-0.5 truncate pr-2">
                            <div className="text-xs font-bold text-foreground truncate">{r.name}</div>
                            <div className="text-[10px] text-muted-foreground font-mono truncate">{r.code || `ID: ${r.id}`}</div>
                          </div>
                          <div
                            className={`h-5 w-5 rounded-md border flex items-center justify-center shrink-0 ${
                              checked ? 'bg-primary border-primary text-primary-foreground' : 'border-input bg-card'
                            }`}
                          >
                            {checked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Departments */}
            {activeTab === 'departments' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-bold text-foreground">Assign to Departments:</div>
                  <Input
                    placeholder="Search departments..."
                    value={deptSearch}
                    onChange={(e) => setDeptSearch(e.target.value)}
                    className="h-8 text-xs max-w-xs bg-background"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => toggleTarget('department', 'all')}
                    className={`border rounded-xl p-4 cursor-pointer transition-all flex items-center justify-between select-none ${
                      isTargetAssigned('department', 'all')
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                        : 'border-border/80 bg-background hover:border-primary/40'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold text-foreground">All Departments</div>
                      <div className="text-[10px] text-muted-foreground">Applies policy across the entire organization</div>
                    </div>
                    <div
                      className={`h-5 w-5 rounded-md border flex items-center justify-center ${
                        isTargetAssigned('department', 'all') ? 'bg-primary border-primary text-primary-foreground' : 'border-input bg-card'
                      }`}
                    >
                      {isTargetAssigned('department', 'all') && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>

                  {filteredDepts.map((d) => {
                    const checked = isTargetAssigned('department', d.id);
                    return (
                      <div
                        key={d.id}
                        onClick={() => toggleTarget('department', d.id)}
                        className={`border rounded-xl p-3.5 cursor-pointer transition-all flex items-center justify-between select-none ${
                          checked
                            ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                            : 'border-border/80 bg-background hover:border-primary/40'
                        }`}
                      >
                        <div className="text-xs font-bold text-foreground truncate pr-2">{d.name}</div>
                        <div
                          className={`h-5 w-5 rounded-md border flex items-center justify-center shrink-0 ${
                            checked ? 'bg-primary border-primary text-primary-foreground' : 'border-input bg-card'
                          }`}
                        >
                          {checked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tab 3: Employees */}
            {activeTab === 'employees' && (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div className="text-xs font-bold text-foreground">Assign to Specific Employees:</div>
                  <Input
                    placeholder="Search employee by name or email..."
                    value={employeeSearch}
                    onChange={(e) => setEmployeeSearch(e.target.value)}
                    className="h-8 text-xs max-w-xs bg-background"
                  />
                </div>

                <div className="max-h-72 overflow-y-auto border border-border rounded-xl p-3 space-y-2 bg-background">
                  <div
                    onClick={() => toggleTarget('employee', 'all')}
                    className={`border rounded-lg p-3 cursor-pointer flex items-center justify-between text-xs font-bold ${
                      isTargetAssigned('employee', 'all') ? 'border-primary bg-primary/5' : 'border-border/60 hover:border-primary/40'
                    }`}
                  >
                    <span>Assign to All Employees</span>
                    <div className={`h-4 w-4 rounded border flex items-center justify-center ${isTargetAssigned('employee', 'all') ? 'bg-primary border-primary text-white' : 'border-input'}`}>
                      {isTargetAssigned('employee', 'all') && <Check className="w-3 h-3" />}
                    </div>
                  </div>

                  {filteredEmployees.length === 0 ? (
                    <div className="p-4 text-center text-xs text-muted-foreground">No employees found.</div>
                  ) : (
                    filteredEmployees.map((emp) => {
                      const checked = isTargetAssigned('employee', emp.id);
                      return (
                        <div
                          key={emp.id}
                          onClick={() => toggleTarget('employee', emp.id)}
                          className={`border rounded-lg p-2.5 cursor-pointer flex items-center justify-between text-xs transition-all ${
                            checked ? 'border-primary bg-primary/5' : 'border-border/60 hover:border-primary/40'
                          }`}
                        >
                          <div>
                            <span className="font-bold text-foreground">{emp.name}</span>
                            {emp.email && <span className="text-[10px] text-muted-foreground ml-2">({emp.email})</span>}
                          </div>
                          <div className={`h-4 w-4 rounded border flex items-center justify-center ${checked ? 'bg-primary border-primary text-white' : 'border-input'}`}>
                            {checked && <Check className="w-3 h-3" />}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Tab 4: Designations */}
            {activeTab === 'designations' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-bold text-foreground">Assign to Designations:</div>
                  <Input
                    placeholder="Search designations..."
                    value={desigSearch}
                    onChange={(e) => setDesigSearch(e.target.value)}
                    className="h-8 text-xs max-w-xs bg-background"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div
                    onClick={() => toggleTarget('designation', 'all')}
                    className={`border rounded-xl p-3.5 cursor-pointer transition-all flex items-center justify-between select-none ${
                      isTargetAssigned('designation', 'all')
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                        : 'border-border/80 bg-background hover:border-primary/40'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold text-foreground">All Designations</div>
                      <div className="text-[10px] text-muted-foreground">Applies policy across all designations</div>
                    </div>
                    <div
                      className={`h-5 w-5 rounded-md border flex items-center justify-center shrink-0 ${
                        isTargetAssigned('designation', 'all') ? 'bg-primary border-primary text-primary-foreground' : 'border-input bg-card'
                      }`}
                    >
                      {isTargetAssigned('designation', 'all') && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>

                  {filteredDesignations.map((des) => {
                    const checked = isTargetAssigned('designation', des.id);
                    return (
                      <div
                        key={des.id}
                        onClick={() => toggleTarget('designation', des.id)}
                        className={`border rounded-xl p-3.5 cursor-pointer transition-all flex items-center justify-between select-none ${
                          checked
                            ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                            : 'border-border/80 bg-background hover:border-primary/40'
                        }`}
                      >
                        <div className="text-xs font-bold text-foreground truncate pr-2">{des.name}</div>
                        <div
                          className={`h-5 w-5 rounded-md border flex items-center justify-center shrink-0 ${
                            checked ? 'bg-primary border-primary text-primary-foreground' : 'border-input bg-card'
                          }`}
                        >
                          {checked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tab 5: Custom / Scope */}
            {activeTab === 'custom' && (
              <div className="space-y-5">
                <div className="p-3.5 bg-muted/20 border border-border rounded-xl text-xs space-y-1">
                  <div className="font-bold text-foreground flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-primary" /> Dynamic Organizational Custom Scope Filters
                  </div>
                  <p className="text-muted-foreground text-[11px]">
                    Select organizational attributes below to restrict policy visibility dynamically based on user location, shift, or employment type.
                  </p>
                </div>

                {/* Locations Section */}
                <div className="space-y-2">
                  <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-primary" /> Office Locations:
                  </div>
                  {targetData.locations.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground italic">No location master data configured.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {targetData.locations.map((loc) => {
                        const checked = isTargetAssigned('location', loc.id);
                        return (
                          <div
                            key={loc.id}
                            onClick={() => toggleTarget('location', loc.id)}
                            className={`border rounded-lg p-2.5 cursor-pointer text-xs flex items-center justify-between select-none ${
                              checked ? 'border-primary bg-primary/5 font-bold' : 'border-border/60 hover:border-primary/40'
                            }`}
                          >
                            <span>{loc.name || loc.city}</span>
                            <div className={`h-4 w-4 rounded border flex items-center justify-center ${checked ? 'bg-primary border-primary text-white' : 'border-input'}`}>
                              {checked && <Check className="w-3 h-3" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Employee Types Section */}
                {targetData.employeeTypes.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-border">
                    <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-primary" /> Employment Types:
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {targetData.employeeTypes.map((et) => {
                        const checked = isTargetAssigned('custom', `emp_type_${et.id}`);
                        return (
                          <div
                            key={et.id}
                            onClick={() => toggleTarget('custom', `emp_type_${et.id}`)}
                            className={`border rounded-lg p-2.5 cursor-pointer text-xs flex items-center justify-between select-none ${
                              checked ? 'border-primary bg-primary/5 font-bold' : 'border-border/60 hover:border-primary/40'
                            }`}
                          >
                            <span>{et.name}</span>
                            <div className={`h-4 w-4 rounded border flex items-center justify-center ${checked ? 'bg-primary border-primary text-white' : 'border-input'}`}>
                              {checked && <Check className="w-3 h-3" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Shifts Section */}
                {targetData.shifts.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-border">
                    <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-primary" /> Work Shifts:
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {targetData.shifts.map((s) => {
                        const checked = isTargetAssigned('custom', `shift_${s.id}`);
                        return (
                          <div
                            key={s.id}
                            onClick={() => toggleTarget('custom', `shift_${s.id}`)}
                            className={`border rounded-lg p-2.5 cursor-pointer text-xs flex items-center justify-between select-none ${
                              checked ? 'border-primary bg-primary/5 font-bold' : 'border-border/60 hover:border-primary/40'
                            }`}
                          >
                            <span>{s.name}</span>
                            <div className={`h-4 w-4 rounded border flex items-center justify-center ${checked ? 'bg-primary border-primary text-white' : 'border-input'}`}>
                              {checked && <Check className="w-3 h-3" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Additional Distribution & Control Options */}
        <div className="border-t border-border pt-4 space-y-3">
          <div className="text-xs font-bold text-foreground uppercase tracking-wider">Additional Distribution & Control Options</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-medium">
            <label className="flex items-center gap-2 border border-border rounded-xl p-3 bg-background cursor-pointer select-none">
              <input
                type="checkbox"
                checked={options.sendNotification}
                onChange={(e) => onChangeOptions({ sendNotification: e.target.checked })}
                className="rounded border-input text-primary focus:ring-primary h-4 w-4"
              />
              <div className="space-y-0.5">
                <div className="font-bold text-foreground flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-primary" /> Send Notification
                </div>
                <div className="text-[10px] text-muted-foreground">Alert target users upon publish</div>
              </div>
            </label>

            <label className="flex items-center gap-2 border border-border rounded-xl p-3 bg-background cursor-pointer select-none">
              <input
                type="checkbox"
                checked={options.requireAcknowledgement}
                onChange={(e) => onChangeOptions({ requireAcknowledgement: e.target.checked })}
                className="rounded border-input text-primary focus:ring-primary h-4 w-4"
              />
              <div className="space-y-0.5">
                <div className="font-bold text-foreground flex items-center gap-1.5">
                  <FileCheck className="w-3.5 h-3.5 text-emerald-500" /> Mandatory Sign-Off
                </div>
                <div className="text-[10px] text-muted-foreground">Require user acknowledgement</div>
              </div>
            </label>

            <label className="flex items-center gap-2 border border-border rounded-xl p-3 bg-background cursor-pointer select-none">
              <input
                type="checkbox"
                checked={options.allowDownload}
                onChange={(e) => onChangeOptions({ allowDownload: e.target.checked })}
                className="rounded border-input text-primary focus:ring-primary h-4 w-4"
              />
              <div className="space-y-0.5">
                <div className="font-bold text-foreground flex items-center gap-1.5">
                  <Download className="w-3.5 h-3.5 text-blue-500" /> Allow Download
                </div>
                <div className="text-[10px] text-muted-foreground">Permit PDF document downloads</div>
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-2">
        <Button type="button" variant="outline" size="sm" onClick={onBack} className="h-9 px-4 text-xs font-bold gap-1.5">
          <ArrowLeft className="w-3.5 h-3.5" /> Back: Content
        </Button>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onSaveDraft}
            disabled={isSubmitting}
            className="h-9 px-4 text-xs font-bold gap-1.5"
          >
            <Save className="w-3.5 h-3.5" /> Save Draft
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={onNext}
            className="h-9 px-4 text-xs font-bold bg-primary text-primary-foreground gap-1.5"
          >
            Next: Review & Publish <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
};
