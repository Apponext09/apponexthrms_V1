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
    setFormData({
      name: type.name || type.employment_type || type.employmentType || type.title || '',
      status: (type.status || 'active').toLowerCase() === 'inactive' ? 'inactive' : 'active'
    });
    setEditingId(type.id);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

      {/* Left Column - Form */}
      <div className="lg:col-span-7 bg-background dark:bg-card rounded-xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-border p-4 md:p-5 flex flex-col">

        <div className="flex items-center gap-2 mb-4">
          <Plus className="w-4 h-4 text-foreground dark:text-foreground stroke-[2.5]" />
          <h3 className="text-base font-bold text-foreground dark:text-foreground">
            {editingId ? 'Update' : 'Add'} Employment Type
          </h3>
        </div>

        <div className="border-b border-border my-3"></div>

        <form onSubmit={handleAddOrUpdate} className="space-y-4">

          <div className="space-y-2">
            <label className="text-sm font-bold text-foreground dark:text-foreground flex">
              Employment Type <span className="text-rose-500 ml-1">*</span>
            </label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="h-9 bg-background dark:bg-background border-border text-sm rounded-md"
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-foreground dark:text-foreground">
              Active
            </label>
            <div className="flex border border-border rounded-md w-fit overflow-hidden bg-background dark:bg-background h-9">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setFormData({ ...formData, status: 'active' })}
                className={cn(
                  "px-5 h-full text-xs font-bold rounded-lg transition-all cursor-pointer",
                  formData.status === 'active'
                    ? "bg-[#337ab7] text-white"
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
                    ? "bg-rose-500 text-white"
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
      <div className="lg:col-span-5 bg-background dark:bg-card rounded-xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-border p-4 md:p-5 flex flex-col">

        {/* List Header & Add Button */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-foreground dark:text-foreground">
            Employment Types List
          </h3>
          <Button
            onClick={handleCancel}
            className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-xs font-bold h-8 px-3 shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 mr-1 stroke-[3]" />
            Add New
          </Button>
        </div>

        {/* Search Toolbar */}
        <div className="flex items-center mb-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-9 px-3 border-r-0 rounded-r-none text-xs font-medium text-foreground bg-background">
                All <ChevronDown className="ml-1 h-3 w-3 text-muted-foreground/70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>All Fields</DropdownMenuItem>
              <DropdownMenuItem>Name Only</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="sm:col-span-8 relative">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search employment types..."
              className="h-8 pl-2.5 pr-8 border border-input rounded-xl bg-background text-foreground text-xs placeholder:text-muted-foreground/60 focus-visible:ring-2 focus-visible:ring-primary/20"
            />
            <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/70" />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-9 px-3 border-l-0 rounded-l-none text-xs font-medium text-foreground bg-background">
                {statusFilter} <ChevronDown className="ml-1 h-3 w-3 text-muted-foreground/70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setStatusFilter('All')}>All</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter('Active')}>Active</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter('Inactive')}>Inactive</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Summary Header */}
        <div className="border-t-[2px] border-[#20b2aa] pt-3 mb-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Users className="w-4 h-4 text-[#20b2aa]" />
            <h4 className="text-sm font-bold text-foreground dark:text-foreground">Employment Type</h4>
          </div>
          <span className="text-sm font-bold text-foreground dark:text-foreground">
            {filteredTypes.length}
          </span>
        </div>

        {/* Cards List */}
        <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1 custom-scrollbar">
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground/70" />
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
            <div className="text-center py-8 text-sm text-muted-foreground bg-muted/30 dark:bg-card rounded-lg border border-border border-dashed">
              No employment types found matching your criteria.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
