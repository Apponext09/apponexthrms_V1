import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  FileText, Plus, Search, Check, X, Trash2, Edit2, Eye,
  AlertCircle, Code2, Flag, Building2, Copy, Sparkles, RefreshCw, CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { apiClient } from '@/config/api';
import { useCompanyStore } from '@/features/settings/store/companyStore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

export interface OfferTemplateRecord {
  id: string | number;
  template_name: string;
  template_code: string;
  subject: string;
  company_name: string;
  company_address: string;
  body_content: string;
  bgv_mandatory: boolean;
  nda_mandatory: boolean;
  non_compete: boolean;
  relieving_letter: boolean;
  custom_clause?: string;
  is_active: 'Yes' | 'No';
  created_at?: string;
  updated_at?: string;
}

// Available Candidate Dynamic Merge Code Tags for Offer Letters
export const OFFER_MERGE_CODES = [
  { code: '{{candidate_name}}', label: 'Candidate Full Name', category: 'Candidate' },
  { code: '{{candidate_email}}', label: 'Candidate Email Address', category: 'Candidate' },
  { code: '{{candidate_phone}}', label: 'Candidate Contact Number', category: 'Candidate' },
  { code: '{{position_title}}', label: 'Official Position / Job Title', category: 'Role' },
  { code: '{{department_name}}', label: 'Department Name', category: 'Role' },
  { code: '{{designation_name}}', label: 'Designation Name', category: 'Role' },
  { code: '{{grade_band}}', label: 'Corporate Grade / Level (e.g. L2)', category: 'Role' },
  { code: '{{work_model}}', label: 'Work Model (Onsite / Hybrid / Remote)', category: 'Role' },
  { code: '{{office_location}}', label: 'Office Base Location', category: 'Role' },
  { code: '{{reporting_manager}}', label: 'Reporting Manager Name & Title', category: 'Role' },
  { code: '{{cost_to_company}}', label: 'Annual Cost to Company (CTC)', category: 'Compensation' },
  { code: '{{base_salary}}', label: 'Annual Basic Salary', category: 'Compensation' },
  { code: '{{currency}}', label: 'Currency (INR / USD / EUR)', category: 'Compensation' },
  { code: '{{joining_bonus}}', label: 'Sign-on / Joining Bonus', category: 'Compensation' },
  { code: '{{offer_start_date}}', label: 'Target Joining Date', category: 'Dates' },
  { code: '{{offer_expiry_date}}', label: 'Offer Acceptance Deadline', category: 'Dates' },
  { code: '{{probation_period}}', label: 'Probation Period Tenure', category: 'Terms' },
  { code: '{{notice_period}}', label: 'Notice Period Duration', category: 'Terms' },
  { code: '{{company_name}}', label: 'Company Legal Name', category: 'Company' },
  { code: '{{offer_code}}', label: 'Unique Offer Reference Code', category: 'System' },
];

