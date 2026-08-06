import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Download, Search, ChevronDown } from 'lucide-react';

const MOCK_APPLICANTS = [
  { id: 1, name: 'Alice Walker', email: 'alice@example.com', maritalStatus: 'Unmarried', qualification: 'B.Tech', skills: 'React, Node', gender: 'Female', contact: '9876543210', status: 'Open' },
  { id: 2, name: 'Bob Singer', email: 'bob@example.com', maritalStatus: 'Married', qualification: 'MBA', skills: 'Management', gender: 'Male', contact: '8765432109', status: 'Shortlisted' },
  { id: 3, name: 'Charlie Davis', email: 'charlie@example.com', maritalStatus: 'Unmarried', qualification: 'MCA', skills: 'Java, Spring', gender: 'Male', contact: '7654321098', status: 'On Hold' },
  { id: 4, name: 'Diana Prince', email: 'diana@example.com', maritalStatus: 'Married', qualification: 'Ph.D', skills: 'Data Science', gender: 'Female', contact: '6543210987', status: 'Selected-Approved By CEO' },
  { id: 5, name: 'Evan Wright', email: 'evan@example.com', maritalStatus: 'Unmarried', qualification: 'BCA', skills: 'PHP, Laravel', gender: 'Transgender', contact: '5432109876', status: 'Rejected' },
];

const CANDIDATE_STAGES = ['On Hold', 'Open', 'Rejected', 'Selected', 'Selected-Approved By CEO', 'Shortlisted'];
const MARITAL_STATUS_OPTIONS = ['Unmarried', 'Married'];
const GENDER_OPTIONS = ['Male', 'Female', 'Transgender'];

const INITIAL_FILTERS = {
  name: '',
  email: '',
  maritalStatus: [] as string[],
  qualification: '',
  skills: '',
  gender: [] as string[],
  contact: '',
  status: 'all'
};

