import React, { useState, useEffect } from 'react';
import type { RolePolicyRecord, PolicyVersionRecord, PolicyAttachment } from '../types/policy';
import { PolicyStatusBadge } from './PolicyStatusBadge';
import { PolicyPdfViewer } from './PolicyPdfViewer';
import { PolicyPdfModal } from './PolicyPdfModal';
import { PolicyESignModal } from './PolicyESignModal';
import { policiesApi } from '../api/policiesApi';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Shield,
  Download,
  History,
  Edit,
  UserCheck,
  CheckCircle2,
  FileText,
  Building2,
  Users,
  Clock,
  ShieldCheck,
  X,
  Eye,
  ExternalLink,
  Paperclip,
  Check,
  Copy,
  Lock,
  FileSignature,
} from 'lucide-react';
import { toast } from 'sonner';

interface PolicyReaderProps {
  policy: RolePolicyRecord;
  canManage?: boolean;
  onEdit?: (policy: RolePolicyRecord) => void;
  onManageAssignment?: (policy: RolePolicyRecord) => void;
  onViewVersionHistory?: (policy: RolePolicyRecord) => void;
  onAcknowledge?: (policy: RolePolicyRecord) => void;
  onClose?: () => void;
}

const formatFileSize = (bytes?: number | null) => {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

export const PolicyReader: React.FC<PolicyReaderProps> = ({
  policy,
  canManage = false,
  onEdit,
  onManageAssignment,
  onViewVersionHistory,
  onAcknowledge,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'content' | 'attachments' | 'assignment' | 'acknowledgement' | 'audit'>('content');
  const [showFullPdfModal, setShowFullPdfModal] = useState(false);
  const [showESignModal, setShowESignModal] = useState(false);
  const [showVersionHistoryModal, setShowVersionHistoryModal] = useState(false);
  const [versionHistory, setVersionHistory] = useState<PolicyVersionRecord[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [attachments, setAttachments] = useState<PolicyAttachment[]>(policy.attachments || []);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string; type: string } | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  useEffect(() => {
    if (policy.id) {
      setLoadingAttachments(true);
      policiesApi.getAttachments(policy.id)
        .then((atts) => setAttachments(atts))
        .catch((err) => {
          console.error('Failed to fetch policy attachments:', err);
          if (policy.attachments) setAttachments(policy.attachments);
        })
        .finally(() => setLoadingAttachments(false));
    }
  }, [policy.id, policy.version]);

  const handleDownload = () => {
    if (policy.fileUrl) {
      const absoluteUrl = policy.fileUrl.startsWith('/')
        ? `${window.location.protocol}//${window.location.host}${policy.fileUrl}`
        : policy.fileUrl;
      const a = document.createElement('a');
      a.href = absoluteUrl;
      a.download = policy.fileName || `${policy.title}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success('Downloading Policy PDF Document', {
        description: policy.fileName || `${policy.title}.pdf`,
      });
    } else {
      toast.info('No uploaded PDF attached to this policy.');
    }
  };

  const handleOpenVersionHistory = async () => {
    if (onViewVersionHistory) {
      onViewVersionHistory(policy);
      return;
    }

    try {
      setLoadingVersions(true);
      setShowVersionHistoryModal(true);
      const list = await policiesApi.getVersionHistory(policy.id);
      setVersionHistory(list);
    } catch (err) {
      console.error('Failed to load version history:', err);
      toast.error('Could not load policy version history.');
    } finally {
      setLoadingVersions(false);
    }
  };

  return (
    <div className="bg-card text-foreground border border-border rounded-xl shadow-lg overflow-hidden flex flex-col lg:flex-row min-h-[600px]">
      
      {/* Left Information Panel */}
      <div className="lg:w-1/3 bg-muted/20 border-r border-border p-6 space-y-6 flex flex-col justify-between">
        <div className="space-y-5">
          {onClose && (
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Policy Information</span>
              <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Policy Header Icon & Name */}
          <div className="space-y-3 text-center sm:text-left">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center mx-auto sm:mx-0">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap pb-1">
                <span className="text-[10px] font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                  {policy.documentRef || `POL-${String(policy.id).padStart(3, '0')}`}
                </span>
                <Badge variant="outline" className="text-[10px] uppercase font-bold">
                  Version {policy.version || '1.0'}
                </Badge>
              </div>
              <h2 className="text-base font-bold text-foreground leading-tight">{policy.title}</h2>
            </div>
            <PolicyStatusBadge status={policy.status} />
          </div>

          {/* Metadata Cards */}
          <div className="space-y-2.5 text-xs font-medium pt-2 border-t border-border">
            <div className="flex items-center justify-between py-1 border-b border-border/50">
              <span className="text-muted-foreground">Category</span>
              <span className="font-bold text-foreground">{policy.category || 'HR Policies'}</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-border/50">
              <span className="text-muted-foreground">Effective Date</span>
              <span className="font-bold text-foreground">
                {policy.effectiveDate ? new Date(policy.effectiveDate).toLocaleDateString() : 'Immediate'}
              </span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-border/50">
              <span className="text-muted-foreground">Review Date</span>
              <span className="font-bold text-foreground">
                {policy.reviewDate ? new Date(policy.reviewDate).toLocaleDateString() : 'Annual'}
              </span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-border/50">
              <span className="text-muted-foreground">Version Number</span>
              <span className="font-bold text-primary font-mono">{policy.version || 'v1.0'}</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-border/50">
              <span className="text-muted-foreground">Document Source</span>
              <span className="font-bold text-emerald-600 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5" /> {policy.fileUrl ? 'PDF Attached' : 'Standard'}
              </span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-muted-foreground">Your Status</span>
              <span className={`font-bold ${policy.policyAccepted || policy.isAcknowledged ? 'text-emerald-500' : 'text-amber-500'}`}>
                {policy.policyAccepted || policy.isAcknowledged ? 'Acknowledged' : 'Pending Sign-Off'}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-2">
            {policy.fileUrl && (
              <Button
                variant="default"
                size="sm"
                onClick={() => setShowFullPdfModal(true)}
                className="w-full text-xs font-bold gap-1.5 h-9 bg-primary text-primary-foreground"
              >
                <Eye className="w-3.5 h-3.5" /> View PDF Fullscreen
              </Button>
            )}

            {policy.allowDownload !== false && policy.fileUrl && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                className="w-full text-xs font-bold gap-1.5 h-9"
              >
                <Download className="w-3.5 h-3.5 text-primary" /> Download PDF Document
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenVersionHistory}
              className="w-full text-xs font-bold gap-1.5 h-9"
            >
              <History className="w-3.5 h-3.5 text-slate-500" /> View Version History
            </Button>
          </div>
        </div>

        {/* Admin Manage Actions */}
        {canManage && (
          <div className="pt-4 border-t border-border space-y-2">
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Administrative Controls</div>
            <div className="grid grid-cols-2 gap-2">
              {onEdit && (
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => onEdit(policy)}
                  className="text-xs font-bold h-8 gap-1 bg-primary"
                >
                  <Edit className="w-3.5 h-3.5" /> Edit Policy
                </Button>
              )}
              {onManageAssignment && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onManageAssignment(policy)}
                  className="text-xs font-bold h-8 gap-1"
                >
                  <Users className="w-3.5 h-3.5 text-primary" /> Assignment
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Right Main Content Area */}
      <div className="lg:w-2/3 p-6 sm:p-8 flex flex-col justify-between space-y-6">
        
        {/* Tab Header */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-border pb-3 overflow-x-auto">
            <Button
              type="button"
              variant={activeTab === 'content' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('content')}
              className="h-8 text-xs font-bold gap-1.5"
            >
              <FileText className="w-3.5 h-3.5" /> Policy Document (PDF)
            </Button>
            <Button
              type="button"
              variant={activeTab === 'attachments' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('attachments')}
              className="h-8 text-xs font-bold gap-1.5 relative"
            >
              <Paperclip className="w-3.5 h-3.5 text-primary" /> Attachments
              {attachments.length > 0 && (
                <span className="ml-1 bg-primary/20 text-primary px-1.5 py-0.5 rounded-full text-[10px] font-bold">
                  {attachments.length}
                </span>
              )}
            </Button>
            <Button
              type="button"
              variant={activeTab === 'assignment' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('assignment')}
              className="h-8 text-xs font-bold gap-1.5"
            >
              <Users className="w-3.5 h-3.5" /> Target Scope
            </Button>
            {canManage && (
              <Button
                type="button"
                variant={activeTab === 'acknowledgement' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('acknowledgement')}
                className="h-8 text-xs font-bold gap-1.5"
              >
                <UserCheck className="w-3.5 h-3.5 text-emerald-500" /> Acknowledgements
              </Button>
            )}
            {canManage && (
              <Button
                type="button"
                variant={activeTab === 'audit' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('audit')}
                className="h-8 text-xs font-bold gap-1.5"
              >
                <Clock className="w-3.5 h-3.5 text-slate-500" /> Audit Log
              </Button>
            )}
          </div>

          {/* Tab 1: Policy PDF Document Viewer */}
          {activeTab === 'content' && (
            <div className="space-y-4 font-sans">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <div>
                  <span className="text-[10px] font-extrabold text-primary tracking-widest uppercase">
                    Official Governance Document
                  </span>
                  <h1 className="text-base sm:text-lg font-black uppercase text-foreground leading-tight">
                    {policy.title}
                  </h1>
                </div>

                {policy.fileUrl && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowFullPdfModal(true)}
                    className="h-8 text-xs font-bold gap-1.5 text-primary border-primary/30"
                  >
                    <Eye className="w-3.5 h-3.5" /> Fullscreen View
                  </Button>
                )}
              </div>

              {policy.fileUrl ? (
                <PolicyPdfViewer
                  fileUrl={policy.fileUrl}
                  fileName={policy.fileName}
                  fileSize={policy.fileSize}
                  title={policy.title}
                  version={policy.version}
                  height="h-[520px]"
                  isSigned={Boolean(policy.signatureStatus === 'SIGNED' || policy.policyAccepted || policy.isAcknowledged)}
                  signedByName={policy.signedByName || policy.employeeName}
                  signedAt={policy.policyAcceptedAt || policy.signedAt}
                  signatureProvider={policy.signatureProvider || 'Direct Sign-off'}
                />
              ) : (
                <div className="space-y-4 pt-2">
                  {policy.sections && policy.sections.length > 0 ? (
                    policy.sections.map((sec, idx) => (
                      <div key={sec.id || idx} className="space-y-1.5">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          {sec.title}
                        </h3>
                        <div className="text-xs leading-relaxed text-muted-foreground pl-5 whitespace-pre-line">
                          {sec.content}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-12 text-center space-y-2 border border-dashed border-border rounded-xl bg-muted/20">
                      <FileText className="w-8 h-8 text-muted-foreground mx-auto" />
                      <p className="text-xs font-bold text-foreground">No Document File Attached</p>
                      <p className="text-[11px] text-muted-foreground">Admin has not uploaded a PDF for this policy.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Supporting Attachments */}
          {activeTab === 'attachments' && (
            <div className="space-y-4 text-xs font-medium">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <div>
                  <span className="text-[10px] font-extrabold text-primary tracking-widest uppercase">
                    Version {policy.version || '1.0'} Attachments
                  </span>
                  <h3 className="text-sm font-bold text-foreground">
                    Policy Documents & Supporting Materials ({attachments.length})
                  </h3>
                </div>
              </div>

              {loadingAttachments ? (
                <div className="p-8 text-center text-xs text-muted-foreground space-y-2">
                  <Clock className="w-6 h-6 animate-spin text-primary mx-auto" />
                  <p>Loading supporting policy attachments...</p>
                </div>
              ) : attachments.length > 0 ? (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {attachments.map((att) => {
                    const ext = (att.fileType || att.fileName.split('.').pop() || '').toUpperCase();
                    const downloadUrl = att.id
                      ? policiesApi.getAttachmentDownloadUrl(policy.id, att.id)
                      : att.storagePath.startsWith('/')
                      ? `${window.location.protocol}//${window.location.host}${att.storagePath}`
                      : att.storagePath;

                    return (
                      <div
                        key={att.id || att.uuid || att.fileName}
                        className={`p-4 rounded-xl border transition-all space-y-2.5 ${
                          att.isMainDocument
                            ? 'bg-primary/5 border-primary/30 shadow-2xs'
                            : 'bg-muted/20 border-border hover:border-border/80'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="h-9 w-9 rounded-lg bg-background border border-border flex items-center justify-center shrink-0">
                              <Paperclip className="w-4 h-4 text-primary" />
                            </div>
                            <div className="min-w-0 space-y-0.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-foreground text-xs truncate max-w-[280px]">
                                  {att.fileName}
                                </span>
                                <Badge
                                  variant="outline"
                                  className="text-[9px] font-bold uppercase font-mono px-1.5 py-0"
                                >
                                  {ext}
                                </Badge>
                                {att.isMainDocument && (
                                  <Badge className="bg-primary/20 text-primary border border-primary/30 text-[9px] font-bold uppercase">
                                    Main Policy Document
                                  </Badge>
                                )}
                              </div>

                              <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
                                <span>Size: <strong className="text-foreground">{formatFileSize(att.fileSize)}</strong></span>
                                {att.uploadedByName && (
                                  <span>Uploaded by: <strong className="text-foreground">{att.uploadedByName}</strong></span>
                                )}
                                {att.uploadedAt && (
                                  <span>Date: <strong className="text-foreground">{new Date(att.uploadedAt).toLocaleDateString()}</strong></span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <a
                              href={downloadUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 h-8 px-2.5 rounded-md text-xs font-bold bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20"
                            >
                              <Download className="w-3.5 h-3.5" /> Download
                            </a>
                          </div>
                        </div>

                        {att.checksum && (
                          <div className="flex items-center justify-between pt-2 border-t border-border/50 text-[10px]">
                            <span className="text-muted-foreground font-mono flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3 text-emerald-500" /> SHA-256: {att.checksum.slice(0, 16)}...{att.checksum.slice(-8)}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(att.checksum || '');
                                setCopiedHash(att.checksum || '');
                                toast.success('SHA-256 Checksum copied to clipboard!');
                                setTimeout(() => setCopiedHash(null), 2000);
                              }}
                              className="text-muted-foreground hover:text-foreground flex items-center gap-1 font-mono font-bold"
                            >
                              {copiedHash === att.checksum ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-500" /> Copied
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" /> Copy Hash
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-10 text-center space-y-2 border border-dashed border-border rounded-xl bg-muted/20">
                  <Paperclip className="w-8 h-8 text-muted-foreground mx-auto opacity-60" />
                  <p className="text-xs font-bold text-foreground">No Additional Attachments</p>
                  <p className="text-[11px] text-muted-foreground">
                    This policy version has only the main document attached.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Assignment Scope */}
          {activeTab === 'assignment' && (
            <div className="space-y-4 text-xs font-medium">
              <div className="font-bold text-foreground">Target Role & Department Scope:</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-2">
                  <div className="font-bold text-foreground flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-primary" /> Assigned Roles
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {(policy.targetRoles || policy.assignedRoles || [policy.roleCode || 'all'])
                      .filter(Boolean)
                      .map((r, idx) => (
                        <Badge key={idx} variant="secondary" className="text-[10px] uppercase font-bold">
                          {String(r || '').replace(/_/g, ' ')}
                        </Badge>
                      ))}
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-2">
                  <div className="font-bold text-foreground flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-primary" /> Assigned Target Types
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {(policy.assignments || []).map((a, i) => (
                      <Badge key={i} variant="outline" className="text-[10px] uppercase font-bold">
                        {a.targetType}: {a.targetId}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Acknowledgements Summary (Admin View) */}
          {activeTab === 'acknowledgement' && (
            <div className="space-y-4 text-xs font-medium">
              <div className="flex items-center justify-between">
                <div className="font-bold text-foreground">Employee Acknowledgement Tracking:</div>
                <Badge variant="outline" className="text-emerald-500 font-bold">
                  {policy.acknowledgementPercentage ?? 100}% Acknowledged
                </Badge>
              </div>
              <div className="p-4 rounded-xl border border-border bg-muted/20 text-muted-foreground space-y-1">
                <p>
                  Acknowledged Count: <strong>{policy.acknowledgedCount ?? 0}</strong> employees.
                </p>
                <p>
                  Pending Count: <strong>{policy.pendingCount ?? 0}</strong> employees.
                </p>
              </div>
            </div>
          )}

          {/* Tab 4: Audit Log */}
          {activeTab === 'audit' && (
            <div className="space-y-3 text-xs">
              <div className="font-bold text-foreground">Policy Governance Audit Log:</div>
              <div className="border border-border rounded-xl p-4 bg-muted/20 space-y-2 text-muted-foreground">
                <div className="flex items-center justify-between border-b border-border/50 pb-2">
                  <span>Initial Policy Creation</span>
                  <span className="font-bold text-foreground">{policy.createdAt ? new Date(policy.createdAt).toLocaleDateString() : 'System'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Latest Version Published ({policy.version || 'v1.0'})</span>
                  <span className="font-bold text-foreground">{policy.updatedAt ? new Date(policy.updatedAt).toLocaleDateString() : 'System'}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer & Employee Sign-Off Actions */}
        <div className="pt-4 border-t border-border">
          {policy.signatureStatus === 'SIGNED' || policy.policyAccepted ? (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="space-y-0.5 text-center sm:text-left">
                <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 justify-center sm:justify-start">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Policy Signed & Governance Compliance Complete
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Signed version <strong className="text-foreground">v{policy.version}</strong> on{' '}
                  <span className="font-bold text-foreground">{policy.policyAcceptedAt ? new Date(policy.policyAcceptedAt).toLocaleString() : 'Recorded'}</span>.
                </p>
              </div>

              {policy.signatureRecord?.id && (
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(policiesApi.getSignedDocumentUrl(policy.signatureRecord!.id), '_blank')}
                    className="h-8 text-xs font-bold gap-1"
                  >
                    <FileText className="w-3.5 h-3.5 text-emerald-600" /> Signed PDF
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(policiesApi.getSignedEvidenceUrl(policy.signatureRecord!.id), '_blank')}
                    className="h-8 text-xs font-bold gap-1"
                  >
                    <Download className="w-3.5 h-3.5" /> Evidence
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="space-y-0.5 text-center sm:text-left">
                <div className="text-xs font-bold text-foreground flex items-center gap-1.5 justify-center sm:justify-start">
                  <ShieldCheck className="w-4 h-4 text-primary" /> Signature / Compliance Requirement
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {policy.signatureMode === 'BOTH'
                    ? 'This policy requires both Checkbox Acknowledgement and a Digital E-Signature.'
                    : policy.signatureMode === 'E_SIGNATURE'
                    ? 'This policy requires an official cryptographic E-Signature.'
                    : 'Mandatory role compliance acknowledgement required.'}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* Mode: ACKNOWLEDGEMENT or BOTH (first step) */}
                {(policy.signatureMode === 'ACKNOWLEDGEMENT' || (!policy.policyAccepted && policy.signatureMode === 'BOTH')) && onAcknowledge && (
                  <Button
                    size="sm"
                    onClick={() => onAcknowledge(policy)}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs h-9 px-4 gap-1.5 shadow-sm"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Acknowledge Policy
                  </Button>
                )}

                {/* Mode: E_SIGNATURE or BOTH (second step after acknowledgement) */}
                {(policy.signatureMode === 'E_SIGNATURE' || (policy.signatureMode === 'BOTH' && policy.policyAccepted)) && (
                  <Button
                    size="sm"
                    onClick={() => setShowESignModal(true)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 px-5 gap-1.5 shadow-sm"
                  >
                    <FileSignature className="w-4 h-4" /> Sign Policy via E-Signature
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>


      </div>

      {/* Fullscreen PDF Preview Modal */}
      {policy.fileUrl && (
        <PolicyPdfModal
          isOpen={showFullPdfModal}
          onClose={() => setShowFullPdfModal(false)}
          fileUrl={policy.fileUrl}
          fileName={policy.fileName}
          fileSize={policy.fileSize}
          title={policy.title}
          documentRef={policy.documentRef}
          version={policy.version}
        />
      )}

      {/* Version History Modal */}
      <Dialog open={showVersionHistoryModal} onOpenChange={setShowVersionHistoryModal}>
        <DialogContent className="max-w-2xl w-[90vw] bg-card text-foreground border-border rounded-2xl">
          <DialogHeader className="border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-primary" />
              <DialogTitle className="text-base font-bold">Policy Document Version History</DialogTitle>
            </div>
            <p className="text-xs text-muted-foreground">
              Complete revision log of uploaded documents and version updates for {policy.title}.
            </p>
          </DialogHeader>

          <div className="py-4 space-y-3 max-h-[60vh] overflow-y-auto">
            {loadingVersions ? (
              <div className="p-8 text-center text-xs text-muted-foreground space-y-2">
                <Clock className="w-6 h-6 animate-spin text-primary mx-auto" />
                <p>Loading document version records...</p>
              </div>
            ) : versionHistory.length > 0 ? (
              versionHistory.map((ver) => (
                <div key={ver.id} className="p-4 rounded-xl border border-border bg-muted/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono font-bold text-xs">
                        Version {ver.version || '1.0'}
                      </Badge>
                      <span className="text-xs font-bold text-foreground">{ver.title}</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground font-mono">
                      {ver.createdAt ? new Date(ver.createdAt).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>

                  {ver.changeDescription && (
                    <p className="text-xs text-muted-foreground italic pl-2 border-l-2 border-primary/40">
                      "{ver.changeDescription}"
                    </p>
                  )}

                  {ver.fileUrl && (
                    <div className="flex items-center justify-between pt-2 text-xs border-t border-border/50">
                      <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
                        <FileText className="w-3.5 h-3.5 text-emerald-500" />
                        {ver.fileName || 'Policy Document.pdf'}
                      </span>
                      <a
                        href={ver.fileUrl.startsWith('/') ? `${window.location.protocol}//${window.location.host}${ver.fileUrl}` : ver.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline font-bold flex items-center gap-1 text-[11px]"
                      >
                        View Version PDF <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-xs text-muted-foreground space-y-1">
                <FileText className="w-6 h-6 mx-auto text-muted-foreground opacity-60" />
                <p className="font-bold">Current Version 1.0</p>
                <p>Initial published document record.</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* E-Signature Execution Modal */}
      <PolicyESignModal
        isOpen={showESignModal}
        onClose={() => setShowESignModal(false)}
        policyId={policy.id}
        policyTitle={policy.title}
        policyVersion={policy.version || '1.0'}
        onSignatureSuccess={() => {
          if (onAcknowledge) onAcknowledge(policy);
        }}
      />
    </div>
  );
};

