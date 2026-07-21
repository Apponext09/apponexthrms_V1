import React, { useState } from 'react';
import { useAddons } from '../context/AddonContext';
import { AddonCard } from '../components/AddonCard';
import { Loader } from 'lucide-react';

const CATEGORIES = [
  { key: 'hrms', label: 'HRMS', icon: '👥' },
  { key: 'ai', label: 'AI & Automation', icon: '🤖' },
  { key: 'payroll', label: 'Payroll', icon: '💰' },
  { key: 'recruitment', label: 'Recruitment', icon: '🎯' },
  { key: 'analytics', label: 'Analytics', icon: '📊' },
  { key: 'integration', label: 'Integrations', icon: '🔌' },
];

export const MarketplacePage: React.FC = () => {
  const { addons, subscriptions, isLoading, isError, error } = useAddons();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-gray-600">Loading marketplace...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">Failed to load marketplace</p>
          <p className="text-gray-600">{error?.message}</p>
        </div>
      </div>
    );
  }

  const filteredAddons = selectedCategory
    ? addons.filter((addon) => addon.category === selectedCategory)
    : addons;

  const groupedByCategory = CATEGORIES.map((category) => ({
    ...category,
    addons: addons.filter((addon) => addon.category === category.key),
  })).filter((cat) => cat.addons.length > 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Marketplace</h1>
          <p className="text-xl text-gray-600">
            Extend your HRMS with powerful add-ons and integrations
          </p>
          <p className="text-sm text-gray-500 mt-2">
            {subscriptions.length} addon{subscriptions.length !== 1 ? 's' : ''} active
          </p>
        </div>

        {/* Category Filter */}
        {groupedByCategory.length > 1 && (
          <div className="mb-8">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedCategory === null
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                All Add-ons
              </button>
              {groupedByCategory.map((category) => (
                <button
                  key={category.key}
                  onClick={() => setSelectedCategory(category.key)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedCategory === category.key
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {category.icon} {category.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Add-ons Grid */}
        {selectedCategory ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAddons.map((addon) => (
              <AddonCard key={addon.id} addon={addon} isSubscribed={subscriptions.some(
                (sub) => sub.addon_id === addon.id && sub.subscription_status === 'active'
              )} />
            ))}
          </div>
        ) : (
          <div className="space-y-12">
            {groupedByCategory.map((category) => (
              <div key={category.key}>
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <span>{category.icon}</span>
                  {category.label}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {category.addons.map((addon) => (
                    <AddonCard
                      key={addon.id}
                      addon={addon}
                      isSubscribed={subscriptions.some(
                        (sub) => sub.addon_id === addon.id && sub.subscription_status === 'active'
                      )}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {addons.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">No add-ons available yet</p>
          </div>
        )}
      </div>
    </div>
  );
};
