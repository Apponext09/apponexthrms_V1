import React from 'react';

export const NotificationAnalyticsDashboard: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Notification Analytics
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Track notification delivery metrics and performance
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Sent', value: '0', color: 'blue' },
          { label: 'Delivered', value: '0', color: 'green' },
          { label: 'Failed', value: '0', color: 'red' },
          { label: 'Success Rate', value: '0%', color: 'purple' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
          >
            <p className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[
          { title: 'Delivery by Channel' },
          { title: 'Daily Trend' },
          { title: 'Status Distribution' },
          { title: 'Category Performance' },
        ].map((chart) => (
          <div
            key={chart.title}
            className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {chart.title}
            </h3>
            <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
              Chart coming soon
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
