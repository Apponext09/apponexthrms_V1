import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Award,
  Plus,
  X,
  Search,
  Check,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Loader2,
  Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
    watch,
    formState: { errors },
  } = useForm<GradeFormData>({
    resolver: zodResolver(gradeCreateSchema),
    defaultValues: {
      name: '',
      code: '',
      description: '',
      color: '#00b4d8',
      status: 'active',
    },
  });

  const currentColor = watch('color') || '#00b4d8';

  useEffect(() => {
    if (editingGrade) {
      reset({
        name: editingGrade.name,
        code: editingGrade.code,
        description: editingGrade.description || '',
        color: editingGrade.color || '#00b4d8',
        status: editingGrade.status || 'active',
      });
    } else {
      reset({
        name: '',
        code: '',
        description: '',
        color: '#00b4d8',
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
      resetForm();
    } catch (error) {
      console.error('Error saving grade:', error);
    }
  };

  const resetForm = () => {
    setEditingGrade(null);
    reset({
      name: '',
      code: '',
      description: '',
      color: '#00b4d8',
      status: 'active',
    });
  };

  const handleDelete = async (id: number | string) => {
    if (window.confirm('Are you sure you want to delete this grade?')) {
      await deleteMutation.mutateAsync(id);
      if (editingGrade?.id === id) resetForm();
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="w-full space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ========================================================================= */}
        {/* LEFT COLUMN: Grade Form (lg:col-span-7)                                    */}
        {/* ========================================================================= */}
        <div className="lg:col-span-7 space-y-5 text-foreground">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 text-xs font-semibold">
            
            {/* Form Card */}
            <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs space-y-4">
              
              {/* Card Header */}
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-primary/10 text-primary">
                    <Award className="h-4 w-4 stroke-[2.5]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-foreground tracking-tight">
                      {editingGrade ? 'Edit Grade Information' : 'Add Grade Information'}
                    </h3>
                    <p className="text-[11px] text-muted-foreground font-medium">
                      Configure employee pay grade bands, color tags, and active status.
                    </p>
                  </div>
                </div>

                {editingGrade && (
                  <Badge variant="outline" className="text-[10px] font-bold bg-primary/10 text-primary border-primary/20">
                    Editing Mode
                  </Badge>
                )}
              </div>

              {/* Input Fields Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-start">
                
                {/* Grade Name */}
                <div className="sm:col-span-7 space-y-1.5">
                  <label className="block text-foreground font-bold">
                    Grade Name <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    {...register('name')}
                    placeholder="e.g. Senior Executive - Band 1"
                    className="h-9 border-input bg-background text-foreground text-xs rounded-xl focus-visible:ring-2 focus-visible:ring-primary/20 font-medium"
                  />
                  {errors.name && (
                    <p className="text-[11px] text-rose-500 font-normal">{errors.name.message}</p>
                  )}
                </div>

                {/* Grade Code */}
                <div className="sm:col-span-5 space-y-1.5">
                  <label className="block text-foreground font-bold">
                    Grade Code <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    {...register('code')}
                    placeholder="e.g. GRD-M1"
                    className="h-9 border-input bg-background text-foreground text-xs rounded-xl font-mono uppercase focus-visible:ring-2 focus-visible:ring-primary/20 font-medium"
                  />
                  {errors.code && (
                    <p className="text-[11px] text-rose-500 font-normal">{errors.code.message}</p>
                  )}
                </div>

              </div>

              {/* Colour & Status Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-end">
                
                {/* Grade Colour */}
                <div className="sm:col-span-6 space-y-1.5">
                  <label className="block text-foreground font-bold">
                    Grade Colour
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={currentColor.startsWith('#') && currentColor.length === 7 ? currentColor : '#00b4d8'}
                      onChange={(e) => setValue('color', e.target.value)}
                      className="w-9 h-9 p-1 rounded-xl border border-input bg-background cursor-pointer shrink-0"
                    />
                    <Input
                      {...register('color')}
                      placeholder="#00b4d8"
                      className="h-9 border-input bg-background text-foreground text-xs rounded-xl font-mono font-medium"
                    />
                  </div>
                </div>

                {/* Status Toggle */}
                <div className="sm:col-span-6 space-y-1.5">
                  <label className="block text-foreground font-bold">
                    Active Status
                  </label>
                  <Controller
                    name="status"
                    control={control}
                    render={({ field }) => (
                      <div className="flex items-center border border-input rounded-xl overflow-hidden bg-background h-9 p-0.5">
                        <button
                          type="button"
                          onClick={() => field.onChange('active')}
                          className={cn(
                            'flex-1 h-full rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer',
                            field.value === 'active'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'text-muted-foreground hover:bg-muted/50'
                          )}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> Yes
                        </button>
                        <button
                          type="button"
                          onClick={() => field.onChange('inactive')}
                          className={cn(
                            'flex-1 h-full rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer',
                            field.value === 'inactive'
                              ? 'bg-rose-600 text-white shadow-xs'
                              : 'text-muted-foreground hover:bg-muted/50'
                          )}
                        >
                          <XCircle className="h-3.5 w-3.5" /> No
                        </button>
                      </div>
                    )}
                  />
                </div>

              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="block text-foreground font-bold">
                  Description
                </label>
                <textarea
                  {...register('description')}
                  rows={3}
                  placeholder="Enter details or responsibilities associated with this grade..."
                  className="w-full text-xs p-3 rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium resize-none placeholder:text-muted-foreground/60"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2 border-t border-border">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-9 px-5 rounded-xl flex items-center gap-1.5 text-xs shadow-xs transition-all cursor-pointer disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
                  ) : editingGrade ? (
                    <><Check className="h-4 w-4 stroke-[2.5]" /> Update Grade</>
                  ) : (
                    <><Plus className="h-4 w-4 stroke-[2.5]" /> Add Grade</>
                  )}
                </button>

                <button
                  type="button"
                  onClick={resetForm}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold h-9 px-5 rounded-xl flex items-center gap-1.5 text-xs shadow-xs transition-all cursor-pointer"
                >
                  <X className="h-4 w-4 stroke-[2.5]" /> Cancel
                </button>
              </div>

            </div>
          </form>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: Grade Display List (lg:col-span-5)                           */}
        {/* ========================================================================= */}
        <div className="lg:col-span-5 bg-card border border-border/80 rounded-2xl p-5 shadow-xs space-y-4 sticky top-6">
          
          {/* Top Filter & Search Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs">
            <div className="sm:col-span-4">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full h-8 px-2 border border-input rounded-xl bg-background text-foreground font-semibold text-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="All">All Status</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            <div className="sm:col-span-8 relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search grades..."
                className="w-full h-8 pl-2.5 pr-7 border border-input rounded-xl bg-background text-foreground placeholder:text-muted-foreground/60 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            </div>
          </div>

          {/* Title Bar with Count */}
          <div className="flex justify-between items-center border-b border-border pb-2.5 pt-1">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <span className="font-bold text-xs text-foreground tracking-tight uppercase">Grades List</span>
            </div>
            <Badge variant="secondary" className="font-bold text-[11px] px-2 py-0.5 rounded-lg bg-muted text-foreground">
              {filteredGrades.length} total
            </Badge>
          </div>

          {/* Cards List */}
          <div className="space-y-2.5 max-h-[560px] overflow-y-auto pr-1">
            {isLoading ? (
              <div className="py-8 text-center text-xs text-muted-foreground font-medium flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" /> Loading grades...
              </div>
            ) : filteredGrades.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground font-medium bg-muted/20 border border-dashed border-border rounded-xl">
                No grades found.
              </div>
            ) : (
              filteredGrades.map((grade: any) => {
                const isSelected = editingGrade?.id === grade.id;
                const badgeColor = grade.color || '#00b4d8';

                return (
                  <div
                    key={grade.id}
                    onClick={() => setEditingGrade(grade)}
                    className={cn(
                      'p-3.5 rounded-xl border transition-all cursor-pointer relative group flex flex-col gap-2',
                      isSelected
                        ? 'border-primary bg-primary/5 shadow-xs ring-1 ring-primary'
                        : 'border-border/80 bg-card hover:border-primary/50 hover:bg-accent/40'
                    )}
                  >
                    {/* Top Row: Name, Color Indicator & Code */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-3 h-3 rounded-full shrink-0 shadow-xs border border-white/20"
                          style={{ backgroundColor: badgeColor }}
                        />
                        <h4 className="font-bold text-xs text-foreground truncate">{grade.name}</h4>
                      </div>

                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-lg bg-primary/10 text-primary shrink-0">
                        {grade.code}
                      </span>
                    </div>

                    {/* Description */}
                    {grade.description && (
                      <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed font-normal">
                        {grade.description}
                      </p>
                    )}

                    {/* Bottom Row: Status Badge & Action Buttons */}
                    <div className="flex items-center justify-between pt-2 border-t border-border/50 text-[11px]">
                      <div>
                        {grade.status === 'active' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                            <CheckCircle2 className="h-3 w-3" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md">
                            <XCircle className="h-3 w-3" /> Inactive
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingGrade(grade);
                          }}
                          className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg"
                          title="Edit Grade"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(grade.id);
                          }}
                          className="h-7 w-7 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 rounded-lg"
                          title="Delete Grade"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
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
