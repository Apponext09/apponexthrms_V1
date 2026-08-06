import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download } from 'lucide-react';

const MOCK_RATINGS = [
  { id: 1, candidateName: 'Alice Walker', contact: '9876543210', email: 'alice@example.com', interviewerName: 'Dr. John Smith', rating: 4, feedback: 'Strong technical skills, good communication.', date: '2023-10-15' },
  { id: 2, candidateName: 'Bob Singer', contact: '8765432109', email: 'bob@example.com', interviewerName: 'Jane Doe', rating: 3, feedback: 'Average performance, needs improvement in system design.', date: '2023-10-16' },
  { id: 3, candidateName: 'Charlie Davis', contact: '7654321098', email: 'charlie@example.com', interviewerName: 'Michael Scott', rating: 5, feedback: 'Excellent culture fit and problem solving.', date: '2023-10-18' },
  { id: 4, candidateName: 'Diana Prince', contact: '6543210987', email: 'diana@example.com', interviewerName: 'Clark Kent', rating: 2, feedback: 'Lacks required experience in React.', date: '2023-10-20' },
  { id: 5, candidateName: 'Evan Wright', contact: '5432109876', email: 'evan@example.com', interviewerName: 'Bruce Wayne', rating: 4, feedback: 'Solid background, highly recommended.', date: '2023-10-22' },
];

export const InterviewerRatingPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [pageSize, setPageSize] = useState('10');
  const [currentPage, setCurrentPage] = useState(1);

  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    setCurrentPage(1); // Reset to first page on search
  };

  const handlePageSizeChange = (val: string) => {
    setPageSize(val);
    setCurrentPage(1);
  };

  const handleReset = () => {
    setSearchTerm('');
    setCurrentPage(1);
  };

  // Live filter computation
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return MOCK_RATINGS;
    const lowerTerm = searchTerm.toLowerCase();
    return MOCK_RATINGS.filter(rating => 
      rating.candidateName.toLowerCase().includes(lowerTerm) ||
      rating.contact.includes(lowerTerm) ||
      rating.email.toLowerCase().includes(lowerTerm)
    );
  }, [searchTerm]);

  const handleExport = () => {
    const headers = ['Candidate Name', 'Contact Number', 'Email ID', 'Interviewer Name', 'Rating', 'Feedback', 'Date'];
    const csvContent = [
      headers.join(','),
      ...filteredData.map(r => `"${r.candidateName}","${r.contact}","${r.email}","${r.interviewerName}","${r.rating}","${r.feedback}","${r.date}"`)
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'interviewer_ratings.csv';
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
          <CardTitle className="text-sm font-normal text-foreground">Interviewer Rating Details</CardTitle>
        </CardHeader>
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col md:flex-row items-end gap-4">
            <div className="space-y-1.5 flex-1">
              <label className="text-xs font-semibold text-foreground">Search</label>
              <Input 
                placeholder="Search By Name or Contact Number or Email ID..."
                value={searchTerm} 
                onChange={(e) => handleSearchChange(e.target.value)} 
                className="h-8 text-xs bg-card text-card-foreground border-input rounded-sm w-full"
              />
            </div>
            <div className="pt-1 w-full md:w-auto">
              <Button onClick={handleReset} variant="destructive" className="h-8 px-5 text-xs rounded-sm w-full md:w-auto">
                Reset Filter
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
                  <TableHead className="text-xs font-semibold h-9 text-foreground whitespace-nowrap">Candidate Name</TableHead>
                  <TableHead className="text-xs font-semibold h-9 text-foreground whitespace-nowrap">Contact Number</TableHead>
                  <TableHead className="text-xs font-semibold h-9 text-foreground whitespace-nowrap">Email ID</TableHead>
                  <TableHead className="text-xs font-semibold h-9 text-foreground whitespace-nowrap">Interviewer Name</TableHead>
                  <TableHead className="text-xs font-semibold h-9 text-foreground whitespace-nowrap">Rating (1-5)</TableHead>
                  <TableHead className="text-xs font-semibold h-9 text-foreground max-w-xs">Feedback</TableHead>
                  <TableHead className="text-xs font-semibold h-9 text-foreground whitespace-nowrap">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.length > 0 ? (
                  paginatedData.map((rating) => (
                    <TableRow key={rating.id} className="border-border bg-card text-card-foreground hover:bg-background">
                      <TableCell className="text-xs py-2 whitespace-nowrap">{rating.candidateName}</TableCell>
                      <TableCell className="text-xs py-2 whitespace-nowrap text-muted-foreground">{rating.contact}</TableCell>
                      <TableCell className="text-xs py-2 whitespace-nowrap text-muted-foreground">{rating.email}</TableCell>
                      <TableCell className="text-xs py-2 whitespace-nowrap">{rating.interviewerName}</TableCell>
                      <TableCell className="text-xs py-2 whitespace-nowrap">
                        <div className="flex items-center text-amber-500">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <span key={i} className={i < rating.rating ? "opacity-100" : "opacity-30"}>★</span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs py-2 truncate max-w-xs text-foreground/90">{rating.feedback}</TableCell>
                      <TableCell className="text-xs py-2 whitespace-nowrap">{rating.date}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-xs text-muted-foreground bg-background border-b-0">
                      No data Found
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
