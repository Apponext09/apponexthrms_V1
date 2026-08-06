import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Download, Search, Upload, Plus } from 'lucide-react';

const INITIAL_MOCK_RESUMES = [
  { id: 1, trackerId: 'TRK-001', name: 'Alice Walker', dob: '1995-05-12', gender: 'Female', contact: '9876543210', email: 'alice@example.com', qualification: 'B.Tech', company: 'TechCorp', experience: '3 Years', source: 'LinkedIn', position: 'Software Engineer', status: 'Screening' },
  { id: 2, trackerId: 'TRK-002', name: 'Bob Singer', dob: '1992-08-24', gender: 'Male', contact: '8765432109', email: 'bob@example.com', qualification: 'MBA', company: 'Innovate Ltd', experience: '5 Years', source: 'Referral', position: 'Product Manager', status: 'Interview' },
  { id: 3, trackerId: 'TRK-003', name: 'Charlie Davis', dob: '1998-11-03', gender: 'Male', contact: '7654321098', email: 'charlie@example.com', qualification: 'M.Sc', company: 'DataSystems', experience: '1 Year', source: 'Job Portal', position: 'Data Scientist', status: 'Applied' },
];

const INITIAL_MOCK_LOGS = [
  { id: 1, date: '2023-10-25 10:00 AM', uploadedBy: 'Admin User', fileName: 'candidates_batch1.xlsx', total: 50, success: 48, failed: 2, status: 'Completed' },
];

const INITIAL_FILTERS = {
  trackerId: '',
  search: '',
  source: 'all',
  position: 'all',
  status: 'all'
};

