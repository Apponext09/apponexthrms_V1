import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { apiClient } from '@/config/api';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ShieldCheck, LogOut, FileText, CheckCircle2, Lock } from 'lucide-react';
import { toast } from 'sonner';

interface PolicySection {
  id: string;
  title: string;
  content: string;
}

interface UserPolicyData {
  policyId: number;
  roleCode: string;
  title: string;
  description: string;
  sections: PolicySection[];
  policyAccepted: boolean;
}

export const PolicyAcceptanceModal: React.FC = () => {
  const { user, isAuthenticated, acceptPolicy, logout } = useAuthStore();
  const [policyData, setPolicyData] = useState<UserPolicyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [hasAgreed, setHasAgreed] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user && !user.policyAccepted) {
      let isMounted = true;
      setLoading(true);
      apiClient
        .get('/auth/my-policies')
        .then((res) => {
          if (isMounted) {
            const data = res.data?.data || res.data;
            if (data) {
              setPolicyData(data);
              if (data.policyAccepted) {
                useAuthStore.getState().updateUser({ policyAccepted: true });
              }
            }
          }
        })
        .catch((err) => {
          console.error('[PolicyAcceptanceModal] Failed to fetch role policy:', err);
        })
        .finally(() => {
          if (isMounted) setLoading(false);
        });

      return () => {
        isMounted = false;
      };
    }
  }, [isAuthenticated, user?.id, user?.policyAccepted]);

  if (!isAuthenticated || !user || user.policyAccepted) {
    return null;
  }

  const handleAccept = async () => {
    if (!hasAgreed) return;
    try {
      setSubmitting(true);
      await acceptPolicy();
      toast.success('Role policy accepted successfully!', {
        description: 'You now have full access to your ApponextHRMS portal.',
      });
    } catch (err: any) {
      toast.error('Failed to record policy acceptance. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = () => {
    toast.error('Policy Declined', {
      description: 'You have been logged out because role policy agreement is mandatory for dashboard access.',
    });
    logout();
    window.location.href = '/login';
  };

  const formattedRoleName = (policyData?.roleCode || user.roles?.[0] || 'Employee')
    .replace(/_/g, ' ')
    .toUpperCase();

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-background rounded-2xl border border-border/80 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Formal HR Document Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-primary/15 via-primary/5 to-transparent border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-primary/20 text-primary border border-primary/30 flex items-center justify-center shrink-0 shadow-xs">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold tracking-tight text-foreground">Mandatory Policy Acceptance</h2>
                <span className="px-2.5 py-0.5 text-[10px] font-extrabold tracking-wider uppercase rounded-full bg-primary/20 text-primary border border-primary/30">
                  {formattedRoleName}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Formal HR & Operational Governance Document for <strong>{user.firstName} {user.lastName}</strong>
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 text-xs font-semibold">
            <Lock className="w-3.5 h-3.5 text-amber-600" />
            <span>Dashboard Protected</span>
          </div>
        </div>

        {/* Formal Document View Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-muted/10">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-3">
              <div className="h-9 w-9 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              <p className="text-xs font-medium text-muted-foreground">Retrieving formal policy agreement for your role...</p>
            </div>
          ) : (
            <>
              {/* Document Overview Banner */}
              <div className="p-4 rounded-xl bg-card border border-border shadow-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    {policyData?.title || 'Apponext HRMS Formal Role Policy Document'}
                  </h3>
                  <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded">
                    Official Document
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {policyData?.description || 'This document defines the formal duties, operational standards, data responsibilities, and professional conduct expected for your role in ApponextHRMS.'}
                </p>
              </div>

              {/* Policy Sections List */}
              <div className="space-y-4">
                {policyData?.sections && policyData.sections.length > 0 ? (
                  policyData.sections.map((sec, idx) => (
                    <div key={sec.id || idx} className="p-4 rounded-xl border border-border/70 bg-card hover:border-primary/30 transition-all space-y-2">
                      <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2 border-b border-border/50 pb-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        {sec.title}
                      </h4>
                      <p className="text-xs text-foreground/90 leading-relaxed pl-5 whitespace-pre-line">
                        {sec.content}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="p-4 rounded-xl border border-border bg-card space-y-2">
                    <h4 className="text-xs font-bold text-foreground">Standard Employee Governance & Code of Conduct</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      All team members must adhere to workplace ethics, data confidentiality, attendance policies, and asset security guidelines established by ApponextHRMS.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-background border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2.5 w-full sm:w-auto">
            <Checkbox
              id="mandatory-policy-agree-checkbox"
              checked={hasAgreed}
              onCheckedChange={(checked) => setHasAgreed(Boolean(checked))}
              className="h-4 w-4 rounded text-primary border-primary/50 focus:ring-primary shrink-0"
            />
            <label
              htmlFor="mandatory-policy-agree-checkbox"
              className="text-xs font-semibold text-foreground cursor-pointer select-none leading-tight"
            >
              I have read, understood, and agree to follow the above policies.
            </label>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReject}
              disabled={submitting}
              className="text-xs font-semibold text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/30 gap-1.5 h-9 px-4"
            >
              <LogOut className="w-3.5 h-3.5" /> Decline / Logout
            </Button>
            <Button
              size="sm"
              onClick={handleAccept}
              disabled={!hasAgreed || submitting || loading}
              className="text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 h-9 px-6 shadow-md transition-all disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <div className="h-3.5 w-3.5 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" /> Accept & Continue
                </>
              )}
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
};
