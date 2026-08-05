import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { type GradeCreate } from '../../hooks/useGrades';
import { useGrade } from '../../hooks/useGrades';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Award, X, Loader2 } from 'lucide-react';

const gradeCreateSchema = z.object({
  name: z.string().min(2, 'Grade name must be at least 2 characters'),
  code: z.string().min(1, 'Grade code is required'),
  description: z.string().optional(),
});

interface GradeFormModalProps {
  onSubmit: (data: GradeCreate) => Promise<void>;
  onClose: () => void;
  editingId?: string | number | null;
}

export function GradeFormModal({ onSubmit, onClose, editingId }: GradeFormModalProps) {
  const { data: existingGradeResponse } = useGrade(editingId || '');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<GradeCreate>({
    resolver: zodResolver(gradeCreateSchema),
  });

  useEffect(() => {
    const grade = (existingGradeResponse as any)?.data || existingGradeResponse;
    if (grade && (grade.name || grade.code)) {
      reset({
        name: grade.name || '',
        code: grade.code || '',
        description: grade.description || '',
      });
    }
  }, [existingGradeResponse, reset]);

  const onFormSubmit = async (data: GradeCreate) => {
    try {
      setIsSubmitting(true);
      await onSubmit(data);
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
              <Award className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground leading-tight">
                {editingId ? 'Edit Grade' : 'Add Grade'}
              </h2>
              <p className="text-xs text-muted-foreground">Specify grade name and code</p>
            </div>
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={onClose}
            type="button"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit(onFormSubmit)} className="p-5 space-y-4">
          <div>
            <Label htmlFor="name" className="text-xs font-bold text-foreground">
              Grade Name *
            </Label>
            <Input
              id="name"
              type="text"
              {...register('name')}
              className="mt-1 h-9 text-xs"
              placeholder="e.g. Executive"
            />
            {errors.name && (
              <p className="text-rose-600 dark:text-rose-400 text-[11px] font-medium mt-1">
                {errors.name.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="code" className="text-xs font-bold text-foreground">
              Grade Code *
            </Label>
            <Input
              id="code"
              type="text"
              {...register('code')}
              className="mt-1 h-9 text-xs uppercase"
              placeholder="e.g. EXEC"
            />
            {errors.code && (
              <p className="text-rose-600 dark:text-rose-400 text-[11px] font-medium mt-1">
                {errors.code.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="description" className="text-xs font-bold text-foreground">
              Description (Optional)
            </Label>
            <Textarea
              id="description"
              {...register('description')}
              className="mt-1 text-xs resize-none h-20"
              placeholder="Brief description of this grade..."
            />
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end gap-3 pt-3 border-t border-border/50 mt-6">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
              className="h-8 text-xs font-medium"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="h-8 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground min-w-[90px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                  Saving...
                </>
              ) : editingId ? (
                'Save Changes'
              ) : (
                'Add Grade'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
