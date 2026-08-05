import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  UserPlus,
  Building2,
  Users,
  Briefcase,
  Edit2,
  X,
  Check,
  Plus,
  Trash2,
  AlertCircle,
  Loader2,
  FileText
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { apiClient } from '@/lib/api';
import { useDummyMappings, useDesignations } from '../hooks/useDesignations';

export interface ResourcePlanRecord {
  id: string;
  companyId: string;
  locationId?: string;
  departmentId: string;
  designationId: string;
  staffRequired: number;
  status: 'active' | 'inactive';
}

interface ResourcePlanMasterFormProps {
  onCancel?: () => void;
}

export function ResourcePlanMasterForm({ onCancel }: ResourcePlanMasterFormProps) {
  // Hooks for dropdown data
  const mappings = useDummyMappings();
  const { designations } = useDesignations();

  // Local state for resource plans
  const [resourcePlans, setResourcePlans] = useState<ResourcePlanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | 'NEW'>('NEW');

  // Filters & Search
  const [searchCategory, setSearchCategory] = useState<'All' | 'Company' | 'Department' | 'Designation'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('All');

  // Form Data
  const [companyId, setCompanyId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [designationId, setDesignationId] = useState('');
  const [staffRequired, setStaffRequired] = useState<number>(1);
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  // Fetch resource plans from API
  const fetchResourcePlans = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/settings/resource-plans');
      if (res.data?.success) {
        setResourcePlans(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch resource plans:', err);
      toast.error('Failed to load resource plans.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResourcePlans();
  }, []);

  const handleAddNew = () => {
    setSelectedPlanId('NEW');
    setCompanyId('');
    setLocationId('');
    setDepartmentId('');
    setDesignationId('');
    setStaffRequired(1);
    setStatus('active');
  };

  const handleSelect = (plan: ResourcePlanRecord) => {
    setSelectedPlanId(plan.id);
    setCompanyId(plan.companyId || '');
    setLocationId(plan.locationId || '');
    setDepartmentId(plan.departmentId || '');
    setDesignationId(plan.designationId || '');
    setStaffRequired(plan.staffRequired || 1);
    setStatus(plan.status || 'active');
  };

  const handleReset = () => {
    if (selectedPlanId === 'NEW') {
      handleAddNew();
    } else {
      const plan = resourcePlans.find(p => p.id === selectedPlanId);
      if (plan) handleSelect(plan);
    }
    toast.info('Form Reset', { description: 'Restored form fields.' });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) {
      toast.error('Validation Error', { description: 'Company is required.' });
      return;
    }
    if (!departmentId) {
      toast.error('Validation Error', { description: 'Department is required.' });
      return;
    }
    if (!designationId) {
      toast.error('Validation Error', { description: 'Designation is required.' });
      return;
    }
    if (!staffRequired || staffRequired < 1) {
      toast.error('Validation Error', { description: 'Staff required must be at least 1.' });
      return;
    }

    const payload = {
      companyId,
      locationId: locationId || undefined,
      departmentId,
      designationId,
      staffRequired,
      status
    };

    try {
      setSaving(true);
      if (selectedPlanId === 'NEW') {
        const res = await apiClient.post('/settings/resource-plans', payload);
        if (res.data?.success) {
          const newPlan = { ...payload, id: res.data.data.id } as ResourcePlanRecord;
          setResourcePlans([newPlan, ...resourcePlans]);
          toast.success('Resource Plan Created', { description: 'New staffing plan saved successfully.' });
          handleAddNew();
        }
      } else {
        const res = await apiClient.put(`/settings/resource-plans/${selectedPlanId}`, payload);
        if (res.data?.success) {
          setResourcePlans(resourcePlans.map(p => p.id === selectedPlanId ? { ...p, ...payload } as ResourcePlanRecord : p));
          toast.success('Resource Plan Updated', { description: 'Staffing plan updated successfully.' });
        }
      }
    } catch (err: any) {
      console.error('Failed to save resource plan:', err);
      toast.error('Save Failed', { description: err?.response?.data?.message || 'Failed to save resource plan.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this resource plan?')) return;
    try {
      const res = await apiClient.delete(`/settings/resource-plans/${id}`);
      if (res.data?.success) {
        setResourcePlans(resourcePlans.filter(p => p.id !== id));
        if (selectedPlanId === id) {
          handleAddNew();
        }
        toast.info('Resource Plan Deleted', { description: 'Staffing plan removed.' });
      }
    } catch (err: any) {
      console.error('Failed to delete resource plan:', err);
      toast.error('Delete Failed', { description: err?.response?.data?.message || 'Failed to delete resource plan.' });
    }
  };

  // Helper matching names
  const getCompanyName = (cId: string) =>
    mappings.companies.find((c: any) => String(c.id || c.company_id || c.uuid || c.name) === String(cId))?.name || 'Company';

  const getDeptName = (dId: string) =>
    mappings.departments.find((d: any) => String(d.id || d.department_id || d.uuid || d.name) === String(dId))?.name || 'Department';

  const getDesigName = (dsId: string) =>
    designations.find((d: any) => String(d.id || d.designation_id || d.uuid || d.name) === String(dsId))?.name || 'Designation';

  // Filtered List
  const filteredPlans = useMemo(() => {
    return resourcePlans.filter(p => {
      if (statusFilter === 'Active' && p.status !== 'active') return false;
      if (statusFilter === 'Inactive' && p.status !== 'inactive') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const comp = getCompanyName(p.companyId).toLowerCase();
        const dept = getDeptName(p.departmentId).toLowerCase();
        const desig = getDesigName(p.designationId).toLowerCase();

        if (searchCategory === 'Company') return comp.includes(q);
        if (searchCategory === 'Department') return dept.includes(q);
        if (searchCategory === 'Designation') return desig.includes(q);
        return comp.includes(q) || dept.includes(q) || desig.includes(q);
      }
      return true;
    });
  }, [resourcePlans, searchQuery, searchCategory, statusFilter, mappings, designations]);

  return (
    <div className="space-y-6">
      {/* Top Section / Header matching Theme */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-foreground">Resource Planning</h2>
            <Badge variant="outline" className="text-[11px] font-semibold bg-primary/10 text-primary border-primary/20">
              Resource & Workforce Planning
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Configure workforce staffing requirements and headcount plans across companies, departments, and designations.
          </p>
        </div>

        <Button
          type="button"
          onClick={handleAddNew}
          size="sm"
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold gap-1.5 shadow-xs cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>New Resource Plan</span>
        </Button>
      </div>

      {/* Main 2-Column Standard Layout: Left = Form (7 Cols), Right = Directory List (5 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* ── LEFT COLUMN: Add / Edit Resource Plan Form (7 Cols) ─────── */}
        <div className="lg:col-span-7 bg-card border border-border rounded-2xl p-5 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-primary" />
              <span>{selectedPlanId === 'NEW' ? 'Add Resource Plan' : 'Edit Resource Plan'}</span>
            </h3>
            {selectedPlanId !== 'NEW' && (
              <Badge variant="secondary" className="text-[10px] font-semibold">
                Editing Mode
              </Badge>
            )}
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            {/* Company */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                <span>Company</span>
                <span className="text-rose-500">*</span>
              </label>
              <select
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                disabled={saving}
                className="w-full h-10 px-3 text-xs border border-input rounded-xl bg-background text-foreground font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
                required
              >
                <option value="">Select Company</option>
                {mappings.companies.map((c: any) => {
                  const val = String(c.id || c.company_id || c.uuid || c.name);
                  return <option key={val} value={val}>{c.name}</option>;
                })}
              </select>
            </div>

            {/* Location (Optional) */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground block">
                Location (Optional)
              </label>
              <select
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                disabled={saving}
                className="w-full h-10 px-3 text-xs border border-input rounded-xl bg-background text-foreground font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Select Location (Optional)</option>
                {mappings.locations.map((l: any) => {
                  const val = String(l.id || l.location_id || l.uuid || l.name);
                  return <option key={val} value={val}>{l.name}</option>;
                })}
              </select>
            </div>

            {/* Department */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                <span>Department</span>
                <span className="text-rose-500">*</span>
              </label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                disabled={saving}
                className="w-full h-10 px-3 text-xs border border-input rounded-xl bg-background text-foreground font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
                required
              >
                <option value="">Select Department</option>
                {mappings.departments.map((d: any) => {
                  const val = String(d.id || d.department_id || d.uuid || d.name);
                  return <option key={val} value={val}>{d.name}</option>;
                })}
              </select>
            </div>

            {/* Designation */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                <span>Designation</span>
                <span className="text-rose-500">*</span>
              </label>
              <select
                value={designationId}
                onChange={(e) => setDesignationId(e.target.value)}
                disabled={saving}
                className="w-full h-10 px-3 text-xs border border-input rounded-xl bg-background text-foreground font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
                required
              >
                <option value="">Select Designation</option>
                {designations.map((d: any) => {
                  const val = String(d.id || d.designation_id || d.uuid || d.name);
                  return <option key={val} value={val}>{d.name}</option>;
                })}
              </select>
            </div>

            {/* Staff Required */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                <span>Staff Required</span>
                <span className="text-rose-500">*</span>
              </label>
              <Input
                type="number"
                min={1}
                value={staffRequired}
                onChange={(e) => setStaffRequired(parseInt(e.target.value) || 1)}
                disabled={saving}
                placeholder="e.g. 2"
                className="h-10 text-xs border-input rounded-xl focus:ring-2 focus:ring-primary/20 bg-background font-medium"
                required
              />
            </div>

            {/* Active Status Switch */}
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-semibold text-foreground block">Active Status</label>
              <div className="flex items-center gap-2 max-w-[160px]">
                <button
                  type="button"
                  onClick={() => setStatus('active')}
                  disabled={saving}
                  className={cn(
                    'flex-1 h-9 text-xs font-bold rounded-xl border transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50',
                    status === 'active'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-background text-muted-foreground border-border hover:bg-accent/50'
                  )}
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>Yes</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStatus('inactive')}
                  disabled={saving}
                  className={cn(
                    'flex-1 h-9 text-xs font-bold rounded-xl border transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50',
                    status === 'inactive'
                      ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                      : 'bg-background text-muted-foreground border-border hover:bg-accent/50'
                  )}
                >
                  <X className="h-3.5 w-3.5" />
                  <span>No</span>
                </button>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex items-center gap-3 pt-4 border-t border-border">
              <Button
                type="submit"
                disabled={saving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold h-10 px-6 rounded-xl text-xs gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                <span>{selectedPlanId === 'NEW' ? 'Add Plan' : 'Update Plan'}</span>
              </Button>

              <Button
                type="button"
                variant="destructive"
                onClick={onCancel || handleReset}
                disabled={saving}
                className="bg-rose-600 hover:bg-rose-700 text-white font-semibold h-10 px-5 rounded-xl text-xs gap-1.5 cursor-pointer ml-auto disabled:opacity-50"
              >
                <X className="h-4 w-4" />
                <span>Cancel</span>
              </Button>
            </div>
          </form>
        </div>

        {/* ── RIGHT COLUMN: Resource Plans Directory List (5 Cols) ─────── */}
        <div className="lg:col-span-5 space-y-4">

          {/* Filter & Search Header */}
          <div className="bg-card border border-border rounded-2xl p-4 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search plan details..."
                  className="pl-9 h-9 text-xs border-input rounded-xl bg-background"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <select
                value={searchCategory}
                onChange={(e: any) => setSearchCategory(e.target.value)}
                className="h-9 text-xs px-2 border border-input rounded-xl bg-background text-foreground font-semibold cursor-pointer focus:outline-none"
              >
                <option value="All">All Fields</option>
                <option value="Company">Company</option>
                <option value="Department">Department</option>
                <option value="Designation">Designation</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e: any) => setStatusFilter(e.target.value)}
                className="h-9 text-xs px-2 border border-input rounded-xl bg-background text-foreground font-semibold cursor-pointer focus:outline-none"
              >
                <option value="All">All Status</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            {/* Title Bar */}
            <div className="flex items-center justify-between pt-1 border-t border-border/60">
              <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                <FileText className="h-4 w-4 text-primary" />
                <span>Resource Plans</span>
              </div>
              <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[11px] font-bold px-2 py-0.5 rounded-full">
                {filteredPlans.length}
              </Badge>
            </div>
          </div>

          {/* Cards Stack */}
          <div className="space-y-2.5 max-h-[640px] overflow-y-auto pr-1">
            {loading ? (
              <div className="p-8 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="text-xs font-medium">Loading resource plans...</p>
              </div>
            ) : filteredPlans.length === 0 ? (
              <div className="bg-card border border-border rounded-2xl p-8 text-center space-y-2">
                <UserPlus className="h-8 w-8 text-muted-foreground mx-auto opacity-40" />
                <p className="text-xs font-semibold text-foreground">No resource plans found.</p>
                <p className="text-[11px] text-muted-foreground">Try adjusting search or add a new plan.</p>
              </div>
            ) : (
              filteredPlans.map((plan) => {
                const isSelected = selectedPlanId === plan.id;
                const companyName = getCompanyName(plan.companyId);
                const deptName = getDeptName(plan.departmentId);
                const desigName = getDesigName(plan.designationId);

                return (
                  <div
                    key={plan.id}
                    onClick={() => handleSelect(plan)}
                    className={cn(
                      'p-3.5 rounded-2xl border transition-all cursor-pointer group space-y-2 relative shadow-2xs',
                      isSelected
                        ? 'bg-primary text-primary-foreground border-primary shadow-md font-medium'
                        : 'bg-card border-border/80 hover:border-primary/50 hover:bg-accent/40 text-foreground'
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Building2 className={cn('h-4 w-4 shrink-0', isSelected ? 'text-primary-foreground' : 'text-primary')} />
                        <h4 className="text-xs font-bold truncate leading-tight">
                          {companyName}
                        </h4>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={cn(
                          'text-[10px] font-bold px-2 py-0.5 rounded-full border transition-colors',
                          isSelected
                            ? 'bg-white/20 text-white border-white/30'
                            : plan.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                        )}>
                          {plan.status === 'active' ? 'Active' : 'Inactive'}
                        </span>

                        <button
                          type="button"
                          onClick={(e) => handleDelete(plan.id, e)}
                          title="Delete Resource Plan"
                          className={cn(
                            'p-1.5 rounded-lg transition-colors cursor-pointer',
                            isSelected
                              ? 'text-primary-foreground/80 hover:text-white hover:bg-white/10'
                              : 'text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                          )}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 pt-0.5 text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <Users className={cn('h-3.5 w-3.5', isSelected ? 'text-white/80' : 'text-muted-foreground')} />
                        <span className={cn('font-semibold', isSelected ? 'text-white/90' : 'text-muted-foreground')}>
                          {deptName}
                        </span>
                      </div>

                      <span className={isSelected ? 'text-white/40' : 'text-muted-foreground/40'}>•</span>

                      <div className="flex items-center gap-1.5">
                        <Briefcase className={cn('h-3.5 w-3.5', isSelected ? 'text-white/80' : 'text-muted-foreground')} />
                        <span className={cn('font-semibold', isSelected ? 'text-white/90' : 'text-muted-foreground')}>
                          {desigName}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[11px]">
                      <span className={isSelected ? 'text-white/80' : 'text-muted-foreground'}>
                        Headcount Target:
                      </span>
                      <Badge variant="outline" className={cn(
                        'text-[10px] font-bold px-2 py-0.5',
                        isSelected ? 'bg-white/20 text-white border-white/30' : 'bg-primary/10 text-primary border-primary/20'
                      )}>
                        {plan.staffRequired} {plan.staffRequired === 1 ? 'Person' : 'People'}
                      </Badge>
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
