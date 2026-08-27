import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FolderOpen, Download, FileText, Search, RefreshCw, Eye, Printer, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/config/api';
import { LetterViewerModal } from '@/features/letters/components/LetterViewerModal';

interface EmployeeDocumentItem {
  id: number;
  document_type: string;
  document_number: string | null;
  issue_date: string | null;
  issued_by: string | null;
  file_url: string;
  file_size: number | null;
  verification_status: string;
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<EmployeeDocumentItem[]>([]);
  const [myLetters, setMyLetters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'letters' | 'onboarding' | 'tax'>('letters');
  
  // Letter Viewer Modal
  const [selectedLetter, setSelectedLetter] = useState<any>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  const fetchMyDocuments = async () => {
    setLoading(true);
    try {
      const [docRes, letterRes] = await Promise.all([
        apiClient.get('/employees/my-documents').catch(() => ({ data: { data: [] } })),
        apiClient.get('/letters/my-letters').catch(() => ({ data: { data: [] } })),
      ]);

      if (docRes.data?.data) {
        const items = Array.isArray(docRes.data.data) ? docRes.data.data : docRes.data.data.items || [];
        setDocuments(items);
      }

      if (letterRes.data?.data && Array.isArray(letterRes.data.data)) {
        setMyLetters(letterRes.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch employee documents', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyDocuments();
  }, []);

  const handleDownload = (doc: EmployeeDocumentItem) => {
    const filename = doc.document_number || doc.document_type || 'Official_Document';
    const typeLabel = doc.document_type.replace(/_/g, ' ').toUpperCase();
    toast.success(`Downloading ${typeLabel} (${filename})...`);
    if (doc.file_url) {
      const link = document.createElement('a');
      link.href = doc.file_url;
      link.target = '_blank';
      link.download = `${filename}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleViewLetter = (letter: any) => {
    setSelectedLetter(letter);
    setIsViewerOpen(true);
  };

  const handlePrintLetter = (letter: any) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(letter.rendered_html);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }
  };

  const filteredLetters = myLetters.filter((l) => {
    const matchSearch =
      (l.letter_code || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.letter_type || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.subject || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchSearch;
  });

  const filteredDocs = documents.filter((doc) => {
    const matchSearch =
      (doc.document_number || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.document_type || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.issued_by || '').toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchSearch) return false;
    if (selectedCategory === 'all') return true;
    if (selectedCategory === 'onboarding') return ['offer_letter', 'appointment_letter', 'confirmation_letter'].includes(doc.document_type);
    if (selectedCategory === 'letters') return ['relieving_letter', 'experience_letter', 'resume', 'certificate'].includes(doc.document_type);
    if (selectedCategory === 'tax') return doc.document_number?.startsWith('F16') || doc.document_number?.startsWith('PS');
    return true;
  });

  const categories = [
    { id: 'letters', label: `Official Letters & Contracts (${myLetters.length})` },
    { id: 'all', label: `All Vault Files (${documents.length})` },
    { id: 'onboarding', label: 'Onboarding Files' },
    { id: 'tax', label: 'Payslips & Tax' },
  ];

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card border border-border/80 rounded-2xl p-5 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-foreground tracking-tight flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> My Documents & Official Letters Vault
            </h2>
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-bold uppercase tracking-wider">
              Verified Records
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Access, view, and print your formal Appointment Letter, Increment Letters, Service Confirmations, NDA agreements, and tax forms.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchMyDocuments}
          className="gap-1.5 text-xs font-bold rounded-xl border-border shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Vault
        </Button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-card border border-border/80 rounded-2xl p-3.5 shadow-2xs">
        <div className="flex gap-2 overflow-x-auto pb-0.5">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id as any)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/60'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="relative min-w-[220px] w-full sm:w-auto">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search letters & documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-muted/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-foreground placeholder:text-muted-foreground/60"
          />
        </div>
      </div>

      {/* Official Generated Letters Table (When 'letters' tab is selected) */}
      {selectedCategory === 'letters' && (
        <Card className="border border-border/80 rounded-2xl shadow-2xs bg-card overflow-hidden">
          <CardHeader className="pb-3 pt-4 px-4 sm:px-5 border-b border-border/60 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                <FileText className="w-4 h-4 text-indigo-600" /> Formal Company Letters & Agreements
              </CardTitle>
              <CardDescription className="text-xs">{filteredLetters.length} issued document(s) in your profile</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border/60">
                  <TableHead className="font-bold text-xs uppercase text-muted-foreground px-4 py-3">Document Code</TableHead>
                  <TableHead className="font-bold text-xs uppercase text-muted-foreground px-4 py-3">Letter Type</TableHead>
                  <TableHead className="font-bold text-xs uppercase text-muted-foreground px-4 py-3">Subject</TableHead>
                  <TableHead className="font-bold text-xs uppercase text-muted-foreground px-4 py-3">Status</TableHead>
                  <TableHead className="font-bold text-xs uppercase text-muted-foreground px-4 py-3">Issued Date</TableHead>
                  <TableHead className="font-bold text-xs uppercase text-muted-foreground px-4 py-3 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <RefreshCw className="w-5 h-5 animate-spin text-indigo-600" />
                        <span className="text-xs font-bold">Loading your official letters...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredLetters.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-14">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <FileText className="w-8 h-8 opacity-40 text-indigo-600" />
                        <p className="text-xs font-bold text-foreground">No official letters generated yet</p>
                        <p className="text-[11px] text-muted-foreground">Your Appointment Letter, Increment Letters, and other company agreements will appear here once released by HR.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLetters.map((letter) => (
                    <TableRow key={letter.id} className="hover:bg-muted/20 transition-colors border-b border-border/50">
                      <TableCell className="px-4 py-3 text-xs font-mono font-black text-indigo-600 dark:text-indigo-400">
                        {letter.letter_code}
                      </TableCell>
                      
                      <TableCell className="px-4 py-3 text-xs font-bold text-foreground capitalize">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center font-bold">
                            <FileText className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <div>{letter.letter_type?.replace(/_/g, ' ')}</div>
                            <span className="text-[10px] text-muted-foreground font-normal uppercase">{letter.letter_category}</span>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="px-4 py-3 text-xs text-foreground max-w-xs truncate">
                        {letter.subject || 'Official Communication'}
                      </TableCell>

                      <TableCell className="px-4 py-3 text-xs">
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">
                          {letter.status?.toUpperCase()}
                        </Badge>
                      </TableCell>

                      <TableCell className="px-4 py-3 text-xs font-mono text-muted-foreground">
                        {new Date(letter.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </TableCell>

                      <TableCell className="px-4 py-3 text-xs text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewLetter(letter)}
                            className="h-7 px-2.5 text-xs font-bold rounded-lg border-slate-200 text-indigo-600 hover:bg-indigo-50"
                          >
                            <Eye className="w-3 h-3 mr-1" /> View
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handlePrintLetter(letter)}
                            className="h-7 px-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg gap-1 shadow-2xs"
                          >
                            <Printer className="w-3 h-3" /> Print / PDF
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* General Document Files Table (When other tabs are selected) */}
      {selectedCategory !== 'letters' && (
        <Card className="border border-border/80 rounded-2xl shadow-2xs bg-card overflow-hidden">
          <CardHeader className="pb-3 pt-4 px-4 sm:px-5 border-b border-border/60 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                <FileText className="w-4 h-4 text-primary" /> Verified Employee Records
              </CardTitle>
              <CardDescription className="text-xs">{filteredDocs.length} document(s) found</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border/60">
                  <TableHead className="font-bold text-xs uppercase text-muted-foreground px-4 py-3">Document Type</TableHead>
                  <TableHead className="font-bold text-xs uppercase text-muted-foreground px-4 py-3">Ref Number</TableHead>
                  <TableHead className="font-bold text-xs uppercase text-muted-foreground px-4 py-3">Issued By</TableHead>
                  <TableHead className="font-bold text-xs uppercase text-muted-foreground px-4 py-3">Issue Date</TableHead>
                  <TableHead className="font-bold text-xs uppercase text-muted-foreground px-4 py-3">Size</TableHead>
                  <TableHead className="font-bold text-xs uppercase text-muted-foreground px-4 py-3 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <RefreshCw className="w-5 h-5 animate-spin text-primary" />
                        <span className="text-xs font-bold">Loading documents...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredDocs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-14">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <FolderOpen className="w-8 h-8 opacity-40" />
                        <p className="text-xs font-bold text-foreground">No documents found</p>
                        <p className="text-[11px] text-muted-foreground">Try changing the category or search term.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDocs.map((doc) => (
                    <TableRow key={doc.id} className="hover:bg-muted/20 transition-colors border-b border-border/50">
                      <TableCell className="px-4 py-3 text-xs font-bold text-foreground">
                        <div className="flex items-center gap-2.5">
                          <div className="h-7 w-7 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                            <FileText className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="block font-bold text-foreground">{doc.document_type.replace(/_/g, ' ').toUpperCase()}</span>
                            <span className="text-[10px] text-muted-foreground font-normal">PDF Document</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-xs font-mono font-bold text-primary">
                        {doc.document_number || '--'}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-xs font-semibold text-foreground">{doc.issued_by || 'HR Department'}</TableCell>
                      <TableCell className="px-4 py-3 text-xs font-mono text-muted-foreground">{doc.issue_date || '--'}</TableCell>
                      <TableCell className="px-4 py-3 text-xs font-mono text-muted-foreground">
                        {doc.file_size ? `${(doc.file_size / 1024 / 1024).toFixed(2)} MB` : '1.8 MB'}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-xs text-right">
                        <Button
                          size="sm"
                          onClick={() => handleDownload(doc)}
                          className="h-7 px-3 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs rounded-lg gap-1.5 shadow-2xs"
                        >
                          <Download className="w-3 h-3" /> Download
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Letterhead Viewer Modal */}
      <LetterViewerModal
        open={isViewerOpen}
        onOpenChange={setIsViewerOpen}
        letter={selectedLetter}
      />
    </div>
  );
}