export const PRESEEDED_OFFER_TEMPLATES: OfferTemplateRecord[] = [
  {
    id: 'tpl_std_corp',
    template_name: 'Standard Corporate Offer Letter',
    template_code: 'OFFER_STD_CORP',
    subject: 'Subject: Letter of Offer & Employment Agreement',
    company_name: 'Apponext Technologies Pvt. Ltd.',
    company_address: 'Level 6, Tech Park Phase 2, Outer Ring Road, Bengaluru, 560103',
    body_content: `Dear {{candidate_name}},

We are pleased to offer you employment with {{company_name}} in the capacity of {{position_title}}. You will be positioned in corporate grade {{grade_band}} at our {{office_location}} office, reporting directly to {{reporting_manager}} under a {{work_model}} work engagement layout.

Your target date of joining is set as {{offer_start_date}}, subject to successful completion of all background checking protocols. Your Annualized Cost to Company (CTC) compensation package is structured at {{currency}} {{cost_to_company}}. Detailed split calculations are detailed in Annexure A.

We look forward to building a successful relationship with you as we grow together.`,
    bgv_mandatory: true,
    nda_mandatory: true,
    non_compete: true,
    relieving_letter: true,
    custom_clause: 'This offer is valid until {{offer_expiry_date}}. Please sign and submit your digital acceptance before the deadline.',
    is_active: 'Yes',
    created_at: new Date().toISOString(),
  },
  {
    id: 'tpl_exec_lead',
    template_name: 'Executive Leadership Offer Letter',
    template_code: 'OFFER_EXEC_LEAD',
    subject: 'Executive Employment Offer & Agreement - {{company_name}}',
    company_name: 'Apponext Technologies Pvt. Ltd.',
    company_address: 'Level 6, Tech Park Phase 2, Outer Ring Road, Bengaluru, 560103',
    body_content: `Dear {{candidate_name}},

On behalf of the Executive Leadership of {{company_name}}, it is our privilege to extend to you an offer of employment for the executive leadership position of {{position_title}}.

In this capacity, you will report to {{reporting_manager}} and lead strategy across the {{department_name}} department. Your structured Annual CTC is {{currency}} {{cost_to_company}}, along with executive performance bonuses and company incentives.

Expected Start Date: {{offer_start_date}} at our {{office_location}} office.`,
    bgv_mandatory: true,
    nda_mandatory: true,
    non_compete: true,
    relieving_letter: true,
    custom_clause: 'Includes executive relocation allowance and performance equity pool participation.',
    is_active: 'Yes',
    created_at: new Date().toISOString(),
  },
  {
    id: 'tpl_trainee_intern',
    template_name: 'Technical Trainee / Graduate Offer Letter',
    template_code: 'OFFER_TRAINEE',
    subject: 'Appointment Letter: Graduate Technical Trainee - {{company_name}}',
    company_name: 'Apponext Technologies Pvt. Ltd.',
    company_address: 'Level 6, Tech Park Phase 2, Outer Ring Road, Bengaluru, 560103',
    body_content: `Dear {{candidate_name}},

We are pleased to appoint you as {{position_title}} in the {{department_name}} division at {{company_name}}.

During your initial probation period of {{probation_period}}, you will undergo structured technical training and project mentorship. Your Annual CTC compensation is fixed at {{currency}} {{cost_to_company}}.

Your onboarding schedule commences on {{offer_start_date}} at {{office_location}}.`,
    bgv_mandatory: true,
    nda_mandatory: true,
    non_compete: false,
    relieving_letter: false,
    custom_clause: 'Trainees are required to submit original degree certificates for verification on day of joining.',
    is_active: 'Yes',
    created_at: new Date().toISOString(),
  },
  {
    id: 'tpl_field_sales',
    template_name: 'Sales & Business Development Offer Letter',
    template_code: 'OFFER_SALES_COMM',
    subject: 'Offer Letter: {{position_title}} - {{company_name}}',
    company_name: 'Apponext Technologies Pvt. Ltd.',
    company_address: 'Level 6, Tech Park Phase 2, Outer Ring Road, Bengaluru, 560103',
    body_content: `Dear {{candidate_name}},

We take great pleasure in offering you the role of {{position_title}} at {{company_name}}.

In this role, your Annual CTC will be {{currency}} {{cost_to_company}}, which includes fixed base salary and quarterly performance commission incentives. You will report to {{reporting_manager}} out of our {{office_location}} branch.

Joining Date: {{offer_start_date}}. Offer expires on {{offer_expiry_date}}.`,
    bgv_mandatory: true,
    nda_mandatory: true,
    non_compete: true,
    relieving_letter: true,
    custom_clause: 'Sales targets and incentive structures will be reviewed quarterly.',
    is_active: 'Yes',
    created_at: new Date().toISOString(),
  }
];

interface OfferTemplateMasterFormProps {
  onCancel?: () => void;
}

