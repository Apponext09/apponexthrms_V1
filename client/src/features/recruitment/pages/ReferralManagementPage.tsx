import React, { useState } from 'react';
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

  const referrals = referralsResponse?.data || [];
  const candidates = candidatesResponse?.data || [];

  // Mock list of employees for selector
  const employees = [
    { id: 1, name: 'Amit Sharma', email: 'amit@apponext.com' },
    { id: 2, name: 'Priya Patel', email: 'priya@apponext.com' },
    { id: 3, name: 'Raj Singh', email: 'raj@apponext.com' },
  ];

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
      case 'submitted': return <Badge variant="outline" className="bg-blue-100 text-blue-800">Submitted</Badge>;
      case 'approved': return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Approved</Badge>;
      case 'hired': return <Badge variant="outline" className="bg-green-100 text-green-800">Candidate Hired</Badge>;
      case 'rejected': return <Badge variant="outline" className="bg-red-100 text-red-800">Rejected</Badge>;
      case 'reward_paid': return <Badge variant="outline" className="bg-emerald-100 text-emerald-800">Reward Paid</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Employee Referrals</h1>
          <p className="text-gray-500 mt-1">Track and manage employee-submitted candidate referrals and payout rewards.</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" /> Submit Referral
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Candidate</TableHead>
                <TableHead>Referred By (Employee)</TableHead>
                <TableHead>Reward Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                    Loading referrals...
                  </TableCell>
                </TableRow>
              ) : referrals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                    No referrals recorded. Click "Submit Referral" to get started.
                  </TableCell>
                </TableRow>
              ) : (
                referrals.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div>
                        <div className="font-semibold text-gray-900">{r.candidate_name || `Candidate #${r.candidate_id}`}</div>
                        <div className="text-xs text-gray-500">{r.candidate_email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-semibold text-gray-900">{r.referrer_name || `Employee #${r.referrer_employee_id}`}</div>
                        <div className="text-xs text-gray-500">{r.referrer_email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {r.referral_reward_amount ? `INR ${parseFloat(r.referral_reward_amount).toLocaleString()}` : '—'}
                    </TableCell>
                    <TableCell>{getStatusBadge(r.status || r.referral_status)}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          apiClient.get(`/recruitment/referrals/${r.id}/progress`).then((res) => {
                            setSelectedReferral({ ...r, ...res.data.data });
                          });
                        }}
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
                          className="bg-emerald-600 hover:bg-emerald-700"
                        >
                          <DollarSign className="h-3 w-3 mr-1" /> Pay Reward
                        </Button>
                      )}
                      <Button variant="outline" size="icon" onClick={() => handleDelete(r.id)} className="text-red-600 hover:bg-red-50">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
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
                  <h3 className="font-bold text-gray-900 text-lg">{selectedReferral.candidate_name || 'Candidate'}</h3>
                  <p className="text-sm text-gray-500">{selectedReferral.candidate_email}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="font-semibold text-gray-500">Referred By:</div>
                  <div className="text-gray-900">{selectedReferral.referrer_name || 'Employee'}</div>

                  <div className="font-semibold text-gray-500">Application Status:</div>
                  <div className="text-gray-900 capitalize font-medium">{selectedReferral.applicationStatus || 'Unapplied'}</div>

                  <div className="font-semibold text-gray-500">Referral Status:</div>
                  <div>{getStatusBadge(selectedReferral.referralStatus || selectedReferral.referral_status)}</div>

                  <div className="font-semibold text-gray-500">Reward Payout:</div>
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
