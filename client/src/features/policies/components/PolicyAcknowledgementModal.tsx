import React, { useState } from 'react';
import type { RolePolicyRecord } from '../types/policy';
import { Button } from '@/components/ui/button';
import { PolicySignaturePad } from './PolicySignaturePad';
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  X,
  Lock,
} from 'lucide-react';
import { toast } from 'sonner';

interface PolicyAcknowledgementModalProps {
  policy: RolePolicyRecord;
  onConfirm: (policyId: number, comments?: string) => Promise<void>;
  onClose: () => void;
}

export const PolicyAcknowledgementModal: React.FC<PolicyAcknowledgementModalProps> = ({
  policy,
  onConfirm,
  onClose,
}) => {
  const [readConfirmed, setReadConfirmed] = useState(false);
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!readConfirmed || !termsAgreed) {
      toast.error('Mandatory Checkboxes Required', {
        description: 'Please confirm that you have read the policy and agree to its terms.',
      });
      return;
    }

    try {
      setSubmitting(true);
      await onConfirm(policy.id, comments);
      toast.success('Policy Digital Sign-Off Confirmed', {
        description: `Your acknowledgement for ${policy.documentRef || 'Policy'} (${policy.version || 'v1.0'}) has been recorded.`,
      });
      onClose();
    } catch (err) {
      toast.error('Failed to submit policy sign-off.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-card text-foreground border border-border rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Digital Policy Acknowledgement</h3>
              <p className="text-[11px] text-muted-foreground font-mono">
                {policy.documentRef || 'POL-000'} • {policy.version || 'v1.0'}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7 text-muted-foreground">
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-3.5 rounded-xl bg-muted/20 border border-border/80 space-y-1">
            <div className="text-xs font-bold text-foreground leading-tight">{policy.title}</div>
            <p className="text-[11px] text-muted-foreground line-clamp-2">
              {policy.description || 'Formal governance document defining operational responsibilities and workplace ethics.'}
            </p>
          </div>

          <div className="space-y-3 pt-1">
            <label className="flex items-start gap-2.5 cursor-pointer text-xs font-medium select-none">
              <input
                type="checkbox"
                checked={readConfirmed}
                onChange={(e) => setReadConfirmed(e.target.checked)}
                className="mt-0.5 rounded border-input text-primary focus:ring-primary h-4 w-4 shrink-0"
              />
              <span className="text-foreground leading-relaxed">
                I hereby declare that I have carefully read and understood all sections of this policy document.
              </span>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer text-xs font-medium select-none">
              <input
                type="checkbox"
                checked={termsAgreed}
                onChange={(e) => setTermsAgreed(e.target.checked)}
                className="mt-0.5 rounded border-input text-primary focus:ring-primary h-4 w-4 shrink-0"
              />
              <span className="text-foreground leading-relaxed">
                I agree to adhere to all terms, operational responsibilities, and workplace rules specified in this policy version ({policy.version || 'v1.0'}).
              </span>
            </label>
          </div>

          {/* Signature Input (Draw, Type, Upload Signature) */}
          <PolicySignaturePad
            onSignatureChange={(data) => setSignatureData(data)}
          />

          <div className="space-y-1 pt-1">
            <label className="block text-xs font-bold text-foreground">Optional Employee Remarks / Comments</label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Add any questions or acknowledgment remarks for HR records..."
              rows={2}
              className="w-full rounded-md border border-input bg-background p-2.5 text-xs font-normal focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center gap-2 text-[11px] text-amber-600 font-medium">
            <Lock className="w-4 h-4 text-amber-500 shrink-0" />
            <span>Digital signature, IP address, and timestamp will be logged for HR compliance audit.</span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={onClose} className="h-9 px-4 text-xs font-bold">
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!readConfirmed || !termsAgreed || submitting}
              className="h-9 px-5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4" /> {submitting ? 'Confirming...' : 'Submit Digital Sign-Off'}
            </Button>
          </div>
        </form>

      </div>
    </div>
  );
};
