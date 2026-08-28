import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/features/auth/store/authStore';
import {
  Users,
  Calendar,
  Building2,
  Briefcase,
  MapPin,
  UserCheck,
  Clock,
  AlertCircle,
  Loader2,
  ArrowLeftRight,
  FileText,
} from 'lucide-react';
import { apiClient } from '@/config/api';
import { EmployeeLifecycleDetails, ChronologicalMilestoneEvent } from '@/features/hr/EmployeeLifecycle/api/lifecycleApi';
import { ChronologicalLifecycleFlow } from '@/features/hr/EmployeeLifecycle/components/ChronologicalLifecycleFlow';

const STAGE_CONFIG: Record<string, { label: string; color: string }> = {
  candidate: { label: 'Candidate', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
  onboarding: { label: 'Onboarding', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  probation: { label: 'Probation', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  active: { label: 'Active', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  notice: { label: 'Notice Period', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
  exit: { label: 'Exited', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
  alumni: { label: 'Alumni', color: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300' },
};

export function MyLifecyclePage() {
  const { user } = useAuthStore();
  const [details, setDetails] = useState<EmployeeLifecycleDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMyLifecycle = async () => {
      const empId = user?.employeeId ?? user?.employee_id;
      if (!empId) {
        setError('Employee profile not linked to your account.');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const res = await apiClient.get(`/hr/lifecycle/employees/${empId}`);
        setDetails(res.data?.data ?? null);
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Failed to load lifecycle data.');
      } finally {
        setLoading(false);
      }
    };

    fetchMyLifecycle();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !details) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <p className="text-muted-foreground text-sm">{error || 'No lifecycle data found.'}</p>
      </div>
    );
  }

  const { profile, onboarding, offboarding, transfers, lifecycleEvents, chronologicalMilestones } = details;
  const stageInfo = STAGE_CONFIG[profile.lifecycleStatus] ?? { label: profile.lifecycleStatus, color: 'bg-gray-100 text-gray-700' };

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Lifecycle</h1>
        <p className="text-muted-foreground text-sm mt-1">
          View your employment journey, milestones, and transitions.
        </p>
      </div>

      {/* Status Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <UserCheck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Current Status</p>
                <Badge className={`mt-1 ${stageInfo.color}`}>{stageInfo.label}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Calendar className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Joining Date</p>
                <p className="text-sm font-semibold mt-1">
                  {profile.joiningDate
                    ? new Date(profile.joiningDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                    : '—'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <ArrowLeftRight className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Transfers</p>
                <p className="text-sm font-semibold mt-1">{profile.transfersCount ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <Building2 className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Department</p>
                <p className="text-sm font-semibold mt-1 truncate max-w-[140px]">{profile.departmentName || '—'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Current Position Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Current Position</CardTitle>
          <CardDescription>Your current organizational assignment</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="flex items-center gap-3">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Company</p>
                <p className="text-sm font-medium">{profile.companyName || '—'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Designation</p>
                <p className="text-sm font-medium">{profile.designationName || '—'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Location</p>
                <p className="text-sm font-medium">{profile.locationName || '—'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Reporting Manager</p>
                <p className="text-sm font-medium">{profile.reportingManager || profile.reportingManagerName || '—'}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Chronological Lifecycle Flow */}
      {chronologicalMilestones && chronologicalMilestones.length > 0 && (
        <ChronologicalLifecycleFlow
          milestones={chronologicalMilestones}
          employeeName={profile.name || `${profile.firstName} ${profile.lastName}`}
          employeeCode={profile.employeeCode}
        />
      )}

      {/* Transfer History */}
      {transfers && transfers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ArrowLeftRight className="h-5 w-5" />
              Transfer History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {transfers.map((t) => (
                <div key={t.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">
                      {t.transferType}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(t.effectiveDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  <div className="grid gap-2 md:grid-cols-2 text-sm">
                    {t.fromDepartmentName !== t.toDepartmentName && (
                      <div>
                        <span className="text-muted-foreground">Department:</span>{' '}
                        {t.fromDepartmentName} → {t.toDepartmentName}
                      </div>
                    )}
                    {t.fromDesignationName !== t.toDesignationName && (
                      <div>
                        <span className="text-muted-foreground">Designation:</span>{' '}
                        {t.fromDesignationName} → {t.toDesignationName}
                      </div>
                    )}
                    {t.fromLocationName !== t.toLocationName && (
                      <div>
                        <span className="text-muted-foreground">Location:</span>{' '}
                        {t.fromLocationName} → {t.toLocationName}
                      </div>
                    )}
                    {t.fromManagerName !== t.toManagerName && (
                      <div>
                        <span className="text-muted-foreground">Manager:</span>{' '}
                        {t.fromManagerName} → {t.toManagerName}
                      </div>
                    )}
                  </div>
                  {t.transferReason && (
                    <p className="text-xs text-muted-foreground italic">{t.transferReason}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status Change History */}
      {lifecycleEvents && lifecycleEvents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Status History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {lifecycleEvents.map((evt) => {
                const fromInfo = STAGE_CONFIG[evt.fromStatus] ?? { label: evt.fromStatus, color: '' };
                const toInfo = STAGE_CONFIG[evt.toStatus] ?? { label: evt.toStatus, color: '' };
                return (
                  <div key={evt.id} className="flex items-center gap-3 text-sm">
                    <span className="text-xs text-muted-foreground w-24 shrink-0">
                      {new Date(evt.transitionDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                    <Badge variant="outline" className="text-xs">{fromInfo.label}</Badge>
                    <span className="text-muted-foreground">→</span>
                    <Badge className={`text-xs ${toInfo.color}`}>{toInfo.label}</Badge>
                    {evt.notes && <span className="text-xs text-muted-foreground ml-2">— {evt.notes}</span>}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Onboarding Summary */}
      {onboarding && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Onboarding Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 text-sm">
              <div><span className="text-muted-foreground">Onboarded By:</span> {onboarding.onboardedByName || '—'}</div>
              <div><span className="text-muted-foreground">Orientation:</span> {onboarding.orientationCompleted ? '✅ Completed' : '⏳ Pending'}</div>
              <div><span className="text-muted-foreground">Documents Verified:</span> {onboarding.documentsVerified ? '✅ Yes' : '⏳ Pending'}</div>
              <div><span className="text-muted-foreground">Welcome Kit:</span> {onboarding.welcomeKitIssued ? '✅ Issued' : '⏳ Pending'}</div>
              {onboarding.probationEndDate && (
                <div>
                  <span className="text-muted-foreground">Probation End:</span>{' '}
                  {new Date(onboarding.probationEndDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
