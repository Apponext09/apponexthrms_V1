import React, { useState } from 'react';
import { Plus } from 'lucide-react';

export const AnnouncementManagementPage: React.FC = () => {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Manage Announcements
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Create and manage company announcements
          </p>
        </div>

        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          New Announcement
        </button>
      </div>

      {/* Announcements List */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          Announcement management coming soon
        </div>
      </div>
    </div>
  );
};
