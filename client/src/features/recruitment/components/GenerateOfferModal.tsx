import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  User, Briefcase, DollarSign, Calendar, ShieldCheck, 
  Building2, CheckCircle2, FileText, ArrowRight, ArrowLeft,
  Sparkles, RefreshCw, Send, Check, Eye, Search, ChevronDown, CheckCheck,
  FileCheck
} from 'lucide-react';
import { apiClient } from '@/config/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { DEFAULT_FRONTEND_TEMPLATES, LetterTemplateRecord } from '../../settings/components/OfferTemplateMasterForm';

interface GenerateOfferModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => Promise<void>;
  isSubmitting: boolean;
  applicationList: any[];
  departmentList: any[];
  designationList: any[];
}

export const GenerateOfferModal: React.FC<GenerateOfferModalProps> = ({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
  applicationList = [],
  departmentList = [],
  designationList = [],
}) => {
  // 2-Step Flow: 1: Configure Mandatory Offer Details, 2: Live Letterhead Review & Dispatch
  const [step, setStep] = useState<1 | 2>(1);

  // Master Templates & Database Options
  const [offerTemplates, setOfferTemplates] = useState<LetterTemplateRecord[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [isTemplateDropdownOpen, setIsTemplateDropdownOpen] = useState(false);
  const [locations, setLocations] = useState<any[]>([]);
  const [internalDepts, setInternalDepts] = useState<any[]>([]);
  const [internalDesgs, setInternalDesgs] = useState<any[]>([]);
  const [isLoadingMasterData, setIsLoadingMasterData] = useState(false);

  // Candidate Selection State
  const [selectedAppId, setSelectedAppId] = useState<string>('');
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [isCandidateDropdownOpen, setIsCandidateDropdownOpen] = useState(false);
  const [candidateSearchQuery, setCandidateSearchQuery] = useState('');
  const [candidateFilterTab, setCandidateFilterTab] = useState<'interview_cleared' | 'all'>('interview_cleared');

  // Mandatory Form Fields
  const [positionTitle, setPositionTitle] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [designationId, setDesignationId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [locationName, setLocationName] = useState('Bengaluru HQ');
  const [reportingManager, setReportingManager] = useState('');

  // Compensation
  const [annualCTC, setAnnualCTC] = useState('1200000');
  const [currency, setCurrency] = useState('INR');
  const [joiningBonus, setJoiningBonus] = useState('');

  // Dates & Terms
  const [offerStartDate, setOfferStartDate] = useState('');
  const [offerExpiryDate, setOfferExpiryDate] = useState('');
  const [noticePeriod, setNoticePeriod] = useState('60 days');
  const [probationPeriod, setProbationPeriod] = useState('3 months');

  // Compliance covenants from template
  const [bgvMandatory, setBgvMandatory] = useState(true);
  const [ndaMandatory, setNdaMandatory] = useState(true);
  const [nonCompete, setNonCompete] = useState(true);
  const [relievingLetter, setRelievingLetter] = useState(true);

  // Merged Letter HTML Preview
  const [previewHtml, setPreviewHtml] = useState('');

  const candidateDropdownRef = useRef<HTMLDivElement>(null);
  const templateDropdownRef = useRef<HTMLDivElement>(null);

  // Resolved active lists
  const activeDeptList = (departmentList && departmentList.length > 0) ? departmentList : internalDepts;
  const activeDesgList = (designationList && designationList.length > 0) ? designationList : internalDesgs;

  // Filter candidates who applied and cleared interview
  const filteredCandidates = useMemo(() => {
    return applicationList.filter((app: any) => {
      const status = (app.application_status || app.applicationStatus || app.status || '').toLowerCase();
      const screeningStatus = (app.initial_screening_status || app.initialScreeningStatus || '').toLowerCase();
      const candStatus = (app.candidate_status || app.candidateStatus || '').toLowerCase();
      
      // Exclude explicitly rejected or withdrawn
      if (status === 'rejected' || status === 'withdrawn' || screeningStatus === 'failed') {
        return false;
      }

      const isInterviewCleared = 
        status === 'interview' || 
        status === 'offer' || 
        status === 'shortlisted' || 
        status === 'selected' ||
        candStatus === 'interview_cleared' ||
        candStatus === 'shortlisted' ||
        candStatus === 'selected' ||
        screeningStatus === 'passed';

      if (candidateFilterTab === 'interview_cleared' && !isInterviewCleared) {
        return false;
      }

      // Search match
      if (!candidateSearchQuery.trim()) return true;
      const q = candidateSearchQuery.toLowerCase();
      const name = (app.candidateName || app.candidate_name || app.name || `${app.first_name || ''} ${app.last_name || ''}`).toLowerCase();
      const email = (app.candidateEmail || app.candidate_email || '').toLowerCase();
      const job = (app.jobTitle || app.position_title || app.job_title || '').toLowerCase();

      return name.includes(q) || email.includes(q) || job.includes(q);
    });
  }, [applicationList, candidateFilterTab, candidateSearchQuery]);

  // Load and normalize templates from API / Fallback
  const loadTemplates = async () => {
    try {
      const res = await apiClient.get('/letters/templates');
      const allTemplates = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      
      let hiringList: any[] = [];
      if (Array.isArray(allTemplates) && allTemplates.length > 0) {
        hiringList = allTemplates.filter((t: any) => {
          const cat = (t.letter_category || t.letterCategory || '').toLowerCase();
          const typ = (t.letter_type || t.letterType || '').toLowerCase();
          return cat === 'hiring' || typ === 'offer_letter' || typ === 'intent_to_offer' || typ === 'interview_call';
        });
        if (hiringList.length === 0) {
          hiringList = allTemplates;
        }
      }

      if (hiringList.length === 0) {
        hiringList = DEFAULT_FRONTEND_TEMPLATES.filter(t => t.letter_category === 'hiring');
      }

      setOfferTemplates(hiringList);
      
      // Auto select the primary offer letter template
      const primaryOffer = hiringList.find((t: any) => {
        const typ = (t.letter_type || t.letterType || '').toLowerCase();
        return typ === 'offer_letter';
      }) || hiringList[0];

      if (primaryOffer) {
        setSelectedTemplateId(String(primaryOffer.id));
        setBgvMandatory(!!(primaryOffer.bgv_mandatory ?? (primaryOffer as any).bgvMandatory));
        setNdaMandatory(!!(primaryOffer.nda_mandatory ?? (primaryOffer as any).ndaMandatory));
        setNonCompete(!!(primaryOffer.non_compete ?? (primaryOffer as any).nonCompete));
        setRelievingLetter(!!(primaryOffer.relieving_letter_required ?? (primaryOffer as any).relievingLetterRequired));
      }
    } catch (err) {
      console.warn('Fallback to local default templates', err);
      const fallbackList = DEFAULT_FRONTEND_TEMPLATES.filter(t => t.letter_category === 'hiring');
      setOfferTemplates(fallbackList);
      const def = fallbackList.find(t => t.letter_type === 'offer_letter') || fallbackList[0];
      if (def) setSelectedTemplateId(String(def.id));
    }
  };

  // Fetch Database Masters on Modal Open
  useEffect(() => {
    if (open) {
      setStep(1);
      setIsCandidateDropdownOpen(false);
      setIsTemplateDropdownOpen(false);
      setCandidateSearchQuery('');
      setIsLoadingMasterData(true);

      // 1. Fetch Hiring Templates from Master
      loadTemplates();

      // 2. Fetch Locations / Branches from DB
      apiClient.get('/settings/locations')
        .then(res => {
          const locs = res.data?.data?.items || res.data?.data || (Array.isArray(res.data) ? res.data : []);
          setLocations(locs);
          if (locs.length > 0 && !locationId) {
            setLocationId(String(locs[0].id));
            setLocationName(locs[0].name || locs[0].location_name || 'Headquarters');
          }
        })
        .catch(() => {});

      // 3. Fallback fetch departments if not passed as prop
      if (!departmentList || departmentList.length === 0) {
        apiClient.get('/settings/departments').then(res => {
          const items = res.data?.data?.items || res.data?.data || (Array.isArray(res.data) ? res.data : []);
          setInternalDepts(items);
        }).catch(() => {});
      }

      // 4. Fallback fetch designations if not passed as prop
      if (!designationList || designationList.length === 0) {
        apiClient.get('/settings/designations').then(res => {
          const items = res.data?.data?.items || res.data?.data || (Array.isArray(res.data) ? res.data : []);
          setInternalDesgs(items);
        }).catch(() => {});
      }

      // Default target joining date (30 days) & expiry date (7 days)
      const joinDate = new Date();
      joinDate.setDate(joinDate.getDate() + 30);
      setOfferStartDate(joinDate.toISOString().substring(0, 10));

      const expiry = new Date();
      expiry.setDate(expiry.getDate() + 7);
      setOfferExpiryDate(expiry.toISOString().substring(0, 10));

      setIsLoadingMasterData(false);
    }
  }, [open]);

  // Click outside to close candidate/template dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (candidateDropdownRef.current && !candidateDropdownRef.current.contains(event.target as Node)) {
        setIsCandidateDropdownOpen(false);
      }
      if (templateDropdownRef.current && !templateDropdownRef.current.contains(event.target as Node)) {
        setIsTemplateDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle Candidate Selection
  const handleSelectCandidate = (app: any) => {
    setSelectedAppId(String(app.id));
    setSelectedApp(app);
    setIsCandidateDropdownOpen(false);

    // Auto-fill role parameters
    const title = app.jobTitle || app.position_title || app.positionTitle || app.job_title || '';
    if (title) setPositionTitle(title);

    if (app.departmentId || app.department_id) {
      setDepartmentId(String(app.departmentId || app.department_id));
    }
    if (app.designationId || app.designation_id) {
      setDesignationId(String(app.designationId || app.designation_id));
    }
  };

  // Active Template
  const activeTemplate = useMemo(() => {
    if (offerTemplates.length === 0) return DEFAULT_FRONTEND_TEMPLATES[2];
    const found = offerTemplates.find(t => String(t.id) === String(selectedTemplateId));
    if (found) return found;
    return offerTemplates[0] || DEFAULT_FRONTEND_TEMPLATES[2];
  }, [offerTemplates, selectedTemplateId]);

  // Handle template selection change
  const handleSelectTemplate = (tpl: any) => {
    setSelectedTemplateId(String(tpl.id));
    setIsTemplateDropdownOpen(false);
    setBgvMandatory(!!(tpl.bgv_mandatory ?? (tpl as any).bgvMandatory));
    setNdaMandatory(!!(tpl.nda_mandatory ?? (tpl as any).ndaMandatory));
    setNonCompete(!!(tpl.non_compete ?? (tpl as any).nonCompete));
    setRelievingLetter(!!(tpl.relieving_letter_required ?? (tpl as any).relievingLetterRequired));
  };

  // Get Clean Display Names
  const getCandidateName = (app: any) => {
    return app.candidateName || app.candidate_name || app.name || `${app.first_name || ''} ${app.last_name || ''}`.trim() || `Applicant #${app.id}`;
  };

  const getTemplateName = (tpl: any) => {
    return tpl.template_name || tpl.templateName || tpl.name || 'Corporate Offer Letter';
  };

  const getTemplateCode = (tpl: any) => {
    return tpl.template_code || tpl.templateCode || `TPL-${tpl.id}`;
  };

  // Compile and generate Live Letterhead HTML
  const buildPreviewHtml = () => {
    const candName = selectedApp ? getCandidateName(selectedApp) : 'Candidate Name';
    const candEmail = selectedApp ? (selectedApp.candidateEmail || selectedApp.candidate_email || 'candidate@example.com') : 'candidate@example.com';
    const candPhone = selectedApp ? (selectedApp.candidatePhone || selectedApp.candidate_phone || '+91 98765 43210') : '+91 98765 43210';
    
    const dept = activeDeptList.find((d: any) => String(d.id) === String(departmentId));
    const deptName = dept?.name || dept?.department_name || 'Engineering & Product';

    const desg = activeDesgList.find((d: any) => String(d.id) === String(designationId));
    const desgName = desg?.name || desg?.designation_name || positionTitle || 'Software Engineer';

    const loc = locations.find((l: any) => String(l.id) === String(locationId));
    const activeLocName = loc?.name || loc?.location_name || locationName || 'Bengaluru HQ';

    const ctcNum = parseFloat(annualCTC) || 1200000;
    const basicNum = Math.round(ctcNum * 0.5);

    const formattedStartDate = offerStartDate ? new Date(offerStartDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '30 Days from date of offer';
    const formattedExpiryDate = offerExpiryDate ? new Date(offerExpiryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '7 Days from issue date';

    const vars: Record<string, string> = {
      '{{candidate_name}}': candName,
      '{{candidate_email}}': candEmail,
      '{{candidate_phone}}': candPhone,
      '{{position_title}}': positionTitle || desgName,
      '{{department_name}}': deptName,
      '{{designation_name}}': desgName,
      '{{grade_band}}': 'Standard Band',
      '{{work_model}}': 'Onsite / Hybrid',
      '{{office_location}}': activeLocName,
      '{{reporting_manager}}': reportingManager || 'Department Head',
      '{{cost_to_company}}': ctcNum.toLocaleString('en-IN'),
      '{{base_salary}}': basicNum.toLocaleString('en-IN'),
      '{{currency}}': currency,
      '{{joining_bonus}}': joiningBonus ? parseFloat(joiningBonus).toLocaleString('en-IN') : '0',
      '{{offer_start_date}}': formattedStartDate,
      '{{offer_expiry_date}}': formattedExpiryDate,
      '{{probation_period}}': probationPeriod,
      '{{notice_period}}': noticePeriod,
      '{{company_name}}': activeTemplate.company_name_override || (activeTemplate as any).companyNameOverride || 'Apponext Technologies Pvt. Ltd.',
      '{{company_address}}': activeTemplate.company_address_override || (activeTemplate as any).companyAddressOverride || 'Level 6, Tech Park Phase 2, Outer Ring Road, Bengaluru, 560103',
      '{{signatory_name}}': activeTemplate.signatory_name || (activeTemplate as any).signatoryName || 'Priya Sharma',
      '{{signatory_designation}}': activeTemplate.signatory_designation || (activeTemplate as any).signatoryDesignation || 'Director - Human Resources',
      '{{current_date}}': new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }),
      '{{letter_code}}': `OFFER-2026-${Math.floor(1000 + Math.random() * 9000)}`,
    };

    let renderedBody = activeTemplate.body_content || (activeTemplate as any).bodyContent || '';
    let renderedSubject = activeTemplate.subject || 'Letter of Offer & Employment Agreement';
    let renderedTerms = activeTemplate.terms_and_conditions || (activeTemplate as any).termsAndConditions || '';
    let renderedCustom = activeTemplate.custom_clause || (activeTemplate as any).customClause || '';

    for (const [key, val] of Object.entries(vars)) {
      const reg = new RegExp(key.replace(/[{}]/g, '\\$&'), 'g');
      renderedBody = renderedBody.replace(reg, val);
      renderedSubject = renderedSubject.replace(reg, val);
      renderedTerms = renderedTerms.replace(reg, val);
      renderedCustom = renderedCustom.replace(reg, val);
    }

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Plus Jakarta Sans', Arial, sans-serif; background: #f8fafc; padding: 24px; color: #1e293b; font-size: 13.5px; line-height: 1.7; }
  .sheet { max-width: 800px; margin: 0 auto; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); }
  .top-accent { height: 6px; background: linear-gradient(90deg, #4f46e5, #7c3aed, #2563eb); }
  .sheet-inner { padding: 40px 50px; }
  .header { display: flex; justify-content: space-between; border-bottom: 1.5px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 25px; }
  .company-title { font-size: 20px; font-weight: 800; color: #0f172a; }
  .company-sub { font-size: 11.5px; color: #64748b; margin-top: 4px; max-width: 340px; }
  .doc-tag { background: #eef2ff; color: #4338ca; font-weight: 700; font-size: 10.5px; padding: 4px 10px; border-radius: 6px; border: 1px solid #c7d2fe; text-transform: uppercase; }
  .subject-line { font-weight: 700; color: #0f172a; margin-bottom: 20px; font-size: 14px; }
  .body-text { white-space: pre-wrap; line-height: 1.85; color: #334155; }
  .box { background: #f8fafc; border-left: 4px solid #4f46e5; padding: 14px 18px; border-radius: 0 6px 6px 0; margin: 20px 0; font-size: 12px; color: #475569; }
  .box-title { font-weight: 700; color: #1e293b; margin-bottom: 4px; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; }
  .signs { margin-top: 40px; display: flex; justify-content: space-between; padding-top: 20px; }
  .sign-box { min-width: 200px; }
  .sign-line { border-top: 1.5px dashed #94a3b8; margin-top: 45px; padding-top: 8px; }
  .footer { border-top: 1px solid #f1f5f9; margin-top: 35px; padding-top: 15px; font-size: 11px; color: #94a3b8; text-align: center; }
</style>
</head>
<body>
<div class="sheet">
  <div class="top-accent"></div>
  <div class="sheet-inner">
    <div class="header">
      <div>
        ${activeTemplate.logo_url ? `<img src="${activeTemplate.logo_url}" style="max-height:48px; margin-bottom:6px;" alt="Logo" />` : ''}
        <div class="company-title">${activeTemplate.company_name_override || (activeTemplate as any).companyNameOverride || 'Apponext Technologies Pvt. Ltd.'}</div>
        <div class="company-sub">${activeTemplate.company_address_override || (activeTemplate as any).companyAddressOverride || 'Level 6, Tech Park Phase 2, Outer Ring Road, Bengaluru, 560103'}</div>
      </div>
      <div style="text-align: right;">
        <div class="doc-tag">OFFICIAL OFFER OF EMPLOYMENT</div>
        <div style="font-size: 12px; color: #64748b; margin-top: 8px;">Date: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
      </div>
    </div>

    ${renderedSubject ? `<div class="subject-line">${renderedSubject}</div>` : ''}
    <div class="body-text">${renderedBody}</div>

    ${renderedTerms ? `
    <div class="box">
      <div class="box-title">Key Terms & Conditions</div>
      <div>${renderedTerms}</div>
    </div>` : ''}

    ${renderedCustom ? `
    <div class="box" style="border-left-color: #0ea5e9;">
      <div class="box-title">Special Clauses & Acceptance</div>
      <div>${renderedCustom}</div>
    </div>` : ''}

    <div class="signs">
      <div class="sign-box">
        <div class="sign-line">
          <div style="font-weight: 700; color: #0f172a;">${activeTemplate.signatory_name || (activeTemplate as any).signatoryName || 'Priya Sharma'}</div>
          <div style="font-size: 12px; color: #64748b;">${activeTemplate.signatory_designation || (activeTemplate as any).signatoryDesignation || 'Director - Human Resources'}</div>
          <div style="font-size: 11px; color: #94a3b8;">${activeTemplate.company_name_override || (activeTemplate as any).companyNameOverride || 'Apponext Technologies'}</div>
        </div>
      </div>
      <div class="sign-box" style="text-align: right;">
        <div class="sign-line">
          <div style="font-weight: 700; color: #0f172a;">Candidate Acceptance Signature</div>
          <div style="font-size: 12px; color: #64748b;">Digitally Signed & Accepted</div>
          <div style="font-size: 11px; color: #94a3b8;">Date: __________________</div>
        </div>
      </div>
    </div>

    <div class="footer">
      This is a confidential corporate document generated by ${activeTemplate.company_name_override || (activeTemplate as any).companyNameOverride || 'Apponext Technologies'} HRMS.<br/>
      Strictly Private & Confidential • Authorized Candidate Communication
    </div>
  </div>
</div>
</body>
</html>`;
  };

  const handleProceedToPreview = () => {
    if (!selectedAppId) {
      toast.error('Please select a candidate application');
      return;
    }
    if (!positionTitle.trim()) {
      toast.error('Please enter the official position title');
      return;
    }
    if (!annualCTC || parseFloat(annualCTC) <= 0) {
      toast.error('Please enter a valid Annual CTC amount');
      return;
    }

    const html = buildPreviewHtml();
    setPreviewHtml(html);
    setStep(2);
  };

  const handleFinalSubmit = async () => {
    const ctcNum = parseFloat(annualCTC) || 1200000;
    const baseNum = Math.round(ctcNum * 0.5);

    const payload: any = {
      applicationId: parseInt(selectedAppId, 10),
      positionTitle: positionTitle.trim(),
      departmentId: departmentId ? parseInt(departmentId, 10) : undefined,
      designationId: designationId ? parseInt(designationId, 10) : undefined,
      costToCompany: ctcNum,
      baseSalary: baseNum,
      currency: currency || 'INR',
      offerStartDate,
      offerExpiryDate,
      meta: {
        templateId: selectedTemplateId,
        locationId,
        locationName,
        reportingManager: reportingManager.trim(),
        noticePeriod,
        probationPeriod,
        joiningBonus: joiningBonus ? parseFloat(joiningBonus) : 0,
        renderedHtml: previewHtml,
        bgvMandatory,
        ndaMandatory,
        nonCompete,
        relievingLetter,
      },
    };

    await onSubmit(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-6 rounded-3xl">
        
        {/* Top Header */}
        <DialogHeader className="pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-md">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-extrabold text-slate-900 dark:text-white">
                  Create Candidate Offer Letter
                </DialogTitle>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Select candidate application, configure role parameters, and generate executive offer letterhead.
                </p>
              </div>
            </div>

            {/* 2-Step Pill Indicator */}
            <div className="flex items-center gap-2">
              <span className={cn(
                "px-3 py-1 rounded-full text-xs font-bold transition-all",
                step === 1 ? "bg-indigo-600 text-white shadow-xs" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
              )}>
                1. Offer Details
              </span>
              <div className="w-4 h-0.5 bg-slate-200 dark:bg-slate-700" />
              <span className={cn(
                "px-3 py-1 rounded-full text-xs font-bold transition-all",
                step === 2 ? "bg-indigo-600 text-white shadow-xs" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
              )}>
                2. Letterhead Review
              </span>
            </div>
          </div>
        </DialogHeader>

        {/* STEP 1: Streamlined Mandatory Form (Database-Driven) */}
        {step === 1 && (
          <div className="space-y-6 py-4">
            
            {/* Section A: Candidate Application & Master Template */}
            <div className="p-4 bg-slate-50/80 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <User className="w-4 h-4 text-indigo-600" />
                  <span>Candidate Selection & Master Format</span>
                </span>
                <span className="text-[11px] text-slate-400">Live Database Records</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Custom Robust Candidate Dropdown with Search & Filter */}
                <div className="space-y-1.5 relative" ref={candidateDropdownRef}>
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Select Candidate Application <span className="text-rose-500">*</span>
                  </Label>

                  {/* Trigger Box */}
                  <div
                    onClick={() => {
                      setIsCandidateDropdownOpen(!isCandidateDropdownOpen);
                      setIsTemplateDropdownOpen(false);
                    }}
                    className={cn(
                      "w-full h-11 px-3.5 py-2 rounded-xl border bg-white dark:bg-slate-900 flex items-center justify-between cursor-pointer transition-all text-xs font-semibold shadow-2xs",
                      isCandidateDropdownOpen ? "border-indigo-500 ring-2 ring-indigo-500/20" : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
                    )}
                  >
                    <div className="truncate">
                      {selectedApp ? (
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="text-slate-900 dark:text-white font-extrabold">
                            {getCandidateName(selectedApp)}
                          </span>
                          <span className="text-slate-400 font-normal truncate">
                            • {selectedApp.jobTitle || selectedApp.position_title || 'Applicant'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 font-normal">Choose candidate (interview cleared)...</span>
                      )}
                    </div>
                    <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
                  </div>

                  {/* Candidate Dropdown Menu */}
                  {isCandidateDropdownOpen && (
                    <div className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl z-50 p-2.5 space-y-2 animate-in fade-in-50 zoom-in-95">
                      
                      {/* Search in Dropdown */}
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                        <Input
                          placeholder="Search candidate name, email, role..."
                          value={candidateSearchQuery}
                          onChange={(e) => setCandidateSearchQuery(e.target.value)}
                          className="h-8 text-xs pl-8 rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                          autoFocus
                        />
                      </div>

                      {/* Filter Stage Pills */}
                      <div className="flex items-center gap-1.5 pt-0.5">
                        <button
                          type="button"
                          onClick={() => setCandidateFilterTab('interview_cleared')}
                          className={cn(
                            "px-2.5 py-1 rounded-lg text-[10.5px] font-bold cursor-pointer transition-all border",
                            candidateFilterTab === 'interview_cleared'
                              ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs"
                              : "bg-slate-50 dark:bg-slate-800 text-slate-600 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                          )}
                        >
                          <CheckCheck className="w-3 h-3 inline mr-1" />
                          Interview Cleared / Eligible
                        </button>

                        <button
                          type="button"
                          onClick={() => setCandidateFilterTab('all')}
                          className={cn(
                            "px-2.5 py-1 rounded-lg text-[10.5px] font-bold cursor-pointer transition-all border",
                            candidateFilterTab === 'all'
                              ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs"
                              : "bg-slate-50 dark:bg-slate-800 text-slate-600 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                          )}
                        >
                          All Applicants ({applicationList.length})
                        </button>
                      </div>

                      {/* Candidates List */}
                      <div className="max-h-56 overflow-y-auto space-y-1 pr-1 pt-1">
                        {filteredCandidates.length === 0 ? (
                          <div className="text-center py-6 text-slate-400 text-xs">
                            No candidates matching filter.
                          </div>
                        ) : (
                          filteredCandidates.map((app: any) => {
                            const isSelected = String(app.id) === String(selectedAppId);
                            const name = getCandidateName(app);
                            const job = app.jobTitle || app.position_title || app.job_title || 'Applied Job';
                            const status = (app.application_status || app.applicationStatus || app.status || 'applied').toUpperCase();

                            return (
                              <div
                                key={app.id}
                                onClick={() => handleSelectCandidate(app)}
                                className={cn(
                                  "p-2.5 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between gap-2",
                                  isSelected
                                    ? "bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-800 text-indigo-950 dark:text-indigo-200 font-bold"
                                    : "bg-white dark:bg-slate-900 border-transparent hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-200"
                                )}
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-slate-900 dark:text-white truncate">{name}</span>
                                    <span className="text-[9.5px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                                      {status}
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                    {job} • {app.candidateEmail || app.candidate_email || 'No email'}
                                  </div>
                                </div>
                                {isSelected && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Offer Letter Master Template Custom Dropdown */}
                <div className="space-y-1.5 relative" ref={templateDropdownRef}>
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>Offer Letter Master Format <span className="text-rose-500">*</span></span>
                    <span className="text-[10.5px] text-indigo-600 font-bold uppercase">Company Master</span>
                  </Label>
                  
                  {/* Template Trigger */}
                  <div
                    onClick={() => {
                      setIsTemplateDropdownOpen(!isTemplateDropdownOpen);
                      setIsCandidateDropdownOpen(false);
                    }}
                    className={cn(
                      "w-full h-11 px-3.5 py-2 rounded-xl border bg-white dark:bg-slate-900 flex items-center justify-between cursor-pointer transition-all text-xs font-semibold shadow-2xs",
                      isTemplateDropdownOpen ? "border-indigo-500 ring-2 ring-indigo-500/20" : "border-indigo-200 dark:border-indigo-800 text-indigo-950 dark:text-indigo-200 hover:border-indigo-300"
                    )}
                  >
                    <div className="truncate flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                      <div className="truncate">
                        <span className="font-extrabold text-slate-900 dark:text-white">
                          {getTemplateName(activeTemplate)}
                        </span>
                        <span className="text-indigo-600 font-mono text-[11px] ml-1.5">
                          ({getTemplateCode(activeTemplate)})
                        </span>
                      </div>
                    </div>
                    <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
                  </div>

                  {/* Template Dropdown Menu */}
                  {isTemplateDropdownOpen && (
                    <div className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl z-50 p-2.5 space-y-1 max-h-60 overflow-y-auto animate-in fade-in-50 zoom-in-95">
                      <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider px-2 py-1">
                        Available Master Formats ({offerTemplates.length})
                      </div>
                      {offerTemplates.map((tpl: any) => {
                        const isSelected = String(tpl.id) === String(selectedTemplateId);
                        const name = getTemplateName(tpl);
                        const code = getTemplateCode(tpl);
                        const subj = tpl.subject || 'Official Offer Letter';

                        return (
                          <div
                            key={tpl.id}
                            onClick={() => handleSelectTemplate(tpl)}
                            className={cn(
                              "p-2.5 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between gap-2",
                              isSelected
                                ? "bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-800 text-indigo-950 dark:text-indigo-200 font-bold"
                                : "bg-white dark:bg-slate-900 border-transparent hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-200"
                            )}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-900 dark:text-white truncate">{name}</span>
                                <span className="text-[9.5px] font-mono font-bold px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800">
                                  {code}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-400 truncate mt-0.5 font-normal">
                                {subj}
                              </div>
                            </div>
                            {isSelected && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Selected Candidate Quick Profile Bar */}
              {selectedApp && (
                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {getCandidateName(selectedApp)}
                    </span>
                    <span className="text-slate-400 ml-2 font-mono">
                      {selectedApp.candidateEmail || selectedApp.candidate_email || 'No email'}
                    </span>
                    <span className="text-slate-400 ml-2">
                      • {selectedApp.candidatePhone || selectedApp.candidate_phone || 'No phone'}
                    </span>
                  </div>
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10.5px] font-bold">
                    Profile Data Linked & Verified
                  </Badge>
                </div>
              )}
            </div>

            {/* Section B: Position & Organizational Placement */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Briefcase className="w-4 h-4 text-indigo-600" />
                  <span>Position & Role Specifications</span>
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5 md:col-span-3">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Official Position Title <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    value={positionTitle}
                    onChange={(e) => setPositionTitle(e.target.value)}
                    placeholder="e.g. Senior Full Stack Developer"
                    className="h-9 text-xs rounded-xl"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Department</Label>
                  <select
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    className="w-full h-9 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-semibold"
                  >
                    <option value="">Select Department</option>
                    {activeDeptList.map((d: any) => (
                      <option key={d.id} value={d.id.toString()}>
                        {d.name || d.department_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Designation</Label>
                  <select
                    value={designationId}
                    onChange={(e) => setDesignationId(e.target.value)}
                    className="w-full h-9 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-semibold"
                  >
                    <option value="">Select Designation</option>
                    {activeDesgList.map((d: any) => (
                      <option key={d.id} value={d.id.toString()}>
                        {d.name || d.designation_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Office Location / Branch</Label>
                  <select
                    value={locationId}
                    onChange={(e) => {
                      setLocationId(e.target.value);
                      const matched = locations.find((l: any) => String(l.id) === String(e.target.value));
                      if (matched) setLocationName(matched.name || matched.location_name || '');
                    }}
                    className="w-full h-9 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-semibold"
                  >
                    {locations.length > 0 ? (
                      locations.map((loc: any) => (
                        <option key={loc.id} value={loc.id.toString()}>
                          {loc.name || loc.location_name || loc.branch_name}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="1">Bengaluru Tech Park (HQ)</option>
                        <option value="2">Mumbai Regional Hub</option>
                        <option value="3">Hyderabad Center</option>
                        <option value="4">Remote / Work from Anywhere</option>
                      </>
                    )}
                  </select>
                </div>
              </div>
            </div>

            {/* Section C: Compensation & Remuneration */}
            <div className="p-4 bg-slate-50/80 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-indigo-600" />
                  <span>Compensation & CTC Structure</span>
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Annual Cost to Company (CTC) <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    type="number"
                    value={annualCTC}
                    onChange={(e) => setAnnualCTC(e.target.value)}
                    placeholder="e.g. 1500000"
                    className="h-9 text-xs rounded-xl bg-white dark:bg-slate-900 font-bold"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Currency</Label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full h-9 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-semibold"
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="AED">AED (د.إ)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Sign-on / Joining Bonus (Optional)</Label>
                  <Input
                    type="number"
                    value={joiningBonus}
                    onChange={(e) => setJoiningBonus(e.target.value)}
                    placeholder="e.g. 50000"
                    className="h-9 text-xs rounded-xl bg-white dark:bg-slate-900"
                  />
                </div>
              </div>
            </div>

            {/* Section D: Key Dates & Employment Terms */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Target Joining Date <span className="text-rose-500">*</span>
                </Label>
                <Input
                  type="date"
                  value={offerStartDate}
                  onChange={(e) => setOfferStartDate(e.target.value)}
                  className="h-9 text-xs rounded-xl"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Offer Expiry Date <span className="text-rose-500">*</span>
                </Label>
                <Input
                  type="date"
                  value={offerExpiryDate}
                  onChange={(e) => setOfferExpiryDate(e.target.value)}
                  className="h-9 text-xs rounded-xl"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Notice Period</Label>
                <select
                  value={noticePeriod}
                  onChange={(e) => setNoticePeriod(e.target.value)}
                  className="w-full h-9 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-semibold"
                >
                  <option value="30 days">30 Days</option>
                  <option value="60 days">60 Days</option>
                  <option value="90 days">90 Days</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Reporting Authority</Label>
                <Input
                  value={reportingManager}
                  onChange={(e) => setReportingManager(e.target.value)}
                  placeholder="e.g. VP Engineering"
                  className="h-9 text-xs rounded-xl"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Live Letterhead Render Review & Dispatch */}
        {step === 2 && (
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between bg-indigo-50 dark:bg-indigo-950/40 p-3.5 rounded-2xl border border-indigo-200 dark:border-indigo-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                  Ready to Issue Offer Letter: <strong>{positionTitle}</strong> for <strong>{selectedApp ? getCandidateName(selectedApp) : ''}</strong>
                </span>
              </div>
              <Badge className="bg-indigo-600 text-white text-[10.5px]">
                {currency} {parseFloat(annualCTC || '0').toLocaleString('en-IN')} / annum
              </Badge>
            </div>

            {/* Letterhead Rendered Iframe */}
            <iframe
              srcDoc={previewHtml}
              title="Offer Letterhead Preview"
              className="w-full h-[540px] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-inner bg-white"
            />
          </div>
        )}

        {/* Footer Navigation */}
        <DialogFooter className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            {step === 2 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(1)}
                className="h-9 px-4 text-xs font-semibold rounded-xl"
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
                Edit Offer Details
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
                onClick={handleProceedToPreview}
                className="h-9 px-5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
              >
                <span>Review Letterhead</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            )}

            {step === 2 && (
              <Button
                type="button"
                onClick={handleFinalSubmit}
                disabled={isSubmitting}
                className="h-9 px-5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Generating Offer...' : 'Save & Issue Offer Letter'}</span>
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
