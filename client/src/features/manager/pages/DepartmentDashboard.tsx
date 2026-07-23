import React, { useState } from 'react';
import { useManager } from '../hooks/useManager';
import { 
  Building2, Users, Award, TrendingUp, HelpCircle, 
  Send, UserCheck, Briefcase, ChevronRight 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export function DepartmentDashboard() {
  const { 
    dashboard, isDashboardLoading, 
    employees, isEmployeesLoading, 
    submitRecommendation, isSubmittingRecommendation,
    submitHiringRequest, isSubmittingHiringRequest
  } = useManager();

  const [selectedEmp, setSelectedEmp] = useState<string>('');
  const [recommendType, setRecommendType] = useState<'promotion' | 'transfer'>('promotion');
  const [recommendDetails, setRecommendDetails] = useState<string>('');

  const [hiringDesignation, setHiringDesignation] = useState<string>('Marketing Associate');
  const [hiringJustification, setHiringJustification] = useState<string>('');

  const handleRecommend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmp || !recommendDetails) {
      toast.error('Please select an employee and enter details.');
      return;
    }

    try {
      await submitRecommendation({
        employeeId: parseInt(selectedEmp, 10),
        type: recommendType,
        details: recommendDetails,
      });
      toast.success('Recommendation submitted successfully');
      setRecommendDetails('');
      setSelectedEmp('');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit recommendation');
    }
  };

  const handleHiring = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hiringJustification) {
      toast.error('Please enter hiring justification.');
      return;
    }

    try {
      // Mock designation ID 1 for demonstration
      await submitHiringRequest({
        designationId: 1,
        justification: hiringJustification,
      });
      toast.success('Hiring request submitted to HR');
      setHiringJustification('');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit hiring request');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl p-6 text-white shadow-md">
        <h1 className="text-2xl font-extrabold tracking-tight">Department Dashboard</h1>
        <p className="text-sm text-indigo-100 mt-1">
          Review department statistics, manage employee promotion proposals, and submit headcount requisitions.
        </p>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Headcount */}
        <Card className="border shadow-sm rounded-2xl">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Total Headcount</span>
              <p className="text-2xl font-extrabold text-foreground mt-1">
                {isDashboardLoading ? '...' : dashboard.headcount}
              </p>
            </div>
            <div className="h-10 w-10 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 rounded-xl flex items-center justify-center">
              <Users className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Pending Requisitions */}
        <Card className="border shadow-sm rounded-2xl">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Hiring Requests</span>
              <p className="text-2xl font-extrabold text-violet-600 mt-1">
                {isDashboardLoading ? '...' : dashboard.pendingHiringRequests}
              </p>
            </div>
            <div className="h-10 w-10 bg-violet-50 dark:bg-violet-950/40 text-violet-600 rounded-xl flex items-center justify-center">
              <Briefcase className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Active PIPs */}
        <Card className="border shadow-sm rounded-2xl">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Active PIPs</span>
              <p className="text-2xl font-extrabold text-foreground mt-1">
                {isDashboardLoading ? '...' : dashboard.activePIPs}
              </p>
            </div>
            <div className="h-10 w-10 bg-muted text-muted-foreground rounded-xl flex items-center justify-center">
              <HelpCircle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Budget Utilization */}
        <Card className="border shadow-sm rounded-2xl">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Budget Utilization</span>
              <p className="text-2xl font-extrabold text-emerald-600 mt-1">
                {isDashboardLoading ? '...' : `${dashboard.budgetUtilization}%`}
              </p>
            </div>
            <div className="h-10 w-10 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 rounded-xl flex items-center justify-center">
              <TrendingUp className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Forms column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Promotion / Transfer Proposals */}
          <Card className="border rounded-2xl shadow-sm">
            <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="h-4.5 w-4.5 text-indigo-600" />
                <CardTitle className="text-sm font-bold">Promotion & Transfer Proposals</CardTitle>
              </div>
              <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 text-[10px]">
                Department Head Scope
              </Badge>
            </CardHeader>
            <CardContent className="p-4">
              <form onSubmit={handleRecommend} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Select Colleague</label>
                    <select 
                      value={selectedEmp}
                      onChange={(e) => setSelectedEmp(e.target.value)}
                      className="w-full text-xs rounded-xl border border-input bg-card p-2.5 outline-none focus:border-indigo-500 shadow-sm"
                    >
                      <option value="">-- Choose employee --</option>
                      {employees.map((emp: any) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.firstName} {emp.lastName} ({emp.designation})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Recommendation Type</label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        onClick={() => setRecommendType('promotion')}
                        className={`flex-1 text-xs py-2 rounded-xl border font-bold transition-all ${
                          recommendType === 'promotion'
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow'
                            : 'bg-card text-muted-foreground hover:bg-muted'
                        }`}
                      >
                        Promotion
                      </Button>
                      <Button
                        type="button"
                        onClick={() => setRecommendType('transfer')}
                        className={`flex-1 text-xs py-2 rounded-xl border font-bold transition-all ${
                          recommendType === 'transfer'
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow'
                            : 'bg-card text-muted-foreground hover:bg-muted'
                        }`}
                      >
                        Transfer
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Justification Details</label>
                  <textarea
                    rows={3}
                    placeholder="Enter business justification, performance highlights, proposed grade/location..."
                    value={recommendDetails}
                    onChange={(e) => setRecommendDetails(e.target.value)}
                    className="w-full text-xs rounded-xl border border-input bg-card p-2.5 outline-none focus:border-indigo-500 shadow-sm resize-none"
                  />
                </div>

                <Button 
                  type="submit" 
                  disabled={isSubmittingRecommendation || !selectedEmp || !recommendDetails}
                  className="w-full py-5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 shadow"
                >
                  <Send className="h-4 w-4" />
                  Submit Recommendation
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Department Hiring Requisitions */}
          <Card className="border rounded-2xl shadow-sm">
            <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <Briefcase className="h-4.5 w-4.5 text-indigo-600" />
                <CardTitle className="text-sm font-bold">New Resource Planning Requisitions</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <form onSubmit={handleHiring} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Proposed Designation</label>
                  <select 
                    value={hiringDesignation}
                    onChange={(e) => setHiringDesignation(e.target.value)}
                    className="w-full text-xs rounded-xl border border-input bg-card p-2.5 outline-none focus:border-indigo-500 shadow-sm"
                  >
                    <option value="Marketing Associate">Marketing Associate</option>
                    <option value="Senior Marketing Executive">Senior Marketing Executive</option>
                    <option value="SEO Specialist">SEO Specialist</option>
                    <option value="Content Lead">Content Lead</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Business Justification</label>
                  <textarea
                    rows={2}
                    placeholder="Describe why this vacancy is required, workload trends, and direct business ROI..."
                    value={hiringJustification}
                    onChange={(e) => setHiringJustification(e.target.value)}
                    className="w-full text-xs rounded-xl border border-input bg-card p-2.5 outline-none focus:border-indigo-500 shadow-sm resize-none"
                  />
                </div>

                <Button 
                  type="submit" 
                  disabled={isSubmittingHiringRequest || !hiringJustification}
                  className="w-full py-5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 shadow"
                >
                  <Send className="h-4 w-4" />
                  Submit Requisition Request
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right Directory column */}
        <div className="lg:col-span-1">
          <Card className="border rounded-2xl shadow-sm">
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center gap-2">
                <Building2 className="h-4.5 w-4.5 text-indigo-600" />
                <CardTitle className="text-sm font-bold">Department Members</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              {isEmployeesLoading ? (
                <div className="text-center py-8 text-xs text-muted-foreground">Loading department...</div>
              ) : employees.length === 0 ? (
                <div className="text-center py-8 text-xs text-muted-foreground">No employees in your department.</div>
              ) : (
                <div className="space-y-4 max-h-[520px] overflow-y-auto pr-1">
                  {employees.map((emp: any) => {
                    const initials = `${emp.firstName[0]}${emp.lastName[0]}`.toUpperCase();
                    return (
                      <div key={emp.id} className="flex items-center justify-between p-2 rounded-xl hover:bg-muted/40 transition-all border border-transparent hover:border-border">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 font-bold text-xs flex items-center justify-center rounded-xl border">
                            {initials}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-foreground">{emp.firstName} {emp.lastName}</p>
                            <p className="text-[9px] text-muted-foreground mt-0.5">{emp.designation}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-[9px] px-2 py-0.5 border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 uppercase tracking-wider font-semibold">
                          {emp.status}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
