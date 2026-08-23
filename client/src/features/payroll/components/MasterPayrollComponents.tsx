import React, { useState, useEffect } from 'react';
import {
  Plus, Edit2, Trash2, RotateCcw, Search, Check, Layers,
  Database, AlertCircle, History, Sparkles, Save
} from 'lucide-react';
import { apiClient } from '@/config/api';
import { showToast } from '@/components/ui/toast';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ComponentGroup {
  id: string | number;
  name: string;
  category: 'Earning' | 'Deduction' | string;
  roundFormat?: string;
  round_format?: string;
  groupFunction?: string;
  group_function?: string;
  configureOnProfile?: boolean;
  configure_on_profile?: boolean;
  displayOnProfile?: boolean;
  display_on_profile?: boolean;
  isEditable?: boolean;
  is_editable?: boolean;
  contributedBy?: string;
  contributed_by?: string;
  recalculateOnChange?: boolean;
  recalculate_on_change?: boolean;
  groupForPayslip?: string;
  group_for_payslip?: string;
  displayOrder?: number;
  display_order?: number;
  disableArrear?: boolean;
  disable_arrear?: boolean;
  displayTotalOnProcess?: boolean;
  display_total_on_process?: boolean;
  tdsSameMonth?: boolean;
  tds_same_month?: boolean;
  isTaxable?: boolean;
  is_taxable?: boolean;
  isActive?: boolean;
  is_active?: boolean;
  components?: ComponentItem[];
}

interface ComponentItem {
  id: string | number;
  groupId?: string | number;
  group_id?: string | number;
  name: string;
  type: 'Value' | 'Derived' | 'Module' | string;
  component_type?: string;
  amount?: number;
  formula?: string;
  basedOnAttendance?: boolean;
  based_on_attendance?: boolean;
  isNonCashable?: boolean;
  is_non_cashable?: boolean;
  isActive?: boolean;
  is_active?: boolean;
  displayOrder?: number;
}

