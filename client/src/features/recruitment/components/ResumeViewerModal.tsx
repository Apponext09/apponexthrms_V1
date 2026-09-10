import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FileText, Download, ExternalLink, RefreshCw, ZoomIn, ZoomOut, Mail,
  GraduationCap, Phone, Briefcase, Building, Sparkles, CheckCircle2,
  User, FileCode, AlertCircle
} from 'lucide-react';
import { getApiBaseUrl } from '@/config/api';

export interface CandidateResumeData {
  id?: number | string;
  name?: string;
  candidateName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  candidateEmail?: string;
  contact?: string;
  phone?: string;
  candidatePhone?: string;
  trackerId?: string;
  tracker_id?: string;
  position?: string;
  jobTitle?: string;
  job_title?: string;
  experience?: string | number;
  candidateExperience?: string | number;
  qualification?: string;
  candidateQualification?: string;
  university?: string;
  candidateUniversity?: string;
  company?: string;
  candidateCompany?: string;
  skills?: string | string[];
  candidateSkills?: string | string[];
  matchedSkills?: string[];
  missingSkills?: string[];
  resumeText?: string;
  resume_text?: string;
  resumeUrl?: string | null;
  resumeFileUrl?: string | null;
  candidateResumeUrl?: string | null;
  status?: string;
  atsScore?: number | null;
}

interface ResumeViewerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidate?: CandidateResumeData | null;
  // Legacy props compatibility
  resumeUrl?: string | null;
  candidateName?: string;
  candidateEmail?: string;
  qualification?: string;
}

export const resolveResumeUrl = (rawUrl?: string | null): string => {
  if (!rawUrl || typeof rawUrl !== 'string' || rawUrl === '#' || rawUrl === 'null' || rawUrl === 'undefined' || rawUrl.trim() === '') {
    return '';
  }

  // Already a complete URL or Base64 / Blob
  if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://') || rawUrl.startsWith('data:') || rawUrl.startsWith('blob:')) {
    return rawUrl;
  }

  let clean = rawUrl.trim();
  if (clean.startsWith('./')) clean = clean.substring(2);
  if (!clean.startsWith('/')) clean = `/${clean}`;

  // If path doesn't start with /uploads, normalize it
  if (!clean.startsWith('/uploads')) {
    if (clean.startsWith('/resumes/')) {
      clean = `/uploads${clean}`;
    } else {
      clean = `/uploads/resumes${clean}`;
    }
  }

  let baseUrl = 'http://localhost:5000';
  try {
    if (typeof getApiBaseUrl === 'function') {
      baseUrl = getApiBaseUrl();
    } else {
      const rawApiUrl = (import.meta as any).env.VITE_API_URL || `http://${window.location.hostname}:5000/api/v1`;
      baseUrl = rawApiUrl.replace('/api/v1', '');
    }
  } catch {
    const rawApiUrl = (import.meta as any).env.VITE_API_URL || `http://${window.location.hostname}:5000/api/v1`;
    baseUrl = rawApiUrl.replace('/api/v1', '');
  }

  return `${baseUrl}${clean}`;
};

