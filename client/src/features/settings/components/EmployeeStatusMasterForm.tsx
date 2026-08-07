import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Save,
  X,
  Search,
  CheckCircle2,
  Edit2,
  Loader2,
  SlidersHorizontal,
  ChevronDown,
  HelpCircle
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useCompanyStore } from '@/features/settings/store/companyStore';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@/components/ui/tooltip';

export interface EmployeeStatusRecord {
  id: string;
  uuid?: string;
  name: string;
  probationStatus: boolean;
  probationPeriodUnit?: string;
  probationPeriodValue?: number | string;
  notifyOnCompletion?: boolean;
  confirmationStatus: boolean;
  resignationStatus: boolean;
  inactiveOnStatusChange: boolean;
  statusColor: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface EmployeeStatusMasterFormProps {
  onBack?: () => void;
}

export function EmployeeStatusMasterForm({ onBack }: EmployeeStatusMasterFormProps) {
  const { selectedCompanyId } = useCompanyStore();
  // Master List State
  const [statuses, setStatuses] = useState<EmployeeStatusRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [scopeFilter, setScopeFilter] = useState<string>('All');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Selected Record & Form State
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);

  const [formName, setFormName] = useState<string>('');
  const [formProbation, setFormProbation] = useState<boolean>(false);
  const [formProbationPeriodUnit, setFormProbationPeriodUnit] = useState<string>('Choose');
  const [formProbationPeriodValue, setFormProbationPeriodValue] = useState<string>('');
  const [formNotifyOnCompletion, setFormNotifyOnCompletion] = useState<boolean>(false);
  const [formConfirmation, setFormConfirmation] = useState<boolean>(false);
  const [formResignation, setFormResignation] = useState<boolean>(false);
  const [formInactiveOnChange, setFormInactiveOnChange] = useState<boolean>(false);
  const [formColor, setFormColor] = useState<string>('#00b4d8');
  const [formIsActive, setFormIsActive] = useState<boolean>(true);



