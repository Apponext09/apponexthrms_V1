import React, { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
  Filter, 
  RotateCw, 
  Download, 
  X, 
  User, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  PlusCircle, 
  Edit3, 
  Trash2, 
  RefreshCw,
  Search,
  ShieldCheck
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

export interface AuditLogEntry {
  id: number | string;
  action: string;
  actorName?: string;
  actor_name?: string;
  userName?: string;
  beforeState?: any;
  before_state?: any;
  afterState?: any;
  after_state?: any;
  ipAddress?: string;
  createdAt?: string;
  created_at?: string;
}

interface AuditTrailModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  logs: AuditLogEntry[];
  isLoading?: boolean;
  onRefresh?: () => void;
}

export const AuditTrailModal: React.FC<AuditTrailModalProps> = ({
  isOpen,
  onClose,
  title = 'Audit Trail',
  subtitle = 'Leave Type',
  logs = [],
  isLoading = false,
  onRefresh,
}) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'created' | 'updated' | 'deleted' | 'sync'>('all');
  const [expandedLogIds, setExpandedLogIds] = useState<Record<string | number, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterBar, setShowFilterBar] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const toggleExpand = (id: string | number) => {
    setExpandedLogIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Filter logs by action tab & search query
  const filteredLogs = logs.filter(log => {
    const action = (log.action || '').toUpperCase();
    
    // Action tab filter
    if (activeFilter === 'created' && !action.includes('CREATE')) return false;
    if (activeFilter === 'updated' && !action.includes('UPDATE')) return false;
    if (activeFilter === 'deleted' && !action.includes('DELETE')) return false;
    if (activeFilter === 'sync' && !action.includes('SYNC')) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const name = (log.actorName || log.actor_name || log.userName || '').toLowerCase();
      const act = action.toLowerCase();
      const idStr = String(log.id);
      return name.includes(q) || act.includes(q) || idStr.includes(q);
    }

    return true;
  });

  // Pagination calculation
  const totalRecords = filteredLogs.length;
  const totalPages = Math.ceil(totalRecords / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedLogs = filteredLogs.slice(startIndex, startIndex + pageSize);

  // Helper to extract field changes count and list
  const getFieldChanges = (log: AuditLogEntry) => {
    const before = log.beforeState || log.before_state || {};
    const after = log.afterState || log.after_state || {};
    
    const allKeys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]));
    const changes: { key: string; from: any; to: any }[] = [];

    allKeys.forEach(k => {
      if (['created_at', 'updated_at', 'id', 'uuid', 'organization_id'].includes(k)) return;

      const fromVal = before[k];
      const toVal = after[k];

      if (JSON.stringify(fromVal) !== JSON.stringify(toVal)) {
        changes.push({ key: k, from: fromVal, to: toVal });
      }
    });

    return changes;
  };

  // Export logs to CSV
  const handleExportCSV = () => {
    if (filteredLogs.length === 0) return;

    const headers = ['ID', 'Action', 'Performed By', 'Timestamp', 'IP Address'];
    const rows = filteredLogs.map(l => [
      l.id,
      l.action,
      `"${l.actorName || l.actor_name || 'System Admin'}"`,
      `"${l.createdAt || l.created_at || ''}"`,
      `"${l.ipAddress || ''}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Audit_Trail_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      {/* [&>button:last-child]:hidden hides shadcn's default duplicate close button */}
      <DialogContent className="max-w-2xl w-full p-0 gap-0 rounded-3xl overflow-hidden bg-white dark:bg-slate-950 border border-slate-200/90 dark:border-slate-800 shadow-2xl [&>button:last-child]:hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl shadow-2xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                {title}
              </h2>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">
                {subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilterBar(!showFilterBar)}
              className={`h-8 w-8 p-0 rounded-xl transition-all cursor-pointer ${
                showFilterBar ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title="Filter & Search Logs"
            >
              <Filter className="w-4 h-4" />
            </Button>

            {onRefresh && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRefresh}
                disabled={isLoading}
                className="h-8 w-8 p-0 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                title="Refresh Logs"
              >
                <RotateCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={handleExportCSV}
              className="h-8 w-8 p-0 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              title="Export CSV"
            >
              <Download className="w-4 h-4" />
            </Button>

            <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-800 mx-1" />

            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all cursor-pointer"
              title="Close Audit Trail"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Collapsible Search Bar */}
        {showFilterBar && (
          <div className="p-3 bg-slate-100/70 dark:bg-slate-900/60 border-b border-slate-200/80 dark:border-slate-800">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search audit trail by user, action, or ID..."
                className="w-full h-9 pl-9 pr-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
              />
            </div>
          </div>
        )}

        {/* Filter Action Tabs & Count */}
        <div className="p-3.5 px-5 border-b border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3 bg-slate-50/30 dark:bg-slate-900/20">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 overflow-x-auto">
            {[
              { id: 'all', label: 'All' },
              { id: 'created', label: 'Created' },
              { id: 'updated', label: 'Updated' },
              { id: 'deleted', label: 'Deleted' },
              { id: 'sync', label: 'Sync' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveFilter(tab.id as any);
                  setCurrentPage(1);
                }}
                className={`px-3.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeFilter === tab.id
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-2xs border border-slate-200/60 dark:border-slate-700'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <span className="text-[11px] font-extrabold text-slate-400 tracking-wider">
            {totalRecords} TOTAL
          </span>
        </div>

        {/* Timeline Log Entries */}
        <div className="max-h-[380px] min-h-[220px] overflow-y-auto p-5 space-y-4">
          {isLoading ? (
            <div className="py-12 text-center text-xs text-slate-400 font-medium space-y-2">
              <RotateCw className="w-6 h-6 animate-spin mx-auto text-indigo-500" />
              <p>Loading audit trail entries...</p>
            </div>
          ) : paginatedLogs.length === 0 ? (
            <div className="py-12 text-center space-y-1.5">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No audit logs found</p>
              <p className="text-[11px] text-slate-400 font-medium">No matching history records exist for this filter.</p>
            </div>
          ) : (
            <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-200 dark:before:bg-slate-800">
              {paginatedLogs.map(log => {
                const action = (log.action || 'UPDATE').toUpperCase();
                const isCreated = action.includes('CREATE');
                const isDeleted = action.includes('DELETE');
                const isSync = action.includes('SYNC');

                const isExpanded = !!expandedLogIds[log.id];
                const changes = getFieldChanges(log);
                const userName = log.actorName || log.actor_name || log.userName || 'System Admin';

                let dotClass = "bg-indigo-500 ring-4 ring-indigo-50 dark:ring-indigo-950/50";
                let badgeClass = "bg-indigo-50 text-indigo-700 border-indigo-200/80 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-900/60";
                let badgeIcon = <Edit3 className="w-3.5 h-3.5" />;
                let actionText = "UPDATE";

                if (isCreated) {
                  dotClass = "bg-emerald-500 ring-4 ring-emerald-50 dark:ring-emerald-950/50";
                  badgeClass = "bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/60";
                  badgeIcon = <PlusCircle className="w-3.5 h-3.5" />;
                  actionText = "CREATE";
                } else if (isDeleted) {
                  dotClass = "bg-rose-500 ring-4 ring-rose-50 dark:ring-rose-950/50";
                  badgeClass = "bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/60";
                  badgeIcon = <Trash2 className="w-3.5 h-3.5" />;
                  actionText = "DELETE";
                } else if (isSync) {
                  dotClass = "bg-purple-500 ring-4 ring-purple-50 dark:ring-purple-950/50";
                  badgeClass = "bg-purple-50 text-purple-700 border-purple-200/80 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-900/60";
                  badgeIcon = <RefreshCw className="w-3.5 h-3.5" />;
                  actionText = "SYNC";
                }

                const dateObj = log.createdAt || log.created_at ? new Date(log.createdAt || log.created_at!) : new Date();
                const timeAgo = formatDistanceToNow(dateObj, { addSuffix: true });
                const fullFormattedDate = format(dateObj, 'PPpp');

                return (
                  <div key={log.id} className="relative">
                    <div className={`absolute -left-[23px] top-3.5 w-3 h-3 rounded-full ${dotClass} z-10`} />

                    <div className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-indigo-300 transition-all space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border uppercase tracking-wider ${badgeClass}`}>
                            {badgeIcon}
                            <span>{actionText}</span>
                          </span>
                          <span className="text-xs font-mono font-bold text-slate-400">
                            #{log.id}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 text-xs text-slate-400 font-semibold" title={fullFormattedDate}>
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{timeAgo}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 font-bold pt-0.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>{userName}</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleExpand(log.id)}
                        className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline pt-1 cursor-pointer"
                      >
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        <span>
                          {isExpanded ? 'Hide field changes' : `Show field changes (${changes.length || 0})`}
                        </span>
                      </button>

                      {isExpanded && (
                        <div className="mt-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 space-y-1.5 text-xs">
                          {changes.length === 0 ? (
                            <p className="text-[11px] text-slate-400 italic">Initial creation of policy fields.</p>
                          ) : (
                            changes.map((c, i) => (
                              <div key={i} className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 dark:border-slate-900 pb-1 last:border-b-0 last:pb-0">
                                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-[11px]">
                                  {c.key}
                                </span>
                                <div className="flex items-center gap-1.5 text-[11px]">
                                  <span className="text-slate-400 line-through">
                                    {String(c.from ?? 'none')}
                                  </span>
                                  <span className="text-slate-400">&rarr;</span>
                                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                    {String(c.to ?? 'none')}
                                  </span>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer & Pagination */}
        <div className="p-3.5 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 bg-slate-50/50 dark:bg-slate-900/40">
          <div className="flex items-center gap-2">
            <span>Rows per page</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="h-7 rounded-lg border border-slate-200 dark:border-slate-800 px-2 text-xs font-semibold bg-white dark:bg-slate-900"
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
            </select>
            <span>
              {totalRecords > 0 ? `${startIndex + 1}–${Math.min(startIndex + pageSize, totalRecords)} of ${totalRecords} records` : '0 records'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 font-medium">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              &lt; Previous
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 5).map(p => (
              <button
                key={p}
                onClick={() => setCurrentPage(p)}
                className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  currentPage === p
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                }`}
              >
                {p}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              Next &gt;
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
