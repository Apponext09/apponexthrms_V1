import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Gift, Plus, Users, Send, Loader2, FileUp, FileText, UploadCloud, X, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api';
import { formatApiError } from '@/lib/apiError';
import { cn } from '@/lib/utils';

interface PositionOption {
  id: string | number;
  title: string;
  code?: string;
  department?: string;
}

export const resolveResumeUrl = (rawUrl?: string | null): string => {
  if (!rawUrl || typeof rawUrl !== 'string' || rawUrl === '#' || rawUrl === 'null' || rawUrl === 'undefined' || rawUrl.trim() === '') {
    return '';
  }
  if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://') || rawUrl.startsWith('data:') || rawUrl.startsWith('blob:')) {
    return rawUrl;
  }
  let clean = rawUrl.trim();
  if (clean.startsWith('./')) clean = clean.substring(2);
  if (!clean.startsWith('/')) clean = `/${clean}`;
  if (!clean.startsWith('/uploads')) {
    if (clean.startsWith('/resumes/')) {
      clean = `/uploads${clean}`;
    } else {
      clean = `/uploads/resumes${clean}`;
    }
  }
  return clean;
};

export default function ReferralPage() {
  const [referrals, setReferrals] = useState<any[]>([]);
  const [positions, setPositions] = useState<PositionOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingPositions, setIsLoadingPositions] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalEarnedReward = useMemo(() => {
    return referrals.reduce((acc, curr) => acc + Number(curr.reward_amount || curr.rewardAmount || curr.paid_reward || curr.paidReward || 0), 0);
  }, [referrals]);

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: '',
  });

  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchPositions = async () => {
    setIsLoadingPositions(true);
    const foundPositions: PositionOption[] = [];
    const titlesSet = new Set<string>();

    const addPosition = (title: string, id?: any, code?: string, department?: string) => {
      const cleanTitle = (title || '').trim();
      if (!cleanTitle || titlesSet.has(cleanTitle.toLowerCase())) return;
      titlesSet.add(cleanTitle.toLowerCase());
      foundPositions.push({
        id: id || cleanTitle,
        title: cleanTitle,
        code: code || undefined,
        department: department || undefined,
      });
    };

    // 1. Fetch from dedicated authenticated employee referral positions endpoint
    try {
      const resReferralPos = await apiClient.get('/recruitment/referrals/positions');
      const items = Array.isArray(resReferralPos.data?.data)
        ? resReferralPos.data.data
        : (Array.isArray(resReferralPos.data) ? resReferralPos.data : []);

      items.forEach((p: any) => {
        const title = p.title || p.position_title || p.positionTitle || p.job_title || p.jobTitle;
        if (title) {
          addPosition(title, p.id, p.code || p.job_code || p.mr_number, p.department || p.department_name);
        }
      });
    } catch (err) {
      console.warn('Could not load from /recruitment/referrals/positions:', err);
    }

    // 2. Fetch active published openings (MRF & Jobs from database)
    if (foundPositions.length === 0) {
      try {
        const resOpenings = await apiClient.get('/public/job-portal/openings');
        const openings = Array.isArray(resOpenings.data?.data)
          ? resOpenings.data.data
          : (Array.isArray(resOpenings.data) ? resOpenings.data : []);
        
        openings.forEach((op: any) => {
          const title = op.position_title || op.positionTitle || op.title || op.jobTitle || op.job_title;
          if (title) {
            addPosition(title, op.id, op.mr_number || op.job_code || op.code, op.department_name || op.department || op.dept_name);
          }
        });
      } catch (err) {
        console.warn('Could not load openings from /public/job-portal/openings', err);
      }
    }

    // 3. Try /public/job-reference/openings
    if (foundPositions.length === 0) {
      try {
        const resRef = await apiClient.get('/public/job-reference/openings');
        const openings = Array.isArray(resRef.data?.data)
          ? resRef.data.data
          : (Array.isArray(resRef.data) ? resRef.data : []);
        
        openings.forEach((op: any) => {
          const title = op.position_title || op.positionTitle || op.title || op.jobTitle || op.job_title;
          if (title) {
            addPosition(title, op.id, op.mr_number || op.job_code || op.code, op.department_name || op.department || op.dept_name);
          }
        });
      } catch (err) {
        // ignore
      }
    }

    // 4. Load designations from filter data
    if (foundPositions.length === 0) {
      try {
        const resFilters = await apiClient.get('/public/job-portal/filters');
        const desigs = Array.isArray(resFilters.data?.data?.designations) ? resFilters.data.data.designations : [];
        desigs.forEach((d: any) => {
          const title = d.name || d.title;
          if (title) {
            addPosition(title, d.id, d.code, d.departmentName || d.department_name);
          }
        });
      } catch (err) {
        // ignore
      }
    }

    // 5. Ultimate fallback if DB has no positions configured
    if (foundPositions.length === 0) {
      const defaultPositions = [
        { title: 'Software Engineer', code: 'SE-01', department: 'IT & Software' },
        { title: 'Full Stack Developer', code: 'DEV-01', department: 'IT & Software' },
        { title: 'Frontend Developer (React)', code: 'FE-01', department: 'IT & Software' },
        { title: 'Backend Developer (Node.js)', code: 'BE-01', department: 'IT & Software' },
        { title: 'UI/UX Designer', code: 'DES-01', department: 'Design' },
        { title: 'Sales Executive', code: 'SE-02', department: 'Sales & BD' },
        { title: 'Business Development Manager', code: 'BDM-01', department: 'Sales & BD' },
        { title: 'HR Executive', code: 'HR-01', department: 'Human Resources' },
        { title: 'Accountant', code: 'ACC-01', department: 'Finance & Accounts' },
        { title: 'Operations Associate', code: 'OPS-01', department: 'Operations' },
      ];
      defaultPositions.forEach(p => addPosition(p.title, p.code, p.code, p.department));
    }

    setPositions(foundPositions);
    if (foundPositions.length > 0) {
      setForm(prev => ({
        ...prev,
        role: prev.role && titlesSet.has(prev.role.toLowerCase()) ? prev.role : foundPositions[0].title
      }));
    } else {
      setForm(prev => ({
        ...prev,
        role: ''
      }));
    }
    setIsLoadingPositions(false);
  };

  const fetchMyReferrals = () => {
    setIsLoading(true);
    apiClient.get('/recruitment/referrals/my-referrals')
      .then((res) => {
        const d = res.data;
        if (d?.success) {
          // Handle both array and nested paginated shapes
          const items = Array.isArray(d.data)
            ? d.data
            : Array.isArray(d.data?.items)
            ? d.data.items
            : Array.isArray(d.items)
            ? d.items
            : [];
          setReferrals(items);
        }
      })
      .catch((err) => console.error('Failed to load employee referrals', err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchPositions();
    fetchMyReferrals();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Resume file size must be less than 10MB');
        return;
      }
      setResumeFile(file);
    }
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Resume file size must be less than 10MB');
        return;
      }
      setResumeFile(file);
    }
  };

  const handleRemoveFile = () => {
    setResumeFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email) {
      toast.error('Candidate name and email are required.');
      return;
    }

    try {
      setIsSubmitting(true);

      let resumeDataUrl: string | undefined = undefined;
      if (resumeFile) {
        resumeDataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(resumeFile);
        });
      }

      await apiClient.post('/recruitment/referrals', {
        candidateName: form.name,
        candidateEmail: form.email,
        candidatePhone: form.phone,
        positionTitle: form.role || (positions[0]?.title || 'Open Position'),
        resumeUrl: resumeDataUrl,
      });

      toast.success(`Referral submitted successfully for ${form.name}.`);
      setForm(prev => ({
        name: '',
        email: '',
        phone: '',
        role: positions[0]?.title || prev.role
      }));
      setResumeFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchMyReferrals();
    } catch (err: any) {
      console.error(err);
      toast.error(formatApiError(err, 'Failed to submit candidate referral'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalReferrals = referrals.length;
  const inReviewCount = referrals.filter(r => ['submitted', 'pending', 'screening', 'interview'].includes((r.status || r.referral_status || '').toLowerCase())).length;
  const hiredCount = referrals.filter(r => ['hired', 'accepted', 'rewarded', 'reward_paid'].includes((r.status || r.referral_status || '').toLowerCase())).length;
  // Show reward amount for ANY referral that has an amount set (even before paid)
  const totalAssignedReward = referrals.reduce((sum, r) => {
    const amt = parseFloat(r.referralRewardAmount || r.referral_reward_amount || 0);
    return !isNaN(amt) && amt > 0 ? sum + amt : sum;
  }, 0);
  const totalPaidReward = referrals.reduce((sum, r) => {
    const amt = parseFloat(r.referralRewardAmount || r.referral_reward_amount || 0);
    const isPaid = r.reward_status === 'paid' || r.rewardStatus === 'paid';
    return isPaid && !isNaN(amt) && amt > 0 ? sum + amt : sum;
  }, 0);
  // Referrals with reward assigned but not yet paid
  const pendingRewardReferrals = referrals.filter(r => {
    const amt = parseFloat(r.referralRewardAmount || r.referral_reward_amount || 0);
    return amt > 0 && r.reward_status !== 'paid' && r.rewardStatus !== 'paid';
  });

  const getReferralStatusBadge = (status: string, rewardStatus?: string) => {
    const s = (status || '').toLowerCase();
    const r = (rewardStatus || '').toLowerCase();
    
    if (r === 'paid' || s === 'rewarded') {
      return (
        <Badge variant="outline" className="bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30 text-[10px] font-bold">
          🎉 Reward Disbursed
        </Badge>
      );
    }
    if (s === 'hired' || s === 'accepted') {
      return (
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] font-bold">
          ✓ Accepted & Hired
        </Badge>
      );
    }
    if (s === 'interview' || s === 'assessment' || s === 'screening') {
      return (
        <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30 text-[10px] font-bold">
          Interview In Progress
        </Badge>
      );
    }
    if (s === 'rejected' || s === 'declined') {
      return (
        <Badge variant="outline" className="bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30 text-[10px] font-bold">
          Not Selected
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[10px] font-bold">
        Under HR Review
      </Badge>
    );
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card border border-border/80 rounded-xl p-4 sm:p-5 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-foreground tracking-tight flex items-center gap-2">
              <Gift className="w-5 h-5 text-primary" /> Employee Referrals
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 font-bold">
              Rewards Hub
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Refer candidates with their resume for active open positions and track HR approval & cash reward status in real time.
          </p>
        </div>

        {referrals.length > 0 && (
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-[10px] uppercase font-bold text-muted-foreground">Total Earned</div>
              <div className="text-sm font-black text-emerald-600 dark:text-emerald-400 font-mono">
                ₹{referrals.reduce((sum, item) => sum + (Number(item.reward_amount || item.rewardAmount || 0)), 0).toLocaleString()}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Refer Candidate Form */}
        <div className="lg:col-span-1">
          <Card className="border border-border/80 rounded-xl shadow-2xs bg-card">
            <CardHeader className="pb-3 pt-4 px-4 border-b border-border/60">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                <Send className="w-4 h-4 text-primary" /> Refer Candidate
              </CardTitle>
              <CardDescription className="text-xs">Submit candidate contact info & resume for review.</CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <form onSubmit={handleSubmit} className="space-y-3.5">
                <div className="space-y-1">
                  <Label htmlFor="candName" className="text-xs font-bold text-foreground">Candidate Full Name *</Label>
                  <Input
                    id="candName"
                    placeholder="E.g., Nilesh Patil"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="h-9 text-xs font-semibold rounded-lg border-border bg-muted/50 focus-visible:ring-primary"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="candEmail" className="text-xs font-bold text-foreground">Candidate Email *</Label>
                  <Input
                    id="candEmail"
                    type="email"
                    placeholder="E.g., nilesh@gmail.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="h-9 text-xs font-semibold rounded-lg border-border bg-muted/50 focus-visible:ring-primary"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="candPhone" className="text-xs font-bold text-foreground">Candidate Phone (Optional)</Label>
                  <Input
                    id="candPhone"
                    type="text"
                    placeholder="E.g., +91 9876543210"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="h-9 text-xs font-semibold rounded-lg border-border bg-muted/50 focus-visible:ring-primary"
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="candRole" className="text-xs font-bold text-foreground">Referred Position</Label>
                    {isLoadingPositions && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-medium">
                        <Loader2 className="w-3 h-3 animate-spin text-primary" /> Loading positions...
                      </span>
                    )}
                  </div>
                  <select
                    id="candRole"
                    className="flex h-9 w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer disabled:opacity-60"
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    disabled={isLoadingPositions}
                  >
                    {isLoadingPositions ? (
                      <option value="">Loading active job positions from database...</option>
                    ) : positions.length === 0 ? (
                      <option value="">No open positions found</option>
                    ) : (
                      positions.map((pos) => (
                        <option key={pos.id} value={pos.title}>
                          {pos.title}{pos.code ? ` (${pos.code})` : ''}{pos.department ? ` — ${pos.department}` : ''}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {/* Candidate Resume Upload Dropzone */}
                <div className="space-y-1.5 pt-1">
                  <Label className="text-xs font-bold text-foreground flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <FileUp className="w-3.5 h-3.5 text-primary" /> Candidate Resume / CV
                    </span>
                    <span className="text-[10px] text-muted-foreground font-normal">PDF, DOC, DOCX</span>
                  </Label>

                  {resumeFile ? (
                    <div className="flex items-center justify-between p-2.5 rounded-lg border border-primary/40 bg-primary/5 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-4 h-4 text-primary shrink-0" />
                        <div className="truncate">
                          <p className="font-semibold text-foreground truncate">{resumeFile.name}</p>
                          <p className="text-[10px] text-muted-foreground">{(resumeFile.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={handleRemoveFile}
                        className="h-6 w-6 rounded-md hover:bg-rose-500/10 hover:text-rose-600 text-muted-foreground shrink-0"
                        title="Remove resume"
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <div
                      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={handleFileDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={cn(
                        'border-2 border-dashed rounded-lg p-3.5 text-center cursor-pointer transition-all select-none',
                        isDragging ? 'border-primary bg-primary/10 scale-[0.99]' : 'border-border/80 hover:border-primary/50 hover:bg-muted/40'
                      )}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <UploadCloud className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
                      <p className="text-xs font-semibold text-foreground">Click to browse or drop resume here</p>
                      <p className="text-[10px] text-muted-foreground">PDF or Word document (Max 10MB)</p>
                    </div>
                  )}
                </div>

                <Button type="submit" disabled={isSubmitting || positions.length === 0} className="w-full h-9 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs rounded-lg gap-1.5 shadow-2xs cursor-pointer mt-2">
                  {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} Submit Candidate
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Applied History & Live Performance Summary */}
        <div className="lg:col-span-2 space-y-4">
          {/* Real-time Dynamic Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-card border border-border/80 rounded-xl shadow-2xs">
              <div className="text-[10px] font-bold uppercase text-muted-foreground">Total Referred</div>
              <div className="text-lg font-black text-foreground mt-0.5">{totalReferrals}</div>
            </div>
            <div className="p-3 bg-card border border-border/80 rounded-xl shadow-2xs">
              <div className="text-[10px] font-bold uppercase text-blue-600 dark:text-blue-400">In Review</div>
              <div className="text-lg font-black text-blue-600 dark:text-blue-400 mt-0.5">{inReviewCount}</div>
            </div>
            <div className="p-3 bg-card border border-border/80 rounded-xl shadow-2xs">
              <div className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400">Accepted / Hired</div>
              <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{hiredCount}</div>
            </div>
            <div className="p-3 bg-card border border-border/80 rounded-xl shadow-2xs relative overflow-hidden">
              <div className="text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400">Reward Earned</div>
              <div className="text-lg font-black text-amber-600 dark:text-amber-400 mt-0.5 font-mono">
                {totalAssignedReward > 0 ? `₹${totalAssignedReward.toLocaleString()}` : '—'}
              </div>
              {totalPaidReward > 0 && totalPaidReward < totalAssignedReward && (
                <div className="text-[9px] text-emerald-600 font-bold mt-0.5">₹{totalPaidReward.toLocaleString()} paid</div>
              )}
            </div>
          </div>

          {/* Pending Reward Banner */}
          {pendingRewardReferrals.length > 0 && (
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
              <span className="text-xl shrink-0">🎉</span>
              <div>
                <p className="text-xs font-bold text-amber-700 dark:text-amber-300">Reward Assigned!</p>
                <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5">
                  You have <span className="font-bold">₹{pendingRewardReferrals.reduce((s, r) => s + parseFloat(r.referralRewardAmount || r.referral_reward_amount || 0), 0).toLocaleString()}</span> in pending referral reward{pendingRewardReferrals.length > 1 ? 's' : ''}.
                  Payment will be processed via your payroll or bank transfer.
                </p>
              </div>
            </div>
          )}

          <Card className="border border-border/80 rounded-xl shadow-2xs bg-card overflow-hidden">
            <CardHeader className="pb-3 pt-4 px-4 sm:px-5 border-b border-border/60">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                <Users className="w-4 h-4 text-primary" /> Referral Tracker
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border/60">
                    <TableHead className="font-bold text-xs uppercase text-muted-foreground px-4 py-3">Candidate</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-muted-foreground px-4 py-3">Position</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-muted-foreground px-4 py-3 text-center">Resume</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-muted-foreground px-4 py-3">Reward</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-muted-foreground px-4 py-3 text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-xs text-muted-foreground">
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin text-primary" />
                          <span>Loading candidate referrals...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : referrals.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-xs text-muted-foreground">
                        No candidate referrals submitted yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    referrals.map((r) => {
                      const rewardAmt = r.referralRewardAmount || r.referral_reward_amount || r.rewardAmount || r.reward_amount;
                      const hasReward = rewardAmt && !isNaN(parseFloat(rewardAmt)) && parseFloat(rewardAmt) > 0;
                      const resumeLink = r.resumeUrl || r.resume_url || r.candidateResumeUrl || r.candidate_resume_url;
                      return (
                        <TableRow key={r.id} className="hover:bg-muted/20 transition-colors border-b border-border/50">
                          <TableCell className="px-4 py-3 text-xs font-bold text-foreground">
                            <div>{r.candidateName || r.candidate_name || `Candidate #${r.candidate_id}`}</div>
                            <div className="text-[10px] text-muted-foreground font-normal">{r.candidateEmail || r.candidate_email}</div>
                          </TableCell>
                          <TableCell className="px-4 py-3 text-xs">
                            <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold">
                              {r.positionTitle || r.position_title || 'Open Role'}
                            </span>
                          </TableCell>
                          <TableCell className="px-4 py-3 text-xs text-center">
                            {resumeLink ? (
                              <a
                                href={resolveResumeUrl(resumeLink)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 font-bold text-[11px] border border-blue-500/20 transition-colors"
                                title="Open Candidate Resume"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                <span>Resume</span>
                                <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                              </a>
                            ) : (
                              <span className="text-muted-foreground text-[11px]">—</span>
                            )}
                          </TableCell>
                          <TableCell className="px-4 py-3 text-xs font-mono font-bold">
                            {hasReward ? (
                              <span className="text-emerald-600 dark:text-emerald-400">
                                ₹{parseFloat(rewardAmt).toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-muted-foreground font-normal text-[11px]">
                                Calculated upon hire
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="px-4 py-3 text-xs text-right">
                            {getReferralStatusBadge(r.status || r.referral_status, r.reward_status || r.rewardStatus)}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
