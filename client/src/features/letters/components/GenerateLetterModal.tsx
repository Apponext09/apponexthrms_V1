import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  FileText, Sparkles, User, Briefcase, Calendar,
  Building2, Eye, Check, RefreshCw, ChevronRight,
  ShieldCheck, AlertCircle, ArrowLeft, ArrowRight, CheckCircle2
} from 'lucide-react';
import { apiClient } from '@/config/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { LETTER_STAGE_CONFIG, LetterCategory, LetterTemplateRecord } from '@/features/settings/components/OfferTemplateMasterForm';

interface GenerateLetterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (newLetter: any) => void;
  defaultStage?: LetterCategory;
  defaultRecipientType?: 'employee' | 'candidate';
  defaultRecipientId?: number;
}

export const GenerateLetterModal: React.FC<GenerateLetterModalProps> = ({
  open,
  onOpenChange,
  onSuccess,
  defaultStage = 'hiring',
  defaultRecipientType = 'employee',
  defaultRecipientId,
}) => {
  // Steps: 1: Select Type & Template, 2: Select Recipient & Review Merged Data, 3: Live Preview & Dispatch
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Stage & Template
  const [stage, setStage] = useState<LetterCategory>(defaultStage);
  const [letterType, setLetterType] = useState<string>('offer_letter');
  const [templates, setTemplates] = useState<LetterTemplateRecord[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);

  // Step 2: Recipient
  const [recipientType, setRecipientType] = useState<'employee' | 'candidate'>(defaultRecipientType);
  const [recipientId, setRecipientId] = useState<string>(defaultRecipientId ? String(defaultRecipientId) : '');
  
  // Lists for dropdown
  const [employees, setEmployees] = useState<any[]>([]);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [isLoadingRecipients, setIsLoadingRecipients] = useState(false);

  // Overrides / Dynamic Inputs
  const [overrides, setOverrides] = useState<Record<string, string>>({});

  // Generated Preview
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedHtml, setGeneratedHtml] = useState('');
  const [generatedLetter, setGeneratedLetter] = useState<any>(null);

  // Fetch templates for current stage
  const fetchTemplates = async () => {
    try {
      setIsLoadingTemplates(true);
      const res = await apiClient.get('/letters/templates', {
        params: { letter_category: stage, is_active: true }
      });
      if (res.data?.success && Array.isArray(res.data.data)) {
        setTemplates(res.data.data);
        if (res.data.data.length > 0) {
          const matching = res.data.data.find((t: any) => t.letter_type === letterType) || res.data.data[0];
          setSelectedTemplateId(String(matching.id));
          setLetterType(matching.letter_type);
        } else {
          setSelectedTemplateId('');
        }
      }
    } catch (err) {
      console.error('Failed to load templates', err);
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  // Fetch employee / candidate lists
  const fetchRecipients = async () => {
    try {
      setIsLoadingRecipients(true);
      const [empRes, candRes] = await Promise.all([
        apiClient.get('/employees', { params: { pageSize: 200 } }).catch(() => ({ data: { data: [] } })),
        apiClient.get('/recruitment/candidates', { params: { pageSize: 100 } }).catch(() => ({ data: { data: [] } })),
      ]);

      const empData = Array.isArray(empRes.data?.data?.items) 
        ? empRes.data.data.items 
        : (Array.isArray(empRes.data?.data) ? empRes.data.data : []);
      setEmployees(empData);

      const candData = Array.isArray(candRes.data?.data?.items) 
        ? candRes.data.data.items 
        : (Array.isArray(candRes.data?.data) ? candRes.data.data : []);
      setCandidates(candData);

      if (recipientType === 'employee' && empData.length > 0 && !recipientId) {
        setRecipientId(String(empData[0].id));
      } else if (recipientType === 'candidate' && candData.length > 0 && !recipientId) {
        setRecipientId(String(candData[0].id));
      }
    } catch (err) {
      console.error('Failed to fetch recipients', err);
    } finally {
      setIsLoadingRecipients(false);
    }
  };

  useEffect(() => {
    if (open) {
      setStep(1);
      fetchTemplates();
      fetchRecipients();
    }
  }, [open, stage]);

  // When letterType changes, auto-select first matching template
  const handleLetterTypeChange = (newType: string) => {
    setLetterType(newType);
    const matching = templates.find(t => t.letter_type === newType);
    if (matching) {
      setSelectedTemplateId(String(matching.id));
    }
  };

  // Selected template object
  const currentTemplate = useMemo(() => {
    return templates.find(t => String(t.id) === String(selectedTemplateId)) || templates[0] || null;
  }, [templates, selectedTemplateId]);

  // Selected recipient object
  const currentRecipient = useMemo(() => {
    if (recipientType === 'employee') {
      return employees.find(e => String(e.id) === String(recipientId)) || null;
    }
    return candidates.find(c => String(c.id) === String(recipientId)) || null;
  }, [recipientType, recipientId, employees, candidates]);

  // Handle Generate Letter
  const handleGeneratePreview = async () => {
    if (!selectedTemplateId) {
      toast.error('Please select a master template');
      return;
    }
    if (!recipientId) {
      toast.error('Please select a recipient');
      return;
    }

    try {
      setIsGenerating(true);
      const payload: any = {
        template_id: parseInt(selectedTemplateId, 10),
        overrides,
      };
      if (recipientType === 'employee') {
        payload.employee_id = parseInt(recipientId, 10);
      } else {
        payload.candidate_id = parseInt(recipientId, 10);
      }

      const res = await apiClient.post('/letters/generate', payload);
      if (res.data?.success && res.data?.data) {
        setGeneratedLetter(res.data.data);
        setGeneratedHtml(res.data.data.rendered_html);
        setStep(3);
        toast.success('Letter generated in formal MNC letterhead format!');
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to generate letter');
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle Send / Dispatch Letter
  const handleSendLetter = async () => {
    if (!generatedLetter?.id) return;
    try {
      setIsGenerating(true);
      await apiClient.post(`/letters/${generatedLetter.id}/send`);
      toast.success(`Letter Ref: ${generatedLetter.letter_code} sent successfully!`);
      if (onSuccess) onSuccess(generatedLetter);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to dispatch letter');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveDraftAndClose = () => {
    if (onSuccess && generatedLetter) onSuccess(generatedLetter);
    toast.success('Letter saved as Draft in Letter Directory.');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto p-6 rounded-3xl">
        
        {/* Modal Top Header */}
        <DialogHeader className="pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-md">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-extrabold text-slate-900 dark:text-white">
                  Generate Corporate Letter / Agreement
                </DialogTitle>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Merge live profile data into company letterhead templates with automated compliance covenants.
                </p>
              </div>
            </div>

            {/* Stepper Indicator */}
            <div className="flex items-center gap-2">
              <span className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold",
                step >= 1 ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-400"
              )}>
                1
              </span>
              <div className="w-6 h-0.5 bg-slate-200" />
              <span className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold",
                step >= 2 ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-400"
              )}>
                2
              </span>
              <div className="w-6 h-0.5 bg-slate-200" />
              <span className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold",
                step === 3 ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-400"
              )}>
                3
              </span>
            </div>
          </div>
        </DialogHeader>

        {/* STEP 1: Select Stage & Letter Type & Master Template */}
        {step === 1 && (
          <div className="space-y-6 py-4">
            
            {/* Stage Selector */}
            <div className="space-y-2">
              <Label className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                1. Select Lifecycle Stage
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {(Object.keys(LETTER_STAGE_CONFIG) as LetterCategory[]).map((stageKey) => {
                  const s = LETTER_STAGE_CONFIG[stageKey];
                  const Icon = s.icon;
                  const isSelected = stage === stageKey;
                  return (
                    <button
                      key={stageKey}
                      type="button"
                      onClick={() => setStage(stageKey)}
                      className={cn(
                        "p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-2",
                        isSelected
                          ? "bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-800 shadow-sm ring-1 ring-indigo-500/20"
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300"
                      )}
                    >
                      <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center text-xs", isSelected ? "bg-indigo-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600")}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="text-xs font-extrabold text-slate-900 dark:text-white">{s.label}</div>
                        <div className="text-[10.5px] text-slate-400 mt-0.5 line-clamp-1">{s.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Letter Type Pills */}
            <div className="space-y-2">
              <Label className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                2. Select Letter Document Type
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {LETTER_STAGE_CONFIG[stage].types.map((t) => {
                  const isSelected = letterType === t.id;
                  return (
                    <div
                      key={t.id}
                      onClick={() => handleLetterTypeChange(t.id)}
                      className={cn(
                        "p-3.5 rounded-xl border text-left transition-all cursor-pointer",
                        isSelected
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                          : "bg-slate-50/70 dark:bg-slate-800/50 border-slate-200/80 dark:border-slate-800 hover:bg-white text-slate-900 dark:text-white"
                      )}
                    >
                      <div className="font-extrabold text-xs">{t.name}</div>
                      <div className={cn("text-[11px] mt-0.5 leading-snug", isSelected ? "text-indigo-100" : "text-slate-500 dark:text-slate-400")}>
                        {t.desc}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Template Selector */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                  3. Select Company Master Template Format
                </Label>
                <span className="text-xs text-indigo-600 font-semibold">
                  {templates.length} templates available in master
                </span>
              </div>

              {isLoadingTemplates ? (
                <div className="py-6 text-center text-xs text-slate-400">Loading master templates...</div>
              ) : templates.length === 0 ? (
                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 text-amber-800 text-xs">
                  No active templates found for this stage. Please configure master templates in Settings &gt; Letter & Offer Master.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {templates.map((tpl) => {
                    const isSelected = String(tpl.id) === String(selectedTemplateId);
                    return (
                      <div
                        key={tpl.id}
                        onClick={() => setSelectedTemplateId(String(tpl.id))}
                        className={cn(
                          "p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between",
                          isSelected
                            ? "bg-indigo-50/80 dark:bg-indigo-950/50 border-indigo-300 dark:border-indigo-800 ring-1 ring-indigo-500/20 shadow-xs"
                            : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300"
                        )}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-[9.5px] font-extrabold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                              {tpl.template_code}
                            </span>
                            {tpl.is_default && (
                              <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                                Default
                              </span>
                            )}
                          </div>
                          <div className="text-xs font-extrabold text-slate-900 dark:text-white mt-1.5 truncate">
                            {tpl.template_name}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                            {tpl.subject || 'Standard official subject line'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 2: Select Recipient & Review Merged Field Parameters */}
        {step === 2 && (
          <div className="space-y-6 py-4">
            
            {/* Recipient Source Selector */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <User className="w-4 h-4 text-indigo-600" />
                  <span>Select Target Recipient</span>
                </span>
                <div className="flex items-center gap-1.5 p-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setRecipientType('employee');
                      if (employees.length > 0) setRecipientId(String(employees[0].id));
                    }}
                    className={cn(
                      "px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                      recipientType === 'employee' ? "bg-indigo-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    Active Employee ({employees.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRecipientType('candidate');
                      if (candidates.length > 0) setRecipientId(String(candidates[0].id));
                    }}
                    className={cn(
                      "px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                      recipientType === 'candidate' ? "bg-indigo-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    Hiring Candidate ({candidates.length})
                  </button>
                </div>
              </div>

              {/* Recipient Dropdown */}
              <div className="pt-2">
                <select
                  value={recipientId}
                  onChange={(e) => setRecipientId(e.target.value)}
                  className="w-full h-10 px-3 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                >
                  {recipientType === 'employee' ? (
                    employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.employee_code || `EMP${emp.id}`} • {emp.first_name} {emp.last_name || ''} ({emp.email || 'No email'}) • {emp.designation?.name || emp.department?.name || 'Staff'}
                      </option>
                    ))
                  ) : (
                    candidates.map((cand) => (
                      <option key={cand.id} value={cand.id}>
                        {cand.first_name} {cand.last_name || ''} ({cand.email}) • {cand.position_title || 'Applied Candidate'}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Selected Profile Summary Chip */}
              {currentRecipient && (
                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                      {recipientType === 'employee' 
                        ? `${currentRecipient.first_name} ${currentRecipient.last_name || ''}` 
                        : `${currentRecipient.first_name} ${currentRecipient.last_name || ''}`}
                    </span>
                    <span className="text-xs text-slate-400 ml-2 font-mono">
                      {currentRecipient.email || currentRecipient.personal_email}
                    </span>
                  </div>
                  <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10.5px]">
                    Auto-Loaded Parameters Ready
                  </Badge>
                </div>
              )}
            </div>

            {/* Dynamic Override Parameter Fields */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                  Review & Customize Key Variable Values
                </span>
                <span className="text-[11px] text-slate-400">
                  Values pre-fill automatically; customize if necessary
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-slate-600">Cost to Company (Annual CTC)</Label>
                  <Input
                    placeholder="e.g. 18,50,000"
                    value={overrides['{{cost_to_company}}'] || overrides['{{current_ctc}}'] || ''}
                    onChange={(e) => setOverrides(prev => ({ ...prev, '{{cost_to_company}}': e.target.value, '{{current_ctc}}': e.target.value }))}
                    className="h-8 text-xs rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-slate-600">Effective Date / Joining Date</Label>
                  <Input
                    placeholder="e.g. 01 April 2026"
                    value={overrides['{{effective_date}}'] || overrides['{{offer_start_date}}'] || overrides['{{confirmation_date}}'] || ''}
                    onChange={(e) => setOverrides(prev => ({ ...prev, '{{effective_date}}': e.target.value, '{{offer_start_date}}': e.target.value }))}
                    className="h-8 text-xs rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-slate-600">Applicable Notice Period</Label>
                  <Input
                    placeholder="e.g. 60 days"
                    value={overrides['{{notice_period}}'] || '60 days'}
                    onChange={(e) => setOverrides(prev => ({ ...prev, '{{notice_period}}': e.target.value }))}
                    className="h-8 text-xs rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-slate-600">Authorized Signatory Name</Label>
                  <Input
                    placeholder="e.g. Priya Sharma"
                    value={overrides['{{signatory_name}}'] || currentTemplate?.signatory_name || 'Priya Sharma'}
                    onChange={(e) => setOverrides(prev => ({ ...prev, '{{signatory_name}}': e.target.value }))}
                    className="h-8 text-xs rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-slate-600">Signatory Title</Label>
                  <Input
                    placeholder="e.g. Director - Human Resources"
                    value={overrides['{{signatory_designation}}'] || currentTemplate?.signatory_designation || 'Director - Human Resources'}
                    onChange={(e) => setOverrides(prev => ({ ...prev, '{{signatory_designation}}': e.target.value }))}
                    className="h-8 text-xs rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-slate-600">Office Base Location</Label>
                  <Input
                    placeholder="e.g. Bengaluru Campus"
                    value={overrides['{{office_location}}'] || 'Bengaluru HQ'}
                    onChange={(e) => setOverrides(prev => ({ ...prev, '{{office_location}}': e.target.value }))}
                    className="h-8 text-xs rounded-xl"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Live Letterhead Render Preview & Dispatch */}
        {step === 3 && (
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-950/30 p-3 rounded-2xl border border-emerald-200">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                  Letter Generated Successfully: <span className="font-mono">{generatedLetter?.letter_code}</span>
                </span>
              </div>
              <span className="text-xs text-emerald-700">
                Ready for Dispatch or PDF Export
              </span>
            </div>

            {/* Rendered HTML in iframe */}
            <iframe
              srcDoc={generatedHtml}
              title="Generated Letter Preview"
              className="w-full h-[540px] border border-slate-200 rounded-2xl shadow-inner bg-white"
            />
          </div>
        )}

        {/* Footer Navigation */}
        <DialogFooter className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            {step > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep((prev) => (prev - 1) as any)}
                className="h-9 px-4 text-xs font-semibold rounded-xl"
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
                Previous Step
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-9 px-4 text-xs font-semibold rounded-xl"
            >
              Cancel
            </Button>

            {step === 1 && (
              <Button
                type="button"
                onClick={() => setStep(2)}
                disabled={!selectedTemplateId}
                className="h-9 px-5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
              >
                <span>Continue to Recipient</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            )}

            {step === 2 && (
              <Button
                type="button"
                onClick={handleGeneratePreview}
                disabled={isGenerating || !recipientId}
                className="h-9 px-5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                <span>{isGenerating ? 'Rendering Format...' : 'Generate Letterhead'}</span>
              </Button>
            )}

            {step === 3 && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSaveDraftAndClose}
                  className="h-9 px-4 text-xs font-bold rounded-xl border-slate-200"
                >
                  Save as Draft
                </Button>
                <Button
                  type="button"
                  onClick={handleSendLetter}
                  disabled={isGenerating}
                  className="h-9 px-5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                >
                  <Check className="w-3.5 h-3.5 mr-1.5" />
                  <span>Dispatch & Send Letter</span>
                </Button>
              </>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
