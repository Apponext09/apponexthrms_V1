import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/config/api';
import { Addon } from '../context/AddonContext';
import { CheckCircle, Clock, Loader } from 'lucide-react';
import { toast } from 'sonner';

interface AddonCardProps {
  addon: Addon;
  isSubscribed: boolean;
}

export const AddonCard: React.FC<AddonCardProps> = ({ addon, isSubscribed }) => {
  const [showBillingOptions, setShowBillingOptions] = useState(false);
  const queryClient = useQueryClient();

  // Subscribe mutation
  const subscribeMutation = useMutation({
    mutationFn: async (data: { addon_id: string; billing_cycle: string; start_trial: boolean }) => {
      const response = await apiClient.post('/marketplace/subscribe', data);
      return response.data.data;
    },
    onSuccess: (data) => {
      toast.success(
        data.subscription_status === 'trial'
          ? `Trial started! Free for ${addon.trial_days} days`
          : 'Subscription activated!'
      );
      queryClient.invalidateQueries({ queryKey: ['marketplace/subscriptions'] });
      setShowBillingOptions(false);
    },
    onError: (error: any) => {
      const message = error.response?.data?.error || 'Failed to subscribe';
      toast.error(message);
    },
  });

  const handleSubscribe = (billingCycle: 'monthly' | 'yearly', startTrial: boolean) => {
    subscribeMutation.mutate({
      addon_id: addon.id,
      billing_cycle: billingCycle,
      start_trial: startTrial,
    });
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900">{addon.name}</h3>
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{addon.description}</p>
          </div>
          {isSubscribed && (
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 ml-2" />
          )}
        </div>

        {/* Status Badge */}
        {isSubscribed && (
          <div className="inline-block bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs font-medium">
            Active
          </div>
        )}
      </div>

      {/* Pricing */}
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
        <div className="text-3xl font-bold text-gray-900">
          ${addon.base_price}
          <span className="text-lg font-normal text-gray-600">/month</span>
        </div>
        {addon.trial_enabled && !isSubscribed && (
          <p className="text-sm text-gray-600 mt-2">
            <Clock className="inline w-4 h-4 mr-1" />
            {addon.trial_days} days free trial
          </p>
        )}
      </div>

      {/* Features */}
      <div className="px-6 py-4 flex-1">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Includes:</h4>
        <ul className="space-y-2">
          {addon.features.slice(0, 4).map((feature) => (
            <li key={feature} className="text-sm text-gray-700 flex items-start">
              <span className="text-blue-600 mr-2">✓</span>
              <span className="capitalize">{feature.replace(/_/g, ' ')}</span>
            </li>
          ))}
          {addon.features.length > 4 && (
            <li className="text-sm text-gray-600 italic">
              +{addon.features.length - 4} more features
            </li>
          )}
        </ul>
      </div>

      {/* Action Button */}
      <div className="px-6 py-4 border-t border-gray-100">
        {!isSubscribed ? (
          <>
            {!showBillingOptions ? (
              <div className="space-y-2">
                {addon.trial_enabled && (
                  <button
                    onClick={() => handleSubscribe('monthly', true)}
                    disabled={subscribeMutation.isPending}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    {subscribeMutation.isPending ? (
                      <Loader className="w-4 h-4 animate-spin" />
                    ) : (
                      'Start Free Trial'
                    )}
                  </button>
                )}
                <button
                  onClick={() => setShowBillingOptions(true)}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900 py-2 rounded-lg font-medium transition-colors"
                >
                  Buy Now
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-gray-700 font-medium mb-3">Choose billing cycle:</p>
                <button
                  onClick={() => handleSubscribe('monthly', false)}
                  disabled={subscribeMutation.isPending}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 mb-2"
                >
                  {subscribeMutation.isPending ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : (
                    `Monthly - $${addon.base_price}/month`
                  )}
                </button>
                <button
                  onClick={() => handleSubscribe('yearly', false)}
                  disabled={subscribeMutation.isPending}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {subscribeMutation.isPending ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : (
                    `Yearly - $${Math.round(addon.base_price * 11)}/year`
                  )}
                </button>
                <button
                  onClick={() => setShowBillingOptions(false)}
                  className="w-full text-gray-600 hover:text-gray-900 py-2 text-sm"
                >
                  Cancel
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center">
            <p className="text-sm text-green-600 font-medium">Subscription Active</p>
          </div>
        )}
      </div>
    </div>
  );
};