  // Fetch statuses from backend API
  const fetchStatuses = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/settings/employee-statuses');
      if (res.data?.success && Array.isArray(res.data.data)) {
        setStatuses(res.data.data);
      }
    } catch (err: any) {
      console.error('Failed to fetch employee statuses:', err);
      toast.error(err?.response?.data?.message || 'Failed to load employee statuses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatuses();
  }, [selectedCompanyId]);

  // Filtered statuses list
  const filteredStatuses = useMemo(() => {
    return statuses.filter((st) => {
      // Scope/Search Filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesName = st.name.toLowerCase().includes(q);
        if (!matchesName) return false;
      }

      // Active / Inactive Filter
      if (activeFilter === 'active' && !st.isActive) return false;
      if (activeFilter === 'inactive' && st.isActive) return false;

      return true;
    });
  }, [statuses, searchTerm, activeFilter]);

  // Handle clicking a status card on the left panel
  const handleSelectStatus = (st: EmployeeStatusRecord) => {
    setSelectedRecordId(st.id);
    setFormName(st.name);
    setFormProbation(st.probationStatus);
    setFormProbationPeriodUnit(st.probationPeriodUnit || 'Choose');
    setFormProbationPeriodValue(
      st.probationPeriodValue !== undefined && st.probationPeriodValue !== null
        ? String(st.probationPeriodValue)
        : ''
    );
    setFormNotifyOnCompletion(Boolean(st.notifyOnCompletion));
    setFormConfirmation(st.confirmationStatus);
    setFormResignation(st.resignationStatus);
    setFormInactiveOnChange(st.inactiveOnStatusChange);
    setFormColor(st.statusColor || '#00b4d8');
    setFormIsActive(st.isActive);
  };

  // Reset form back to "Add New" mode
  const handleCancel = () => {
    setSelectedRecordId(null);
    setFormName('');
    setFormProbation(false);
    setFormProbationPeriodUnit('Choose');
    setFormProbationPeriodValue('');
    setFormNotifyOnCompletion(false);
    setFormConfirmation(false);
    setFormResignation(false);
    setFormInactiveOnChange(false);
    setFormColor('#00b4d8');
    setFormIsActive(true);
  };

  // Handle Add / Save submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = formName.trim();
    if (!trimmedName) {
      toast.error('Employee Status name is mandatory');
      return;
    }

    if (formProbation) {
      if (formProbationPeriodUnit === 'Choose' || !formProbationPeriodValue.trim()) {
        toast.error('Please specify a valid Period unit and value for Probation Status');
        return;
      }
    }

    // Client-side duplicate check
    const isDuplicate = statuses.some(
      (st) =>
        st.name.toLowerCase() === trimmedName.toLowerCase() &&
        st.id !== selectedRecordId
    );

    if (isDuplicate) {
      toast.error(`An employee status with the name "${trimmedName}" already exists.`);
      return;
    }

    const payload = {
      name: trimmedName,
      probationStatus: formProbation,
      probationPeriodUnit: formProbation ? formProbationPeriodUnit : 'Choose',
      probationPeriodValue: formProbation && formProbationPeriodValue ? Number(formProbationPeriodValue) : null,
      notifyOnCompletion: formProbation ? formNotifyOnCompletion : false,
      confirmationStatus: formConfirmation,
      resignationStatus: formResignation,
      inactiveOnStatusChange: formInactiveOnChange,
      statusColor: formColor,
      isActive: formIsActive
    };



    try {
      setSubmitting(true);

      if (selectedRecordId) {
        // Update existing record
        const res = await apiClient.put(`/settings/employee-statuses/${selectedRecordId}`, payload);
        if (res.data?.success) {
          toast.success('Employee status updated successfully');
          const updatedRecord = res.data.data;
          setStatuses((prev) =>
            prev.map((item) => (item.id === selectedRecordId ? updatedRecord : item))
          );
          // Keep selected item highlighted
          handleSelectStatus(updatedRecord);
        }
      } else {
        // Create new record
        const res = await apiClient.post('/settings/employee-statuses', payload);
        if (res.data?.success) {
          toast.success('Employee status created successfully');
          const newRecord = res.data.data;
          setStatuses((prev) => [newRecord, ...prev]);
          handleCancel();
        }
      }
    } catch (err: any) {
      console.error('API Error saving employee status:', err);
      const errMsg = err?.response?.data?.message || 'Failed to save employee status';
      toast.error(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedRecordId) return;
    if (!window.confirm('Are you sure you want to permanently delete this Employee Status?')) return;

    try {
      setSubmitting(true);
      const res = await apiClient.delete(`/settings/employee-statuses/${selectedRecordId}`);
      if (res.data?.success || res.status === 200) {
        toast.success('Employee status deleted successfully');
        setStatuses((prev) => prev.filter((item) => item.id !== selectedRecordId));
        handleCancel();
      }
    } catch (err: any) {
      console.error('API Error deleting employee status:', err);
      const errMsg = err?.response?.data?.message || 'Failed to delete employee status';
      toast.error(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-[1400px] mx-auto p-4 md:p-6 space-y-6">
      {/* ─────────────────────────────────────────────────────────────
          TOP CONTROL BAR (Scope Filter, Search, Active Filter)
         ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card border border-border p-3.5 rounded-xl shadow-xs">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          {/* Scope Dropdown */}
          <div className="relative">
            <select
              value={scopeFilter}
              onChange={(e) => setScopeFilter(e.target.value)}
              className="appearance-none bg-muted/60 hover:bg-muted border border-border text-foreground text-xs font-semibold rounded-lg pl-3 pr-7 py-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            >
              <option value="All">All</option>
              <option value="Name">Name</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          </div>

          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search term..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-8 text-xs h-9 bg-background border-border"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Status Filter Dropdown */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value as any)}
              className="appearance-none bg-muted/60 hover:bg-muted border border-border text-foreground text-xs font-semibold rounded-lg pl-3 pr-7 py-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            >
              <option value="all">Active (All)</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          </div>

          {onBack && (
            <Button
              variant="outline"
              size="sm"
              onClick={onBack}
              className="text-xs h-9"
            >
              Back
            </Button>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          MAIN CONTENT: LEFT PANEL (FORM) & RIGHT PANEL (STATUS LIST)
         ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ==========================================
            LEFT SECTION: EMPLOYEE STATUS FORM
           ========================================== */}
        <div className="lg:col-span-7 bg-card border border-border rounded-xl p-6 shadow-xs space-y-6">
          {/* Form Header */}
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center gap-2.5">
              {selectedRecordId ? (
                <>
                  <Edit2 className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-bold text-foreground tracking-tight">
                    Edit Employee Status
                  </h3>
                </>
              ) : (
                <>
                  <Plus className="h-5 w-5 text-foreground font-bold" />
                  <h3 className="text-lg font-bold text-foreground tracking-tight">
                    Add Employee Status
                  </h3>
                </>
              )}
            </div>
            {selectedRecordId && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCancel}
                className="text-xs h-8 flex items-center gap-1.5 border-dashed border-primary/50 text-primary hover:text-primary hover:bg-primary/5 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                Add New Status
              </Button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Fieldset Box: "Default Setting" */}
            <div className="border border-border/80 rounded-xl p-5 bg-muted/10 relative space-y-5">
              <span className="absolute -top-3 left-4 bg-card px-2.5 py-0.5 text-xs font-bold text-foreground border border-border rounded-md shadow-2xs">
                Default Setting
              </span>

              {/* Employee Status Name Field */}
              <div className="space-y-2 pt-2">
                <label className="text-xs font-bold text-foreground flex items-center gap-1">
                  Employee Status <span className="text-red-500 font-bold">*</span>
                </label>
                <Input
                  type="text"
                  placeholder="Enter employee status name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="bg-background text-xs h-10 border-border"
                  required
                />
              </div>

              {/* Checkboxes Group */}
              <TooltipProvider delayDuration={150}>
                <div className="space-y-3 pt-2">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-foreground select-none">
                        <input
                          type="checkbox"
                          checked={formProbation}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setFormProbation(checked);
                            if (checked && formProbationPeriodUnit === 'Choose') {
                              setFormProbationPeriodUnit('Month(s)');
                            }
                          }}
                          className="h-4 w-4 rounded border-border text-primary focus:ring-primary/40 cursor-pointer"
                        />
                        <span>Probation Status</span>
                      </label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button type="button" className="text-muted-foreground hover:text-foreground p-0.5 rounded transition-all cursor-pointer">
                            <HelpCircle className="h-3.5 w-3.5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-[240px] text-xs">
                          Marks this status as a probationary phase. Requires setting a probation period duration.
                        </TooltipContent>
                      </Tooltip>
                    </div>

                    {formProbation && (
                      <div className="ml-6 space-y-2.5 pt-1 pb-1">
                        <label className="text-xs font-bold text-foreground flex items-center gap-1">
                          Period : <span className="text-red-500 font-bold">*</span>
                        </label>
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <select
                              value={formProbationPeriodUnit}
                              onChange={(e) => setFormProbationPeriodUnit(e.target.value)}
                              className="appearance-none bg-background border border-border text-foreground text-xs rounded-md pl-3 pr-8 py-2 min-w-[160px] cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/30"
                            >
                              <option value="Choose" disabled>Choose</option>
                              <option value="Day(s)">Day(s)</option>
                              <option value="Month(s)">Month(s)</option>
                            </select>
                            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                          </div>

                          <Input
                            type="number"
                            placeholder="Period"
                            value={formProbationPeriodValue}
                            onChange={(e) => setFormProbationPeriodValue(e.target.value)}
                            className="w-28 text-xs h-9 bg-background border-border"
                            min={1}
                          />
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-foreground select-none">
                            <input
                              type="checkbox"
                              checked={formNotifyOnCompletion}
                              onChange={(e) => setFormNotifyOnCompletion(e.target.checked)}
                              className="h-4 w-4 rounded border-border text-primary focus:ring-primary/40 cursor-pointer"
                            />
                            <span>Notify on Completion</span>
                          </label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button type="button" className="text-muted-foreground hover:text-foreground p-0.5 rounded transition-all cursor-pointer">
                                <HelpCircle className="h-3.5 w-3.5" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="max-w-[240px] text-xs">
                              Sends an automatic notification to HR/Managers when this employee completes their probation period.
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-foreground select-none">
                      <input
                        type="checkbox"
                        checked={formConfirmation}
                        onChange={(e) => setFormConfirmation(e.target.checked)}
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary/40 cursor-pointer"
                      />
                      <span>Confirmation Status</span>
                    </label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="text-muted-foreground hover:text-foreground p-0.5 rounded transition-all cursor-pointer">
                          <HelpCircle className="h-3.5 w-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-[240px] text-xs">
                        Assigning this status marks the employee as permanently Confirmed, completing any active probation.
                      </TooltipContent>
                    </Tooltip>
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-foreground select-none">
                      <input
                        type="checkbox"
                        checked={formResignation}
                        onChange={(e) => setFormResignation(e.target.checked)}
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary/40 cursor-pointer"
                      />
                      <span>Resignation Status</span>
                    </label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="text-muted-foreground hover:text-foreground p-0.5 rounded transition-all cursor-pointer">
                          <HelpCircle className="h-3.5 w-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-[240px] text-xs">
                        Indicates that the employee has resigned and is currently serving their notice period.
                      </TooltipContent>
                    </Tooltip>
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-foreground select-none">
                      <input
                        type="checkbox"
                        checked={formInactiveOnChange}
                        onChange={(e) => setFormInactiveOnChange(e.target.checked)}
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary/40 cursor-pointer"
                      />
                      <span>Inactive on Status Change</span>
                    </label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="text-muted-foreground hover:text-foreground p-0.5 rounded transition-all cursor-pointer">
                          <HelpCircle className="h-3.5 w-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-[240px] text-xs">
                        Automatically deactivates the employee account (disables login, hides from active directory) when this status is applied (e.g. Terminated, Retired).
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </TooltipProvider>

              {/* Status Color Field */}
              <div className="space-y-2 pt-2">
                <label className="text-xs font-bold text-foreground block">
                  Status Color
                </label>
                <div className="flex items-center gap-2 max-w-xs">
                  <Input
                    type="text"
                    value={formColor}
                    onChange={(e) => setFormColor(e.target.value)}
                    placeholder="#00b4d8"
                    className="bg-background text-xs h-9 border-border flex-1 font-mono uppercase"
                  />
                  <div className="relative shrink-0 w-9 h-9 border border-border rounded-md overflow-hidden p-0.5 bg-background shadow-2xs">
                    <input
                      type="color"
                      value={formColor}
                      onChange={(e) => setFormColor(e.target.value)}
                      className="w-full h-full border-0 p-0 cursor-pointer bg-transparent"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Active Toggle */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground block">
                Active
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setFormIsActive(!formIsActive)}
                  className={cn(
                    'relative inline-flex h-8 w-16 items-center rounded-md p-1 transition-colors duration-200 ease-in-out focus:outline-none cursor-pointer',
                    formIsActive ? 'bg-blue-600' : 'bg-muted-foreground/30'
                  )}
                >
                  <span
                    className={cn(
                      'inline-block h-6 w-7 rounded-sm bg-white shadow-md transform transition duration-200 ease-in-out text-[11px] font-bold text-center leading-6 select-none',
                      formIsActive ? 'translate-x-7 text-blue-600' : 'translate-x-0 text-gray-500'
                    )}
                  >
                    {formIsActive ? 'Yes' : 'No'}
                  </span>
                </button>
              </div>
            </div>

            {/* Action Buttons: Add/Save (Green) & Cancel (Red) */}
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <Button
                type="submit"
                disabled={submitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-6 py-2.5 h-10 rounded-md shadow-xs flex items-center gap-2 cursor-pointer transition-all"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : selectedRecordId ? (
                  <>
                    <Save className="h-4 w-4" />
                    Save
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 font-bold" />
                    Add
                  </>
                )}
              </Button>

              <div className="flex gap-2">
                {selectedRecordId && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={submitting}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-6 py-2.5 h-10 rounded-md shadow-xs flex items-center gap-2 cursor-pointer transition-all"
                  >
                    Delete
                  </Button>
                )}
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleCancel}
                  disabled={submitting}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-6 py-2.5 h-10 rounded-md shadow-xs flex items-center gap-2 cursor-pointer transition-all"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </Button>
              </div>
            </div>
          </form>
        </div>

        {/* ==========================================
            RIGHT SECTION: STATUS CARDS LIST
           ========================================== */}
        <div className="lg:col-span-5 bg-card border border-border rounded-xl shadow-xs overflow-hidden flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-border flex items-center justify-between bg-muted/20">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-full bg-primary/10 text-primary">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <h2 className="text-base font-bold text-foreground tracking-tight">
                Employee Status
              </h2>
            </div>
            <span className="bg-primary/10 text-primary text-xs font-bold px-2.5 py-1 rounded-full border border-primary/20">
              {filteredStatuses.length}
            </span>
          </div>

          {/* Cards List Container */}
          <div className="p-4 space-y-3 max-h-[650px] overflow-y-auto custom-scrollbar">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground space-y-2">
                <Loader2 className="h-7 w-7 animate-spin text-primary" />
                <span className="text-xs font-medium">Loading employee statuses...</span>
              </div>
            ) : filteredStatuses.length === 0 ? (
              <div className="text-center py-16 px-4 text-muted-foreground">
                <p className="text-sm font-semibold">No employee status records found</p>
                <p className="text-xs mt-1">Try adjusting your search or active filter.</p>
              </div>
            ) : (
              filteredStatuses.map((st) => {
                const isSelected = selectedRecordId === st.id;
                const bgColor = st.statusColor || '#00b4d8';

                return (
                  <div
                    key={st.id}
                    onClick={() => handleSelectStatus(st)}
                    className={cn(
                      'group relative rounded-lg p-3 cursor-pointer shadow-xs transition-all duration-200 flex items-center justify-between border bg-card border-border hover:bg-muted/40 hover:border-border/80',
                      isSelected && 'ring-2 ring-primary/20 bg-primary/5 border-primary/50 font-semibold'
                    )}
                  >
                    {/* Status Circle Icon & Name */}
                    <div className="flex items-center gap-3 pr-3 overflow-hidden">
                      <div 
                        className="w-3.5 h-3.5 rounded-full shrink-0 border border-black/10 shadow-2xs" 
                        style={{ backgroundColor: bgColor }} 
                      />
                      <span className="text-sm font-medium tracking-wide text-foreground truncate">
                        {st.name}
                      </span>
                    </div>

                    {/* Right Controls: Edit icon + Active badge */}
                    <div className="flex items-center gap-2.5 shrink-0">
                      {!st.isActive && (
                        <span className="bg-muted text-muted-foreground border border-border text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                          Inactive
                        </span>
                      )}
                      <div className="p-1.5 rounded-md text-muted-foreground group-hover:text-foreground group-hover:bg-muted/70 transition-all">
                        <Edit2 className="h-3.5 w-3.5" />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

    </div>
  );
}

export default EmployeeStatusMasterForm;
