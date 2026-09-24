import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ShieldCheck, LogOut, Lock, CheckCircle2, ChevronDown, FileText, AlertCircle, Sparkles, Paperclip, Download } from 'lucide-react';
import { toast } from 'sonner';
import { PolicyPdfViewer } from '@/features/policies/components/PolicyPdfViewer';
import { PolicySignaturePad } from '@/features/policies/components/PolicySignaturePad';
import { policiesApi } from '@/features/policies/api/policiesApi';

export const PolicyAcceptanceModal: React.FC = () => {
  const { user, isAuthenticated, pendingPolicies, acceptPendingPolicy, fetchPendingPolicies, logout } = useAuthStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [hasAgreed, setHasAgreed] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [signatureType, setSignatureType] = useState<'drawn' | 'typed' | 'uploaded'>('drawn');
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Re-fetch pending policies when component mounts or user becomes authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchPendingPolicies();
    }
  }, [isAuthenticated, user?.id]);

  const currentPolicy = pendingPolicies && pendingPolicies.length > 0 ? pendingPolicies[currentIndex] || pendingPolicies[0] : null;

  const hasValidPdfUrl = Boolean(
    currentPolicy?.fileUrl &&
      typeof currentPolicy.fileUrl === 'string' &&
      !currentPolicy.fileUrl.startsWith('[') &&
      !currentPolicy.fileUrl.startsWith('{') &&
      (currentPolicy.fileUrl.startsWith('/uploads/') ||
        currentPolicy.fileUrl.startsWith('http://') ||
        currentPolicy.fileUrl.startsWith('https://') ||
        currentPolicy.fileUrl.startsWith('data:') ||
        currentPolicy.fileUrl.startsWith('blob:') ||
        /\.(pdf|png|jpg|jpeg|webp)$/i.test(currentPolicy.fileUrl.split('?')[0]))
  );

  // Reset scroll, signature, and checkbox state whenever current policy changes
  useEffect(() => {
    setHasScrolledToBottom(false);
    setHasAgreed(false);
    setSignatureData(null);

    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }

    // Check if policy has valid PDF URL or content fits inside container
    const timer = setTimeout(() => {
      if (hasValidPdfUrl) {
        setHasScrolledToBottom(true);
      } else if (scrollContainerRef.current) {
        const { clientHeight, scrollHeight } = scrollContainerRef.current;
        if (scrollHeight <= clientHeight + 15) {
          setHasScrolledToBottom(true);
        }
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [currentPolicy?.id, currentIndex, hasValidPdfUrl]);

  if (!isAuthenticated || !user || !pendingPolicies || pendingPolicies.length === 0 || !currentPolicy) {
    return null;
  }

  const totalPolicies = pendingPolicies.length;
  const policyNumber = Math.min(currentIndex + 1, totalPolicies);

  // Handle Scroll Event to detect reaching the bottom
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (hasValidPdfUrl) {
      if (!hasScrolledToBottom) setHasScrolledToBottom(true);
      return;
    }
    const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
    if (Math.ceil(scrollTop + clientHeight) >= scrollHeight - 12) {
      if (!hasScrolledToBottom) {
        setHasScrolledToBottom(true);
      }
    }
  };

  const handleAccept = async () => {
    if (!hasScrolledToBottom && !hasValidPdfUrl) {
      toast.error('Please scroll to the very bottom of the policy content before accepting.');
      return;
    }

    if (!hasAgreed) {
      toast.error('Please confirm that you have read and understood the policy.');
      return;
    }

    try {
      setSubmitting(true);
      await acceptPendingPolicy(currentPolicy.id);
      toast.success(`Policy accepted (${policyNumber} of ${totalPolicies})`, {
        description: `${currentPolicy.title} has been acknowledged.`,
      });

      // If there are more policies, reset for the next policy
      if (currentIndex >= pendingPolicies.length - 1) {
        setCurrentIndex(0);
      }
    } catch (err: any) {
      toast.error('Failed to record policy acceptance. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDecline = () => {
    toast.error('Policy Declined', {
      description: 'You have been logged out because mandatory policy acceptance is required to access ApponextHRMS.',
    });
    logout();
    window.location.href = '/login';
  };

  // Format sections if string or object
  let sections: Array<{ id?: string; title: string; content: string }> = [];
  const rawSectionsSource = currentPolicy.sections || (typeof currentPolicy.fileUrl === 'string' && currentPolicy.fileUrl.startsWith('[') ? currentPolicy.fileUrl : null);
  if (rawSectionsSource) {
    let raw: any = rawSectionsSource;
    try {
      while (typeof raw === 'string') {
        raw = JSON.parse(raw);
      }
      if (Array.isArray(raw)) {
        sections = raw;
      }
    } catch {
      sections = [];
    }
  }

  const roleName = (user.roles?.[0] || 'Employee').replace(/_/g, ' ').toUpperCase();

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-3 sm:p-6 animate-in fade-in duration-200 select-none">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 shadow-2xl rounded-2xl overflow-hidden flex flex-col max-h-[94vh]">
        
        {/* Top Header Banner */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/20 text-primary border border-primary/30 flex items-center justify-center shrink-0 shadow-inner">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100 tracking-tight">Policy Acknowledgement Required</h2>
              </div>
              <p className="text-xs text-slate-400">
                Logged in as <strong>{user.firstName || 'User'} {user.lastName || ''}</strong> ({roleName})
              </p>
            </div>
          </div>

          {/* Sequential Step Progress Badge */}
          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between sm:justify-end">
            <div className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary border border-primary/30 text-xs font-extrabold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span>Policy {policyNumber} of {totalPolicies}</span>
            </div>
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[11px] font-semibold">
              <Lock className="w-3.5 h-3.5" />
              <span>Access Locked</span>
            </div>
          </div>
        </div>

        {/* Step Progress Dots for Multi-Policy */}
        {totalPolicies > 1 && (
          <div className="px-6 py-2 bg-slate-950/70 border-b border-slate-800/80 flex items-center gap-2 overflow-x-auto">
            {pendingPolicies.map((p, idx) => {
              const isCurrent = idx === currentIndex;
              return (
                <div
                  key={p.id || idx}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold border transition-all ${
                    isCurrent
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-slate-800/50 text-slate-400 border-slate-700/50'
                  }`}
                >
                  <span>{idx + 1}.</span>
                  <span className="truncate max-w-[120px]">{p.title}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Policy Document Title Header Bar */}
        <div className="px-6 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs font-semibold text-slate-300">
          <div className="flex items-center gap-2 truncate">
            <span className="font-mono text-primary font-bold bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
              POL-{String(currentPolicy.id).padStart(3, '0')}
            </span>
            <span className="font-bold text-slate-100 truncate">{currentPolicy.title}</span>
            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-mono border border-slate-700">
              v{currentPolicy.version || '1.0'}
            </span>
          </div>
          <span className="text-[11px] text-slate-400 shrink-0 font-medium">
            Category: <strong className="text-slate-200">{currentPolicy.category || 'General'}</strong>
          </span>
        </div>

        {/* Scrollable Main Policy Content Container & Signature Verification */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-950/60 max-h-[calc(94vh-160px)] space-y-6 scroll-smooth border-b border-slate-800"
        >
          <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 shadow-xl rounded-xl p-6 sm:p-8 max-w-3xl mx-auto space-y-6 font-sans">
            
            {/* Document Header Title */}
            <div className="text-center space-y-2 border-b-2 border-slate-900 dark:border-slate-100 pb-5">
              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 tracking-widest uppercase">
                ApponextHRMS Mandatory Policy Document
              </p>
              <h1 className="text-xl sm:text-2xl font-black tracking-wide uppercase text-slate-900 dark:text-slate-100 leading-tight">
                {currentPolicy.title}
              </h1>
            </div>

            {/* Metadata Summary Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-100 dark:bg-slate-800/60 rounded-lg text-[11px] font-medium border border-slate-200 dark:border-slate-700/60">
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-bold">Document ID</span>
                <span className="text-slate-900 dark:text-slate-100 font-bold">POL-{String(currentPolicy.id).padStart(3, '0')}</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-bold">Policy Version</span>
                <span className="text-slate-900 dark:text-slate-100 font-bold">v{currentPolicy.version || '1.0'}</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-bold">Category</span>
                <span className="text-slate-900 dark:text-slate-100 font-bold">{currentPolicy.category || 'HR Policies'}</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-bold">Effective Date</span>
                <span className="text-slate-900 dark:text-slate-100 font-bold">
                  {currentPolicy.createdAt ? new Date(currentPolicy.createdAt).toLocaleDateString() : 'Immediate'}
                </span>
              </div>
            </div>

            {/* Policy Description Summary */}
            {currentPolicy.description && (
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-l-4 border-primary rounded-r-lg text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                <strong className="block text-[11px] uppercase font-bold text-primary mb-1">Policy Objective & Overview</strong>
                {currentPolicy.description}
              </div>
            )}

            {/* Content Sections / Uploaded PDF Source of Truth */}
            <div className="space-y-6 pt-2">
              {hasValidPdfUrl ? (
                <PolicyPdfViewer
                  fileUrl={currentPolicy.fileUrl}
                  fileName={currentPolicy.fileName}
                  fileSize={currentPolicy.fileSize}
                  title={currentPolicy.title}
                  version={currentPolicy.version}
                  height="h-[480px]"
                  hideHeader={true}
                />
              ) : sections && sections.length > 0 ? (
                sections.map((sec, idx) => (
                  <div key={sec.id || idx} className="space-y-2">
                    <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-1">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      {sec.title}
                    </h3>
                    <div className="text-xs sm:text-xs leading-relaxed text-slate-700 dark:text-slate-300 space-y-1.5 pl-5">
                      {sec.content ? (
                        sec.content.split('\n').map((line, lineIdx) => {
                          const trimmed = line.trim();
                          if (trimmed.startsWith('•') || trimmed.startsWith('-')) {
                            return (
                              <p key={lineIdx} className="pl-3 font-medium text-slate-800 dark:text-slate-200">
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
                <div className="space-y-4 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                  <p>
                    This document defines mandatory compliance requirements, operational guidelines, and ethical standards applicable to your assigned role in ApponextHRMS.
                  </p>
                  <p>
                    All personnel are required to review the complete terms outlined in this policy document and maintain full compliance with organization governance protocols.
                  </p>
                </div>
              )}
            </div>

            {/* Supporting Attachments Section if present (filtering out duplicate main document) */}
            {(() => {
              const extraAttachments = (currentPolicy.attachments || []).filter((att: any) => {
                if (att.isMainDocument) return false;
                if (att.fileName && currentPolicy.fileName && att.fileName === currentPolicy.fileName) return false;
                if (att.storagePath && currentPolicy.fileUrl && att.storagePath === currentPolicy.fileUrl) return false;
                return true;
              });
              if (extraAttachments.length === 0) return null;
              return (
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <Paperclip className="w-4 h-4 text-primary" /> Supporting Attachments & Documents ({extraAttachments.length})
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {extraAttachments.map((att: any, attIdx: number) => {
                      const downloadUrl = att.id
                        ? policiesApi.getAttachmentDownloadUrl(currentPolicy.id, att.id)
                        : att.storagePath;
                      return (
                        <div key={att.id || attIdx} className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between gap-2">
                          <div className="truncate">
                            <span className="font-bold text-slate-800 dark:text-slate-200 truncate block text-xs">{att.fileName}</span>
                            <span className="text-[10px] text-slate-500 uppercase font-mono">{att.fileType ? att.fileType.split('/')[1] || att.fileType : 'File'}</span>
                          </div>
                          <a
                            href={downloadUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-primary bg-primary/10 rounded-md hover:bg-primary/20 shrink-0 border border-primary/20"
                          >
                            <Download className="w-3 h-3" /> Download
                          </a>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* End of Document Footer Notice */}
            <div className="border-t border-slate-300 dark:border-slate-700 pt-4 flex items-center justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400">
              <span className="truncate max-w-[280px]">{currentPolicy.title}</span>
              <span>*** END OF POLICY DOCUMENT ***</span>
            </div>

          </div>

          {/* Verification & Signature Section */}
          <div className="max-w-3xl mx-auto space-y-4">
            {!hasScrolledToBottom ? (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs text-amber-300 animate-pulse">
                <div className="flex items-center gap-2 font-medium">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Please scroll through the entire policy to the bottom to unlock acceptance.</span>
                </div>
                <div className="flex items-center gap-1 text-[11px] font-bold text-amber-400">
                  <span>Continue scrolling</span>
                  <ChevronDown className="w-4 h-4 animate-bounce" />
                </div>
              </div>
            ) : (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>✓ You have reached the end of this policy.</span>
                  </div>

                  {/* Accept Checkbox */}
                  <div className="flex items-center space-x-2.5">
                    <Checkbox
                      id="accept-policy-checkbox"
                      checked={hasAgreed}
                      onCheckedChange={(checked) => setHasAgreed(Boolean(checked))}
                      className="h-4 w-4 rounded text-primary border-emerald-500/60 focus:ring-primary shrink-0 bg-slate-900"
                    />
                    <label
                      htmlFor="accept-policy-checkbox"
                      className="text-xs font-bold text-slate-100 cursor-pointer select-none leading-tight"
                    >
                      I have read and understood this policy.
                    </label>
                  </div>
                </div>

                {/* Digital Signature Pad Component (Draw, Type, Upload Signature) */}
                <PolicySignaturePad
                  onSignatureChange={(data, type) => {
                    setSignatureData(data);
                    setSignatureType(type);
                  }}
                  defaultSignerName={`${user.firstName || ''} ${user.lastName || ''}`.trim()}
                />
              </div>
            )}
          </div>
        </div>

        {/* Fixed Bottom Action Controls Bar */}
        <div className="px-6 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-4 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDecline}
            disabled={submitting}
            className="text-xs font-semibold text-rose-400 border-rose-900/50 bg-rose-950/20 hover:bg-rose-950/50 gap-1.5 h-9 px-4 shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" /> Decline & Logout
          </Button>

          <Button
            size="sm"
            onClick={handleAccept}
            disabled={!hasScrolledToBottom || !hasAgreed || submitting}
            className="text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground gap-2 h-9 px-6 shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            {submitting ? (
              <>
                <div className="h-3.5 w-3.5 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
                Recording Acceptance...
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" /> Accept Policy {totalPolicies > 1 ? `(${policyNumber}/${totalPolicies})` : ''}
              </>
            )}
          </Button>
        </div>

      </div>
    </div>
  );
};
