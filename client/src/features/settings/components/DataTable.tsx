import React from 'react';
import { Edit2, Trash2, Loader2, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface Column {
  key: string;
  label: string;
  width?: string;
  render?: (value: any, item: any) => React.ReactNode;
}

interface DataTableProps {
  columns: Column[];
  data: any[];
  isLoading?: boolean;
  onEdit?: (item: any) => void;
  onDelete?: (id: string | number) => void;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
  };
}

export function DataTable({
  columns,
  data,
  isLoading = false,
  onEdit,
  onDelete,
  pagination,
}: DataTableProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-2 bg-card rounded-xl border border-border/80">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground font-medium">Loading data...</p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-2 bg-card rounded-xl border border-border/80 text-center">
        <div className="p-3 rounded-full bg-muted text-muted-foreground">
          <Inbox className="w-6 h-6" />
        </div>
        <p className="text-xs font-bold text-foreground">No records found</p>
        <p className="text-[11px] text-muted-foreground max-w-xs">There are no items to display right now.</p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden rounded-xl border border-border/80 bg-card shadow-2xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-muted/40 border-b border-border/70">
              {columns.map((column) => (
                <th
                  key={column.key}
                  style={{ width: column.width }}
                  className="px-4 py-2.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider select-none"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50 text-xs">
            {data.map((item, idx) => (
              <tr
                key={item.id || idx}
                className="hover:bg-muted/30 transition-colors"
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    style={{ width: column.width }}
                    className="px-4 py-2.5 text-xs text-foreground font-medium align-middle"
                  >
                    {column.render ? (
                      column.render(item[column.key], item)
                    ) : column.key === 'actions' ? (
                      <div className="flex items-center gap-1">
                        {onEdit && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => onEdit(item)}
                            className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-muted"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        {onDelete && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => onDelete(item.id)}
                            className="h-7 w-7 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    ) : (
                      item[column.key]
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination && (
        <div className="px-4 py-3 bg-muted/20 border-t border-border/70 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <span className="font-medium text-[11px]">
            Showing <strong className="text-foreground">{(pagination.page - 1) * pagination.pageSize + 1}</strong> to{' '}
            <strong className="text-foreground">{Math.min(pagination.page * pagination.pageSize, pagination.total)}</strong> of{' '}
            <strong className="text-foreground">{pagination.total}</strong> results
          </span>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page === 1}
              className="h-7 text-xs font-semibold px-2.5"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page * pagination.pageSize >= pagination.total}
              className="h-7 text-xs font-semibold px-2.5"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
