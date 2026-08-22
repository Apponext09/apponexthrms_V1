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
  ChevronRight,
  PieChart as PieIcon,
  TrendingUp,
  X,
  Search
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import api from '@/lib/api';
import { useCompanyStore } from '@/features/settings/store/companyStore';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend 
} from 'recharts';

export function ApprovalsDashboardPage() {
  const { selectedCompanyId } = useCompanyStore();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [chartTab, setChartTab] = useState<'role' | 'department' | 'employee'>('role');
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 5;

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await api.get('/approvals/dashboard');
        setData(response.data.data);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedCompanyId]);

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

    // Filtered approvals based on status filter AND search query
    const filteredApprovals = Array.isArray(data?.recentApprovals) ? data.recentApprovals.filter((req: any) => {
      const applicantName = (req.applicant?.name || '').toLowerCase();
      const matchesSearch = applicantName.includes(searchQuery.toLowerCase());
      
      if (filterStatus === 'All') return matchesSearch;
      const statusStr = typeof req.status === 'string' ? req.status.toLowerCase() : '';
      return matchesSearch && statusStr.includes(filterStatus.toLowerCase());
    }) : [];

    const totalPages = Math.ceil(filteredApprovals.length / recordsPerPage);
    const paginatedApprovals = filteredApprovals.slice(
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

    const statusPieData = data?.stats ? [
      { name: 'Pending', value: data.stats.pending || 0, color: '#f59e0b' },
      { name: 'Approved', value: data.stats.approved || 0, color: '#10b981' },
      { name: 'Rejected', value: data.stats.rejected || 0, color: '#ef4444' },
      { name: 'Escalated', value: data.stats.escalated || 0, color: '#6366f1' },
    ].filter(item => item.value > 0) : [];

    const roleBarData = roleBreakdown.map(item => ({
      name: item.role,
      count: item.count,
    }));

    // Group leaves by Department for the department chart
    const departmentCounts: Record<string, number> = {};
    if (data?.recentApprovals) {
      data.recentApprovals.forEach((r: any) => {
        const dept = r.details?.department || 'Other';
        departmentCounts[dept] = (departmentCounts[dept] || 0) + 1;
      });
    }

    const departmentBarData = Object.entries(departmentCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    // Calculate leaves applied by each applicant to build the top applicants chart
    const applicantCounts: Record<string, number> = {};
    if (data?.recentApprovals) {
      data.recentApprovals.forEach((r: any) => {
        const name = r.applicant?.name || 'Unknown';
        applicantCounts[name] = (applicantCounts[name] || 0) + 1;
      });
    }

    const topApplicantsData = Object.entries(applicantCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // Capped at top 5 to keep the chart clean and readable

    // Selected employee leaves history
    const employeeHistory = selectedEmployee 
      ? (data?.recentApprovals?.filter((r: any) => r.applicant?.name === selectedEmployee.name) || [])
      : [];

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

      {/* Graphs Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Donut Chart: Status Distribution */}
        <Card className="col-span-1 border rounded-2xl shadow-sm">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <PieIcon className="w-4.5 h-4.5 text-violet-600" />
              Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 flex flex-col items-center justify-center min-h-[300px]">
            {statusPieData.length > 0 ? (
              <div className="w-full h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {statusPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px' }}
                    />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center text-sm text-muted-foreground py-12">
                No status data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bar Chart: Dynamic Tabs */}
        <Card className="col-span-1 lg:col-span-2 border rounded-2xl shadow-sm">
          <CardHeader className="pb-3 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <TrendingUp className="w-4.5 h-4.5 text-violet-600" />
              {chartTab === 'role' ? 'Pending Requests by Role' : chartTab === 'department' ? 'Requests by Department' : 'Top Leave Applicants'}
            </CardTitle>
            <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-[9px] font-bold">
              <button 
                onClick={() => setChartTab('role')}
                className={`px-2.5 py-1 rounded-md transition-all ${chartTab === 'role' ? 'bg-white dark:bg-slate-800 text-violet-600 dark:text-violet-400 shadow-sm font-semibold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
              >
                By Role
              </button>
              <button 
                onClick={() => setChartTab('department')}
                className={`px-2.5 py-1 rounded-md transition-all ${chartTab === 'department' ? 'bg-white dark:bg-slate-800 text-violet-600 dark:text-violet-400 shadow-sm font-semibold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
              >
                By Department
              </button>
              <button 
                onClick={() => setChartTab('employee')}
                className={`px-2.5 py-1 rounded-md transition-all ${chartTab === 'employee' ? 'bg-white dark:bg-slate-800 text-violet-600 dark:text-violet-400 shadow-sm font-semibold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
              >
                By Employee
              </button>
            </div>
          </CardHeader>
          <CardContent className="p-5 min-h-[300px]">
            {chartTab === 'role' && (
              roleBarData.length > 0 ? (
                <div className="w-full h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={roleBarData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <XAxis dataKey="name" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip 
                        cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }}
                        contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px' }}
                      />
                      <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={45}>
                        {roleBarData.map((entry, index) => {
                          const colors = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#6366f1'];
                          return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center text-sm text-muted-foreground py-12">
                  No pending requests by role
                </div>
              )
            )}

            {chartTab === 'department' && (
              departmentBarData.length > 0 ? (
                <div className="w-full h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={departmentBarData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <XAxis dataKey="name" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip 
                        cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }}
                        contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px' }}
                      />
                      <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={45}>
                        {departmentBarData.map((entry, index) => {
                          const colors = ['#3b82f6', '#ec4899', '#f59e0b', '#10b981', '#8b5cf6'];
                          return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center text-sm text-muted-foreground py-12">
                  No department data available
                </div>
              )
            )}

            {chartTab === 'employee' && (
              topApplicantsData.length > 0 ? (
                <div className="w-full h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topApplicantsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <XAxis dataKey="name" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip 
                        cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }}
                        contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px' }}
                      />
                      <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={45}>
                        {topApplicantsData.map((entry, index) => {
                          const colors = ['#10b981', '#06b6d4', '#6366f1', '#f59e0b', '#3b82f6'];
                          return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center text-sm text-muted-foreground py-12">
                  No applicants data available
                </div>
              )
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Pending Requests Table/List */}
      <Card className="border rounded-2xl shadow-sm">
        <CardHeader className="pb-3 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base font-bold">Recent Requests Log</CardTitle>
            <p className="text-[11px] text-muted-foreground mt-0.5">Click on an applicant's card to view their full history</p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input 
                type="search" 
                placeholder="Search by Employee Name..." 
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-8 h-9 text-xs w-full"
              />
            </div>
            {searchQuery && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSearchQuery('')}
                className="h-9 px-2.5 text-xs border border-dashed text-slate-500 hover:text-slate-700"
              >
                Clear
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {paginatedApprovals.length > 0 ? (
              paginatedApprovals.map((req: any) => (
                <div key={req.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div 
                    className="flex items-center gap-4 cursor-pointer group/item"
                    onClick={() => setSelectedEmployee(req.applicant)}
                  >
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-650 transition-colors group-hover/item:bg-violet-100 group-hover/item:text-violet-750">
                      {typeof req.applicant?.name === 'string' ? req.applicant.name.split(' ').map((n: string) => n[0] || '').join('') : 'U'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-sm group-hover/item:text-violet-650 group-hover/item:underline">{typeof req.applicant?.name === 'string' ? req.applicant.name : 'Unknown'}</h4>
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
                Showing {(currentPage - 1) * recordsPerPage + 1} to {Math.min(currentPage * recordsPerPage, filteredApprovals.length)} of {filteredApprovals.length} entries
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

      {/* History Slide-up / Modal */}
      {selectedEmployee && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 transition-all">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center font-bold text-base">
                  {selectedEmployee.name.split(' ').map((n: string) => n[0] || '').join('')}
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">{selectedEmployee.name}</h3>
                  <p className="text-xs text-slate-500">Employee Leave History & Workflow Log</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedEmployee(null)} 
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {employeeHistory.length > 0 ? (
                <div className="space-y-3">
                  {employeeHistory.map((historyItem: any) => (
                    <div key={historyItem.id} className="border border-slate-100 dark:border-slate-800 rounded-xl p-4 flex justify-between items-center bg-slate-50/20">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                            {historyItem.details?.type || historyItem.moduleType} Request
                          </span>
                          <Badge variant="outline" className="text-[9px] uppercase font-bold py-0.5 px-1.5">
                            {historyItem.details?.department || 'Department'}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-slate-550 mt-1 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" /> Created on {new Date(historyItem.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge className={`border-none font-semibold text-xs py-0.5 px-2.5 rounded-full ${
                          historyItem.status.toLowerCase().includes('pending') ? 'bg-amber-100 text-amber-700' :
                          historyItem.status.toLowerCase().includes('approved') ? 'bg-emerald-100 text-emerald-700' :
                          historyItem.status.toLowerCase().includes('rejected') ? 'bg-rose-100 text-rose-700' :
                          'bg-indigo-100 text-indigo-700'
                        }`}>
                          {historyItem.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-sm text-slate-400">
                  No leave history recorded for this employee.
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end bg-slate-50/30">
              <Button onClick={() => setSelectedEmployee(null)} variant="outline" className="h-9 text-xs">
                Close History
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
  } catch (err: any) {
    return <div className="p-10 text-red-500 font-mono whitespace-pre-wrap">Crash Error: {err?.message || String(err)}{'\n'}{err?.stack}</div>;
  }
}
