import { useEffect, useState } from 'react';
import { apiClient } from '@/config/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { GitBranch, Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { AttendancePageHeader } from '../components/AttendancePageHeader';

type Option = {
  id: number;
  name?: string;
  firstName?: string;
  lastName?: string;
  first_name?: string;
  last_name?: string;
  employeeCode?: string;
  employee_code?: string;
};
type Scope = 'all' | 'departments' | 'employees';
type StepType = 'employee' | 'reporting_officer' | 'department' | 'role';
type ApprovalStep = { type: StepType; approverId: string };
type CreatedWorkflow = { id: number; workflow_name?: string; workflowName?: string; status?: string; is_published?: boolean; is_active?: boolean };

/** Standalone creator for attendance-correction workflows; no existing data is displayed. */
export default function WorkHourWorkflowPage() {
  const [name, setName] = useState('Work Hour Approval');
  const [scope, setScope] = useState<Scope>('all');
  const [departments, setDepartments] = useState<Option[]>([]);
  const [employees, setEmployees] = useState<Option[]>([]);
  const [roles, setRoles] = useState<Option[]>([]);
  const [departmentIds, setDepartmentIds] = useState<number[]>([]);
  const [employeeIds, setEmployeeIds] = useState<number[]>([]);
  const [approvalSteps, setApprovalSteps] = useState<ApprovalStep[]>([{ type: 'employee', approverId: '' }]);
  const [workflows, setWorkflows] = useState<CreatedWorkflow[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    apiClient.get('/workflow/settings/applicability/options').then(({ data }) => {
      setDepartments(data?.data?.departments || []); setEmployees(data?.data?.employees || []);
    }).catch(() => toast.error('Could not load departments and employees.'));
    apiClient.get('/workflow/settings/recipients/options').then(({ data }) => {
      setRoles(data?.data?.roles || []);
    });
    apiClient.get('/workflow/settings?type=attendance_regularization&pageSize=50').then(({ data }) => {
      setWorkflows(data?.data?.items || []);
    }).catch(() => toast.error('Could not load work-hour workflow status.'));
  }, []);

  const toggle = (id: number, values: number[], set: (value: number[]) => void) => set(values.includes(id) ? values.filter(v => v !== id) : [...values, id]);
  const employeeName = (e: Option) => e.name || `${e.firstName || e.first_name || ''} ${e.lastName || e.last_name || ''}`.trim() || `Employee #${e.id}`;

  const createWorkflow = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaveError(null);
    if (!name.trim()) return toast.error('Enter a workflow name.');
    if (scope === 'departments' && !departmentIds.length) return toast.error('Select at least one department.');
    if (scope === 'employees' && !employeeIds.length) return toast.error('Select at least one employee.');
    if (approvalSteps.some(step => step.type === 'employee' && !step.approverId)) return toast.error('Select an employee for every Employee step.');
    if (approvalSteps.some(step => step.type === 'role' && !step.approverId)) return toast.error('Select a role for every Role step.');
    if (approvalSteps.some(step => step.type === 'department' && !step.approverId)) return toast.error('Select a department for every Department Head step.');
    setSaving(true);
    try {
      const applicabilityFilters = scope === 'departments' ? { departmentIds } : scope === 'employees' ? { employeeIds } : {};
      const result = await apiClient.post('/workflow/settings', { workflowName: name.trim(), workflowType: 'attendance_regularization', approvalType: 'manual', isActive: true, applicabilityFilters });
      const workflow = result.data?.data;
      if (!workflow?.id) throw new Error('Workflow creation failed.');
      for (let index = 0; index < approvalSteps.length; index += 1) {
        const step = approvalSteps[index];
        await apiClient.post(`/workflow/settings/${workflow.id}/steps`, {
          stepNumber: index + 1, stepType: step.type, stepName: `Approval Level ${index + 1}`,
          ...(step.type === 'employee' ? { approverId: Number(step.approverId) } : {}),
          ...(step.type === 'role' ? { approverRoleId: Number(step.approverId) } : {}),
          ...(step.type === 'department' ? { approverDepartmentId: Number(step.approverId) } : {}),
        });
      }
      await apiClient.post(`/workflow/workflows/${workflow.id}/publish`);
      setWorkflows(current => [{ ...workflow, status: 'published', is_published: true, is_active: true }, ...current]);
      toast.success('Work-hour workflow created and published.');
      setName('Work Hour Approval'); setScope('all'); setDepartmentIds([]); setEmployeeIds([]); setApprovalSteps([{ type: 'employee', approverId: '' }]);
    } catch (error: any) {
      const message = error?.response?.data?.error?.message || error?.response?.data?.message || error?.message || 'Unable to create workflow.';
      setSaveError(message);
      toast.error(message);
    }
    finally { setSaving(false); }
  };

  return <main className="-m-4 min-h-full space-y-5 bg-[#F2F7FD] p-4 pb-12 font-['Plus_Jakarta_Sans',ui-sans-serif,system-ui,sans-serif] sm:-m-6 sm:p-6 dark:bg-background">
    <AttendancePageHeader icon={GitBranch} title="Work Hour Workflow" description="Set who approves work-hour correction requests and where each approval chain applies." />
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,1fr)]">
    <form onSubmit={createWorkflow} className="space-y-6 rounded-2xl border border-blue-100 bg-white p-5 shadow-sm sm:p-6 dark:border-border dark:bg-card">
      <div><h2 className="text-base font-bold text-[#0B2545] dark:text-foreground">Create approval workflow</h2><p className="mt-1 text-sm text-[#4A6285] dark:text-muted-foreground">Choose the employees covered and add approvers in order.</p></div>
      <div className="space-y-2"><Label htmlFor="workflow-name">Workflow name</Label><Input id="workflow-name" value={name} onChange={e => setName(e.target.value)} /></div>
      <fieldset className="space-y-3"><legend className="text-sm font-semibold">Apply workflow to</legend><div className="grid gap-3 sm:grid-cols-3">{(['all', 'departments', 'employees'] as Scope[]).map(value => <label key={value} className={`flex cursor-pointer gap-2 rounded-xl border p-3 text-sm focus-within:ring-2 focus-within:ring-blue-500 ${scope === value ? 'border-blue-500 bg-blue-50 text-blue-900 dark:bg-primary/10 dark:text-foreground' : 'border-border bg-card'}`}><input type="radio" name="workflow-scope" checked={scope === value} onChange={() => setScope(value)} />{value === 'all' ? 'All employees' : value === 'departments' ? 'Selected departments' : 'Selected employees'}</label>)}</div></fieldset>
      {scope === 'departments' && <div className="grid gap-2 rounded-lg border p-4 sm:grid-cols-2">{departments.map(d => <label key={d.id} className="flex items-center gap-2 text-sm"><Checkbox checked={departmentIds.includes(d.id)} onCheckedChange={() => toggle(d.id, departmentIds, setDepartmentIds)} />{d.name || `Department #${d.id}`}</label>)}</div>}
      {scope === 'employees' && <div className="grid gap-2 rounded-lg border p-4 sm:grid-cols-2">{employees.map(e => <label key={e.id} className="flex items-center gap-2 text-sm"><Checkbox checked={employeeIds.includes(e.id)} onCheckedChange={() => toggle(e.id, employeeIds, setEmployeeIds)} />{employeeName(e)}</label>)}</div>}
      <section className="space-y-3"><div className="flex items-center justify-between gap-3"><div><h2 className="font-semibold">Approval steps</h2><p className="text-xs text-muted-foreground">Approvers act in the order shown.</p></div><Button type="button" size="sm" variant="outline" onClick={() => setApprovalSteps([...approvalSteps, { type: 'employee', approverId: '' }])}><Plus className="mr-1 size-4" />Add step</Button></div>{approvalSteps.map((step, index) => <div key={index} className="grid gap-3 rounded-xl border border-blue-100 bg-blue-50/40 p-4 sm:grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-center dark:border-border dark:bg-muted/20"><strong className="whitespace-nowrap text-sm text-blue-800 dark:text-foreground">Level {index + 1}</strong><select aria-label={`Approver type for level ${index + 1}`} className="h-9 min-w-0 rounded-md border bg-background px-3 text-sm" value={step.type} onChange={e => setApprovalSteps(approvalSteps.map((value, i) => i === index ? { type: e.target.value as StepType, approverId: '' } : value))}><option value="employee">Employee name</option><option value="reporting_officer">Reporting manager / Team lead</option><option value="department">Department head</option><option value="role">Role (Manager, Team Lead, HR…)</option></select>{step.type === 'reporting_officer' ? <span className="text-sm text-muted-foreground">The requester's assigned manager</span> : <select required aria-label={`Approver for level ${index + 1}`} className="h-9 min-w-0 rounded-md border bg-background px-3 text-sm" value={step.approverId} onChange={e => setApprovalSteps(approvalSteps.map((value, i) => i === index ? { ...value, approverId: e.target.value } : value))}><option value="">Select {step.type === 'role' ? 'role' : step.type === 'department' ? 'department' : 'employee'}</option>{(step.type === 'role' ? roles : step.type === 'department' ? departments : employees).map(option => <option key={option.id} value={option.id}>{step.type === 'employee' ? employeeName(option) : option.name || `Option #${option.id}`}</option>)}</select>}<Button type="button" size="icon" variant="ghost" aria-label={`Remove level ${index + 1}`} disabled={approvalSteps.length === 1} onClick={() => setApprovalSteps(approvalSteps.filter((_, i) => i !== index))}><Trash2 className="size-4 text-destructive" /></Button></div>)}</section>
      <div className="flex flex-col items-end gap-3 border-t pt-5">{saveError && <p role="alert" className="w-full rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{saveError}</p>}<Button disabled={saving}>{saving && <Loader2 className="mr-2 size-4 animate-spin" />}{saving ? 'Creating…' : 'Create & Publish Workflow'}</Button></div>
    </form>
    <section className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm sm:p-6 dark:border-border dark:bg-card"><h2 className="font-bold text-[#0B2545] dark:text-foreground">Created workflows</h2><p className="mt-1 text-sm text-[#4A6285] dark:text-muted-foreground">Published workflows apply to new requests that match their scope.</p><div className="mt-4 space-y-2">{workflows.length ? workflows.map(workflow => <div key={workflow.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3 text-sm"><span className="font-medium">{workflow.workflow_name || workflow.workflowName || `Workflow #${workflow.id}`}</span><span className={workflow.status === 'published' && workflow.is_published !== false && workflow.is_active !== false ? 'rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700' : 'rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700'}>{workflow.status === 'published' && workflow.is_published !== false && workflow.is_active !== false ? 'Applied' : 'Not applied'}</span></div>) : <div className="rounded-xl border border-dashed p-5 text-center"><p className="text-sm text-muted-foreground">No workflows created yet.</p><p className="mt-1 text-xs text-muted-foreground">Use the form to create your first approval workflow.</p></div>}</div></section>
    </div>
  </main>;
}
