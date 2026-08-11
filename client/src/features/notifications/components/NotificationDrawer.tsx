import React, { useState } from 'react';
import { X, Trash2, Check } from 'lucide-react';
import { useNotifications } from '../hooks';
import { useNotificationStore } from '../store/notificationStore';
import { NotificationCard } from './NotificationCard';
import { AnimatePresence, motion } from 'framer-motion';

export const NotificationDrawer: React.FC = () => {
  const { drawerOpen, setDrawerOpen } = useNotificationStore();
  const { notifications = [], markAllAsRead: markAllAsReadFn, isLoading } = useNotifications();
  const [notificationFilter, setNotificationFilter] = useState<'all' | 'unread' | 'read'>('all');

  const filteredNotifications = notifications.filter((n: any) => {
    if (notificationFilter === 'unread') return !n.read_at;
    if (notificationFilter === 'read') return !!n.read_at;
    return true;
  });

  return (
    <AnimatePresence>
      {drawerOpen && (
        <motion.div
          key="overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[50]"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {drawerOpen && (
        <motion.div
          key="drawer"
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white dark:bg-gray-900 shadow-2xl flex flex-col z-[51]"
        >
          {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Notifications
          </h2>
          <button
            onClick={() => setDrawerOpen(false)}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 p-4 border-b border-gray-200 dark:border-gray-700">
          {(['all', 'unread', 'read'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setNotificationFilter(filter)}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                notificationFilter === filter
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </button>
          ))}
        </div>

        {/* Notifications list */}
        <div className="flex-1 overflow-y-auto">
          {filteredNotifications.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
              No notifications
            </div>
          ) : (
            <div className="space-y-3 p-4">
              {filteredNotifications.map((notification: any, idx: number) => (
                <NotificationCard
                  key={notification?.id || notification?.uuid || idx}
                  {...notification}
                />
              ))}
            </div>
          )}
        </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-700 p-4 flex gap-2">
              <button
                onClick={() => markAllAsReadFn()}
                disabled={isLoading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Check className="w-4 h-4" />
                Mark all as read
              </button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
