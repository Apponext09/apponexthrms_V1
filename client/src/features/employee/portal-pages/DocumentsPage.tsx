import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FolderOpen, Download, FileUp, Sparkles, FileText, CheckCircle2, Search, ExternalLink } from 'lucide-react';
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

  return (
    <div className="space-y-6">
      <div className="pb-3 border-b flex justify-between items-center flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-foreground flex items-center gap-2">
            <FolderOpen className="w-6 h-6 text-violet-600" /> My Official Documents Vault
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Access, view, and download verified company paperwork, Offer Letters, Appointment Contracts & Tax Forms.
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex justify-between items-center gap-4 flex-wrap bg-card p-4 rounded-2xl border border-border shadow-sm">
        <div className="flex gap-2 overflow-x-auto">
          {[
            { id: 'all', label: 'All Documents' },
            { id: 'onboarding', label: 'Onboarding (Offer / Joining)' },
            { id: 'letters', label: 'Letters & Contracts' },
            { id: 'tax', label: 'Payslips & Tax Form 16' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap ${
                selectedCategory === cat.id
                  ? 'bg-violet-600 text-white shadow-md'
                  : 'bg-muted/60 text-muted-foreground hover:bg-muted'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="relative min-w-[220px]">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-muted/50 border rounded-xl focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
        </div>
      </div>

      <Card className="border rounded-3xl shadow-sm overflow-hidden bg-card">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-sm font-extrabold flex items-center gap-2">
            <FileText className="w-4.5 h-4.5 text-violet-500" /> Verified Employee Records ({filteredDocs.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="font-extrabold text-xs uppercase px-6 py-4">Document Title / Type</TableHead>
                <TableHead className="font-extrabold text-xs uppercase px-6 py-4">Ref Number</TableHead>
                <TableHead className="font-extrabold text-xs uppercase px-6 py-4">Issued By</TableHead>
                <TableHead className="font-extrabold text-xs uppercase px-6 py-4">Issue Date</TableHead>
                <TableHead className="font-extrabold text-xs uppercase px-6 py-4">File Size</TableHead>
                <TableHead className="font-extrabold text-xs uppercase px-6 py-4 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-xs text-muted-foreground">
                    Loading your official documents...
                  </TableCell>
                </TableRow>
              ) : filteredDocs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-xs text-muted-foreground">
                    No matching official documents found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredDocs.map((doc) => (
                  <TableRow key={doc.id} className="hover:bg-muted/40 transition-colors">
                    <TableCell className="px-6 py-4 text-xs font-bold text-foreground">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-lg bg-violet-500/10 text-violet-500 flex items-center justify-center shrink-0 border border-violet-500/20">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="block font-bold">{doc.document_type.replace(/_/g, ' ').toUpperCase()}</span>
                          <span className="text-[10px] text-muted-foreground font-normal">PDF Document</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-xs font-mono font-extrabold text-violet-600 dark:text-violet-400">
                      {doc.document_number || '--'}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-xs font-semibold">{doc.issued_by || 'HR Department'}</TableCell>
                    <TableCell className="px-6 py-4 text-xs font-semibold">{doc.issue_date || '--'}</TableCell>
                    <TableCell className="px-6 py-4 text-xs font-mono font-medium">
                      {doc.file_size ? `${(doc.file_size / 1024 / 1024).toFixed(2)} MB` : '1.8 MB'}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-xs text-right">
                      <Button
                        size="sm"
                        onClick={() => handleDownload(doc)}
                        className="bg-violet-600 hover:bg-violet-700 text-white font-extrabold text-xs h-8 px-3 rounded-xl gap-1.5 shadow"
                      >
                        <Download className="w-3.5 h-3.5" /> Download
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
