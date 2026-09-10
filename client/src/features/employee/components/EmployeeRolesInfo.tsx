import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  ShieldCheck,
  CheckCircle2,
  Save,
  Shield,
  Key,
  Search,
  RefreshCw,
  Sparkles,
  Layers,
} from 'lucide-react';
import { showToast } from '@/components/ui/toast';
import { apiClient } from '@/config/api';
import type { Employee } from '@/types';

interface EmployeeRolesInfoProps {
  employee: Employee;
  onRoleUpdate?: () => void;
  /** If true, roles are read-only showing assigned access only (employee self-view). Only admins/HR can modify. */
  readOnly?: boolean;
}

export interface DynamicRoleItem {
  id: string | number;
  name: string;
  source: 'masters' | 'rbac' | 'designation';
  description?: string;
}

export function EmployeeRolesInfo({ employee, onRoleUpdate, readOnly = false }: EmployeeRolesInfoProps) {
  const [availableRoles, setAvailableRoles] = useState<DynamicRoleItem[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [search, setSearch] = useState('');

  // Assigned roles initialized as empty array (strictly from employee record, no hardcoded defaults)
  const [assignedRoles, setAssignedRoles] = useState<string[]>([]);

  const [isSaving, setIsSaving] = useState(false);

  // Fetch dynamic Roles & Responsibilities strictly from Roles & Responsibility master table
  const fetchDynamicRoles = async () => {
    try {
      setLoadingRoles(true);
      const mastersRes = await apiClient
        .get('/settings/roles-responsibilities?pageSize=200')
        .catch(() => ({ data: { data: [] } }));

      const mastersData: any[] = Array.isArray(mastersRes.data?.data) ? mastersRes.data.data : [];
      const roleMap = new Map<string, DynamicRoleItem>();

      // Extract Roles & Responsibilities added in Masters tab
      mastersData.forEach((item) => {
        const title =
          item.designationName ||
          item.designation_name ||
          item.departmentName ||
          item.department_name ||
          (item.responsibilities ? item.responsibilities.replace(/<[^>]*>?/gm, '').trim().slice(0, 35) : null);

        if (title && title.length > 1) {
          const cleanTitle = title.trim();
          roleMap.set(cleanTitle.toLowerCase(), {
            id: item.id || cleanTitle,
            name: cleanTitle,
            source: 'masters',
            description: item.responsibilities ? item.responsibilities.replace(/<[^>]*>?/gm, '').trim() : undefined,
          });
        }
      });

      const sortedRoles = Array.from(roleMap.values()).sort((a, b) => a.name.localeCompare(b.name));
      setAvailableRoles(sortedRoles);
    } catch (err) {
      console.warn('Failed to load dynamic roles & responsibilities:', err);
    } finally {
      setLoadingRoles(false);
    }
  };

  useEffect(() => {
    fetchDynamicRoles();
  }, []);

  // Sync initial assigned roles strictly from employee object
  useEffect(() => {
    if (employee && (employee as any).assignedRoles && Array.isArray((employee as any).assignedRoles)) {
      setAssignedRoles((employee as any).assignedRoles);
    } else if (employee && (employee as any).roles && Array.isArray((employee as any).roles)) {
      setAssignedRoles((employee as any).roles);
    } else if (employee && (employee as any).accessRole) {
      setAssignedRoles([(employee as any).accessRole]);
    }
  }, [employee]);

  // Toggle role assignment — only allowed when not readOnly
  const handleToggleRole = (roleName: string) => {
    if (readOnly) return;
    setAssignedRoles((prev) =>
      prev.includes(roleName) ? prev.filter((r) => r !== roleName) : [...prev, roleName]
    );
  };

  const handleSaveRoles = async () => {
    try {
      setIsSaving(true);
      const systemRoles = ['employee', 'team_lead', 'hr_manager', 'department_head', 'cto', 'cfo', 'coo', 'cxo', 'organization_admin', 'super_admin', 'finance', 'intern', 'consultant', 'admin', 'ceo', 'hr_admin', 'hr', 'support'];
      const matchedSystemRole = assignedRoles.find(r => systemRoles.includes(r.toLowerCase().trim()));
      const primaryAccessRole = (matchedSystemRole || assignedRoles[0] || 'employee').toLowerCase().trim();

      await apiClient.patch(`/employees/${employee.id}`, {
        accessRole: primaryAccessRole,
        roles: assignedRoles,
        assignedRoles: assignedRoles,
      });

      showToast.success('Employee role permissions updated successfully');
      if (onRoleUpdate) onRoleUpdate();
    } catch (err) {
      showToast.error('Failed to update employee roles');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredRoles = availableRoles.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    (r.description && r.description.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="w-full space-y-6 font-sans">
      <Card className="w-full border border-border/80 shadow-2xs rounded-xl bg-card">
        <CardHeader className="border-b border-border/60 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary" />
                Role &amp; Access Permissions
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
                className="h-8 text-xs font-semibold gap-1.5 px-4 rounded-lg bg-primary text-primary-foreground shadow-xs self-start sm:self-auto cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" /> {isSaving ? 'Saving...' : 'Save Role Changes'}
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Read-only Info Banner on Employee Portal */}
          {readOnly && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-blue-500/8 border border-blue-500/25 text-xs text-blue-700 dark:text-blue-400 font-medium">
              <Shield className="w-4 h-4 shrink-0 text-blue-600" />
              Role &amp; access permissions are assigned and managed by your HR &amp; Organization Admin.
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
                  {assignedRoles.map((roleName) => {
                    const roleMeta = availableRoles.find((r) => r.name === roleName);
                    return (
                      <div
                        key={roleName}
                        className="p-3.5 rounded-xl border border-primary/25 bg-primary/5 flex items-center gap-3 shadow-2xs"
                      >
                        <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-xs text-foreground truncate">{roleName}</p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {roleMeta?.description || 'Access Granted'}
                          </p>
                        </div>
                        <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[10px] shrink-0">
                          Active
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* ─────────────────────────────────────────────────────────────
               ADMIN SIDE: Active Summary + Search + Dynamic Master Roles Grid
            ───────────────────────────────────────────────────────────── */
            <>
              {/* Active Assigned Summary Banner */}
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-primary flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-indigo-500" />
                    Active Assigned Roles &amp; Responsibilities
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

              {/* Search & Meta Header */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search roles & responsibilities..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 h-9 rounded-xl text-xs font-medium bg-background border-border"
                  />
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground self-end sm:self-auto">
                  <Badge variant="outline" className="text-[10px] font-bold gap-1 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20">
                    <Layers className="w-3 h-3" />
                    {availableRoles.length} Available Master Roles
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={fetchDynamicRoles}
                    className="h-7 text-[11px] font-semibold gap-1 rounded-lg hover:bg-muted cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${loadingRoles ? 'animate-spin' : ''}`} /> Refresh
                  </Button>
                </div>
              </div>

              {/* Dynamic Roles & Responsibilities Grid */}
              {loadingRoles ? (
                <div className="p-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-primary" />
                  Loading roles &amp; responsibilities from Masters tab...
                </div>
              ) : filteredRoles.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground bg-muted/20 rounded-xl border border-border">
                  No roles &amp; responsibilities found. Add roles in Masters Hub under Roles &amp; Responsibility.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {filteredRoles.map((roleItem) => {
                    const isAssigned = assignedRoles.includes(roleItem.name);
                    const isFromMasters = roleItem.source === 'masters';

                    return (
                      <button
                        key={roleItem.name}
                        onClick={() => handleToggleRole(roleItem.name)}
                        className={`relative py-2.5 px-3 text-xs font-semibold rounded-xl border transition-all cursor-pointer select-none flex flex-col items-center justify-center gap-1 text-center truncate ${
                          isAssigned
                            ? 'bg-primary text-primary-foreground border-primary shadow-xs font-bold'
                            : isFromMasters
                            ? 'bg-indigo-500/5 text-foreground border-indigo-500/30 hover:bg-indigo-500/10 font-medium'
                            : 'bg-muted/30 text-muted-foreground border-border/70 hover:bg-muted hover:text-foreground font-medium'
                        }`}
                        title={
                          roleItem.description
                            ? `${roleItem.name}: ${roleItem.description}`
                            : isAssigned
                            ? `${roleItem.name} (Assigned)`
                            : `${roleItem.name} (Click to Assign)`
                        }
                      >
                        <div className="flex items-center gap-1.5 truncate max-w-full">
                          {isAssigned && <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-primary-foreground" />}
                          <span className="truncate">{roleItem.name}</span>
                        </div>
                        {isFromMasters && (
                          <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                            isAssigned ? 'bg-white/20 text-white' : 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400'
                          }`}>
                            Master Role
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
