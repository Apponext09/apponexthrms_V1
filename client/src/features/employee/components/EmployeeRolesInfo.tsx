import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ShieldCheck,
  CheckCircle2,
  Save,
} from 'lucide-react';
import { showToast } from '@/components/ui/toast';
import type { Employee } from '@/types';

interface EmployeeRolesInfoProps {
  employee: Employee;
  onRoleUpdate?: () => void;
}

// Single list of all system roles
const SYSTEM_ROLES = [
  'Accounts',
  'Approver',
  'Bypass IP Restrict',
  'Document Access',
  'Docutame Access',
  'Docutame File Upload',
  'General Manager',
  'General Staff',
  'HR',
  'HR Admin',
  'Invoice Details',
  'LMS access',
  'LMS statistics',
  'No Checkin',
  'Reporting Officer',
  'Sysadmin',
];

export function EmployeeRolesInfo({ employee, onRoleUpdate }: EmployeeRolesInfoProps) {
  // Assigned roles set
  const [assignedRoles, setAssignedRoles] = useState<string[]>([
    'Document Access',
    'Docutame Access',
    'Docutame File Upload',
    'General Staff',
    'HR',
    'HR Admin',
    'Reporting Officer',
  ]);

  const [isSaving, setIsSaving] = useState(false);

  // Toggle role assignment
  const handleToggleRole = (role: string) => {
    setAssignedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  // Save Role Changes
  const handleSaveRoles = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      showToast.success('Employee role permissions updated successfully');
      if (onRoleUpdate) onRoleUpdate();
    }, 250);
  };

  return (
    <div className="w-full space-y-6 font-sans">
      <Card className="w-full border border-border/80 shadow-2xs rounded-xl bg-card">
        <CardHeader className="border-b border-border/60 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary" />
                Role & Access Permissions
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Assign administrative access roles, feature permissions, and document privileges for {employee.firstName}.
              </CardDescription>
            </div>

            <Button
              size="sm"
              onClick={handleSaveRoles}
              disabled={isSaving}
              className="h-8 text-xs font-semibold gap-1.5 px-4 rounded-lg bg-primary text-primary-foreground shadow-xs self-start sm:self-auto"
            >
              <Save className="w-3.5 h-3.5" /> Save Role Changes
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Active Assigned Summary Banner */}
          <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-0.5">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-primary block">
                Active Assigned Roles
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-foreground">
                  {assignedRoles.length} Roles Assigned
                </span>
              </div>
              <p className="text-muted-foreground text-[11px]">
                Click on any role button below to toggle access permissions for this employee.
              </p>
            </div>

            <div className="flex flex-wrap gap-1.5 max-w-md">
              {assignedRoles.slice(0, 4).map((role) => (
                <Badge key={role} className="bg-primary text-primary-foreground text-[10px] px-2.5 py-0.5 font-semibold">
                  {role}
                </Badge>
              ))}
              {assignedRoles.length > 4 && (
                <Badge variant="outline" className="text-[10px] bg-background">
                  +{assignedRoles.length - 4} more
                </Badge>
              )}
            </div>
          </div>

          {/* Clean, Symmetrical Roles Grid - All Roles arranged in one unified layout */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {SYSTEM_ROLES.map((role) => {
              const isAssigned = assignedRoles.includes(role);
              return (
                <button
                  key={role}
                  onClick={() => handleToggleRole(role)}
                  className={`py-2.5 px-3 text-xs font-semibold rounded-xl border transition-all cursor-pointer select-none flex items-center justify-center gap-2 text-center truncate ${
                    isAssigned
                      ? 'bg-primary text-primary-foreground border-primary shadow-xs font-bold'
                      : 'bg-muted/30 text-muted-foreground border-border/70 hover:bg-muted hover:text-foreground font-medium'
                  }`}
                  title={isAssigned ? `${role} (Assigned)` : `${role} (Click to Assign)`}
                >
                  {isAssigned && <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-primary-foreground" />}
                  <span className="truncate">{role}</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
