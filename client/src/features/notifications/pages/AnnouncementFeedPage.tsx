import React, { useState } from 'react';
import { useAnnouncements } from '../hooks';
import { AnnouncementCard } from '../components/AnnouncementCard';
import { useAnnouncementStore } from '../store/announcementStore';

export const AnnouncementFeedPage: React.FC = () => {
  const {
    announcements,
    meta,
    isLoading,
    getAnnouncement,
    markAsRead,
  } = useAnnouncements();

  const { selectedAnnouncementId, announcementFilter, announcementSortBy, readAnnouncementIds } =
    useAnnouncementStore();

  const [page, setPage] = useState(1);
  const selectedQuery = getAnnouncement(selectedAnnouncementId);

  const filteredAnnouncements = announcements.filter((a: any) => {
    if (announcementFilter === 'unread') return !readAnnouncementIds.includes(a.id);
    if (announcementFilter === 'read') return readAnnouncementIds.includes(a.id);
    return true;
  });

  const handleMarkAsRead = (id: number) => {
    markAsRead(id);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Announcements List */}
      <div className="lg:col-span-2 space-y-4">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Announcements</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Latest updates and announcements</p>
        </div>

        {/* Announcements */}
        {isLoading ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            Loading...
          </div>
        ) : filteredAnnouncements.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            No announcements
          </div>
        ) : (
          filteredAnnouncements.map((announcement: any) => (
            <AnnouncementCard
              key={announcement.id}
              {...announcement}
              read={readAnnouncementIds.includes(announcement.id)}
              onClick={() => {
                handleMarkAsRead(announcement.id);
              }}
            />
          ))
        )}

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-4 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            >
              Previous
            </button>

            <span className="text-sm text-gray-600 dark:text-gray-400">
              Page {page} of {meta.totalPages}
            </span>

            <button
              onClick={() => setPage(Math.min(meta.totalPages, page + 1))}
              disabled={page === meta.totalPages}
              className="px-4 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Sidebar */}
      <div className="space-y-4">
        {selectedQuery.data && (
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4 sticky top-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              {selectedQuery.data.title}
            </h2>
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap mb-4">
              {selectedQuery.data.content}
            </p>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Read by {selectedQuery.data.read_count} people
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
