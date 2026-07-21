import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { organizationProfileUpdateSchema, type OrganizationProfileUpdate } from '@/types';
import { useCompanyProfile, useUpdateCompanyProfile } from '../hooks/useCompanyProfile';

export function CompanyProfilePage() {
  const { data: profile, isLoading } = useCompanyProfile();
  const updateMutation = useUpdateCompanyProfile();
  const [successMessage, setSuccessMessage] = React.useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<any>({
    resolver: zodResolver(organizationProfileUpdateSchema),
  });

  React.useEffect(() => {
    if (profile) {
      reset({
        organizationName: profile.company_name,
        organizationCode: profile.organization_code || '',
        industry: profile.industry,
        website: profile.website,
        phone: profile.phone,
        address: profile.address_line1,
      });
    }
  }, [profile, reset]);

  const onSubmit = async (data: any) => {
    try {
      await updateMutation.mutateAsync(data as OrganizationProfileUpdate);
      setSuccessMessage('Company profile updated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  if (isLoading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Company Profile</h1>

      {successMessage && (
        <div className="mb-6 p-4 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100 rounded-lg">
          {successMessage}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-1">
              Organization Name *
            </label>
            <input
              type="text"
              {...register('organizationName')}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            {errors.organizationName && <p className="text-red-600 text-sm mt-1">{String(errors.organizationName?.message)}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-1">
              Organization Code
            </label>
            <input
              type="text"
              {...register('organizationCode')}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            {errors.organizationCode && <p className="text-red-600 text-sm mt-1">{String(errors.organizationCode?.message)}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-1">
              Industry
            </label>
            <input
              type="text"
              {...register('industry')}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-1">
              Website
            </label>
            <input
              type="url"
              {...register('website')}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-1">
              Phone
            </label>
            <input
              type="tel"
              {...register('phone')}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-1">
              Address
            </label>
            <input
              type="text"
              {...register('address')}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={updateMutation.isPending}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
}

