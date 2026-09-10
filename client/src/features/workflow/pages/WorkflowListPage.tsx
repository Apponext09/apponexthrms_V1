import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Edit, Trash2, Share2, Eye } from 'lucide-react';
import { useWorkflows } from '../hooks/useWorkflows';

export function WorkflowListPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');

  const { data, isLoading } = useWorkflows({
    page,
    pageSize: 20,
    search,
    type,
    status,
  });

  const workflowTypes = [
    'leave_request',
    'expense_claim',
    'asset_request',
    'recruitment',
    'promotion',
    'salary_revision',
    'exit_clearance',
    'travel_request',
    'attendance_regularization',
    'shift_change',
    'offer_approval',
    'candidate_approval',
    'payroll_approval',
    'offboarding',
    'document_verification',
    'asset_return',
    'employee_transfer',
  ];

  const statusOptions = ['draft', 'published', 'archived'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Workflows</h1>
        <Link to="/workflows/create">
          <Button className="gap-2">
            <Plus size={20} />
            New Workflow
          </Button>
        </Link>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Input
            placeholder="Search workflows..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <select
            className="px-3 py-2 border rounded-md"
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Types</option>
            {workflowTypes.map((t) => (
              <option key={t} value={t}>
                {t.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
          <select
            className="px-3 py-2 border rounded-md"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Statuses</option>
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold">Name</th>
                  <th className="px-6 py-3 text-left font-semibold">Code</th>
                  <th className="px-6 py-3 text-left font-semibold">Type</th>
                  <th className="px-6 py-3 text-left font-semibold">Pattern</th>
                  <th className="px-6 py-3 text-left font-semibold">Status</th>
                  <th className="px-6 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(Array.isArray(data?.items) ? data.items : Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : []).map((workflow: any) => (
                  <tr key={workflow.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium">{workflow.workflow_name}</td>
                    <td className="px-6 py-4 text-gray-600">{workflow.workflow_code}</td>
                    <td className="px-6 py-4 text-gray-600">{workflow.type.replace(/_/g, ' ')}</td>
                    <td className="px-6 py-4 text-gray-600">{workflow.approval_pattern}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          workflow.status === 'published'
                            ? 'bg-green-100 text-green-800'
                            : workflow.status === 'draft'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {workflow.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <Link to={`/workflows/${workflow.id}`}>
                        <Button variant="ghost" size="sm">
                          <Eye size={16} />
                        </Button>
                      </Link>
                      {workflow.status === 'draft' && (
                        <Link to={`/workflows/${workflow.id}/edit`}>
                          <Button variant="ghost" size="sm">
                            <Edit size={16} />
                          </Button>
                        </Link>
                      )}
                      <Button variant="ghost" size="sm">
                        <Trash2 size={16} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data?.meta && (
            <div className="flex items-center justify-between text-sm">
              <div className="text-gray-600">
                Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, data.meta.total)} of {data.meta.total}
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
      )}
    </div>
  );
}




