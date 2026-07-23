import React, { createContext, useContext, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/config/api';

export interface Addon {
  id: string;
  key: string;
  name: string;
  description?: string;
  icon_url?: string;
  category: string;
  pricing_model: string;
  base_price: number;
  currency: string;
  trial_enabled: boolean;
  trial_days: number;
  features: string[];
  status: string;
}

export interface OrganizationAddonSubscription {
  id: string;
  addon_id: string;
  addon_name: string;
  subscription_status: 'trial' | 'active' | 'suspended' | 'cancelled';
  billing_cycle: 'monthly' | 'yearly';
  monthly_price: number;
  yearly_price: number;
  next_renewal_date?: string;
  enabled_features: Record<string, boolean>;
}

interface AddonContextType {
  addons: Addon[];
  subscriptions: OrganizationAddonSubscription[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isSubscribed: (addonKey: string) => boolean;
  getSubscription: (addonKey: string) => OrganizationAddonSubscription | undefined;
  hasFeature: (addonKey: string, featureKey: string) => boolean;
  refetch: () => void;
}

const AddonContext = createContext<AddonContextType | undefined>(undefined);

interface AddonProviderProps {
  children: ReactNode;
}

export const AddonProvider: React.FC<AddonProviderProps> = ({ children }) => {
  // Fetch available addons
  const {
    data: addonsData = [],
    isLoading: addonsLoading,
    isError: addonsError,
    error: addonsErrorObj,
    refetch: refetchAddons,
  } = useQuery({
    queryKey: ['marketplace/addons'],
    queryFn: async () => {
      const response = await apiClient.get('/marketplace/addons');
      return response.data.data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch organization subscriptions
  const {
    data: subscriptionsData = [],
    isLoading: subscriptionsLoading,
    refetch: refetchSubscriptions,
  } = useQuery({
    queryKey: ['marketplace/subscriptions'],
    queryFn: async () => {
      const response = await apiClient.get('/marketplace/subscriptions');
      return response.data.data || [];
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const isLoading = addonsLoading || subscriptionsLoading;

  const isSubscribed = (addonKey: string): boolean => {
    return subscriptionsData.some(
      (sub: OrganizationAddonSubscription) =>
        sub.addon_id === addonKey && sub.subscription_status === 'active'
    );
  };

  const getSubscription = (addonKey: string): OrganizationAddonSubscription | undefined => {
    return subscriptionsData.find(
      (sub: OrganizationAddonSubscription) =>
        sub.addon_id === addonKey && sub.subscription_status === 'active'
    );
  };

  const hasFeature = (addonKey: string, featureKey: string): boolean => {
    const subscription = getSubscription(addonKey);
    if (!subscription) return false;
    return subscription.enabled_features[featureKey] !== false;
  };

  const refetch = () => {
    refetchAddons();
    refetchSubscriptions();
  };

  const value: AddonContextType = {
    addons: addonsData,
    subscriptions: subscriptionsData,
    isLoading,
    isError: addonsError,
    error: addonsErrorObj,
    isSubscribed,
    getSubscription,
    hasFeature,
    refetch,
  };

  return <AddonContext.Provider value={value}>{children}</AddonContext.Provider>;
};

export const useAddons = (): AddonContextType => {
  const context = useContext(AddonContext);
  if (!context) {
    throw new Error('useAddons must be used within an AddonProvider');
  }
  return context;
};
