import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Upload, FileText, Trash2, CheckCircle, XCircle, Loader2, ExternalLink, ShieldAlert } from 'lucide-react';
import { showToast } from '@/components/ui/toast';
import {
  useEmployeeDocuments,
  useUploadDocument,
  useVerifyDocument,
  useDeleteDocument,
} from '../hooks/useEmployeeDocuments';

interface EmployeeDocumentsProps {
  employeeId?: number;
  /** If true, verification/approval/delete actions are restricted. Employees can upload documents for HR verification. */
  readOnly?: boolean;
}

const DOCUMENT_TYPES = [
  'aadhaar', 'pan', 'passport', 'visa', 'driving_license',
  'offer_letter', 'appointment_letter', 'confirmation_letter',
  'relieving_letter', 'experience_letter', 'resume', 'certificate',
];

const STATUS_STYLES: Record<string, string> = {
  verified: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',
  pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  expired: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};

export function EmployeeDocuments({ employeeId, readOnly = false }: EmployeeDocumentsProps): JSX.Element {
  const id = employeeId || 0;
  const { documents, isLoading } = useEmployeeDocuments(id);
  const { uploadDocument, isLoading: isUploading } = useUploadDocument();
  const { verifyDocument } = useVerifyDocument();
  const { deleteDocument } = useDeleteDocument();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    documentType: 'resume',
    fileUrl: '',
    documentNumber: '',
    expiryDate: '',
  });

  const handleUpload = async () => {
    if (!form.fileUrl) {
      showToast.error('File URL is required');
      return;
    }
    try {
      await uploadDocument({
        employeeId: id,
        documentType: form.documentType,
        fileUrl: form.fileUrl,
        documentNumber: form.documentNumber || undefined,
        expiryDate: form.expiryDate || undefined,
      });
      showToast.success('Document uploaded successfully. Awaiting HR verification.');
      setOpen(false);
      setForm({ documentType: 'resume', fileUrl: '', documentNumber: '', expiryDate: '' });
    } catch {
      showToast.error('Failed to upload document');
    }
  };

  const handleVerify = async (documentId: number, approved: boolean) => {
    try {
      await verifyDocument({ documentId, approved });
      showToast.success(approved ? 'Document verified' : 'Document rejected');
    } catch {
      showToast.error('Failed to update document status');
    }
  };

  const handleDelete = async (documentId: number) => {
    try {
      await deleteDocument(documentId);
      showToast.success('Document deleted');
    } catch {
      showToast.error('Failed to delete document');
    }
  };

  return (
    <Card className="border border-border/80 shadow-2xs rounded-xl bg-card">
      <CardHeader className="flex flex-row justify-between items-center pb-3 px-4 sm:px-5 pt-4 sm:pt-5 border-b border-border/50 mb-4">
        <div>
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            Documents
          </CardTitle>
          <CardDescription className="text-xs">
            {readOnly
              ? 'Upload your documents for HR verification and view status.'
              : 'Manage employee documents and verification statuses'}
          </CardDescription>
        </div>
        {/* Upload button is available to BOTH employees and HR/Admin */}
        <Button size="sm" className="h-7 text-xs font-semibold gap-1.5 px-3 bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => setOpen(true)}>
          <Upload className="w-3.5 h-3.5" />
          Upload Document
        </Button>
      </CardHeader>
      <CardContent className="px-4 sm:px-5 pb-4 sm:pb-5">
        {readOnly && (
          <div className="mb-4 flex items-center gap-2 p-3 rounded-xl bg-amber-500/8 border border-amber-500/25 text-xs text-amber-700 dark:text-amber-400 font-medium">
            <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600" />
            Document verification & approval is performed by HR & Admin only. Newly uploaded documents remain pending until approved.
          </div>
        )}
        {isLoading ? (
          <div className="text-xs text-muted-foreground py-6 text-center">Loading documents...</div>
        ) : documents.length === 0 ? (
          <div className="text-xs text-muted-foreground py-8 text-center">
            No documents uploaded yet.
          </div>
        ) : (
          <div className="space-y-2.5">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-3 border border-border/60 rounded-lg bg-card text-xs hover:border-border/90 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-muted/60 text-muted-foreground shrink-0">
                    <FileText className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-xs text-foreground capitalize">
                      {doc.documentType.replace(/_/g, ' ')}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {doc.documentNumber || 'No document number'}
                      {doc.expiryDate ? ` · Expires ${new Date(doc.expiryDate).toLocaleDateString()}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={`text-[10px] font-bold py-0.5 px-2 ${STATUS_STYLES[doc.verificationStatus || 'pending']}`}>
                    {doc.verificationStatus || 'pending'}
                  </Badge>
                  {doc.fileUrl && (
                    <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="sm" className="h-7 text-xs px-2 gap-1" title="View / Open File">
                        <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                      </Button>
                    </a>
                  )}
                  {/* Verification / Approval — strictly HR & Admin ONLY (!readOnly) */}
                  {!readOnly && doc.verificationStatus === 'pending' && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs px-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                        onClick={() => handleVerify(doc.id as number, true)}
                        title="Approve / Verify document"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                        onClick={() => handleVerify(doc.id as number, false)}
                        title="Reject document"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                      </Button>
                    </>
                  )}
                  {/* Delete — strictly HR & Admin ONLY (!readOnly) */}
                  {!readOnly && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                      onClick={() => handleDelete(doc.id as number)}
                      title="Delete document"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Upload Dialog — available for both employees & admin */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>
              Submit a document for verification.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="documentType">Document Type</Label>
              <select
                id="documentType"
                className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={form.documentType}
                onChange={(e) => setForm((p) => ({ ...p, documentType: e.target.value }))}
              >
                {DOCUMENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="fileUrl">File URL</Label>
              <Input
                id="fileUrl"
                placeholder="https://..."
                className="mt-1"
                value={form.fileUrl}
                onChange={(e) => setForm((p) => ({ ...p, fileUrl: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="documentNumber">Document Number (optional)</Label>
              <Input
                id="documentNumber"
                className="mt-1"
                value={form.documentNumber}
                onChange={(e) => setForm((p) => ({ ...p, documentNumber: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="expiryDate">Expiry Date (optional)</Label>
              <Input
                id="expiryDate"
                type="date"
                className="mt-1"
                value={form.expiryDate}
                onChange={(e) => setForm((p) => ({ ...p, expiryDate: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isUploading}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={isUploading} className="gap-2">
              {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
