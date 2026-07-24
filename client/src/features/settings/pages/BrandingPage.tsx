import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { brandingSettingsUpdateSchema, type BrandingSettingsUpdate } from '@/types';
import { useBrandingSettings, useUpdateBrandingSettings } from '../hooks/useBrandingSettings';
import { CleanLoader } from '@/components/ui/clean-loader';

export function BrandingPage() {
  const { data: branding, isLoading } = useBrandingSettings();
  const updateMutation = useUpdateBrandingSettings();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<BrandingSettingsUpdate>({
    resolver: zodResolver(brandingSettingsUpdateSchema),
  });

  const primaryColor = watch('primaryColor');
  const secondaryColor = watch('secondaryColor');

  useEffect(() => {
    if (branding) {
      reset({
        primaryColor: branding.primary_color,
        secondaryColor: branding.secondary_color,
        logoUrl: branding.logo_url,
        faviconUrl: branding.favicon_url,
      });
    }
  }, [branding, reset]);

  const onSubmit = async (data: BrandingSettingsUpdate) => {
    try {
      await updateMutation.mutateAsync(data);
    } catch (error) {
      console.error('Error updating branding:', error);
    }
  };

  if (isLoading) {
    return <CleanLoader fullPage label="Loading Branding Settings..." />;
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Branding Settings</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
              Primary Color
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                {...register('primaryColor')}
                className="w-12 h-12 border border-gray-300 dark:border-gray-600 rounded cursor-pointer"
              />
              <input
                type="text"
                {...register('primaryColor')}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              />
            </div>
            <div
              className="mt-2 h-12 rounded border border-gray-300 dark:border-gray-600"
              style={{ backgroundColor: primaryColor }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
              Secondary Color
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                {...register('secondaryColor')}
                className="w-12 h-12 border border-gray-300 dark:border-gray-600 rounded cursor-pointer"
              />
              <input
                type="text"
                {...register('secondaryColor')}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              />
            </div>
            <div
              className="mt-2 h-12 rounded border border-gray-300 dark:border-gray-600"
              style={{ backgroundColor: secondaryColor }}
            />
          </div>

        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-1">
              Logo URL
            </label>
            <input
              type="url"
              {...register('logoUrl')}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-1">
              Favicon URL
            </label>
            <input
              type="url"
              {...register('faviconUrl')}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

        </div>

        <button
          type="submit"
          disabled={updateMutation.isPending}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {updateMutation.isPending ? 'Saving...' : 'Save Branding Settings'}
        </button>
      </form>
    </div>
  );
}


