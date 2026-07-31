import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle2, 
  Clock, 
  XCircle, 
  AlertCircle, 
  Users, 
  UserCircle, 
  Briefcase, 
  Shield, 
  ArrowRight,
  BarChart3,
  Filter,
  Loader2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import api from '@/lib/api';

export function ApprovalsDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 5;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await api.get('/approvals/dashboard');
        setData(response.data.data);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="w-8 h-8 animate-spin text-violet-600" /></div>;
  }

  try {
    const kpiStats = data?.stats ? [
      { title: 'Total Pending', value: data.stats.pending, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-100' },
      { title: 'Approved', value: data.stats.approved, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-100' },
      { title: 'Rejected', value: data.stats.rejected, icon: XCircle, color: 'text-rose-500', bg: 'bg-rose-100' },
      { title: 'Escalated', value: data.stats.escalated, icon: AlertCircle, color: 'text-indigo-500', bg: 'bg-indigo-100' },
    ] : [];

    const rawRoleBreakdown = data?.roleBreakdown || [];
    const aggregatedRoles: Record<string, number> = {};
    rawRoleBreakdown.forEach((item: any) => {
      const role = typeof item.role === 'string' ? item.role : 'Employee';
      aggregatedRoles[role] = (aggregatedRoles[role] || 0) + (Number(item.count) || 0);
    });

    const totalRoles = Object.values(aggregatedRoles).reduce((a, b) => a + b, 0);

    const roleBreakdown = Object.entries(aggregatedRoles)
      .map(([role, count]) => {
        let icon = Users;
        let color = 'bg-blue-500';
        if (role === 'Team Lead') { icon = UserCircle; color = 'bg-violet-500'; }
        if (role === 'Manager') { icon = Briefcase; color = 'bg-amber-500'; }
        if (role === 'HR') { icon = Shield; color = 'bg-emerald-500'; }
        const percent = totalRoles > 0 ? Math.round((count / totalRoles) * 100) + '%' : '0%';
        return { role, count, icon, color, percent };
      })
      .sort((a, b) => b.count - a.count);

    const recentApprovals = Array.isArray(data?.recentApprovals) ? data.recentApprovals.filter((req: any) => {
      if (filterStatus === 'All') return true;
      const statusStr = typeof req.status === 'string' ? req.status.toLowerCase() : '';
      return statusStr.includes(filterStatus.toLowerCase());
    }) : [];

    const totalPages = Math.ceil(recentApprovals.length / recordsPerPage);
    const paginatedApprovals = recentApprovals.slice(
      (currentPage - 1) * recordsPerPage,
      currentPage * recordsPerPage
    );

    const handleExport = () => {
      if (!data?.recentApprovals) return;
      const csvRows = ["Applicant,Role,Department,Module,Status,Date"];
      data.recentApprovals.forEach((r: any) => {
        const applicantName = (r.applicant?.name || '').toString().replace(/,/g, ' ');
        const role = (r.details?.role || '').toString().replace(/,/g, ' ');
        const dept = (r.details?.department || '').toString().replace(/,/g, ' ');
        const date = new Date(r.createdAt).toLocaleDateString();
        csvRows.push(`${applicantName},${role},${dept},${r.moduleType},${r.status},${date}`);
      });
      
      const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "approvals_report.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    return (
      <div className="space-y-6 p-2 md:p-6 pb-24 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-violet-600" />
            Approvals Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Overview of all organizational approvals across different roles and hierarchies.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px] h-9">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Statuses</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Approved">Approved</SelectItem>
              <SelectItem value="Rejected">Rejected</SelectItem>
              <SelectItem value="Escalated">Escalated</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleExport} className="h-9 bg-violet-600 hover:bg-violet-700">
            Export Report
          </Button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiStats.map((stat, i) => (
          <Card key={i} className="border shadow-sm rounded-xl overflow-hidden group hover:shadow-md transition-shadow">
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`p-3 rounded-xl ${stat.bg} ${stat.color} transition-transform group-hover:scale-110`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                <h3 className="text-2xl font-bold mt-1">{stat.value}</h3>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Role Breakdown */}
        <Card className="col-span-1 lg:col-span-1 border rounded-2xl shadow-sm">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base font-bold">Pending by Role</CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-6">
            <div className="space-y-5">
              {roleBreakdown.map((item, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2 font-medium">
                      <item.icon className="w-4 h-4 text-muted-foreground" />
                      {item.role}
                    </div>
                    <span className="font-bold text-muted-foreground">{item.count}</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${item.color} rounded-full`} 
                      style={{ width: item.percent }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 mt-4 border-t">
              <Button variant="ghost" className="w-full text-violet-600 hover:text-violet-700 hover:bg-violet-50">
                View Detailed Hierarchy <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Right Column: Recent Approvals */}
        <Card className="col-span-1 lg:col-span-2 border rounded-2xl shadow-sm">
          <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
            <CardTitle className="text-base font-bold">Recent Pending Requests</CardTitle>
            <Button variant="link" className="text-xs h-auto p-0 text-violet-600">View All</Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {paginatedApprovals.length > 0 ? (
                paginatedApprovals.map((req: any) => (
                  <div key={req.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600">
                        {typeof req.applicant?.name === 'string' ? req.applicant.name.split(' ').map((n: string) => n[0] || '').join('') : 'U'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-sm">{typeof req.applicant?.name === 'string' ? req.applicant.name : 'Unknown'}</h4>
                          <Badge variant="outline" className="text-[10px] uppercase font-bold py-0 h-4">
                            {String(req.details?.role || 'Employee')}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {String(req.details?.department || 'Unknown')} • <span className="font-medium text-slate-700">{String(req.moduleType || '')}</span>
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                      <Badge variant="secondary" className={`border-none font-semibold text-xs ${
                        String(req.status || '').toLowerCase().includes('pending') ? 'bg-amber-100 text-amber-700 hover:bg-amber-100' :
                        String(req.status || '').toLowerCase().includes('approved') ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' :
                        String(req.status || '').toLowerCase().includes('rejected') ? 'bg-rose-100 text-rose-700 hover:bg-rose-100' :
                        'bg-indigo-100 text-indigo-700 hover:bg-indigo-100'
                      }`}>
                        {String(req.status || '')}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground font-medium flex items-center">
                        <Clock className="w-3 h-3 mr-1" /> {req.details?.time ? String(req.details.time) : new Date(req.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No requests found for the selected filter.
                </div>
              )}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="p-4 border-t flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Showing {(currentPage - 1) * recordsPerPage + 1} to {Math.min(currentPage * recordsPerPage, recentApprovals.length)} of {recentApprovals.length} entries
                </span>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="h-8 px-2"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-xs font-semibold px-2">Page {currentPage} of {totalPages}</span>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="h-8 px-2"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
  } catch (err: any) {
    return <div className="p-10 text-red-500 font-mono whitespace-pre-wrap">Crash Error: {err?.message || String(err)}{'\n'}{err?.stack}</div>;
  }
}
