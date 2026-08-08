import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ShieldCheck,
  CheckCircle2,
  Save,
  Shield,
  Key,
} from 'lucide-react';
import { showToast } from '@/components/ui/toast';
import type { Employee } from '@/types';

interface EmployeeRolesInfoProps {
  employee: Employee;
  onRoleUpdate?: () => void;
  /** If true, roles are read-only showing assigned access only (employee self-view). Only admins/HR can modify. */
  readOnly?: boolean;
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

export function EmployeeRolesInfo({ employee, onRoleUpdate, readOnly = false }: EmployeeRolesInfoProps) {
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

  // Toggle role assignment — only allowed when not readOnly
  const handleToggleRole = (role: string) => {
    if (readOnly) return;
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
                {readOnly
                  ? `Your assigned system access roles and feature permissions.`
                  : `Assign administrative access roles, feature permissions, and document privileges for ${employee.firstName}.`}
              </CardDescription>
            </div>

            {/* Save Button — strictly Admin Side ONLY (!readOnly) */}
            {!readOnly && (
              <Button
                size="sm"
                onClick={handleSaveRoles}
                disabled={isSaving}
                className="h-8 text-xs font-semibold gap-1.5 px-4 rounded-lg bg-primary text-primary-foreground shadow-xs self-start sm:self-auto"
              >
                <Save className="w-3.5 h-3.5" /> Save Role Changes
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Read-only Info Banner on Employee Portal */}
          {readOnly && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-blue-500/8 border border-blue-500/25 text-xs text-blue-700 dark:text-blue-400 font-medium">
              <Shield className="w-4 h-4 shrink-0 text-blue-600" />
              Role & access permissions are assigned and managed by your HR & Organization Admin.
            </div>
          )}

          {readOnly ? (
            /* ─────────────────────────────────────────────────────────────
               EMPLOYEE SIDE: Clean Display of Active Assigned Roles ONLY
            ───────────────────────────────────────────────────────────── */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Key className="w-4 h-4 text-primary" /> Active Assigned System Roles ({assignedRoles.length})
                </h4>
              </div>

              {assignedRoles.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground bg-muted/20 rounded-xl border border-border/60">
                  No administrative roles currently assigned.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {assignedRoles.map((role) => (
                    <div
                      key={role}
                      className="p-3.5 rounded-xl border border-primary/25 bg-primary/5 flex items-center gap-3 shadow-2xs"
                    >
                      <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-xs text-foreground truncate">{role}</p>
                        <p className="text-[10px] text-muted-foreground">Access Granted</p>
                      </div>
                      <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[10px] shrink-0">
                        Active
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* ─────────────────────────────────────────────────────────────
               ADMIN SIDE: Active Summary + Full Interactive Grid for Editing
            ───────────────────────────────────────────────────────────── */
            <>
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

              {/* Clean, Symmetrical Roles Grid */}
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
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
