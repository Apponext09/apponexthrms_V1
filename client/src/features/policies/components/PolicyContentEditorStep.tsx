import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { PolicySection } from '../types/policy';
import {
  Plus,
  Trash2,
  ArrowLeft,
  ArrowRight,
  Save,
  Eye,
  Bold,
  Italic,
  List,
  ListOrdered,
  UploadCloud,
  CheckCircle2,
  FileText,
  ShieldCheck,
  FileCode,
} from 'lucide-react';
import { toast } from 'sonner';
import { policiesApi } from '../api/policiesApi';
import { PolicyPdfModal } from './PolicyPdfModal';

interface PolicyContentEditorStepProps {
  sections: PolicySection[];
  onChangeSections: (sections: PolicySection[]) => void;
  attachedFile?: { fileUrl?: string; fileName?: string; fileSize?: number; fileType?: string } | null;
  onFileUploaded?: (fileInfo: { fileUrl: string; fileName: string; fileSize?: number; fileType?: string } | null) => void;
  attachments?: any[];
  onAttachmentsChange?: (attachments: any[]) => void;
  onBack: () => void;
  onNext: () => void;
  onSaveDraft: () => void;
  isSubmitting?: boolean;
}

export const PolicyContentEditorStep: React.FC<PolicyContentEditorStepProps> = ({
  sections,
  onChangeSections,
  attachedFile,
  onFileUploaded,
  attachments = [],
  onAttachmentsChange,
  onBack,
  onNext,
  onSaveDraft,
  isSubmitting = false,
}) => {
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewFileUrl, setPreviewFileUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [showCustomTextEditor, setShowCustomTextEditor] = useState(sections.length > 0);

  const handleFileUpload = async (file: File) => {
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['pdf', 'docx', 'doc'].includes(ext || '')) {
      toast.error('Only PDF and DOCX files are allowed for main document.');
      return;
    }

    try {
      setIsUploading(true);
      const data = await policiesApi.uploadPolicyDocument(file);
      toast.success(`Main document "${file.name}" uploaded successfully!`);
      if (onFileUploaded) {
        onFileUploaded({
          fileUrl: data.fileUrl,
          fileName: data.fileName || file.name,
          fileSize: data.fileSize || file.size,
          fileType: data.fileType || file.type,
        });
      }
    } catch (err: any) {
      console.error('Policy file upload error:', err);
      toast.error(err?.response?.data?.message || 'Failed to upload document file. Please retry.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSupportingAttachmentUpload = async (file: File) => {
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase();
    const allowed = ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'];
    if (!allowed.includes(ext || '')) {
      toast.error(`Format .${ext} is not allowed. Supported formats: PDF, DOC, DOCX, JPG, JPEG, PNG`);
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      toast.error('File size exceeds maximum allowed limit of 50MB');
      return;
    }

    try {
      setIsUploadingAttachment(true);
      const data = await policiesApi.uploadAttachment(file);
      toast.success(`Supporting attachment "${file.name}" uploaded!`);
      
      const newAttachment = {
        fileName: data.fileName || file.name,
        fileType: data.fileType || file.type || ext || 'file',
        fileSize: data.fileSize || file.size,
        storagePath: data.storagePath || data.fileUrl,
        checksum: data.checksum || '',
        isMainDocument: false,
        uploadedAt: new Date().toISOString(),
      };

      if (onAttachmentsChange) {
        onAttachmentsChange([...attachments, newAttachment]);
      }
    } catch (err: any) {
      console.error('Attachment upload error:', err);
      toast.error(err?.response?.data?.message || 'Failed to upload supporting attachment.');
    } finally {
      setIsUploadingAttachment(false);
    }
  };

  const handleRemoveAttachment = (index: number) => {
    if (!onAttachmentsChange) return;
    const updated = attachments.filter((_, idx) => idx !== index);
    onAttachmentsChange(updated);
    toast.success('Attachment removed');
  };

  const handleSetMainAttachment = (index: number) => {
    if (!onAttachmentsChange) return;
    const target = attachments[index];
    if (!target) return;

    const updated = attachments.map((att, idx) => ({
      ...att,
      isMainDocument: idx === index,
    }));

    onAttachmentsChange(updated);

    if (onFileUploaded) {
      onFileUploaded({
        fileUrl: target.storagePath,
        fileName: target.fileName,
        fileSize: target.fileSize,
        fileType: target.fileType,
      });
    }

    toast.success(`"${target.fileName}" is now set as Main Policy Document`);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleAddSection = () => {
    const nextIdx = sections.length + 1;
    const newSec: PolicySection = {
      id: `sec_${Date.now()}`,
      title: `${nextIdx}. SECTION TITLE`,
      content: '',
    };
    onChangeSections([...sections, newSec]);
  };

  const handleUpdateSection = (id: string, field: 'title' | 'content', val: string) => {
    const updated = sections.map((sec) => (sec.id === id ? { ...sec, [field]: val } : sec));
    onChangeSections(updated);
  };

  const handleRemoveSection = (id: string) => {
    onChangeSections(sections.filter((sec) => sec.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-xl p-6 shadow-2xs space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" /> Step 2: Policy Content & Attachments
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Upload the primary Main Policy Document and supporting attachments (PDF, DOCX, JPG, PNG).
            </p>
          </div>

          {attachedFile?.fileUrl && (
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={() => {
                setPreviewFileUrl(attachedFile.fileUrl || null);
                setShowPreviewModal(true);
              }}
              className="h-9 text-xs font-bold gap-1.5 bg-primary text-primary-foreground"
            >
              <Eye className="w-4 h-4" /> Preview Main PDF
            </Button>
          )}
        </div>

        {/* Primary PDF Upload Box */}
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
            dragActive
              ? 'border-primary bg-primary/10'
              : attachedFile?.fileUrl
              ? 'border-emerald-500/50 bg-emerald-500/5'
              : 'border-border bg-muted/20 hover:border-primary/50'
          }`}
        >
          {isUploading ? (
            <div className="py-6 space-y-3">
              <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
              <div className="text-xs font-bold text-primary">Uploading Main Policy Document...</div>
              <p className="text-[11px] text-muted-foreground">Please wait while your document file is saved.</p>
            </div>
          ) : attachedFile?.fileUrl ? (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-background border border-emerald-500/40 rounded-xl shadow-xs">
              <div className="flex items-center gap-3 text-left overflow-hidden">
                <div className="h-11 w-11 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="truncate">
                  <div className="text-sm font-extrabold text-foreground truncate flex items-center gap-2">
                    {attachedFile.fileName || 'Uploaded Policy Document.pdf'}
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-500/20 text-emerald-600 rounded-full uppercase">
                      Main Document
                    </span>
                  </div>
                  <div className="text-xs text-emerald-600 font-bold flex items-center gap-1.5 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Source of Truth Document Saved
                    {attachedFile.fileSize && (
                      <span className="text-muted-foreground font-mono font-normal ml-1">
                        ({(attachedFile.fileSize / 1024).toFixed(1)} KB)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setPreviewFileUrl(attachedFile.fileUrl || null);
                    setShowPreviewModal(true);
                  }}
                  className="h-8 text-xs font-bold gap-1.5 border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10"
                >
                  <Eye className="w-3.5 h-3.5" /> Preview PDF
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onFileUploaded?.(null)}
                  className="h-8 px-2 text-xs font-bold text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Replace Main File
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3 py-4">
              <UploadCloud className="w-10 h-10 text-primary mx-auto opacity-80 animate-bounce" />
              <div className="space-y-1">
                <div className="text-sm font-bold text-foreground">Upload Main Policy Document (PDF / DOCX)</div>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  Upload the primary policy document. Supported formats: PDF, DOC, DOCX (Max 50MB).
                </p>
              </div>
              <input
                type="file"
                accept=".pdf,.docx,.doc"
                className="hidden"
                id="policy_doc_file"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileUpload(e.target.files[0]);
                  }
                }}
              />
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={() => document.getElementById('policy_doc_file')?.click()}
                className="h-9 text-xs font-bold gap-2 px-5 bg-primary text-primary-foreground"
              >
                <FileText className="w-4 h-4" /> Browse & Upload Main PDF
              </Button>
            </div>
          )}
        </div>

        {/* Supporting Attachments Section */}
        <div className="space-y-4 pt-2 border-t border-border">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <UploadCloud className="w-4 h-4 text-primary" /> Supporting Attachments & Documents
              </h4>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Add supplementary PDFs, DOCX files, guidelines, or diagrams associated with this policy version.
              </p>
            </div>

            <div>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                className="hidden"
                id="supporting_attachment_input"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleSupportingAttachmentUpload(e.target.files[0]);
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isUploadingAttachment}
                onClick={() => document.getElementById('supporting_attachment_input')?.click()}
                className="h-8 text-xs font-bold gap-1.5"
              >
                {isUploadingAttachment ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" /> Add Supporting File
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Attachments List */}
          {attachments.length > 0 ? (
            <div className="border border-border rounded-xl overflow-hidden bg-background divide-y divide-border">
              {attachments.map((att, idx) => (
                <div key={att.id || idx} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 text-xs">
                  <div className="flex items-center gap-3 min-w-0 truncate">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <FileText className="w-4.5 h-4.5" />
                    </div>
                    <div className="min-w-0 truncate">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-foreground truncate max-w-[240px]">
                          {att.fileName}
                        </span>
                        {att.isMainDocument ? (
                          <span className="px-2 py-0.5 text-[9px] font-bold bg-emerald-500/20 text-emerald-600 rounded-full uppercase">
                            Main Document
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[9px] font-mono font-bold bg-muted text-muted-foreground rounded-full uppercase">
                            {att.fileType ? att.fileType.split('/')[1] || att.fileType : 'File'}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                        <span>{(att.fileSize / 1024).toFixed(1)} KB</span>
                        {att.checksum && (
                          <span className="font-mono text-[10px] truncate max-w-[150px]" title={`Checksum: ${att.checksum}`}>
                            SHA256: {att.checksum.slice(0, 10)}...
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {!att.isMainDocument && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSetMainAttachment(idx)}
                        className="h-7 px-2 text-[11px] font-bold text-primary hover:bg-primary/10"
                      >
                        Make Main
                      </Button>
                    )}

                    {att.storagePath && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setPreviewFileUrl(att.storagePath);
                          setShowPreviewModal(true);
                        }}
                        className="h-7 px-2 text-[11px] font-bold gap-1"
                      >
                        <Eye className="w-3 h-3" /> View
                      </Button>
                    )}

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveAttachment(idx)}
                      className="h-7 w-7 p-0 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 border border-dashed border-border rounded-xl text-center text-xs text-muted-foreground bg-muted/10">
              No supporting attachments added yet. You can attach supporting PDFs, guidelines, DOCX files, or images.
            </div>
          )}
        </div>

        {/* Optional Section Text Outline */}
        <div className="pt-2 border-t border-border space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <FileCode className="w-4 h-4 text-muted-foreground" /> Optional Section Table of Contents
              </h4>
              <p className="text-[11px] text-muted-foreground">
                Add optional index headings if desired. The uploaded PDF remains the primary document.
              </p>
            </div>
            {!showCustomTextEditor && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowCustomTextEditor(true);
                  if (sections.length === 0) handleAddSection();
                }}
                className="h-8 text-xs font-bold gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Add Section Index
              </Button>
            )}
          </div>

          {showCustomTextEditor && (
            <div className="space-y-3">
              {sections.map((sec, idx) => (
                <div key={sec.id} className="border border-border rounded-xl p-4 bg-background space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between gap-3">
                    <Input
                      value={sec.title}
                      onChange={(e) => handleUpdateSection(sec.id, 'title', e.target.value)}
                      placeholder={`Section ${idx + 1} Title`}
                      className="h-9 text-xs font-bold uppercase bg-card max-w-md"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveSection(sec.id)}
                      className="h-7 w-7 text-rose-500 hover:bg-rose-500/10"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <textarea
                    value={sec.content}
                    onChange={(e) => handleUpdateSection(sec.id, 'content', e.target.value)}
                    placeholder="Section summary or notes (optional)..."
                    rows={2}
                    className="w-full rounded-md border border-input bg-card p-2.5 text-xs font-normal leading-relaxed"
                  />
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddSection}
                className="h-8 text-xs font-bold gap-1.5"
              >
                <Plus className="w-3 h-3" /> Add Another Section Heading
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* PDF Full Preview Modal */}
      {(previewFileUrl || attachedFile?.fileUrl) && (
        <PolicyPdfModal
          isOpen={showPreviewModal}
          onClose={() => {
            setShowPreviewModal(false);
            setPreviewFileUrl(null);
          }}
          fileUrl={previewFileUrl || attachedFile?.fileUrl || ''}
          fileName={attachedFile?.fileName}
          fileSize={attachedFile?.fileSize}
          title="Policy Document Preview"
          documentRef="PREVIEW"
        />
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-2">
        <Button type="button" variant="outline" size="sm" onClick={onBack} className="h-9 px-4 text-xs font-bold gap-1.5">
          <ArrowLeft className="w-3.5 h-3.5" /> Back: Info
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
            <Save className="w-3.5 h-3.5" /> Save Draft
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={onNext}
            className="h-9 px-4 text-xs font-bold bg-primary text-primary-foreground gap-1.5"
          >
            Next: Assignment <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
};
