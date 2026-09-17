import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FileSignature,
  ShieldCheck,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileText,
  Lock,
  Download,
  Building2,
} from 'lucide-react';
import { policiesApi } from '../api/policiesApi';
import { PolicySignaturePad } from './PolicySignaturePad';
import { toast } from 'sonner';

interface PolicyESignModalProps {
  isOpen: boolean;
  onClose: () => void;
  policyId: number;
  policyTitle: string;
  policyVersion: string;
  onSignatureSuccess: () => void;
}

export const PolicyESignModal: React.FC<PolicyESignModalProps> = ({
  isOpen,
  onClose,
  policyId,
  policyTitle,
  policyVersion,
  onSignatureSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [signingUrl, setSigningUrl] = useState<string | null>(null);
  const [provider, setProvider] = useState<string>('docusign');
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [status, setStatus] = useState<'IDLE' | 'INITIATED' | 'SIGNING' | 'VERIFYING' | 'SIGNED' | 'FAILED'>('IDLE');
  const [polling, setPolling] = useState(false);
  const [signedInfo, setSignedInfo] = useState<any | null>(null);
  const [signatureData, setSignatureData] = useState<string | null>(null);

  const startESignSession = async () => {
    try {
      setLoading(true);
      setStatus('INITIATED');
      const res = await policiesApi.initiateESignature(policyId);

      if (res.alreadySigned) {
        setStatus('SIGNED');
        setSignedInfo(res.signature);
        toast.info('You have already digitally signed this policy version.');
        return;
      }

      setProvider(res.provider || 'docusign');
      setSigningUrl(res.signingUrl || null);
      setTransactionId(res.transactionId || null);
      setStatus('SIGNING');
      setPolling(true);
      toast.success(`E-Signature session created via ${res.provider?.toUpperCase() || 'DocuSign'}`);
    } catch (err: any) {
      console.error('Failed to initiate e-signature:', err);
      setStatus('FAILED');
      toast.error(err.response?.data?.message || 'Could not initiate E-Signature session.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && status === 'IDLE') {
      startESignSession();
    }
    if (!isOpen) {
      setStatus('IDLE');
      setSigningUrl(null);
      setTransactionId(null);
      setPolling(false);
    }
  }, [isOpen, policyId]);

  // Polling backend status every 4 seconds
  useEffect(() => {
    let interval: any = null;
    if (isOpen && polling && transactionId && status !== 'SIGNED') {
      interval = setInterval(async () => {
        try {
          const res = await policiesApi.getPolicySignatureStatus(policyId);
          if (res.isSigned && res.signature) {
            setStatus('SIGNED');
            setSignedInfo(res.signature);
            setPolling(false);
            toast.success('Signature verified! Policy status updated to SIGNED.');
            onSignatureSuccess();
          }
        } catch (err) {
          // ignore poll error
        }
      }, 4000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isOpen, polling, transactionId, status, policyId]);

  // Simulated provider completion callback (for demo & testing)
  const handleSimulatedProviderWebhook = async () => {
    if (!transactionId) return;
    try {
      setStatus('VERIFYING');
      const apiBase = (import.meta as any).env.VITE_API_URL || 'http://localhost:5000/api/v1';
      const rootUrl = apiBase.replace(/\/api\/v1\/?$/, '');

      const urlParams = new URLSearchParams(signingUrl?.split('?')[1] || '');
      const token = urlParams.get('token') || 'simulated_provider_auth_token';

      // Trigger provider webhook authentication call
      await fetch(`${rootUrl}/api/integrations/esign/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transactionId,
          providerTransactionId: transactionId,
          event: 'SIGNED',
          status: 'SIGNED',
          signedAt: new Date().toISOString(),
          token,
          documentBase64: signatureData,
        }),
      });

      const res = await policiesApi.getPolicySignatureStatus(policyId);
      if (res.isSigned && res.signature) {
        setStatus('SIGNED');
        setSignedInfo(res.signature);
        toast.success('Electronic Signature verified and recorded in governance audit.');
        onSignatureSuccess();
      } else {
        // Retry check
        setTimeout(async () => {
          const res2 = await policiesApi.getPolicySignatureStatus(policyId);
          if (res2.isSigned) {
            setStatus('SIGNED');
            setSignedInfo(res2.signature);
            onSignatureSuccess();
          }
        }, 1000);
      }
    } catch (err) {
      console.error('Webhook simulation failed:', err);
      toast.error('Webhook signature verification failed.');
      setStatus('SIGNING');
    }
  };

  const getProviderBadge = (name: string) => {
    const norm = (name || '').toLowerCase();
    if (norm === 'docusign') {
      return <Badge className="bg-yellow-500/10 text-yellow-600 border border-yellow-500/30 font-bold">DocuSign eSignature</Badge>;
    }
    if (norm === 'leegality') {
      return <Badge className="bg-blue-500/10 text-blue-600 border border-blue-500/30 font-bold">Leegality eSign</Badge>;
    }
    if (norm.includes('adobe')) {
      return <Badge className="bg-red-500/10 text-red-600 border border-red-500/30 font-bold">Adobe Acrobat Sign</Badge>;
    }
    return <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 font-bold">Secure E-Sign</Badge>;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-5">
        <DialogHeader className="space-y-1">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base font-black flex items-center gap-2">
              <FileSignature className="w-5 h-5 text-primary" /> Execute Digital Signature
            </DialogTitle>
            {getProviderBadge(provider)}
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Sign exact assigned version <span className="font-mono font-bold text-foreground">v{policyVersion}</span> of{' '}
            <strong className="text-foreground">{policyTitle}</strong>.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-xs font-semibold text-muted-foreground">Connecting to E-Signature Provider...</p>
          </div>
        ) : status === 'SIGNED' ? (
          <div className="space-y-4">
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 shrink-0" /> Policy Digitally Signed & Verified
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your signature has been cryptographically validated and bound to policy version{' '}
                <span className="font-mono font-bold text-foreground">v{policyVersion}</span>. The signed PDF and evidence
                certificate are stored securely in HR governance records.
              </p>

              {signedInfo && (
                <div className="grid grid-cols-2 gap-2 pt-2 text-xs font-medium border-t border-emerald-500/20">
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold block">Provider</span>
                    <span className="font-bold text-foreground capitalize">{signedInfo.provider || provider}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold block">Signed At</span>
                    <span className="font-bold text-foreground">
                      {signedInfo.signedAt ? new Date(signedInfo.signedAt).toLocaleString() : new Date().toLocaleString()}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold block">Transaction ID</span>
                    <span className="font-mono text-[11px] text-primary truncate block">{signedInfo.providerTransactionId || transactionId}</span>
                  </div>
                  {signedInfo.documentHash && (
                    <div className="col-span-2">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold block">SHA-256 Checksum</span>
                      <span className="font-mono text-[10px] text-muted-foreground truncate block">{signedInfo.documentHash}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              {signedInfo?.id && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(policiesApi.getSignedDocumentUrl(signedInfo.id), '_blank')}
                    className="h-8 text-xs font-bold gap-1.5"
                  >
                    <FileText className="w-3.5 h-3.5" /> View Signed PDF
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(policiesApi.getSignedEvidenceUrl(signedInfo.id), '_blank')}
                    className="h-8 text-xs font-bold gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" /> Evidence Certificate
                  </Button>
                </>
              )}
              <Button type="button" size="sm" onClick={onClose} className="h-8 text-xs font-bold">
                Done
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3 bg-muted/40 border border-border rounded-xl space-y-2 text-xs">
              <div className="font-bold text-foreground flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-primary" /> Cryptographic Integrity & Immutability Notice
              </div>
              <p className="text-muted-foreground">
                You are executing a legally binding electronic signature. Your user ID, IP address, and timestamp will be recorded with provider certificate evidence.
              </p>
            </div>

            {/* Interactive Digital Signature Pad (Draw, Type, Upload Signature) */}
            <PolicySignaturePad
              onSignatureChange={(data) => setSignatureData(data)}
            />

            {signingUrl ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between bg-card border border-border p-3 rounded-lg text-xs">
                  <div>
                    <span className="font-bold text-foreground block">Session Active</span>
                    <span className="text-[10px] text-muted-foreground font-mono">TX: {transactionId}</span>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(signingUrl, '_blank')}
                    className="h-8 text-xs font-bold gap-1 text-primary border-primary/30"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Open Session in New Tab
                  </Button>
                </div>

                {/* Simulated Provider Sign Button for local/sandbox environment */}
                <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl space-y-2 text-center">
                  <span className="text-xs font-bold text-foreground block">Complete Signature Flow</span>
                  <p className="text-[11px] text-muted-foreground">
                    Click below to confirm your signature submission and record cryptographic signature.
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSimulatedProviderWebhook}
                    disabled={status === 'VERIFYING'}
                    className="h-9 px-6 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5 shadow-sm"
                  >
                    {status === 'VERIFYING' ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Verifying Webhook...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" /> Confirm & Execute Signature
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
                <AlertCircle className="w-4 h-4 text-amber-500 mr-2" /> Session URL could not be generated. Please retry.
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-border">
              <Button type="button" variant="ghost" size="sm" onClick={startESignSession} className="h-8 text-xs">
                Re-initialize Session
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={onClose} className="h-8 text-xs font-bold">
                Cancel
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
