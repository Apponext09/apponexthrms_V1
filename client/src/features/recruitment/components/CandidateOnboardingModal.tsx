import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  UserCheck, 
  KeyRound, 
  Copy, 
  Check, 
  Eye, 
  EyeOff, 
  Edit3, 
  Building2, 
  Briefcase, 
  Calendar, 
  Mail, 
  Phone, 
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Loader2,
  Sparkles
} from 'lucide-react';
import { useOfferOnboardingStatus, useUpdateOfferEmployeeCredentials, useOnboardOfferCandidate } from '../hooks/useOffers';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface CandidateOnboardingModalProps {
  offer: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CandidateOnboardingModal: React.FC<CandidateOnboardingModalProps> = ({
  offer,
  open,
  onOpenChange,
}) => {
  const navigate = useNavigate();
  const offerId = offer?.id;

  const { data: statusResponse, isLoading, refetch } = useOfferOnboardingStatus(open && offerId ? offerId : undefined);
  const updateCredentialsMutation = useUpdateOfferEmployeeCredentials();
  const onboardCandidateMutation = useOnboardOfferCandidate();

  const details = statusResponse?.data || statusResponse || {};

  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [customPassword, setCustomPassword] = useState('');

  useEffect(() => {
    if (details.tempPassword) {
      setCustomPassword(details.tempPassword);
    }
  }, [details.tempPassword]);

  const candidateName = (details.candidateName && details.candidateName !== 'Candidate' ? details.candidateName : (offer?.candidate_name || offer?.candidateName || 'Candidate')).trim();
  const candidateEmail = (details.candidateEmail && details.candidateEmail !== 'No Email' ? details.candidateEmail : (offer?.candidate_email || offer?.candidateEmail || offer?.meta?.candidateEmail || 'No Email')).trim();
  const candidatePhone = (details.candidatePhone && details.candidatePhone !== 'N/A' ? details.candidatePhone : (offer?.candidate_phone || offer?.candidatePhone || 'N/A')).trim();
  const positionTitle = (details.positionTitle && details.positionTitle !== 'N/A' ? details.positionTitle : (offer?.position_title || offer?.positionTitle || 'General Position')).trim();
  const departmentName = (details.departmentName && details.departmentName !== 'General' ? details.departmentName : (offer?.department_name || offer?.departmentName || 'General')).trim();
  const designationName = (details.designationName && details.designationName !== 'Staff' ? details.designationName : (offer?.designation_name || offer?.designationName || 'Staff')).trim();
  const joiningDate = details.joiningDate || offer?.offer_start_date || offer?.offerStartDate || '—';
  const employeeCode = details.employeeCode || offer?.meta?.employeeCode || 'Auto-Generating...';
  const employeeId = details.employeeId || offer?.meta?.employeeId;
  const isOnboarded = details.isOnboarded || !!employeeId;
  const tempPassword = details.tempPassword || offer?.meta?.tempPassword || customPassword || 'Apponext@2026!';

  const handleCopyPassword = () => {
    navigator.clipboard.writeText(tempPassword);
    setCopied(true);
    toast.success('Temporary password copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUpdatePassword = async () => {
    if (!customPassword.trim() || customPassword.trim().length < 4) {
      toast.error('Password must be at least 4 characters.');
      return;
    }

    try {
      await updateCredentialsMutation.mutateAsync({
        offerId,
        password: customPassword.trim(),
      });
      toast.success('Temporary password updated successfully!');
      setIsEditingPassword(false);
      refetch();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to update credentials.');
    }
  };

  const handleManualOnboard = async () => {
    try {
      await onboardCandidateMutation.mutateAsync(offerId);
      toast.success('Candidate successfully provisioned for onboarding!');
      refetch();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to initialize onboarding.');
    }
  };

  const handleGoToEmployee = () => {
    onOpenChange(false);
    if (employeeId) {
      navigate(`/employees/${employeeId}`);
    } else {
      navigate('/employees');
    }
  };

  if (!offer) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-card border-border shadow-2xl rounded-2xl">
        
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-emerald-600/15 via-primary/10 to-transparent p-6 border-b border-border/80 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold shrink-0 border border-emerald-500/20 shadow-xs">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-black text-foreground">{candidateName}</h2>
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-bold text-[11px]">
                  Offer Accepted
                </Badge>
                <Badge variant="outline" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 font-bold text-[11px]">
                  Status: Onboarding
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                <span>Emp Code: <strong className="font-mono text-foreground">{employeeCode}</strong></span>
                <span>•</span>
                <span>Role: <strong className="text-foreground">{positionTitle}</strong></span>
              </p>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground text-xs">
              <Loader2 className="w-6 h-6 animate-spin text-primary mb-2" />
              <span>Fetching onboarding & account credentials...</span>
            </div>
          ) : (
            <>
              {/* If candidate is not yet provisioned, show quick one-click trigger */}
              {!isOnboarded && (
                <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300 flex items-center justify-between gap-4 text-xs">
                  <div className="flex items-center gap-2.5">
                    <AlertCircle className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400" />
                    <div>
                      <p className="font-bold">Onboarding Record Not Yet Initialized</p>
                      <p className="text-[11px] text-muted-foreground">Click below to provision the employee record and generate login credentials.</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={handleManualOnboard}
                    disabled={onboardCandidateMutation.isPending}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shrink-0 shadow-xs"
                  >
                    {onboardCandidateMutation.isPending ? 'Provisioning...' : 'Initialize Onboarding'}
                  </Button>
                </div>
              )}

              {/* Login Credentials Box */}
              <Card className="border-border/80 bg-muted/30 shadow-xs rounded-xl overflow-hidden">
                <div className="p-4 border-b border-border/60 bg-muted/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-primary" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-foreground">Employee Login Credentials</h3>
                  </div>
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] font-bold">
                    <ShieldCheck className="w-3 h-3 mr-1" /> Active Account
                  </Badge>
                </div>
                <CardContent className="p-5 space-y-4">
                  
                  {/* Email row */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg bg-background border border-border/70">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="text-xs font-medium text-muted-foreground">Login Email:</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-foreground select-all">{candidateEmail}</span>
                  </div>

                  {/* Temporary Password row */}
                  <div className="flex flex-col gap-2 p-3.5 rounded-lg bg-background border border-border/70">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <KeyRound className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="text-xs font-medium text-muted-foreground">Temporary Password:</span>
                      </div>
                      
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          title={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          type="button"
                          onClick={handleCopyPassword}
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          title="Copy Password"
                        >
                          {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          type="button"
                          onClick={() => setIsEditingPassword(!isEditingPassword)}
                          className="h-7 px-2 text-[11px] font-bold text-primary hover:bg-primary/10"
                        >
                          <Edit3 className="w-3 h-3 mr-1" /> {isEditingPassword ? 'Cancel' : 'Change'}
                        </Button>
                      </div>
                    </div>

                    {!isEditingPassword ? (
                      <div className="bg-muted/40 p-2.5 rounded-md font-mono text-sm font-bold text-foreground tracking-wider flex items-center justify-between border border-border/50">
                        <span>{showPassword ? tempPassword : '••••••••••••'}</span>
                        <span className="text-[10px] text-muted-foreground font-sans font-normal">Auto-Generated</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 pt-1 animate-in fade-in-50">
                        <Input
                          value={customPassword}
                          onChange={(e) => setCustomPassword(e.target.value)}
                          placeholder="Enter new temporary password"
                          className="h-8 text-xs font-mono font-bold"
                        />
                        <Button
                          size="sm"
                          onClick={handleUpdatePassword}
                          disabled={updateCredentialsMutation.isPending}
                          className="h-8 px-3 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shrink-0 shadow-xs"
                        >
                          {updateCredentialsMutation.isPending ? 'Saving...' : 'Save Password'}
                        </Button>
                      </div>
                    )}
                  </div>

                </CardContent>
              </Card>

              {/* Basic Profile Details Preview */}
              <div className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-primary" /> Onboarding Basic Information
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-lg border border-border/60 bg-muted/20 space-y-1">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground">Department & Designation</span>
                    <p className="font-bold text-foreground">{departmentName} / {designationName}</p>
                  </div>

                  <div className="p-3 rounded-lg border border-border/60 bg-muted/20 space-y-1">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground">Target Joining Date</span>
                    <p className="font-bold text-foreground">{joiningDate ? new Date(joiningDate).toLocaleDateString() : '—'}</p>
                  </div>

                  <div className="p-3 rounded-lg border border-border/60 bg-muted/20 space-y-1">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground">Candidate Phone</span>
                    <p className="font-mono font-bold text-foreground">{candidatePhone}</p>
                  </div>

                  <div className="p-3 rounded-lg border border-border/60 bg-muted/20 space-y-1">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground">Employment Type</span>
                    <p className="font-bold text-foreground capitalize">Full Time</p>
                  </div>
                </div>
              </div>

              {/* Informative Workflow Guidance Note */}
              <div className="p-3.5 rounded-xl border border-primary/20 bg-primary/5 flex items-start gap-2.5 text-xs text-muted-foreground leading-relaxed">
                <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <strong className="text-foreground">Next Step:</strong> Employee has been provisioned with basic details under <span className="text-primary font-bold">Onboarding status</span>. You can update full personal, statutory, emergency, and bank details in the Employee Profile whenever ready.
                </div>
              </div>

            </>
          )}
        </div>

        {/* Modal Footer */}
        <DialogFooter className="p-4 bg-muted/40 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleGoToEmployee}
            className="w-full sm:w-auto text-xs font-bold border-border hover:bg-muted gap-1.5"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Open Employee Profile
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto text-xs font-bold px-6"
          >
            Close Window
          </Button>
        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
};
