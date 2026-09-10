import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AVAILABLE_ROLES } from '../types/policy';
import type { TargetAssignment } from '../types/policy';
import { apiClient } from '@/config/api';
import {
  Shield,
  Building2,
  Users,
  MapPin,
  Check,
  Bell,
  FileCheck,
  Download,
  ArrowLeft,
  ArrowRight,
  Save,
} from 'lucide-react';

interface DepartmentOption {
  id: number | string;
  name: string;
}

interface EmployeeOption {
  id: number | string;
  first_name: string;
  last_name: string;
  email: string;
  department_name?: string;
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
  const [activeTab, setActiveTab] = useState<'roles' | 'departments' | 'employees' | 'custom'>('roles');
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [loadingLists, setLoadingLists] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState('');

  // Fetch departments & employees for selection
  useEffect(() => {
    const loadOptions = async () => {
      try {
        setLoadingLists(true);
        const [deptRes, empRes] = await Promise.all([
          apiClient.get('/reports/options').catch(() => ({ data: { data: { departments: [] } } })),
          apiClient.get('/employees').catch(() => ({ data: { data: [] } })),
        ]);

        const depts = deptRes.data?.data?.departments || [];
        setDepartments(Array.isArray(depts) ? depts : []);

        const emps = empRes.data?.data || empRes.data?.employees || empRes.data || [];
        setEmployees(Array.isArray(emps) ? emps : []);
      } catch (err) {
        console.warn('Could not load departments/employees for policy assignment selector:', err);
      } finally {
        setLoadingLists(false);
      }
    };
    loadOptions();
  }, []);

  // Helpers to check & toggle assignments
  const isRoleAssigned = (roleCode: string) => {
    return assignments.some((a) => a.targetType === 'role' && a.targetId === roleCode);
  };

  const toggleRole = (roleCode: string) => {
    if (isRoleAssigned(roleCode)) {
      onChangeAssignments(assignments.filter((a) => !(a.targetType === 'role' && a.targetId === roleCode)));
    } else {
      onChangeAssignments([...assignments, { targetType: 'role', targetId: roleCode }]);
    }
  };

  const isDepartmentAssigned = (deptId: string) => {
    return assignments.some((a) => a.targetType === 'department' && a.targetId === deptId);
  };

  const toggleDepartment = (deptId: string) => {
    if (deptId === 'all') {
      const withoutDepts = assignments.filter((a) => a.targetType !== 'department');
      if (isDepartmentAssigned('all')) {
        onChangeAssignments(withoutDepts);
      } else {
        onChangeAssignments([...withoutDepts, { targetType: 'department', targetId: 'all' }]);
      }
    } else {
      const withoutAllDept = assignments.filter((a) => !(a.targetType === 'department' && a.targetId === 'all'));
      if (isDepartmentAssigned(deptId)) {
        onChangeAssignments(withoutAllDept.filter((a) => !(a.targetType === 'department' && a.targetId === deptId)));
      } else {
        onChangeAssignments([...withoutAllDept, { targetType: 'department', targetId: deptId }]);
      }
    }
  };

  const isEmployeeAssigned = (empId: string) => {
    return assignments.some((a) => a.targetType === 'employee' && a.targetId === empId);
  };

  const toggleEmployee = (empId: string) => {
    if (empId === 'all') {
      const withoutEmps = assignments.filter((a) => a.targetType !== 'employee');
      if (isEmployeeAssigned('all')) {
        onChangeAssignments(withoutEmps);
      } else {
        onChangeAssignments([...withoutEmps, { targetType: 'employee', targetId: 'all' }]);
      }
    } else {
      const withoutAllEmp = assignments.filter((a) => !(a.targetType === 'employee' && a.targetId === 'all'));
      if (isEmployeeAssigned(empId)) {
        onChangeAssignments(withoutAllEmp.filter((a) => !(a.targetType === 'employee' && a.targetId === empId)));
      } else {
        onChangeAssignments([...withoutAllEmp, { targetType: 'employee', targetId: empId }]);
      }
    }
  };