// Helper component for the Multi-Select with Checkboxes
const MultiSelectCheckboxDropdown = ({
  options,
  selectedValues,
  onChange,
  placeholderPrefix
}: {
  options: string[],
  selectedValues: string[],
  onChange: (values: string[]) => void,
  placeholderPrefix: string
}) => {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  const filteredOptions = options.filter(opt => opt.toLowerCase().includes(search.toLowerCase()));
  const isAllSelected = selectedValues.length === options.length;

  const handleToggleAll = () => {
    if (isAllSelected) {
      onChange([]);
    } else {
      onChange([...options]);
    }
  };

  const handleToggleOption = (val: string) => {
    if (selectedValues.includes(val)) {
      onChange(selectedValues.filter(v => v !== val));
    } else {
      onChange([...selectedValues, val]);
    }
  };

  const displayText = selectedValues.length === 0 
    ? `${placeholderPrefix} (0)`
    : `${placeholderPrefix}${selectedValues.join(', ')} (${selectedValues.length})`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-between h-8 px-3 text-xs bg-background border-border rounded-sm font-normal text-muted-foreground hover:text-muted-foreground hover:bg-background">
          <span className="truncate">{displayText}</span>
          <ChevronDown className="h-3.5 w-3.5 opacity-50 ml-2 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <div className="p-2 border-b border-border">
          <Input 
            placeholder="Search..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-7 text-xs border-border rounded-sm"
          />
        </div>
        <div className="max-h-[200px] overflow-y-auto p-2 space-y-1">
          {search === '' && (
            <div className="flex items-center space-x-2 p-1 hover:bg-background rounded-sm cursor-pointer" onClick={handleToggleAll}>
              <Checkbox checked={isAllSelected} id="check-all" />
              <label htmlFor="check-all" className="text-xs text-foreground cursor-pointer w-full">{isAllSelected ? 'Uncheck All' : 'Check All'}</label>
            </div>
          )}
          {filteredOptions.map((opt) => (
            <div key={opt} className="flex items-center space-x-2 p-1 hover:bg-background rounded-sm cursor-pointer" onClick={() => handleToggleOption(opt)}>
              <Checkbox checked={selectedValues.includes(opt)} id={`opt-${opt}`} />
              <label htmlFor={`opt-${opt}`} className="text-xs text-foreground cursor-pointer w-full">{opt}</label>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export const ApplicantTrackerPage: React.FC = () => {
  const [filters, setFilters] = useState(INITIAL_FILTERS);

  const [filteredData, setFilteredData] = useState(MOCK_APPLICANTS);
  const [pageSize, setPageSize] = useState('10');
  const [currentPage, setCurrentPage] = useState(1);

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handlePageSizeChange = (val: string) => {
    setPageSize(val);
    setCurrentPage(1);
  };

  const handleSearch = () => {
    const results = MOCK_APPLICANTS.filter(applicant => {
      return (
        (filters.name === '' || applicant.name.toLowerCase().includes(filters.name.toLowerCase())) &&
        (filters.email === '' || applicant.email.toLowerCase().includes(filters.email.toLowerCase())) &&
        (filters.maritalStatus.length === 0 || filters.maritalStatus.includes(applicant.maritalStatus)) &&
        (filters.qualification === '' || applicant.qualification.toLowerCase().includes(filters.qualification.toLowerCase())) &&
        (filters.skills === '' || applicant.skills.toLowerCase().includes(filters.skills.toLowerCase())) &&
        (filters.gender.length === 0 || filters.gender.includes(applicant.gender)) &&
        (filters.contact === '' || applicant.contact.includes(filters.contact)) &&
        (filters.status === 'all' || applicant.status === filters.status)
      );
    });
    setFilteredData(results);
    setCurrentPage(1);
  };

  const handleReset = () => {
    setFilters(INITIAL_FILTERS);
    setFilteredData(MOCK_APPLICANTS);
    setCurrentPage(1);
  };

  const handleExport = () => {
    const headers = ['Name', 'Email Id', 'Marital Status', 'Qualification', 'Skills', 'Gender', 'Contact', 'Status'];
    const csvContent = [
      headers.join(','),
      ...filteredData.map(c => `${c.name},${c.email},${c.maritalStatus},${c.qualification},${c.skills},${c.gender},${c.contact},${c.status}`)
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'applicant_tracker.csv';
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
      <Card className="rounded-none shadow-sm border-border">
        <CardHeader className="py-3 border-b border-border">
          <CardTitle className="text-sm font-normal text-foreground">Applicant Tracker</CardTitle>
        </CardHeader>
        <CardContent className="p-4 md:p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-x-6 gap-y-4">
            
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Name</label>
              <Input 
                value={filters.name} 
                onChange={(e) => handleFilterChange('name', e.target.value)} 
                className="h-8 text-xs bg-card text-card-foreground border-input rounded-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Email Id</label>
              <Input 
                value={filters.email} 
                onChange={(e) => handleFilterChange('email', e.target.value)} 
                className="h-8 text-xs bg-card text-card-foreground border-input rounded-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Marrital Status</label>
              <MultiSelectCheckboxDropdown 
                options={MARITAL_STATUS_OPTIONS}
                selectedValues={filters.maritalStatus}
                onChange={(vals) => handleFilterChange('maritalStatus', vals)}
                placeholderPrefix="Marrital Status"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Qualification</label>
              <Input 
                value={filters.qualification} 
                onChange={(e) => handleFilterChange('qualification', e.target.value)} 
                className="h-8 text-xs bg-background border-border rounded-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Skills</label>
              <Input 
                value={filters.skills} 
                onChange={(e) => handleFilterChange('skills', e.target.value)} 
                className="h-8 text-xs bg-background border-border rounded-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Gender</label>
              <MultiSelectCheckboxDropdown 
                options={GENDER_OPTIONS}
                selectedValues={filters.gender}
                onChange={(vals) => handleFilterChange('gender', vals)}
                placeholderPrefix="Gender "
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Contact Number</label>
              <Input 
                value={filters.contact} 
                onChange={(e) => handleFilterChange('contact', e.target.value)} 
                className="h-8 text-xs bg-card text-card-foreground border-input rounded-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Candidate Status</label>
              <Select value={filters.status} onValueChange={(val) => handleFilterChange('status', val)}>
                <SelectTrigger className="h-8 text-xs bg-card text-card-foreground border-input rounded-sm">
                  <SelectValue placeholder="Choose" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Choose</SelectItem>
                  {CANDIDATE_STAGES.map((stage) => (
                    <SelectItem key={stage} value={stage}>{stage}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-end gap-2 pt-1 lg:col-span-4 xl:col-span-4 mt-2">
              <Button onClick={handleSearch} className="h-8 px-4 bg-primary text-primary-foreground hover:bg-primary/90 text-xs rounded-sm">
                <Search className="w-3.5 h-3.5 mr-1.5" />
                Search
              </Button>
              <Button onClick={handleReset} variant="outline" className="h-8 px-4 text-xs rounded-sm bg-destructive hover:bg-destructive/90 text-primary-foreground border-none hover:text-primary-foreground">
                Reset
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
                  <TableHead className="text-xs font-semibold h-9 text-foreground">Name</TableHead>
                  <TableHead className="text-xs font-semibold h-9 text-foreground">Email Id</TableHead>
                  <TableHead className="text-xs font-semibold h-9 text-foreground">Marital Status</TableHead>
                  <TableHead className="text-xs font-semibold h-9 text-foreground">Qualification</TableHead>
                  <TableHead className="text-xs font-semibold h-9 text-foreground">Skills</TableHead>
                  <TableHead className="text-xs font-semibold h-9 text-foreground">Gender</TableHead>
                  <TableHead className="text-xs font-semibold h-9 text-foreground">Contact Number</TableHead>
                  <TableHead className="text-xs font-semibold h-9 text-foreground">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.length > 0 ? (
                  paginatedData.map((candidate) => (
                    <TableRow key={candidate.id} className="border-border bg-card text-card-foreground hover:bg-background">
                      <TableCell className="text-xs py-2">{candidate.name}</TableCell>
                      <TableCell className="text-xs py-2 text-muted-foreground">{candidate.email}</TableCell>
                      <TableCell className="text-xs py-2">{candidate.maritalStatus}</TableCell>
                      <TableCell className="text-xs py-2">{candidate.qualification}</TableCell>
                      <TableCell className="text-xs py-2">{candidate.skills}</TableCell>
                      <TableCell className="text-xs py-2">{candidate.gender}</TableCell>
                      <TableCell className="text-xs py-2">{candidate.contact}</TableCell>
                      <TableCell className="text-xs py-2">
                        <span className={`px-2 py-0.5 rounded-full ${candidate.status === 'Selected' || candidate.status === 'Selected-Approved By CEO' ? 'bg-green-100 text-green-700' : candidate.status === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                          {candidate.status}
                        </span>
                      </TableCell>
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
