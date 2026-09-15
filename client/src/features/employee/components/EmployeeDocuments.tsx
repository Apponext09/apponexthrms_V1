import { useState, useEffect } from 'react';
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
import {
  Upload,
  FileText,
  Trash2,
  CheckCircle,
  XCircle,
  Loader2,
  ShieldAlert,
  Clock,
  CheckCircle2,
  FileCheck2,
  Eye,
  Download,
  Scale,
} from 'lucide-react';
import { showToast } from '@/components/ui/toast';
import { apiClient } from '@/config/api';
import { useCompanyStore } from '@/features/settings/store/companyStore';
import {
  useEmployeeDocuments,
  useUploadDocument,
  useVerifyDocument,
  useDeleteDocument,
} from '../hooks/useEmployeeDocuments';
import type { EmployeeDocument } from '@/types';

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
  verified: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  pending: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30',
  rejected: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30',
  expired: 'bg-muted text-muted-foreground border-border',
};

export function EmployeeDocuments({ employeeId, readOnly = false }: EmployeeDocumentsProps): JSX.Element {
  const id = employeeId || 0;
  const { documents, isLoading, refetch } = useEmployeeDocuments(id);
  const { uploadDocument, isLoading: isUploading } = useUploadDocument();
  const { verifyDocument } = useVerifyDocument();
  const { deleteDocument } = useDeleteDocument();
  const { selectedCompanyName } = useCompanyStore();
  const companyName = selectedCompanyName || 'Apponext HRMS';

  const [open, setOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<EmployeeDocument | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // Policy acceptance state
  const [hasPolicyAcceptedInDb, setHasPolicyAcceptedInDb] = useState<boolean>(false);
  const [policyAgreed, setPolicyAgreed] = useState<boolean>(false);
  const [isAcceptingPolicy, setIsAcceptingPolicy] = useState<boolean>(false);

  const [form, setForm] = useState({
    documentType: 'resume',
    documentNumber: '',
    expiryDate: '',
  });
  const selectedDocument = documents.find((doc) => doc.documentType === form.documentType);

  // Check if employee has accepted document policy in DB
  useEffect(() => {
    const checkPolicyStatus = async () => {
      if (id <= 0) return;
      try {
        const res = await apiClient.get(`/employees/${id}`).catch(() => null);
        const emp = res?.data?.data || res?.data;
        if (emp && (emp.documentPolicyAccepted || emp.document_policy_accepted)) {
          setHasPolicyAcceptedInDb(true);
          setPolicyAgreed(true);
        }
      } catch {
        // Fallback
      }
    };
    checkPolicyStatus();
  }, [id]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 10 * 1024 * 1024) {
        showToast.error('File size exceeds 10MB limit');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      showToast.error('Please select a document file to upload');
      return;
    }

    // Require policy checkbox if not accepted in DB yet
    if (!hasPolicyAcceptedInDb && !policyAgreed) {
      showToast.error(`You must accept the Cyber Laws & Government Policy Terms of ${companyName} to upload documents.`);
      return;
    }

    try {
      // 1. If policy is not yet accepted in DB, accept it now
      if (!hasPolicyAcceptedInDb && policyAgreed) {
        setIsAcceptingPolicy(true);
        await apiClient.post(`/employees/${id}/accept-document-policy`).catch(() => null);
        setHasPolicyAcceptedInDb(true);
        setIsAcceptingPolicy(false);
      }

      // 2. Read file into Data URL
      const fileUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(selectedFile);
      });

      await uploadDocument({
        employeeId: id,
        documentType: form.documentType,
        fileUrl,
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        fileType: selectedFile.type,
        documentNumber: form.documentNumber || undefined,
        expiryDate: form.expiryDate || undefined,
      });

      showToast.success(selectedDocument
        ? 'Document updated successfully. Awaiting HR & Admin approval.'
        : 'Document uploaded successfully. Awaiting HR & Admin approval.');
      setOpen(false);
      setSelectedFile(null);
      setForm({ documentType: 'resume', documentNumber: '', expiryDate: '' });
      refetch();
    } catch {
      showToast.error('Failed to upload document');
    } finally {
      setIsAcceptingPolicy(false);
    }
  };

  const handleVerify = async (documentId: number, approved: boolean) => {
    try {
      await verifyDocument({ documentId, approved });
      showToast.success(approved ? 'Document verified & approved successfully' : 'Document rejected');
    } catch {
      showToast.error('Failed to update document verification status');
    }
  };

  const handleDelete = async (documentId: number) => {
    try {
      await deleteDocument(documentId);
      showToast.success('Document deleted successfully');
    } catch {
      showToast.error('Failed to delete document');
    }
  };

  const handleDownloadDocument = (doc: EmployeeDocument) => {
    if (!doc.fileUrl) return;
    const link = document.createElement('a');
    link.href = doc.fileUrl;
    link.download = `${doc.documentType || 'document'}_${doc.id || 'file'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card className="min-w-0 border border-border/80 shadow-2xs rounded-xl bg-card">
      <CardHeader className="flex flex-col gap-3 pb-3 px-4 sm:px-5 pt-4 sm:pt-5 border-b border-border/50 mb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <FileCheck2 className="w-4 h-4 text-primary" />
            Documents &amp; Certificates
          </CardTitle>
          <CardDescription className="text-xs">
            {readOnly
              ? 'Upload your official documents for HR & Admin verification and track approval status.'
              : 'Manage employee documents, files, and verification approvals'}
          </CardDescription>
        </div>
        {/* Upload button is available to BOTH employees and HR/Admin */}
        <Button
          size="sm"
          className="h-8 w-full shrink-0 text-xs font-semibold gap-1.5 px-3 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg cursor-pointer sm:w-auto"
          onClick={() => setOpen(true)}
        >
          <Upload className="w-3.5 h-3.5" />
          Upload Document
        </Button>
      </CardHeader>
      <CardContent className="px-4 sm:px-5 pb-4 sm:pb-5">
        {readOnly && (
          <div className="mb-4 flex items-center gap-2 p-3 rounded-xl bg-amber-500/8 border border-amber-500/25 text-xs text-amber-700 dark:text-amber-400 font-medium">
            <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600" />
            Document verification &amp; approval is performed by HR &amp; Admin only. Newly uploaded documents remain pending until approved.
          </div>
        )}
        {isLoading ? (
          <div className="text-xs text-muted-foreground py-6 text-center flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            Loading documents...
          </div>
        ) : documents.length === 0 ? (
          <div className="text-xs text-muted-foreground py-8 text-center bg-muted/20 rounded-xl border border-border/60">
            No documents uploaded yet. Click <strong>Upload Document</strong> to submit files.
          </div>
        ) : (
            <div className="space-y-2.5">
            {documents.map((doc) => {
              const status = doc.verificationStatus || 'pending';
              return (
                <div
                  key={doc.id}
                  className="flex flex-col justify-between gap-3 p-3.5 border border-border/70 rounded-xl bg-card text-xs hover:border-border transition-colors sm:flex-row sm:items-center"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-primary/10 text-primary shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-xs text-foreground capitalize flex items-center gap-1.5">
                        {doc.documentType.replace(/_/g, ' ')}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {doc.documentNumber ? `No: ${doc.documentNumber}` : 'Document uploaded'}
                        {doc.expiryDate ? ` · Expires ${new Date(doc.expiryDate).toLocaleDateString()}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap">
                    <Badge variant="outline" className={`text-[10px] font-bold py-0.5 px-2.5 capitalize flex items-center gap-1 whitespace-nowrap ${STATUS_STYLES[status]}`}>
                      {status === 'pending' && <Clock className="w-3 h-3 text-amber-600" />}
                      {status === 'verified' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                      {status === 'rejected' && <XCircle className="w-3 h-3 text-rose-600" />}
                      {status === 'pending' ? 'Pending Approval' : status}
                    </Badge>

                    {doc.fileUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 flex-1 text-xs px-2.5 gap-1.5 rounded-lg cursor-pointer font-semibold sm:flex-none"
                        onClick={() => setPreviewDoc(doc)}
                        title="View / Preview Document"
                      >
                        <Eye className="w-3.5 h-3.5 text-primary" /> View File
                      </Button>
                    )}

                    {/* Verification / Approval — strictly HR & Admin ONLY (!readOnly) */}
                    {!readOnly && status === 'pending' && (
                      <div className="flex flex-1 items-center gap-1 sm:flex-none">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 flex-1 text-xs px-2.5 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 gap-1 rounded-lg font-semibold cursor-pointer sm:flex-none"
                          onClick={() => handleVerify(doc.id as number, true)}
                          title="Approve document"
                        >
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Approve
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 flex-1 text-xs px-2.5 text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 gap-1 rounded-lg font-semibold cursor-pointer sm:flex-none"
                          onClick={() => handleVerify(doc.id as number, false)}
                          title="Reject document"
                        >
                          <XCircle className="w-3.5 h-3.5 text-rose-600" /> Reject
                        </Button>
                      </div>
                    )}

                    {/* Delete — strictly HR & Admin ONLY (!readOnly) */}
                    {!readOnly && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg cursor-pointer"
                        onClick={() => handleDelete(doc.id as number)}
                        title="Delete document"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Upload Dialog — available for both employees & admin */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-lg max-h-[90vh] overflow-y-auto sm:w-full">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Upload className="w-5 h-5 text-primary" /> {selectedDocument ? 'Update Document' : 'Upload Document'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {selectedDocument
                ? 'A document of this type already exists. Choose a replacement file to update it.'
                : 'Select and upload a document file for HR & Admin verification.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="documentType" className="text-xs font-semibold">Document Type</Label>
              <select
                id="documentType"
                className="mt-1 w-full h-9 rounded-lg border border-input bg-background px-3 text-xs font-medium focus:ring-1 focus:ring-primary"
                value={form.documentType}
                onChange={(e) => setForm((p) => ({ ...p, documentType: e.target.value }))}
              >
                {DOCUMENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.replace(/_/g, ' ').toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            {/* Native Drag & Drop / File Input Selector */}
            <div>
              <Label className="text-xs font-semibold">Document File</Label>
              <div className="mt-1 border-2 border-dashed border-border/80 rounded-xl p-4 text-center hover:border-primary/60 transition-colors bg-muted/10 relative">
                <input
                  type="file"
                  id="documentFile"
                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={handleFileChange}
                />
                {selectedFile ? (
                  <div className="flex items-center justify-between gap-2 text-left bg-background p-2.5 rounded-lg border border-border shadow-2xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-5 h-5 text-primary shrink-0" />
                      <div className="min-w-0">
                        <p className="font-bold text-xs truncate">{selectedFile.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {(selectedFile.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[10px] px-2 text-rose-600 hover:bg-rose-500/10 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFile(null);
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-1 py-2 cursor-pointer">
                    <Upload className="w-6 h-6 mx-auto text-primary/70" />
                    <p className="text-xs font-semibold text-foreground">
                      Click to choose file or drag &amp; drop here
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Supports PDF, PNG, JPG, JPEG, DOC, DOCX up to 10MB
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="documentNumber" className="text-xs font-semibold">Document Number (Optional)</Label>
              <Input
                id="documentNumber"
                placeholder="e.g. ABCDE1234F / 1234 5678 9012"
                className="mt-1 h-9 rounded-lg text-xs"
                value={form.documentNumber}
                onChange={(e) => setForm((p) => ({ ...p, documentNumber: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="expiryDate" className="text-xs font-semibold">Expiry Date (Optional)</Label>
              <Input
                id="expiryDate"
                type="date"
                className="mt-1 h-9 rounded-lg text-xs"
                value={form.expiryDate}
                onChange={(e) => setForm((p) => ({ ...p, expiryDate: e.target.value }))}
              />
            </div>

            {/* Cyber Laws & Government Statutory Verification Policy Agreement — ONLY SHOWN ONCE IF NOT YET ACCEPTED IN DB */}
            {!hasPolicyAcceptedInDb && (
              <div className="p-3.5 rounded-xl bg-indigo-500/5 border border-indigo-500/20 space-y-2 text-xs">
                <div className="flex items-center gap-2 font-bold text-indigo-700 dark:text-indigo-300">
                  <Scale className="w-4 h-4 text-indigo-600 shrink-0" />
                  Cyber Laws &amp; Statutory Data Protection Policy — {companyName}
                </div>
                <div className="text-[11px] leading-relaxed text-muted-foreground space-y-1 bg-background/50 p-2.5 rounded-lg border border-border/50 max-h-32 overflow-y-auto">
                  <p>
                    In accordance with the <strong>Information Technology (IT) Act</strong>, <strong>Indian Cyber Crime Laws</strong>, <strong>Digital Personal Data Protection (DPDP) Guidelines</strong>, and Statutory Government Compliance Policies of <strong>{companyName}</strong>:
                  </p>
                  <ul className="list-disc list-inside space-y-0.5 font-medium text-foreground text-[10px]">
                    <li><strong>Authenticity Guarantee:</strong> You solemnly affirm that all documents (Aadhaar, PAN, Passport, Certificates) uploaded are genuine, un-altered, and legally valid.</li>
                    <li><strong>Consent &amp; Verification:</strong> You grant explicit consent to {companyName} to process, verify, audit, and securely store your documents for employment compliance.</li>
                    <li><strong>Anti-Fraud Warning:</strong> Submitting forged or fraudulent documents constitutes a punishable offense under Cyber Crime &amp; Statutory Regulations.</li>
                  </ul>
                </div>

                <div className="flex items-start gap-2.5 pt-1">
                  <input
                    type="checkbox"
                    id="policyAgreementCheckbox"
                    checked={policyAgreed}
                    onChange={(e) => setPolicyAgreed(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <label htmlFor="policyAgreementCheckbox" className="text-[11px] font-semibold text-foreground cursor-pointer select-none">
                    I have read, understood, and accept all Cyber Laws, IT Act Data Protection Policies, and Verification Terms of {companyName}.
                  </label>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isUploading || isAcceptingPolicy} className="h-8 text-xs font-semibold rounded-lg">
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={isUploading || isAcceptingPolicy || (!hasPolicyAcceptedInDb && !policyAgreed)}
              className="h-8 text-xs font-semibold gap-1.5 px-4 rounded-lg bg-primary text-primary-foreground disabled:opacity-50 cursor-pointer"
              title={!hasPolicyAcceptedInDb && !policyAgreed ? 'You must accept the Cyber Laws Policy to upload files.' : 'Submit document'}
            >
              {isUploading || isAcceptingPolicy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              Submit Document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document Preview Modal */}
      <Dialog open={Boolean(previewDoc)} onOpenChange={() => setPreviewDoc(null)}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-3xl max-h-[90vh] flex flex-col p-4 sm:w-full sm:p-6">
          <DialogHeader className="pb-3 border-b border-border/60">
            <DialogTitle className="flex items-center gap-2 text-base font-bold capitalize">
              <Eye className="w-5 h-5 text-primary" />
              Document Preview: {previewDoc?.documentType.replace(/_/g, ' ')}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {previewDoc?.documentNumber ? `Document No: ${previewDoc.documentNumber}` : 'Document preview'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-auto my-4 min-h-[300px] flex items-center justify-center bg-muted/20 rounded-xl p-2 border border-border/60">
            {previewDoc?.fileUrl ? (
              previewDoc.fileUrl.startsWith('data:image/') ||
              previewDoc.fileUrl.endsWith('.png') ||
              previewDoc.fileUrl.endsWith('.jpg') ||
              previewDoc.fileUrl.endsWith('.jpeg') ? (
                <img
                  src={previewDoc.fileUrl}
                  alt={previewDoc.documentType}
                  className="max-h-[60vh] max-w-full object-contain rounded-lg shadow-xs"
                />
              ) : previewDoc.fileUrl.startsWith('data:application/pdf') || previewDoc.fileUrl.endsWith('.pdf') ? (
                <iframe
                  src={previewDoc.fileUrl}
                  title="PDF Document Preview"
                  className="w-full h-[60vh] rounded-lg border-0"
                />
              ) : (
                <div className="text-center p-6 space-y-3">
                  <FileText className="w-12 h-12 mx-auto text-primary" />
                  <p className="text-xs font-semibold text-foreground">
                    Document File: {previewDoc.documentType.toUpperCase()}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs font-semibold cursor-pointer"
                    onClick={() => handleDownloadDocument(previewDoc)}
                  >
                    <Download className="w-4 h-4 text-primary" /> Download File
                  </Button>
                </div>
              )
            ) : (
              <div className="text-xs text-muted-foreground">No file preview available.</div>
            )}
          </div>

          <DialogFooter className="flex flex-col-reverse gap-2 pt-3 border-t border-border/60 sm:flex-row sm:justify-between sm:items-center">
            {previewDoc && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownloadDocument(previewDoc)}
                className="h-8 text-xs font-semibold gap-1.5 rounded-lg cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-primary" /> Download Document
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => setPreviewDoc(null)}
              className="h-8 text-xs font-semibold px-4 rounded-lg bg-primary text-primary-foreground cursor-pointer"
            >
              Close Preview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
