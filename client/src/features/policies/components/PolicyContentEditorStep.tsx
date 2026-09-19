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
} from 'lucide-react';

const DEFAULT_STANDARD_SECTIONS: PolicySection[] = [
  {
    id: 'sec_1',
    title: '1. POLICY STATEMENT',
    content:
      'ApponextHRMS is committed to establishing clear workplace guidelines, promoting professional integrity, ensuring multi-tenant data confidentiality, and maintaining workplace safety.',
  },
  {
    id: 'sec_2',
    title: '2. PURPOSE & SCOPE',
    content:
      'This Policy applies to all authorized full-time employees, contractors, consultants, interns, and management personnel across all operational departments and locations.',
  },
  {
    id: 'sec_3',
    title: '3. ROLE RESPONSIBILITIES',
    content:
      '• Employees: Execute role duties diligently and comply with all organizational policies.\n• Managers: Oversee team compliance, review policy requests, and maintain audit records.\n• HR & Admins: Provision role access, publish updated guidelines, and enforce policy compliance.',
  },
  {
    id: 'sec_4',
    title: '4. RULES & OPERATIONAL GUIDELINES',
    content:
      '• Workplace Ethics: Respect colleagues, maintain professional communication, and adhere to working hours.\n• IT & Data Security: Protect system credentials, client information, and hardware assets.',
  },
  {
    id: 'sec_5',
    title: '5. COMPLIANCE & DISCIPLINARY ACTIONS',
    content:
      'Non-compliance with company policies may lead to formal review, privilege revocation, or disciplinary proceedings as governed by HR guidelines.',
  },
  {
    id: 'sec_6',
    title: '6. REVIEW & PERIODIC UPDATES',
    content:
      'This Policy will be reviewed periodically by HR Management. Updated versions will require fresh acknowledgement from assigned personnel.',
  },
];

interface PolicyContentEditorStepProps {
  sections: PolicySection[];
  onChangeSections: (sections: PolicySection[]) => void;
  onBack: () => void;
  onNext: () => void;
  onSaveDraft: () => void;
  isSubmitting?: boolean;
}

export const PolicyContentEditorStep: React.FC<PolicyContentEditorStepProps> = ({
  sections,
  onChangeSections,
  onBack,
  onNext,
  onSaveDraft,
  isSubmitting = false,
}) => {
  const [showPreview, setShowPreview] = useState(false);
  const activeSections = sections.length > 0 ? sections : DEFAULT_STANDARD_SECTIONS;

  const handleAddSection = () => {
    const nextIdx = activeSections.length + 1;
    const newSec: PolicySection = {
      id: `sec_${Date.now()}`,
      title: `${nextIdx}. NEW SECTION TITLE`,
      content: 'Enter detailed rules, bullet points, or compliance statements here...',
    };
    onChangeSections([...activeSections, newSec]);
  };

  const handleUpdateSection = (id: string, field: 'title' | 'content', val: string) => {
    const updated = activeSections.map((sec) => (sec.id === id ? { ...sec, [field]: val } : sec));
    onChangeSections(updated);
  };

  const handleRemoveSection = (id: string) => {
    if (activeSections.length <= 1) {
      window.appAlert('A policy must have at least one content section.');
      return;
    }
    onChangeSections(activeSections.filter((sec) => sec.id !== id));
  };

  const handleApplyFormatting = (id: string, symbol: string) => {
    const target = activeSections.find((s) => s.id === id);
    if (!target) return;
    let appended = target.content;
    if (symbol === 'bullet') appended += '\n• ';
    else if (symbol === 'bold') appended += ' **Bold Text** ';
    else if (symbol === 'italic') appended += ' *Italic Text* ';
    else if (symbol === 'num') appended += '\n1. ';
    handleUpdateSection(id, 'content', appended);
  };

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-xl p-6 shadow-2xs space-y-5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h3 className="text-base font-bold text-foreground">Step 2: Policy Content & Formatting</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Draft formal policy sections, rules, guidelines, and compliance responsibilities.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
              className="h-8 text-xs font-bold gap-1.5"
            >
              <Eye className="w-3.5 h-3.5 text-primary" /> {showPreview ? 'Edit Content' : 'Preview Document'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleAddSection}
              className="h-8 text-xs font-bold gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Add Section
            </Button>
          </div>
        </div>

        {/* Live Preview Mode vs Section Editor */}
        {showPreview ? (
          <div className="border border-border/80 rounded-xl p-6 bg-muted/20 space-y-5">
            <div className="text-center space-y-1 pb-4 border-b border-border">
              <span className="text-[10px] font-bold text-primary tracking-widest uppercase">
                ApponextHRMS Official Document Preview
              </span>
              <h2 className="text-lg font-black uppercase text-foreground">DOCUMENT PREVIEW</h2>
            </div>
            <div className="space-y-4">
              {activeSections.map((sec) => (
                <div key={sec.id} className="space-y-1">
                  <h4 className="text-xs font-bold text-foreground flex items-center gap-2 uppercase">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> {sec.title}
                  </h4>
                  <div className="text-xs text-muted-foreground leading-relaxed pl-5 whitespace-pre-line">
                    {sec.content}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {activeSections.map((sec, idx) => (
              <div key={sec.id} className="border border-border rounded-xl p-4 bg-background space-y-3 shadow-2xs">
                <div className="flex items-center justify-between gap-3">
                  <Input
                    value={sec.title}
                    onChange={(e) => handleUpdateSection(sec.id, 'title', e.target.value)}
                    placeholder={`Section ${idx + 1} Title`}
                    className="h-9 text-xs font-bold uppercase bg-card max-w-md"
                  />
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleApplyFormatting(sec.id, 'bold')}
                      title="Bold"
                      className="h-7 w-7 text-muted-foreground"
                    >
                      <Bold className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleApplyFormatting(sec.id, 'italic')}
                      title="Italic"
                      className="h-7 w-7 text-muted-foreground"
                    >
                      <Italic className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleApplyFormatting(sec.id, 'bullet')}
                      title="Bullet Point"
                      className="h-7 w-7 text-muted-foreground"
                    >
                      <List className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleApplyFormatting(sec.id, 'num')}
                      title="Numbered List"
                      className="h-7 w-7 text-muted-foreground"
                    >
                      <ListOrdered className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveSection(sec.id)}
                      title="Remove Section"
                      className="h-7 w-7 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                <textarea
                  value={sec.content}
                  onChange={(e) => handleUpdateSection(sec.id, 'content', e.target.value)}
                  placeholder="Section body text, operational rules, bullet points..."
                  rows={4}
                  className="w-full rounded-md border border-input bg-card p-3 text-xs font-normal focus:ring-1 focus:ring-primary leading-relaxed"
                />
              </div>
            ))}

            {/* Document File Attachment Box */}
            <div className="border-2 border-dashed border-border rounded-xl p-5 text-center bg-muted/20 space-y-2">
              <UploadCloud className="w-7 h-7 text-muted-foreground mx-auto" />
              <div className="text-xs font-bold text-foreground">Attach Policy Document (Optional PDF/DOCX)</div>
              <p className="text-[11px] text-muted-foreground">
                Drag and drop official policy manual file or browse from your computer.
              </p>
              <input type="file" accept=".pdf,.docx,.doc" className="hidden" id="policy_doc_file" />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => document.getElementById('policy_doc_file')?.click()}
                className="h-8 text-xs font-bold gap-1.5"
              >
                <FileText className="w-3.5 h-3.5 text-primary" /> Select File
              </Button>
            </div>
          </div>
        )}
      </div>

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
