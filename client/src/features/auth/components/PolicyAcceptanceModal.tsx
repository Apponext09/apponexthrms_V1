import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { apiClient } from '@/config/api';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ShieldCheck, LogOut, Lock } from 'lucide-react';
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
  sections: PolicySection[] | string;
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
      toast.success('Policy accepted successfully!', {
        description: 'Welcome to ApponextHRMS portal.',
      });
    } catch (err: any) {
      toast.error('Failed to accept policy. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = () => {
    toast.error('Policy Declined', {
      description: 'You have been logged out because role policy acceptance is mandatory.',
    });
    logout();
    window.location.href = '/login';
  };

  const formattedRoleBadge = (policyData?.roleCode || user.roles?.[0] || 'Employee')
    .replace(/_/g, ' ')
    .toUpperCase();

  // Safely parse sections array even if received as stringified JSON
  let normalizedSections: PolicySection[] = [];
  if (policyData?.sections) {
    let raw: any = policyData.sections;
    try {
      while (typeof raw === 'string') {
        raw = JSON.parse(raw);
      }
      if (Array.isArray(raw)) {
        normalizedSections = raw;
      }
    } catch {
      normalizedSections = [];
    }
  }

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 shadow-2xl rounded-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Top Bar Banner */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/20 text-primary border border-primary/30 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-100">Mandatory Policy Acceptance</h2>
                <span className="px-2.5 py-0.5 text-[10px] font-extrabold tracking-wider uppercase rounded-full bg-primary/20 text-primary border border-primary/30">
                  {formattedRoleBadge}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Official HR Document for <strong>{user.firstName || 'User'} {user.lastName || ''}</strong>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-semibold">
            <Lock className="w-3.5 h-3.5" />
            <span>Dashboard Protected</span>
          </div>
        </div>

        {/* Scrollable Formal Paper Document View */}
        <div className="p-4 sm:p-8 overflow-y-auto flex-1 bg-slate-950/50">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-3">
              <div className="h-9 w-9 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              <p className="text-xs font-medium text-slate-400">Loading role policy document...</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 shadow-xl rounded-xl p-6 sm:p-10 max-w-3xl mx-auto space-y-6 font-sans">
              
              {/* Document Header Title */}
              <div className="text-center space-y-2 border-b-2 border-slate-900 dark:border-slate-100 pb-5">
                <h1 className="text-xl sm:text-2xl font-black tracking-wider uppercase text-slate-900 dark:text-slate-100">
                  {policyData?.title || 'HUMAN RESOURCE POLICY'}
                </h1>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wide uppercase">
                  ApponextHRMS Official Role-Wise Governance Policy
                </p>
              </div>

              {/* Policy Document Sections */}
              <div className="space-y-6 pt-2">
                {normalizedSections.length > 0 ? (
                  normalizedSections.map((sec, idx) => (
                    <div key={sec.id || idx} className="space-y-2">
                      <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                        {sec.title}
                      </h3>
                      <div className="text-xs sm:text-xs leading-relaxed text-slate-700 dark:text-slate-300 space-y-1.5 pl-1">
                        {sec.content ? (
                          sec.content.split('\n').map((line, lineIdx) => {
                            const trimmed = line.trim();
                            if (trimmed.startsWith('•')) {
                              return (
                                <p key={lineIdx} className="pl-4 font-normal leading-relaxed text-slate-700 dark:text-slate-300">
                                  {line}
                                </p>
                              );
                            }
                            return (
                              <p key={lineIdx} className="leading-relaxed font-normal">
                                {line}
                              </p>
                            );
                          })
                        ) : null}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 space-y-2">
                    <p className="text-xs text-slate-500">Standard employee governance document.</p>
                  </div>
                )}
              </div>

              {/* Document Footer Bar */}
              <div className="border-t border-slate-300 dark:border-slate-700 pt-4 flex items-center justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400">
                <span className="truncate max-w-[250px]">{policyData?.title || 'Human Resource Policy'}</span>
                <span>Page 1 of 1</span>
              </div>

            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2.5 w-full sm:w-auto">
            <Checkbox
              id="accept-policy-check"
              checked={hasAgreed}
              onCheckedChange={(checked) => setHasAgreed(Boolean(checked))}
              className="h-4 w-4 rounded text-primary border-slate-600 focus:ring-primary shrink-0"
            />
            <label
              htmlFor="accept-policy-check"
              className="text-xs font-semibold text-slate-200 cursor-pointer select-none leading-tight"
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
              className="text-xs font-semibold text-rose-400 border-rose-900/50 bg-rose-950/20 hover:bg-rose-950/40 gap-1.5 h-9 px-4"
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
