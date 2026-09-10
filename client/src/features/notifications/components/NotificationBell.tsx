import React, { useState, useRef, useEffect } from 'react';
import { 
  Bell, 
  CheckCheck, 
  CheckCircle2, 
  X, 
  Briefcase, 
  Calendar, 
  UserCheck, 
  FileText, 
  AlertCircle, 
  Trash2,
  Inbox
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useNotifications } from '../hooks';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';

interface NotificationBellProps {
  className?: string;
  iconClassName?: string;
  onClick?: () => void;
}

const getEventIcon = (eventCode?: string, priority?: string) => {
  const code = String(eventCode || '').toUpperCase();
  if (code.includes('INTERVIEW')) {
    return <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />;
  }
  if (code.includes('OFFER')) {
    return <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />;
  }
  if (code.includes('REFERRAL') || code.includes('REFERRED')) {
    return <UserCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />;
  }
  if (code.includes('APPLICATION') || code.includes('STAGE') || code.includes('JOB')) {
    return <Briefcase className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />;
  }
  if (priority === 'urgent' || priority === 'high') {
    return <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />;
  }
  return <Bell className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />;
};

const formatDateSafe = (dateVal: any): string => {
  if (!dateVal) return 'Just now';
  try {
    const str = String(dateVal).replace(' ', 'T');
    const parsed = new Date(str);
    if (isNaN(parsed.getTime())) return 'Just now';
    return formatDistanceToNow(parsed, { addSuffix: true });
  } catch {
    return 'Just now';
  }
};

export const NotificationBell: React.FC<NotificationBellProps> = ({ 
  className, 
  iconClassName,
  onClick 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { 
    notifications = [], 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    deleteNotification,
    isLoading 
  } = useNotifications();

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleToggle = () => {
    setIsOpen(prev => !prev);
    onClick?.();
  };

  const filteredItems = (notifications || []).filter((n: any) => {
    if (filter === 'unread') return !n.read_at && !n.readAt;
    if (filter === 'read') return !!(n.read_at || n.readAt);
    return true;
  });

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={handleToggle}
        className={cn(
          "relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20",
          isOpen && "bg-muted text-foreground",
          className
        )}
        aria-label="Notifications"
        title="Notifications"
      >
        <Bell className={cn("w-5 h-5", iconClassName)} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-[16px] h-4 px-1 text-[10px] font-extrabold text-white bg-rose-600 rounded-full shadow-sm ring-2 ring-background animate-in zoom-in-50">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Floating Notification Popup */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.96 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute right-0 top-full mt-2 w-[340px] sm:w-[410px] bg-card border border-border/80 shadow-2xl rounded-2xl z-[100] overflow-hidden flex flex-col backdrop-blur-xl"
            style={{ maxHeight: 'calc(100vh - 90px)' }}
          >
            {/* Header */}
            <div className="p-4 pb-3 border-b border-border/70 flex items-center justify-between bg-card/95">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                    Notifications
                    {unreadCount > 0 && (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                        {unreadCount} new
                      </span>
                    )}
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllAsRead()}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/10 rounded-lg transition-colors"
                    title="Mark all as read"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Read all</span>
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 px-3 py-2 bg-muted/30 border-b border-border/50 text-xs">
              {(['all', 'unread', 'read'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setFilter(tab)}
                  className={cn(
                    "px-3 py-1 rounded-lg font-semibold transition-all capitalize",
                    filter === tab 
                      ? "bg-card text-foreground shadow-xs border border-border/80 font-bold" 
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  {tab}
                  {tab === 'all' && notifications.length > 0 && ` (${notifications.length})`}
                  {tab === 'unread' && unreadCount > 0 && ` (${unreadCount})`}
                </button>
              ))}
            </div>

            {/* Notification Items List */}
            <div className="flex-1 overflow-y-auto max-h-[380px] divide-y divide-border/40 scrollbar-thin">
              {isLoading && notifications.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  Loading notifications...
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="p-8 text-center flex flex-col items-center justify-center text-muted-foreground">
                  <div className="w-12 h-12 rounded-2xl bg-muted/60 flex items-center justify-center mb-2.5">
                    <Inbox className="w-6 h-6 text-muted-foreground/60" />
                  </div>
                  <p className="text-xs font-semibold text-foreground">No notifications</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {filter === 'unread' ? 'You have read all your notifications' : 'When you receive alerts, they will show up here'}
                  </p>
                </div>
              ) : (
                filteredItems.map((n: any, idx: number) => {
                  const isRead = !!(n.read_at || n.readAt);
                  const title = n.subject_line || n.subjectLine || n.subject || n.title || 'Notification';
                  const body = n.body_text || n.bodyText || n.body || n.message || '';
                  const dateStr = n.created_at || n.createdAt;

                  return (
                    <div
                      key={n.id || n.uuid || idx}
                      className={cn(
                        "group relative p-3.5 flex items-start gap-3 hover:bg-muted/40 transition-colors",
                        !isRead && "bg-primary/5 dark:bg-primary/10"
                      )}
                    >
                      {/* Event/Category Icon */}
                      <div className="p-2 rounded-xl bg-background border border-border/80 shadow-2xs shrink-0 mt-0.5">
                        {getEventIcon(n.event_code || n.eventCode, n.priority)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 pr-6">
                        <div className="flex items-center gap-1.5">
                          <p className={cn(
                            "text-xs leading-snug line-clamp-1 text-foreground",
                            !isRead ? "font-bold" : "font-medium text-foreground/90"
                          )}>
                            {title}
                          </p>
                          {!isRead && (
                            <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                          )}
                        </div>

                        {body && (
                          <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed whitespace-pre-line">
                            {body}
                          </p>
                        )}

                        <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground font-medium">
                          <span>{formatDateSafe(dateStr)}</span>
                          {n.priority && n.priority !== 'normal' && (
                            <span className={cn(
                              "px-1.5 py-0.2 rounded font-bold uppercase text-[9px]",
                              n.priority === 'urgent' && "bg-rose-500/10 text-rose-600 border border-rose-500/20",
                              n.priority === 'high' && "bg-amber-500/10 text-amber-600 border border-amber-500/20",
                              n.priority === 'low' && "bg-slate-500/10 text-slate-600"
                            )}>
                              {n.priority}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action Hover Buttons */}
                      <div className="absolute right-2 top-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-card/90 rounded-lg p-0.5 shadow-xs border border-border/60">
                        {!isRead && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (n.id) markAsRead(n.id);
                            }}
                            className="p-1 rounded text-muted-foreground hover:text-emerald-600 hover:bg-emerald-500/10 transition-colors"
                            title="Mark as read"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (n.id) deleteNotification(n.id);
                          }}
                          className="p-1 rounded text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
