import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  UserPlus,
  GraduationCap,
  Users,
  Settings,
  Edit2,
  X,
  CheckCircle2,
  XCircle,
  Plus
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { apiClient } from '@/lib/api';
import { useDummyMappings, useDesignations } from '../hooks/useDesignations';

interface ResourcePlan {
  id: string;
  companyId: string;
  locationId: string;
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
  const [resourcePlans, setResourcePlans] = useState<ResourcePlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | 'NEW'>('NEW');
  
  // Filters
  const [searchCategory, setSearchCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Form Data
  const [formData, setFormData] = useState<Partial<ResourcePlan>>({
    companyId: '',
    locationId: '',
    departmentId: '',
    designationId: '',
    staffRequired: 1,
    status: 'active'
  });

  // Fetch resource plans from API
  useEffect(() => {
    const fetchResourcePlans = async () => {
      try {
        const res = await apiClient.get('/settings/resource-plans');
        if (res.data?.success) {
          setResourcePlans(res.data.data);
        }
      } catch (err) {
        console.error('Failed to fetch resource plans:', err);
        toast.error('Failed to load resource plans');
      }
    };
    fetchResourcePlans();
  }, []);

  const handleSelect = (plan: ResourcePlan) => {
    setSelectedPlanId(plan.id);
    setFormData({ ...plan });
  };

  console.log('MAPPINGS DEPARTMENTS:', mappings.departments); console.log('PLANS:', resourcePlans);
  const handleAddNew = () => {
    setSelectedPlanId('NEW');
    setFormData({
      companyId: '',
      locationId: '',
      departmentId: '',
      designationId: '',
      staffRequired: 1,
      status: 'active'
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.companyId || !formData.departmentId || !formData.designationId || !formData.staffRequired) {
      toast.error('Please fill in all required fields.');
      return;
    }

    try {
      if (selectedPlanId === 'NEW') {
        const res = await apiClient.post('/settings/resource-plans', formData);
        if (res.data?.success) {
          const newPlan = { ...formData, id: res.data.data.id } as ResourcePlan;
          setResourcePlans([newPlan, ...resourcePlans]);
          toast.success('Resource Plan created successfully!');
          handleAddNew();
        }
      } else {
        const res = await apiClient.put(`/settings/resource-plans/${selectedPlanId}`, formData);
        if (res.data?.success) {
          setResourcePlans(resourcePlans.map(p => p.id === selectedPlanId ? { ...p, ...formData } as ResourcePlan : p));
          toast.success('Resource Plan updated successfully!');
        }
      }
    } catch (err) {
      console.error('Failed to save resource plan:', err);
      toast.error('Failed to save resource plan');
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this resource plan?")) return;
    try {
      const res = await apiClient.delete(`/settings/resource-plans/${id}`);
      if (res.data?.success) {
        setResourcePlans(resourcePlans.filter(p => p.id !== id));
        if (selectedPlanId === id) {
          handleAddNew();
        }
        toast.success("Resource Plan deleted successfully!");
      }
    } catch (err) {
      console.error('Failed to delete resource plan:', err);
      toast.error('Failed to delete resource plan');
    }
  };

  const filteredPlans = useMemo(() => {
    let result = resourcePlans;

    if (statusFilter !== 'All') {
      result = result.filter(p => p.status.toLowerCase() === statusFilter.toLowerCase());
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p => {
        const company = mappings.companies.find((c: any) => String(c.id || c.company_id || c.uuid || c.name) === String(p.companyId))?.name || '';
        const dept = mappings.departments.find((d: any) => String(d.id || d.department_id || d.uuid || d.name) === String(p.departmentId))?.name || '';
        const desig = designations.find((d: any) => String(d.id || d.designation_id || d.uuid || d.name) === String(p.designationId))?.name || '';
        
        if (searchCategory === 'Company Name') {
          return company.toLowerCase().includes(q);
        } else if (searchCategory === 'Department Name') {
          return dept.toLowerCase().includes(q);
        } else if (searchCategory === 'Designation Name') {
          return desig.toLowerCase().includes(q);
        }
        return company.toLowerCase().includes(q) || dept.toLowerCase().includes(q) || desig.toLowerCase().includes(q);
      });
    }

    return result;
  }, [resourcePlans, searchQuery, searchCategory, statusFilter, mappings, designations]);

  return (
    <div className="w-full space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ========================================================================= */}
        {/* LEFT COLUMN: Resource Plan Form (lg:col-span-7)                           */}
        {/* ========================================================================= */}
        <div className="lg:col-span-7 space-y-5 text-foreground">
          <form onSubmit={handleSave} className="space-y-5 text-xs font-semibold mt-6">
            
            {/* Form Card */}
            <div className="bg-card border border-border/80 rounded-sm p-6 shadow-xs space-y-5 relative mt-3">
              
              {/* Header Label inside border overlapping top edge */}
              <div className="absolute -top-3 left-4 bg-card px-2 flex items-center gap-1.5 text-foreground">
                <Edit2 className="h-4 w-4 text-muted-foreground" />
                <span className="font-bold text-sm text-muted-foreground">
                  {selectedPlanId === 'NEW' ? 'Add Resource Plan Information' : 'Update Resource Plan Information'}
                </span>
              </div>

              <div className="pt-2 space-y-4">
                
                {/* Company Dropdown */}
                <div className="space-y-1.5">
                  <label className="block text-foreground font-bold">
                    Company <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.companyId || ''}
                    onChange={e => setFormData({ ...formData, companyId: e.target.value })}
                    className="w-full h-9 px-3 border border-input rounded-sm bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                    required
                  >
                    <option value="" disabled>Select Company</option>
                    {mappings.companies.map((c: any) => {
                      const val = c.id || c.company_id || c.uuid || c.name;
                      return <option key={val} value={val}>{c.name}</option>;
                    })}
                  </select>
                </div>

                {/* Location Dropdown */}
                <div className="space-y-1.5">
                  <label className="block text-foreground font-bold">
                    Location
                  </label>
                  <select
                    value={formData.locationId || ''}
                    onChange={e => setFormData({ ...formData, locationId: e.target.value })}
                    className="w-full h-9 px-3 border border-input rounded-sm bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                  >
                    <option value="">Select Location (Optional)</option>
                    {mappings.locations.map((l: any) => {
                      const val = l.id || l.location_id || l.uuid || l.name;
                      return <option key={val} value={val}>{l.name}</option>;
                    })}
                  </select>
                </div>

                {/* Department Dropdown */}
                <div className="space-y-1.5">
                  <label className="block text-foreground font-bold">
                    Department <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.departmentId || ''}
                    onChange={e => setFormData({ ...formData, departmentId: e.target.value })}
                    className="w-full h-9 px-3 border border-input rounded-sm bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                    required
                  >
                    <option value="" disabled>Select Department</option>
                    {mappings.departments.map((d: any) => {
                      const val = d.id || d.department_id || d.uuid || d.name;
                      return <option key={val} value={val}>{d.name}</option>;
                    })}
                  </select>
                </div>

                {/* Designation Dropdown */}
                <div className="space-y-1.5">
                  <label className="block text-foreground font-bold">
                    Designation <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.designationId || ''}
                    onChange={e => setFormData({ ...formData, designationId: e.target.value })}
                    className="w-full h-9 px-3 border border-input rounded-sm bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                    required
                  >
                    <option value="" disabled>Select Designation</option>
                    {designations.map((d: any) => {
                      const val = d.id || d.designation_id || d.uuid || d.name;
                      return <option key={val} value={val}>{d.name}</option>;
                    })}
                  </select>
                </div>