export const MasterPayrollComponents: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<'Earning' | 'Deduction'>('Earning');
  const [groups, setGroups] = useState<ComponentGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | number | null>(null);

  // Group Form State
  const [groupForm, setGroupForm] = useState<{
    id?: string | number;
    name: string;
    roundFormat: string;
    groupFunction: string;
    configureOnProfile: boolean;
    displayOnProfile: boolean;
    isEditable: boolean;
    contributedBy: string;
    isActive: boolean;
    recalculateOnChange: boolean;
    groupForPayslip: string;
    displayOrder: number;
    disableArrear: boolean;
    displayTotalOnProcess: boolean;
    tdsSameMonth: boolean;
    isTaxable: boolean;
  }>({
    name: '',
    roundFormat: 'Round',
    groupFunction: 'Sum',
    configureOnProfile: false,
    displayOnProfile: false,
    isEditable: true,
    contributedBy: 'Employee',
    isActive: true,
    recalculateOnChange: false,
    groupForPayslip: 'Car Allowance',
    displayOrder: 10,
    disableArrear: true,
    displayTotalOnProcess: false,
    tdsSameMonth: false,
    isTaxable: true,
  });

  const [savingGroup, setSavingGroup] = useState(false);

  // Component Dialog & Form State
  const [isCompModalOpen, setIsCompModalOpen] = useState(false);
  const [editingComponentId, setEditingComponentId] = useState<string | number | null>(null);
  const [compForm, setCompForm] = useState<{
    name: string;
    type: 'Value' | 'Derived' | 'Module';
    amount: number;
    formula: string;
    basedOnAttendance: boolean;
    isNonCashable: boolean;
    isActive: boolean;
  }>({
    name: '',
    type: 'Value',
    amount: 0,
    formula: '',
    basedOnAttendance: false,
    isNonCashable: false,
    isActive: true,
  });
  const [savingComp, setSavingComp] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch groups and components
  const fetchData = async () => {
    setLoading(true);
    try {
      const [grpRes, compRes] = await Promise.all([
        apiClient.get('/payroll/component-groups').catch(() => ({ data: { data: [] } })),
        apiClient.get('/payroll/component-definitions').catch(() => ({ data: { data: [] } }))
      ]);

      const rawGroups: any[] = grpRes.data?.data || grpRes.data || [];
      const rawComps: any[] = compRes.data?.data || compRes.data || [];

      // Merge child components into their corresponding groups
      const mergedGroups: ComponentGroup[] = rawGroups.map(g => {
        const gid = String(g.id);
        const childComps = rawComps.filter(c => String(c.groupId || c.group_id) === gid).map(c => ({
          id: c.id,
          groupId: c.groupId || c.group_id,
          name: c.name,
          type: c.type || c.component_type || 'Value',
          amount: Number(c.amount || 0),
          formula: c.formula || '',
          basedOnAttendance: Boolean(c.basedOnAttendance ?? c.based_on_attendance),
          isNonCashable: Boolean(c.isNonCashable ?? c.is_non_cashable),
          isActive: (c.isActive ?? c.is_active) !== 0 && (c.isActive ?? c.is_active) !== false,
          displayOrder: Number(c.displayOrder || c.display_order || 0),
        }));

        return {
          id: g.id,
          name: g.name,
          category: g.category || 'Earning',
          roundFormat: g.roundFormat || g.round_format || 'Round',
          groupFunction: g.groupFunction || g.group_function || 'Sum',
          configureOnProfile: Boolean(g.configureOnProfile ?? g.configure_on_profile),
          displayOnProfile: Boolean(g.displayOnProfile ?? g.display_on_profile),
          isEditable: (g.isEditable ?? g.is_editable) !== false && (g.isEditable ?? g.is_editable) !== 0,
          contributedBy: g.contributedBy || g.contributed_by || 'Employee',
          recalculateOnChange: Boolean(g.recalculateOnChange ?? g.recalculate_on_change),
          groupForPayslip: g.groupForPayslip || g.group_for_payslip || (g.category === 'Deduction' ? 'Deductions' : 'Car Allowance'),
          displayOrder: Number(g.displayOrder || g.display_order || 10),
          disableArrear: Boolean(g.disableArrear ?? g.disable_arrear ?? true),
          displayTotalOnProcess: Boolean(g.displayTotalOnProcess ?? g.display_total_on_process),
          tdsSameMonth: Boolean(g.tdsSameMonth ?? g.tds_same_month),
          isTaxable: (g.isTaxable ?? g.is_taxable) !== false && (g.isTaxable ?? g.is_taxable) !== 0,
          isActive: (g.isActive ?? g.is_active) !== 0 && (g.isActive ?? g.is_active) !== false,
          components: childComps,
        };
      });

      setGroups(mergedGroups);

      // Default selection to first group of the current category
      const currentCategoryGroups = mergedGroups.filter(
        g => (g.category?.toLowerCase() || '').includes(activeCategory.toLowerCase())
      );
      if (currentCategoryGroups.length > 0) {
        const first = currentCategoryGroups[0];
        setSelectedGroupId(first.id);
        populateGroupForm(first);
      } else {
        handleNewGroupClick();
      }
    } catch (err: any) {
      console.error('Failed to load payroll groups:', err);
      showToast.error('Load Error', err.message || 'Could not load component groups');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // When active category changes (Earning <-> Deduction), switch selected group
  useEffect(() => {
    const currentCategoryGroups = groups.filter(
      g => (g.category?.toLowerCase() || '').includes(activeCategory.toLowerCase())
    );
    if (currentCategoryGroups.length > 0) {
      const first = currentCategoryGroups[0];
      setSelectedGroupId(first.id);
      populateGroupForm(first);
    } else {
      handleNewGroupClick();
    }
  }, [activeCategory, groups]);

  const populateGroupForm = (group: ComponentGroup) => {
    setGroupForm({
      id: group.id,
      name: group.name,
      roundFormat: group.roundFormat || 'Round',
      groupFunction: group.groupFunction || 'Max',
      configureOnProfile: Boolean(group.configureOnProfile),
      displayOnProfile: Boolean(group.displayOnProfile),
      isEditable: group.isEditable !== false,
      contributedBy: group.contributedBy || 'Employee',
      isActive: group.isActive !== false,
      recalculateOnChange: Boolean(group.recalculateOnChange),
      groupForPayslip: group.groupForPayslip || (activeCategory === 'Deduction' ? 'Deductions' : 'Car Allowance'),
      displayOrder: group.displayOrder ?? 10,
      disableArrear: group.disableArrear !== false,
      displayTotalOnProcess: Boolean(group.displayTotalOnProcess),
      tdsSameMonth: Boolean(group.tdsSameMonth),
      isTaxable: group.isTaxable !== false,
    });
  };

  const handleNewGroupClick = () => {
    setSelectedGroupId(null);
    setGroupForm({
      name: '',
      roundFormat: 'Round',
      groupFunction: 'Sum',
      configureOnProfile: false,
      displayOnProfile: false,
      isEditable: true,
      contributedBy: 'Employee',
      isActive: true,
      recalculateOnChange: false,
      groupForPayslip: activeCategory === 'Deduction' ? 'Deductions' : 'Car Allowance',
      displayOrder: 10,
      disableArrear: true,
      displayTotalOnProcess: false,
      tdsSameMonth: false,
      isTaxable: true,
    });
  };

  const handleSaveGroup = async () => {
    if (!groupForm.name.trim()) {
      showToast.error('Validation Error', 'Group Name is required.');
      return;
    }

    setSavingGroup(true);
    try {
      const payload = {
        name: groupForm.name.trim(),
        category: activeCategory,
        roundFormat: groupForm.roundFormat,
        groupFunction: groupForm.groupFunction,
        configureOnProfile: groupForm.configureOnProfile,
        displayOnProfile: groupForm.displayOnProfile,
        isEditable: groupForm.isEditable,
        contributedBy: groupForm.contributedBy,
        isActive: groupForm.isActive,
        recalculateOnChange: groupForm.recalculateOnChange,
        groupForPayslip: groupForm.groupForPayslip,
        displayOrder: Number(groupForm.displayOrder || 10),
        disableArrear: groupForm.disableArrear,
        displayTotalOnProcess: groupForm.displayTotalOnProcess,
        tdsSameMonth: groupForm.tdsSameMonth,
        isTaxable: groupForm.isTaxable,
      };

      if (selectedGroupId) {
        await apiClient.put(`/payroll/component-groups/${selectedGroupId}`, payload);
        showToast.success('Group Updated', `"${groupForm.name}" updated successfully.`);
      } else {
        const res = await apiClient.post('/payroll/component-groups', payload);
        const newId = res.data?.data?.id || res.data?.id;
        setSelectedGroupId(newId);
        showToast.success('Group Created', `"${groupForm.name}" created successfully.`);
      }
      await fetchData();
    } catch (err: any) {
      showToast.error('Save Failed', err.response?.data?.message || err.message || 'Could not save group');
    } finally {
      setSavingGroup(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!selectedGroupId) return;
    if (!window.confirm(`Are you sure you want to delete group "${groupForm.name}"?`)) return;

    try {
      await apiClient.delete(`/payroll/component-groups/${selectedGroupId}`);
      showToast.success('Group Deleted', `Group removed successfully.`);
      setSelectedGroupId(null);
      await fetchData();
    } catch (err: any) {
      showToast.error('Delete Failed', err.response?.data?.message || err.message);
    }
  };

  // Component Management Handlers
  const handleOpenAddComponent = () => {
    if (!selectedGroupId) {
      showToast.error('Select Group', 'Please save or select a group on the left before adding components.');
      return;
    }
    setEditingComponentId(null);
    setCompForm({
      name: '',
      type: 'Value',
      amount: 0,
      formula: '',
      basedOnAttendance: false,
      isNonCashable: false,
      isActive: true,
    });
    setIsCompModalOpen(true);
  };

  const handleEditComponent = (comp: ComponentItem) => {
    setEditingComponentId(comp.id);
    setCompForm({
      name: comp.name,
      type: (comp.type as any) || 'Value',
      amount: comp.amount || 0,
      formula: comp.formula || '',
      basedOnAttendance: Boolean(comp.basedOnAttendance),
      isNonCashable: Boolean(comp.isNonCashable),
      isActive: comp.isActive !== false,
    });
    setIsCompModalOpen(true);
  };

  const handleSaveComponent = async () => {
    if (!compForm.name.trim()) {
      showToast.error('Validation Error', 'Component name is required.');
      return;
    }

    if (compForm.type === 'Derived' && !compForm.formula.trim()) {
      showToast.error('Validation Error', 'Formula expression is required for Derived component.');
      return;
    }

    setSavingComp(true);
    try {
      const payload = {
        groupId: selectedGroupId,
        group_id: selectedGroupId,
        name: compForm.name.trim(),
        type: compForm.type,
        component_type: compForm.type,
        amount: compForm.type === 'Value' ? Number(compForm.amount || 0) : 0,
        formula: compForm.type === 'Derived' ? compForm.formula.trim() : null,
        basedOnAttendance: compForm.basedOnAttendance,
        based_on_attendance: compForm.basedOnAttendance,
        isNonCashable: compForm.isNonCashable,
        is_non_cashable: compForm.isNonCashable,
        isActive: compForm.isActive,
        is_active: compForm.isActive,
      };

      if (editingComponentId) {
        await apiClient.put(`/payroll/component-definitions/${editingComponentId}`, payload);
        showToast.success('Component Updated', `"${compForm.name}" updated successfully.`);
      } else {
        await apiClient.post('/payroll/component-definitions', payload);
        showToast.success('Component Added', `"${compForm.name}" added to group.`);
      }
      setIsCompModalOpen(false);
      await fetchData();
    } catch (err: any) {
      showToast.error('Save Failed', err.response?.data?.message || err.message);
    } finally {
      setSavingComp(false);
    }
  };

  const handleDeleteComponent = async (id: string | number, name: string) => {
    if (!window.confirm(`Delete component "${name}"?`)) return;
    try {
      await apiClient.delete(`/payroll/components/${id}`);
      showToast.success('Component Deleted', `"${name}" removed successfully.`);
      await fetchData();
    } catch (err: any) {
      showToast.error('Delete Failed', err.response?.data?.message || err.message);
    }
  };

  // Currently selected active group object
  const activeCategoryGroups = groups.filter(
    g => (g.category?.toLowerCase() || '').includes(activeCategory.toLowerCase())
  );
  const activeSelectedGroup = groups.find(g => String(g.id) === String(selectedGroupId));
  const activeComponents = activeSelectedGroup?.components || [];
  const filteredComponents = activeComponents.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* ── Top Category Tabs (Matches Hoshi 1:1: Earning | Deduction) ───────── */}
      <div className="flex border-b border-border/80 bg-card rounded-t-xl overflow-hidden shadow-2xs">
        <button
          onClick={() => setActiveCategory('Earning')}
          className={`flex-1 py-3 text-sm font-bold tracking-tight text-center transition-all cursor-pointer border-b-2 ${
            activeCategory === 'Earning'
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30'
          }`}
        >
          Earning
        </button>
        <button
          onClick={() => setActiveCategory('Deduction')}
          className={`flex-1 py-3 text-sm font-bold tracking-tight text-center transition-all cursor-pointer border-b-2 ${
            activeCategory === 'Deduction'
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30'
          }`}
        >
          Deduction
        </button>
      </div>

      {/* ── 2-Column Split View (Matches Hoshi 1:1: Left Form | Right Table) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ── Left Column: Group Form ────────────────────────────────────────── */}
        <div className="lg:col-span-6 bg-card border border-border rounded-xl shadow-xs p-5 space-y-4">
          {/* Header with Title, +Group Button, Count Badge, and Group Switcher */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-border/70">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-foreground">
                {activeCategory} Group
              </h2>
              {/* Group Switcher Dropdown */}
              {activeCategoryGroups.length > 0 && (
                <select
                  value={selectedGroupId || ''}
                  onChange={e => {
                    const gid = e.target.value;
                    if (gid === 'NEW') {
                      handleNewGroupClick();
                    } else {
                      setSelectedGroupId(gid);
                      const grp = activeCategoryGroups.find(g => String(g.id) === String(gid));
                      if (grp) populateGroupForm(grp);
                    }
                  }}
                  className="h-7 text-xs font-bold border border-border bg-background text-foreground rounded-lg px-2"
                >
                  {activeCategoryGroups.map(g => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                  <option value="NEW">+ Create New Group...</option>
                </select>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleNewGroupClick}
                className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors shadow-2xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Group
              </button>

              {/* Group Count Badge with Database Icon */}
              <div className="flex items-center gap-1 px-2.5 py-1 bg-muted border border-border text-xs font-mono font-bold text-muted-foreground rounded-lg">
                <Database className="w-3.5 h-3.5" />
                <span>{activeCategoryGroups.length}</span>
              </div>
            </div>
          </div>

          {/* Group Fields Form */}
          <div className="space-y-3.5 text-xs">
            {/* Group Name */}
            <div>
              <label className="text-[11px] font-bold text-foreground block mb-1">
                Group Name <span className="text-rose-500">*</span>
              </label>
              <Input
                value={groupForm.name}
                onChange={e => setGroupForm({ ...groupForm, name: e.target.value })}
                placeholder="e.g. Adjustment"
                className="h-8 text-xs font-semibold"
              />
            </div>

            {/* Round Format & Group Function */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold text-foreground block mb-1">
                  Round Format <span className="text-rose-500">*</span>
                </label>
                <select
                  value={groupForm.roundFormat}
                  onChange={e => setGroupForm({ ...groupForm, roundFormat: e.target.value })}
                  className="w-full h-8 border border-border bg-background text-foreground rounded-lg px-2 text-xs font-semibold"
                >
                  <option value="Round">Round</option>
                  <option value="Round two decimal">Round two decimal</option>
                  <option value="Round Up">Round Up (Ceil)</option>
                  <option value="Round Down">Round Down (Floor)</option>
                  <option value="None">None</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-foreground block mb-1">
                  Group Function <span className="text-rose-500">*</span>
                </label>
                <select
                  value={groupForm.groupFunction}
                  onChange={e => setGroupForm({ ...groupForm, groupFunction: e.target.value })}
                  className="w-full h-8 border border-border bg-background text-foreground rounded-lg px-2 text-xs font-semibold"
                >
                  <option value="Max">Max</option>
                  <option value="Sum">Sum</option>
                  <option value="Min">Min</option>
                  <option value="Average">Average</option>
                </select>
              </div>
            </div>

            {/* Row 1: Configure on Profile | Display on Profile | Is Editable */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-bold text-foreground block mb-1">
                  Configure On Profile
                </label>
                <div className="flex border border-border rounded-lg overflow-hidden h-7">
                  <button
                    type="button"
                    onClick={() => setGroupForm({ ...groupForm, configureOnProfile: false })}
                    className={`flex-1 text-[11px] font-bold ${!groupForm.configureOnProfile ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                  >
                    No
                  </button>
                  <button
                    type="button"
                    onClick={() => setGroupForm({ ...groupForm, configureOnProfile: true })}
                    className={`flex-1 text-[11px] font-bold ${groupForm.configureOnProfile ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                  >
                    Yes
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-foreground block mb-1">
                  Display On Profile
                </label>
                <div className="flex border border-border rounded-lg overflow-hidden h-7">
                  <button
                    type="button"
                    onClick={() => setGroupForm({ ...groupForm, displayOnProfile: false })}
                    className={`flex-1 text-[11px] font-bold ${!groupForm.displayOnProfile ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                  >
                    No
                  </button>
                  <button
                    type="button"
                    onClick={() => setGroupForm({ ...groupForm, displayOnProfile: true })}
                    className={`flex-1 text-[11px] font-bold ${groupForm.displayOnProfile ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                  >
                    Yes
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-foreground block mb-1">
                  Is Editable
                </label>
                <div className="flex border border-border rounded-lg overflow-hidden h-7">
                  <button
                    type="button"
                    onClick={() => setGroupForm({ ...groupForm, isEditable: false })}
                    className={`flex-1 text-[11px] font-bold ${!groupForm.isEditable ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                  >
                    No
                  </button>
                  <button
                    type="button"
                    onClick={() => setGroupForm({ ...groupForm, isEditable: true })}
                    className={`flex-1 text-[11px] font-bold ${groupForm.isEditable ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                  >
                    Yes
                  </button>
                </div>
              </div>
            </div>

            {/* Row 2: Contributed By | Active */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold text-foreground block mb-1">
                  Contributed By <span className="text-rose-500">*</span>
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setGroupForm({ ...groupForm, contributedBy: 'Employee' })}
                    className={`flex-1 flex items-center justify-center gap-1 h-7 rounded-lg text-xs font-bold border transition-colors ${
                      groupForm.contributedBy === 'Employee'
                        ? 'bg-primary text-primary-foreground border-primary shadow-2xs'
                        : 'bg-muted/40 text-muted-foreground border-border'
                    }`}
                  >
                    {groupForm.contributedBy === 'Employee' && <Check className="w-3 h-3" />}
                    Employee
                  </button>
                  <button
                    type="button"
                    onClick={() => setGroupForm({ ...groupForm, contributedBy: 'Employer' })}
                    className={`flex-1 flex items-center justify-center gap-1 h-7 rounded-lg text-xs font-bold border transition-colors ${
                      groupForm.contributedBy === 'Employer'
                        ? 'bg-primary text-primary-foreground border-primary shadow-2xs'
                        : 'bg-muted/40 text-muted-foreground border-border'
                    }`}
                  >
                    {groupForm.contributedBy === 'Employer' && <Check className="w-3 h-3" />}
                    Employer
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-foreground block mb-1">
                  Active
                </label>
                <div className="flex border border-border rounded-lg overflow-hidden h-7 w-28">
                  <button
                    type="button"
                    onClick={() => setGroupForm({ ...groupForm, isActive: false })}
                    className={`flex-1 text-[11px] font-bold ${!groupForm.isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                  >
                    No
                  </button>
                  <button
                    type="button"
                    onClick={() => setGroupForm({ ...groupForm, isActive: true })}
                    className={`flex-1 text-[11px] font-bold ${groupForm.isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                  >
                    Yes
                  </button>
                </div>
              </div>
            </div>

            {/* Row 3: Recalculate Payroll On Change | Group For Payslip | Display Order */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-bold text-foreground block mb-1 leading-tight">
                  Recalculate Payroll On Change
                </label>
                <div className="flex border border-border rounded-lg overflow-hidden h-7">
                  <button
                    type="button"
                    onClick={() => setGroupForm({ ...groupForm, recalculateOnChange: false })}
                    className={`flex-1 text-[11px] font-bold ${!groupForm.recalculateOnChange ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                  >
                    No
                  </button>
                  <button
                    type="button"
                    onClick={() => setGroupForm({ ...groupForm, recalculateOnChange: true })}
                    className={`flex-1 text-[11px] font-bold ${groupForm.recalculateOnChange ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                  >
                    Yes
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-foreground block mb-1">
                  Group For Payslip
                </label>
                <select
                  value={groupForm.groupForPayslip}
                  onChange={e => setGroupForm({ ...groupForm, groupForPayslip: e.target.value })}
                  className="w-full h-7 border border-border bg-background text-foreground rounded-lg px-2 text-xs font-semibold"
                >
                  <option value="Car Allowance">Car Allowance</option>
                  <option value="Basic">Basic</option>
                  <option value="HRA">HRA</option>
                  <option value="Special Allowance">Special Allowance</option>
                  <option value="Earnings">Earnings</option>
                  <option value="Deductions">Deductions</option>
                  <option value="Statutory">Statutory</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-foreground block mb-1">
                  Display Order
                </label>
                <Input
                  type="number"
                  value={groupForm.displayOrder}
                  onChange={e => setGroupForm({ ...groupForm, displayOrder: Number(e.target.value) })}
                  className="h-7 text-xs font-semibold"
                />
              </div>
            </div>

            {/* Row 4: Disable Arrear | Display Total On Process Payroll | TDS deducted on same month */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-bold text-foreground block mb-1">
                  Disable Arrear
                </label>
                <div className="flex border border-border rounded-lg overflow-hidden h-7">
                  <button
                    type="button"
                    onClick={() => setGroupForm({ ...groupForm, disableArrear: false })}
                    className={`flex-1 text-[11px] font-bold ${!groupForm.disableArrear ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                  >
                    No
                  </button>
                  <button
                    type="button"
                    onClick={() => setGroupForm({ ...groupForm, disableArrear: true })}
                    className={`flex-1 text-[11px] font-bold ${groupForm.disableArrear ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                  >
                    Yes
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-foreground block mb-1 leading-tight">
                  Display Total On Process Payroll
                </label>
                <div className="flex border border-border rounded-lg overflow-hidden h-7">
                  <button
                    type="button"
                    onClick={() => setGroupForm({ ...groupForm, displayTotalOnProcess: false })}
                    className={`flex-1 text-[11px] font-bold ${!groupForm.displayTotalOnProcess ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                  >
                    No
                  </button>
                  <button
                    type="button"
                    onClick={() => setGroupForm({ ...groupForm, displayTotalOnProcess: true })}
                    className={`flex-1 text-[11px] font-bold ${groupForm.displayTotalOnProcess ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                  >
                    Yes
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-foreground block mb-1 leading-tight">
                  TDS deducted on same month
                </label>
                <div className="flex border border-border rounded-lg overflow-hidden h-7">
                  <button
                    type="button"
                    onClick={() => setGroupForm({ ...groupForm, tdsSameMonth: false })}
                    className={`flex-1 text-[11px] font-bold ${!groupForm.tdsSameMonth ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                  >
                    No
                  </button>
                  <button
                    type="button"
                    onClick={() => setGroupForm({ ...groupForm, tdsSameMonth: true })}
                    className={`flex-1 text-[11px] font-bold ${groupForm.tdsSameMonth ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                  >
                    Yes
                  </button>
                </div>
              </div>
            </div>

            {/* Row 5: Taxable */}
            <div>
              <label className="text-[11px] font-bold text-foreground block mb-1">
                Taxable
              </label>
              <div className="flex border border-border rounded-lg overflow-hidden h-7 w-28">
                <button
                  type="button"
                  onClick={() => setGroupForm({ ...groupForm, isTaxable: false })}
                  className={`flex-1 text-[11px] font-bold ${!groupForm.isTaxable ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                >
                  No
                </button>
                <button
                  type="button"
                  onClick={() => setGroupForm({ ...groupForm, isTaxable: true })}
                  className={`flex-1 text-[11px] font-bold ${groupForm.isTaxable ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                >
                  Yes
                </button>
              </div>
            </div>

            {/* Bottom Group Form Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-border/70">
              {selectedGroupId ? (
                <button
                  type="button"
                  onClick={handleDeleteGroup}
                  className="flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-700 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Group
                </button>
              ) : <div />}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveGroup}
                  disabled={savingGroup}
                  className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold px-4 py-1.5 rounded-lg transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  {savingGroup ? 'Saving...' : (selectedGroupId ? 'Update Group' : 'Save Group')}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right Column: Components Table ─────────────────────────────────── */}
        <div className="lg:col-span-6 bg-card border border-border rounded-xl shadow-xs overflow-hidden">
          {/* Table Header with Search & + Add Component button */}
          <div className="p-3.5 border-b border-border/70 bg-muted/20 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-foreground">
                {groupForm.name ? `Components in "${groupForm.name}"` : 'Components'}
              </span>
              <Badge variant="outline" className="text-[10px] font-mono font-bold bg-muted">
                {filteredComponents.length}
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3 h-3 text-muted-foreground absolute left-2.5 top-2.5" />
                <Input
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Search component..."
                  className="h-7 text-xs pl-7 w-36"
                />
              </div>

              <button
                onClick={handleOpenAddComponent}
                className="flex items-center gap-1 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold px-3 py-1.5 rounded-lg transition-colors shadow-2xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Component
              </button>
            </div>
          </div>

          {/* Table (Columns match Hoshi 1:1: Name | Component Type | Based On Attendance | Active | Action) */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 border-b border-border/70">
                <tr>
                  <th className="px-4 py-2.5 text-left font-bold text-muted-foreground text-[11px]">
                    Name
                  </th>
                  <th className="px-4 py-2.5 text-left font-bold text-muted-foreground text-[11px]">
                    Component Type
                  </th>
                  <th className="px-4 py-2.5 text-left font-bold text-muted-foreground text-[11px]">
                    Based On Attendance
                  </th>
                  <th className="px-4 py-2.5 text-left font-bold text-muted-foreground text-[11px]">
                    Active
                  </th>
                  <th className="px-4 py-2.5 text-center font-bold text-muted-foreground text-[11px]">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-border/50">
                {filteredComponents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                      <Layers className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
                      <p className="font-semibold">No components configured for this group.</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Click "+ Component" above to add one.</p>
                    </td>
                  </tr>
                ) : (
                  filteredComponents.map(comp => (
                    <tr key={comp.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-semibold text-foreground">
                        {comp.name}
                      </td>

                      <td className="px-4 py-3">
                        <span className="font-bold text-[11px] uppercase tracking-wide text-foreground">
                          {comp.type}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-muted-foreground">
                        {comp.basedOnAttendance ? 'Yes' : 'No'}
                      </td>

                      <td className="px-4 py-3">
                        <span className={comp.isActive ? 'text-emerald-600 font-bold' : 'text-muted-foreground font-semibold'}>
                          {comp.isActive ? 'Yes' : 'No'}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Edit Button */}
                          <button
                            onClick={() => handleEditComponent(comp)}
                            className="p-1.5 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors cursor-pointer border border-border"
                            title="Edit Component"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete / Reset Button */}
                          <button
                            onClick={() => handleDeleteComponent(comp.id, comp.name)}
                            className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-md text-muted-foreground hover:text-rose-600 transition-colors cursor-pointer border border-border"
                            title="Delete Component"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Component Create / Edit Modal Dialog ────────────────────────────── */}
      <Dialog open={isCompModalOpen} onOpenChange={setIsCompModalOpen}>
        <DialogContent className="max-w-lg w-[95vw] p-0 overflow-hidden bg-card text-card-foreground border border-border shadow-2xl rounded-2xl">
          <div className="p-4 px-6 border-b border-border/60 bg-muted/20 flex items-center justify-between">
            <span className="text-sm font-bold text-foreground flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              {editingComponentId ? `Edit Component: ${compForm.name}` : `Add New Component to ${groupForm.name || 'Group'}`}
            </span>
          </div>

          <div className="p-6 space-y-4 text-xs">
            {/* Component Name */}
            <div>
              <label className="text-[11px] font-bold text-foreground block mb-1.5">
                Component Name <span className="text-rose-500">*</span>
              </label>
              <Input
                value={compForm.name}
                onChange={e => setCompForm({ ...compForm, name: e.target.value })}
                placeholder="e.g. Conveyance"
                className="h-8 text-xs font-semibold"
              />
            </div>

            {/* Component Type (Value / Derived / Module) */}
            <div>
              <label className="text-[11px] font-bold text-foreground block mb-1.5">
                Component Type <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['Value', 'Derived', 'Module'] as const).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setCompForm({ ...compForm, type: t })}
                    className={`py-2 px-3 rounded-lg border text-xs font-bold flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer ${
                      compForm.type === t
                        ? t === 'Value'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                          : t === 'Derived'
                          ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                          : 'bg-violet-600 text-white border-violet-600 shadow-2xs'
                        : 'bg-background text-foreground border-border hover:bg-muted/40'
                    }`}
                  >
                    <span className="uppercase">{t}</span>
                    <span className="text-[9px] font-normal opacity-80">
                      {t === 'Value' ? 'Fixed ₹' : t === 'Derived' ? 'Formula %' : 'External Mod'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Value Amount Input */}
            {compForm.type === 'Value' && (
              <div>
                <label className="text-[11px] font-bold text-foreground block mb-1.5">
                  Default Amount (₹)
                </label>
                <Input
                  type="number"
                  value={compForm.amount}
                  onChange={e => setCompForm({ ...compForm, amount: Number(e.target.value) })}
                  placeholder="0.00"
                  className="h-8 text-xs font-semibold"
                />
              </div>
            )}

            {/* Derived Formula Textarea & Quick Chips */}
            {compForm.type === 'Derived' && (
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-foreground block">
                  Formula Expression <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  value={compForm.formula}
                  onChange={e => setCompForm({ ...compForm, formula: e.target.value })}
                  placeholder="e.g. [BASIC] * 0.40  or  (50 * [CTC]) / 100"
                  className="w-full text-xs font-mono font-bold bg-slate-950 text-emerald-400 border border-slate-800 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {['[BASIC]', '[GROSS]', '[CTC]', '+', '-', '*', '/', '(', ')', '0.40', '0.50'].map(chip => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setCompForm({ ...compForm, formula: `${compForm.formula || ''} ${chip}`.trim() })}
                      className="px-2 py-0.5 text-[10px] font-mono font-bold bg-muted hover:bg-muted/80 text-foreground border border-border rounded"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Toggles: Based on Attendance | Non-Cashable | Active */}
            <div className="grid grid-cols-3 gap-3 pt-2">
              <div>
                <label className="text-[11px] font-bold text-foreground block mb-1">
                  Based On Attendance
                </label>
                <div className="flex border border-border rounded-lg overflow-hidden h-7">
                  <button
                    type="button"
                    onClick={() => setCompForm({ ...compForm, basedOnAttendance: false })}
                    className={`flex-1 text-[11px] font-bold ${!compForm.basedOnAttendance ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                  >
                    No
                  </button>
                  <button
                    type="button"
                    onClick={() => setCompForm({ ...compForm, basedOnAttendance: true })}
                    className={`flex-1 text-[11px] font-bold ${compForm.basedOnAttendance ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                  >
                    Yes
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-foreground block mb-1">
                  Non-Cashable
                </label>
                <div className="flex border border-border rounded-lg overflow-hidden h-7">
                  <button
                    type="button"
                    onClick={() => setCompForm({ ...compForm, isNonCashable: false })}
                    className={`flex-1 text-[11px] font-bold ${!compForm.isNonCashable ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                  >
                    No
                  </button>
                  <button
                    type="button"
                    onClick={() => setCompForm({ ...compForm, isNonCashable: true })}
                    className={`flex-1 text-[11px] font-bold ${compForm.isNonCashable ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                  >
                    Yes
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-foreground block mb-1">
                  Active
                </label>
                <div className="flex border border-border rounded-lg overflow-hidden h-7">
                  <button
                    type="button"
                    onClick={() => setCompForm({ ...compForm, isActive: false })}
                    className={`flex-1 text-[11px] font-bold ${!compForm.isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                  >
                    No
                  </button>
                  <button
                    type="button"
                    onClick={() => setCompForm({ ...compForm, isActive: true })}
                    className={`flex-1 text-[11px] font-bold ${compForm.isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                  >
                    Yes
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCompModalOpen(false)}
                className="h-8 text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveComponent}
                disabled={savingComp}
                className="bg-primary text-primary-foreground h-8 text-xs font-bold"
              >
                {savingComp ? 'Saving...' : (editingComponentId ? 'Update Component' : 'Save Component')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
