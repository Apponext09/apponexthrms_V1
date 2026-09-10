import React, { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { useNotificationPreferences } from '../hooks';

export const PreferencesForm: React.FC = () => {
  const { preferences, updatePreferences, updatePreferencesLoading } = useNotificationPreferences();

  const [formData, setFormData] = useState({
    email_enabled: true,
    sms_enabled: true,
    whatsapp_enabled: true,
    push_enabled: true,
    inapp_enabled: true,
    webhook_enabled: false,
    quiet_hours_start: '',
    quiet_hours_end: '',
    quiet_hours_enabled: false,
    unsubscribe_all: false,
  });

  useEffect(() => {
    if (preferences) {
      setFormData({
        email_enabled: preferences.email_enabled,
        sms_enabled: preferences.sms_enabled,
        whatsapp_enabled: preferences.whatsapp_enabled,
        push_enabled: preferences.push_enabled,
        inapp_enabled: preferences.inapp_enabled,
        webhook_enabled: preferences.webhook_enabled,
        quiet_hours_start: preferences.quiet_hours_start || '',
        quiet_hours_end: preferences.quiet_hours_end || '',
        quiet_hours_enabled: preferences.quiet_hours_enabled,
        unsubscribe_all: preferences.unsubscribe_all,
      });
    }
  }, [preferences]);

  const handleToggle = (field: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: !prev[field as keyof typeof prev],
    }));
  };

  const handleFieldChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = () => {
    updatePreferences(formData);
  };

  return (
    <div className="space-y-6">
      {/* Unsubscribe All */}
      <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900 rounded-lg p-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.unsubscribe_all}
            onChange={() => handleToggle('unsubscribe_all')}
            className="w-4 h-4 rounded"
          />
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">Unsubscribe from all notifications</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              You will not receive any notifications
            </p>
          </div>
        </label>
      </div>

      {/* Channel Preferences */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Channel Preferences
        </h3>

        <div className="space-y-3">
          {[
            { key: 'email_enabled', label: 'Email' },
            { key: 'sms_enabled', label: 'SMS' },
            { key: 'whatsapp_enabled', label: 'WhatsApp' },
            { key: 'push_enabled', label: 'Push Notifications' },
            { key: 'inapp_enabled', label: 'In-App Notifications' },
            { key: 'webhook_enabled', label: 'Webhook' },
          ].map(({ key, label }) => (
            <label key={key} className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData[key as keyof typeof formData] as boolean}
                onChange={() => handleToggle(key)}
                className="w-4 h-4 rounded"
              />
              <span className="text-gray-700 dark:text-gray-300">{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Quiet Hours */}
      <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <label className="flex items-center gap-3 cursor-pointer mb-4">
          <input
            type="checkbox"
            checked={formData.quiet_hours_enabled}
            onChange={() => handleToggle('quiet_hours_enabled')}
            className="w-4 h-4 rounded"
          />
          <p className="font-semibold text-gray-900 dark:text-white">Enable quiet hours</p>
        </label>

        {formData.quiet_hours_enabled && (
          <div className="space-y-3 mt-4 ml-7">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Start time
              </label>
              <input
                type="time"
                value={formData.quiet_hours_start}
                onChange={(e) => handleFieldChange('quiet_hours_start', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                End time
              </label>
              <input
                type="time"
                value={formData.quiet_hours_end}
                onChange={(e) => handleFieldChange('quiet_hours_end', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              />
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Notifications will be paused during quiet hours
            </p>
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={updatePreferencesLoading}
          className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-4 h-4" />
          {updatePreferencesLoading ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>
    </div>
  );
};
