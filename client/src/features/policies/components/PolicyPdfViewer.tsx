import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, ExternalLink, ZoomIn, ZoomOut, RotateCw, CheckCircle2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

interface PolicyPdfViewerProps {
  fileUrl: string;
  fileName?: string | null;
  fileSize?: number | null;
  title?: string;
  version?: string;
  height?: string;
  hideHeader?: boolean;
  isSigned?: boolean;
  signedByName?: string;
  signedAt?: string | Date;
  signatureProvider?: string;
}

export const PolicyPdfViewer: React.FC<PolicyPdfViewerProps> = ({
  fileUrl,
  fileName,
  fileSize,
  title,
  version = '1.0',
  height = 'h-[500px]',
  hideHeader = false,
  isSigned = false,
  signedByName,
  signedAt,
  signatureProvider,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [key, setKey] = useState<number>(0);

  const isValidUrl = Boolean(
    fileUrl &&
      typeof fileUrl === 'string' &&
      !fileUrl.startsWith('[') &&
      !fileUrl.startsWith('{') &&
      (fileUrl.startsWith('/uploads/') ||
        fileUrl.startsWith('http://') ||
        fileUrl.startsWith('https://') ||
        fileUrl.startsWith('data:') ||
        fileUrl.startsWith('blob:') ||
        /\.(pdf|png|jpg|jpeg|webp)$/i.test(fileUrl.split('?')[0]))
  );

  const absoluteUrl = fileUrl?.startsWith('/')
    ? `${window.location.protocol}//${window.location.host}${fileUrl}`
    : fileUrl;

  if (!isValidUrl) {
    return (
      <div className="p-8 text-center bg-card border border-border rounded-xl space-y-3 shadow-2xs">
        <FileText className="w-8 h-8 text-muted-foreground mx-auto opacity-70" />
        <h3 className="text-sm font-bold text-foreground">{title || 'Policy Document'}</h3>
        <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
          This policy document uses structured governance content. Please review the official policy text and section guidelines detailed above.
        </p>
      </div>
    );
  }

  const handleDownload = () => {
    if (!absoluteUrl) return;
    const a = document.createElement('a');
    a.href = absoluteUrl;
    a.download = fileName || `${title || 'Policy_Document'}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success('Downloading Policy Document PDF');
  };

  const isImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(absoluteUrl.split('?')[0]);

  return (
    <div className="border border-border rounded-xl bg-card overflow-hidden flex flex-col shadow-2xs">
      {!hideHeader && (
        <div className="px-4 py-3 bg-muted/30 border-b border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="truncate">
              <div className="font-bold text-foreground truncate flex items-center gap-2">
                {fileName || 'Policy Document.pdf'}
                <Badge variant="outline" className="text-[9px] font-mono uppercase font-bold">
                  v{version}
                </Badge>
                {isSigned && (
                  <Badge className="bg-emerald-600 text-white border-none font-bold text-[9px] gap-1 animate-pulse">
                    <CheckCircle2 className="w-3 h-3" /> VERIFIED SIGNATURE STAMP
                  </Badge>
                )}
              </div>
              {fileSize && (
                <span className="text-[10px] text-muted-foreground font-mono">
                  {(fileSize / 1024).toFixed(1)} KB
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setZoomLevel((prev) => Math.max(50, prev - 15))}
              className="h-7 w-7 p-0"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </Button>
            <span className="text-[11px] font-mono font-bold w-12 text-center select-none">
              {zoomLevel}%
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setZoomLevel((prev) => Math.min(200, prev + 15))}
              className="h-7 w-7 p-0"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setZoomLevel(100);
                setKey((k) => k + 1);
              }}
              className="h-7 w-7 p-0 ml-1"
              title="Reset View"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </Button>
            <a
              href={absoluteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 h-7 px-2 text-xs font-bold text-primary hover:underline ml-1"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Open Tab
            </a>
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleDownload}
              className="h-7 px-2.5 text-xs font-bold gap-1 bg-primary text-primary-foreground"
            >
              <Download className="w-3.5 h-3.5" /> Download
            </Button>
          </div>
        </div>
      )}

      {/* Signature Status Header Ribbon if Signed */}
      {isSigned && (
        <div className="bg-emerald-600 text-white px-4 py-2 text-xs font-bold flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-200" />
            <span>✓ OFFICIALLY DIGITALLY SIGNED & VERIFIED DOCUMENT</span>
          </div>
          <div className="text-[11px] opacity-90 font-mono">
            {signedByName ? `Signer: ${signedByName}` : 'Status: Signed & Acknowledged'}
            {signedAt ? ` | ${new Date(signedAt).toLocaleDateString()}` : ''}
          </div>
        </div>
      )}

      {/* PDF View Frame */}
      <div className={`relative w-full ${height} bg-slate-900/90 overflow-hidden flex items-center justify-center p-2`}>
        {/* Floating Digital Signature Seal Overlay */}
        {isSigned && (
          <div className="absolute top-4 right-6 z-20 pointer-events-none select-none">
            <div className="border-2 border-emerald-600 bg-emerald-950/90 text-emerald-300 p-2.5 rounded-xl shadow-2xl backdrop-blur-md max-w-[240px] space-y-1 transform rotate-[-2deg]">
              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-emerald-400 border-b border-emerald-600/50 pb-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>OFFICIAL SIGNATURE STAMP</span>
              </div>
              <div className="text-[10px] font-bold text-white truncate">
                {signedByName || 'Verified Signer'}
              </div>
              <div className="text-[9px] font-mono text-emerald-200">
                {signedAt ? new Date(signedAt).toLocaleString() : 'Signed & Executed'}
              </div>
              <div className="text-[8px] font-mono text-emerald-400/80 truncate">
                Provider: {signatureProvider || 'Direct Sign-off'}
              </div>
            </div>
          </div>
        )}

        {isImage ? (
          <div className="overflow-auto max-w-full max-h-full flex items-center justify-center">
            <img
              src={absoluteUrl}
              alt={title || 'Policy Attachment'}
              style={{ width: `${zoomLevel}%` }}
              className="object-contain rounded transition-all max-w-none"
            />
          </div>
        ) : (
          <div className="w-full h-full overflow-hidden relative rounded bg-white flex items-center justify-center">
            <iframe
              key={key}
              src={`${absoluteUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
              title={title || 'Policy Document Viewer'}
              style={{
                transform: zoomLevel !== 100 ? `scale(${zoomLevel / 100})` : 'none',
                transformOrigin: 'top center',
              }}
              className="w-full h-[calc(100%+44px)] -mt-[44px] border-0 transition-transform"
            />
          </div>
        )}
      </div>
    </div>
  );
};
