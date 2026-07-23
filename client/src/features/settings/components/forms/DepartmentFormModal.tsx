import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { departmentCreateSchema, type DepartmentCreate } from '@/types';
import { useDepartment } from '../../hooks/useDepartments';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Building2, X, Loader2 } from 'lucide-react';

interface DepartmentFormModalProps {
  onSubmit: (data: DepartmentCreate) => Promise<void>;
  onClose: () => void;
  editingId?: string | number | null;
}

export function DepartmentFormModal({ onSubmit, onClose, editingId }: DepartmentFormModalProps) {
  const { data: existingDeptResponse } = useDepartment(editingId || '');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DepartmentCreate>({
    resolver: zodResolver(departmentCreateSchema),
  });

  useEffect(() => {
    const dept = (existingDeptResponse as any)?.data || existingDeptResponse;
    if (dept && (dept.name || dept.departmentName || dept.department_code)) {
      const name = dept.name || dept.departmentName || dept.department_name || '';
      const code = dept.code || dept.departmentCode || dept.department_code || '';
      reset({
        departmentName: name,
        departmentCode: code,
        description: dept.description || '',
      });
    }
  }, [existingDeptResponse, reset]);

  const onFormSubmit = async (data: DepartmentCreate) => {
    try {
      setIsSubmitting(true);
      const payload = {
        ...data,
        name: data.departmentName,
        code: data.departmentCode,
      };
      await onSubmit(payload as any);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/80 bg-muted/30">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground leading-tight">
                {editingId ? 'Edit Department' : 'Add Department'}
              </h2>
              <p className="text-xs text-muted-foreground">Specify department name and code</p>
            </div>
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={onClose}
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit(onFormSubmit)} className="p-5 space-y-4">
          <div>
            <Label htmlFor="departmentName" className="text-xs font-bold text-foreground">
              Department Name *
            </Label>
            <Input
              id="departmentName"
              type="text"
              {...register('departmentName')}
              className="mt-1 h-9 text-xs"
              placeholder="e.g. Human Resources"
            />
            {errors.departmentName && (
              <p className="text-rose-600 dark:text-rose-400 text-[11px] font-medium mt-1">
                {errors.departmentName.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="departmentCode" className="text-xs font-bold text-foreground">
              Department Code *
            </Label>
            <Input
              id="departmentCode"
              type="text"
              {...register('departmentCode')}
              className="mt-1 h-9 text-xs uppercase font-mono"
              placeholder="e.g. HR"
            />
            {errors.departmentCode && (
              <p className="text-rose-600 dark:text-rose-400 text-[11px] font-medium mt-1">
                {errors.departmentCode.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="description" className="text-xs font-bold text-foreground">
              Description
            </Label>
            <Textarea
              id="description"
              {...register('description')}
              className="mt-1 text-xs resize-none"
              placeholder="Optional department details and role..."
              rows={3}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-3 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 h-9 text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 h-9 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Saving...
                </>
              ) : (
                'Save Department'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
