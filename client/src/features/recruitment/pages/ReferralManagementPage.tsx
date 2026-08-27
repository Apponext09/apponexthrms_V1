import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Eye, DollarSign, Trash2, CheckCircle, Clock } from 'lucide-react';
import { useReferrals, useCreateReferral, useRewardReferral, useDeleteReferral } from '../hooks/useReferrals';
import { useCandidates } from '../hooks/useCandidates';
import { apiClient } from '@/lib/api';

export const ReferralManagementPage: React.FC = () => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedReferral, setSelectedReferral] = useState<any>(null);
  const [isRewardOpen, setIsRewardOpen] = useState(false);
  const [rewardAmount, setRewardAmount] = useState('');
  const [rewardType, setRewardType] = useState('cash');

  const [form, setForm] = useState({
    employeeId: '',
    candidateId: '',
    referralRewardAmount: '',
  });

  const { data: referralsResponse, isLoading } = useReferrals();
  const { data: candidatesResponse } = useCandidates({ pageSize: 100 });

  const createReferralMutation = useCreateReferral();
  const rewardReferralMutation = useRewardReferral(selectedReferral?.id || 0);
  const deleteReferralMutation = useDeleteReferral();

  const referrals = Array.isArray(referralsResponse?.data) ? referralsResponse.data : (referralsResponse?.items || []);
  const candidates = Array.isArray(candidatesResponse?.data) ? candidatesResponse.data : (candidatesResponse?.items || []);

  const [employees, setEmployees] = useState<any[]>([]);

  useEffect(() => {
    apiClient.get('/employees', { params: { pageSize: 500 } })
      .then((res) => {
        if (res.data?.success) {
          const items = Array.isArray(res.data.data) ? res.data.data : (res.data.data?.items || []);
          const mapped = items.map((emp: any) => ({
            id: emp.id,
            name: `${emp.firstName || emp.first_name || ''} ${emp.lastName || emp.last_name || ''}`.trim() || emp.name || emp.email,
            email: emp.email || '',
          }));
          setEmployees(mapped);
        }
      })
      .catch((err) => console.error('Failed to load employees', err));
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.employeeId || !form.candidateId) return;

    await createReferralMutation.mutateAsync({
      employeeId: parseInt(form.employeeId, 10),
      candidateId: parseInt(form.candidateId, 10),
      referralRewardAmount: form.referralRewardAmount ? parseFloat(form.referralRewardAmount) : undefined,
    });

    setIsCreateOpen(false);
    setForm({
      employeeId: '',
      candidateId: '',
      referralRewardAmount: '',
    });
  };

  const handleReward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReferral || !rewardAmount) return;

    await rewardReferralMutation.mutateAsync({
      rewardAmount: parseFloat(rewardAmount),
      rewardType,
    });

    setIsRewardOpen(false);
    setSelectedReferral(null);
    setRewardAmount('');
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this referral?')) return;
    await deleteReferralMutation.mutateAsync(id);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'submitted': return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Submitted</Badge>;
      case 'approved': return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Approved</Badge>;
      case 'hired': return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Candidate Hired</Badge>;
      case 'rejected': return <Badge variant="outline" className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Rejected</Badge>;
      case 'reward_paid': return <Badge variant="outline" className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Reward Paid</Badge>;
      default: return <Badge variant="outline" className="bg-muted text-muted-foreground border-border/80 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">{status}</Badge>;
    }
  };

  const hiredCount = referrals.filter((r: any) => r.status === 'hired' || r.referral_status === 'hired' || r.status === 'reward_paid' || r.referral_status === 'reward_paid').length;
  const rewardPaidCount = referrals.filter((r: any) => r.status === 'reward_paid' || r.referral_status === 'reward_paid').length;

  return (
    <div className="flex-1 space-y-6 max-w-full overflow-hidden p-6 min-h-[calc(100vh-4rem)]">
      {/* ── Top Header Banner ────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-6 rounded-2xl border border-border/80 shadow-2xs relative overflow-hidden">
        <div className="flex items-center gap-3.5 relative z-10">
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold shrink-0 border border-emerald-500/20 shadow-xs">
            <DollarSign className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
              Employee Referrals
            </h1>
            <p className="text-xs text-muted-foreground">
              Track candidate referrals submitted by employees, review candidate progression, and disburse bonus payouts.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 relative z-10 w-full sm:w-auto">
          <Button 
            onClick={() => setIsCreateOpen(true)} 
            className="h-9 px-4 text-xs font-bold gap-1.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" /> Submit Referral
          </Button>
        </div>
      </div>

      {/* ── KPI Stats Widgets ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card border-border/80 shadow-2xs rounded-2xl overflow-hidden">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Referrals</p>
              <h3 className="text-2xl font-black text-foreground mt-1">{referrals.length}</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Clock className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/80 shadow-2xs rounded-2xl overflow-hidden">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Hired from Referrals</p>
              <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{hiredCount}</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/80 shadow-2xs rounded-2xl overflow-hidden">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Rewards Paid</p>
              <h3 className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">{rewardPaidCount}</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <DollarSign className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Table Container ──────────────────────────────────────────────────── */}
      <Card className="bg-card border-border/80 shadow-2xs rounded-2xl overflow-hidden">
        <CardContent className="p-0">
          <div className="w-full overflow-x-auto">
            <Table className="min-w-[900px] border-collapse">
              <TableHeader className="bg-muted/50 border-b border-border/60">
                <TableRow className="border-border/60">
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider py-3.5 px-5 text-muted-foreground">Candidate</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider py-3.5 px-4 text-muted-foreground">Referred By (Employee)</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider py-3.5 px-4 text-muted-foreground">Reward Amount</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider py-3.5 px-4 text-muted-foreground text-center">Status</TableHead>
                  <TableHead className="text-right text-[11px] font-bold uppercase tracking-wider py-3.5 px-5 text-muted-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-border/60">
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-muted-foreground text-xs bg-background">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                        <span>Loading referral submissions...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : referrals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-muted-foreground text-xs bg-background">
                      No referrals recorded yet. Click "Submit Referral" to register an applicant.
                    </TableCell>
                  </TableRow>
                ) : (
                  referrals.map((r: any) => {
                    const candId = r.candidateId || r.candidate_id;
                    const candObj = candidates.find((c: any) => c.id === candId);
                    const candName = (r.candidateName && r.candidateName !== 'Candidate')
                      ? r.candidateName
                      : (r.candidate_name && r.candidate_name !== 'Candidate')
                      ? r.candidate_name
                      : candObj
                      ? `${candObj.first_name || candObj.firstName || ''} ${candObj.last_name || candObj.lastName || ''}`.trim() || candObj.name
                      : (candId ? `Candidate #${candId}` : 'Candidate');
                    const candEmail = r.candidateEmail || r.candidate_email || candObj?.email || '';

                    const refId = r.referrerEmployeeId || r.referrer_employee_id;
                    const empObj = employees.find((e: any) => e.id === refId);
                    const refName = (r.referrerName && r.referrerName !== 'Employee')
                      ? r.referrerName
                      : (r.referrer_name && r.referrer_name !== 'Employee')
                      ? r.referrer_name
                      : empObj
                      ? empObj.name
                      : (refId ? `Employee #${refId}` : 'Employee');
                    const refEmail = r.referrerEmail || r.referrer_email || empObj?.email || '';

                    const rewardAmt = r.referralRewardAmount || r.referral_reward_amount || r.rewardAmount || r.reward_amount;
                    const initials = candName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || 'CA';

                    return (
                      <TableRow key={r.id} className="border-border/60 hover:bg-muted/40 transition-colors">
                        <TableCell className="py-3.5 px-5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0 border border-emerald-500/20">
                              {initials}
                            </div>
                            <div>
                              <div className="font-bold text-foreground text-xs">{candName}</div>
                              {candEmail && <div className="text-[11px] text-muted-foreground font-mono">{candEmail}</div>}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-3.5 px-4">
                          <div>
                            <div className="font-semibold text-foreground text-xs">{refName}</div>
                            {refEmail && <div className="text-[11px] text-muted-foreground font-mono">{refEmail}</div>}
                          </div>
                        </TableCell>
                        <TableCell className="py-3.5 px-4">
                          <span className="font-mono text-xs font-bold text-foreground">
                            {rewardAmt ? `INR ${parseFloat(rewardAmt).toLocaleString()}` : '—'}
                          </span>
                        </TableCell>
                        <TableCell className="py-3.5 px-4 text-center">{getStatusBadge(r.status || r.referral_status || r.referralStatus)}</TableCell>
                        <TableCell className="text-right py-3.5 px-5">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => {
                                apiClient.get(`/recruitment/referrals/${r.id}/progress`).then((res) => {
                                  setSelectedReferral({ ...r, ...res.data.data });
                                });
                              }}
                              className="h-8 w-8 rounded-lg border-border hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer shadow-2xs"
                              title="View Referral Progress"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {(r.status === 'hired' || r.referral_status === 'hired') && (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => {
                                  setSelectedReferral(r);
                                  setIsRewardOpen(true);
                                }}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 px-3 rounded-lg shadow-2xs cursor-pointer gap-1"
                              >
                                <DollarSign className="h-3 w-3" /> Pay Reward
                              </Button>
                            )}
                            <Button 
                              variant="outline" 
                              size="icon" 
                              onClick={() => handleDelete(r.id)} 
                              className="h-8 w-8 rounded-lg border-border hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 cursor-pointer shadow-2xs"
                              title="Delete Referral"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* SUBMIT REFERRAL DIALOG */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Submit Employee Referral</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <Label htmlFor="employeeId">Referring Employee</Label>
              <Select value={form.employeeId} onValueChange={(val) => setForm(f => ({ ...f, employeeId: val }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id.toString()}>
                      {emp.name} ({emp.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="candidateId">Select Referred Candidate</Label>
              <Select value={form.candidateId} onValueChange={(val) => setForm(f => ({ ...f, candidateId: val }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose candidate" />
                </SelectTrigger>
                <SelectContent>
                  {candidates.map((cand: any) => (
                    <SelectItem key={cand.id} value={cand.id.toString()}>
                      {cand.first_name} {cand.last_name || ''} ({cand.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="referralRewardAmount">Referral Reward Amount (Optional)</Label>
              <Input
                id="referralRewardAmount"
                type="number"
                value={form.referralRewardAmount}
                onChange={(e) => setForm(f => ({ ...f, referralRewardAmount: e.target.value }))}
                placeholder="e.g. 15000"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createReferralMutation.isPending}>
                Submit Referral
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* REWARD PAYOUT DIALOG */}
      <Dialog open={isRewardOpen} onOpenChange={setIsRewardOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Process Referral Payout</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleReward} className="space-y-4">
            <div>
              <Label htmlFor="rewardAmount">Payout Amount (INR)</Label>
              <Input
                id="rewardAmount"
                type="number"
                value={rewardAmount}
                onChange={(e) => setRewardAmount(e.target.value)}
                placeholder="e.g. 15000"
                required
              />
            </div>
            <div>
              <Label htmlFor="rewardType">Payment Type</Label>
              <Select value={rewardType} onValueChange={setRewardType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash / Bank Transfer</SelectItem>
                  <SelectItem value="payroll">Payroll Addition</SelectItem>
                  <SelectItem value="giftcard">Gift Card</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setIsRewardOpen(false); setSelectedReferral(null); }}>Cancel</Button>
              <Button type="submit" disabled={rewardReferralMutation.isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                Confirm Payout
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DETAILS / PROGRESS MODAL */}
      <Dialog open={!!selectedReferral && !isRewardOpen} onOpenChange={() => setSelectedReferral(null)}>
        <DialogContent className="max-w-md">
          {selectedReferral && (
            <>
              <DialogHeader>
                <DialogTitle>Referral Progress & Details</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="border-b pb-4">
                  <h3 className="font-bold text-foreground text-lg">
                    {selectedReferral.candidateName || selectedReferral.candidate_name || 'Candidate'}
                  </h3>
                  {(selectedReferral.candidateEmail || selectedReferral.candidate_email) && (
                    <p className="text-xs text-muted-foreground font-mono">{selectedReferral.candidateEmail || selectedReferral.candidate_email}</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="font-semibold text-muted-foreground">Referred By:</div>
                  <div className="text-foreground font-medium">{selectedReferral.referrerName || selectedReferral.referrer_name || 'Employee'}</div>

                  <div className="font-semibold text-muted-foreground">Application Status:</div>
                  <div className="text-foreground capitalize font-medium">{selectedReferral.applicationStatus || 'Unapplied'}</div>

                  <div className="font-semibold text-muted-foreground">Referral Status:</div>
                  <div>{getStatusBadge(selectedReferral.referralStatus || selectedReferral.referral_status)}</div>

                  <div className="font-semibold text-muted-foreground">Reward Payout:</div>
                  <div>{getStatusBadge(selectedReferral.rewardStatus || selectedReferral.reward_status)}</div>
                </div>

                <div className="border-t pt-4 flex justify-end">
                  <Button variant="outline" onClick={() => setSelectedReferral(null)}>Close</Button>
                </div>
              </div>
            </>
          )}

        </DialogContent>
      </Dialog>
    </div>
  );
};
