import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, ExternalLink, RefreshCw, ZoomIn, ZoomOut, Mail, GraduationCap } from 'lucide-react';
import { getApiBaseUrl } from '@/config/api';

interface ResumeViewerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resumeUrl?: string | null;
  candidateName?: string;
  candidateEmail?: string;
  qualification?: string;
}

export const ResumeViewerModal: React.FC<ResumeViewerModalProps> = ({
  open,
  onOpenChange,
  resumeUrl,
  candidateName = 'Candidate Resume',
  candidateEmail,
  qualification,
}) => {
  const [zoom, setZoom] = useState(100);
  const [iframeKey, setIframeKey] = useState(0);

  if (!open) return null;

  // Resolve full viewable URL
  const resolveViewUrl = (rawUrl?: string | null): string => {
    if (!rawUrl || typeof rawUrl !== 'string') return '';
    if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://') || rawUrl.startsWith('data:')) {
      return rawUrl;
    }
    const cleanPath = rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`;
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
    return `${baseUrl}${cleanPath}`;
  };

  const fullUrl = resolveViewUrl(resumeUrl);
  const isImage = Boolean(fullUrl.match(/\.(jpg|jpeg|png|webp|gif|svg)(\?.*)?$/i));

  const handleDownload = () => {
    if (!fullUrl) return;
    const a = document.createElement('a');
    a.href = fullUrl;
    a.download = `${candidateName.replace(/[^a-zA-Z0-9]/g, '_')}_Resume`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleOpenNewTab = () => {
    if (!fullUrl) return;
    window.open(fullUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] w-[95vw] max-h-[92vh] flex flex-col p-0 overflow-hidden bg-background border-border shadow-2xl rounded-xl">
        {/* Header */}
        <DialogHeader className="p-4 bg-muted/40 border-b border-border flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-950/50 rounded-lg text-purple-600 dark:text-purple-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                {candidateName}
                <Badge variant="outline" className="text-[10px] bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 border-purple-200">
                  Resume Document
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground flex items-center gap-3 mt-0.5">
                {candidateEmail && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-3 h-3" /> {candidateEmail}
                  </span>
                )}
                {qualification && (
                  <span className="flex items-center gap-1">
                    <GraduationCap className="w-3 h-3" /> {qualification}
                  </span>
                )}
              </DialogDescription>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pr-6">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setZoom(prev => Math.max(50, prev - 15))}
              className="h-8 w-8 p-0"
              title="Zoom Out"
              disabled={!fullUrl}
            >
              <ZoomOut className="w-3.5 h-3.5 text-muted-foreground" />
            </Button>
            <span className="text-[11px] font-semibold text-muted-foreground w-8 text-center">{zoom}%</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setZoom(prev => Math.min(175, prev + 15))}
              className="h-8 w-8 p-0"
              title="Zoom In"
              disabled={!fullUrl}
            >
              <ZoomIn className="w-3.5 h-3.5 text-muted-foreground" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIframeKey(k => k + 1)}
              className="h-8 w-8 p-0"
              title="Reload Viewer"
              disabled={!fullUrl}
            >
              <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleOpenNewTab}
              className="h-8 text-xs gap-1.5 px-2.5 font-medium"
              disabled={!fullUrl}
            >
              <ExternalLink className="w-3.5 h-3.5" /> Open Tab
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleDownload}
              className="h-8 text-xs gap-1.5 px-3 bg-purple-600 hover:bg-purple-700 text-white font-bold"
              disabled={!fullUrl}
            >
              <Download className="w-3.5 h-3.5" /> Save Copy
            </Button>
          </div>
        </DialogHeader>

        {/* Viewer Body */}
        <div className="flex-1 bg-slate-900/5 dark:bg-slate-950 p-3 overflow-auto flex items-center justify-center min-h-[550px] relative">
          {!fullUrl ? (
            <div className="text-center py-16 px-4 space-y-3">
              <FileText className="w-12 h-12 text-muted-foreground/40 mx-auto" />
              <h4 className="text-sm font-semibold text-foreground">No Resume Document Available</h4>
              <p className="text-xs text-muted-foreground max-w-sm">
                No uploaded resume file path was found for this candidate profile. You can upload a new resume in Candidate Management or Resume Bank.
              </p>
            </div>
          ) : isImage ? (
            <div className="w-full h-full flex items-center justify-center overflow-auto p-2">
              <img
                src={fullUrl}
                alt={`${candidateName} Resume`}
                style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
                className="max-w-full rounded-md shadow-lg transition-transform duration-200 object-contain"
              />
            </div>
          ) : (
            <div className="w-full h-[70vh] relative rounded-md overflow-hidden bg-white shadow-inner">
              <iframe
                key={iframeKey}
                src={`${fullUrl}#toolbar=1&navpanes=0&view=FitH`}
                title={`${candidateName} Resume Preview`}
                style={{ zoom: `${zoom}%` }}
                className="w-full h-full border-0 rounded-md"
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