                {/* Staff Required Input */}
                <div className="space-y-1.5">
                  <label className="block text-foreground font-bold">
                    Staff Required <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type="number"
                    min={1}
                    value={formData.staffRequired || ''}
                    onChange={e => setFormData({ ...formData, staffRequired: parseInt(e.target.value) || 1 })}
                    placeholder="e.g. 1"
                    className="h-9 border-input bg-background text-foreground text-xs rounded-sm focus-visible:ring-2 focus-visible:ring-primary/20 font-medium"
                    required
                  />
                </div>

                {/* Active Toggle */}
                <div className="space-y-1.5 max-w-xs">
                  <label className="block text-foreground font-bold">
                    Active
                  </label>
                  <div className="flex items-center border border-input rounded-sm overflow-hidden bg-background h-9 p-0.5 w-16">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, status: formData.status === 'active' ? 'inactive' : 'active' })}
                      className={cn(
                        'flex-1 h-full rounded-sm text-xs font-bold transition-all flex items-center justify-center cursor-pointer',
                        formData.status === 'active'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-background text-foreground hover:bg-muted/50'
                      )}
                    >
                      {formData.status === 'active' ? 'Yes' : 'No'}
                    </button>
                  </div>
                </div>

              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-6 border-t border-border mt-4">
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-9 px-5 rounded-sm flex items-center gap-1.5 text-xs shadow-xs transition-all cursor-pointer"
                >
                  {selectedPlanId !== 'NEW' ? (
                    <><Plus className="h-4 w-4" /> Update</>
                  ) : (
                    <><Plus className="h-4 w-4" /> Add</>
                  )}
                </button>

                <button
                  type="button"
                  onClick={onCancel || handleAddNew}
                  className="bg-rose-500 hover:bg-rose-600 text-white font-bold h-9 px-5 rounded-sm flex items-center gap-1.5 text-xs shadow-xs transition-all cursor-pointer"
                >
                  <X className="h-4 w-4 stroke-[2.5]" /> Cancel
                </button>
              </div>

            </div>
          </form>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: Resource Plan Display List (lg:col-span-5)                  */}
        {/* ========================================================================= */}
        <div className="lg:col-span-5 bg-card border border-border/80 rounded-2xl p-4 shadow-xs space-y-4 sticky top-6">
          
          {/* Top Filters & Search Bar */}
          <div className="flex items-center gap-2 text-xs">
            {/* Unified Search Input with Category Dropdown */}
            <div className="flex-1 flex h-8 border border-input rounded-xl overflow-hidden bg-background">
              <select
                className="h-full px-2 bg-muted/50 border-r border-input text-xs font-semibold focus:outline-none cursor-pointer text-foreground"
                value={searchCategory}
                onChange={e => setSearchCategory(e.target.value)}
              >
                <option value="All">All</option>
                <option value="Company Name">Company Name</option>
                <option value="Department Name">Department Name</option>
                <option value="Designation Name">Designation Name</option>
              </select>
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full h-full pl-2 pr-7 bg-transparent text-foreground placeholder:text-muted-foreground/60 text-xs focus:outline-none"
                />
                <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              </div>
            </div>

            <div className="w-24">
              <select
                className="w-full h-8 px-2 border border-input rounded-xl bg-background text-foreground font-semibold text-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
              >
                <option value="All">All</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Title Bar with Count */}
          <div className="flex justify-between items-center border-b-[3px] border-primary pb-2.5 pt-1">
            <div className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-primary" />
              <span className="font-bold text-sm text-foreground tracking-tight">Resource Plan</span>
            </div>
            <span className="font-bold text-sm text-foreground">
              {filteredPlans.length}
            </span>
          </div>

          {/* Cards List */}
          <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
            {filteredPlans.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground font-medium bg-muted/20 border border-dashed border-border rounded-xl">
                No resource plans found.
              </div>
            ) : (
              filteredPlans.map(plan => {
                const isSelected = selectedPlanId === plan.id;
                const companyName = mappings.companies.find((c: any) => String(c.id || c.company_id || c.uuid || c.name) === String(plan.companyId))?.name || 'Unknown Company';
                const deptName = mappings.departments.find((d: any) => String(d.id || d.department_id || d.uuid || d.name) === String(plan.departmentId))?.name || 'Unknown Department';
                const desigName = designations.find((d: any) => String(d.id || d.designation_id || d.uuid || d.name) === String(plan.designationId))?.name || 'Unknown Designation';

                return (
                  <div
                    key={plan.id}
                    onClick={() => handleSelect(plan)}
                    className={cn(
                      'p-4 rounded-md transition-all cursor-pointer relative group flex flex-col gap-2',
                      isSelected
                        ? 'bg-primary text-primary-foreground shadow-md ring-1 ring-primary/50'
                        : 'bg-primary/20 text-foreground hover:bg-primary/30 border border-transparent'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <GraduationCap className={cn("h-4 w-4", isSelected ? "text-primary-foreground/90" : "text-primary")} />
                      <span className={cn("font-bold text-sm", isSelected ? "text-primary-foreground" : "text-foreground")}>{companyName}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="flex items-center gap-1.5">
                        <Users className={cn("h-3.5 w-3.5", isSelected ? "text-primary-foreground/80" : "text-muted-foreground")} />
                        <span className={cn("text-xs font-semibold uppercase", isSelected ? "text-primary-foreground/90" : "text-muted-foreground")}>{deptName}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Settings className={cn("h-3.5 w-3.5", isSelected ? "text-primary-foreground/80" : "text-muted-foreground")} />
                        <span className={cn("text-xs font-semibold uppercase", isSelected ? "text-primary-foreground/90" : "text-muted-foreground")}>{desigName}</span>
                      </div>
                    </div>
                    
                    {!isSelected && plan.status === 'inactive' && (
                      <div className="absolute top-3 right-8 mr-1">
                         <span className="inline-flex items-center gap-1 text-[9px] font-bold text-rose-600 bg-rose-500/10 px-1.5 py-0.5 rounded-sm uppercase tracking-wider">
                           Inactive
                         </span>
                      </div>
                    )}
                    
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={(e) => handleDelete(plan.id, e)}
                        className={cn(
                          "p-1.5 rounded-sm flex items-center justify-center transition-colors",
                          isSelected 
                            ? "text-primary-foreground/80 hover:text-white hover:bg-rose-500/80" 
                            : "text-rose-500 hover:bg-rose-500/10"
                        )}
                      >
                        <X className="h-4 w-4" />
                      </button>
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
