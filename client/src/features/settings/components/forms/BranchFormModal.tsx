import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { branchCreateSchema, type BranchCreate } from '@/types';
import { useBranch } from '../../hooks/useBranches';

interface BranchFormModalProps {
  onSubmit: (data: BranchCreate) => Promise<void>;
  onClose: () => void;
  editingId?: string | number | null;
}

export function BranchFormModal({ onSubmit, onClose, editingId }: BranchFormModalProps) {
  const { data: existingBranch } = useBranch(editingId || '');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BranchCreate>({
    resolver: zodResolver(branchCreateSchema),
  });

  useEffect(() => {
    if (existingBranch) {
      reset({
        branchName: existingBranch.branch_name,
        branchCode: existingBranch.branch_code,
        address: existingBranch.address,
        city: existingBranch.city,
        state: existingBranch.state,
        country: existingBranch.country,
        pinCode: existingBranch.pin_code,
      });
    }
  }, [existingBranch, reset]);

  const onFormSubmit = async (data: BranchCreate) => {
    try {
      setIsSubmitting(true);
      await onSubmit(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          {editingId ? 'Edit Branch' : 'Add Branch'}
        </h2>

        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-1">
              Name *
            </label>
            <input
              type="text"
              {...register('branchName')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Branch name"
            />
            {errors.branchName && <p className="text-red-600 text-sm mt-1">{errors.branchName.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-1">
              Code *
            </label>
            <input
              type="text"
              {...register('branchCode')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="BRANCH_CODE"
            />
            {errors.branchCode && <p className="text-red-600 text-sm mt-1">{errors.branchCode.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-1">
              City
            </label>
            <input
              type="text"
              {...register('city')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="City"
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

