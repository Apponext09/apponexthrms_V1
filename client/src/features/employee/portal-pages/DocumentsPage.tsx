import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FolderOpen, Download, FileText, Search, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api';

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
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const fetchMyDocuments = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/employees/my-documents');
      if (res.data?.data) {
        const items = Array.isArray(res.data.data) ? res.data.data : res.data.data.items || [];
        setDocuments(items);
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
    { id: 'all', label: 'All Documents' },
    { id: 'onboarding', label: 'Onboarding' },
    { id: 'letters', label: 'Letters & Contracts' },
    { id: 'tax', label: 'Payslips & Tax' },
  ];

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card border border-border/80 rounded-xl p-4 sm:p-5 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-foreground tracking-tight flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-primary" /> My Documents Vault
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 font-bold">
              Official Records
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Access, view, and download verified company paperwork, offer letters, and tax forms.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchMyDocuments}
          className="gap-1.5 text-xs font-bold rounded-lg border-border shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-card border border-border/80 rounded-xl p-3.5 shadow-2xs">
        <div className="flex gap-2 overflow-x-auto pb-0.5">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                selectedCategory === cat.id
                  ? 'bg-primary text-primary-foreground shadow-2xs'
                  : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/60'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="relative min-w-[200px] w-full sm:w-auto">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder:text-muted-foreground/60"
          />
        </div>
      </div>

      <Card className="border border-border/80 rounded-xl shadow-2xs bg-card overflow-hidden">
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
    </div>
  );
}
