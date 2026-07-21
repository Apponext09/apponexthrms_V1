import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { locationCreateSchema, type LocationCreate } from '@/types';
import { useLocation } from '../../hooks/useLocations';

interface LocationFormModalProps {
  onSubmit: (data: LocationCreate) => Promise<void>;
  onClose: () => void;
  editingId?: string | number | null;
}

export function LocationFormModal({ onSubmit, onClose, editingId }: LocationFormModalProps) {
  const { data: existingLocation } = useLocation(editingId || '');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LocationCreate>({
    resolver: zodResolver(locationCreateSchema),
  });

  useEffect(() => {
    if (existingLocation) {
      reset({
        locationName: existingLocation.name,
        locationCode: existingLocation.code,
        address: existingLocation.address_line1,
        city: existingLocation.city,
        state: existingLocation.state,
        country: existingLocation.country,
      });
    }
  }, [existingLocation, reset]);

  const onFormSubmit = async (data: LocationCreate) => {
    try {
      setIsSubmitting(true);
      await onSubmit(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 max-w-2xl w-full mx-4 my-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          {editingId ? 'Edit Location' : 'Add Location'}
        </h2>

        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-1">
                Name *
              </label>
              <input
                type="text"
                {...register('locationName')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Location name"
              />
              {errors.locationName && <p className="text-red-600 text-sm mt-1">{errors.locationName.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-1">
                Code *
              </label>
              <input
                type="text"
                {...register('locationCode')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="LOCATION_CODE"
              />
              {errors.locationCode && <p className="text-red-600 text-sm mt-1">{errors.locationCode.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-1">
                Address
              </label>
              <input
                type="text"
                {...register('address')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Address"
              />
              {errors.address && <p className="text-red-600 text-sm mt-1">{errors.address.message}</p>}
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
              {errors.city && <p className="text-red-600 text-sm mt-1">{errors.city.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-1">
                State
              </label>
              <input
                type="text"
                {...register('state')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="State"
              />
              {errors.state && <p className="text-red-600 text-sm mt-1">{errors.state.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-1">
                Country
              </label>
              <input
                type="text"
                {...register('country')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Country"
              />
              {errors.country && <p className="text-red-600 text-sm mt-1">{errors.country.message}</p>}
            </div>
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

