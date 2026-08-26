import fs from 'fs';

const drawerPath = 'd:/Kosqu Projects/apponexthrms/client/src/features/workflow/components/settings/WorkflowSettingsDrawer.tsx';

const content = `import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Loader2, GitBranch, Check, MoreVertical, Sliders, Trash2, Plus } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { WorkflowStepCard } from './WorkflowStepCard';
import type { StepItemData } from './WorkflowStepCard';
import { StepTypeButtons } from './StepTypeButtons';
import { StepTargetModal } from './StepTargetModal';
import type { StepTargetType } from './StepTargetModal';
import { CustomizeStepFieldsModal } from './modals/CustomizeStepFieldsModal';
import type { CustomStepField } from './modals/CustomizeStepFieldsModal';
import {
  useWorkflowSettings,
  useWorkflowApplicabilityOptions,
  useWorkflowRecipients,
} from '../../hooks/useWorkflowSettings';
import type { WorkflowSetting, ApplicabilityFilters } from '../../hooks/useWorkflowSettings';
import { toast } from 'sonner';
import { apiClient as api } from '@/config/api';

type DrawerTab = 'filter' | 'workflow';

interface Props {
  open: boolean;
  onClose: () => void;
  editingWorkflow?: WorkflowSetting | null;
  onSaved: () => void;
}

const DEFAULT_STEP_NAMES: Record<string, string> = {
  reporting_officer: 'Reporting Officer',
  employee: 'Employee',
  department: 'Department Head',
  role: 'Role',
  system: 'System Auto Approval',
};

export function WorkflowSettingsDrawer({ open, onClose, editingWorkflow, onSaved }: Props) {
  const [activeTab, setActiveTab] = useState<DrawerTab>('filter');
  const [workflowName, setWorkflowName] = useState('');
  const [approvalType, setApprovalType] = useState<'manual' | 'auto'>('manual');
  const [isActive, setIsActive] = useState(true);

  const [selectedCompanies, setSelectedCompanies] = useState<number[]>([]);
  const [selectedDepts, setSelectedDepts] = useState<number[]>([]);
  const [selectedGrades, setSelectedGrades] = useState<number[]>([]);
  const [selectedEmpTypes, setSelectedEmpTypes] = useState<string[]>([]);
  const [selectedEmpIds, setSelectedEmpIds] = useState<number[]>([]);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const [localSteps, setLocalSteps] = useState<StepItemData[]>([]);

  // Universal Hidden Icons state
  const [globalHiddenIcons, setGlobalHiddenIcons] = useState<string[]>([]);
  const [globalCustomFieldsOpen, setGlobalCustomFieldsOpen] = useState(false);
  const [globalCustomFields, setGlobalCustomFields] = useState<CustomStepField[]>([]);

  const [targetModalType, setTargetModalType] = useState<StepTargetType | null>(null);
  const [saving, setSaving] = useState(false);

  const { createMutation, updateMutation } = useWorkflowSettings();
  const { data: appOptions, isLoading: loadingOptions } = useWorkflowApplicabilityOptions();
  const { data: recipientOptions } = useWorkflowRecipients();

  const companies = appOptions?.companies ?? [];
  const departments = appOptions?.departments ?? [];
  const grades = appOptions?.grades ?? [];
  const employeeTypes = appOptions?.employeeTypes ?? ['Full Time', 'Part Time', 'Intern', 'Contract', 'Consultant', 'Probation'];
  const employees = appOptions?.employees ?? [];
  const roles = recipientOptions?.roles ?? [];

  const editingId = editingWorkflow?.id ?? null;

  useEffect(() => {
    if (editingWorkflow) {
      setWorkflowName(editingWorkflow.workflow_name ?? '');
      const mode = ((editingWorkflow as any).approval_type as 'manual' | 'auto') ?? 'manual';
      setApprovalType(mode);
      setIsActive(editingWorkflow.is_active === 1 || editingWorkflow.is_active === true);
      const filters = editingWorkflow.applicabilityFilters ?? {};
      setSelectedCompanies(filters.companyIds ?? filters.companyLocationIds ?? []);
      setSelectedDepts(filters.departmentIds ?? []);
      setSelectedGrades(filters.gradeIds ?? []);
      setSelectedEmpTypes(filters.employeeTypes ?? []);
      setSelectedEmpIds(filters.employeeIds ?? []);

      if ((editingWorkflow as any).steps) {
        const existing = ((editingWorkflow as any).steps ?? []).map((s: any, idx: number) => ({
          tempId: \`existing_\${s.id || idx}_\${Date.now()}\`,
          id: s.id,
          step_number: s.step_number || idx + 1,
          step_name: s.step_name || (mode === 'auto' ? 'System Auto Approval' : 'Step'),
          approver_type: mode === 'auto' ? 'system' : (s.approver_type || 'reporting_officer'),
          approver_id: s.approver_id,
          approver_role_id: s.approver_role_id,
          approver_department_id: s.approver_department_id,
          formPermissions: s.formPermissions ?? {},
          escalationConfig: s.escalationConfig ?? {},
          notificationConfig: s.notificationConfig ?? {},
        }));
        setLocalSteps(existing);
      } else {
        setLocalSteps([]);
      }
    } else {
      setWorkflowName('');
      setApprovalType('manual');
      setIsActive(true);
      setSelectedCompanies([]);
      setSelectedDepts([]);
      setSelectedGrades([]);
      setSelectedEmpTypes([]);
      setSelectedEmpIds([]);
      setLocalSteps([
        {
          tempId: \`step_init_\${Date.now()}\`,
          step_number: 1,
          step_name: 'Reporting Officer',
          approver_type: 'reporting_officer',
          formPermissions: {},
          escalationConfig: {},
          notificationConfig: {},
        },
      ]);
    }
    setGlobalHiddenIcons([]);
    setGlobalCustomFields([]);
    setActiveTab('filter');
  }, [editingWorkflow, open]);

  // Handle switching approval type to Auto / Manual
  const handleSelectApprovalType = (type: 'manual' | 'auto') => {
    setApprovalType(type);

    if (type === 'auto') {
      // Automatically change workflow to System Auto Approval
      setLocalSteps((prev) => {
        if (prev.length === 0) {
          return [
            {
              tempId: \`step_system_\${Date.now()}\`,
              step_number: 1,
              step_name: 'System Auto Approval',
              approver_type: 'system',
              formPermissions: {},
              escalationConfig: { approvalMode: 'auto' },
              notificationConfig: {},
            },
          ];
        }
        return prev.map((s) => ({
          ...s,
          approver_type: 'system',
          step_name: 'System Auto Approval',
          escalationConfig: { ...s.escalationConfig, approvalMode: 'auto' },
        }));
      });
      toast.info('Auto Approve selected: Workflow changed to System');
    } else {
      // Switch back to Manual Approval
      setLocalSteps((prev) =>
        prev.map((s) => ({
          ...s,
          approver_type: s.approver_type === 'system' ? 'reporting_officer' : s.approver_type,
          step_name: s.step_name === 'System Auto Approval' ? 'Reporting Officer' : s.step_name,
          escalationConfig: { ...s.escalationConfig, approvalMode: 'manual' },
        }))
      );
      toast.info('Manual Approve selected: Workflow changed to Manual');
    }
  };

  const toggleExpand = (key: string) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleCompany = (id: number) => {
    setSelectedCompanies((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleDept = (id: number) => {
    setSelectedDepts((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleGrade = (id: number) => {
    setSelectedGrades((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleEmpType = (type: string) => {
    setSelectedEmpTypes((prev) => (prev.includes(type) ? prev.filter((x) => x !== type) : [...prev, type]));
  };

  const toggleEmpId = (id: number) => {
    setSelectedEmpIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleAddStepClick = (type: 'reporting_officer' | 'employee' | 'department' | 'role' | 'system') => {
    if (type === 'reporting_officer') {
      const newStep: StepItemData = {
        tempId: \`step_\${Date.now()}_\${Math.random().toString(36).substr(2, 5)}\`,
        step_number: localSteps.length + 1,
        step_name: 'Reporting Officer',
        approver_type: 'reporting_officer',
        formPermissions: {},
        escalationConfig: {},
        notificationConfig: {},
      };
      setLocalSteps((prev) => [...prev, newStep]);
    } else if (type === 'system') {
      const newStep: StepItemData = {
        tempId: \`step_\${Date.now()}_\${Math.random().toString(36).substr(2, 5)}\`,
        step_number: localSteps.length + 1,
        step_name: 'System Auto Approval',
        approver_type: 'system',
        formPermissions: {},
        escalationConfig: { approvalMode: 'auto' },
        notificationConfig: {},
      };
      setLocalSteps((prev) => [...prev, newStep]);
    } else {
      setTargetModalType(type as any);
    }
  };

  const handleTargetConfirm = ({ targetId, targetName }: { targetId: number; targetName: string }) => {
    if (!targetModalType) return;

    const newStep: StepItemData = {
      tempId: \`step_\${Date.now()}_\${Math.random().toString(36).substr(2, 5)}\`,
      step_number: localSteps.length + 1,
      step_name: targetName || DEFAULT_STEP_NAMES[targetModalType],
      approver_type: targetModalType,
      approver_id: targetModalType === 'employee' ? targetId : null,
      approver_department_id: targetModalType === 'department' ? targetId : null,
      approver_role_id: targetModalType === 'role' ? targetId : null,
      approver_name: targetName,
      formPermissions: {},
      escalationConfig: {},
      notificationConfig: {},
    };

    setLocalSteps((prev) => [...prev, newStep]);
    setTargetModalType(null);
  };

  const handleUpdateLocalStep = (tempId: string, updates: Partial<StepItemData>) => {
    setLocalSteps((prev) =>
      prev.map((s) => (s.tempId === tempId ? { ...s, ...updates } : s))
    );
  };

  const handleDeleteLocalStep = (tempId: string) => {
    setLocalSteps((prev) =>
      prev.filter((s) => s.tempId !== tempId).map((s, i) => ({ ...s, step_number: i + 1 }))
    );
  };

  const handleMoveDown = (index: number) => {
    if (index >= localSteps.length - 1) return;
    const next = [...localSteps];
    const tmp = next[index];
    next[index] = next[index + 1];
    next[index + 1] = tmp;
    setLocalSteps(next.map((s, i) => ({ ...s, step_number: i + 1 })));
  };

  const handleGlobalHideIcon = (iconKey: string, iconLabel: string) => {
    if (globalHiddenIcons.includes(iconKey)) return;
    setGlobalHiddenIcons((prev) => [...prev, iconKey]);
    toast.info(\`Hidden '\${iconLabel}' globally. Click three dots (⋮) in top-right corner to restore.\`);
  };

  const toggleGlobalIconVisibility = (iconKey: string, iconLabel: string) => {
    if (globalHiddenIcons.includes(iconKey)) {
      setGlobalHiddenIcons((prev) => prev.filter((x) => x !== iconKey));
      toast.success(\`Restored '\${iconLabel}' icon globally\`);
    } else {
      setGlobalHiddenIcons((prev) => [...prev, iconKey]);
      toast.info(\`Hidden '\${iconLabel}' icon globally\`);
    }
  };

  const handleRemoveCustomFieldFromMenu = (fieldId: string) => {
    setGlobalCustomFields((prev) => prev.filter((f) => f.id !== fieldId));
    toast.success('Removed custom field');
  };

  const handleSaveAll = async () => {
    if (!workflowName.trim()) {
      toast.error('Workflow name is required');
      setActiveTab('filter');
      return;
    }
    setSaving(true);

    const applicabilityFilters: ApplicabilityFilters = {
      companyIds: selectedCompanies,
      companyLocationIds: selectedCompanies,
      departmentIds: selectedDepts,
      gradeIds: selectedGrades,
      employeeTypes: selectedEmpTypes,
      employeeIds: selectedEmpIds,
    };

    try {
      let targetWfId = editingId;

      if (targetWfId) {
        await updateMutation.mutateAsync({
          id: targetWfId,
          workflowName,
          workflowType: 'general',
          approvalType,
          isActive,
          applicabilityFilters,
        });
      } else {
        const created = await createMutation.mutateAsync({
          workflowName,
          workflowType: 'general',
          approvalType,
          isActive,
          applicabilityFilters,
        });
        targetWfId = created.id;
      }

      if (targetWfId && localSteps.length > 0) {
        for (let i = 0; i < localSteps.length; i++) {
          const s = localSteps[i];
          if (s.id) {
            await api.patch(\`/workflow/settings/steps/\${s.id}\`, {
              workflowId: targetWfId,
              stepName: s.step_name,
              stepType: s.approver_type,
              approverId: s.approver_id,
              approverRoleId: s.approver_role_id,
              approverDepartmentId: s.approver_department_id,
              formPermissions: s.formPermissions,
              escalationConfig: s.escalationConfig,
              notificationConfig: s.notificationConfig,
            });
          } else {
            await api.post(\`/workflow/settings/\${targetWfId}/steps\`, {
              stepNumber: i + 1,
              stepType: s.approver_type,
              stepName: s.step_name,
              approverId: s.approver_id,
              approverRoleId: s.approver_role_id,
              approverDepartmentId: s.approver_department_id,
              formPermissions: s.formPermissions,
              escalationConfig: s.escalationConfig,
              notificationConfig: s.notificationConfig,
            });
          }
        }
      }

      toast.success(editingId ? 'Workflow updated successfully' : 'Workflow created successfully');
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to save workflow');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl h-[92vh] flex flex-col p-0 gap-0 border rounded-xl overflow-hidden shadow-xl bg-white dark:bg-gray-900 z-50">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b flex-shrink-0 flex flex-row items-center justify-between">
          <DialogTitle className="flex items-center gap-2.5 text-lg font-bold text-gray-900 dark:text-white">
            <GitBranch size={20} className="text-blue-600" />
            {editingWorkflow ? 'Edit Workflow' : 'New Workflow'}
          </DialogTitle>
        </DialogHeader>

        {/* Tab navigation */}
        <div className="flex border-b flex-shrink-0 bg-gray-50/70 dark:bg-gray-800/40">
          <button
            onClick={() => setActiveTab('filter')}
            className={\`flex-1 py-3 text-sm font-semibold transition-all border-b-2 text-center \${
              activeTab === 'filter'
                ? 'border-blue-600 text-blue-600 bg-white dark:bg-gray-800 shadow-2xs'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }\`}
          >
            Filter
          </button>
          <button
            onClick={() => setActiveTab('workflow')}
            className={\`flex-1 py-3 text-sm font-semibold transition-all border-b-2 text-center \${
              activeTab === 'workflow'
                ? 'border-blue-600 text-blue-600 bg-white dark:bg-gray-800 shadow-2xs'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }\`}
          >
            Workflow ({localSteps.length})
          </button>
        </div>

        {/* Filter Tab Content */}
        {activeTab === 'filter' && (
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            <div className="space-y-2">
              <Label className="text-sm font-bold text-foreground">Approval Type</Label>
              <div className="grid grid-cols-2 gap-3">
                <div
                  onClick={() => handleSelectApprovalType('manual')}
                  className={\`flex items-center justify-between px-4 py-3 border rounded-xl cursor-pointer transition-all \${
                    approvalType === 'manual'
                      ? 'border-blue-600 bg-blue-50/50 text-blue-600 font-bold'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }\`}
                >
                  <span className="text-sm">Manual Approve</span>
                  {approvalType === 'manual' && (
                    <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center">
                      <Check size={12} className="stroke-[3]" />
                    </div>
                  )}
                </div>

                <div
                  onClick={() => handleSelectApprovalType('auto')}
                  className={\`flex items-center justify-between px-4 py-3 border rounded-xl cursor-pointer transition-all \${
                    approvalType === 'auto'
                      ? 'border-blue-600 bg-blue-50/50 text-blue-600 font-bold'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }\`}
                >
                  <span className="text-sm">Auto Approve</span>
                  {approvalType === 'auto' && (
                    <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center">
                      <Check size={12} className="stroke-[3]" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="wf-name" className="text-sm font-bold text-foreground">
                Workflow Name
              </Label>
              <Input
                id="wf-name"
                placeholder="e.g. Full & Final Settlement"
                value={workflowName}
                onChange={(e) => setWorkflowName(e.target.value)}
                className="h-10 text-sm"
              />
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-bold text-foreground">Applicability</Label>

              {loadingOptions && (
                <div className="flex items-center justify-center py-4 text-xs text-muted-foreground gap-2">
                  <Loader2 size={14} className="animate-spin" /> Loading options from database...
                </div>
              )}

              {!loadingOptions && (
                <div className="space-y-2.5">
                  <Collapsible open={!!expanded['company']} onOpenChange={() => toggleExpand('company')}>
                    <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-2.5 text-sm font-bold bg-gray-100/80 dark:bg-gray-800/80 hover:bg-gray-200 border border-gray-200 dark:border-gray-700 rounded-lg transition-colors text-left">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono">{expanded['company'] ? '[-]' : '[+]'}</span>
                        <span>Company</span>
                      </div>
                      {selectedCompanies.length > 0 && (
                        <span className="w-5 h-5 rounded-full bg-black text-white text-xs flex items-center justify-center font-bold">
                          {selectedCompanies.length}
                        </span>
                      )}
                    </CollapsibleTrigger>
                    <CollapsibleContent className="p-3 bg-muted/20 border-x border-b rounded-b-md space-y-2 max-h-48 overflow-y-auto">
                      {companies.length === 0 && <p className="text-xs text-muted-foreground">No companies found</p>}
                      {companies.map((comp) => (
                        <div key={comp.id} className="flex items-center gap-2.5 cursor-pointer" onClick={() => toggleCompany(comp.id)}>
                          <Checkbox checked={selectedCompanies.includes(comp.id)} onCheckedChange={() => toggleCompany(comp.id)} />
                          <span className="text-sm font-medium">{comp.name} {comp.code ? \`(\${comp.code})\` : ''}</span>
                        </div>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>

                  <Collapsible open={!!expanded['dept']} onOpenChange={() => toggleExpand('dept')}>
                    <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-2.5 text-sm font-bold bg-gray-100/80 dark:bg-gray-800/80 hover:bg-gray-200 border border-gray-200 dark:border-gray-700 rounded-lg transition-colors text-left">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono">{expanded['dept'] ? '[-]' : '[+]'}</span>
                        <span>Department</span>
                      </div>
                      {selectedDepts.length > 0 && (
                        <span className="w-5 h-5 rounded-full bg-black text-white text-xs flex items-center justify-center font-bold">
                          {selectedDepts.length}
                        </span>
                      )}
                    </CollapsibleTrigger>
                    <CollapsibleContent className="p-3 bg-muted/20 border-x border-b rounded-b-md space-y-2 max-h-48 overflow-y-auto">
                      {departments.length === 0 && <p className="text-xs text-muted-foreground">No departments found</p>}
                      {departments.map((d) => (
                        <div key={d.id} className="flex items-center gap-2.5 cursor-pointer" onClick={() => toggleDept(d.id)}>
                          <Checkbox checked={selectedDepts.includes(d.id)} onCheckedChange={() => toggleDept(d.id)} />
                          <span className="text-sm font-medium">{d.name} {d.code ? \`(\${d.code})\` : ''}</span>
                        </div>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>

                  <Collapsible open={!!expanded['grade']} onOpenChange={() => toggleExpand('grade')}>
                    <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-2.5 text-sm font-bold bg-gray-100/80 dark:bg-gray-800/80 hover:bg-gray-200 border border-gray-200 dark:border-gray-700 rounded-lg transition-colors text-left">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono">{expanded['grade'] ? '[-]' : '[+]'}</span>
                        <span>Grade</span>
                      </div>
                      {selectedGrades.length > 0 && (
                        <span className="w-5 h-5 rounded-full bg-black text-white text-xs flex items-center justify-center font-bold">
                          {selectedGrades.length}
                        </span>
                      )}
                    </CollapsibleTrigger>
                    <CollapsibleContent className="p-3 bg-muted/20 border-x border-b rounded-b-md space-y-2 max-h-48 overflow-y-auto">
                      {grades.length === 0 && <p className="text-xs text-muted-foreground">No grades found</p>}
                      {grades.map((g) => (
                        <div key={g.id} className="flex items-center gap-2.5 cursor-pointer" onClick={() => toggleGrade(g.id)}>
                          <Checkbox checked={selectedGrades.includes(g.id)} onCheckedChange={() => toggleGrade(g.id)} />
                          <span className="text-sm font-medium">{g.name} {g.code ? \`(\${g.code})\` : ''}</span>
                        </div>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>

                  <Collapsible open={!!expanded['empType']} onOpenChange={() => toggleExpand('empType')}>
                    <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-2.5 text-sm font-bold bg-gray-100/80 dark:bg-gray-800/80 hover:bg-gray-200 border border-gray-200 dark:border-gray-700 rounded-lg transition-colors text-left">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono">{expanded['empType'] ? '[-]' : '[+]'}</span>
                        <span>Employee Type</span>
                      </div>
                      {selectedEmpTypes.length > 0 && (
                        <span className="w-5 h-5 rounded-full bg-black text-white text-xs flex items-center justify-center font-bold">
                          {selectedEmpTypes.length}
                        </span>
                      )}
                    </CollapsibleTrigger>
                    <CollapsibleContent className="p-3 bg-muted/20 border-x border-b rounded-b-md space-y-2 max-h-48 overflow-y-auto">
                      {employeeTypes.map((et) => (
                        <div key={et} className="flex items-center gap-2.5 cursor-pointer" onClick={() => toggleEmpType(et)}>
                          <Checkbox checked={selectedEmpTypes.includes(et)} onCheckedChange={() => toggleEmpType(et)} />
                          <span className="text-sm font-medium">{et}</span>
                        </div>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>

                  <Collapsible open={!!expanded['empName']} onOpenChange={() => toggleExpand('empName')}>
                    <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-2.5 text-sm font-bold bg-gray-100/80 dark:bg-gray-800/80 hover:bg-gray-200 border border-gray-200 dark:border-gray-700 rounded-lg transition-colors text-left">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono">{expanded['empName'] ? '[-]' : '[+]'}</span>
                        <span>Employee Name</span>
                      </div>
                      {selectedEmpIds.length > 0 && (
                        <span className="w-5 h-5 rounded-full bg-black text-white text-xs flex items-center justify-center font-bold">
                          {selectedEmpIds.length}
                        </span>
                      )}
                    </CollapsibleTrigger>
                    <CollapsibleContent className="p-3 bg-muted/20 border-x border-b rounded-b-md space-y-2 max-h-48 overflow-y-auto">
                      {employees.length === 0 && <p className="text-xs text-muted-foreground">No employees found</p>}
                      {employees.map((emp) => {
                        const nameStr = emp.fullName || emp.full_name || \`Employee #\${emp.id}\`;
                        const codeStr = emp.employeeCode || emp.employee_code || '';
                        return (
                          <div key={emp.id} className="flex items-center gap-2.5 cursor-pointer" onClick={() => toggleEmpId(emp.id)}>
                            <Checkbox checked={selectedEmpIds.includes(emp.id)} onCheckedChange={() => toggleEmpId(emp.id)} />
                            <span className="text-sm font-medium">{nameStr} {codeStr ? \`(\${codeStr})\` : ''}</span>
                          </div>
                        );
                      })}
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t">
              <Label className="text-sm font-bold text-foreground">Active Status</Label>
              <div className="flex items-center gap-3">
                <span className={\`text-xs \${!isActive ? 'text-foreground font-bold' : 'text-muted-foreground'}\`}>Inactive</span>
                <Switch checked={isActive} onCheckedChange={setIsActive} />
                <span className={\`text-xs \${isActive ? 'text-foreground font-bold' : 'text-muted-foreground'}\`}>Active</span>
              </div>
            </div>
          </div>
        )}

        {/* Workflow Steps Tab Content */}
        {activeTab === 'workflow' && (
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            {/* SUB-HEADER ROW: Workflow Steps (Left) + Three Dots (Far Right) */}
            <div className="flex items-center justify-between w-full mb-3">
              <div className="flex items-center gap-2 text-[#2563eb]">
                <GitBranch size={18} />
                <span className="text-sm font-bold tracking-tight text-[#1e293b] dark:text-white">
                  Workflow Steps
                </span>
              </div>

              {/* THREE DOTS (⋮) ON FAR RIGHT */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-600 hover:text-gray-900 hover:bg-gray-200/80 rounded-md">
                    <MoreVertical size={18} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 z-50">
                  <DropdownMenuLabel className="text-xs font-bold uppercase text-muted-foreground">
                    Action Icons Visibility
                  </DropdownMenuLabel>

                  <DropdownMenuItem onClick={() => toggleGlobalIconVisibility('edit', 'RO Settings / Edit Target')}>
                    <span className="flex-1 text-xs">RO Settings / Edit Target</span>
                    {!globalHiddenIcons.includes('edit') && <Check size={13} className="text-green-600 font-bold" />}
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={() => toggleGlobalIconVisibility('merge', 'Merge Template')}>
                    <span className="flex-1 text-xs">Merge Template</span>
                    {!globalHiddenIcons.includes('merge') && <Check size={13} className="text-green-600 font-bold" />}
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={() => toggleGlobalIconVisibility('form', 'Form Permissions')}>
                    <span className="flex-1 text-xs">Form Permissions</span>
                    {!globalHiddenIcons.includes('form') && <Check size={13} className="text-green-600 font-bold" />}
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={() => toggleGlobalIconVisibility('backdated', 'Notify Backdated')}>
                    <span className="flex-1 text-xs">Notify Backdated</span>
                    {!globalHiddenIcons.includes('backdated') && <Check size={13} className="text-green-600 font-bold" />}
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={() => toggleGlobalIconVisibility('escalation', 'Escalation')}>
                    <span className="flex-1 text-xs">Escalation / Conditions</span>
                    {!globalHiddenIcons.includes('escalation') && <Check size={13} className="text-green-600 font-bold" />}
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={() => toggleGlobalIconVisibility('notification', 'Notifications')}>
                    <span className="flex-1 text-xs">Notification Action</span>
                    {!globalHiddenIcons.includes('notification') && <Check size={13} className="text-green-600 font-bold" />}
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  {/* User-Added Custom Fields list right inside 3 dots menu */}
                  {globalCustomFields.length > 0 && (
                    <>
                      <DropdownMenuLabel className="text-[11px] font-bold uppercase text-blue-600 flex items-center justify-between">
                        <span>Custom Fields ({globalCustomFields.length})</span>
                      </DropdownMenuLabel>
                      {globalCustomFields.map((f) => (
                        <div key={f.id} className="flex items-center justify-between px-2 py-1.5 text-xs hover:bg-muted/50 rounded-xs">
                          <span className="truncate font-medium text-foreground">{f.label} ({f.fieldType})</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveCustomFieldFromMenu(f.id);
                            }}
                            className="text-muted-foreground hover:text-red-600 p-0.5"
                            title="Remove field"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                      <DropdownMenuSeparator />
                    </>
                  )}

                  {/* Add / Customize Fields button */}
                  <DropdownMenuItem onClick={() => setGlobalCustomFieldsOpen(true)} className="text-xs font-bold text-blue-600 gap-2 cursor-pointer">
                    <Plus size={14} />
                    Add / Customize Fields
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Step Cards List */}
            {localSteps.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8 border-2 border-dashed rounded-xl">
                No steps added yet. Click the buttons below to add steps.
              </p>
            )}

            <div className="space-y-0">
              {localSteps.map((step, i) => (
                <WorkflowStepCard
                  key={step.tempId}
                  step={{
                    ...step,
                    customFields: globalCustomFields,
                  }}
                  roles={roles}
                  departments={departments}
                  employees={employees}
                  globalHiddenIcons={globalHiddenIcons}
                  onHideGlobalIcon={handleGlobalHideIcon}
                  onUpdate={handleUpdateLocalStep}
                  onDelete={handleDeleteLocalStep}
                  onMoveDown={() => handleMoveDown(i)}
                  showMoveDown={i < localSteps.length - 1}
                />
              ))}
            </div>

            {/* Step Type Circular Buttons matching photo */}
            <div className="pt-2">
              <StepTypeButtons onAddStep={handleAddStepClick} />
            </div>
          </div>
        )}

        <StepTargetModal
          open={!!targetModalType}
          type={targetModalType}
          onClose={() => setTargetModalType(null)}
          employees={employees}
          departments={departments}
          roles={roles}
          onConfirm={handleTargetConfirm}
        />

        <CustomizeStepFieldsModal
          open={globalCustomFieldsOpen}
          onClose={() => setGlobalCustomFieldsOpen(false)}
          stepName="Workflow Universal Steps"
          initialFields={globalCustomFields}
          onSave={setGlobalCustomFields}
        />

        {/* Footer */}
        <div className="px-6 py-4 border-t flex-shrink-0 flex justify-between bg-gray-50/70 dark:bg-gray-900/50">
          <Button
            size="sm"
            onClick={handleSaveAll}
            disabled={saving}
            className="bg-[#10b981] hover:bg-[#059669] text-white font-bold gap-2 px-6 h-9 rounded-lg shadow-sm"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            + Save
          </Button>
          <Button
            size="sm"
            onClick={onClose}
            className="bg-[#ef4444] hover:bg-[#dc2626] text-white font-bold gap-2 px-6 h-9 rounded-lg shadow-sm"
          >
            ? Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
`;

fs.writeFileSync(drawerPath, content);
console.log('Successfully updated WorkflowSettingsDrawer.tsx with Auto Approve System logic');
