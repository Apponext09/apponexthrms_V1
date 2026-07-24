import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useEmployees } from '@/features/employee/hooks/useEmployees';
import { useManager } from '@/features/manager/hooks/useManager';
import {
  Users, Clock, CheckCircle2, BarChart3, Briefcase,
  TrendingUp, Award, ArrowRight, Send, UserCheck
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
import { toast } from 'sonner';

import { getUserRoleAndDept } from '@/lib/userProfile';

export function ManagerDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const roleInfo = getUserRoleAndDept(user);
  const { dashboard, isDashboardLoading, employees, submitRecommendation, isSubmittingRecommendation } = useManager();

  const [selectedEmp, setSelectedEmp] = useState('');
  const [recommendType, setRecommendType] = useState<'promotion' | 'transfer'>('promotion');
  const [recommendDetails, setRecommendDetails] = useState('');

  const handleRecommend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmp || !recommendDetails) { toast.error('Select an employee and enter details.'); return; }
    try {
      await submitRecommendation({ employeeId: parseInt(selectedEmp), type: recommendType, details: recommendDetails });
      toast.success('Recommendation submitted!');
      setRecommendDetails('');
      setSelectedEmp('');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit');
    }
  };

  const stats = [
    { label: 'Team Size', value: isDashboardLoading ? '…' : dashboard.headcount, icon: Users, color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-900/20' },
    { label: 'Leave Requests', value: '3', icon: CheckCircle2, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
    { label: 'Active PIPs', value: isDashboardLoading ? '…' : dashboard.activePIPs, icon: BarChart3, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20' },
    { label: 'Hiring Requests', value: isDashboardLoading ? '…' : dashboard.pendingHiringRequests, icon: Briefcase, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
  ];

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-violet-600 via-violet-500 to-indigo-500 p-6 text-white shadow-lg">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge className="bg-white/20 hover:bg-white/30 text-white border-0 text-xs font-semibold">
                {roleInfo.roleTitle}
              </Badge>
              <span className="text-violet-200 text-xs font-medium">• {roleInfo.departmentName} Department</span>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight mt-0.5">Welcome, {user?.firstName}! 👋</h1>
            <p className="text-violet-100 text-sm mt-1">Here's your department overview and team metrics.</p>
          </div>
          <Button
            onClick={() => navigate('/manager/team')}
            className="bg-white/20 hover:bg-white/30 text-white border border-white/30 text-sm"
          >
            <Users className="h-4 w-4 mr-2" /> View My Team
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="border shadow-sm">
              <CardContent className="p-5 flex items-center gap-4">
                <div className={`h-11 w-11 rounded-xl ${stat.bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
                  <p className="text-2xl font-extrabold text-foreground">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Promotion recommendation */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border shadow-sm">
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-violet-600" />
                  <CardTitle className="text-sm font-bold">Submit Promotion / Transfer Proposal</CardTitle>
                </div>
                <Badge variant="secondary" className="text-[10px] bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-300">
                  Dept Head Scope
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-5">
              <form onSubmit={handleRecommend} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Select Team Member</label>
                    <select
                      value={selectedEmp}
                      onChange={(e) => setSelectedEmp(e.target.value)}
                      className="w-full text-sm rounded-lg border border-input bg-card p-2.5 outline-none focus:border-violet-500"
                    >
                      <option value="">— Choose employee —</option>
                      {employees.map((emp: any) => (
                        <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Type</label>
                    <div className="flex gap-2">
                      {(['promotion', 'transfer'] as const).map((t) => (
                        <button
                          key={t} type="button"
                          onClick={() => setRecommendType(t)}
                          className={`flex-1 py-2.5 rounded-lg border text-sm font-semibold capitalize transition-all ${recommendType === t ? 'bg-violet-600 text-white border-violet-600' : 'bg-card text-muted-foreground hover:bg-muted'}`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Justification</label>
                  <textarea
                    rows={3} value={recommendDetails}
                    onChange={(e) => setRecommendDetails(e.target.value)}
                    placeholder="Business justification, performance highlights, proposed grade..."
                    className="w-full text-sm rounded-lg border border-input bg-card p-2.5 outline-none focus:border-violet-500 resize-none"
                  />
                </div>
                <Button
                  type="submit" disabled={isSubmittingRecommendation || !selectedEmp || !recommendDetails}
                  className="w-full bg-violet-600 hover:bg-violet-700 text-white"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Submit Recommendation
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Quick Links */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'My Team', icon: Users, href: '/manager/team', color: 'from-violet-500 to-violet-600' },
              { label: 'Leave Approvals', icon: CheckCircle2, href: '/leaves/approvals', color: 'from-amber-500 to-amber-600' },
              { label: 'Performance', icon: TrendingUp, href: '/performance', color: 'from-emerald-500 to-emerald-600' },
              { label: 'Hiring Request', icon: Briefcase, href: '/manager/hiring', color: 'from-blue-500 to-blue-600' },
            ].map((link) => {
              const Icon = link.icon;
              return (
                <button
                  key={link.label}
                  onClick={() => navigate(link.href)}
                  className={`flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r ${link.color} text-white shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all text-left`}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <span className="font-semibold text-sm">{link.label}</span>
                  <ArrowRight className="h-4 w-4 ml-auto opacity-70" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Team members sidebar */}
        <div>
          <Card className="border shadow-sm">
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-violet-600" />
                <CardTitle className="text-sm font-bold">Department Members</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              {employees.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">No team members found.</p>
              ) : (
                <div className="space-y-3 max-h-[460px] overflow-y-auto">
                  {employees.slice(0, 15).map((emp: any) => {
                    const initials = `${emp.firstName?.[0] || ''}${emp.lastName?.[0] || ''}`.toUpperCase();
                    return (
                      <div key={emp.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="h-9 w-9 rounded-xl bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 font-bold text-xs flex items-center justify-center flex-shrink-0 border">
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">{emp.firstName} {emp.lastName}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{emp.designation || 'Employee'}</p>
                        </div>
                        <Badge variant="outline" className="text-[9px] px-1.5 border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-300 uppercase font-semibold shrink-0">
                          {emp.status || 'active'}
                        </Badge>
                      </div>
                    );
                  })}
                  {employees.length > 15 && (
                    <button onClick={() => navigate('/manager/team')} className="w-full text-center text-xs text-violet-600 hover:underline py-1">
                      View all {employees.length} members →
                    </button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
