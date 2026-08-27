import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, Users, Target, UserCheck, TrendingUp, Layers } from 'lucide-react';
import { useCompanies, useLocations, useDepartments, useGrades, useEmployeeTypes, useDesignations } from '@/features/settings/hooks';
import { useApplications } from '../hooks/useApplications';
import { format } from 'date-fns';
import { apiClient } from '@/lib/api';

const INTERVIEW_STAGES = ['applied', 'screening', 'assessment', 'interview', 'offer', 'hired', 'rejected', 'withdrawn'];

export const CandidateReportPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'applications' | 'sourcing'>('applications');
  
  // Master data hooks
  const { data: companies } = useCompanies();
  const { data: locations } = useLocations();
  const { data: departments } = useDepartments();
  const { data: grades } = useGrades();
  const { employeeTypes } = useEmployeeTypes();
  const { designations } = useDesignations();

  // Filter state for applications table
  const [filters, setFilters] = useState({
    companyId: 'all',
    locationId: 'all',
    departmentId: 'all',
    gradeId: 'all',
    typeId: 'all',
    designationId: 'all',
    stage: 'all'
  });

  const [pageSize, setPageSize] = useState('10');
  const [currentPage, setCurrentPage] = useState(1);
  const [activeFilters, setActiveFilters] = useState(filters);

  // Sourcing Funnel Data state
  const [funnelData, setFunnelData] = useState<any>(null);
  const [funnelLoading, setFunnelLoading] = useState(false);

  // Fetch applications list
  const { data: response, isLoading: isApplicationsLoading } = useApplications({
    page: currentPage,
    pageSize: parseInt(pageSize, 10),
    ...activeFilters
  });

  // Fetch full funnel analytics
  useEffect(() => {
    setFunnelLoading(true);
    apiClient.get('/recruitment/reports/funnel')
      .then(res => {
        if (res.data?.success) {
          setFunnelData(res.data.data);
        }
      })
      .catch(err => console.error('Failed to load funnel report', err))
      .finally(() => setFunnelLoading(false));
  }, []);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handlePageSizeChange = (val: string) => {
    setPageSize(val);
    setCurrentPage(1);
  };

  const handleSubmit = () => {
    setActiveFilters(filters);
    setCurrentPage(1);
  };

  const handleExportApplications = () => {
    if (!response?.data) return;
    const headers = ['Name', 'Email', 'Role', 'Department', 'Stage', 'Date'];
    const csvContent = [
      headers.join(','),
      ...response.data.map((c: any) => {
        const name = c.candidate_name || c.candidateName || '';
        const email = c.candidate_email || c.candidateEmail || '';
        const role = c.position_title || c.positionTitle || '';
        const dept = c.department_name || c.departmentName || '';
        const stage = c.application_status || c.applicationStatus || '';
        const appliedAt = c.applied_at || c.appliedAt;
        const dateStr = appliedAt ? format(new Date(appliedAt), 'MMM dd, yyyy') : '';
        return `"${name}","${email}","${role}","${dept}","${stage}","${dateStr}"`;
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'candidate_applications_report.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleExportSourcingFunnel = () => {
    if (!funnelData?.sourcingFunnel?.bySource) return;
    const headers = ['Source Channel', 'Total Sourced', 'Shortlisted to Pipeline', 'Hired', 'Shortlist Rate %', 'Hire Rate %'];
    const csvContent = [
      headers.join(','),
      ...funnelData.sourcingFunnel.bySource.map((s: any) => {
        return `"${s.sourceChannel}","${s.totalSourced}","${s.totalShortlisted}","${s.totalHired}","${s.shortlistRatePct}%","${s.hireRatePct}%"`;
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sourcing_funnel_conversion_report.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Pagination calculations from API meta
  const totalEntries = response?.meta?.total || 0;
  const totalPages = response?.meta?.totalPages || 1;
  const paginatedData = response?.data || [];
  const pageSizeNumber = parseInt(pageSize, 10);
  const startIndex = (currentPage - 1) * pageSizeNumber;
  const endIndex = Math.min(startIndex + pageSizeNumber, totalEntries);

  const sourcingSummary = funnelData?.sourcingFunnel?.summary || {
    totalSourced: 0,
    totalShortlisted: 0,
    totalHired: 0,
    overallShortlistRatePct: 0,
    overallHireRatePct: 0,
  };

  return (
    <div className="flex-1 space-y-6 max-w-full overflow-hidden p-6 min-h-[calc(100vh-4rem)]">
      {/* ── Top Header Banner ────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-6 rounded-2xl border border-border/80 shadow-2xs relative overflow-hidden">
        <div className="flex items-center gap-3.5 relative z-10">
          <div className="w-11 h-11 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold shrink-0 border border-blue-500/20 shadow-xs">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
              Recruitment & Funnel Analytics
            </h1>
            <p className="text-xs text-muted-foreground">
              Audit pipeline conversion rates, sourcing channel yield, department hiring velocity, and stage bottlenecks.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-muted/60 p-1.5 rounded-2xl border border-border/80 relative z-10 shrink-0 w-full sm:w-auto flex-wrap">
          <Button
            size="sm"
            variant={activeTab === 'applications' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('applications')}
            className={`text-xs h-8 px-4 font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'applications' 
                ? 'bg-background text-foreground shadow-xs' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Users className="w-3.5 h-3.5 mr-1.5" />
            Application Funnel
          </Button>
          <Button
            size="sm"
            variant={activeTab === 'sourcing' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('sourcing')}
            className={`text-xs h-8 px-4 font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'sourcing' 
                ? 'bg-background text-foreground shadow-xs' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Layers className="w-3.5 h-3.5 mr-1.5" />
            Sourcing & Conversion Funnel
          </Button>
        </div>
      </div>

      {activeTab === 'sourcing' ? (
        /* Sourcing Funnel View */
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Funnel Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="bg-card border-border/80 shadow-2xs rounded-2xl overflow-hidden">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Resumes Sourced</p>
                  <h3 className="text-2xl font-black text-foreground mt-1">{sourcingSummary.totalSourced}</h3>
                  <p className="text-[11px] text-purple-600 dark:text-purple-400 font-bold mt-1">Top of Funnel (Resume Bank)</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <Layers className="w-6 h-6" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border/80 shadow-2xs rounded-2xl overflow-hidden">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Shortlisted to Pipeline</p>
                  <h3 className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">{sourcingSummary.totalShortlisted}</h3>
                  <p className="text-[11px] text-blue-600/80 dark:text-blue-400/80 font-bold mt-1">{sourcingSummary.overallShortlistRatePct}% Shortlist Conversion</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Target className="w-6 h-6" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border/80 shadow-2xs rounded-2xl overflow-hidden">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Candidates Hired</p>
                  <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{sourcingSummary.totalHired}</h3>
                  <p className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 font-bold mt-1">{sourcingSummary.overallHireRatePct}% Funnel Hire Rate</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <UserCheck className="w-6 h-6" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sourcing Channels Breakdown */}
          <Card className="bg-card border-border/80 shadow-2xs rounded-2xl overflow-hidden">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between p-5 border-b border-border/60 gap-4">
              <div>
                <CardTitle className="text-sm font-extrabold text-foreground flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  Sourcing Channel Conversion Performance
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Channel-wise conversion yield from intake to hired stage</p>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleExportSourcingFunnel} 
                className="h-9 px-3.5 text-xs font-bold gap-1.5 rounded-xl border-border hover:bg-muted shrink-0 text-foreground"
              >
                <Download className="w-3.5 h-3.5 text-muted-foreground" /> Export Sourcing CSV
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="w-full overflow-x-auto">
                <Table className="min-w-[800px] border-collapse">
                  <TableHeader className="bg-muted/50 border-b border-border/60">
                    <TableRow className="border-border/60">
                      <TableHead className="text-[11px] font-bold uppercase tracking-wider py-3.5 px-5 text-muted-foreground">Source Channel</TableHead>
                      <TableHead className="text-[11px] font-bold uppercase tracking-wider py-3.5 px-4 text-muted-foreground text-center">Total Resumes Sourced</TableHead>
                      <TableHead className="text-[11px] font-bold uppercase tracking-wider py-3.5 px-4 text-muted-foreground text-center">Shortlisted to Pipeline</TableHead>
                      <TableHead className="text-[11px] font-bold uppercase tracking-wider py-3.5 px-4 text-muted-foreground text-center">Candidates Hired</TableHead>
                      <TableHead className="text-[11px] font-bold uppercase tracking-wider py-3.5 px-4 text-muted-foreground text-center">Shortlist Rate %</TableHead>
                      <TableHead className="text-[11px] font-bold uppercase tracking-wider py-3.5 px-5 text-muted-foreground text-center">Hire Rate %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-border/60">
                    {funnelLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-32 text-center text-xs text-muted-foreground bg-background">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                            <span>Loading sourcing funnel metrics...</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (funnelData?.sourcingFunnel?.bySource || []).length > 0 ? (
                      funnelData.sourcingFunnel.bySource.map((channel: any, idx: number) => (
                        <TableRow key={idx} className="border-border/60 hover:bg-muted/40 transition-colors">
                          <TableCell className="text-xs font-bold text-foreground py-3.5 px-5">{channel.sourceChannel}</TableCell>
                          <TableCell className="text-xs text-center font-mono font-bold text-foreground py-3.5 px-4">{channel.totalSourced}</TableCell>
                          <TableCell className="text-xs text-center font-mono font-bold text-blue-600 dark:text-blue-400 py-3.5 px-4">{channel.totalShortlisted}</TableCell>
                          <TableCell className="text-xs text-center font-mono font-bold text-emerald-600 dark:text-emerald-400 py-3.5 px-4">{channel.totalHired}</TableCell>
                          <TableCell className="text-xs text-center py-3.5 px-4">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-mono">
                              {channel.shortlistRatePct}%
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-center py-3.5 px-5">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-mono">
                              {channel.hireRatePct}%
                            </span>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="h-32 text-center text-xs text-muted-foreground bg-background">
                          No sourcing data found in Resume Bank.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Job Openings Funnel Breakdown */}
          <Card className="bg-card border-border/80 shadow-2xs rounded-2xl overflow-hidden">
            <CardHeader className="p-5 border-b border-border/60">
              <CardTitle className="text-sm font-extrabold text-foreground">
                Job Openings vs. Sourcing Bank Allocation
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="w-full overflow-x-auto">
                <Table className="min-w-[800px] border-collapse">
                  <TableHeader className="bg-muted/50 border-b border-border/60">
                    <TableRow className="border-border/60">
                      <TableHead className="text-[11px] font-bold uppercase tracking-wider py-3.5 px-5 text-muted-foreground">Job Title / Pool</TableHead>
                      <TableHead className="text-[11px] font-bold uppercase tracking-wider py-3.5 px-4 text-muted-foreground text-center">Open Positions</TableHead>
                      <TableHead className="text-[11px] font-bold uppercase tracking-wider py-3.5 px-4 text-muted-foreground text-center">Resumes Sourced</TableHead>
                      <TableHead className="text-[11px] font-bold uppercase tracking-wider py-3.5 px-4 text-muted-foreground text-center">Shortlisted</TableHead>
                      <TableHead className="text-[11px] font-bold uppercase tracking-wider py-3.5 px-4 text-muted-foreground text-center">Conversion %</TableHead>
                      <TableHead className="text-[11px] font-bold uppercase tracking-wider py-3.5 px-5 text-muted-foreground text-center">Job Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-border/60">
                    {(funnelData?.sourcingFunnel?.byJob || []).length > 0 ? (
                      funnelData.sourcingFunnel.byJob.map((jobRow: any, idx: number) => (
                        <TableRow key={idx} className="border-border/60 hover:bg-muted/40 transition-colors">
                          <TableCell className="text-xs font-bold text-foreground py-3.5 px-5">{jobRow.positionTitle}</TableCell>
                          <TableCell className="text-xs text-center font-mono font-bold text-foreground py-3.5 px-4">{jobRow.noOfPositions ?? '-'}</TableCell>
                          <TableCell className="text-xs text-center font-mono font-bold text-foreground py-3.5 px-4">{jobRow.totalSourced}</TableCell>
                          <TableCell className="text-xs text-center font-mono font-bold text-blue-600 dark:text-blue-400 py-3.5 px-4">{jobRow.totalShortlisted}</TableCell>
                          <TableCell className="text-xs text-center font-mono font-bold text-foreground py-3.5 px-4">{jobRow.shortlistRatePct}%</TableCell>
                          <TableCell className="text-xs text-center py-3.5 px-5">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              jobRow.jobStatus === 'published' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' :
                              jobRow.jobStatus === 'closed' ? 'bg-muted text-muted-foreground border border-border' :
                              'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                            }`}>
                              {jobRow.jobStatus}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center text-xs text-muted-foreground bg-background">
                          No job sourcing distribution records available.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        /* Existing Applications Funnel & Report View */
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Filters Section */}
          <Card className="bg-card border-border/80 shadow-2xs rounded-2xl overflow-hidden">
            <CardHeader className="py-4 px-6 border-b border-border/60 bg-muted/30">
              <CardTitle className="text-sm font-extrabold text-foreground">Candidate Application Filter</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground uppercase tracking-wider">Company</label>
                  <Select value={filters.companyId} onValueChange={(val) => handleFilterChange('companyId', val)}>
                    <SelectTrigger className="h-9 text-xs bg-background border-border rounded-xl font-bold">
                      <SelectValue placeholder={`Company (${companies?.length || 0})`} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Company ({companies?.length || 0})</SelectItem>
                      {companies?.map((item: any) => (
                        <SelectItem key={item.id} value={item.id.toString()}>{item.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground uppercase tracking-wider">Location</label>
                  <Select value={filters.locationId} onValueChange={(val) => handleFilterChange('locationId', val)}>
                    <SelectTrigger className="h-9 text-xs bg-background border-border rounded-xl font-bold">
                      <SelectValue placeholder={`Location (${locations?.items?.length || 0})`} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Location ({locations?.items?.length || 0})</SelectItem>
                      {locations?.items?.map((item: any) => (
                        <SelectItem key={item.id} value={item.id.toString()}>{item.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground uppercase tracking-wider">Department</label>
                  <Select value={filters.departmentId} onValueChange={(val) => handleFilterChange('departmentId', val)}>
                    <SelectTrigger className="h-9 text-xs bg-background border-border rounded-xl font-bold">
                      <SelectValue placeholder={`Department (${departments?.items?.length || 0})`} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Department ({departments?.items?.length || 0})</SelectItem>
                      {departments?.items?.map((item: any) => (
                        <SelectItem key={item.id} value={item.id.toString()}>{item.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground uppercase tracking-wider">Grade</label>
                  <Select value={filters.gradeId} onValueChange={(val) => handleFilterChange('gradeId', val)}>
                    <SelectTrigger className="h-9 text-xs bg-background border-border rounded-xl font-bold">
                      <SelectValue placeholder={`Grade (${grades?.items?.length || 0})`} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Grade ({grades?.items?.length || 0})</SelectItem>
                      {grades?.items?.map((item: any) => (
                        <SelectItem key={item.id} value={item.id.toString()}>{item.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground uppercase tracking-wider">Type</label>
                  <Select value={filters.typeId} onValueChange={(val) => handleFilterChange('typeId', val)}>
                    <SelectTrigger className="h-9 text-xs bg-background border-border rounded-xl font-bold">
                      <SelectValue placeholder={`Type (${employeeTypes?.length || 0})`} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Type ({employeeTypes?.length || 0})</SelectItem>
                      {employeeTypes?.map((item: any) => (
                        <SelectItem key={item.id} value={item.id.toString()}>{item.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground uppercase tracking-wider">Designation</label>
                  <Select value={filters.designationId} onValueChange={(val) => handleFilterChange('designationId', val)}>
                    <SelectTrigger className="h-9 text-xs bg-background border-border rounded-xl font-bold">
                      <SelectValue placeholder={`Designation (${designations?.length || 0})`} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Designation ({designations?.length || 0})</SelectItem>
                      {designations?.map((item: any) => (
                        <SelectItem key={item.id} value={item.id.toString()}>{item.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground uppercase tracking-wider">Stage</label>
                  <Select value={filters.stage} onValueChange={(val) => handleFilterChange('stage', val)}>
                    <SelectTrigger className="h-9 text-xs bg-background border-border rounded-xl font-bold capitalize">
                      <SelectValue placeholder="Choose" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Choose</SelectItem>
                      {INTERVIEW_STAGES.map((stage) => (
                        <SelectItem key={stage} value={stage} className="capitalize">{stage}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

              </div>
              
              <div className="flex items-center gap-2 pt-2">
                <Button onClick={handleSubmit} className="h-9 px-5 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold rounded-xl shadow-xs cursor-pointer">
                  Filter Applications
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Results Section */}
          <Card className="bg-card border-border/80 shadow-2xs rounded-2xl overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between p-5 border-b border-border/60">
              <CardTitle className="text-sm font-extrabold text-foreground">Candidate Applications ({totalEntries})</CardTitle>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleExportApplications} 
                className="h-9 px-3.5 text-xs font-bold gap-1.5 rounded-xl border-border hover:bg-muted shrink-0 text-foreground"
              >
                <Download className="w-3.5 h-3.5 text-muted-foreground" />
                Export CSV
              </Button>
            </CardHeader>
            
            <CardContent className="p-0">
              <div className="p-3.5 bg-muted/30 border-b border-border/60 flex justify-between items-center text-xs text-muted-foreground font-medium">
                <div>
                  Showing {totalEntries > 0 ? startIndex + 1 : 0} to {endIndex} of {totalEntries} entries
                </div>
                <div className="flex items-center gap-1.5">
                  <span>Show</span>
                  <Select value={pageSize} onValueChange={handlePageSizeChange}>
                    <SelectTrigger className="h-7 w-16 px-1.5 text-xs bg-background border-border rounded-lg font-bold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                  <span>entries</span>
                </div>
              </div>
              
              <div className="w-full overflow-x-auto">
                <Table className="min-w-[900px] border-collapse">
                  <TableHeader className="bg-muted/50 border-b border-border/60">
                    <TableRow className="border-border/60">
                      <TableHead className="text-[11px] font-bold uppercase tracking-wider py-3.5 px-5 text-muted-foreground">Candidate</TableHead>
                      <TableHead className="text-[11px] font-bold uppercase tracking-wider py-3.5 px-4 text-muted-foreground">Contact Email</TableHead>
                      <TableHead className="text-[11px] font-bold uppercase tracking-wider py-3.5 px-4 text-muted-foreground">Role Applied</TableHead>
                      <TableHead className="text-[11px] font-bold uppercase tracking-wider py-3.5 px-4 text-muted-foreground">Department</TableHead>
                      <TableHead className="text-[11px] font-bold uppercase tracking-wider py-3.5 px-4 text-muted-foreground text-center">Stage</TableHead>
                      <TableHead className="text-[11px] font-bold uppercase tracking-wider py-3.5 px-5 text-muted-foreground">Applied Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-border/60">
                    {isApplicationsLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-32 text-center text-xs text-muted-foreground bg-background">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                            <span>Loading application records...</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : paginatedData.length > 0 ? (
                      paginatedData.map((c: any) => {
                        const name = c.candidate_name || c.candidateName || 'Candidate';
                        const email = c.candidate_email || c.candidateEmail || 'No Email';
                        const role = c.position_title || c.positionTitle || 'Position';
                        const dept = c.department_name || c.departmentName || 'General';
                        const stage = c.application_status || c.applicationStatus || 'applied';
                        const appliedAt = c.applied_at || c.appliedAt;
                        const dateStr = appliedAt ? format(new Date(appliedAt), 'MMM dd, yyyy') : 'N/A';
                        const initials = name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();

                        return (
                          <TableRow key={c.id} className="border-border/60 hover:bg-muted/40 transition-colors">
                            <TableCell className="py-3.5 px-5">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px] shrink-0 border border-primary/20">
                                  {initials}
                                </div>
                                <span className="font-bold text-xs text-foreground">{name}</span>
                              </div>
                            </TableCell>
                            <TableCell className="py-3.5 px-4 text-xs font-mono text-muted-foreground">{email}</TableCell>
                            <TableCell className="py-3.5 px-4 text-xs font-semibold text-foreground">{role}</TableCell>
                            <TableCell className="py-3.5 px-4 text-xs text-muted-foreground">{dept}</TableCell>
                            <TableCell className="py-3.5 px-4 text-center">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                stage === 'hired' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' :
                                stage === 'rejected' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30' :
                                stage === 'offer' ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/30' :
                                'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30'
                              }`}>
                                {stage}
                              </span>
                            </TableCell>
                            <TableCell className="py-3.5 px-5 text-xs text-muted-foreground font-mono">{dateStr}</TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="h-32 text-center text-xs text-muted-foreground bg-background">
                          No candidate application records matching the filters.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {totalEntries > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-border/60 text-xs text-muted-foreground gap-3">
                  <div className="font-medium">
                    Page <span className="font-bold text-foreground">{currentPage}</span> of <span className="font-bold text-foreground">{totalPages}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="h-8 px-3.5 text-xs font-bold rounded-xl border-border hover:bg-muted text-foreground" disabled={currentPage === 1} onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}>Previous</Button>
                    <Button variant="outline" size="sm" className="h-8 px-3.5 text-xs font-bold rounded-xl border-border hover:bg-muted text-foreground" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}>Next</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
