import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PolicyPdfViewer } from './PolicyPdfViewer';
import { Shield, ArrowLeft } from 'lucide-react';

interface PolicyPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileUrl: string;
  fileName?: string | null;
  fileSize?: number | null;
  title: string;
  documentRef?: string;
  version?: string;
}

export const PolicyPdfModal: React.FC<PolicyPdfModalProps> = ({
  isOpen,
  onClose,
  fileUrl,
  fileName,
  fileSize,
  title,
  documentRef,
  version = '1.0',
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl w-[94vw] max-h-[92vh] flex flex-col p-0 overflow-hidden bg-card text-foreground border-border rounded-2xl z-[100001]">
        <DialogHeader className="px-6 py-4 border-b border-border flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 text-xs font-bold gap-1.5 text-muted-foreground hover:text-foreground shrink-0 -ml-2"
              title="Back"
            >
              <ArrowLeft className="w-4 h-4 text-primary" /> Back
            </Button>
            <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                  {documentRef || 'POL-DOC'}
                </span>
                <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase">
                  Version {version}
                </span>
              </div>
              <DialogTitle className="text-base font-extrabold text-foreground tracking-tight">
                {title}
              </DialogTitle>
            </div>
          </div>
        </DialogHeader>

        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-muted/10">
          <PolicyPdfViewer
            fileUrl={fileUrl}
            fileName={fileName}
            fileSize={fileSize}
            title={title}
            version={version}
            height="h-[70vh]"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
