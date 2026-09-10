import { Link } from 'react-router-dom';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';
import { useApprovals } from '../hooks/useApprovals';
import { ApprovalCard } from '../components/ApprovalCard';

export function ApprovalInboxPage() {
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState('pending');

  const { data, isLoading } = useApprovals({
    page,
    pageSize: 20,
    status: filter,
  });

  const filterOptions = [
    { value: 'pending', label: 'Pending', icon: Clock },
    { value: 'approved', label: 'Approved', icon: CheckCircle2 },
    { value: 'rejected', label: 'Rejected', icon: XCircle },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Approvals Inbox</h1>
        <div className="text-right">
          <p className="text-2xl font-bold text-blue-600">{data?.meta?.total || 0}</p>
          <p className="text-sm text-gray-600">pending approvals</p>
        </div>
      </div>

      <div className="flex gap-2">
        {filterOptions.map((option) => {
          const Icon = option.icon;
          return (
            <Button
              key={option.value}
              variant={filter === option.value ? 'default' : 'outline'}
              onClick={() => {
                setFilter(option.value);
                setPage(1);
              }}
              className="gap-2"
            >
              <Icon size={16} />
              {option.label}
            </Button>
          );
        })}
      </div>

      {isLoading ? (
        <div>Loading...</div>
      ) : data?.items && data.items.length > 0 ? (
        <div className="space-y-4">
          {data.items.map((approval: any) => (
            <ApprovalCard key={approval.id} approval={approval} />
          ))}

          {data.meta && (
            <div className="flex items-center justify-between text-sm">
              <div className="text-gray-600">
                Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, data.meta.total)} of{' '}
                {data.meta.total}
              </div>
              <div className="space-x-2">
                <Button
                  variant="outline"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  disabled={!data.meta.hasMore}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12">
          <CheckCircle2 size={48} className="mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">No approvals to show</p>
        </div>
      )}
    </div>
  );
}





