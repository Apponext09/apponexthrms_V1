import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Users, Plus, X, Search, ChevronDown, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useGrades, useCreateGrade, useUpdateGrade, useDeleteGrade, type GradeCreate } from '../hooks/useGrades';
import { cn } from '@/lib/utils';

const gradeCreateSchema = z.object({
  name: z.string().min(2, 'Grade Name is required'),
  code: z.string().min(1, 'Code is required'),
  description: z.string().optional(),
  color: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

type GradeFormData = z.infer<typeof gradeCreateSchema>;

export function GradeMasterCustomUI() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('All');
  const [editingGrade, setEditingGrade] = useState<any>(null);

  const { data: gradesData, isLoading } = useGrades(1, 100, searchQuery);
  const grades = gradesData?.items || [];

  const createMutation = useCreateGrade();
  const updateMutation = useUpdateGrade();
  const deleteMutation = useDeleteGrade();

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors },
  } = useForm<GradeFormData>({
    resolver: zodResolver(gradeCreateSchema),
    defaultValues: {
      name: '',
      code: '',
      description: '',
      color: '#20b2aa',
      status: 'active',
    },
  });

  useEffect(() => {
    if (editingGrade) {
      reset({
        name: editingGrade.name,
        code: editingGrade.code,
        description: editingGrade.description || '',
        color: editingGrade.color || '#20b2aa',
        status: editingGrade.status || 'active',
      });
    } else {
      reset({
        name: '',
        code: '',
        description: '',
        color: '#20b2aa',
        status: 'active',
      });
    }
  }, [editingGrade, reset]);

  const filteredGrades = grades.filter((g: any) => {
    if (statusFilter === 'Active' && g.status !== 'active') return false;
    if (statusFilter === 'Inactive' && g.status !== 'inactive') return false;
    return true;
  });

  const onSubmit = async (data: GradeFormData) => {
    try {
      if (editingGrade) {
        await updateMutation.mutateAsync({ id: editingGrade.id, data });
      } else {
        if (!data.code) {
          data.code = data.name.substring(0, 3).toUpperCase() + '-' + Math.floor(100 + Math.random() * 900);
        }
        await createMutation.mutateAsync(data as GradeCreate);
      }
      setEditingGrade(null);
    } catch (error) {
      console.error('Error saving grade:', error);
    }
  };

  const handleCancel = () => {
    setEditingGrade(null);
  };

  const handleDelete = async (id: number | string) => {
    if (window.confirm('Are you sure you want to delete this grade?')) {
      await deleteMutation.mutateAsync(id);
      if (editingGrade?.id === id) setEditingGrade(null);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      
      {/* Left Column - Form */}
      <div className="lg:col-span-7 bg-white dark:bg-card rounded-xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-border p-6 md:p-8 flex flex-col">
        
        <div className="flex items-center gap-2 mb-6">
          <Plus className="w-5 h-5 text-slate-800 dark:text-foreground stroke-[2.5]" />
          <h3 className="text-lg font-bold text-slate-800 dark:text-foreground">
            {editingGrade ? 'Edit Grade Information' : 'Add Grade Information'}
          </h3>
        </div>

        <div className="border-b border-border mb-6"></div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 dark:text-foreground flex">
              Grade Name <span className="text-rose-500 ml-1">*</span>
            </label>
            <Input
              {...register('name')}
              className="h-10 bg-white dark:bg-background border-border text-sm rounded-lg"
            />
            {errors.name && <p className="text-xs text-rose-500">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 dark:text-foreground flex">
              Grade Code <span className="text-rose-500 ml-1">*</span>
            </label>
            <Input
              {...register('code')}
              placeholder="e.g. CEO (Auto-generated if left blank)"
              className="h-10 bg-white dark:bg-background border-border text-sm rounded-lg uppercase"
            />
            {errors.code && <p className="text-xs text-rose-500">{errors.code.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 dark:text-foreground">
              Description
            </label>
            <Textarea
              {...register('description')}
              className="resize-none h-24 bg-white dark:bg-background border-border text-sm rounded-lg"
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-foreground">
                Grade Colour
              </label>
              <div className="flex h-10 border border-border bg-white dark:bg-background overflow-hidden rounded-lg">
                <Input
                  type="text"
                  {...register('color')}
                  className="h-full border-0 focus-visible:ring-0 text-sm rounded-none w-full"
                />
                <div className="w-12 border-l border-border h-full relative flex items-center justify-center shrink-0">
                  <Input 
                    type="color" 
                    {...register('color')}
                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" 
                  />
                  <Controller
                    name="color"
                    control={control}
                    render={({ field }) => (
                      <div className="w-6 h-6 rounded-md shadow-sm border border-border/50" style={{ backgroundColor: field.value || '#20b2aa' }} />
                    )}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-foreground">
                Active
              </label>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <div className="flex border border-border rounded-lg w-fit overflow-hidden bg-white dark:bg-background h-10">
                    <button
                      type="button"
                      onClick={() => field.onChange('active')}
                      className={cn(
                        "px-6 h-full text-sm font-semibold transition-colors",
                        field.value === 'active' 
                          ? "bg-[#337ab7] text-white" 
                          : "text-slate-600 hover:bg-slate-100"
                      )}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => field.onChange('inactive')}
                      className={cn(
                        "px-6 h-full text-sm font-semibold border-l border-border transition-colors",
                        field.value === 'inactive' 
                          ? "bg-rose-500 text-white" 
                          : "text-slate-600 hover:bg-slate-100"
                      )}
                    >
                      No
                    </button>
                  </div>
                )}
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-6">
            <Button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="bg-[#00a65a] hover:bg-[#008d4c] text-white rounded-lg text-sm font-bold h-10 px-6 shadow-sm"
            >
              <Plus className="w-4 h-4 mr-1.5 stroke-[2.5]" />
              {editingGrade ? 'Update' : 'Add'}
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
            Grades List
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

        <div className="border-t-2 border-[#20b2aa] pt-4 flex flex-col gap-4">
          
          {/* Grade Title & Count */}
          <div className="flex justify-between items-center px-1">
            <h2 className="text-base font-bold text-slate-800 dark:text-foreground flex items-center gap-2">
              <Users className="w-5 h-5 text-[#20b2aa]" />
              Grade
            </h2>
            <span className="text-base font-bold text-slate-800 dark:text-foreground">
              {filteredGrades.length}
            </span>
          </div>

          {/* Grades List */}
          <div className="flex flex-col gap-3 mt-2 max-h-[600px] overflow-y-auto pr-1">
            {isLoading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">Loading...</div>
            ) : filteredGrades.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">No grades found.</div>
            ) : (
              filteredGrades.map((grade: any) => (
                <div
                  key={grade.id}
                  onClick={() => setEditingGrade(grade)}
                  className={cn(
                    "flex flex-col p-4 rounded-lg cursor-pointer transition-all group relative overflow-hidden",
                    editingGrade?.id === grade.id ? "ring-2 ring-offset-2 ring-primary scale-[0.98]" : "hover:scale-[0.98]"
                  )}
                  style={{ backgroundColor: grade.color || '#20b2aa' }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-5 h-5 text-white/90" />
                    <span className="text-lg font-bold text-white drop-shadow-sm">{grade.name}</span>
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/20">
                    <span className="text-sm font-medium text-white/90 truncate mr-2">{grade.description || 'N/A'}</span>
                    <span className="text-[10px] uppercase tracking-wider font-bold text-white bg-black/20 px-2 py-0.5 rounded-sm shrink-0">
                      {grade.status}
                    </span>
                  </div>

                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={(e) => { e.stopPropagation(); handleDelete(grade.id); }}
                    className="absolute top-2 right-2 h-7 w-7 text-white/70 hover:bg-black/20 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity rounded-md"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
