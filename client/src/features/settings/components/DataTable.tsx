import React from 'react';

interface Column {
  key: string;
  label: string;
  width?: string;
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
    return <div className="text-center py-8 text-gray-500">Loading...</div>;
  }

  if (!data || data.length === 0) {
    return <div className="text-center py-8 text-gray-500">No data found</div>;
  }

  return (
    <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
      <table className="w-full">
        <thead className="bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                style={{ width: column.width }}
                className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white"
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {data.map((item, idx) => (
            <tr
              key={item.id || idx}
              className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  style={{ width: column.width }}
                  className="px-6 py-3 text-sm text-gray-900 dark:text-gray-100"
                >
                  {column.key === 'actions' ? (
                    <div className="flex gap-2">
                      {onEdit && (
                        <button
                          onClick={() => onEdit(item)}
                          className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                        >
                          Edit
                        </button>
                      )}
                      {onDelete && (
                        <button
                          onClick={() => onDelete(item.id)}
                          className="text-red-600 dark:text-red-400 hover:underline text-sm"
                        >
                          Delete
                        </button>
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

      {pagination && (
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center text-sm text-gray-600 dark:text-gray-400">
          <span>
            Showing {(pagination.page - 1) * pagination.pageSize + 1} to{' '}
            {Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total} results
          </span>
          <div className="flex gap-2">
            <button
              disabled={pagination.page === 1}
              className="px-3 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50"
            >
              Previous
            </button>
            <button className="px-3 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-600">
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
