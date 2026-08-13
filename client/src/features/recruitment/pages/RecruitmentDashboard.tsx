import React from 'react';
import { useDashboard, useMetrics } from '../hooks';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Briefcase, Users, MessageSquare, Send, CheckCircle2, TrendingUp, Layers, Calendar } from 'lucide-react';
import { format } from 'date-fns';

export const RecruitmentDashboard: React.FC = () => {
  const { data: dashboardResponse, isLoading: dashboardLoading } = useDashboard();
  const { data: metricsResponse, isLoading: metricsLoading } = useMetrics();

  const dashboard = dashboardResponse?.data || dashboardResponse;
  const metrics = metricsResponse?.data || metricsResponse;

  const stats = dashboard?.stats || {
    totalOpenJobs: 0,
    totalApplications: 0,
    appliedCount: 0,
    screeningCount: 0,
    assessmentCount: 0,
    interviewCount: 0,
    offerCount: 0,
    hiredCount: 0,
    rejectedCount: 0,
  };

  const funnel = metrics?.funnel || {
    applied: stats.appliedCount,
    screening: stats.screeningCount,
    assessment: stats.assessmentCount,
    interview: stats.interviewCount,
    offer: stats.offerCount,
    hired: stats.hiredCount,
  };

  const conversions = metrics?.conversions || {
    appliedToScreening: 0,
    screeningToInterview: 0,
    interviewToOffer: 0,
    offerToHired: 0,
    appliedToHired: 0,
  };

  const recentApplications = dashboard?.recentApplications || [];

  if (dashboardLoading || metricsLoading) {
    return (
      <div className="p-6 space-y-6 max-w-full">
        <div className="h-8 w-64 bg-slate-200 animate-pulse rounded"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-28 bg-white border border-slate-200 rounded-lg animate-pulse p-4"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-full bg-slate-50/50 min-h-screen">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
          Recruitment Dashboard & Analytics
        </h1>
        <p className="text-sm text-slate-500 mt-1">Real-time overview of requisitions, applicant pipeline, and conversion funnel.</p>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-white border-slate-200 shadow-sm border-l-4 border-l-blue-500">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Open Positions</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{stats.totalOpenJobs}</p>
              <p className="text-[11px] text-blue-600 font-medium mt-0.5">Published Requisitions</p>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-full">
              <Briefcase className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm border-l-4 border-l-purple-500">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Applications</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{stats.totalApplications}</p>
              <p className="text-[11px] text-purple-600 font-medium mt-0.5">In Active Funnel</p>
            </div>
            <div className="p-3 bg-purple-50 text-purple-600 rounded-full">
              <Users className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm border-l-4 border-l-amber-500">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">In Interview</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{stats.interviewCount}</p>
              <p className="text-[11px] text-amber-600 font-medium mt-0.5">Panel Discussions</p>
            </div>
            <div className="p-3 bg-amber-50 text-amber-600 rounded-full">
              <MessageSquare className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm border-l-4 border-l-indigo-500">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Offers Sent</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{stats.offerCount}</p>
              <p className="text-[11px] text-indigo-600 font-medium mt-0.5">Pending Acceptance</p>
            </div>
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-full">
              <Send className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm border-l-4 border-l-emerald-500 sm:col-span-2 lg:col-span-1">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Hired</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{stats.hiredCount}</p>
              <p className="text-[11px] text-emerald-600 font-medium mt-0.5">Joined Team</p>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-full">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Funnel and Conversions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="py-4 px-5 border-b border-slate-100 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              Applicant Pipeline Funnel
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            <FunnelChart data={funnel} />
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="py-4 px-5 border-b border-slate-100 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              Conversion Rates
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            <ConversionMetrics data={conversions} />
          </CardContent>
        </Card>
      </div>

      {/* Recent Applications Table */}
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader className="py-4 px-5 border-b border-slate-100">
          <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-purple-600" />
            Recent Applications
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 text-xs uppercase tracking-wider font-bold">
                <tr>
                  <th className="py-3 px-4">Candidate Name</th>
                  <th className="py-3 px-4">Applied Position</th>
                  <th className="py-3 px-4 text-center">Pipeline Status</th>
                  <th className="py-3 px-4 text-right">Applied Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600">
                {recentApplications.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-xs text-slate-400 italic">
                      No applications recorded yet.
                    </td>
                  </tr>
                ) : (
                  recentApplications.map((app: any) => {
                    const candidateName = app.candidate_name || app.candidateName || 'Candidate';
                    const email = app.candidate_email || app.candidateEmail || '';
                    const position = app.position_title || app.positionTitle || app.job_code || 'General';
                    const status = app.application_status || app.applicationStatus || 'applied';
                    const appliedAt = app.applied_at || app.appliedAt || app.created_at;

                    return (
                      <tr key={app.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-800 text-xs">{candidateName}</div>
                          {email && <div className="text-[11px] text-slate-400">{email}</div>}
                        </td>
                        <td className="py-3 px-4 text-xs font-medium text-slate-700">
                          {position}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                            status === 'hired' || status === 'offer'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : status === 'rejected' || status === 'withdrawn'
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}>
                            {status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs text-right text-slate-500 font-mono">
                          {appliedAt ? format(new Date(appliedAt), 'MMM dd, yyyy') : '-'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

interface FunnelChartProps {
  data: Record<string, number>;
}

const FunnelChart: React.FC<FunnelChartProps> = ({ data }) => {
  const values = Object.values(data);
  const maxVal = Math.max(...values, 1);

  return (
    <div className="space-y-3">
      {Object.entries(data).map(([stage, count]) => {
        const pct = Math.round((count / maxVal) * 100);
        return (
          <div key={stage} className="space-y-1">
            <div className="flex justify-between text-xs font-semibold text-slate-700 capitalize">
              <span>{stage}</span>
              <span className="font-bold text-slate-800">{count}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
              <div
                className="bg-blue-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.max(pct, count > 0 ? 5 : 0)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

interface ConversionMetricsProps {
  data: Record<string, number>;
}

const ConversionMetrics: React.FC<ConversionMetricsProps> = ({ data }) => {
  return (
    <div className="space-y-4">
      {Object.entries(data).map(([metric, rate]) => {
        const label = metric.replace(/([A-Z])/g, ' $1');
        return (
          <div key={metric} className="space-y-1">
            <div className="flex justify-between text-xs font-medium text-slate-700 capitalize">
              <span>{label}</span>
              <span className="font-bold text-emerald-700">{rate}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${rate}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
