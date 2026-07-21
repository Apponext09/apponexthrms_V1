import React from 'react';
import { Bell } from 'lucide-react';
import { useNotifications } from '../hooks';
import { useNotificationStore } from '../store/notificationStore';

interface NotificationBellProps {
  onClick?: () => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ onClick }) => {
  const { unreadCount } = useNotifications();
  const { setDrawerOpen } = useNotificationStore();

  const handleClick = () => {
    setDrawerOpen(true);
    onClick?.();
  };

  return (
    <button
      onClick={handleClick}
      className="relative p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
      aria-label="Notifications"
    >
      <Bell className="w-6 h-6" />
      {unreadCount > 0 && (
        <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
};