  const filteredEmployees = employees.filter((e) => {
    const fullName = `${e.first_name || ''} ${e.last_name || ''}`.toLowerCase();
    const email = (e.email || '').toLowerCase();
    const query = employeeSearch.toLowerCase();
    return fullName.includes(query) || email.includes(query);
  });

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-xl p-6 shadow-2xs space-y-6">
        <div>
          <h3 className="text-base font-bold text-foreground">Step 3: Role-Wise Policy Assignment ⭐</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure authorization rules. A policy can be assigned to multiple roles, departments, and specific employees simultaneously.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-border pb-2">
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
            variant={activeTab === 'custom' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('custom')}
            className="h-8 text-xs font-bold gap-1.5"
          >
            <MapPin className="w-3.5 h-3.5" /> Custom / Scope
          </Button>
        </div>

        {/* Tab 1: Roles */}
        {activeTab === 'roles' && (
          <div className="space-y-3">
            <div className="text-xs font-bold text-foreground">Select Target Roles (Check all that apply):</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {AVAILABLE_ROLES.map((r) => {
                const checked = isRoleAssigned(r.code);
                return (
                  <div
                    key={r.code}
                    onClick={() => toggleRole(r.code)}
                    className={`border rounded-xl p-3.5 cursor-pointer transition-all flex items-center justify-between select-none ${
                      checked
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                        : 'border-border/80 bg-background hover:border-primary/40'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold text-foreground">{r.label}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">{r.code}</div>
                    </div>
                    <div
                      className={`h-5 w-5 rounded-md border flex items-center justify-center ${
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

        {/* Tab 2: Departments */}
        {activeTab === 'departments' && (
          <div className="space-y-3">
            <div className="text-xs font-bold text-foreground">Assign to Departments:</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div
                onClick={() => toggleDepartment('all')}
                className={`border rounded-xl p-4 cursor-pointer transition-all flex items-center justify-between select-none ${
                  isDepartmentAssigned('all')
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
                    isDepartmentAssigned('all') ? 'bg-primary border-primary text-primary-foreground' : 'border-input bg-card'
                  }`}
                >
                  {isDepartmentAssigned('all') && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
              </div>

              {departments.map((d) => {
                const checked = isDepartmentAssigned(String(d.id));
                return (
                  <div
                    key={d.id}
                    onClick={() => toggleDepartment(String(d.id))}
                    className={`border rounded-xl p-3.5 cursor-pointer transition-all flex items-center justify-between select-none ${
                      checked
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                        : 'border-border/80 bg-background hover:border-primary/40'
                    }`}
                  >
                    <div className="text-xs font-bold text-foreground">{d.name}</div>
                    <div
                      className={`h-5 w-5 rounded-md border flex items-center justify-center ${
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

            <div className="max-h-60 overflow-y-auto border border-border rounded-xl p-3 space-y-2 bg-background">
              <div
                onClick={() => toggleEmployee('all')}
                className={`border rounded-lg p-3 cursor-pointer flex items-center justify-between text-xs font-bold ${
                  isEmployeeAssigned('all') ? 'border-primary bg-primary/5' : 'border-border/60 hover:border-primary/40'
                }`}
              >
                <span>Assign to All Employees</span>
                <div className={`h-4 w-4 rounded border flex items-center justify-center ${isEmployeeAssigned('all') ? 'bg-primary border-primary text-white' : 'border-input'}`}>
                  {isEmployeeAssigned('all') && <Check className="w-3 h-3" />}
                </div>
              </div>

              {filteredEmployees.map((emp) => {
                const checked = isEmployeeAssigned(String(emp.id));
                return (
                  <div
                    key={emp.id}
                    onClick={() => toggleEmployee(String(emp.id))}
                    className={`border rounded-lg p-2.5 cursor-pointer flex items-center justify-between text-xs ${
                      checked ? 'border-primary bg-primary/5' : 'border-border/60 hover:border-primary/40'
                    }`}
                  >
                    <div>
                      <span className="font-bold text-foreground">{emp.first_name} {emp.last_name}</span>
                      <span className="text-[10px] text-muted-foreground ml-2">({emp.email})</span>
                    </div>
                    <div className={`h-4 w-4 rounded border flex items-center justify-center ${checked ? 'bg-primary border-primary text-white' : 'border-input'}`}>
                      {checked && <Check className="w-3 h-3" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 4: Custom Options */}
        {activeTab === 'custom' && (
          <div className="space-y-3 p-4 bg-muted/20 border border-border rounded-xl text-xs">
            <div className="font-bold text-foreground">Custom Scope & Location Filters</div>
            <p className="text-muted-foreground">
              By default, target policies are filtered dynamically based on user context. You can attach additional location tags or custom group tags.
            </p>
          </div>
        )}

        {/* Additional Options */}
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
