import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { departmentCreateSchema, type DepartmentCreate } from '@/types';
import { useDepartment } from '../../hooks/useDepartments';
import { useDepartments } from '../../hooks/useDepartments';

interface DepartmentFormModalProps {
  onSubmit: (data: DepartmentCreate) => Promise<void>;
  onClose: () => void;
  editingId?: string | number | null;
}

export function DepartmentFormModal({ onSubmit, onClose, editingId }: DepartmentFormModalProps) {
  const { data: existingDept } = useDepartment(editingId || '');
  const { data: allDepts } = useDepartments(1, 1000);
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
    if (existingDept) {
      reset({
        departmentName: existingDept.department_name,
        departmentCode: existingDept.department_code,
        description: existingDept.description,
      });
    }
  }, [existingDept, reset]);

  const onFormSubmit = async (data: DepartmentCreate) => {
    try {
      setIsSubmitting(true);
      await onSubmit(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  const parentDepartments = (allDepts?.items || []).filter((d: any) => d.id !== editingId);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          {editingId ? 'Edit Department' : 'Add Department'}
        </h2>

        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-1">
              Name *
            </label>
            <input
              type="text"
              {...register('departmentName')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Department name"
            />
            {errors.departmentName && <p className="text-red-600 text-sm mt-1">{errors.departmentName.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-1">
              Code *
            </label>
            <input
              type="text"
              {...register('departmentCode')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="DEPARTMENT_CODE"
            />
            {errors.departmentCode && <p className="text-red-600 text-sm mt-1">{errors.departmentCode.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-1">
              Description
            </label>
            <textarea
              {...register('description')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Department description"
              rows={3}
            />
          </div>


          <div className="flex gap-3 mt-8">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

