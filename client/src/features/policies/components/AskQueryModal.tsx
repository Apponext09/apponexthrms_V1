import React, { useState } from 'react';
import { policiesApi } from '../api/policiesApi';
import { RolePolicyRecord } from '../types/policy';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { X, Send } from 'lucide-react';

interface AskQueryModalProps {
  policy: RolePolicyRecord;
  onClose: () => void;
}

export const AskQueryModal: React.FC<AskQueryModalProps> = ({ policy, onClose }) => {
  const [question, setQuestion] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) {
      toast.error('Please enter a question');
      return;
    }

    setSubmitting(true);
    try {
      await policiesApi.submitPolicyQuery(policy.id, {
        policyVersion: policy.version,
        question: question.trim(),
      });
      toast.success('Query submitted to HR successfully.');
      onClose();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to submit query');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4">
      <div className="bg-card w-full max-w-lg rounded-xl shadow-2xl border border-border flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h3 className="text-lg font-bold">Ask HR about Policy</h3>
            <p className="text-xs text-muted-foreground">{policy.title} (v{policy.version})</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold">Your Question</label>
            <Textarea
              placeholder="E.g., I have a question regarding section 2.1 about overtime approval..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="min-h-[120px] resize-none"
              autoFocus
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !question.trim()} className="gap-2">
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Submit to HR
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
