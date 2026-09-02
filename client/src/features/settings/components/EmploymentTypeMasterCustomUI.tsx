import React, { useState } from 'react';
import { Users, Plus, X, Search, ChevronDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useEmployeeTypes } from '../hooks/useEmployeeTypes';

export function EmploymentTypeMasterCustomUI() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('All');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | number | null>(null);
  
  const { employeeTypes, isLoading, createEmployeeType, updateEmployeeType, deleteEmployeeType } = useEmployeeTypes();

  const [formData, setFormData] = useState({ name: '', status: 'active' as 'active' | 'inactive' });

  const filteredTypes = employeeTypes.filter(type => {
    if (statusFilter === 'Active' && type.status !== 'active') return false;
    if (statusFilter === 'Inactive' && type.status !== 'inactive') return false;
    if (searchQuery && !type.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const handleAddOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Employment Type name is required');
      return;
    }
    
    setIsSubmitting(true);
    try {
      if (editingId) {
        await updateEmployeeType({ id: editingId, data: { name: formData.name, status: formData.status } });
        toast.success('Employment Type updated successfully!');
      } else {
        await createEmployeeType({ name: formData.name, status: formData.status });
        toast.success('Employment Type added successfully!');
      }
      handleCancel();
    } catch (error: any) {
      toast.error(error.response?.data?.message || `Failed to ${editingId ? 'update' : 'add'} Employment Type`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!editingId) return;
    if (!window.confirm('Are you sure you want to delete this Employment Type?')) return;
    
    setIsSubmitting(true);
    try {
      await deleteEmployeeType(editingId);
      toast.success('Employment Type deleted successfully!');
      handleCancel();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete Employment Type');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setFormData({ name: '', status: 'active' });
    setEditingId(null);
  };

  const handleEdit = (type: any) => {
    setFormData({ name: type.name, status: type.status });
    setEditingId(type.id);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      
      {/* Left Column - Form */}
      <div className="lg:col-span-7 bg-card border border-border/80 rounded-2xl p-5 md:p-6 shadow-xs flex flex-col">
        
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Users className="w-4 h-4 stroke-[2.5]" />
          </div>
          <h3 className="text-base font-bold text-foreground">
            {editingId ? 'Update' : 'Add'} Employment Type
          </h3>
        </div>

        <div className="border-b border-border my-3"></div>

        <form onSubmit={handleAddOrUpdate} className="space-y-4">
          
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground flex items-center gap-1">
              Employment Type <span className="text-rose-500">*</span>
            </label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Full Time, Part Time, Contract..."
              className="h-9 bg-background border-input text-foreground text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground block">
              Active Status
            </label>
            <div className="flex border border-input rounded-xl w-fit overflow-hidden bg-muted/30 p-0.5 h-9 items-center">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setFormData({ ...formData, status: 'active' })}
                className={cn(
                  "px-5 h-full text-xs font-bold rounded-lg transition-all cursor-pointer",
                  formData.status === 'active' 
                    ? "bg-emerald-600 text-white shadow-xs" 
                    : "text-muted-foreground hover:bg-muted/50"
                )}
              >
                Yes
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setFormData({ ...formData, status: 'inactive' })}
                className={cn(
                  "px-5 h-full text-xs font-bold rounded-lg transition-all cursor-pointer",
                  formData.status === 'inactive' 
                    ? "bg-rose-600 text-white shadow-xs" 
                    : "text-muted-foreground hover:bg-muted/50"
                )}
              >
                No
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-3 border-t border-border">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-xs font-bold h-9 px-5 shadow-xs cursor-pointer"
            >
              {isSubmitting ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Plus className="w-3.5 h-3.5 mr-1.5 stroke-[2.5]" />}
              {editingId ? 'Update' : 'Add'}
            </Button>

            {editingId && (
              <Button
                type="button"
                onClick={handleDelete}
                disabled={isSubmitting}
                className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold h-9 px-5 shadow-xs cursor-pointer"
              >
                Delete
              </Button>
            )}

            <Button
              type="button"
              onClick={handleCancel}
              variant="outline"
              disabled={isSubmitting}
              className="bg-muted hover:bg-muted/80 text-foreground border-input rounded-xl text-xs font-bold h-9 px-5 shadow-xs cursor-pointer"
            >
              <X className="w-3.5 h-3.5 mr-1.5 stroke-[2.5]" />
              Cancel
            </Button>
          </div>
        </form>
      </div>

      {/* Right Column - List */}
      <div className="lg:col-span-5 bg-card border border-border/80 rounded-2xl p-5 shadow-xs flex flex-col space-y-4">
        
        {/* List Header & Add Button */}
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground uppercase tracking-tight">
              Employment Types
            </h3>
          </div>
          <Button 
            onClick={handleCancel}
            className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-xs font-bold h-8 px-3 shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 mr-1 stroke-[3]" />
            Add New
          </Button>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs">
          <div className="sm:col-span-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full h-8 px-2.5 border border-input rounded-xl bg-background text-foreground font-semibold text-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="All">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          <div className="sm:col-span-8 relative">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search employment types..."
              className="h-8 pl-2.5 pr-8 border border-input rounded-xl bg-background text-foreground text-xs placeholder:text-muted-foreground/60 focus-visible:ring-2 focus-visible:ring-primary/20"
            />
            <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          </div>
        </div>

        {/* Summary Count Header */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs font-semibold text-muted-foreground">Total Listed</span>
          <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-muted text-foreground font-mono">
            {filteredTypes.length}
          </span>
        </div>

        {/* Cards List */}
        <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1 custom-scrollbar">
          {isLoading ? (
            <div className="flex justify-center items-center py-8 text-xs text-muted-foreground font-medium gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-primary" /> Loading employment types...
            </div>
          ) : filteredTypes.length > 0 ? (
            filteredTypes.map((type) => {
              const isSelected = editingId === type.id;
              return (
                <div 
                  key={type.id}
                  onClick={() => handleEdit(type)}
                  className={cn(
                    "p-3.5 rounded-xl border transition-all cursor-pointer relative group flex flex-col gap-2",
                    isSelected
                      ? "border-primary bg-primary/5 shadow-xs ring-1 ring-primary"
                      : "border-border/80 bg-card hover:border-primary/50 hover:bg-accent/40"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                        <Users className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-bold text-xs text-foreground truncate">{type.name}</span>
                    </div>

                    <div>
                      {type.status === 'active' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md uppercase">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md uppercase">
                          Inactive
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="border-t border-border/50 pt-2 flex items-center justify-between text-[11px] text-muted-foreground font-medium">
                    <span>Click to edit or manage</span>
                    <span className="font-mono text-[10px] font-semibold text-muted-foreground/70">
                      ID: #{type.id}
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8 text-xs text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-border">
              No employment types found matching your criteria.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
