import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Edit2, CheckCircle2, XCircle, ShieldCheck, HelpCircle, Calendar } from 'lucide-react';
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
  encashmentEnabled?: boolean;
  encashment_enabled?: boolean;
  encashmentLimit?: number;
  encashment_limit?: number;
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
    encashment_enabled: false,
    encashment_limit: 15,
    status: 'active',
    allow_negative_balance: false,
    negative_balance_action: 'LOP' as 'LOP' | 'CARRY_FORWARD' | 'POOL_FROM_OTHER_LEAVE' | 'MANUAL_APPROVAL_REQUIRED',
    pool_from_leave_type_id: '' as string | number,
    paid_type: 'paid' as 'paid' | 'unpaid' | 'half_paid',
  });

  const [policies, setPolicies] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [designations, setDesignations] = useState<any[]>([]);
  const [mappings, setMappings] = useState<any[]>([]);
  const [mappingForm, setMappingForm] = useState({
    leavePolicyId: '',
    departmentId: '',
    designationId: '',
    employmentType: '',
    priority: 10,
  });
  const [isMappingModalOpen, setIsMappingModalOpen] = useState(false);

  const [blackoutPeriods, setBlackoutPeriods] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [isBlackoutModalOpen, setIsBlackoutModalOpen] = useState(false);
  const [blackoutForm, setBlackoutForm] = useState({
    start_date: '',
    end_date: '',
    reason: '',
    applicable_department_id: '',
    applicable_location_id: '',
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

  const fetchBlackoutPeriods = async () => {
    try {
      const res = await apiClient.get('/leaves/blackout-periods');
      if (res.data?.success) {
        setBlackoutPeriods(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load blackout periods', err);
    }
  };

  const fetchMappingMetadata = async () => {
    try {
      const [policiesRes, mappingsRes, deptsRes, optsRes, locsRes] = await Promise.all([
        apiClient.get('/leaves/policies').catch(() => ({ data: { data: [] } })),
        apiClient.get('/leaves/policy-mappings').catch(() => ({ data: { data: [] } })),
        apiClient.get('/settings/departments').catch(() => apiClient.get('/departments')).catch(() => ({ data: { data: [] } })),
        apiClient.get('/reports/options').catch(() => ({ data: { data: {} } })),
        apiClient.get('/settings/locations').catch(() => apiClient.get('/attendance/locations')).catch(() => ({ data: { data: [] } })),
      ]);

      setPolicies(policiesRes.data?.data || []);
      setMappings(mappingsRes.data?.data || []);
      setDepartments(deptsRes.data?.data || deptsRes.data || []);
      setDesignations(optsRes.data?.data?.designations || []);
      setLocations(locsRes.data?.data || locsRes.data || []);
      
      fetchBlackoutPeriods();
    } catch (err) {
      console.error('Failed to load policy mappings metadata', err);
    }
  };

  const handleSaveBlackout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blackoutForm.start_date || !blackoutForm.end_date || !blackoutForm.reason) {
      toast.error('Start date, end date, and reason are required.');
      return;
    }
    try {
      const res = await apiClient.post('/leaves/blackout-periods', {
        start_date: blackoutForm.start_date,
        end_date: blackoutForm.end_date,
        reason: blackoutForm.reason,
        applicable_department_id: blackoutForm.applicable_department_id ? parseInt(blackoutForm.applicable_department_id, 10) : null,
        applicable_location_id: blackoutForm.applicable_location_id ? parseInt(blackoutForm.applicable_location_id, 10) : null,
      });

      if (res.data?.success) {
        toast.success('Blackout period created successfully!');
        setIsBlackoutModalOpen(false);
        setBlackoutForm({
          start_date: '',
          end_date: '',
          reason: '',
          applicable_department_id: '',
          applicable_location_id: '',
        });
        fetchBlackoutPeriods();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.response?.data?.error?.message || 'Failed to create blackout period');
    }
  };

  const handleDeleteBlackout = async (id: number) => {
    try {
      const res = await apiClient.delete(`/leaves/blackout-periods/${id}`);
      if (res.data?.success) {
        toast.success('Blackout period deleted successfully');
        fetchBlackoutPeriods();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.response?.data?.error?.message || 'Failed to delete blackout period');
    }
  };

  const handleSaveMapping = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mappingForm.leavePolicyId) {
      toast.error('Please select a leave policy');
      return;
    }
    try {
      const res = await apiClient.post('/leaves/policy-mappings', {
        leavePolicyId: parseInt(mappingForm.leavePolicyId, 10),
        departmentId: mappingForm.departmentId ? parseInt(mappingForm.departmentId, 10) : null,
        designationId: mappingForm.designationId ? parseInt(mappingForm.designationId, 10) : null,
        employmentType: mappingForm.employmentType || null,
        priority: parseInt(mappingForm.priority as any, 10) || 10,
      });

      if (res.data?.success) {
        toast.success('Policy mapping created successfully!');
        setIsMappingModalOpen(false);
        setMappingForm({
          leavePolicyId: '',
          departmentId: '',
          designationId: '',
          employmentType: '',
          priority: 10,
        });
        fetchMappingMetadata();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.response?.data?.error?.message || 'Failed to create policy mapping');
    }
  };

  const handleDeleteMapping = async (id: number) => {
    try {
      const res = await apiClient.delete(`/leaves/policy-mappings/${id}`);
      if (res.data?.success) {
        toast.success('Policy mapping deleted successfully');
        fetchMappingMetadata();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.response?.data?.error?.message || 'Failed to delete policy mapping');
    }
  };

  useEffect(() => {
    fetchLeaveTypes();
    fetchMappingMetadata();
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
        encashment_enabled: lt.encashmentEnabled ?? lt.encashment_enabled ?? false,
        encashment_limit: lt.encashmentLimit ?? lt.encashment_limit ?? 15,
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
        encashment_enabled: false,
        encashment_limit: 15,
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
                  <TableHead>Encashment</TableHead>
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
                        {(lt.encashmentEnabled ?? lt.encashment_enabled) ? (
                          <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded font-bold dark:bg-blue-950/20">
                            Enabled ({lt.encashmentLimit ?? lt.encashment_limit} Days)
                          </span>
                        ) : (
                          <span className="text-gray-500 bg-gray-50 px-2 py-0.5 rounded font-medium dark:bg-gray-800/40">Disabled</span>
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

      {/* Bulk Policy Mappings Section */}
      <Card className="border shadow-sm rounded-xl mt-6">
        <CardHeader className="flex flex-row items-center justify-between pb-3 border-b">
          <div>
            <CardTitle className="text-base font-extrabold flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-600" /> Bulk Leave Policy Mappings
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Configure automatic mapping rules to assign leave policies to employees based on their Department, Designation, or Employment Type.
            </CardDescription>
          </div>
          <Button
            onClick={() => setIsMappingModalOpen(true)}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs h-9 rounded-xl gap-1.5 shadow"
          >
            <Plus className="w-4 h-4" /> Add New Mapping
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {mappings.length === 0 ? (
            <div className="p-10 text-center space-y-2 text-muted-foreground">
              <HelpCircle className="w-8 h-8 text-muted-foreground/40 mx-auto" />
              <p className="text-xs font-medium">No bulk policy mappings defined.</p>
              <p className="text-[10px] text-muted-foreground">Employees will receive the organization's default policy.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Mapped Leave Policy</TableHead>
                  <TableHead className="text-xs">Criteria (Dept/Desig/Type)</TableHead>
                  <TableHead className="text-xs text-center">Priority</TableHead>
                  <TableHead className="text-xs text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mappings.map((m) => {
                  const policyName = m.policyName || m.policy_name;
                  const departmentName = m.departmentName || m.department_name;
                  const designationName = m.designationName || m.designation_name;
                  const employmentType = m.employmentType || m.employment_type;

                  return (
                    <TableRow key={m.id} className="hover:bg-slate-50/50">
                      <TableCell className="text-xs font-bold text-foreground">
                        {policyName || 'Standard Policy'}
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="flex flex-wrap gap-1.5">
                          {departmentName && (
                            <span className="px-2 py-0.5 rounded bg-violet-50 text-violet-700 font-semibold border border-violet-100">
                              Dept: {departmentName}
                            </span>
                          )}
                          {designationName && (
                            <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-semibold border border-amber-100">
                              Desig: {designationName}
                            </span>
                          )}
                          {employmentType && (
                            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold border border-emerald-100 capitalize">
                              Type: {employmentType.replace('_', ' ')}
                            </span>
                          )}
                          {!departmentName && !designationName && !employmentType && (
                          <span className="text-muted-foreground italic">Global Fallback</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-center font-mono font-bold text-foreground">
                      {m.priority}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteMapping(m.id)}>
                        <Trash2 className="w-4 h-4 text-gray-500 hover:text-red-600" />
                      </Button>
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Blackout Periods Section */}
      <Card className="border shadow-sm rounded-xl mt-6">
        <CardHeader className="flex flex-row items-center justify-between pb-3 border-b">
          <div>
            <CardTitle className="text-base font-extrabold flex items-center gap-2">
              <Calendar className="w-5 h-5 text-rose-600" /> Blackout Periods
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Prevent employees from applying for leaves during critical periods. Apply rules globally or restrict them to a specific department or location.
            </CardDescription>
          </div>
          <Button
            onClick={() => setIsBlackoutModalOpen(true)}
            size="sm"
            className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs h-9 rounded-xl gap-1.5 shadow"
          >
            <Plus className="w-4 h-4" /> Add Blackout Period
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {blackoutPeriods.length === 0 ? (
            <div className="p-10 text-center space-y-2 text-muted-foreground">
              <Calendar className="w-8 h-8 text-muted-foreground/40 mx-auto" />
              <p className="text-xs font-medium">No blackout periods configured.</p>
              <p className="text-[10px] text-muted-foreground">Employees can apply for leave freely on all calendar dates.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Reason / Event</TableHead>
                  <TableHead className="text-xs">Date Range</TableHead>
                  <TableHead className="text-xs">Target Scope</TableHead>
                  <TableHead className="text-xs text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {blackoutPeriods.map((bp) => (
                  <TableRow key={bp.id} className="hover:bg-slate-50/50">
                    <TableCell className="text-xs font-bold text-foreground">
                      {bp.reason}
                    </TableCell>
                    <TableCell className="text-xs font-semibold text-foreground font-mono">
                      {(() => {
                        const formatSafe = (d: string) => {
                          if (!d) return 'N/A';
                          const dateObj = new Date(d);
                          return isNaN(dateObj.getTime()) ? String(d).split('T')[0] : dateObj.toLocaleDateString();
                        };
                        return `${formatSafe(bp.start_date || bp.startDate)} to ${formatSafe(bp.end_date || bp.endDate)}`;
                      })()}
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="flex flex-wrap gap-1.5">
                        {(bp.department_name || bp.departmentName) && (
                          <span className="px-2 py-0.5 rounded bg-violet-50 text-violet-700 font-semibold border border-violet-100">
                            Dept: {bp.department_name || bp.departmentName}
                          </span>
                        )}
                        {(bp.location_name || bp.locationName) && (
                          <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-semibold border border-amber-100">
                            Location: {bp.location_name || bp.locationName}
                          </span>
                        )}
                        {!(bp.department_name || bp.departmentName) && !(bp.location_name || bp.locationName) && (
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                            Global (All Employees)
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteBlackout(bp.id)}>
                        <Trash2 className="w-4 h-4 text-gray-500 hover:text-red-600" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Mapping Dialog Modal */}
      <Dialog open={isMappingModalOpen} onOpenChange={setIsMappingModalOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Add Bulk Policy Mapping</DialogTitle>
            <DialogDescription>
              Define the criteria for automatic policy assignment. Higher priority mappings will be resolved first.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveMapping} className="space-y-4 py-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Leave Policy *</Label>
              <select
                value={mappingForm.leavePolicyId}
                onChange={(e) => setMappingForm({ ...mappingForm, leavePolicyId: e.target.value })}
                className="w-full h-10 px-3 text-xs bg-muted/50 border rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-foreground font-semibold"
                required
              >
                <option value="">Select leave policy container...</option>
                {policies.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Department (Optional)</Label>
              <select
                value={mappingForm.departmentId}
                onChange={(e) => setMappingForm({ ...mappingForm, departmentId: e.target.value })}
                className="w-full h-10 px-3 text-xs bg-muted/50 border rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-foreground font-semibold"
              >
                <option value="">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Designation (Optional)</Label>
              <select
                value={mappingForm.designationId}
                onChange={(e) => setMappingForm({ ...mappingForm, designationId: e.target.value })}
                className="w-full h-10 px-3 text-xs bg-muted/50 border rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-foreground font-semibold"
              >
                <option value="">All Designations</option>
                {designations.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Employment Type (Optional)</Label>
              <select
                value={mappingForm.employmentType}
                onChange={(e) => setMappingForm({ ...mappingForm, employmentType: e.target.value })}
                className="w-full h-10 px-3 text-xs bg-muted/50 border rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-foreground font-semibold"
              >
                <option value="">All Types</option>
                <option value="full_time">Full-Time Permanent</option>
                <option value="part_time">Part-Time</option>
                <option value="contract">Contractor</option>
                <option value="intern">Intern</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Resolution Priority (Highest first)</Label>
              <Input
                type="number"
                value={mappingForm.priority}
                onChange={(e) => setMappingForm({ ...mappingForm, priority: parseInt(e.target.value, 10) || 10 })}
              />
              <p className="text-[10px] text-muted-foreground">Example: 100 will resolve before 10.</p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsMappingModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs h-10 px-5 rounded-xl">
                Add Mapping Rule
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Blackout Period Dialog Modal */}
      <Dialog open={isBlackoutModalOpen} onOpenChange={setIsBlackoutModalOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Add Blackout Period</DialogTitle>
            <DialogDescription>
              Block leave requests during a specific date range. Leaves overlapping these dates will be blocked for matching employees.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveBlackout} className="space-y-4 py-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Start Date *</Label>
                <input
                  type="date"
                  value={blackoutForm.start_date}
                  onChange={(e) => setBlackoutForm({ ...blackoutForm, start_date: e.target.value })}
                  onClick={(e) => {
                    try { e.currentTarget.showPicker(); } catch (err) {}
                  }}
                  className="w-full h-10 px-3 text-xs bg-muted/50 border rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-foreground font-semibold cursor-pointer"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">End Date *</Label>
                <input
                  type="date"
                  value={blackoutForm.end_date}
                  onChange={(e) => setBlackoutForm({ ...blackoutForm, end_date: e.target.value })}
                  onClick={(e) => {
                    try { e.currentTarget.showPicker(); } catch (err) {}
                  }}
                  className="w-full h-10 px-3 text-xs bg-muted/50 border rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-foreground font-semibold cursor-pointer"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Reason / Event Name *</Label>
              <Input
                type="text"
                placeholder="e.g. Annual Audit, Release Freeze"
                value={blackoutForm.reason}
                onChange={(e) => setBlackoutForm({ ...blackoutForm, reason: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Applicable Department (Optional)</Label>
              <select
                value={blackoutForm.applicable_department_id}
                onChange={(e) => setBlackoutForm({ ...blackoutForm, applicable_department_id: e.target.value })}
                className="w-full h-10 px-3 text-xs bg-muted/50 border rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-foreground font-semibold"
              >
                <option value="">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Applicable Location (Optional)</Label>
              <select
                value={blackoutForm.applicable_location_id}
                onChange={(e) => setBlackoutForm({ ...blackoutForm, applicable_location_id: e.target.value })}
                className="w-full h-10 px-3 text-xs bg-muted/50 border rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-foreground font-semibold"
              >
                <option value="">All Locations</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>{l.locationName || l.location_name || l.name}</option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsBlackoutModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs h-10 px-5 rounded-xl">
                Add Blackout Period
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

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
              <Label>Encashment Policy</Label>
              <div className="flex items-center gap-2 mt-2 cursor-pointer" onClick={() => setForm({...form, encashment_enabled: !form.encashment_enabled})}>
                {form.encashment_enabled ? <CheckCircle2 className="w-5 h-5 text-blue-600" /> : <XCircle className="w-5 h-5 text-gray-400" />}
                <span className="text-sm font-medium text-gray-700">Allow leave encashment (cash payouts)</span>
              </div>
            </div>

            {form.encashment_enabled && (
              <div className="space-y-2 pl-6 animate-in fade-in slide-in-from-top-1">
                <Label>Encashment Limit (Max Days/Year)</Label>
                <Input 
                  type="number"
                  value={form.encashment_limit} 
                  onChange={(e) => setForm({...form, encashment_limit: parseInt(e.target.value, 10) || 0})} 
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
