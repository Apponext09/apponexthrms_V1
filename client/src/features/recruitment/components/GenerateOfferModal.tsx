import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  User, Briefcase, DollarSign, Calendar, ShieldCheck, 
  ChevronRight, ChevronLeft, Building2, Calculator, 
  CheckCircle2, FileText, AlertCircle, RefreshCw
} from 'lucide-react';

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
  applicationList,
  departmentList,
  designationList,
}) => {
  const [step, setStep] = useState(1);

  // Form State
  const [selectedAppId, setSelectedAppId] = useState('');
  const [selectedApp, setSelectedApp] = useState<any>(null);
  
  const [positionTitle, setPositionTitle] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [designationId, setDesignationId] = useState('');
  const [gradeBand, setGradeBand] = useState('L2');
  const [employmentType, setEmploymentType] = useState('full-time');
  const [workModel, setWorkModel] = useState('hybrid');
  const [officeLocation, setOfficeLocation] = useState('Bengaluru HQ');
  const [reportingManager, setReportingManager] = useState('');
  const [probationPeriod, setProbationPeriod] = useState('3 months');
  const [noticePeriod, setNoticePeriod] = useState('90 days');

  // Compensation State
  const [annualCTC, setAnnualCTC] = useState('1200000');
  const [currency, setCurrency] = useState('INR');
  const [calcPreset, setCalcPreset] = useState('standard'); // standard | startup | executive
  const [baseSalaryRatio, setBaseSalaryRatio] = useState(50); // % of fixed
  const [hasPerformanceBonus, setHasPerformanceBonus] = useState(true);
  const [performanceBonusPct, setPerformanceBonusPct] = useState(10); // % of CTC
  const [joiningBonus, setJoiningBonus] = useState('50000');
  const [includeBenefits, setIncludeBenefits] = useState(true);

  // Dates & Compliance State
  const [offerStartDate, setOfferStartDate] = useState('');
  const [offerExpiryDate, setOfferExpiryDate] = useState('');
  const [bgvMandatory, setBgvMandatory] = useState(true);
  const [ndaMandatory, setNdaMandatory] = useState(true);
  const [nonCompete, setNonCompete] = useState(true);
  const [relievingLetter, setRelievingLetter] = useState(true);
  const [relocationAllowance, setRelocationAllowance] = useState('0');
  const [customClause, setCustomClause] = useState('');

  // Compensation calculations (triggered on annualCTC, baseSalaryRatio, performanceBonusPct, hasPerformanceBonus changes)
  const [salaryBreakdown, setSalaryBreakdown] = useState<any>({
    ctc: 0,
    variablePay: 0,
    fixedCTC: 0,
    basic: 0,
    hra: 0,
    epf: 0,
    gratuity: 0,
    specialAllowance: 0,
    monthlyGross: 0,
    monthlyInHand: 0,
  });

  // Autofill form when application selection changes
  useEffect(() => {
    if (selectedAppId) {
      const app = applicationList.find((a: any) => a.id.toString() === selectedAppId);
      if (app) {
        setSelectedApp(app);
        setPositionTitle(app.jobTitle || app.position_title || '');
        if (app.departmentId || app.department_id) {
          setDepartmentId((app.departmentId || app.department_id).toString());
        }
        if (app.designationId || app.designation_id) {
          setDesignationId((app.designationId || app.designation_id).toString());
        }
      }
    } else {
      setSelectedApp(null);
    }
  }, [selectedAppId, applicationList]);

  // Set default dates on open
  useEffect(() => {
    if (open) {
      setStep(1);
      // Default joining date: 30 days from today
      const joinDate = new Date();
      joinDate.setDate(joinDate.getDate() + 30);
      setOfferStartDate(joinDate.toISOString().substring(0, 10));

      // Default expiry date: 7 days from today
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + 7);
      setOfferExpiryDate(expiry.toISOString().substring(0, 10));
    }
  }, [open]);

  // Calculate salary components based on standard formula
  useEffect(() => {
    const ctc = parseFloat(annualCTC) || 0;
    
    // Performance Bonus amount
    const varPayPct = hasPerformanceBonus ? performanceBonusPct : 0;
    const variablePay = Math.round((ctc * varPayPct) / 100);
    const fixedCTC = ctc - variablePay;

    // Basic is percentage of fixed CTC
    const basicRatio = baseSalaryRatio / 100;
    const basic = Math.round(fixedCTC * basicRatio);

    // HRA is 50% of Basic (Metro City standard)
    const hra = Math.round(basic * 0.5);

    // Retirals: 
    // Employer EPF: 12% of Basic or capped at 1,800/month (21,600/year)
    const epf = Math.min(Math.round(basic * 0.12), 21600);

    // Gratuity: 4.81% of Basic (Statutory calculation)
    const gratuity = Math.round(basic * 0.0481);

    // Special / Flexible Benefit Allowance: balancing component
    const specialAllowance = Math.round(fixedCTC - (basic + hra + epf + gratuity));

    const monthlyGross = Math.round((basic + hra + specialAllowance) / 12);
    // Rough estimate: Gross - employee PF contribution (equal to employer PF) - standard TDS/professional tax
    const employeePF = Math.min(Math.round((basic / 12) * 0.12), 1800);
    const monthlyInHand = Math.max(0, monthlyGross - employeePF - 200); // 200 default Professional Tax

    setSalaryBreakdown({
      ctc,
      variablePay,
      fixedCTC,
      basic,
      hra,
      epf,
      gratuity,
      specialAllowance,
      monthlyGross,
      monthlyInHand,
    });
  }, [annualCTC, baseSalaryRatio, hasPerformanceBonus, performanceBonusPct, calcPreset]);

  // Presets handler
  const handlePresetChange = (preset: string) => {
    setCalcPreset(preset);
    if (preset === 'standard') {
      setBaseSalaryRatio(50);
      setPerformanceBonusPct(10);
      setHasPerformanceBonus(true);
    } else if (preset === 'startup') {
      setBaseSalaryRatio(40);
      setPerformanceBonusPct(15);
      setHasPerformanceBonus(true);
    } else if (preset === 'executive') {
      setBaseSalaryRatio(45);
      setPerformanceBonusPct(25);
      setHasPerformanceBonus(true);
    }
  };

  const getCurrencySymbol = () => {
    switch (currency) {
      case 'INR': return '₹';
      case 'USD': return '$';
      case 'EUR': return '€';
      case 'GBP': return '£';
      default: return currency;
    }
  };

  const handleNext = () => {
    if (step === 1 && (!selectedAppId || !positionTitle)) {
      alert('Please select a candidate application and specify position title.');
      return;
    }
    if (step === 2 && (parseFloat(annualCTC) <= 0)) {
      alert('Annual CTC must be greater than zero.');
      return;
    }
    if (step === 3 && (!offerStartDate || !offerExpiryDate)) {
      alert('Please specify the joining and offer expiry dates.');
      return;
    }
    setStep(s => Math.min(s + 1, 4));
  };

  const handleBack = () => {
    setStep(s => Math.max(s - 1, 1));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 4) {
      handleNext();
      return;
    }

    const payload = {
      applicationId: parseInt(selectedAppId, 10),
      positionTitle,
      departmentId: departmentId ? parseInt(departmentId, 10) : undefined,
      designationId: designationId ? parseInt(designationId, 10) : undefined,
      costToCompany: parseFloat(annualCTC),
      baseSalary: salaryBreakdown.basic,
      currency,
      offerStartDate,
      offerExpiryDate,
      // Metadata (these are handled in custom preview display or stored if schema expands, base remains fully compatible)
      meta: {
        gradeBand,
        employmentType,
        workModel,
        officeLocation,
        reportingManager,
        probationPeriod,
        noticePeriod,
        variablePay: salaryBreakdown.variablePay,
        joiningBonus: parseFloat(joiningBonus) || 0,
        relocationAllowance: parseFloat(relocationAllowance) || 0,
        bgvMandatory,
        ndaMandatory,
        nonCompete,
        relievingLetter,
        customClause,
      }
    };

    await onSubmit(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-slate-50 border-slate-200">
        <DialogHeader className="px-6 py-4 bg-white border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center justify-between col-span-12">
            <div>
              <DialogTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <FileText className="h-5 w-5 text-indigo-600" />
                Create Offer Letter
              </DialogTitle>
              <p className="text-xs text-slate-500 mt-0.5">Select candidate, define CTC breakdown, and configure offer terms.</p>
            </div>
            <Badge variant="outline" className="bg-slate-100 border-slate-200 text-slate-700 px-3 py-1 font-medium text-xs">
              Step {step} of 4
            </Badge>
          </div>

          {/* Stepper Progress bar */}
          <div className="grid grid-cols-4 gap-2 mt-4">
            {[
              { num: 1, label: 'Candidate & Role', icon: User },
              { num: 2, label: 'CTC Structuring', icon: DollarSign },
              { num: 3, label: 'Timeline & Policy', icon: Calendar },
              { num: 4, label: 'Review & Letter', icon: FileText },
            ].map((s) => (
              <div 
                key={s.num} 
                className={`flex items-center gap-2 pb-2 border-b-2 transition-all duration-300 ${
                  step === s.num 
                    ? 'border-indigo-600 text-indigo-700 font-semibold' 
                    : step > s.num 
                      ? 'border-emerald-500 text-emerald-600' 
                      : 'border-slate-200 text-slate-400'
                }`}
              >
                <div className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] ${
                  step === s.num 
                    ? 'bg-indigo-600 text-white' 
                    : step > s.num 
                      ? 'bg-emerald-500 text-white' 
                      : 'bg-slate-200 text-slate-500'
                }`}>
                  {step > s.num ? '✓' : s.num}
                </div>
                <span className="text-xs hidden sm:inline">{s.label}</span>
              </div>
            ))}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 min-h-0 space-y-6">
          {/* STEP 1: CANDIDATE & ROLE ASSIGNMENT */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                <div className="space-y-4">
                  <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                    <User className="h-4 w-4 text-indigo-600" /> Candidate Selection
                  </h3>
                  
                  <div>
                    <Label htmlFor="application" className="text-xs font-semibold text-slate-700">Select Job Application *</Label>
                    <Select value={selectedAppId} onValueChange={setSelectedAppId}>
                      <SelectTrigger className="bg-slate-50/50 mt-1 border-slate-200">
                        <SelectValue placeholder="Search / Select candidate application..." />
                      </SelectTrigger>
                      <SelectContent>
                        {applicationList.map((app: any) => (
                          <SelectItem key={app.id} value={app.id.toString()}>
                            {app.candidateName || app.candidate_name || `App #${app.id}`} - {app.jobTitle || app.position_title || 'General'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedApp && (
                    <div className="bg-slate-50 border border-slate-150 rounded-lg p-4 space-y-2 mt-3 animate-fadeIn text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">Candidate Email:</span>
                        <span className="text-slate-800 font-bold">{selectedApp.candidateEmail || selectedApp.candidate_email || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">Contact Number:</span>
                        <span className="text-slate-800 font-bold">{selectedApp.candidatePhone || selectedApp.candidate_phone || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">Applied Job:</span>
                        <span className="text-slate-800 font-bold">{selectedApp.jobTitle || selectedApp.position_title || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">Experience Level:</span>
                        <span className="text-indigo-600 font-semibold">{selectedApp.experienceYears ? `${selectedApp.experienceYears} Years` : 'N/A'}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-indigo-600" /> Position Specifications
                  </h3>

                  <div>
                    <Label htmlFor="position" className="text-xs font-semibold text-slate-700">Official Position Title *</Label>
                    <Input 
                      id="position" 
                      value={positionTitle} 
                      onChange={(e) => setPositionTitle(e.target.value)} 
                      placeholder="e.g. Senior Software Engineer"
                      className="mt-1 border-slate-200"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="dept" className="text-xs font-semibold text-slate-700">Department</Label>
                      <Select value={departmentId} onValueChange={setDepartmentId}>
                        <SelectTrigger className="mt-1 border-slate-200 bg-white">
                          <SelectValue placeholder="Department" />
                        </SelectTrigger>
                        <SelectContent>
                          {departmentList.map((d: any) => (
                            <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="desg" className="text-xs font-semibold text-slate-700">Designation</Label>
                      <Select value={designationId} onValueChange={setDesignationId}>
                        <SelectTrigger className="mt-1 border-slate-200 bg-white">
                          <SelectValue placeholder="Designation" />
                        </SelectTrigger>
                        <SelectContent>
                          {designationList.map((d: any) => (
                            <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm space-y-4">
                <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-indigo-600" /> Employment & Level Details
                </h3>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label className="text-xs font-medium text-slate-500">Grade / Level</Label>
                    <Select value={gradeBand} onValueChange={setGradeBand}>
                      <SelectTrigger className="mt-1 border-slate-200 bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="L1">L1 - Associate / Junior</SelectItem>
                        <SelectItem value="L2">L2 - Engineer / Specialist</SelectItem>
                        <SelectItem value="L3">L3 - Senior Professional</SelectItem>
                        <SelectItem value="L4">L4 - Technical Lead / Staff</SelectItem>
                        <SelectItem value="M1">M1 - Engineering Manager</SelectItem>
                        <SelectItem value="M2">M2 - Principal / Director</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs font-medium text-slate-500">Employment Type</Label>
                    <Select value={employmentType} onValueChange={setEmploymentType}>
                      <SelectTrigger className="mt-1 border-slate-200 bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full-time">Full-Time Regular</SelectItem>
                        <SelectItem value="contract">Fixed Term Contract</SelectItem>
                        <SelectItem value="probationary">Probationary Trainee</SelectItem>
                        <SelectItem value="intern">Paid Internship</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs font-medium text-slate-500">Work Model</Label>
                    <Select value={workModel} onValueChange={setWorkModel}>
                      <SelectTrigger className="mt-1 border-slate-200 bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="onsite">On-Site (100%)</SelectItem>
                        <SelectItem value="hybrid">Hybrid (Flexi-work)</SelectItem>
                        <SelectItem value="remote">Remote (WFA)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs font-medium text-slate-500">Office Base Location</Label>
                    <Select value={officeLocation} onValueChange={setOfficeLocation}>
                      <SelectTrigger className="mt-1 border-slate-200 bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Bengaluru HQ">Bengaluru Corp Office</SelectItem>
                        <SelectItem value="Mumbai Center">Mumbai Branch</SelectItem>
                        <SelectItem value="Hyderabad Campus">Hyderabad Campus</SelectItem>
                        <SelectItem value="Gurugram Hub">Gurugram Tech Hub</SelectItem>
                        <SelectItem value="Pune Office">Pune Center</SelectItem>
                        <SelectItem value="Remote">Remote Work Base</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  <div>
                    <Label htmlFor="reporting" className="text-xs font-medium text-slate-500">Reporting Manager (Name / Title)</Label>
                    <Input 
                      id="reporting" 
                      value={reportingManager} 
                      onChange={(e) => setReportingManager(e.target.value)} 
                      placeholder="e.g. Rajesh Kumar (VP Engineering)"
                      className="mt-1 border-slate-200"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-slate-500">Notice Period</Label>
                    <Select value={noticePeriod} onValueChange={setNoticePeriod}>
                      <SelectTrigger className="mt-1 border-slate-200 bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="None">None</SelectItem>
                        <SelectItem value="30 days">30 Days</SelectItem>
                        <SelectItem value="60 days">60 Days</SelectItem>
                        <SelectItem value="90 days">90 Days (Standard)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-slate-500">Probation Period</Label>
                    <Select value={probationPeriod} onValueChange={setProbationPeriod}>
                      <SelectTrigger className="mt-1 border-slate-200 bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="None">None / Direct Confirmed</SelectItem>
                        <SelectItem value="3 months">3 Months</SelectItem>
                        <SelectItem value="6 months">6 Months (Standard)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: COMPENSATION & CTC STRUCTURE */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                
                {/* Inputs card */}
                <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-150 shadow-sm space-y-4">
                  <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2 border-b pb-2">
                    <Calculator className="h-4 w-4 text-indigo-600" /> Structure Configuration
                  </h3>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="ctc" className="text-xs font-semibold text-slate-700">Annual CTC *</Label>
                      <div className="relative mt-1">
                        <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-semibold">{getCurrencySymbol()}</span>
                        <Input 
                          id="ctc" 
                          type="number" 
                          value={annualCTC} 
                          onChange={(e) => setAnnualCTC(e.target.value)} 
                          className="pl-7 border-slate-200 text-sm font-semibold"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="currency" className="text-xs font-semibold text-slate-700">Currency</Label>
                      <Select value={currency} onValueChange={setCurrency}>
                        <SelectTrigger className="mt-1 border-slate-200 bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="INR">INR (₹)</SelectItem>
                          <SelectItem value="USD">USD ($)</SelectItem>
                          <SelectItem value="EUR">EUR (€)</SelectItem>
                          <SelectItem value="GBP">GBP (£)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs font-medium text-slate-500">Salary Template / Ratio Preset</Label>
                    <div className="grid grid-cols-3 gap-2 mt-1">
                      {[
                        { id: 'standard', name: 'Standard' },
                        { id: 'startup', name: 'Tech Startup' },
                        { id: 'executive', name: 'Executive' },
                      ].map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handlePresetChange(p.id)}
                          className={`text-xs px-2.5 py-1.5 rounded-md border font-medium transition-all ${
                            calcPreset === p.id 
                              ? 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-sm' 
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {p.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-500 font-medium">Basic Pay (% of Fixed CTC):</span>
                        <span className="text-indigo-600 font-bold">{baseSalaryRatio}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="30" 
                        max="60" 
                        step="5"
                        value={baseSalaryRatio}
                        onChange={(e) => {
                          setCalcPreset('custom');
                          setBaseSalaryRatio(parseInt(e.target.value, 10));
                        }}
                        className="w-full h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />
                    </div>

                    <div className="border-t pt-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="bonusCheckbox" className="text-xs font-medium text-slate-705 flex items-center gap-1.5 cursor-pointer">
                          <Checkbox 
                            id="bonusCheckbox" 
                            checked={hasPerformanceBonus} 
                            onCheckedChange={(checked) => setHasPerformanceBonus(!!checked)}
                          />
                          Include Variable Performance Pay
                        </Label>
                      </div>

                      {hasPerformanceBonus && (
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-slate-500">Variable Allocation:</span>
                            <span className="text-indigo-600 font-bold">{performanceBonusPct}% of CTC</span>
                          </div>
                          <input 
                            type="range" 
                            min="5" 
                            max="30" 
                            step="5"
                            value={performanceBonusPct}
                            onChange={(e) => {
                              setCalcPreset('custom');
                              setPerformanceBonusPct(parseInt(e.target.value, 10));
                            }}
                            className="w-full h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                          />
                        </div>
                      )}
                    </div>

                    <div className="border-t pt-3 space-y-2">
                      <div>
                        <Label htmlFor="signing" className="text-xs font-medium text-slate-700">Sign-on / Joining Bonus (Lump-sum)</Label>
                        <div className="relative mt-1">
                          <span className="absolute left-2.5 top-2 text-xs text-slate-400">{getCurrencySymbol()}</span>
                          <Input 
                            id="signing" 
                            type="number" 
                            value={joiningBonus} 
                            onChange={(e) => setJoiningBonus(e.target.value)} 
                            className="pl-6 h-8 text-xs border-slate-200"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Live Breakdown Table card */}
                <div className="lg:col-span-3 bg-white p-5 rounded-xl border border-slate-150 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center border-b pb-2 mb-4">
                      <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                        <Calculator className="h-4 w-4 text-slate-600" /> Salary Breakdown
                      </h3>
                      <span className="text-[11px] text-slate-400 font-medium">Annual & Monthly</span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead>
                          <tr className="border-b border-slate-100 text-slate-400 font-semibold">
                            <th className="pb-2">Salary Components</th>
                            <th className="pb-2 text-right font-semibold">Monthly ({getCurrencySymbol()})</th>
                            <th className="pb-2 text-right font-semibold">Annual ({getCurrencySymbol()})</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 text-slate-700">
                          <tr>
                            <td className="py-2 font-medium">Basic Pay</td>
                            <td className="py-2 text-right font-semibold">{Math.round(salaryBreakdown.basic / 12).toLocaleString()}</td>
                            <td className="py-2 text-right font-semibold">{salaryBreakdown.basic.toLocaleString()}</td>
                          </tr>
                          <tr>
                            <td className="py-2 font-medium">House Rent Allowance (HRA)</td>
                            <td className="py-2 text-right">{Math.round(salaryBreakdown.hra / 12).toLocaleString()}</td>
                            <td className="py-2 text-right">{salaryBreakdown.hra.toLocaleString()}</td>
                          </tr>
                          <tr>
                            <td className="py-2 font-medium">Special Allowance (Balancing)</td>
                            <td className="py-2 text-right">{Math.round(salaryBreakdown.specialAllowance / 12).toLocaleString()}</td>
                            <td className="py-2 text-right">{salaryBreakdown.specialAllowance.toLocaleString()}</td>
                          </tr>
                          <tr>
                            <td className="py-2 font-medium text-slate-500">Employer EPF Contribution</td>
                            <td className="py-2 text-right text-slate-500">{Math.round(salaryBreakdown.epf / 12).toLocaleString()}</td>
                            <td className="py-2 text-right text-slate-500">{salaryBreakdown.epf.toLocaleString()}</td>
                          </tr>
                          <tr>
                            <td className="py-2 font-medium text-slate-500">Gratuity Accrual (4.81%)</td>
                            <td className="py-2 text-right text-slate-500">{Math.round(salaryBreakdown.gratuity / 12).toLocaleString()}</td>
                            <td className="py-2 text-right text-slate-500">{salaryBreakdown.gratuity.toLocaleString()}</td>
                          </tr>
                          {hasPerformanceBonus && (
                            <tr className="text-indigo-600 font-semibold bg-indigo-50/20">
                              <td className="py-2 pl-1">Performance Linked Variable Pay</td>
                              <td className="py-2 text-right">-</td>
                              <td className="py-2 text-right">{salaryBreakdown.variablePay.toLocaleString()}</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Summary Footer bar */}
                  <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 grid grid-cols-3 gap-2 text-center mt-4">
                    <div>
                      <p className="text-[10px] text-slate-500 font-medium uppercase">Annual CTC</p>
                      <p className="text-base font-bold text-slate-900 mt-0.5">{getCurrencySymbol()}{salaryBreakdown.ctc.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 font-medium uppercase">Monthly Gross</p>
                      <p className="text-base font-bold text-slate-900 mt-0.5">{getCurrencySymbol()}{salaryBreakdown.monthlyGross.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-emerald-600 font-bold uppercase flex items-center justify-center gap-0.5">
                        In-Hand Est.
                        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                      </p>
                      <p className="text-base font-bold text-emerald-700 mt-0.5">{getCurrencySymbol()}{salaryBreakdown.monthlyInHand.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

              </div>

              {/* Benefits Package toggle */}
              <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                  <Label htmlFor="benefitsToggle" className="font-bold text-slate-800 text-sm flex items-center gap-2 cursor-pointer">
                    <Checkbox 
                      id="benefitsToggle" 
                      checked={includeBenefits} 
                      onCheckedChange={(checked) => setIncludeBenefits(!!checked)}
                    />
                    Include Company Sponsored Benefits Package
                  </Label>
                  <Badge variant="secondary" className="bg-slate-100 text-slate-700">Included in Offer Terms</Badge>
                </div>

                {includeBenefits && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-1">
                    <div className="border border-slate-100 rounded-lg p-3 bg-slate-50/50">
                      <p className="font-bold text-slate-800 text-xs">Medical Insurance</p>
                      <p className="text-[10px] text-slate-500 mt-1">₹5,00,000 Group Health Floater covering Employee, Spouse & 2 Children.</p>
                    </div>
                    <div className="border border-slate-100 rounded-lg p-3 bg-slate-50/50">
                      <p className="font-bold text-slate-800 text-xs">Meal & Food Card</p>
                      <p className="text-[10px] text-slate-500 mt-1">Sodexo/Pluxee Card allowance of ₹2,200 per month tax-free.</p>
                    </div>
                    <div className="border border-slate-100 rounded-lg p-3 bg-slate-50/50">
                      <p className="font-bold text-slate-800 text-xs">WFH & Broadband</p>
                      <p className="text-[10px] text-slate-500 mt-1">Monthly allowance of ₹1,500 for high-speed fiber internet.</p>
                    </div>
                    <div className="border border-slate-100 rounded-lg p-3 bg-slate-50/50">
                      <p className="font-bold text-slate-800 text-xs">Wellness & Learning</p>
                      <p className="text-[10px] text-slate-500 mt-1">Annual reimbursement up to ₹25,000 for courses and gym.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: TIMELINE, COMPLIANCE & CLAUSES */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                
                <div className="space-y-4">
                  <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-indigo-600" /> Milestone Dates
                  </h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="join" className="text-xs font-semibold text-slate-700">Target Joining Date *</Label>
                      <Input 
                        id="join" 
                        type="date" 
                        value={offerStartDate} 
                        onChange={(e) => setOfferStartDate(e.target.value)} 
                        className="mt-1 border-slate-200"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="expiry" className="text-xs font-semibold text-slate-700">Offer Expiry Date *</Label>
                      <Input 
                        id="expiry" 
                        type="date" 
                        value={offerExpiryDate} 
                        onChange={(e) => setOfferExpiryDate(e.target.value)} 
                        className="mt-1 border-slate-200"
                        required
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <Label htmlFor="relocation" className="text-xs font-semibold text-slate-700">Relocation Allowance (INR)</Label>
                    <div className="relative mt-1">
                      <span className="absolute left-2.5 top-2 text-xs text-slate-400 font-medium">₹</span>
                      <Input 
                        id="relocation" 
                        type="number" 
                        value={relocationAllowance} 
                        onChange={(e) => setRelocationAllowance(e.target.value)} 
                        className="pl-6 border-slate-200"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">Paid post joining upon bill submission. Default is 0.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-indigo-600" /> Compliance Checklists & Covenants
                  </h3>

                  <div className="space-y-3 bg-slate-50 border border-slate-100 rounded-lg p-4">
                    <div className="flex items-start gap-2.5">
                      <Checkbox 
                        id="bgv" 
                        checked={bgvMandatory} 
                        onCheckedChange={(c) => setBgvMandatory(!!c)} 
                        className="mt-0.5"
                      />
                      <div>
                        <Label htmlFor="bgv" className="text-xs font-semibold text-slate-800 cursor-pointer">Background Verification Check</Label>
                        <p className="text-[10px] text-slate-500">Offer is conditional on clear verification of employment, criminal record, and education.</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <Checkbox 
                        id="nda" 
                        checked={ndaMandatory} 
                        onCheckedChange={(c) => setNdaMandatory(!!c)} 
                        className="mt-0.5"
                      />
                      <div>
                        <Label htmlFor="nda" className="text-xs font-semibold text-slate-800 cursor-pointer">Non-Disclosure & IP Assignment Agreement</Label>
                        <p className="text-[10px] text-slate-500">Candidate must sign the company Standard NDIA on or prior to day of joining.</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <Checkbox 
                        id="noncompete" 
                        checked={nonCompete} 
                        onCheckedChange={(c) => setNonCompete(!!c)} 
                        className="mt-0.5"
                      />
                      <div>
                        <Label htmlFor="noncompete" className="text-xs font-semibold text-slate-800 cursor-pointer">12-Month Non-Compete Clause</Label>
                        <p className="text-[10px] text-slate-500">Restricts joining immediate competitors for 12 months after leaving.</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <Checkbox 
                        id="relieving" 
                        checked={relievingLetter} 
                        onCheckedChange={(c) => setRelievingLetter(!!c)} 
                        className="mt-0.5"
                      />
                      <div>
                        <Label htmlFor="relieving" className="text-xs font-semibold text-slate-800 cursor-pointer">Mandatory Release/Relieving Documentation</Label>
                        <p className="text-[10px] text-slate-500">Candidate must submit relieving letter/resignation acceptance from current employer.</p>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Special notes text area */}
              <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-3">
                <Label htmlFor="customNotes" className="font-bold text-slate-800 text-sm">Special Notes / Customized Offer Clauses</Label>
                <textarea 
                  id="customNotes" 
                  value={customClause} 
                  onChange={(e) => setCustomClause(e.target.value)} 
                  placeholder="Enter any additional conditions, relocation details, equipment assignments, or custom instructions here..."
                  className="w-full h-24 border border-slate-200 rounded-lg p-3 text-xs outline-none focus:ring-1 focus:ring-indigo-500 transition bg-slate-50/50 focus:bg-white"
                />
              </div>
            </div>
          )}

          {/* STEP 4: OFFER LETTER PREVIEW */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="bg-slate-100/70 border border-slate-200 rounded-lg p-3 flex gap-2.5 items-center text-slate-700 text-xs">
                <FileText className="h-4 w-4 text-slate-500 shrink-0" />
                <div>
                  <p className="font-medium">Review the offer letter and salary details below before generating.</p>
                </div>
              </div>

              {/* Printable virtual letterhead layout */}
              <div className="bg-white border border-slate-200 shadow-md rounded-xl p-8 max-w-2xl mx-auto font-serif text-slate-800 relative select-none">
                {/* Letterhead Header decoration */}
                <div className="border-b-2 border-indigo-950 pb-4 mb-6 flex justify-between items-end font-sans">
                  <div>
                    <h2 className="text-lg font-black tracking-tight text-indigo-950">APPONEXT TECHNOLOGIES PVT. LTD.</h2>
                    <p className="text-[9px] text-slate-500 tracking-wider">Level 6, Tech Park Phase 2, Outer Ring Road, Bengaluru, 560103</p>
                  </div>
                  <div className="text-right text-[10px] text-slate-400">
                    <p className="font-bold text-indigo-900">CONFIDENTIAL</p>
                    <p>www.apponext.com</p>
                  </div>
                </div>

                {/* Document Body */}
                <div className="space-y-4 text-xs leading-relaxed">
                  <div className="flex justify-between font-sans text-[10px] text-slate-500">
                    <span>Ref: AN/OFFER/2026/{(selectedApp?.id || '000') + '-' + Math.round(Math.random() * 1000)}</span>
                    <span>Date: {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                  </div>

                  <div>
                    <p className="font-bold font-sans">To,</p>
                    <p className="font-bold font-sans">{selectedApp?.candidateName || selectedApp?.candidate_name || '[Candidate Name]'}</p>
                    <p className="font-sans text-slate-500">{selectedApp?.candidateEmail || selectedApp?.candidate_email || '[Candidate Email]'}</p>
                  </div>

                  <p className="font-bold text-center text-sm tracking-wide text-slate-900 my-4 font-sans underline">Subject: Letter of Offer & Employment Agreement</p>

                  <p>Dear <span className="font-bold">{selectedApp?.candidateName || selectedApp?.candidate_name || 'Candidate'}</span>,</p>

                  <p>
                    We are pleased to offer you employment with Apponext Technologies Pvt. Ltd. (the "Company") in the capacity of <strong>{positionTitle}</strong>. 
                    You will be positioned in corporate grade <strong>{gradeBand}</strong> at our <strong>{officeLocation}</strong> office, reporting directly to your supervisor under a <strong>{workModel}</strong> work engagement layout.
                  </p>

                  <p>
                    Your target date of joining is set as <strong>{offerStartDate ? new Date(offerStartDate).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }) : '[Start Date]'}</strong>, subject to successful completion of all background checking protocols. 
                    Your Annualized Cost to Company (CTC) compensation package is structured at <strong>{getCurrencySymbol()}{parseFloat(annualCTC).toLocaleString()}</strong>. Detailed split calculations are detailed in Annexure A.
                  </p>

                  {/* Salary Annexure Table */}
                  <div className="border border-slate-200 rounded-lg overflow-hidden my-4 font-sans">
                    <div className="bg-slate-50 px-4 py-2 font-bold text-center border-b border-slate-200 text-xs tracking-wide">
                      ANNEXURE A: COMPENSATION DETAILS
                    </div>
                    <table className="w-full text-[11px] text-left">
                      <thead>
                        <tr className="bg-slate-100 font-bold border-b border-slate-200">
                          <th className="px-4 py-1.5">Component</th>
                          <th className="px-4 py-1.5 text-right">Monthly ({getCurrencySymbol()})</th>
                          <th className="px-4 py-1.5 text-right">Annual ({getCurrencySymbol()})</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        <tr>
                          <td className="px-4 py-1.5">Basic Salary</td>
                          <td className="px-4 py-1.5 text-right">{Math.round(salaryBreakdown.basic / 12).toLocaleString()}</td>
                          <td className="px-4 py-1.5 text-right">{salaryBreakdown.basic.toLocaleString()}</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-1.5">House Rent Allowance (HRA)</td>
                          <td className="px-4 py-1.5 text-right">{Math.round(salaryBreakdown.hra / 12).toLocaleString()}</td>
                          <td className="px-4 py-1.5 text-right">{salaryBreakdown.hra.toLocaleString()}</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-1.5">Special Allowance</td>
                          <td className="px-4 py-1.5 text-right">{Math.round(salaryBreakdown.specialAllowance / 12).toLocaleString()}</td>
                          <td className="px-4 py-1.5 text-right">{salaryBreakdown.specialAllowance.toLocaleString()}</td>
                        </tr>
                        <tr className="text-slate-500 font-medium">
                          <td className="px-4 py-1.5">Employer Provident Fund (EPF)</td>
                          <td className="px-4 py-1.5 text-right">{Math.round(salaryBreakdown.epf / 12).toLocaleString()}</td>
                          <td className="px-4 py-1.5 text-right">{salaryBreakdown.epf.toLocaleString()}</td>
                        </tr>
                        <tr className="text-slate-500 font-medium">
                          <td className="px-4 py-1.5">Gratuity Provision (4.81%)</td>
                          <td className="px-4 py-1.5 text-right">{Math.round(salaryBreakdown.gratuity / 12).toLocaleString()}</td>
                          <td className="px-4 py-1.5 text-right">{salaryBreakdown.gratuity.toLocaleString()}</td>
                        </tr>
                        {hasPerformanceBonus && (
                          <tr className="bg-indigo-50/30 text-indigo-900 font-semibold">
                            <td className="px-4 py-1.5">Performance Linked Bonus (Annual)</td>
                            <td className="px-4 py-1.5 text-right">-</td>
                            <td className="px-4 py-1.5 text-right">{salaryBreakdown.variablePay.toLocaleString()}</td>
                          </tr>
                        )}
                        <tr className="bg-slate-100 font-bold border-t border-slate-200 text-slate-900">
                          <td className="px-4 py-2">Total Cost to Company (CTC)</td>
                          <td className="px-4 py-2 text-right">{Math.round(salaryBreakdown.ctc / 12).toLocaleString()}</td>
                          <td className="px-4 py-2 text-right">{salaryBreakdown.ctc.toLocaleString()}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Terms & compliance section */}
                  <div className="space-y-1 mt-4">
                    <p className="font-bold underline font-sans text-[11px] mb-2">Offer Terms & Covenants:</p>
                    <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-650 pl-2">
                      {bgvMandatory && <li>This offer is contingent upon successful verification of references and credit/criminal checks (BGV).</li>}
                      {ndaMandatory && <li>Signing the proprietary NDIA is a precondition to corporate systems access on day of joining.</li>}
                      {nonCompete && <li>Post resignation, you covenant not to enter immediate competing organizations for 12 months.</li>}
                      {relievingLetter && <li>Requires presentation of official Relieving Letter & Salary slip from previous employer.</li>}
                      {parseFloat(joiningBonus) > 0 && <li>Sign-on bonus of {getCurrencySymbol()}{parseFloat(joiningBonus).toLocaleString()} has a 12-month tenure clawback constraint.</li>}
                      {parseFloat(relocationAllowance) > 0 && <li>Relocation reimbursement of up to {getCurrencySymbol()}{parseFloat(relocationAllowance).toLocaleString()} upon bill submission.</li>}
                    </ul>
                  </div>

                  {customClause && (
                    <div className="bg-slate-50 border border-slate-100 rounded p-2.5 text-[10px] text-slate-600 italic">
                      <strong className="not-italic text-slate-700 font-semibold block mb-0.5">Special Addendum:</strong>
                      "{customClause}"
                    </div>
                  )}

                  <div className="pt-6 grid grid-cols-2 gap-4 font-sans text-xs">
                    <div>
                      <p className="font-bold text-slate-900">For Apponext Technologies</p>
                      <div className="h-12 w-28 border-b border-dashed border-slate-300 mt-2 flex items-end justify-start pl-2 text-[10px] text-indigo-650 font-semibold select-none italic font-serif">
                        Authorized Signatory
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">HR Operations Manager</p>
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">Accepted By Candidate</p>
                      <div className="h-12 w-32 border-b border-dashed border-slate-300 mt-2 flex items-end justify-start pl-2 text-[10px] text-slate-400 font-medium italic select-none">
                        Type signature on portal
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">Acceptance Deadline: {offerExpiryDate ? new Date(offerExpiryDate).toLocaleDateString() : '[Expiry Date]'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="px-6 py-4 bg-white border-t border-slate-100 flex-shrink-0 flex items-center justify-between sm:justify-between gap-3">
          <div>
            {step > 1 && (
              <Button type="button" variant="outline" onClick={handleBack} className="flex items-center gap-1">
                <ChevronLeft className="h-4 w-4" /> Back
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            {step < 4 ? (
              <Button type="button" onClick={handleNext} className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1">
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button 
                type="button" 
                onClick={handleFormSubmit}
                disabled={isSubmitting} 
                className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" /> Generating...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" /> Generate & Issue Offer
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