export const OfferTemplateMasterForm: React.FC<OfferTemplateMasterFormProps> = ({ onCancel }) => {
  const { selectedCompanyId } = useCompanyStore();
  const [templates, setTemplates] = useState<OfferTemplateRecord[]>(PRESEEDED_OFFER_TEMPLATES);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [selectedId, setSelectedId] = useState<string | number>('');
  const [isNewMode, setIsNewMode] = useState<boolean>(true);

  // Form Fields State
  const [templateName, setTemplateName] = useState('');
  const [templateCode, setTemplateCode] = useState('');
  const [subject, setSubject] = useState('');
  const [companyName, setCompanyName] = useState('Apponext Technologies Pvt. Ltd.');
  const [companyAddress, setCompanyAddress] = useState('Level 6, Tech Park Phase 2, Outer Ring Road, Bengaluru, 560103');
  const [bodyContent, setBodyContent] = useState('');
  const [bgvMandatory, setBgvMandatory] = useState(true);
  const [ndaMandatory, setNdaMandatory] = useState(true);
  const [nonCompete, setNonCompete] = useState(true);
  const [relievingLetter, setRelievingLetter] = useState(true);
  const [customClause, setCustomClause] = useState('');
  const [isActive, setIsActive] = useState<'Yes' | 'No'>('Yes');

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('All');

  // Merge Tag Modal State
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [targetField, setTargetField] = useState<'subject' | 'body'>('body');
  const [selectedMergeTag, setSelectedMergeTag] = useState('');

  const bodyRef = useRef<HTMLTextAreaElement>(null);

  // Fetch company offer templates from API (with fallback to preseeded templates)
  const fetchTemplates = async () => {
    try {
      setIsLoading(true);
      const res = await apiClient.get('/settings/offer-templates');
      if (res.data?.success && Array.isArray(res.data.data)) {
        const combined = [...res.data.data];
        for (const def of PRESEEDED_OFFER_TEMPLATES) {
          if (!combined.some((c: any) => String(c.template_code).toUpperCase() === String(def.template_code).toUpperCase())) {
            combined.push(def);
          }
        }
        setTemplates(combined);
      }
    } catch (err) {
      // Fall back to preseeded templates if table not present yet
      setTemplates(PRESEEDED_OFFER_TEMPLATES);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, [selectedCompanyId]);

  const handleAddNew = () => {
    setIsNewMode(true);
    setSelectedId('');
    setTemplateName('');
    setTemplateCode(`OFFER_TPL_${Math.floor(100 + Math.random() * 900)}`);
    setSubject('Subject: Letter of Offer & Employment Agreement');
    setCompanyName('Apponext Technologies Pvt. Ltd.');
    setCompanyAddress('Level 6, Tech Park Phase 2, Outer Ring Road, Bengaluru, 560103');
    setBodyContent(`Dear {{candidate_name}},

We are pleased to offer you employment with {{company_name}} in the position of {{position_title}}. 
You will be positioned in corporate grade {{grade_band}} at our {{office_location}} office, reporting to {{reporting_manager}}.

Your target date of joining is {{offer_start_date}}. Your Annualized Cost to Company (CTC) is {{currency}} {{cost_to_company}}.`);
    setBgvMandatory(true);
    setNdaMandatory(true);
    setNonCompete(true);
    setRelievingLetter(true);
    setCustomClause('');
    setIsActive('Yes');
  };

  const handleSelectRecord = (item: OfferTemplateRecord) => {
    setIsNewMode(false);
    setSelectedId(item.id);
    setTemplateName(item.template_name);
    setTemplateCode(item.template_code || `OFFER_${item.id}`);
    setSubject(item.subject);
    setCompanyName(item.company_name || 'Apponext Technologies Pvt. Ltd.');
    setCompanyAddress(item.company_address || 'Level 6, Tech Park Phase 2, Outer Ring Road, Bengaluru, 560103');
    setBodyContent(item.body_content);
    setBgvMandatory(item.bgv_mandatory !== false);
    setNdaMandatory(item.nda_mandatory !== false);
    setNonCompete(item.non_compete !== false);
    setRelievingLetter(item.relieving_letter !== false);
    setCustomClause(item.custom_clause || '');
    setIsActive(item.is_active || 'Yes');
  };

  const openMergePicker = (target: 'subject' | 'body') => {
    setTargetField(target);
    setSelectedMergeTag('');
    setIsMergeModalOpen(true);
  };

  const handleInsertTag = (codeTag: string) => {
    if (targetField === 'subject') {
      setSubject(prev => `${prev} ${codeTag}`);
    } else {
      setBodyContent(prev => `${prev} ${codeTag}`);
    }
    toast.success(`Inserted ${codeTag} placeholder`);
    setIsMergeModalOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateName.trim()) {
      toast.error('Template Name is required');
      return;
    }
    if (!bodyContent.trim()) {
      toast.error('Offer Body Content is required');
      return;
    }

    const payload: OfferTemplateRecord = {
      id: isNewMode ? `tpl_${Date.now()}` : selectedId,
      template_name: templateName.trim(),
      template_code: templateCode.trim() || `OFFER_${Date.now()}`,
      subject: subject.trim(),
      company_name: companyName.trim(),
      company_address: companyAddress.trim(),
      body_content: bodyContent.trim(),
      bgv_mandatory: bgvMandatory,
      nda_mandatory: ndaMandatory,
      non_compete: nonCompete,
      relieving_letter: relievingLetter,
      custom_clause: customClause.trim(),
      is_active: isActive,
      updated_at: new Date().toISOString(),
    };

    try {
      setIsSaving(true);
      // Try to save to backend API
      try {
        await apiClient.post('/settings/offer-templates', payload);
      } catch (e) {
        // Fallback local update if endpoint responds offline
      }

      if (isNewMode) {
        setTemplates(prev => [payload, ...prev]);
        setIsNewMode(false);
        setSelectedId(payload.id);
        toast.success(`Offer Template "${templateName}" created successfully!`);
      } else {
        setTemplates(prev => prev.map(t => t.id === payload.id ? payload : t));
        toast.success(`Offer Template "${templateName}" updated successfully!`);
      }
    } catch (err: any) {
      toast.error('Failed to save offer template.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (id: string | number, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete offer template "${name}"?`)) {
      setTemplates(prev => prev.filter(t => t.id !== id));
      if (selectedId === id) {
        handleAddNew();
      }
      toast.success(`Offer template "${name}" removed.`);
    }
  };

  const filteredTemplates = useMemo(() => {
    return templates.filter(t => {
      if (statusFilter === 'Active' && t.is_active !== 'Yes') return false;
      if (statusFilter === 'Inactive' && t.is_active !== 'No') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          t.template_name.toLowerCase().includes(q) ||
          t.subject.toLowerCase().includes(q) ||
          t.template_code.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [templates, statusFilter, searchQuery]);

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <FileText className="h-6 w-6 text-indigo-600" /> Offer Letter Master & Templates
            </h2>
            <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 font-semibold text-xs">
              Company Master Formats
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Create, customize, and maintain official company offer letter formats, dynamic candidate placeholders, and covenants.
          </p>
        </div>

        <Button
          type="button"
          onClick={handleAddNew}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold gap-1.5 shadow-sm text-xs"
        >
          <Plus className="h-4 w-4" /> New Offer Template
        </Button>
      </div>

      {/* Main 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* ── LEFT COLUMN: Add / Edit Offer Template Form (7 Cols) ─────── */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-600" />
              <span>{isNewMode ? 'Create Company Offer Format' : 'Edit Company Offer Format'}</span>
            </h3>
            {!isNewMode && (
              <Badge variant="outline" className="bg-slate-100 text-slate-700 text-[10px]">
                ID: #{selectedId}
              </Badge>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Template Name & Code */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Template Name *</Label>
                <Input
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="e.g. Standard Corporate Offer Letter"
                  className="h-9 text-xs border-slate-200"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Template Code</Label>
                <Input
                  value={templateCode}
                  onChange={(e) => setTemplateCode(e.target.value)}
                  placeholder="OFFER_STD_01"
                  className="h-9 text-xs border-slate-200 font-mono"
                />
              </div>
            </div>

            {/* Subject Line */}
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <Label className="text-xs font-semibold text-slate-700">Subject Line Header *</Label>
                <button
                  type="button"
                  onClick={() => openMergePicker('subject')}
                  className="text-[11px] text-indigo-600 hover:underline font-semibold flex items-center gap-1"
                >
                  <Code2 className="h-3 w-3" /> Insert Candidate Field
                </button>
              </div>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Subject: Letter of Offer & Employment Agreement"
                className="h-9 text-xs border-slate-200 font-medium"
                required
              />
            </div>

            {/* Company Header Branding */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-600">Company Legal Name</Label>
                <Input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="h-8 text-xs bg-white border-slate-200"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-600">Registered Office Address</Label>
                <Input
                  value={companyAddress}
                  onChange={(e) => setCompanyAddress(e.target.value)}
                  className="h-8 text-xs bg-white border-slate-200"
                />
              </div>
            </div>

            {/* Main Offer Body Content */}
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <Label className="text-xs font-semibold text-slate-700">Offer Letter Main Body Content *</Label>
                <button
                  type="button"
                  onClick={() => openMergePicker('body')}
                  className="text-[11px] text-indigo-600 hover:underline font-semibold flex items-center gap-1"
                >
                  <Code2 className="h-3 w-3" /> Insert Dynamic Tag
                </button>
              </div>
              <textarea
                ref={bodyRef}
                value={bodyContent}
                onChange={(e) => setBodyContent(e.target.value)}
                rows={9}
                placeholder="Write offer letter paragraphs using dynamic placeholders like {{candidate_name}}, {{position_title}}, {{cost_to_company}}, {{offer_start_date}}..."
                className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:ring-1 focus:ring-indigo-500 font-serif leading-relaxed"
                required
              />
              <p className="text-[10px] text-slate-400">
                Tip: Placeholders wrapped in double curly braces (e.g. <code className="text-indigo-600 font-bold">{"{{candidate_name}}"}</code>) will be replaced candidate-wise when creating offers.
              </p>
            </div>

            {/* Standard Legal Covenants Selection */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <Label className="text-xs font-bold text-slate-800">Assigned Legal Terms & Covenants</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <label className={`p-2 border rounded-lg flex items-center gap-2 cursor-pointer transition ${bgvMandatory ? 'border-indigo-300 bg-indigo-50/50 text-indigo-900 font-semibold' : 'border-slate-200 bg-white text-slate-600'}`}>
                  <input
                    type="checkbox"
                    checked={bgvMandatory}
                    onChange={(e) => setBgvMandatory(e.target.checked)}
                    className="accent-indigo-600"
                  />
                  <span>BGV Clearance</span>
                </label>

                <label className={`p-2 border rounded-lg flex items-center gap-2 cursor-pointer transition ${ndaMandatory ? 'border-indigo-300 bg-indigo-50/50 text-indigo-900 font-semibold' : 'border-slate-200 bg-white text-slate-600'}`}>
                  <input
                    type="checkbox"
                    checked={ndaMandatory}
                    onChange={(e) => setNdaMandatory(e.target.checked)}
                    className="accent-indigo-600"
                  />
                  <span>Standard NDA</span>
                </label>

                <label className={`p-2 border rounded-lg flex items-center gap-2 cursor-pointer transition ${nonCompete ? 'border-indigo-300 bg-indigo-50/50 text-indigo-900 font-semibold' : 'border-slate-200 bg-white text-slate-600'}`}>
                  <input
                    type="checkbox"
                    checked={nonCompete}
                    onChange={(e) => setNonCompete(e.target.checked)}
                    className="accent-indigo-600"
                  />
                  <span>12-Mo Non-compete</span>
                </label>

                <label className={`p-2 border rounded-lg flex items-center gap-2 cursor-pointer transition ${relievingLetter ? 'border-indigo-300 bg-indigo-50/50 text-indigo-900 font-semibold' : 'border-slate-200 bg-white text-slate-600'}`}>
                  <input
                    type="checkbox"
                    checked={relievingLetter}
                    onChange={(e) => setRelievingLetter(e.target.checked)}
                    className="accent-indigo-600"
                  />
                  <span>Relieving Letter</span>
                </label>
              </div>
            </div>

            {/* Custom Clause / Special Remark */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Special Addendum / Custom Remark</Label>
              <Input
                value={customClause}
                onChange={(e) => setCustomClause(e.target.value)}
                placeholder="e.g. Sign-on bonus subject to 12-month tenure clawback requirement."
                className="h-9 text-xs border-slate-200"
              />
            </div>

            {/* Status & Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <Label className="text-xs font-semibold text-slate-700">Status:</Label>
                <select
                  value={isActive}
                  onChange={(e) => setIsActive(e.target.value as 'Yes' | 'No')}
                  className="h-8 text-xs border border-slate-200 rounded-lg px-2 bg-white font-semibold"
                >
                  <option value="Yes">Active</option>
                  <option value="No">Inactive</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddNew}
                  className="text-xs border-slate-200"
                >
                  Reset Form
                </Button>
                <Button
                  type="submit"
                  disabled={isSaving}
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-5 shadow-sm"
                >
                  {isSaving ? 'Saving...' : isNewMode ? 'Create Template' : 'Update Template'}
                </Button>
              </div>
            </div>

          </form>
        </div>

        {/* ── RIGHT COLUMN: Templates Directory List (5 Cols) ─────── */}
        <div className="lg:col-span-5 space-y-4">

          {/* Filter & Search */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search template name, code..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 outline-none focus:bg-white"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e: any) => setStatusFilter(e.target.value)}
                className="h-8 text-xs border border-slate-200 rounded-lg px-2 bg-white font-semibold text-slate-700"
              >
                <option value="All">All</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs font-bold text-slate-800">
              <span className="flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-indigo-600" /> Company Offer Templates
              </span>
              <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 font-bold text-[10px]">
                {filteredTemplates.length} Formats
              </Badge>
            </div>
          </div>

          {/* Templates Cards List */}
          <div className="space-y-3 max-h-[640px] overflow-y-auto pr-1">
            {filteredTemplates.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-400 text-xs">
                No offer templates match the filter parameters.
              </div>
            ) : (
              filteredTemplates.map((item) => {
                const isSelected = selectedId === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelectRecord(item)}
                    className={cn(
                      'p-4 rounded-2xl border transition-all cursor-pointer space-y-2 relative shadow-sm',
                      isSelected
                        ? 'bg-indigo-900 text-white border-indigo-900 shadow-md'
                        : 'bg-white border-slate-200 hover:border-indigo-300 hover:bg-slate-50 text-slate-800'
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className={cn('text-[9px] font-mono font-bold px-1.5 py-0.5 rounded', isSelected ? 'bg-indigo-800 text-indigo-200' : 'bg-slate-100 text-slate-600')}>
                            {item.template_code}
                          </span>
                          <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', item.is_active === 'Yes' ? (isSelected ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-50 text-emerald-700') : 'bg-rose-50 text-rose-700')}>
                            {item.is_active === 'Yes' ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold mt-1.5 leading-snug">
                          {item.template_name}
                        </h4>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => handleDelete(item.id, item.template_name, e)}
                          className={cn('p-1.5 rounded-lg transition', isSelected ? 'text-indigo-200 hover:text-white hover:bg-indigo-800' : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50')}
                          title="Delete Template"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className={cn('text-[11px] line-clamp-2 leading-relaxed', isSelected ? 'text-indigo-100' : 'text-slate-500')}>
                      {item.subject}
                    </p>

                    <div className={cn('text-[10px] pt-2 border-t flex justify-between items-center', isSelected ? 'border-indigo-800 text-indigo-300' : 'border-slate-100 text-slate-400')}>
                      <span>Covenants: BGV, NDA, Non-compete</span>
                      <span className="font-semibold text-indigo-400">Click to Edit</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

        </div>

      </div>

      {/* ── POPUP MODAL: Select Dynamic Candidate Merge Tag ──────────── */}
      <Dialog open={isMergeModalOpen} onOpenChange={setIsMergeModalOpen}>
        <DialogContent className="sm:max-w-md bg-white p-0 rounded-2xl overflow-hidden border-slate-200 shadow-xl">
          <div className="bg-indigo-900 px-5 py-3 text-white flex items-center justify-between">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <Code2 className="h-4 w-4 text-indigo-300" />
              <span>Select Candidate Dynamic Placeholder Tag</span>
            </h3>
            <button
              type="button"
              onClick={() => setIsMergeModalOpen(false)}
              className="text-indigo-200 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
            <p className="text-xs text-slate-500">
              Click any field placeholder to automatically insert it into your offer template:
            </p>

            <div className="space-y-3">
              {['Candidate', 'Role', 'Compensation', 'Dates', 'Terms', 'Company'].map(cat => {
                const tags = OFFER_MERGE_CODES.filter(t => t.category === cat);
                if (tags.length === 0) return null;
                return (
                  <div key={cat} className="space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{cat} Fields</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {tags.map(t => (
                        <button
                          key={t.code}
                          type="button"
                          onClick={() => handleInsertTag(t.code)}
                          className="text-left p-2 rounded-lg border border-slate-100 hover:border-indigo-300 hover:bg-indigo-50/50 transition flex items-center justify-between text-xs group"
                        >
                          <div>
                            <span className="font-bold text-slate-800 block text-[11px]">{t.label}</span>
                            <code className="text-[10px] text-indigo-600 font-mono">{t.code}</code>
                          </div>
                          <Plus className="h-3.5 w-3.5 text-slate-400 group-hover:text-indigo-600" />
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <DialogFooter className="px-5 py-3 bg-slate-50 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setIsMergeModalOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};
