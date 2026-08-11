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
    <div className="p-4 md:p-6 space-y-6 bg-background min-h-full">
      {/* Top View Toggle */}
      <div className="flex items-center justify-between border-b pb-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Recruitment & Candidate Funnel Analytics</h1>
          <p className="text-xs text-slate-500">Track end-to-end conversion from resume sourcing bank down to hiring</p>
        </div>

        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
          <Button
            size="sm"
            variant={activeTab === 'applications' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('applications')}
            className={`text-xs h-7 px-3 ${activeTab === 'applications' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600'}`}
          >
            <Users className="w-3.5 h-3.5 mr-1.5" />
            Application Funnel
          </Button>
          <Button
            size="sm"
            variant={activeTab === 'sourcing' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('sourcing')}
            className={`text-xs h-7 px-3 ${activeTab === 'sourcing' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600'}`}
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
            <Card className="rounded-none shadow-sm border-l-4 border-l-purple-500 bg-white">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Resumes Sourced</p>
                  <p className="text-2xl font-bold text-slate-800 mt-1">{sourcingSummary.totalSourced}</p>
                  <p className="text-[11px] text-purple-600 font-medium mt-0.5">Top of Funnel (Resume Bank)</p>
                </div>
                <div className="p-3 bg-purple-50 text-purple-600 rounded-full">
                  <Layers className="w-6 h-6" />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-none shadow-sm border-l-4 border-l-blue-500 bg-white">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Shortlisted to Pipeline</p>
                  <p className="text-2xl font-bold text-slate-800 mt-1">{sourcingSummary.totalShortlisted}</p>
                  <p className="text-[11px] text-blue-600 font-medium mt-0.5">{sourcingSummary.overallShortlistRatePct}% Shortlist Conversion</p>
                </div>
                <div className="p-3 bg-blue-50 text-blue-600 rounded-full">
                  <Target className="w-6 h-6" />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-none shadow-sm border-l-4 border-l-emerald-500 bg-white">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Candidates Hired</p>
                  <p className="text-2xl font-bold text-slate-800 mt-1">{sourcingSummary.totalHired}</p>
                  <p className="text-[11px] text-emerald-600 font-medium mt-0.5">{sourcingSummary.overallHireRatePct}% Funnel Hire Rate</p>
                </div>
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-full">
                  <UserCheck className="w-6 h-6" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sourcing Channels Breakdown */}
          <Card className="rounded-none shadow-sm border-border bg-white">
            <CardHeader className="flex flex-row items-center justify-between py-3 px-4 border-b">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                Sourcing Channel Conversion Performance
              </CardTitle>
              <Button variant="outline" size="sm" onClick={handleExportSourcingFunnel} className="h-7 px-3 text-xs rounded-sm shadow-none">
                <Download className="w-3 h-3 mr-1.5" />
                Export Sourcing CSV
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table className="min-w-[800px]">
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="text-xs font-semibold text-slate-700">Source Channel</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-700 text-center">Total Resumes Sourced</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-700 text-center">Shortlisted to Pipeline</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-700 text-center">Candidates Hired</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-700 text-center">Shortlist Rate %</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-700 text-center">Hire Rate %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {funnelLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center text-xs text-slate-500">
                          Loading sourcing funnel metrics...
                        </TableCell>
                      </TableRow>
                    ) : (funnelData?.sourcingFunnel?.bySource || []).length > 0 ? (
                      funnelData.sourcingFunnel.bySource.map((channel: any, idx: number) => (
                        <TableRow key={idx} className="hover:bg-slate-50/60">
                          <TableCell className="text-xs font-semibold text-slate-800">{channel.sourceChannel}</TableCell>
                          <TableCell className="text-xs text-center font-medium text-slate-700">{channel.totalSourced}</TableCell>
                          <TableCell className="text-xs text-center font-medium text-blue-600">{channel.totalShortlisted}</TableCell>
                          <TableCell className="text-xs text-center font-medium text-emerald-600">{channel.totalHired}</TableCell>
                          <TableCell className="text-xs text-center">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              {channel.shortlistRatePct}%
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-center">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {channel.hireRatePct}%
                            </span>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center text-xs text-slate-500">
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
          <Card className="rounded-none shadow-sm border-border bg-white">
            <CardHeader className="py-3 px-4 border-b">
              <CardTitle className="text-sm font-semibold text-foreground">
                Job Openings vs. Sourcing Bank Allocation
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table className="min-w-[800px]">
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="text-xs font-semibold text-slate-700">Job Title / Pool</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-700 text-center">Open Positions</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-700 text-center">Resumes Sourced</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-700 text-center">Shortlisted</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-700 text-center">Conversion %</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-700 text-center">Job Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(funnelData?.sourcingFunnel?.byJob || []).length > 0 ? (
                      funnelData.sourcingFunnel.byJob.map((jobRow: any, idx: number) => (
                        <TableRow key={idx} className="hover:bg-slate-50/60">
                          <TableCell className="text-xs font-medium text-slate-800">{jobRow.positionTitle}</TableCell>
                          <TableCell className="text-xs text-center font-bold text-slate-700">{jobRow.noOfPositions ?? '-'}</TableCell>
                          <TableCell className="text-xs text-center font-medium text-slate-700">{jobRow.totalSourced}</TableCell>
                          <TableCell className="text-xs text-center font-medium text-blue-600">{jobRow.totalShortlisted}</TableCell>
                          <TableCell className="text-xs text-center font-semibold text-slate-700">{jobRow.shortlistRatePct}%</TableCell>
                          <TableCell className="text-xs text-center">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              jobRow.jobStatus === 'published' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                              jobRow.jobStatus === 'closed' ? 'bg-slate-100 text-slate-600 border border-slate-200' :
                              'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}>
                              {jobRow.jobStatus}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="h-20 text-center text-xs text-slate-500">
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
          <Card className="rounded-none shadow-sm bg-white">
            <CardHeader className="py-3 border-b">
              <CardTitle className="text-sm font-normal text-foreground">Candidate Application Filter</CardTitle>
            </CardHeader>
            <CardContent className="p-4 md:p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-x-6 gap-y-4">
                
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Company</label>
                  <Select value={filters.companyId} onValueChange={(val) => handleFilterChange('companyId', val)}>
                    <SelectTrigger className="h-8 text-xs bg-background border-border rounded-sm">
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
                  <label className="text-xs font-semibold text-foreground">Location</label>
                  <Select value={filters.locationId} onValueChange={(val) => handleFilterChange('locationId', val)}>
                    <SelectTrigger className="h-8 text-xs bg-background border-border rounded-sm">
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
                  <label className="text-xs font-semibold text-foreground">Department</label>
                  <Select value={filters.departmentId} onValueChange={(val) => handleFilterChange('departmentId', val)}>
                    <SelectTrigger className="h-8 text-xs bg-background border-border rounded-sm">
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
                  <label className="text-xs font-semibold text-foreground">Grade</label>
                  <Select value={filters.gradeId} onValueChange={(val) => handleFilterChange('gradeId', val)}>
                    <SelectTrigger className="h-8 text-xs bg-background border-border rounded-sm">
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
                  <label className="text-xs font-semibold text-foreground">Employment Type</label>
                  <Select value={filters.typeId} onValueChange={(val) => handleFilterChange('typeId', val)}>
                    <SelectTrigger className="h-8 text-xs bg-background border-border rounded-sm">
                      <SelectValue placeholder={`Employment Type (${employeeTypes?.length || 0})`} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Employment Type ({employeeTypes?.length || 0})</SelectItem>
                      {employeeTypes?.map((item: any) => (
                        <SelectItem key={item.id} value={item.id.toString()}>{item.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Designation</label>
                  <Select value={filters.designationId} onValueChange={(val) => handleFilterChange('designationId', val)}>
                    <SelectTrigger className="h-8 text-xs bg-background border-border rounded-sm">
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
                  <label className="text-xs font-semibold text-foreground">Interview Stage</label>
                  <Select value={filters.stage} onValueChange={(val) => handleFilterChange('stage', val)}>
                    <SelectTrigger className="h-8 text-xs bg-card text-card-foreground border-input rounded-sm">
                      <SelectValue placeholder="Choose" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Choose</SelectItem>
                      {INTERVIEW_STAGES.map((stage) => (
                        <SelectItem key={stage} value={stage}>{stage}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-end pt-1">
                  <Button onClick={handleSubmit} className="h-8 px-5 bg-primary text-primary-foreground hover:bg-primary/90 text-xs rounded-sm">
                    Submit
                  </Button>
                </div>

              </div>
            </CardContent>
          </Card>

          {/* Results Section */}
          <Card className="rounded-none shadow-sm border-border bg-white">
            <CardHeader className="flex flex-row items-center justify-between py-3 px-4 border-b">
              <CardTitle className="text-sm font-normal text-foreground">Result</CardTitle>
              <Button variant="outline" size="sm" onClick={handleExportApplications} className="h-7 px-3 text-xs rounded-sm shadow-none">
                <Download className="w-3 h-3 mr-1.5" />
                Export
              </Button>
            </CardHeader>
            
            <CardContent className="p-0">
              <div className="p-3 bg-card text-card-foreground border-b border-border flex justify-between items-center text-xs text-foreground/90">
                <div>
                  Showing {totalEntries > 0 ? startIndex + 1 : 0} to {endIndex} of {totalEntries} entries
                </div>
                <div className="flex items-center gap-1.5">
                  Show 
                  <Select value={pageSize} onValueChange={handlePageSizeChange}>
                    <SelectTrigger className="h-6 w-16 px-1.5 text-xs bg-card text-card-foreground border-input rounded-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                  entries
                </div>
              </div>
              
              <div className="border border-border rounded-sm bg-white overflow-x-auto shadow-sm">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                      <TableHead className="h-10 text-xs font-semibold text-slate-600">Name</TableHead>
                      <TableHead className="h-10 text-xs font-semibold text-slate-600">Email</TableHead>
                      <TableHead className="h-10 text-xs font-semibold text-slate-600">Role</TableHead>
                      <TableHead className="h-10 text-xs font-semibold text-slate-600">Department</TableHead>
                      <TableHead className="h-10 text-xs font-semibold text-slate-600">Stage</TableHead>
                      <TableHead className="h-10 text-xs font-semibold text-slate-600">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isApplicationsLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                          Loading candidates...
                        </TableCell>
                      </TableRow>
                    ) : paginatedData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                          No candidates found matching the filters
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedData.map((candidate: any) => (
                        <TableRow key={candidate.id} className="hover:bg-slate-50/50">
                          <TableCell className="py-2.5 text-xs font-medium text-slate-700">
                            {candidate.candidate_name || candidate.candidateName}
                          </TableCell>
                          <TableCell className="py-2.5 text-xs text-slate-600">
                            {candidate.candidate_email || candidate.candidateEmail}
                          </TableCell>
                          <TableCell className="py-2.5 text-xs text-slate-600">
                            {candidate.position_title || candidate.positionTitle}
                          </TableCell>
                          <TableCell className="py-2.5 text-xs text-slate-600">
                            {candidate.department_name || candidate.departmentName || 'N/A'}
                          </TableCell>
                          <TableCell className="py-2.5">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                              (candidate.application_status || candidate.applicationStatus) === 'offer' || (candidate.application_status || candidate.applicationStatus) === 'hired' ? 'bg-green-50 text-green-700' :
                              (candidate.application_status || candidate.applicationStatus) === 'rejected' || (candidate.application_status || candidate.applicationStatus) === 'withdrawn' ? 'bg-red-50 text-red-700' :
                              'bg-blue-50 text-blue-700'
                            }`}>
                              {(() => {
                                const status = candidate.application_status || candidate.applicationStatus || '';
                                return status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown';
                              })()}
                            </span>
                          </TableCell>
                          <TableCell className="py-2.5 text-xs text-slate-600">
                            {(() => {
                              const appliedAt = candidate.applied_at || candidate.appliedAt;
                              return appliedAt ? format(new Date(appliedAt), 'MMM dd, yyyy') : 'N/A';
                            })()}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>

                {/* Pagination Controls */}
                {totalEntries > 0 && (
                  <div className="bg-background border-t border-border p-3 flex justify-between items-center text-xs">
                    <div className="text-muted-foreground">
                      Page {currentPage} of {totalPages}
                    </div>
                    <div className="flex gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-3 text-xs bg-card text-card-foreground"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-3 text-xs bg-card text-card-foreground"
                        disabled={currentPage >= totalPages}
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

