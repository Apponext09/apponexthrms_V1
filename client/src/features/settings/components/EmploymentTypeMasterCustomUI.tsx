import React, { useState } from 'react';
import { Users, Plus, X, Search, ChevronDown } from 'lucide-react';
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

export function EmploymentTypeMasterCustomUI() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('All');
  
  const [employmentTypes, setEmploymentTypes] = useState([
    { id: 1, name: 'Contract', status: 'active', color: '#3bc4c4' },
    { id: 2, name: 'Full Time', status: 'active', color: '#3bc4c4' },
    { id: 3, name: 'Part Time', status: 'active', color: '#88a8a8' },
    { id: 4, name: 'Regular', status: 'inactive', color: '#88a8a8' },
  ]);

  const [formData, setFormData] = useState({ name: '', status: 'active' });

  const filteredTypes = employmentTypes.filter(type => {
    if (statusFilter === 'Active' && type.status !== 'active') return false;
    if (statusFilter === 'Inactive' && type.status !== 'inactive') return false;
    if (searchQuery && !type.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Employment Type name is required');
      return;
    }
    const newId = Math.max(...employmentTypes.map(t => t.id), 0) + 1;
    setEmploymentTypes([...employmentTypes, { id: newId, name: formData.name, status: formData.status, color: formData.status === 'active' ? '#3bc4c4' : '#88a8a8' }]);
    setFormData({ name: '', status: 'active' });
    toast.success('Employment Type added successfully!');
  };

  const handleCancel = () => {
    setFormData({ name: '', status: 'active' });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      
      {/* Left Column - Form */}
      <div className="lg:col-span-7 bg-white dark:bg-card rounded-xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-border p-6 md:p-8 flex flex-col">
        
        <div className="flex items-center gap-2 mb-6">
          <Plus className="w-5 h-5 text-slate-800 dark:text-foreground stroke-[2.5]" />
          <h3 className="text-lg font-bold text-slate-800 dark:text-foreground">
            Add Employment Type
          </h3>
        </div>

        <div className="border-b border-border mb-6"></div>

        <form onSubmit={handleAdd} className="space-y-6">
          
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 dark:text-foreground flex">
              Employment Type <span className="text-rose-500 ml-1">*</span>
            </label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="h-10 bg-white dark:bg-background border-border text-sm rounded-lg"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 dark:text-foreground">
              Active
            </label>
            <div className="flex border border-border rounded-lg w-fit overflow-hidden bg-white dark:bg-background h-10">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, status: 'active' })}
                className={cn(
                  "px-6 h-full text-sm font-semibold transition-colors",
                  formData.status === 'active' 
                    ? "bg-[#337ab7] text-white" 
                    : "text-slate-600 hover:bg-slate-100"
                )}
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, status: 'inactive' })}
                className={cn(
                  "px-6 h-full text-sm font-semibold border-l border-border transition-colors",
                  formData.status === 'inactive' 
                    ? "bg-rose-500 text-white" 
                    : "text-slate-600 hover:bg-slate-100"
                )}
              >
                No
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-6">
            <Button
              type="submit"
              className="bg-[#00a65a] hover:bg-[#008d4c] text-white rounded-lg text-sm font-bold h-10 px-6 shadow-sm"
            >
              <Plus className="w-4 h-4 mr-1.5 stroke-[2.5]" />
              Add
            </Button>

            <Button
              type="button"
              onClick={handleCancel}
              variant="outline"
              className="bg-[#dd4b39] hover:bg-[#d73925] border-0 text-white rounded-lg text-sm font-bold h-10 px-6 shadow-sm"
            >
              <X className="w-4 h-4 mr-1.5 stroke-[2.5]" />
              Cancel
            </Button>
          </div>
        </form>
      </div>

      {/* Right Column - List */}
      <div className="lg:col-span-5 bg-white dark:bg-card rounded-xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-border p-6 flex flex-col">
        
        {/* List Header & Add Button */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-slate-800 dark:text-foreground">
            Employment Types List
          </h3>
          <Button 
            onClick={handleCancel}
            className="bg-[#00a65a] hover:bg-[#008d4c] text-white rounded-lg text-xs font-bold h-8 px-3 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 mr-1 stroke-[3]" />
            Add New
          </Button>
        </div>

        {/* Search Toolbar */}
        <div className="flex items-center mb-6">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-10 px-3 border-r-0 rounded-r-none text-sm font-medium text-slate-700 bg-white">
                All <ChevronDown className="ml-2 h-4 w-4 text-slate-400" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>All Fields</DropdownMenuItem>
              <DropdownMenuItem>Name Only</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="relative flex-1">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search term..."
              className="h-10 rounded-none border-x-0 text-sm shadow-none focus-visible:ring-0 px-3 pr-8"
            />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-10 px-3 border-l-0 rounded-l-none text-sm font-medium text-slate-700 bg-white">
                {statusFilter} <ChevronDown className="ml-2 h-4 w-4 text-slate-400" />
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
        <div className="border-t-[3px] border-[#20b2aa] pt-4 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#20b2aa]" />
            <h4 className="text-base font-bold text-slate-800 dark:text-foreground">Employment Type</h4>
          </div>
          <span className="text-base font-bold text-slate-800 dark:text-foreground">
            {filteredTypes.length}
          </span>
        </div>

        {/* Cards List */}
        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
          {filteredTypes.length > 0 ? (
            filteredTypes.map((type) => (
              <div 
                key={type.id}
                className="rounded-xl p-4 text-white shadow-sm transition-transform hover:scale-[1.01] cursor-pointer"
                style={{ backgroundColor: type.color }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-5 h-5" />
                  <span className="font-bold text-lg">{type.name}</span>
                </div>
                
                <div className="border-t border-white/20 pt-3 flex items-center justify-between">
                  <span className="text-sm text-white/90">
                    --
                  </span>
                  <span className="text-[10px] font-bold bg-black/20 px-2 py-0.5 rounded uppercase">
                    {type.status}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-sm text-slate-500 bg-slate-50 dark:bg-card rounded-lg border border-border border-dashed">
              No employment types found matching your criteria.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
