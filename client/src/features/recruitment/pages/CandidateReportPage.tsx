import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, ChevronDown } from 'lucide-react';
import { useCompanies, useLocations, useDepartments, useGrades, useEmployeeTypes, useDesignations } from '@/features/settings/hooks';

// Mock Candidate Data
const MOCK_CANDIDATES = [
  { id: 1, name: 'John Doe', email: 'john@example.com', role: 'Software Engineer', department: 'Engineering', stage: 'Interview', date: '2023-10-01', companyId: 1, locationId: 1, gradeId: 1, typeId: 1, designationId: 1 },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'Product Manager', department: 'Product', stage: 'Offered', date: '2023-10-05', companyId: 1, locationId: 1, gradeId: 2, typeId: 1, designationId: 2 },
  { id: 3, name: 'Mike Johnson', email: 'mike@example.com', role: 'UX Designer', department: 'Design', stage: 'Applied', date: '2023-10-10', companyId: 1, locationId: 2, gradeId: 1, typeId: 2, designationId: 3 },
  { id: 4, name: 'Sarah Williams', email: 'sarah@example.com', role: 'Data Analyst', department: 'Data', stage: 'Screening', date: '2023-10-12', companyId: 2, locationId: 1, gradeId: 3, typeId: 1, designationId: 4 },
  { id: 5, name: 'Robert Brown', email: 'robert@example.com', role: 'Marketing Specialist', department: 'Marketing', stage: 'Rejected', date: '2023-10-15', companyId: 1, locationId: 3, gradeId: 1, typeId: 3, designationId: 5 }
];

const INTERVIEW_STAGES = ['Applied', 'Screening', 'Interview', 'Offered', 'Hired', 'Rejected'];

export const CandidateReportPage: React.FC = () => {
  // Master data hooks
  const { data: companies } = useCompanies();
  const { data: locations } = useLocations();
  const { data: departments } = useDepartments();
  const { data: grades } = useGrades();
  const { data: employeeTypes } = useEmployeeTypes();
  const { data: designations } = useDesignations();

  // Filter state
  const [filters, setFilters] = useState({
    companyId: 'all',
    locationId: 'all',
    departmentId: 'all',
    gradeId: 'all',
    typeId: 'all',
    designationId: 'all',
    stage: 'all'
  });

  const [filteredData, setFilteredData] = useState(MOCK_CANDIDATES);
  const [pageSize, setPageSize] = useState('10');
  const [currentPage, setCurrentPage] = useState(1);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handlePageSizeChange = (val: string) => {
    setPageSize(val);
    setCurrentPage(1);
  };

  const handleSubmit = () => {
    const results = MOCK_CANDIDATES.filter(candidate => {
      return (
        (filters.companyId === 'all' || candidate.companyId.toString() === filters.companyId) &&
        (filters.locationId === 'all' || candidate.locationId.toString() === filters.locationId) &&
        (filters.departmentId === 'all' || departments?.items?.find((d: any) => d.id.toString() === filters.departmentId)?.name === candidate.department) &&
        (filters.gradeId === 'all' || candidate.gradeId.toString() === filters.gradeId) &&
        (filters.typeId === 'all' || candidate.typeId.toString() === filters.typeId) &&
        (filters.designationId === 'all' || candidate.designationId.toString() === filters.designationId) &&
        (filters.stage === 'all' || candidate.stage === filters.stage)
      );
    });
    setFilteredData(results);
    setCurrentPage(1);
  };

  const handleExport = () => {
    const headers = ['Name', 'Email', 'Role', 'Department', 'Stage', 'Date'];
    const csvContent = [
      headers.join(','),
      ...filteredData.map(c => `${c.name},${c.email},${c.role},${c.department},${c.stage},${c.date}`)
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'candidate_report.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Pagination calculations
  const totalEntries = filteredData.length;
  const pageSizeNumber = parseInt(pageSize, 10);
  const totalPages = Math.max(1, Math.ceil(totalEntries / pageSizeNumber));
  
  const startIndex = (currentPage - 1) * pageSizeNumber;
  const endIndex = Math.min(startIndex + pageSizeNumber, totalEntries);
  
  const paginatedData = filteredData.slice(startIndex, endIndex);

  return (
    <div className="p-4 md:p-6 space-y-6 bg-background min-h-full">
      {/* Filters Section */}
      <Card className="rounded-none shadow-sm">
        <CardHeader className="py-3 border-b">
          <CardTitle className="text-sm font-normal text-foreground">Candidate Report</CardTitle>
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
                  <SelectValue placeholder={`Employment Type (${employeeTypes?.items?.length || 0})`} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Employment Type ({employeeTypes?.items?.length || 0})</SelectItem>
                  {employeeTypes?.items?.map((item: any) => (
                    <SelectItem key={item.id} value={item.id.toString()}>{item.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Designation</label>
              <Select value={filters.designationId} onValueChange={(val) => handleFilterChange('designationId', val)}>
                <SelectTrigger className="h-8 text-xs bg-background border-border rounded-sm">
                  <SelectValue placeholder={`Designation (${designations?.items?.length || 0})`} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Designation ({designations?.items?.length || 0})</SelectItem>
                  {designations?.items?.map((item: any) => (
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
      <Card className="rounded-none shadow-sm border-border">
        <CardHeader className="flex flex-row items-center justify-between py-3 px-4 border-b">
          <CardTitle className="text-sm font-normal text-foreground">Result</CardTitle>
          <Button variant="outline" size="sm" onClick={handleExport} className="h-7 px-3 text-xs rounded-sm shadow-none">
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
                  <SelectItem value="200">200</SelectItem>
                  <SelectItem value="300">300</SelectItem>
                </SelectContent>
              </Select>
              entries
            </div>
          </div>
          
          <div className="bg-background">
            <Table className="min-w-[1000px]">
              <TableHeader className="bg-card">
                <TableRow className="border-border">
                  <TableHead className="text-xs font-semibold h-9 text-foreground">Candidate Name</TableHead>
                  <TableHead className="text-xs font-semibold h-9 text-foreground">Email</TableHead>
                  <TableHead className="text-xs font-semibold h-9 text-foreground">Role</TableHead>
                  <TableHead className="text-xs font-semibold h-9 text-foreground">Department</TableHead>
                  <TableHead className="text-xs font-semibold h-9 text-foreground">Stage</TableHead>
                  <TableHead className="text-xs font-semibold h-9 text-foreground text-right">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.length > 0 ? (
                  paginatedData.map((candidate) => (
                    <TableRow key={candidate.id} className="border-border bg-card text-card-foreground hover:bg-background">
                      <TableCell className="text-xs py-2">{candidate.name}</TableCell>
                      <TableCell className="text-xs py-2 text-muted-foreground">{candidate.email}</TableCell>
                      <TableCell className="text-xs py-2">{candidate.role}</TableCell>
                      <TableCell className="text-xs py-2">{candidate.department}</TableCell>
                      <TableCell className="text-xs py-2">
                        <span className={`px-2 py-0.5 rounded-full ${candidate.stage === 'Offered' ? 'bg-green-100 text-green-700' : candidate.stage === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                          {candidate.stage}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs py-2 text-right">{candidate.date}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-xs text-muted-foreground bg-background border-b-0">
                      No data available in table
                    </TableCell>
                  </TableRow>
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
  );
};
