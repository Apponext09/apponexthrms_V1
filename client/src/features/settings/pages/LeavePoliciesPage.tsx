import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Edit2, CheckCircle2, XCircle, ShieldCheck, HelpCircle } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { toast } from 'sonner';

interface LeaveType {
  id: number;
  leaveName?: string;
  leave_name?: string;
  leaveCode?: string;
  leave_code?: string;
  annualQuota?: number;
  annual_quota?: number;
  carryForwardEnabled?: boolean;
  carry_forward_enabled?: boolean;
  carryForwardLimit?: number;
  carry_forward_limit?: number;
  status: 'active' | 'inactive';
  allowNegativeBalance?: boolean;
  allow_negative_balance?: boolean;
  negativeBalanceAction?: string;
  negative_balance_action?: string;
  poolFromLeaveTypeId?: number;
  pool_from_leave_type_id?: number;
  paidType?: 'paid' | 'unpaid' | 'half_paid';
  paid_type?: 'paid' | 'unpaid' | 'half_paid';
}

export function LeavePoliciesPage() {
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const PREDEFINED_TYPES = [
    { name: 'Casual Leave', code: 'CL' },
    { name: 'Sick Leave', code: 'SL' },
    { name: 'Earned Leave', code: 'EL' },
    { name: 'Privilege Leave', code: 'PL' },
    { name: 'Maternity Leave', code: 'ML' },
    { name: 'Paternity Leave', code: 'PL' },
    { name: 'Compensatory Off', code: 'COMP-OFF' },
    { name: 'Loss of Pay', code: 'LOP' },
    { name: 'Other (Custom)', code: 'CUSTOM' }
  ];

  const [isCustom, setIsCustom] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState('');
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  const [form, setForm] = useState({
    id: null as number | null,
    leave_name: '',
    leave_code: '',
    annual_quota: 12,
    carry_forward_enabled: false,
    carry_forward_limit: 5,
    status: 'active',
    allow_negative_balance: false,
    negative_balance_action: 'LOP' as 'LOP' | 'CARRY_FORWARD' | 'POOL_FROM_OTHER_LEAVE' | 'MANUAL_APPROVAL_REQUIRED',
    pool_from_leave_type_id: '' as string | number,
    paid_type: 'paid' as 'paid' | 'unpaid' | 'half_paid',
  });

  const fetchLeaveTypes = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/settings/leave-types');
      if (res.data?.success) {
        setLeaveTypes(res.data.data || []);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load leave categories.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaveTypes();
  }, []);

  const openModal = (lt?: LeaveType) => {
    if (lt) {
      const name = lt.leaveName || lt.leave_name || '';
      const code = lt.leaveCode || lt.leave_code || '';
      const isPreset = PREDEFINED_TYPES.find(p => p.name === name && p.code === code);
      setSelectedPreset(isPreset ? isPreset.name : 'CUSTOM');
      setIsCustom(!isPreset);
      setForm({
        id: lt.id,
        leave_name: name,
        leave_code: code,
        annual_quota: lt.annualQuota ?? lt.annual_quota ?? 12,
        carry_forward_enabled: lt.carryForwardEnabled ?? lt.carry_forward_enabled ?? false,
        carry_forward_limit: lt.carryForwardLimit ?? lt.carry_forward_limit ?? 5,
        status: lt.status || 'active',
        allow_negative_balance: lt.allowNegativeBalance ?? lt.allow_negative_balance ?? false,
        negative_balance_action: (lt.negativeBalanceAction ?? lt.negative_balance_action ?? 'LOP') as any,
        pool_from_leave_type_id: lt.poolFromLeaveTypeId ?? lt.pool_from_leave_type_id ?? '',
        paid_type: lt.paidType || lt.paid_type || 'paid',
      });
    } else {
      setSelectedPreset('');
      setIsCustom(false);
      setForm({
        id: null,
        leave_name: '',
        leave_code: '',
        annual_quota: 12,
        carry_forward_enabled: false,
        carry_forward_limit: 5,
        status: 'active',
        allow_negative_balance: false,
        negative_balance_action: 'LOP',
        pool_from_leave_type_id: '',
        paid_type: 'paid',
      });
    }
    setIsOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.leave_name || !form.leave_code) {
      toast.error('Name and Code are required fields.');
      return;
    }

    try {
      if (form.id) {
        await apiClient.put(`/settings/leave-types/${form.id}`, form);
        toast.success('Leave category updated successfully!');
      } else {
        await apiClient.post('/settings/leave-types', form);
        toast.success('Leave category created and assigned successfully!');
      }
      setIsOpen(false);
      fetchLeaveTypes();
    } catch (err: any) {
      console.error(err);
      const errorMsg = err.response?.data?.message || 'Failed to save leave category.';
      toast.error(errorMsg);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to deactivate and remove this leave category? Existing records will be preserved.')) return;

    try {
      await apiClient.delete(`/settings/leave-types/${id}`);
      toast.success('Leave category deactivated successfully.');
      fetchLeaveTypes();
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete leave category.');
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Leave Quota Settings</h1>
          <p className="text-gray-500 text-sm mt-1">Configure leave categories, quotas, and carrying rules that apply to employees.</p>
        </div>
        <Button onClick={() => openModal()} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" /> Add Leave Category
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            Leave Quota Policies
          </CardTitle>
          <CardDescription>
            Editing quotas will automatically calculate and adjust existing employee balances.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-gray-500 text-sm">Loading leave categories...</div>
          ) : leaveTypes.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">No leave categories configured.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Leave Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Annual Quota (Days)</TableHead>
                  <TableHead>Paid Type</TableHead>
                  <TableHead>Carry Forward</TableHead>
                  <TableHead>Negative Policy</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaveTypes.map((lt) => {
                  const hasNeg = lt.allowNegativeBalance ?? lt.allow_negative_balance;
                  const action = lt.negativeBalanceAction ?? lt.negative_balance_action;
                  const poolId = lt.poolFromLeaveTypeId ?? lt.pool_from_leave_type_id;
                  const poolTarget = poolId ? leaveTypes.find(t => t.id === poolId) : null;
                  const poolName = poolTarget ? (poolTarget.leaveName || poolTarget.leave_name) : '';

                  return (
                    <TableRow key={lt.id} className={lt.status === 'inactive' ? 'opacity-60' : ''}>
                      <TableCell className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                        {lt.leaveName || lt.leave_name}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{lt.leaveCode || lt.leave_code}</TableCell>
                      <TableCell className="font-mono text-sm font-bold">{lt.annualQuota ?? lt.annual_quota} Days</TableCell>
                      <TableCell className="text-xs">
                        {(lt.paidType || lt.paid_type) === 'paid' && (
                          <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded font-bold dark:bg-blue-950/20">Paid</span>
                        )}
                        {(lt.paidType || lt.paid_type) === 'unpaid' && (
                          <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded font-bold dark:bg-rose-950/20">Unpaid</span>
                        )}
                        {(lt.paidType || lt.paid_type) === 'half_paid' && (
                          <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded font-bold dark:bg-amber-950/20">Half Paid</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {(lt.carryForwardEnabled ?? lt.carry_forward_enabled) ? (
                          <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded font-bold dark:bg-emerald-950/20">
                            Yes (Max {lt.carryForwardLimit ?? lt.carry_forward_limit} Days)
                          </span>
                        ) : (
                          <span className="text-gray-500 bg-gray-50 px-2 py-0.5 rounded font-medium dark:bg-gray-800/40">No</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {hasNeg ? (
                          <>
                            {action === 'LOP' && (
                              <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-bold dark:bg-amber-950/20">LOP</span>
                            )}
                            {action === 'CARRY_FORWARD' && (
                              <span className="text-purple-700 bg-purple-50 px-2 py-0.5 rounded font-bold dark:bg-purple-950/20">Carry Forward</span>
                            )}
                            {action === 'POOL_FROM_OTHER_LEAVE' && (
                              <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded font-bold dark:bg-blue-950/20">Pool: {poolName || 'Other'}</span>
                            )}
                            {action === 'MANUAL_APPROVAL_REQUIRED' && (
                              <span className="text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded font-bold dark:bg-cyan-950/20">Manual</span>
                            )}
                          </>
                        ) : (
                          <span className="text-gray-400 bg-gray-50 px-2 py-0.5 rounded dark:bg-gray-800/40">Block</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {lt.status === 'active' ? (
                          <span className="text-green-600 bg-green-50 px-2 py-0.5 rounded font-bold dark:bg-green-950/20">Active</span>
                        ) : (
                          <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded font-bold dark:bg-rose-950/20">Inactive</span>
                        )}
                      </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => openModal(lt)}>
                          <Edit2 className="w-4 h-4 text-gray-500 hover:text-blue-600" />
                        </Button>
                        {lt.status === 'active' && (
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(lt.id)}>
                            <Trash2 className="w-4 h-4 text-gray-500 hover:text-red-600" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Leave Category Dialog Form */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[450px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? 'Edit Leave Category' : 'Create Leave Category'}</DialogTitle>
            <DialogDescription>
              Set parameters for employee leave allocations.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="grid gap-4 py-4">
            {!form.id && (
              <div className="space-y-2">
                <Label>Select Category Preset</Label>
                <Select
                  value={selectedPreset}
                  onValueChange={(val) => {
                    setSelectedPreset(val);
                    if (val === 'CUSTOM') {
                      setIsCustom(true);
                      setForm({ ...form, leave_name: '', leave_code: '' });
                    } else {
                      setIsCustom(false);
                      const preset = PREDEFINED_TYPES.find(p => p.name === val);
                      if (preset) {
                        setForm({ ...form, leave_name: preset.name, leave_code: preset.code });
                      }
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a preset..." />
                  </SelectTrigger>
                  <SelectContent>
                    {PREDEFINED_TYPES.map(p => (
                      <SelectItem key={p.name} value={p.name}>{p.name} ({p.code})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {(isCustom || form.id) && (
              <>
                <div className="space-y-2 animate-in fade-in duration-200">
                  <Label>Leave Name</Label>
                  <Input 
                    value={form.leave_name} 
                    onChange={(e) => setForm({...form, leave_name: e.target.value})} 
                    placeholder="e.g. Special Leave" 
                    disabled={form.id !== null}
                  />
                </div>

                <div className="space-y-2 animate-in fade-in duration-200">
                  <Label>Leave Code (Uppercase)</Label>
                  <Input 
                    value={form.leave_code} 
                    onChange={(e) => setForm({...form, leave_code: e.target.value})} 
                    placeholder="e.g. SPL" 
                    disabled={form.id !== null}
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label>Annual Quota (Days)</Label>
              <Input 
                type="number"
                value={form.annual_quota} 
                onChange={(e) => setForm({...form, annual_quota: parseInt(e.target.value, 10) || 0})} 
              />
            </div>

            <div className="space-y-2">
              <Label>Paid Type</Label>
              <Select 
                value={form.paid_type} 
                onValueChange={(val: any) => setForm({...form, paid_type: val})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Paid Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                  <SelectItem value="half_paid">Half Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Carry Forward Policy</Label>
              <div className="flex items-center gap-2 mt-2 cursor-pointer" onClick={() => setForm({...form, carry_forward_enabled: !form.carry_forward_enabled})}>
                {form.carry_forward_enabled ? <CheckCircle2 className="w-5 h-5 text-blue-600" /> : <XCircle className="w-5 h-5 text-gray-400" />}
                <span className="text-sm font-medium text-gray-700">Allow carry forward to next year</span>
              </div>
            </div>

            {form.carry_forward_enabled && (
              <div className="space-y-2 pl-6 animate-in fade-in slide-in-from-top-1">
                <Label>Maximum Carry Forward Limit (Days)</Label>
                <Input 
                  type="number"
                  value={form.carry_forward_limit} 
                  onChange={(e) => setForm({...form, carry_forward_limit: parseInt(e.target.value, 10) || 0})} 
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Negative Balance Policy</Label>
              <div className="flex items-center gap-2 mt-2 cursor-pointer" onClick={() => setForm({...form, allow_negative_balance: !form.allow_negative_balance})}>
                {form.allow_negative_balance ? <CheckCircle2 className="w-5 h-5 text-blue-600" /> : <XCircle className="w-5 h-5 text-gray-400" />}
                <span className="text-sm font-medium text-gray-700">Allow negative balance for this leave type?</span>
              </div>
            </div>

            {form.allow_negative_balance && (
              <div className="space-y-4 pl-6 border-l-2 border-blue-100 animate-in fade-in slide-in-from-top-1">
                <div className="space-y-2">
                  <Label>When balance goes negative, what should happen?</Label>
                  <Select 
                    value={form.negative_balance_action} 
                    onValueChange={(val: any) => setForm({...form, negative_balance_action: val})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Strategy" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOP">Convert to Loss of Pay (LOP)</SelectItem>
                      <SelectItem value="CARRY_FORWARD">Carry forward to next cycle</SelectItem>
                      <SelectItem value="POOL_FROM_OTHER_LEAVE">Pool from another leave type</SelectItem>
                      <SelectItem value="MANUAL_APPROVAL_REQUIRED">Require manual HR approval</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">
                    {form.negative_balance_action === 'LOP' && "Extra days marked unpaid, sent for payroll deduction."}
                    {form.negative_balance_action === 'CARRY_FORWARD' && "Extra days subtracted from next cycle's allotted balance."}
                    {form.negative_balance_action === 'POOL_FROM_OTHER_LEAVE' && "Extra days deducted from the selected leave type's balance instead, if available."}
                    {form.negative_balance_action === 'MANUAL_APPROVAL_REQUIRED' && "HR is notified to decide per case (grant or convert to LOP)."}
                  </p>
                </div>

                {form.negative_balance_action === 'POOL_FROM_OTHER_LEAVE' && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                    <Label>Deduct from which leave type?</Label>
                    <Select 
                      value={String(form.pool_from_leave_type_id)} 
                      onValueChange={(val) => setForm({...form, pool_from_leave_type_id: Number(val)})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose target leave category..." />
                      </SelectTrigger>
                      <SelectContent>
                        {leaveTypes
                          .filter(lt => lt.id !== form.id && lt.status === 'active')
                          .map(lt => (
                            <SelectItem key={lt.id} value={String(lt.id)}>
                              {lt.leaveName || lt.leave_name} ({lt.leaveCode || lt.leave_code})
                            </SelectItem>
                          ))
                        }
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label>Status</Label>
              <Select 
                value={form.status} 
                onValueChange={(val) => setForm({...form, status: val})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-3 mt-4">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">Save</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
