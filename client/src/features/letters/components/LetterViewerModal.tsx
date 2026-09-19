import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FileText, Printer, Send, Ban, CheckCircle2,
  Calendar, User, Building2, Download, Copy, Eye
} from 'lucide-react';
import { apiClient } from '@/config/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface LetterViewerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  letter: any;
  onUpdated?: () => void;
}

export const LetterViewerModal: React.FC<LetterViewerModalProps> = ({
  open,
  onOpenChange,
  letter,
  onUpdated,
}) => {
  const [isActionPending, setIsActionPending] = useState(false);

  if (!letter) return null;

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(letter.rendered_html);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }
  };

  const handleSend = async () => {
    try {
      setIsActionPending(true);
      await apiClient.post(`/letters/${letter.id}/send`);
      toast.success(`Letter Ref: ${letter.letter_code} sent successfully!`);
      if (onUpdated) onUpdated();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to dispatch letter');
    } finally {
      setIsActionPending(false);
    }
  };

  const handleRevoke = async () => {
    if (!await window.appConfirm(`Are you sure you want to revoke letter ${letter.letter_code}?`)) return;
    try {
      setIsActionPending(true);
      await apiClient.post(`/letters/${letter.id}/revoke`);
      toast.success(`Letter ${letter.letter_code} revoked`);
      if (onUpdated) onUpdated();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to revoke letter');
    } finally {
      setIsActionPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-6 rounded-3xl">
        <DialogHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-black px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {letter.letter_code}
                </span>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] font-bold uppercase",
                    letter.status === 'sent' && "bg-blue-50 text-blue-700 border-blue-200",
                    letter.status === 'draft' && "bg-amber-50 text-amber-700 border-amber-200",
                    letter.status === 'acknowledged' && "bg-emerald-50 text-emerald-700 border-emerald-200",
                    letter.status === 'revoked' && "bg-rose-50 text-rose-700 border-rose-200"
                  )}
                >
                  {letter.status}
                </Badge>
              </div>
              <DialogTitle className="text-base font-extrabold text-slate-900 dark:text-white mt-1">
                {letter.subject || letter.template_name || 'Official Letter'}
              </DialogTitle>
              <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-3">
                <span>Recipient: <strong>{letter.recipient_name}</strong> ({letter.recipient_email || 'No email'})</span>
                <span>•</span>
                <span>Type: <strong className="uppercase">{letter.letter_type?.replace(/_/g, ' ')}</strong></span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="h-8 text-xs font-bold rounded-xl flex items-center gap-1.5 border-slate-200"
              >
                <Printer className="w-3.5 h-3.5 text-indigo-600" />
                <span>Print / Save PDF</span>
              </Button>

              {letter.status === 'draft' && (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSend}
                  disabled={isActionPending}
                  className="h-8 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Letter</span>
                </Button>
              )}

              {letter.status !== 'revoked' && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRevoke}
                  disabled={isActionPending}
                  className="h-8 text-xs font-bold rounded-xl text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
                >
                  <Ban className="w-3.5 h-3.5 mr-1" />
                  <span>Revoke</span>
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Letterhead Iframe Container */}
        <div className="py-2">
          <iframe
            srcDoc={letter.rendered_html}
            title={letter.letter_code}
            className="w-full h-[580px] border border-slate-200 rounded-2xl shadow-inner bg-white"
          />
        </div>

        <DialogFooter className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            Generated on: {new Date(letter.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-8 px-4 text-xs font-semibold rounded-xl"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
