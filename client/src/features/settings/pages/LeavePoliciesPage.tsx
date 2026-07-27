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
                  <TableHead>Carry Forward</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaveTypes.map((lt) => (
                  <TableRow key={lt.id} className={lt.status === 'inactive' ? 'opacity-60' : ''}>
                    <TableCell className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                      {lt.leaveName || lt.leave_name}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{lt.leaveCode || lt.leave_code}</TableCell>
                    <TableCell className="font-mono text-sm font-bold">{lt.annualQuota ?? lt.annual_quota} Days</TableCell>
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
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Leave Category Dialog Form */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[425px]">
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
