import React from 'react';
import { useDashboard, useMetrics } from '../hooks';
import { useRecruitmentStore } from '../store/useRecruitmentStore';

export const RecruitmentDashboard: React.FC = () => {
  const { data: dashboard, isLoading: dashboardLoading } = useDashboard();
  const { data: metrics, isLoading: metricsLoading } = useMetrics();

  if (dashboardLoading || metricsLoading) {
    return <div>Loading...</div>;
  }

  if (!dashboard || !metrics) {
    return <div>No data available</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <DashboardCard
          title="Open Positions"
          value={dashboard.stats.totalOpenJobs}
          icon="💼"
        />
        <DashboardCard
          title="Total Applications"
          value={dashboard.stats.totalApplications}
          icon="📋"
        />
        <DashboardCard
          title="In Interview"
          value={dashboard.stats.interviewCount}
          icon="🎤"
        />
        <DashboardCard
          title="Offers Sent"
          value={dashboard.stats.offerCount}
          icon="📧"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Hiring Funnel</h3>
          <FunnelChart data={metrics.funnel} />
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Conversion Rates</h3>
          <ConversionMetrics data={metrics.conversions} />
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Recent Applications</h3>
        <ApplicationsList applications={dashboard.recentApplications} />
      </div>
    </div>
  );
};

interface DashboardCardProps {
  title: string;
  value: number;
  icon: string;
}

const DashboardCard: React.FC<DashboardCardProps> = ({ title, value, icon }) => (
  <div className="bg-white p-4 rounded-lg shadow">
    <div className="text-3xl mb-2">{icon}</div>
    <h3 className="text-sm text-gray-600">{title}</h3>
    <p className="text-2xl font-bold">{value}</p>
  </div>
);

interface FunnelChartProps {
  data: Record<string, number>;
}

const FunnelChart: React.FC<FunnelChartProps> = ({ data }) => (
  <div className="space-y-2">
    {Object.entries(data).map(([stage, count]) => (
      <div key={stage} className="flex items-center">
        <span className="w-20 text-sm capitalize">{stage}</span>
        <div className="flex-1 bg-gray-200 rounded-full h-6 overflow-hidden">
          <div
            className="bg-blue-500 h-full flex items-center justify-end pr-2 text-white text-xs font-semibold"
            style={{ width: `${(count / Math.max(...Object.values(data))) * 100}%` }}
          >
            {count > 0 ? count : ''}
          </div>
        </div>
        <span className="w-10 text-right text-sm">{count}</span>
      </div>
    ))}
  </div>
);

interface ConversionMetricsProps {
  data: Record<string, number>;
}

const ConversionMetrics: React.FC<ConversionMetricsProps> = ({ data }) => (
  <div className="space-y-3">
    {Object.entries(data).map(([metric, rate]) => (
      <div key={metric} className="flex justify-between items-center">
        <span className="text-sm capitalize">{metric.replace(/([A-Z])/g, ' $1')}</span>
        <div className="flex items-center gap-2">
          <div className="w-32 bg-gray-200 rounded-full h-4 overflow-hidden">
            <div
              className="bg-green-500 h-full"
              style={{ width: `${rate}%` }}
            />
          </div>
          <span className="font-semibold">{rate}%</span>
        </div>
      </div>
    ))}
  </div>
);

interface ApplicationsListProps {
  applications: any[];
}

const ApplicationsList: React.FC<ApplicationsListProps> = ({ applications }) => (
  <div className="overflow-x-auto">
    <table className="w-full">
      <thead>
        <tr className="border-b">
          <th className="text-left py-2 px-4">Candidate</th>
          <th className="text-left py-2 px-4">Job</th>
          <th className="text-left py-2 px-4">Status</th>
          <th className="text-left py-2 px-4">Applied</th>
        </tr>
      </thead>
      <tbody>
        {applications.map((app) => (
          <tr key={app.id} className="border-b hover:bg-gray-50">
            <td className="py-2 px-4">{app.candidate_id}</td>
            <td className="py-2 px-4">{app.job_id}</td>
            <td className="py-2 px-4">
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                {app.application_status}
              </span>
            </td>
            <td className="py-2 px-4 text-sm text-gray-600">
              {new Date(app.applied_at).toLocaleDateString()}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
