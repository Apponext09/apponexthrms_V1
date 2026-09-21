import React from 'react';
import { Button } from '@/components/ui/button';
import type { PolicySection, TargetAssignment } from '../types/policy';
import {
  ShieldCheck,
  Building2,
  Users,
  Bell,
  FileCheck,
  Download,
  ArrowLeft,
  Save,
  CheckCircle2,
  Eye,
  FileText,
} from 'lucide-react';
import { PolicyPdfModal } from './PolicyPdfModal';

interface PolicyReviewPublishStepProps {
  policyInfo: {
    title: string;
    documentRef: string;
    category: string;
    description: string;
    effectiveDate: string;
    reviewDate: string;
    expiryDate: string;
    status: string;
  };
  sections: PolicySection[];
  assignments: TargetAssignment[];
  attachedFile?: { fileUrl?: string; fileName?: string; fileSize?: number; fileType?: string } | null;
  attachments?: any[];
  options: {
    sendNotification: boolean;
    requireAcknowledgement: boolean;
    allowDownload: boolean;
  };
  onBack: () => void;
  onSaveDraft: () => void;
  onPublish: () => void;
  isSubmitting?: boolean;
}

export const PolicyReviewPublishStep: React.FC<PolicyReviewPublishStepProps> = ({
  policyInfo,
  sections,
  assignments,
  attachedFile,
  attachments = [],
  options,
  onBack,
  onSaveDraft,
  onPublish,
  isSubmitting = false,
}) => {
  const [showPreviewModal, setShowPreviewModal] = React.useState(false);
  const [previewFileUrl, setPreviewFileUrl] = React.useState<string | null>(null);

  const roleTargets = assignments
    .filter((a) => a.targetType === 'role')
    .map((a) => a.targetId.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()));

  const deptTargets = assignments
    .filter((a) => a.targetType === 'department')
    .map((a) => (a.targetId === 'all' ? 'All Departments' : `Dept #${a.targetId}`));

  const empTargets = assignments
    .filter((a) => a.targetType === 'employee')
    .map((a) => (a.targetId === 'all' ? 'All Employees' : `Employee #${a.targetId}`));

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-xl p-6 shadow-2xs space-y-6">
        <div>
          <h3 className="text-base font-bold text-foreground">Step 4: Review & Publish</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Review complete policy configuration, target assignment scope, and distribution settings before publishing.
          </p>
        </div>

        {/* Informational Callout */}
        <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 space-y-1.5 text-xs">
          <div className="font-bold text-foreground flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-primary" /> Ready for Governance Deployment
          </div>
          <p className="text-muted-foreground leading-relaxed">
            Once published, this policy will immediately become visible to authorized users matching target roles/departments. If notifications are enabled, target employees will receive an automated alert.
          </p>
        </div>

        {/* Section 1: Policy Information */}
        <div className="border border-border rounded-xl p-4 bg-background space-y-3">
          <div className="text-xs font-bold text-foreground uppercase tracking-wider border-b border-border pb-2">
            1. Policy Metadata Summary
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-medium">
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase font-bold">Policy Name</span>
              <span className="font-bold text-foreground">{policyInfo.title || 'Untitled Policy'}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase font-bold">Document Ref ID</span>
              <span className="font-bold text-primary font-mono">{policyInfo.documentRef || 'POL-000'}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase font-bold">Category</span>
              <span className="font-bold text-foreground">{policyInfo.category}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase font-bold">Effective Date</span>
              <span className="font-bold text-foreground">{policyInfo.effectiveDate || 'Immediate'}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase font-bold">Review Date</span>
              <span className="font-bold text-foreground">{policyInfo.reviewDate || 'N/A'}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase font-bold">Expiry Date</span>
              <span className="font-bold text-foreground">{policyInfo.expiryDate || 'None'}</span>
            </div>
          </div>
        </div>

        {/* Section 2: Assigned Scope */}
        <div className="border border-border rounded-xl p-4 bg-background space-y-3">
          <div className="text-xs font-bold text-foreground uppercase tracking-wider border-b border-border pb-2">
            2. Target Assignment Scope
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="space-y-1 p-3 bg-muted/20 rounded-lg">
              <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-primary" /> Target Roles ({roleTargets.length})
              </span>
              <div className="font-bold text-foreground flex flex-wrap gap-1 pt-1">
                {roleTargets.length > 0 ? (
                  roleTargets.map((r) => (
                    <span key={r} className="bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded text-[10px]">
                      {r}
                    </span>
                  ))
                ) : (
                  <span className="text-muted-foreground italic">None selected</span>
                )}
              </div>
            </div>

            <div className="space-y-1 p-3 bg-muted/20 rounded-lg">
              <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                <Building2 className="w-3 h-3 text-primary" /> Target Departments ({deptTargets.length})
              </span>
              <div className="font-bold text-foreground flex flex-wrap gap-1 pt-1">
                {deptTargets.length > 0 ? (
                  deptTargets.map((d) => (
                    <span key={d} className="bg-muted text-foreground border border-border px-2 py-0.5 rounded text-[10px]">
                      {d}
                    </span>
                  ))
                ) : (
                  <span className="text-muted-foreground italic">All Departments</span>
                )}
              </div>
            </div>

            <div className="space-y-1 p-3 bg-muted/20 rounded-lg">
              <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                <Users className="w-3 h-3 text-primary" /> Target Employees ({empTargets.length})
              </span>
              <div className="font-bold text-foreground flex flex-wrap gap-1 pt-1">
                {empTargets.length > 0 ? (
                  empTargets.map((e) => (
                    <span key={e} className="bg-muted text-foreground border border-border px-2 py-0.5 rounded text-[10px]">
                      {e}
                    </span>
                  ))
                ) : (
                  <span className="text-muted-foreground italic">All Employees</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Document Source & Attachments */}
        <div className="border border-border rounded-xl p-4 bg-background space-y-3">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <div className="text-xs font-bold text-foreground uppercase tracking-wider">
              3. Policy Documents & Attachments ({attachments.length + (attachedFile?.fileUrl ? 1 : 0)})
            </div>
            {attachedFile?.fileUrl && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setPreviewFileUrl(attachedFile.fileUrl || null);
                  setShowPreviewModal(true);
                }}
                className="h-7 text-xs font-bold gap-1 text-emerald-600 border-emerald-500/30"
              >
                <Eye className="w-3.5 h-3.5" /> Preview Main PDF
              </Button>
            )}
          </div>

          {attachedFile?.fileUrl && (
            <div className="flex items-center justify-between p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-emerald-600 shrink-0" />
                <div className="truncate">
                  <div className="font-bold text-foreground truncate">{attachedFile.fileName || 'Main Policy Document.pdf'}</div>
                  <div className="text-[10px] text-emerald-600 font-bold">Main Source of Truth Document</div>
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                variant="default"
                onClick={() => {
                  setPreviewFileUrl(attachedFile.fileUrl || null);
                  setShowPreviewModal(true);
                }}
                className="h-7 text-xs font-bold gap-1 bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
              >
                <Eye className="w-3.5 h-3.5" /> View PDF
              </Button>
            </div>
          )}

          {attachments.length > 0 && (
            <div className="space-y-2 pt-1">
              <div className="text-[11px] font-bold text-muted-foreground uppercase">Supporting Attachments</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {attachments.map((att, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 bg-muted/20 border border-border rounded-lg">
                    <div className="flex items-center gap-2 min-w-0 truncate">
                      <FileText className="w-4 h-4 text-primary shrink-0" />
                      <span className="font-semibold text-foreground truncate">{att.fileName}</span>
                    </div>
                    {att.storagePath && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setPreviewFileUrl(att.storagePath);
                          setShowPreviewModal(true);
                        }}
                        className="h-6 px-2 text-[10px] font-bold gap-1 text-primary"
                      >
                        <Eye className="w-3 h-3" /> View
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal for PDF Preview */}
        {attachedFile?.fileUrl && (
          <PolicyPdfModal
            isOpen={showPreviewModal}
            onClose={() => setShowPreviewModal(false)}
            fileUrl={attachedFile.fileUrl}
            fileName={attachedFile.fileName}
            fileSize={attachedFile.fileSize}
            title={policyInfo.title || 'Policy Document Preview'}
            documentRef={policyInfo.documentRef || 'POL-PREVIEW'}
          />
        )}

        {/* Section 4: Configuration Options */}
        <div className="grid grid-cols-3 gap-3 text-xs font-semibold p-3 bg-muted/30 rounded-xl border border-border">
          <div className="flex items-center gap-2">
            <Bell className={`w-4 h-4 ${options.sendNotification ? 'text-primary' : 'text-muted-foreground'}`} />
            <span>Notification: {options.sendNotification ? 'Enabled' : 'Disabled'}</span>
          </div>
          <div className="flex items-center gap-2">
            <FileCheck className={`w-4 h-4 ${options.requireAcknowledgement ? 'text-emerald-500' : 'text-muted-foreground'}`} />
            <span>Sign-Off: {options.requireAcknowledgement ? 'Mandatory' : 'Optional'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Download className={`w-4 h-4 ${options.allowDownload ? 'text-blue-500' : 'text-muted-foreground'}`} />
            <span>Download: {options.allowDownload ? 'Allowed' : 'Restricted'}</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-2">
        <Button type="button" variant="outline" size="sm" onClick={onBack} className="h-9 px-4 text-xs font-bold gap-1.5">
          <ArrowLeft className="w-3.5 h-3.5" /> Back: Assignment
        </Button>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onSaveDraft}
            disabled={isSubmitting}
            className="h-9 px-4 text-xs font-bold gap-1.5"
          >
            <Save className="w-3.5 h-3.5" /> Save as Draft
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={onPublish}
            disabled={isSubmitting}
            className="h-9 px-6 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 shadow-sm"
          >
            <ShieldCheck className="w-4 h-4" /> {isSubmitting ? 'Publishing...' : 'Publish Policy Now'}
          </Button>
        </div>
      </div>
    </div>
  );
};
