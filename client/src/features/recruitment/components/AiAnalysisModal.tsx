import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { 
  Sparkles, CheckCircle2, XCircle, AlertTriangle, FileText, Check, 
  Layers, Award, UserCheck, ExternalLink,
  Download, Copy, Mail, Phone, Briefcase, CheckCheck
} from 'lucide-react';

interface AiAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidateId: number | null;
  jobId: number | null;
  candidateName?: string;
  jobTitle?: string;
  initialTab?: 'analysis' | 'cv';
  onShortlistSuccess?: () => void;
}

export const AiAnalysisModal: React.FC<AiAnalysisModalProps> = ({
  isOpen,
  onClose,
  candidateId,
  jobId,
  candidateName,
  jobTitle,
  initialTab = 'analysis',
  onShortlistSuccess,
}) => {
  const [data, setData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isShortlisting, setIsShortlisting] = useState(false);
  const [activeTab, setActiveTab] = useState<'analysis' | 'cv'>(initialTab);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab || 'analysis');
    }
  }, [isOpen, initialTab]);

  useEffect(() => {
    if (isOpen && candidateId && jobId) {
      setIsLoading(true);
      apiClient.get(`/recruitment/candidates/${candidateId}/ai-analysis/${jobId}`)
        .then(res => {
          if (res.data?.success && res.data.data) {
            setData(res.data.data);
          }
        })
        .catch(err => {
          console.error('Failed to fetch candidate AI analysis', err);
          toast.error('Failed to load detailed AI analysis');
        })
        .finally(() => setIsLoading(false));
    } else {
      setData(null);
    }
  }, [isOpen, candidateId, jobId]);

  const handleShortlist = async () => {
    if (!candidateId || !jobId) return;
    setIsShortlisting(true);
    try {
      await apiClient.post(`/recruitment/jobs/${jobId}/ai-bulk-shortlist`, {
        candidateIds: [candidateId],
      });
      toast.success('Candidate shortlisted and moved to screening pipeline successfully!');
      if (onShortlistSuccess) onShortlistSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to shortlist candidate', err);
      toast.error(err?.response?.data?.message || 'Failed to shortlist candidate');
    } finally {
      setIsShortlisting(false);
    }
  };

  const analysis = data?.analysis;
  const atsBreakdown = analysis?.atsBreakdown;
  const settings = data?.settings;
  const candidate = data?.candidate;

  const atsScore = analysis?.atsScore ?? 0;
  const jdScore = analysis?.jdMatchScore ?? 0;
  const recommendation = analysis?.recommendation || 'REVIEW';
  const statusLabel = analysis?.statusLabel || 'Review Required';

  const getProgressColor = (score: number, threshold = 80) => {
    if (score >= threshold) return 'bg-emerald-500';
    if (score >= threshold - 15) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  const getResumeText = () => {
    if (candidate?.aiSummary) return candidate.aiSummary;
    if (candidate?.resumeUrl?.startsWith('data:text/plain')) {
      try {
        const encoded = candidate.resumeUrl.split(',')[1];
        return decodeURIComponent(encoded);
      } catch (e) {
        return '';
      }
    }
    return '';
  };

  const resumeText = getResumeText();
  const isPdf = candidate?.resumeUrl?.startsWith('data:application/pdf') || candidate?.resumeUrl?.endsWith('.pdf');

  const handleCopyResumeText = () => {
    const textToCopy = resumeText || `Candidate: ${candidate?.name}\nEmail: ${candidate?.email}\nPhone: ${candidate?.phone}\nSkills: ${candidate?.skills}\nExperience: ${candidate?.experience}\nCompany: ${candidate?.currentCompany}`;
    navigator.clipboard.writeText(textToCopy);
    setIsCopied(true);
    toast.success('Resume text copied to clipboard');
    setTimeout(() => setIsCopied(false), 2500);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-hidden p-0 border border-border shadow-2xl rounded-xl flex flex-col">
        {/* Header with gradient badge */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 border-b border-slate-800 shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  <Sparkles className="w-3.5 h-3.5" />
                  Recruitment AI ATS Screening
                </span>
                <span className={cn(
                  "px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider",
                  recommendation === 'SHORTLIST' ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40" :
                  recommendation === 'REVIEW' ? "bg-amber-500/20 text-amber-300 border border-amber-500/40" :
                  "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                )}>
                  {statusLabel}
                </span>
              </div>
              <h2 className="text-xl font-bold tracking-tight text-white pt-1">
                {candidate?.name || candidateName || 'Candidate Profile'}
              </h2>
              <p className="text-xs text-slate-300">
                Target Opening: <span className="font-semibold text-indigo-200">{data?.job?.jobTitle || jobTitle || 'Job Opening'}</span>
              </p>
            </div>

            {candidate?.resumeUrl && (
              <a
                href={candidate.resumeUrl}
                download={`${(candidate.name || 'candidate').replace(/\s+/g, '_')}_Resume`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-white/10 hover:bg-white/20 text-white transition-colors shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                Download CV
                <ExternalLink className="w-3 h-3 opacity-70" />
              </a>
            )}
          </div>

          {/* Top Tabs Switcher */}
          <div className="flex items-center gap-2 mt-4 border-b border-white/10 pb-2">
            <button
              onClick={() => setActiveTab('analysis')}
              className={cn(
                "px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5",
                activeTab === 'analysis'
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
              )}
            >
              <Layers className="w-3.5 h-3.5" />
              AI ATS & JD Breakdown
            </button>

            <button
              onClick={() => setActiveTab('cv')}
              className={cn(
                "px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5",
                activeTab === 'cv'
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                  : "bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
              )}
            >
              <FileText className="w-3.5 h-3.5" />
              View Uploaded CV / Resume Document
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="overflow-y-auto p-6 flex-1">
          {isLoading ? (
            <div className="p-16 text-center text-slate-500 space-y-3">
              <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm font-medium">Loading candidate details and screening breakdown...</p>
            </div>
          ) : activeTab === 'analysis' ? (
            /* TAB 1: AI ANALYSIS & BREAKDOWN */
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-indigo-950 dark:text-indigo-200">ATS Readiness Score</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Structure, Readability & Keywords</p>
                    <p className="text-xs text-muted-foreground mt-2 font-mono">
                      Min Threshold: <span className="text-indigo-600 dark:text-indigo-400 font-bold">{settings?.atsThreshold || 85}%</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <div className={cn(
                      "text-3xl font-extrabold font-mono tracking-tight",
                      atsScore >= (settings?.atsThreshold || 85) ? "text-emerald-600" :
                      atsScore >= (settings?.atsThreshold || 85) - 15 ? "text-amber-600" : "text-rose-600"
                    )}>
                      {atsScore}%
                    </div>
                    <span className="text-[10px] font-semibold text-muted-foreground">
                      {atsScore >= (settings?.atsThreshold || 85) ? '✓ Meets ATS Threshold' : '✕ Below ATS Threshold'}
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-purple-950 dark:text-purple-200">JD Match Score</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Skills, Experience & Requirements Fit</p>
                    <p className="text-xs text-muted-foreground mt-2 font-mono">
                      Min Threshold: <span className="text-purple-600 dark:text-purple-400 font-bold">{settings?.jdMatchThreshold || 80}%</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <div className={cn(
                      "text-3xl font-extrabold font-mono tracking-tight",
                      jdScore >= (settings?.jdMatchThreshold || 80) ? "text-emerald-600" :
                      jdScore >= (settings?.jdMatchThreshold || 80) - 15 ? "text-amber-600" : "text-rose-600"
                    )}>
                      {jdScore}%
                    </div>
                    <span className="text-[10px] font-semibold text-muted-foreground">
                      {jdScore >= (settings?.jdMatchThreshold || 80) ? '✓ Meets JD Match Rule' : '✕ Below JD Match'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    ATS Sub-Factor Breakdown
                  </h3>
                  <span className="text-xs text-muted-foreground">Standardized 100-Point Scoring</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Keyword Alignment (40%)</span>
                      <span className="font-bold text-foreground">{atsBreakdown?.keywordScore ?? 0}%</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                      <div
                        className={cn("h-2 rounded-full transition-all", getProgressColor(atsBreakdown?.keywordScore ?? 0))}
                        style={{ width: `${atsBreakdown?.keywordScore ?? 0}%` }}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Skills Alignment (35%)</span>
                      <span className="font-bold text-foreground">{atsBreakdown?.skillScore ?? 0}%</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                      <div
                        className={cn("h-2 rounded-full transition-all", getProgressColor(atsBreakdown?.skillScore ?? 0))}
                        style={{ width: `${atsBreakdown?.skillScore ?? 0}%` }}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Experience Alignment (10%)</span>
                      <span className="font-bold text-foreground">{atsBreakdown?.experienceScore ?? 0}%</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                      <div
                        className={cn("h-2 rounded-full transition-all", getProgressColor(atsBreakdown?.experienceScore ?? 0))}
                        style={{ width: `${atsBreakdown?.experienceScore ?? 0}%` }}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Resume Structure & Sections (10%)</span>
                      <span className="font-bold text-foreground">{atsBreakdown?.structureScore ?? 0}%</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                      <div
                        className={cn("h-2 rounded-full transition-all", getProgressColor(atsBreakdown?.structureScore ?? 0))}
                        style={{ width: `${atsBreakdown?.structureScore ?? 0}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Detected Sections in Document:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(atsBreakdown?.sections || {}).map(([sec, found]) => (
                      <span
                        key={sec}
                        className={cn(
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border",
                          found
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                            : "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400"
                        )}
                      >
                        {found ? <Check className="w-3 h-3 text-emerald-600" /> : <XCircle className="w-3 h-3 text-slate-400" />}
                        <span className="capitalize">{sec}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3.5 rounded-lg border border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20 dark:border-emerald-900 space-y-2">
                  <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Matched Skills & Keywords ({atsBreakdown?.matchedKeywords?.length || 0})
                  </p>
                  {atsBreakdown?.matchedKeywords?.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {atsBreakdown.matchedKeywords.map((k: string, i: number) => (
                        <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 rounded text-xs font-medium">
                          ✓ {k}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">No matching keywords detected</p>
                  )}
                </div>

                <div className="p-3.5 rounded-lg border border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-900 space-y-2">
                  <p className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    Missing Job Requirements ({atsBreakdown?.missingKeywords?.length || 0})
                  </p>
                  {atsBreakdown?.missingKeywords?.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {atsBreakdown.missingKeywords.map((k: string, i: number) => (
                        <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200 rounded text-xs font-medium">
                          • {k}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-emerald-600 font-medium">All required JD keywords matched! 🎉</p>
                  )}
                </div>
              </div>

              <div className="p-4 rounded-lg border border-border bg-slate-50 dark:bg-slate-900/50 space-y-2.5">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-indigo-600" />
                  HR Screening Rule Evaluation & Verdict:
                </h4>
                <ul className="space-y-1.5 text-xs text-foreground">
                  {analysis?.reasons?.map((reason: string, idx: number) => {
                    const isPass = reason.includes('above') || reason.includes('matched') || reason.includes('meets');
                    return (
                      <li key={idx} className="flex items-start gap-2">
                        {isPass ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                        )}
                        <span>{reason}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          ) : (
            /* TAB 2: FULL UPLOADED CV / RESUME DOCUMENT PREVIEW */
            <div className="space-y-5">
              <div className="p-4 rounded-lg bg-card border border-border grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-primary shrink-0" />
                  <span className="truncate text-foreground font-medium">{candidate?.email || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-foreground">{candidate?.phone || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-foreground">{candidate?.currentCompany || 'Fresher'} ({candidate?.experience || '0'} yrs)</span>
                </div>
              </div>

              {candidate?.skills && (
                <div className="space-y-1.5">
                  <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">Extracted Skills:</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {candidate.skills.split(',').map((skill: string, i: number) => (
                      <span key={i} className="px-2 py-0.5 rounded text-xs bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-medium">
                        {skill.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-primary" />
                    Uploaded Resume Content / Document:
                  </h4>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCopyResumeText}
                      className="h-7 px-2.5 text-xs flex items-center gap-1"
                    >
                      {isCopied ? <CheckCheck className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      {isCopied ? 'Copied' : 'Copy Text'}
                    </Button>
                    {candidate?.resumeUrl && (
                      <a
                        href={candidate.resumeUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-input bg-background hover:bg-accent text-xs font-medium text-foreground transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Open
                      </a>
                    )}
                  </div>
                </div>

                {isPdf && candidate?.resumeUrl ? (
                  <div className="rounded-lg border border-border overflow-hidden bg-slate-900 shadow-inner">
                    <iframe
                      src={candidate.resumeUrl}
                      className="w-full h-[520px] rounded-lg"
                      title="Candidate Resume PDF Preview"
                    />
                  </div>
                ) : (
                  <div className="p-4 rounded-lg bg-slate-900 text-slate-100 font-mono text-xs leading-relaxed max-h-[500px] overflow-y-auto whitespace-pre-wrap select-text border border-slate-800 shadow-inner">
                    {resumeText ? (
                      resumeText
                    ) : (
                      <div className="text-center py-10 space-y-2 text-slate-400">
                        <FileText className="w-8 h-8 mx-auto opacity-50" />
                        <p className="font-semibold text-slate-300">Candidate Profile Record</p>
                        <p className="text-[11px]">
                          This candidate record was created via direct entry or structured spreadsheet. All extracted information is available above and evaluated by the AI screening engine.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-border bg-slate-50 dark:bg-slate-900 flex items-center justify-between shrink-0">
          <div className="text-xs text-muted-foreground">
            Mode: <strong className="text-foreground">{settings?.shortlistingMode || 'ATS + JD Match'}</strong>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose} className="h-9 text-xs">
              Close
            </Button>
            <Button
              onClick={handleShortlist}
              disabled={isShortlisting || isLoading}
              className="h-9 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
            >
              <UserCheck className="w-3.5 h-3.5 mr-1.5" />
              {isShortlisting ? 'Shortlisting...' : 'Shortlist Candidate to Pipeline'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