export const ResumeViewerModal: React.FC<ResumeViewerModalProps> = ({
  open,
  onOpenChange,
  candidate,
  resumeUrl: directResumeUrl,
  candidateName: directCandidateName,
  candidateEmail: directCandidateEmail,
  qualification: directQualification,
}) => {
  const [zoom, setZoom] = useState(100);
  const [iframeKey, setIframeKey] = useState(0);
  const [activeTab, setActiveTab] = useState<'document' | 'profile'>('document');
  const [iframeLoadError, setIframeLoadError] = useState(false);

  // Extract resolved candidate fields
  const name = candidate?.name || candidate?.candidateName || (candidate?.firstName ? `${candidate.firstName} ${candidate.lastName || ''}`.trim() : '') || directCandidateName || 'Candidate';
  const email = candidate?.email || candidate?.candidateEmail || directCandidateEmail || '';
  const phone = candidate?.contact || candidate?.phone || candidate?.candidatePhone || '';
  const trackerId = candidate?.trackerId || candidate?.tracker_id || '';
  const position = candidate?.position || candidate?.jobTitle || candidate?.job_title || 'Applicant';
  const experience = candidate?.experience || candidate?.candidateExperience || '';
  const qual = candidate?.qualification || candidate?.candidateQualification || directQualification || '';
  const university = candidate?.university || candidate?.candidateUniversity || '';
  const company = candidate?.company || candidate?.candidateCompany || '';
  const rawResumeUrl = candidate?.resumeUrl || candidate?.resumeFileUrl || candidate?.candidateResumeUrl || directResumeUrl || null;
  const fullUrl = resolveResumeUrl(rawResumeUrl);
  const status = candidate?.status || 'Applied';
  const atsScore = candidate?.atsScore;

  // Skills resolution
  const rawSkills = candidate?.skills || candidate?.candidateSkills;
  const skillsList: string[] = Array.isArray(rawSkills)
    ? rawSkills
    : typeof rawSkills === 'string'
    ? rawSkills.split(',').map(s => s.trim()).filter(Boolean)
    : [];

  const resumeText = candidate?.resumeText || candidate?.resume_text;

  const isImage = Boolean(fullUrl && fullUrl.match(/\.(jpg|jpeg|png|webp|gif|svg)(\?.*)?$/i));
  const isDocx = Boolean(fullUrl && fullUrl.match(/\.(docx|doc)(\?.*)?$/i));

  // Reset tab and error when modal opens
  useEffect(() => {
    if (open) {
      setIframeLoadError(false);
      setZoom(100);
      setIframeKey(prev => prev + 1);
      // If no valid file URL or if it's a docx file (which browsers can't iframe), default to profile tab
      if (!fullUrl || isDocx) {
        setActiveTab('profile');
      } else {
        setActiveTab('document');
      }
    }
  }, [open, fullUrl, isDocx]);

  const handleDownload = () => {
    if (fullUrl) {
      const a = document.createElement('a');
      a.href = fullUrl;
      a.download = `${name.replace(/[^a-zA-Z0-9]/g, '_')}_Resume`;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      window.print();
    }
  };

  const handleOpenNewTab = () => {
    if (fullUrl) {
      window.open(fullUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[960px] w-[96vw] max-h-[94vh] flex flex-col p-0 overflow-hidden bg-background border-border shadow-2xl rounded-2xl">
        
        {/* Modal Top Header */}
        <DialogHeader className="p-4 bg-muted/40 border-b border-border flex flex-row items-center justify-between space-y-0 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-purple-600/10 dark:bg-purple-950/60 border border-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2 truncate">
                <span className="truncate">{name}</span>
                {trackerId && trackerId !== '-' && (
                  <Badge variant="outline" className="text-[10px] font-mono font-bold bg-primary/5 text-primary border-primary/20 shrink-0">
                    {trackerId}
                  </Badge>
                )}
                {atsScore !== null && atsScore !== undefined && (
                  <Badge className={`${
                    atsScore >= 80 ? 'bg-emerald-600' : (atsScore >= 60 ? 'bg-amber-600' : 'bg-rose-600')
                  } text-white font-black text-[10px] px-2 py-0.5 shrink-0`}>
                    {atsScore}% ATS Match
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground flex items-center gap-3 mt-0.5 truncate">
                <span className="font-semibold text-foreground/80">{position}</span>
                {email && (
                  <span className="flex items-center gap-1 truncate">
                    <Mail className="w-3 h-3 text-muted-foreground/70" /> {email}
                  </span>
                )}
                {phone && phone !== '-' && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3 text-muted-foreground/70" /> {phone}
                  </span>
                )}
              </DialogDescription>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-1.5 pr-8 shrink-0">
            {activeTab === 'document' && fullUrl && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setZoom(prev => Math.max(50, prev - 15))}
                  className="h-8 w-8 p-0 rounded-lg"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5 text-muted-foreground" />
                </Button>
                <span className="text-[11px] font-mono font-semibold text-muted-foreground w-9 text-center">{zoom}%</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setZoom(prev => Math.min(175, prev + 15))}
                  className="h-8 w-8 p-0 rounded-lg"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5 text-muted-foreground" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => { setIframeLoadError(false); setIframeKey(k => k + 1); }}
                  className="h-8 w-8 p-0 rounded-lg"
                  title="Reload Viewer"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleOpenNewTab}
                  className="h-8 text-xs gap-1.5 px-2.5 font-medium rounded-lg"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Open Tab
                </Button>
              </>
            )}

            <Button
              type="button"
              size="sm"
              onClick={handleDownload}
              className="h-8 text-xs gap-1.5 px-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg shadow-xs"
            >
              <Download className="w-3.5 h-3.5" /> {fullUrl ? 'Download CV' : 'Print / Save PDF'}
            </Button>
          </div>
        </DialogHeader>

        {/* Tab Selector Bar */}
        <div className="bg-muted/20 border-b border-border px-4 py-1.5 flex items-center justify-between shrink-0">
          <div className="flex gap-2">
            <Button
              variant={activeTab === 'document' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('document')}
              className={`h-7 px-3 text-xs font-bold rounded-lg gap-1.5 transition-all ${
                activeTab === 'document' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <FileText className="w-3.5 h-3.5" /> Document Preview {fullUrl ? '📄' : ''}
            </Button>
            <Button
              variant={activeTab === 'profile' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('profile')}
              className={`h-7 px-3 text-xs font-bold rounded-lg gap-1.5 transition-all ${
                activeTab === 'profile' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <User className="w-3.5 h-3.5" /> Structured CV Profile
            </Button>
          </div>

          <div className="text-[11px] text-muted-foreground font-medium flex items-center gap-2">
            {experience && <span>Exp: <strong className="text-foreground">{experience}</strong></span>}
            {company && company !== '-' && <span>Company: <strong className="text-foreground">{company}</strong></span>}
          </div>
        </div>

        {/* Modal Main Content */}
        <div className="flex-1 bg-slate-900/5 dark:bg-slate-950/50 p-4 overflow-y-auto min-h-[520px] max-h-[72vh]">
          {activeTab === 'document' ? (
            /* ═══════ TAB 1: DOCUMENT PREVIEW ═══════ */
            !fullUrl ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-12 px-4 space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <FileText className="w-7 h-7" />
                </div>
                <div className="space-y-1 max-w-md">
                  <h4 className="text-sm font-bold text-foreground">No Uploaded PDF File Found</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    This candidate record was created via manual entry or candidate text profile. You can view the full formatted curriculum vitae in the <strong>Structured CV Profile</strong> tab.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => setActiveTab('profile')}
                  className="bg-primary text-primary-foreground text-xs font-bold rounded-xl"
                >
                  <User className="w-3.5 h-3.5 mr-1.5" /> View Structured CV Profile →
                </Button>
              </div>
            ) : isDocx ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-12 px-4 space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <FileCode className="w-7 h-7" />
                </div>
                <div className="space-y-1 max-w-md">
                  <h4 className="text-sm font-bold text-foreground">Microsoft Word Document (.docx)</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Word documents cannot be previewed natively in an iframe. You can download the original file or view the candidate profile directly.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleDownload}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl"
                  >
                    <Download className="w-3.5 h-3.5 mr-1.5" /> Download .DOCX File
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setActiveTab('profile')}
                    className="text-xs font-bold rounded-xl"
                  >
                    View Structured Profile →
                  </Button>
                </div>
              </div>
            ) : isImage ? (
              <div className="w-full h-full flex items-center justify-center overflow-auto p-4">
                <img
                  src={fullUrl}
                  alt={`${name} Resume`}
                  style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
                  className="max-w-full rounded-xl shadow-lg transition-transform duration-200 object-contain border border-border"
                />
              </div>
            ) : (
              <div className="w-full h-[65vh] relative rounded-xl overflow-hidden bg-white shadow-md border border-border">
                {iframeLoadError ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3 bg-slate-50 text-slate-800">
                    <AlertCircle className="w-10 h-10 text-amber-500" />
                    <h4 className="text-sm font-bold">Document Preview Blocked or Unavailable</h4>
                    <p className="text-xs text-slate-500 max-w-md">
                      The document couldn't be loaded directly in the iframe. You can open it in a new window or switch to the structured profile tab.
                    </p>
                    <div className="flex gap-2 pt-2">
                      <Button size="sm" onClick={handleOpenNewTab} className="text-xs font-bold">
                        <ExternalLink className="w-3.5 h-3.5 mr-1" /> Open in New Tab
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setActiveTab('profile')} className="text-xs font-bold">
                        View Structured Profile
                      </Button>
                    </div>
                  </div>
                ) : (
                  <iframe
                    key={iframeKey}
                    src={`${fullUrl}#toolbar=1&navpanes=0&view=FitH`}
                    title={`${name} Resume Preview`}
                    style={{ zoom: `${zoom}%` }}
                    onError={() => setIframeLoadError(true)}
                    className="w-full h-full border-0 rounded-xl"
                  />
                )}
              </div>
            )
          ) : (
            /* ═══════ TAB 2: STRUCTURED DIGITAL CV PROFILE ═══════ */
            <div className="max-w-3xl mx-auto bg-card border border-border rounded-2xl shadow-xl overflow-hidden animate-in fade-in duration-200">
              {/* CV Header Banner */}
              <div className="bg-gradient-to-r from-purple-700 via-indigo-700 to-blue-700 p-6 text-white">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center text-2xl font-black text-white shadow-inner shrink-0">
                      {name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h2 className="text-xl font-black tracking-tight">{name}</h2>
                      <p className="text-purple-100 text-xs font-semibold mt-0.5">{position}</p>
                      {trackerId && trackerId !== '-' && (
                        <span className="inline-block mt-1 text-[10px] font-mono bg-white/10 px-2 py-0.5 rounded-md border border-white/15">
                          ID: {trackerId}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col sm:items-end gap-1 text-xs text-purple-100">
                    {email && <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> {email}</span>}
                    {phone && phone !== '-' && <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> {phone}</span>}
                  </div>
                </div>
              </div>

              {/* CV Body */}
              <div className="p-6 space-y-6">
                {/* Highlights Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Total Experience', value: experience ? String(experience) : 'Not specified', icon: <Briefcase className="w-4 h-4 text-blue-500" /> },
                    { label: 'Current Company', value: company && company !== '-' ? company : 'Confidential', icon: <Building className="w-4 h-4 text-purple-500" /> },
                    { label: 'Qualification', value: qual && qual !== '-' ? qual : 'Graduate', icon: <GraduationCap className="w-4 h-4 text-emerald-500" /> },
                    { label: 'Candidate Status', value: status || 'Applied', icon: <CheckCircle2 className="w-4 h-4 text-amber-500" /> },
                  ].map((item, i) => (
                    <div key={i} className="bg-muted/40 border border-border/80 p-3 rounded-xl">
                      <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] font-bold uppercase tracking-wider mb-1">
                        {item.icon} {item.label}
                      </div>
                      <div className="text-xs font-bold text-foreground truncate">{item.value}</div>
                    </div>
                  ))}
                </div>

                {/* Skills Section */}
                {skillsList.length > 0 && (
                  <div className="space-y-2.5">
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-purple-500" /> Technical & Professional Skills ({skillsList.length})
                    </h3>
                    <div className="flex flex-wrap gap-1.5 p-3.5 bg-muted/20 border border-border/70 rounded-xl">
                      {skillsList.map((skill, i) => (
                        <Badge
                          key={i}
                          className="bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-800 text-xs px-2.5 py-1 font-bold rounded-lg shadow-2xs"
                        >
                          ✓ {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* University / Academic Information */}
                {university && university !== '-' && (
                  <div className="space-y-1.5 bg-muted/20 border border-border/70 p-4 rounded-xl">
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5 text-emerald-500" /> Education & University
                    </h3>
                    <p className="text-xs text-muted-foreground font-medium">{university} — <span className="text-foreground font-semibold">{qual || 'Degree'}</span></p>
                  </div>
                )}

                {/* Extracted Resume Text / Summary */}
                {resumeText && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-blue-500" /> Extracted Resume Summary
                    </h3>
                    <div className="p-4 bg-muted/30 border border-border/80 rounded-xl text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto font-sans">
                      {resumeText}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
