import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck,
  AlertCircle,
  Loader2,
  LogOut,
  ChevronDown,
  Lock,
  FileText,
  Check,
} from 'lucide-react';
import { useAuthStore } from '@/features/auth/store/authStore';
import { usePendingPolicies, useAcceptPolicy } from '../api/usePolicies';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

export function PolicyAcceptancePage() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { data: pendingPolicies = [], isLoading, refetch } = usePendingPolicies();
  const acceptPolicyMutation = useAcceptPolicy();

  // Scroll to bottom tracker state
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [isAgreed, setIsAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activePolicyIndex, setActivePolicyIndex] = useState(0);

  // Blob URL cache for PDF clean rendering
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string>('');

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomMarkerRef = useRef<HTMLDivElement>(null);

  const totalPending = pendingPolicies.length;
  const currentPolicy = pendingPolicies[activePolicyIndex] || pendingPolicies[0];

  // Derive human-readable primary role label
  const primaryRoleCode = (user?.roles?.[0] || 'employee').toLowerCase();
  const formatRoleLabel = (code: string) => {
    switch (code) {
      case 'organization_admin':
      case 'org_admin':
      case 'admin':
        return 'ORGANIZATION ADMIN';
      case 'super_admin':
        return 'SUPER ADMIN';
      case 'department_head':
      case 'manager':
        return 'DEPARTMENT MANAGER';
      case 'team_lead':
        return 'TEAM LEAD';
      case 'hr_admin':
      case 'hr':
        return 'HR ADMIN';
      case 'hr_manager':
      case 'support':
        return 'HR MANAGER';
      case 'intern':
        return 'INTERN';
      case 'consultant':
        return 'CONSULTANT';
      default:
        return 'EMPLOYEE';
    }
  };

  // Determine user destination dashboard after acceptance
  const getDestinationDashboard = () => {
    const roles = user?.roles || [];
    if (roles.includes('super_admin')) {
      return '/superadmin/dashboard';
    } else if (
      roles.includes('organization_admin') ||
      roles.includes('ceo') ||
      roles.includes('hr_admin') ||
      roles.includes('hr')
    ) {
      return '/dashboard';
    } else if (roles.includes('support') || roles.includes('hr_manager')) {
      return '/hr/dashboard';
    } else if (roles.includes('department_head') || roles.includes('manager')) {
      return '/manager/dashboard';
    } else if (roles.includes('team_lead')) {
      return '/team-lead/dashboard';
    } else if (roles.includes('intern')) {
      return '/intern/dashboard';
    } else if (roles.includes('consultant')) {
      return '/consultant/dashboard';
    } else {
      return '/employee/dashboard';
    }
  };

  // Generate clean PDF Blob URL with toolbar=0
  useEffect(() => {
    if (!currentPolicy?.fileUrl) {
      setPdfBlobUrl('');
      return;
    }

    const fileUrl = currentPolicy.fileUrl;
    if (fileUrl.startsWith('data:application/pdf;base64,')) {
      try {
        const base64Data = fileUrl.split(',')[1];
        const binaryStr = window.atob(base64Data);
        const len = binaryStr.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const blobUrl = URL.createObjectURL(blob) + '#toolbar=0&navpanes=0&scrollbar=1&view=FitH';
        setPdfBlobUrl(blobUrl);
        return () => {
          URL.revokeObjectURL(blobUrl);
        };
      } catch (e) {
        setPdfBlobUrl(fileUrl + '#toolbar=0&navpanes=0&scrollbar=1&view=FitH');
      }
    } else {
      setPdfBlobUrl(fileUrl.includes('#') ? fileUrl : `${fileUrl}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`);
    }
  }, [currentPolicy]);

  // Check scroll position
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollTop + clientHeight >= scrollHeight - 35) {
      setHasScrolledToBottom(true);
    }
  };

  // Reset scroll and check content fit when policy changes
  useEffect(() => {
    setHasScrolledToBottom(false);
    setIsAgreed(false);

    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }

    const checkFit = () => {
      if (!scrollContainerRef.current) return;
      const { scrollHeight, clientHeight } = scrollContainerRef.current;
      if (scrollHeight <= clientHeight + 25) {
        setHasScrolledToBottom(true);
      }
    };

    checkFit();
    const timer = setTimeout(checkFit, 250);
    return () => clearTimeout(timer);
  }, [pendingPolicies, activePolicyIndex]);

  // IntersectionObserver on bottom marker for scroll detection
  useEffect(() => {
    const marker = bottomMarkerRef.current;
    if (!marker) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setHasScrolledToBottom(true);
        }
      },
      {
        root: scrollContainerRef.current,
        threshold: 0.1,
      }
    );

    observer.observe(marker);
    return () => observer.disconnect();
  }, [pendingPolicies, activePolicyIndex]);

  const handleAcceptAndContinue = async () => {
    if (!hasScrolledToBottom) {
      toast.error('Please scroll to the bottom of the document first.');
      return;
    }
    if (!isAgreed) {
      toast.error('Please check the agreement box before continuing.');
      return;
    }

    setSubmitting(true);
    try {
      for (const policy of pendingPolicies) {
        await acceptPolicyMutation.mutateAsync(policy.id);
      }

      toast.success('All mandatory policies acknowledged successfully!');
      await refetch();

      const targetDashboard = getDestinationDashboard();
      navigate(targetDashboard);
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit acceptance. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 text-slate-800 p-4">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
        <p className="text-sm font-medium text-slate-500">Loading compliance policies...</p>
      </div>
    );
  }

  if (totalPending === 0) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 text-slate-800 p-4 text-center">
        <div className="size-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4 ring-8 ring-emerald-50">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-1">Compliance Verified</h2>
        <p className="text-sm text-slate-500 max-w-sm mb-6">
          All mandatory organizational policies have been acknowledged for your account.
        </p>
        <Button
          onClick={() => navigate(getDestinationDashboard())}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-6 h-10 rounded-xl gap-2 shadow-md shadow-blue-500/20 cursor-pointer"
        >
          Proceed to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen h-full w-full bg-slate-100/80 flex items-center justify-center p-3 sm:p-6 md:p-8 overflow-y-auto font-sans antialiased text-slate-900">
      {/* Modal Container */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="max-w-4xl w-full bg-white border border-slate-200/90 rounded-2xl shadow-xl overflow-hidden flex flex-col my-auto relative"
      >
        {/* Header Bar */}
        <div className="px-6 py-4.5 border-b border-slate-200 flex items-center justify-between gap-4 bg-slate-50/70">
          <div className="flex items-center gap-3.5">
            <div className="size-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200 flex-shrink-0 shadow-2xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  Mandatory Policy Acceptance
                </h1>
                <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] sm:text-[11px] font-bold px-2.5 py-0.5 rounded-md tracking-wide uppercase shadow-2xs">
                  {formatRoleLabel(primaryRoleCode)}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Official HR Document for <span className="text-slate-700 font-semibold">{user?.email?.split('@')[0] || formatRoleLabel(primaryRoleCode)}</span>
              </p>
            </div>
          </div>

          {/* Right Protected Badge */}
          <div className="bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5 flex-shrink-0 shadow-2xs">
            <Lock className="w-3.5 h-3.5 text-amber-600" />
            <span className="hidden sm:inline">Dashboard Protected</span>
          </div>
        </div>

        {/* Multiple Policies Tab Pills (if more than 1 pending) */}
        {totalPending > 1 && (
          <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center gap-2 overflow-x-auto">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap mr-1">
              Policies ({totalPending}):
            </span>
            {pendingPolicies.map((p, idx) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setActivePolicyIndex(idx);
                }}
                className={`text-xs font-bold px-3 py-1 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                  activePolicyIndex === idx
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {idx + 1}. {p.title} (v{p.version})
              </button>
            ))}
          </div>
        )}

        {/* Document Content Area - Showing ONLY the uploaded document */}
        <div className="p-4 sm:p-6 bg-slate-50/40 flex flex-col items-center">
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="w-full bg-white text-slate-900 rounded-xl shadow-sm overflow-y-auto max-h-[58vh] sm:max-h-[62vh] border border-slate-200/90 relative"
          >
            {/* Real Document View Only (No Company Headers, No Page Footers) */}
            {currentPolicy?.fileUrl ? (
              currentPolicy.fileUrl.startsWith('data:application/pdf') || currentPolicy.fileUrl.endsWith('.pdf') ? (
                <div className="w-full h-[580px] bg-slate-50 relative overflow-hidden rounded-xl">
                  {/* Clipped iframe to hide any browser native PDF toolbar */}
                  <iframe
                    src={pdfBlobUrl || currentPolicy.fileUrl}
                    title={currentPolicy?.title || 'Policy Document'}
                    className="w-full h-[620px] border-0 -mt-10"
                  />
                </div>
              ) : currentPolicy.fileUrl.startsWith('data:image/') || /\.(jpg|jpeg|png|webp)$/i.test(currentPolicy.fileUrl) ? (
                <div className="w-full p-4 bg-slate-50 flex justify-center">
                  <img
                    src={currentPolicy.fileUrl}
                    alt={currentPolicy.title}
                    className="max-h-[600px] object-contain rounded-lg shadow-2xs"
                  />
                </div>
              ) : (
                <div className="p-6 text-slate-800 text-xs sm:text-sm leading-relaxed whitespace-pre-line">
                  {currentPolicy.description}
                </div>
              )
            ) : (
              <div className="p-6 text-slate-800 text-xs sm:text-sm leading-relaxed whitespace-pre-line">
                {currentPolicy?.description || 'No document file attached.'}
              </div>
            )}

            {/* Bottom Marker for Scroll Intersection */}
            <div ref={bottomMarkerRef} className="h-2 w-full mt-2" />
          </div>

          {/* Scroll Down Prompt (visible until user reaches bottom) */}
          {!hasScrolledToBottom && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-2.5 flex items-center gap-1.5 text-xs text-amber-600 font-bold bg-amber-50 border border-amber-200 px-3 py-1 rounded-full shadow-2xs animate-pulse"
            >
              <ChevronDown className="w-4 h-4" /> Scroll to the bottom of the document to unlock agreement
            </motion.div>
          )}
        </div>

        {/* Bottom Acceptance Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Checkbox Section: ONLY visible when scrolled to bottom */}
          <div className="w-full sm:w-auto flex-1">
            <AnimatePresence>
              {hasScrolledToBottom ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => setIsAgreed(!isAgreed)}
                  className="flex items-center gap-3 select-none cursor-pointer"
                >
                  <Checkbox
                    id="policy-agree-checkbox"
                    checked={isAgreed}
                    onCheckedChange={(val) => setIsAgreed(Boolean(val))}
                    onClick={(e) => e.stopPropagation()}
                    className="size-4 border-slate-400 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 cursor-pointer ring-offset-2 ring-blue-500/20"
                  />
                  <label
                    htmlFor="policy-agree-checkbox"
                    className="text-xs font-bold text-slate-900 cursor-pointer hover:text-blue-600 transition-colors"
                  >
                    I have read, understood, and accept the above policies.
                  </label>
                </motion.div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>Please scroll down through the document to enable acknowledgement.</span>
                </div>
              )}
            </AnimatePresence>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={handleLogout}
              className="border-slate-300 text-slate-700 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-300 text-xs font-bold rounded-lg px-4 h-9 gap-1.5 transition-colors cursor-pointer shadow-2xs"
            >
              <LogOut className="w-3.5 h-3.5" /> Decline / Logout
            </Button>

            <Button
              type="button"
              disabled={!hasScrolledToBottom || !isAgreed || submitting}
              onClick={handleAcceptAndContinue}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg px-5 h-9 gap-1.5 shadow-sm shadow-blue-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Recording...
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5 stroke-[3]" /> Accept & Continue
                </>
              )}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
