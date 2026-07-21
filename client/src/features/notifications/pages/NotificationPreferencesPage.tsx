import React from 'react';
import { PreferencesForm } from '../components/PreferencesForm';

export const NotificationPreferencesPage: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Notification Preferences</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Control how and when you receive notifications
        </p>
      </div>

      {/* Form */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <PreferencesForm />
      </div>

      {/* Info */}
      <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">Tips</h3>
        <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1">
          <li>• Enable/disable notifications by channel (Email, SMS, etc.)</li>
          <li>• Use quiet hours to pause notifications during non-work hours</li>
          <li>• You can unsubscribe from all notifications at once</li>
        </ul>
      </div>
    </div>
  );
};
