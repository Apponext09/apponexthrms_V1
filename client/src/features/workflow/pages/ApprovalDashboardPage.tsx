import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { TrendingUp, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { useApprovals } from '../hooks/useApprovals';
import { useInstances } from '../hooks/useInstances';

export function ApprovalDashboardPage() {
  const { data: pendingApprovals } = useApprovals({
    page: 1,
    pageSize: 1,
    status: 'pending',
  });

  const { data: instances } = useInstances({
    page: 1,
    pageSize: 1,
    status: 'pending',
  });

  const stats = [
    {
      title: 'Pending Approvals',
      value: pendingApprovals?.meta?.total || 0,
      icon: Clock,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-50',
    },
    {
      title: 'Pending Instances',
      value: instances?.meta?.total || 0,
      icon: AlertCircle,
      color: 'text-red-500',
      bgColor: 'bg-red-50',
    },
    {
      title: 'SLA At Risk',
      value: 0,
      icon: TrendingUp,
      color: 'text-orange-500',
      bgColor: 'bg-orange-50',
    },
    {
      title: 'Completed This Month',
      value: 0,
      icon: CheckCircle,
      color: 'text-green-500',
      bgColor: 'bg-green-50',
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Approval Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className={`p-6 ${stat.bgColor}`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">{stat.title}</p>
                  <p className="text-3xl font-bold">{stat.value}</p>
                </div>
                <Icon className={`${stat.color}`} size={24} />
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">Approval Trend (Last 30 Days)</h2>
          <div className="h-64 flex items-center justify-center text-gray-400">
            Chart coming soon
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">SLA Status</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">On Track</span>
              <div className="flex-1 mx-3 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-green-500" style={{ width: '75%' }} />
              </div>
              <span className="text-sm font-medium">75%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">At Risk</span>
              <div className="flex-1 mx-3 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-orange-500" style={{ width: '20%' }} />
              </div>
              <span className="text-sm font-medium">20%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Breached</span>
              <div className="flex-1 mx-3 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-red-500" style={{ width: '5%' }} />
              </div>
              <span className="text-sm font-medium">5%</span>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">Top Approvers</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">John Smith</span>
              <span className="font-medium">45 approvals</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Sarah Johnson</span>
              <span className="font-medium">38 approvals</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Mike Davis</span>
              <span className="font-medium">32 approvals</span>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">Workflow Performance</h2>
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm">Leave Request</span>
                <span className="text-sm font-medium">2.1 days avg</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500" style={{ width: '60%' }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm">Expense Claim</span>
                <span className="text-sm font-medium">3.5 days avg</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-purple-500" style={{ width: '75%' }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm">Asset Request</span>
                <span className="text-sm font-medium">1.8 days avg</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-green-500" style={{ width: '50%' }} />
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

