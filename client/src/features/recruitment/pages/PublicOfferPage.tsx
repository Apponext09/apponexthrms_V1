import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { CheckCircle2, AlertCircle, FileText, Check, X } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

export const PublicOfferPage: React.FC = () => {
  const { uuid } = useParams<{ uuid: string }>();
  const [offerData, setOfferData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [signature, setSignature] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [actionStatus, setActionStatus] = useState<'idle' | 'accepted' | 'rejected'>('idle');
  const [submitting, setSubmitting] = useState(false);

  const getAPIUrl = (path: string) => {
    const rawApiUrl = (import.meta as any).env.VITE_API_URL || `http://${window.location.hostname}:5000/api/v1`;
    const API_BASE_URL = rawApiUrl.endsWith('/v1') ? rawApiUrl : `${rawApiUrl}/v1`;
    return `${API_BASE_URL}${path}`;
  };


  useEffect(() => {
    setIsLoading(true);
    axios.get(getAPIUrl(`/public/offers/${uuid}`))
      .then(res => {
        if (res.data?.success) {
          setOfferData(res.data.data);
          if (res.data.data.offer.status === 'accepted') {
            setActionStatus('accepted');
          } else if (res.data.data.offer.status === 'rejected') {
            setActionStatus('rejected');
          }
        } else {
          setError(res.data?.message || 'Offer letter not found');
        }
      })
      .catch(err => {
        console.error('Failed to fetch offer letter details', err);
        const errObj = err.response?.data?.error;
        const msg = typeof errObj === 'string' ? errObj : errObj?.message || err.response?.data?.message || 'Failed to fetch offer letter details. Please check the link.';
        setError(msg);
      })
      .finally(() => setIsLoading(false));
  }, [uuid]);

  const handleAccept = (e: React.FormEvent) => {
    e.preventDefault();
    if (!signature.trim()) {
      toast.error('Please type your signature/name to accept the offer.');
      return;
    }

    setSubmitting(true);
    axios.post(getAPIUrl(`/public/offers/${uuid}/accept`), { signature })
      .then(res => {
        if (res.data?.success) {
          toast.success('Congratulations! You have accepted the job offer.');
          setActionStatus('accepted');
        } else {
          toast.error(res.data?.message || 'Failed to accept offer');
        }
      })
      .catch(err => {
        console.error('Failed to accept offer', err);
        toast.error('Failed to accept job offer.');
      })
      .finally(() => setSubmitting(false));
  };

  const handleReject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectReason.trim()) {
      toast.error('Please specify the reason for declining this offer.');
      return;
    }

    setSubmitting(true);
    axios.post(getAPIUrl(`/public/offers/${uuid}/reject`), { comments: rejectReason })
      .then(res => {
        if (res.data?.success) {
          toast.success('You have declined the job offer.');
          setActionStatus('rejected');
        } else {
          toast.error(res.data?.message || 'Failed to decline offer');
        }
      })
      .catch(err => {
        console.error('Failed to decline offer', err);
        toast.error('Failed to decline offer.');
      })
      .finally(() => setSubmitting(false));
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-muted/30 p-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
        <p className="mt-4 text-sm text-muted-foreground">Loading your offer letter details...</p>
      </div>
    );
  }

  if (error || !offerData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-muted/30 p-4">
        <Card className="max-w-md w-full border-destructive/30">
          <CardHeader className="text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-2" />
            <CardTitle className="text-lg text-destructive font-semibold">Error Loading Offer</CardTitle>
          </CardHeader>
          <CardContent className="text-center text-sm text-foreground/90 pb-6">
            {error || 'Unable to retrieve offer details. The link may have expired or is incorrect.'}
          </CardContent>
        </Card>
      </div>
    );
  }

  let meta: any = {};
  if (offer.meta) {
    try {
      meta = typeof offer.meta === 'string' ? JSON.parse(offer.meta) : offer.meta;
    } catch (e) {
      meta = {};
    }
  }

  const effectiveCompanyName = meta.companyName || companyName;

  if (actionStatus === 'accepted') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-muted/30 p-4">
        <Card className="max-w-md w-full border-green-500/30 text-center py-6">
          <CardContent className="space-y-4">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
            <h2 className="text-xl font-bold text-foreground">Offer Letter Accepted!</h2>
            <p className="text-sm text-muted-foreground">
              Thank you, {candidateName}. You have successfully accepted the offer of employment at <strong>{companyName}</strong>.
            </p>
            <p className="text-xs text-muted-foreground bg-muted p-2 rounded-sm">
              Our onboarding team will contact you shortly with next steps and credentials.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (actionStatus === 'rejected') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-muted/30 p-4">
        <Card className="max-w-md w-full border-muted/50 text-center py-6">
          <CardContent className="space-y-4">
            <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto" />
            <h2 className="text-xl font-bold text-foreground">Offer Declined</h2>
            <p className="text-sm text-muted-foreground">
              You have declined the employment offer for the position of <strong>{offer.position_title}</strong> at <strong>{companyName}</strong>.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 py-10 px-4 md:px-6">
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* Header Branding */}
        <div className="flex items-center justify-between border-b pb-4 border-muted">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{companyName}</h1>
            <p className="text-xs text-muted-foreground">OFFER OF EMPLOYMENT</p>
          </div>
          <FileText className="w-8 h-8 text-primary" />
        </div>

        {/* Offer Body */}
        <Card className="rounded-none shadow-sm border-border">
          <CardHeader className="py-4 border-b border-border bg-muted/20">
            <CardTitle className="text-sm font-semibold text-foreground">Job Offer Details</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6 text-sm text-foreground/90 leading-relaxed">
            
            {meta.compiledBody ? (
              <div className="whitespace-pre-line text-slate-800 space-y-3 font-serif border-b border-border pb-4">
                {meta.compiledBody}
              </div>
            ) : (
              <>
                <p>Dear <strong>{candidateName}</strong>,</p>
                
                <p>
                  We are pleased to offer you employment at <strong>{effectiveCompanyName}</strong> in the position of <strong>{offer.position_title}</strong> under the <strong>{departmentName}</strong> department. We believe your skills and experience will be a valuable asset to our organization.
                </p>
              </>
            )}

            <h3 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mt-4 mb-2">Offer Terms & Remuneration:</h3>
            <div className="border border-border">
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium bg-muted/20 w-44">Position Title</TableCell>
                    <TableCell>{offer.position_title}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium bg-muted/20">Department</TableCell>
                    <TableCell>{departmentName}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium bg-muted/20">Cost to Company (CTC)</TableCell>
                    <TableCell className="font-semibold text-foreground">{offer.cost_to_company} {offer.currency}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium bg-muted/20">Base Salary</TableCell>
                    <TableCell>{offer.base_salary} {offer.currency}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium bg-muted/20">Joining Date</TableCell>
                    <TableCell>{offer.offer_start_date ? new Date(offer.offer_start_date).toLocaleDateString() : '-'}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium bg-muted/20">Offer Expiry Date</TableCell>
                    <TableCell>{offer.offer_expiry_date ? new Date(offer.offer_expiry_date).toLocaleDateString() : '-'}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            <p>
              By accepting this offer, you agree to adhere to the company's guidelines, policies, and code of conduct.
            </p>
          </CardContent>
        </Card>

        {/* Action Panel */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Accept Panel */}
          <Card className="rounded-none border-border shadow-sm">
            <CardHeader className="py-3 border-b border-border bg-green-50/10">
              <CardTitle className="text-xs font-semibold text-green-700 flex items-center gap-1.5">
                <Check className="w-4 h-4" /> Accept Offer
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <form onSubmit={handleAccept} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Type your full name to sign digitally</label>
                  <Input 
                    placeholder="e.g. John Doe"
                    value={signature}
                    onChange={e => setSignature(e.target.value)}
                    className="h-9 text-xs rounded-sm bg-background border-input"
                    disabled={submitting}
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full h-9 bg-green-600 hover:bg-green-700 text-white rounded-sm text-xs"
                  disabled={submitting}
                >
                  {submitting ? 'Accepting...' : 'I Accept Employment Offer'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Decline Panel */}
          <Card className="rounded-none border-border shadow-sm">
            <CardHeader className="py-3 border-b border-border bg-red-50/10">
              <CardTitle className="text-xs font-semibold text-red-600 flex items-center gap-1.5">
                <X className="w-4 h-4" /> Decline Offer
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <form onSubmit={handleDeclineSubmit} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Decline Reason</label>
                  <Textarea 
                    placeholder="Provide a brief reason..."
                    value={rejectReason}
                    onChange={e => setRejectReason(e.target.value)}
                    className="text-xs rounded-sm min-h-[50px] bg-background border-input"
                    disabled={submitting}
                  />
                </div>
                <Button 
                  type="submit" 
                  variant="outline"
                  className="w-full h-9 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 rounded-sm text-xs"
                  disabled={submitting}
                >
                  {submitting ? 'Declining...' : 'Decline Offer'}
                </Button>
              </form>
            </CardContent>
          </Card>

        </div>

      </div>
    </div>
  );

  function handleDeclineSubmit(e: React.FormEvent) {
    handleReject(e);
  }
};