export const ResumeBankPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('source');
  
  const [resumesData, setResumesData] = useState(INITIAL_MOCK_RESUMES);
  const [logsData, setLogsData] = useState(INITIAL_MOCK_LOGS);
  
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [filteredData, setFilteredData] = useState(INITIAL_MOCK_RESUMES);
  
  // Pagination State for Tab 1
  const [pageSize, setPageSize] = useState('10');
  const [currentPage, setCurrentPage] = useState(1);

  // Pagination State for Tab 3 (Logs)
  const [logPageSize, setLogPageSize] = useState('10');
  const [logCurrentPage, setLogCurrentPage] = useState(1);

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '', dob: '', gender: 'Male', email: '', contactType: 'Mobile', contact: '',
    address1: '', address2: '', country: '', zipcode: '', state: '', city: '',
    maritalStatus: '', company: '', qualification: '', university: '',
    relevantExp: '', totalExp: '', skills: ''
  });
  const [formError, setFormError] = useState('');

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyFilters = (data = resumesData) => {
    const results = data.filter(resume => {
      const lowerSearch = filters.search.toLowerCase();
      const matchesSearch = lowerSearch === '' || 
        resume.name.toLowerCase().includes(lowerSearch) || 
        resume.email.toLowerCase().includes(lowerSearch) || 
        resume.contact.includes(lowerSearch);

      return (
        (filters.trackerId === '' || resume.trackerId.toLowerCase().includes(filters.trackerId.toLowerCase())) &&
        matchesSearch &&
        (filters.source === 'all' || resume.source === filters.source) &&
        (filters.position === 'all' || resume.position === filters.position) &&
        (filters.status === 'all' || resume.status === filters.status)
      );
    });
    setFilteredData(results);
    setCurrentPage(1);
  };

  const handleSearch = () => {
    applyFilters(resumesData);
  };

  const handleReset = () => {
    setFilters(INITIAL_FILTERS);
    setFilteredData(resumesData);
    setCurrentPage(1);
  };

  const handleSaveCandidate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.gender.trim()) {
      setFormError('Name and Gender are required.');
      return;
    }
    setFormError('');
    const newId = resumesData.length > 0 ? Math.max(...resumesData.map(r => r.id)) + 1 : 1;
    const newCandidate = {
      id: newId,
      trackerId: `TRK-${newId.toString().padStart(3, '0')}`,
      name: formData.name,
      dob: formData.dob || '-',
      gender: formData.gender,
      contact: formData.contact || '-',
      email: formData.email || '-',
      qualification: formData.qualification || '-',
      company: formData.company || '-',
      experience: formData.totalExp || '-',
      source: 'Candidate', 
      position: 'None', 
      status: 'Applied'
    };
    
    const updatedData = [newCandidate, ...resumesData];
    setResumesData(updatedData);
    applyFilters(updatedData);
    
    // Reset Form
    setFormData({
      name: '', dob: '', gender: 'Male', email: '', contactType: 'Mobile', contact: '',
      address1: '', address2: '', country: '', zipcode: '', state: '', city: '',
      maritalStatus: '', company: '', qualification: '', university: '',
      relevantExp: '', totalExp: '', skills: ''
    });
    setIsAddModalOpen(false);
  };

  const handleBulkUpload = () => {
    // Simulate successful bulk upload
    const batchId = resumesData.length + 100;
    const newBatch = [
      { id: batchId, trackerId: `TRK-${batchId}`, name: 'Bulk User 1', dob: '1990-01-01', gender: 'Female', contact: '1111111111', email: 'bulk1@example.com', qualification: 'B.Sc', company: 'Acme Corp', experience: '2 Years', source: 'Job Portal', position: 'ACCOUNTANT', status: 'Open' },
      { id: batchId+1, trackerId: `TRK-${batchId+1}`, name: 'Bulk User 2', dob: '1985-12-12', gender: 'Male', contact: '2222222222', email: 'bulk2@example.com', qualification: 'Ph.D', company: 'GlobalTech', experience: '10 Years', source: 'LinkedIn', position: 'DIRECTOR', status: 'Applied' }
    ];
    
    // Add Candidates
    const updatedData = [...newBatch, ...resumesData];
    setResumesData(updatedData);
    applyFilters(updatedData);
    
    // Add Log Entry
    const newLog = {
      id: logsData.length + 1,
      date: new Date().toLocaleString(),
      uploadedBy: 'Current User',
      fileName: 'new_candidates.xlsx',
      total: 2,
      success: 2,
      failed: 0,
      status: 'Completed'
    };
    setLogsData([newLog, ...logsData]);
    
    // Redirect to logs tab to view the success log
    setActiveTab('logs'); 
  };

  const handleExportResumes = () => {
    const headers = ['Name', 'Date of Birth', 'Gender', 'Email ID', 'Contact Number', 'Qualification', 'Current Company', 'Total Experience'];
    const csvContent = [
      headers.join(','),
      ...filteredData.map(c => `"${c.name}","${c.dob}","${c.gender}","${c.email}","${c.contact}","${c.qualification}","${c.company}","${c.experience}"`)
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'resume_bank.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleExportLogs = () => {
    const headers = ['Upload Date', 'Uploaded By', 'File Name', 'Total Records', 'Success', 'Failed', 'Status'];
    const csvContent = [
      headers.join(','),
      ...logsData.map(c => `"${c.date}","${c.uploadedBy}","${c.fileName}","${c.total}","${c.success}","${c.failed}","${c.status}"`)
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bulk_upload_logs.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleDownloadSample = () => {
    const headers = ['Name', 'Gender', 'Email Id', 'Date of Birth', 'Contact Number', 'Address Line 1', 'Address Line 2', 'Country', 'Zipcode', 'State', 'City', 'Marital Status', 'Current Company', 'Qualification', 'University', 'Relevant Experience', 'Total Experience', 'Skills'];
    const csvContent = headers.join(',');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'candidate_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleDownloadDetails = () => {
    const headers = ['Name', 'Date of Birth', 'Gender', 'Email ID', 'Contact Number', 'Qualification', 'Current Company', 'Total Experience'];
    const csvContent = [
      headers.join(','),
      ...resumesData.map(c => `"${c.name}","${c.dob}","${c.gender}","${c.email}","${c.contact}","${c.qualification}","${c.company}","${c.experience}"`)
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'all_candidates_export.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Pagination for Tab 1
  const totalEntries = filteredData.length;
  const pageSizeNumber = parseInt(pageSize, 10);
  const totalPages = Math.max(1, Math.ceil(totalEntries / pageSizeNumber));
  const startIndex = (currentPage - 1) * pageSizeNumber;
  const endIndex = Math.min(startIndex + pageSizeNumber, totalEntries);
  const paginatedData = filteredData.slice(startIndex, endIndex);

  // Pagination for Tab 3
  const totalLogEntries = logsData.length;
  const logPageSizeNumber = parseInt(logPageSize, 10);
  const logTotalPages = Math.max(1, Math.ceil(totalLogEntries / logPageSizeNumber));
  const logStartIndex = (logCurrentPage - 1) * logPageSizeNumber;
  const logEndIndex = Math.min(logStartIndex + logPageSizeNumber, totalLogEntries);
  const paginatedLogs = logsData.slice(logStartIndex, logEndIndex);

  return (
    <div className="p-4 md:p-6 space-y-6 bg-background min-h-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="source">Resume Source Screen</TabsTrigger>
          <TabsTrigger value="upload">Bulk Upload</TabsTrigger>
          <TabsTrigger value="logs">Bulk Uploaded Log</TabsTrigger>
        </TabsList>

        {/* TAB 1: RESUME SOURCE SCREEN */}
        <TabsContent value="source" className="space-y-6">
          <Card className="rounded-none shadow-sm border-border">
            <CardHeader className="py-3 border-b border-border">
              <CardTitle className="text-sm font-normal text-foreground">Resume Bank</CardTitle>
            </CardHeader>
            <CardContent className="p-4 md:p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-x-6 gap-y-4">
                
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Candidate Tracker ID</label>
                  <Input 
                    placeholder="Search By Tracker ID..."
                    value={filters.trackerId} 
                    onChange={(e) => handleFilterChange('trackerId', e.target.value)} 
                    className="h-8 text-xs bg-background border-input rounded-sm"
                  />
                </div>

                <div className="space-y-1.5 lg:col-span-2">
                  <label className="text-xs font-semibold text-foreground">Search</label>
                  <Input 
                    placeholder="Search By Name or Contact Number or Email ID..."
                    value={filters.search} 
                    onChange={(e) => handleFilterChange('search', e.target.value)} 
                    className="h-8 text-xs bg-background border-input rounded-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Application From</label>
                  <Select value={filters.source} onValueChange={(val) => handleFilterChange('source', val)}>
                    <SelectTrigger className="h-8 text-xs bg-background border-input rounded-sm">
                      <SelectValue placeholder="Select Source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Select Source</SelectItem>
                      <SelectItem value="Consultant">Consultant</SelectItem>
                      <SelectItem value="Refer By Employee">Refer By Employee</SelectItem>
                      <SelectItem value="MRS Admin User">MRS Admin User</SelectItem>
                      <SelectItem value="Guest User">Guest User</SelectItem>
                      <SelectItem value="Candidate">Candidate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Position Title</label>
                  <Select value={filters.position} onValueChange={(val) => handleFilterChange('position', val)}>
                    <SelectTrigger className="h-8 text-xs bg-background border-input rounded-sm">
                      <SelectValue placeholder="Choose" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Choose</SelectItem>
                      <SelectItem value="ACCOUNTANT">ACCOUNTANT</SelectItem>
                      <SelectItem value="BACK OFFICE EXECUTIVE">BACK OFFICE EXECUTIVE</SelectItem>
                      <SelectItem value="DIRECTOR">DIRECTOR</SelectItem>
                      <SelectItem value="HR EXECUTIVE">HR EXECUTIVE</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Candidate Status</label>
                  <Select value={filters.status} onValueChange={(val) => handleFilterChange('status', val)}>
                    <SelectTrigger className="h-8 text-xs bg-background border-input rounded-sm">
                      <SelectValue placeholder="Choose" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Choose</SelectItem>
                      <SelectItem value="On Hold">On Hold</SelectItem>
                      <SelectItem value="Open">Open</SelectItem>
                      <SelectItem value="Rejected">Rejected</SelectItem>
                      <SelectItem value="Selected">Selected</SelectItem>
                      <SelectItem value="Selected-Approved By CEO">Selected-Approved By CEO</SelectItem>
                      <SelectItem value="Shortlisted">Shortlisted</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-end gap-2 pt-1 lg:col-span-4 mt-2">
                  <Button onClick={handleSearch} className="h-8 px-4 bg-primary text-primary-foreground hover:bg-primary/90 text-xs rounded-sm">
                    Search
                  </Button>
                  <Button onClick={handleReset} variant="outline" className="h-8 px-4 text-xs rounded-sm bg-destructive hover:bg-destructive/90 text-destructive-foreground border-none">
                    Reset Filter
                  </Button>
                  <Button variant="secondary" onClick={() => setIsAddModalOpen(true)} className="h-8 px-4 text-xs rounded-sm">
                    <Plus className="w-3 h-3 mr-1" />
                    Add Candidate
                  </Button>
                </div>

              </div>
            </CardContent>
          </Card>

          <Card className="rounded-none shadow-sm border-border">
            <CardHeader className="flex flex-row items-center justify-between py-3 px-4 border-b">
              <CardTitle className="text-sm font-normal text-foreground">Result</CardTitle>
              <Button variant="outline" size="sm" onClick={handleExportResumes} className="h-7 px-3 text-xs rounded-sm shadow-none">
                <Download className="w-3 h-3 mr-1.5" />
                Export
              </Button>
            </CardHeader>
            
            <CardContent className="p-0">
              <div className="p-3 bg-card border-b border-border flex justify-between items-center text-xs text-foreground/90">
                <div>
                  Showing {totalEntries > 0 ? startIndex + 1 : 0} to {endIndex} of {totalEntries} entries
                </div>
                <div className="flex items-center gap-1.5">
                  Show 
                  <Select value={pageSize} onValueChange={(val) => { setPageSize(val); setCurrentPage(1); }}>
                    <SelectTrigger className="h-6 w-16 px-1.5 text-xs bg-background border-input rounded-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                  entries
                </div>
              </div>
              
              <div className="bg-background">
                <Table className="min-w-[1000px]">
                  <TableHeader className="bg-muted">
                    <TableRow className="border-border">
                      <TableHead className="text-xs font-semibold h-9 text-foreground whitespace-nowrap">Name</TableHead>
                      <TableHead className="text-xs font-semibold h-9 text-foreground whitespace-nowrap">Date of Birth</TableHead>
                      <TableHead className="text-xs font-semibold h-9 text-foreground whitespace-nowrap">Gender</TableHead>
                      <TableHead className="text-xs font-semibold h-9 text-foreground whitespace-nowrap">Email Id</TableHead>
                      <TableHead className="text-xs font-semibold h-9 text-foreground whitespace-nowrap">Contact Number</TableHead>
                      <TableHead className="text-xs font-semibold h-9 text-foreground whitespace-nowrap">Qualification</TableHead>
                      <TableHead className="text-xs font-semibold h-9 text-foreground whitespace-nowrap">Current Company</TableHead>
                      <TableHead className="text-xs font-semibold h-9 text-foreground whitespace-nowrap">Total Experience</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedData.length > 0 ? (
                      paginatedData.map((candidate) => (
                        <TableRow key={candidate.id} className="border-border bg-card text-card-foreground hover:bg-muted/50">
                          <TableCell className="text-xs py-2 whitespace-nowrap font-medium">{candidate.name}</TableCell>
                          <TableCell className="text-xs py-2 whitespace-nowrap text-muted-foreground">{candidate.dob}</TableCell>
                          <TableCell className="text-xs py-2 whitespace-nowrap">{candidate.gender}</TableCell>
                          <TableCell className="text-xs py-2 whitespace-nowrap text-muted-foreground">{candidate.email}</TableCell>
                          <TableCell className="text-xs py-2 whitespace-nowrap text-muted-foreground">{candidate.contact}</TableCell>
                          <TableCell className="text-xs py-2 whitespace-nowrap">{candidate.qualification}</TableCell>
                          <TableCell className="text-xs py-2 whitespace-nowrap text-muted-foreground">{candidate.company}</TableCell>
                          <TableCell className="text-xs py-2 whitespace-nowrap">{candidate.experience}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="h-24 text-center text-xs text-muted-foreground bg-background border-b-0">
                          No data available in table
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>

                {totalEntries > 0 && (
                  <div className="bg-background border-t border-border p-3 flex justify-between items-center text-xs">
                    <div className="text-muted-foreground">
                      Page {currentPage} of {totalPages}
                    </div>
                    <div className="flex gap-1.5">
                      <Button variant="outline" size="sm" className="h-7 px-3 text-xs bg-card" disabled={currentPage === 1} onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}>Previous</Button>
                      <Button variant="outline" size="sm" className="h-7 px-3 text-xs bg-card" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}>Next</Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: BULK UPLOAD */}
        <TabsContent value="upload">
          <Card className="rounded-none shadow-sm border-border">
            <CardHeader className="py-3 border-b border-border text-center">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center justify-center gap-2">
                Upload Candidate List
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 md:p-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {/* Left Form */}
                <div className="space-y-8">
                  
                  {/* Upload Excel */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-4">
                      <label className="text-xs font-semibold text-foreground w-24">
                        <span className="text-destructive">*</span> Upload Excel
                      </label>
                      <div className="flex-1">
                        <Input type="file" accept=".xlsx,.csv" className="text-xs h-9 bg-background border-input" />
                        <p className="text-[10px] text-green-600 font-medium mt-1">Max Size : 10MB</p>
                      </div>
                    </div>
                  </div>

                  {/* Upload Files */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-4">
                      <label className="text-xs font-semibold text-foreground w-24">
                        Upload Files
                      </label>
                      <div className="flex-1">
                        <Input type="file" multiple className="text-xs h-9 bg-background border-input" />
                      </div>
                    </div>
                  </div>

                  <Button onClick={handleBulkUpload} className="w-full bg-green-600 hover:bg-green-700 text-white h-9 rounded-sm flex gap-2">
                    <Upload className="w-4 h-4" /> Upload
                  </Button>
                </div>

                {/* Right Instructions */}
                <div className="space-y-6">
                  <div className="flex gap-2">
                    <Button onClick={handleDownloadSample} variant="outline" className="h-8 text-xs bg-[#337ab7] text-white hover:bg-[#286090] hover:text-white border-none rounded-sm px-4">
                      Download Sample Excel File
                    </Button>
                    <Button onClick={handleDownloadDetails} variant="outline" className="h-8 text-xs bg-green-600 text-white hover:bg-green-700 hover:text-white border-none rounded-sm px-4">
                      Download Candidates Details
                    </Button>
                  </div>

                  <div className="space-y-4 text-xs text-foreground/90 leading-relaxed">
                    <div>
                      <p className="font-semibold mb-1">Instruction for excel upload :</p>
                      <p><strong>Required Columns :-</strong> Name,Gender</p>
                      <p><strong>Unique Columns :-</strong> Email Id</p>
                      <p><strong>Date Columns</strong> must be in yyyy-mm-dd format.</p>
                    </div>
                    <div>
                      <p className="font-semibold mb-1">Instruction for file upload :</p>
                      <p><strong>To upload multiple files :</strong></p>
                      <p>Click control button to select multiple files for uploading. Or</p>
                      <p>Upload zip folder should containing files with filename as one which is put in excel sheet whose data need to be uploaded. eg. ABC_Resume.pdf,XYZ_Sign.png.</p>
                    </div>
                  </div>
                </div>

              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: BULK UPLOADED LOG */}
        <TabsContent value="logs">
          <Card className="rounded-none shadow-sm border-border">
            <CardHeader className="flex flex-row items-center justify-between py-3 px-4 border-b">
              <CardTitle className="text-sm font-normal text-foreground">Result</CardTitle>
              <Button variant="outline" size="sm" onClick={handleExportLogs} className="h-7 px-3 text-xs rounded-sm shadow-none">
                <Download className="w-3 h-3 mr-1.5" />
                Export
              </Button>
            </CardHeader>
            
            <CardContent className="p-0">
              <div className="p-3 bg-card border-b border-border flex justify-between items-center text-xs text-foreground/90">
                <div>
                  Showing {totalLogEntries > 0 ? logStartIndex + 1 : 0} to {logEndIndex} of {totalLogEntries} entries
                </div>
                <div className="flex items-center gap-1.5">
                  Show 
                  <Select value={logPageSize} onValueChange={(val) => { setLogPageSize(val); setLogCurrentPage(1); }}>
                    <SelectTrigger className="h-6 w-16 px-1.5 text-xs bg-background border-input rounded-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                  entries
                </div>
              </div>
              
              <div className="bg-background">
                <Table className="min-w-[1000px]">
                  <TableHeader className="bg-muted">
                    <TableRow className="border-border">
                      <TableHead className="text-xs font-semibold h-9 text-foreground whitespace-nowrap">Upload Date</TableHead>
                      <TableHead className="text-xs font-semibold h-9 text-foreground whitespace-nowrap">Uploaded By</TableHead>
                      <TableHead className="text-xs font-semibold h-9 text-foreground whitespace-nowrap">File Name</TableHead>
                      <TableHead className="text-xs font-semibold h-9 text-foreground whitespace-nowrap">Total Records</TableHead>
                      <TableHead className="text-xs font-semibold h-9 text-foreground whitespace-nowrap">Success Count</TableHead>
                      <TableHead className="text-xs font-semibold h-9 text-foreground whitespace-nowrap">Failed Count</TableHead>
                      <TableHead className="text-xs font-semibold h-9 text-foreground whitespace-nowrap">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedLogs.length > 0 ? (
                      paginatedLogs.map((log) => (
                        <TableRow key={log.id} className="border-border bg-card text-card-foreground hover:bg-muted/50">
                          <TableCell className="text-xs py-2 whitespace-nowrap">{log.date}</TableCell>
                          <TableCell className="text-xs py-2 whitespace-nowrap">{log.uploadedBy}</TableCell>
                          <TableCell className="text-xs py-2 whitespace-nowrap text-muted-foreground">{log.fileName}</TableCell>
                          <TableCell className="text-xs py-2 whitespace-nowrap">{log.total}</TableCell>
                          <TableCell className="text-xs py-2 whitespace-nowrap text-green-600 font-medium">{log.success}</TableCell>
                          <TableCell className="text-xs py-2 whitespace-nowrap text-red-500 font-medium">{log.failed}</TableCell>
                          <TableCell className="text-xs py-2 whitespace-nowrap">
                            <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{log.status}</span>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center text-xs text-muted-foreground bg-background border-b-0">
                          No data available in table
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>

                {totalLogEntries > 0 && (
                  <div className="bg-background border-t border-border p-3 flex justify-between items-center text-xs">
                    <div className="text-muted-foreground">
                      Page {logCurrentPage} of {logTotalPages}
                    </div>
                    <div className="flex gap-1.5">
                      <Button variant="outline" size="sm" className="h-7 px-3 text-xs bg-card" disabled={logCurrentPage === 1} onClick={() => setLogCurrentPage(prev => Math.max(prev - 1, 1))}>Previous</Button>
                      <Button variant="outline" size="sm" className="h-7 px-3 text-xs bg-card" disabled={logCurrentPage >= logTotalPages} onClick={() => setLogCurrentPage(prev => Math.min(prev + 1, logTotalPages))}>Next</Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
      </Tabs>

      {/* ADD CANDIDATE MODAL */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg">Candidate Form</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveCandidate} className="space-y-4">
            
            {formError && <div className="text-red-500 text-sm">{formError}</div>}
            
            {/* ROW 1 */}
            <div className="space-y-1">
              <label className="text-xs font-semibold">Name <span className="text-red-500">*</span></label>
              <Input 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})} 
                className="h-8 text-xs" 
                required 
              />
            </div>
            
            {/* ROW 2 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold">Date of Birth</label>
                <Input 
                  type="date"
                  value={formData.dob} 
                  onChange={e => setFormData({...formData, dob: e.target.value})} 
                  className="h-8 text-xs" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold">Gender <span className="text-red-500">*</span></label>
                <Select value={formData.gender} onValueChange={(val) => setFormData({...formData, gender: val})}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Male" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* ROW 3 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold">Email Id</label>
                <Input 
                  type="email"
                  value={formData.email} 
                  onChange={e => setFormData({...formData, email: e.target.value})} 
                  className="h-8 text-xs" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold">Contact Number</label>
                <div className="flex gap-2">
                  <Select value={formData.contactType} onValueChange={(val) => setFormData({...formData, contactType: val})}>
                    <SelectTrigger className="h-8 text-xs w-28">
                      <SelectValue placeholder="Mobile" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Mobile">Mobile</SelectItem>
                      <SelectItem value="Work">Work</SelectItem>
                      <SelectItem value="Home">Home</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input 
                    value={formData.contact} 
                    onChange={e => setFormData({...formData, contact: e.target.value})} 
                    className="h-8 text-xs flex-1" 
                  />
                </div>
              </div>
            </div>

            <div className="text-sm font-semibold border-b pb-1 mt-4">Address</div>

            {/* ROW 4 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold">Address Line 1</label>
                <Input value={formData.address1} onChange={e => setFormData({...formData, address1: e.target.value})} className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold">Address Line 2</label>
                <Input value={formData.address2} onChange={e => setFormData({...formData, address2: e.target.value})} className="h-8 text-xs" />
              </div>
            </div>

            {/* ROW 5 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold">Country</label>
                <Select value={formData.country} onValueChange={(val) => setFormData({...formData, country: val})}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Choose" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Choose">Choose</SelectItem>
                    <SelectItem value="US">United States</SelectItem>
                    <SelectItem value="UK">United Kingdom</SelectItem>
                    <SelectItem value="IN">India</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold">Zipcode</label>
                <Input value={formData.zipcode} onChange={e => setFormData({...formData, zipcode: e.target.value})} className="h-8 text-xs" />
              </div>
            </div>

            {/* ROW 6 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold">State</label>
                <Input value={formData.state} onChange={e => setFormData({...formData, state: e.target.value})} className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold">City</label>
                <Input value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} className="h-8 text-xs" />
              </div>
            </div>

            {/* ROW 7 */}
            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold">Marital Status</label>
                <Select value={formData.maritalStatus} onValueChange={(val) => setFormData({...formData, maritalStatus: val})}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Unmarried" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Unmarried">Unmarried</SelectItem>
                    <SelectItem value="Married">Married</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold">Current Company</label>
                <Input value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} className="h-8 text-xs" />
              </div>
            </div>

            {/* ROW 8 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold">Qualification</label>
                <Input value={formData.qualification} onChange={e => setFormData({...formData, qualification: e.target.value})} className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold">University</label>
                <Input value={formData.university} onChange={e => setFormData({...formData, university: e.target.value})} className="h-8 text-xs" />
              </div>
            </div>

            {/* ROW 9 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold">Relevant Experience</label>
                <Input value={formData.relevantExp} onChange={e => setFormData({...formData, relevantExp: e.target.value})} className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold">Total Experience</label>
                <Input value={formData.totalExp} onChange={e => setFormData({...formData, totalExp: e.target.value})} className="h-8 text-xs" />
              </div>
            </div>

            {/* ROW 10 */}
            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold w-full flex items-center justify-between border-b pb-1">
                  <span>Upload Signature</span>
                </label>
                <div className="pt-2">
                  <Input type="file" accept="image/*" className="h-8 text-xs w-full mb-1" />
                  <div className="text-[10px] text-muted-foreground">(Min Size - 0 MB and Max Size - 1 MB)</div>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold w-full flex items-center justify-between border-b pb-1">
                  <span>Upload Resume</span>
                </label>
                <div className="pt-2">
                  <Input type="file" accept=".pdf,.doc,.docx" className="h-8 text-xs w-full mb-1" />
                  <div className="text-[10px] text-muted-foreground">(Min Size - 0 MB and Max Size - 5 MB)</div>
                </div>
              </div>
            </div>

            {/* ROW 11 */}
            <div className="space-y-1 pt-2">
              <label className="text-xs font-semibold">Skills</label>
              <Input value={formData.skills} onChange={e => setFormData({...formData, skills: e.target.value})} className="h-8 text-xs" />
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-primary text-primary-foreground">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
