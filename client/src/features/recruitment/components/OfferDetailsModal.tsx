import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Building2, Calendar, FileText, Send, CheckCircle2, 
  XCircle, Clock, Link, Printer, Copy, User, HelpCircle, 
  MapPin, ShieldAlert, Award, FileCheck, ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';

interface OfferDetailsModalProps {
  offer: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSend: (offer: any) => Promise<void>;
  isSending: boolean;
  departmentList: any[];
  designationList: any[];
}

export const OfferDetailsModal: React.FC<OfferDetailsModalProps> = ({
  offer,
  open,
  onOpenChange,
  onSend,
  isSending,
  departmentList,
  designationList,
}) => {
  const [activeTab, setActiveTab] = useState('overview');

  if (!offer) return null;

  // Retrieve basic info
  const id = offer.id || 0;
  const refCode = offer.offer_code || offer.offerCode || `AN-OFFER-${id}`;
  const candidateName = offer.candidate_name || offer.candidateName || 'N/A';
  const candidateEmail = offer.candidate_email || offer.candidateEmail || 'N/A';
  const positionTitle = offer.position_title || offer.positionTitle || 'N/A';
  const status = offer.status || 'draft';
  const ctc = parseFloat(offer.cost_to_company || offer.costToCompany) || 0;
  const baseSalary = parseFloat(offer.base_salary || offer.baseSalary) || 0;
  const currency = offer.currency || 'INR';
  const startDate = offer.offer_start_date || offer.offerStartDate || 'N/A';
  const expiryDate = offer.offer_expiry_date || offer.offerExpiryDate || 'N/A';
  
  // Custom metadata (fallback to sensible defaults if metadata structure is missing)
  const meta = offer.meta || {};
  const gradeBand = meta.gradeBand || 'L2';
  const employmentType = meta.employmentType || 'full-time';
  const workModel = meta.workModel || 'hybrid';
  const officeLocation = meta.officeLocation || 'Bengaluru HQ';
  const reportingManager = meta.reportingManager || 'Rajesh Kumar (VP Engineering)';
  const probationPeriod = meta.probationPeriod || '3 months';
  const noticePeriod = meta.noticePeriod || '90 days';
  const variablePay = typeof meta.variablePay === 'number' ? meta.variablePay : Math.round(ctc * 0.1);
  const joiningBonus = meta.joiningBonus || 0;
  const relocationAllowance = meta.relocationAllowance || 0;
  const bgvMandatory = meta.bgvMandatory !== false;
  const ndaMandatory = meta.ndaMandatory !== false;
  const nonCompete = meta.nonCompete !== false;
  const relievingLetter = meta.relievingLetter !== false;
  const customClause = meta.customClause || '';

  // Standard salary breakdown helper (same as generator for preview consistency)
  const basic = baseSalary || Math.round((ctc - variablePay) * 0.5);
  const hra = Math.round(basic * 0.5);
  const epf = Math.min(Math.round(basic * 0.12), 21600);
  const gratuity = Math.round(basic * 0.0481);
  const specialAllowance = Math.round((ctc - variablePay) - (basic + hra + epf + gratuity));
  const monthlyGross = Math.round((basic + hra + specialAllowance) / 12);
  const employeePF = Math.min(Math.round((basic / 12) * 0.12), 1800);
  const monthlyInHand = Math.max(0, monthlyGross - employeePF - 200);

  const getCurrencySymbol = () => {
    switch (currency) {
      case 'INR': return '₹';
      case 'USD': return '$';
      case 'EUR': return '€';
      case 'GBP': return '£';
      default: return currency;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft': 
        return <Badge variant="outline" className="bg-slate-100 text-slate-800 border-slate-200">Draft</Badge>;
      case 'sent': 
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Sent to Candidate</Badge>;
      case 'accepted': 
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Accepted</Badge>;
      case 'rejected': 
        return <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200">Declined</Badge>;
      case 'expired': 
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Expired</Badge>;
      default: 
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const copyPublicLink = () => {
    const publicUrl = `${window.location.origin}/public/offers/review/${offer.uuid}`;
    navigator.clipboard.writeText(publicUrl);
    toast.success('Review link copied to clipboard!');
  };

  const handlePrint = () => {
    // Print window simulated trigger
    const printContent = document.getElementById('printable-offer-document');
    if (!printContent) return;
    
    const pri = (document.getElementById('ifmcontentstoprint') as HTMLIFrameElement) || document.createElement('iframe');
    pri.style.position = 'absolute';
    pri.style.top = '-1000px';
    document.body.appendChild(pri);
    
    const priDoc = pri.contentWindow?.document;
    if (priDoc) {
      priDoc.open();
      priDoc.write(`
        <html>
          <head>
            <title>Offer Letter - ${candidateName}</title>
            <style>
              body { font-family: serif; padding: 40px; color: #1e293b; line-height: 1.6; }
              .sans { font-family: sans-serif; }
              .text-right { text-align: right; }
              .text-center { text-align: center; }
              .border-b-2 { border-bottom: 2px solid #1e1b4b; }
              .pb-4 { padding-bottom: 16px; }
              .mb-6 { margin-bottom: 24px; }
              .space-y-4 > * { margin-bottom: 16px; }
              .font-bold { font-weight: bold; }
              .font-black { font-weight: 900; }
              .text-lg { font-size: 18px; }
              .text-sm { font-size: 14px; }
              .text-xs { font-size: 12px; }
              .text-slate-500 { color: #64748b; }
              .text-slate-400 { color: #94a3b8; }
              .text-indigo-950 { color: #1e1b4b; }
              .text-indigo-900 { color: #312e81; }
              .my-4 { margin-top: 16px; margin-bottom: 16px; }
              .border { border: 1px solid #e2e8f0; }
              .rounded-lg { border-radius: 8px; }
              .overflow-hidden { overflow: hidden; }
              .bg-slate-50 { background-color: #f8fafc; }
              .bg-slate-100 { background-color: #f1f5f9; }
              .px-4 { padding-left: 16px; padding-right: 16px; }
              .py-2 { padding-top: 8px; padding-bottom: 8px; }
              .py-1.5 { padding-top: 6px; padding-bottom: 6px; }
              .border-t { border-top: 1px solid #e2e8f0; }
              table { width: 100%; border-collapse: collapse; }
              th, td { padding: 6px 16px; }
              .italic { font-style: italic; }
              ul { padding-left: 20px; }
              li { margin-bottom: 4px; }
              .grid-cols-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
              .h-12 { height: 48px; }
              .w-28 { width: 112px; }
              .w-32 { width: 128px; }
              .border-slate-300 { border-color: #cbd5e1; }
            </style>
          </head>
          <body>
            ${printContent.innerHTML}
          </body>
        </html>
      `);
      priDoc.close();
      pri.contentWindow?.focus();
      pri.contentWindow?.print();
    }
  };

  const departmentName = departmentList.find((d: any) => d.id === offer.department_id || d.id === offer.departmentId)?.name || 'General';
  const designationName = designationList.find((d: any) => d.id === offer.designation_id || d.id === offer.designationId)?.name || 'Staff';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-slate-50 border-slate-200">
        
        {/* Header summary banner */}
        <div className="bg-white border-b border-slate-100 p-6 flex-shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-650 shrink-0 shadow-sm">
              <User className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-slate-900">{candidateName}</h2>
                {getStatusBadge(status)}
              </div>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5 flex-wrap">
                <span className="font-semibold text-slate-700">{positionTitle}</span>
                <span>•</span>
                <span>{departmentName} / {designationName}</span>
                <span>•</span>
                <span className="text-slate-400">Ref: {refCode}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end md:self-center">
            {status === 'draft' && (
              <Button 
                onClick={() => onSend(offer)} 
                disabled={isSending}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs flex items-center gap-1.5 shadow-sm"
              >
                <Send className="h-3.5 w-3.5" /> Send Offer
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={copyPublicLink} className="text-xs border-slate-200 bg-white hover:bg-slate-50">
              <Link className="h-3.5 w-3.5 mr-1" /> Copy Share Link
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint} className="text-xs border-slate-200 bg-white hover:bg-slate-50">
              <Printer className="h-3.5 w-3.5 mr-1" /> Print / Save PDF
            </Button>
          </div>
        </div>

        {/* Tabbed interface container */}
        <div className="flex-1 overflow-hidden min-h-0 flex flex-col">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
            <div className="bg-white border-b border-slate-100 px-6 shrink-0">
              <TabsList className="bg-slate-100/50 p-1 gap-1 border-0">
                <TabsTrigger value="overview" className="text-xs font-semibold data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  Overview & Covenants
                </TabsTrigger>
                <TabsTrigger value="salary" className="text-xs font-semibold data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  Salary Annexure A
                </TabsTrigger>
                <TabsTrigger value="document" className="text-xs font-semibold data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  Official Offer Letter
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto p-6 min-h-0 space-y-6">
              
              {/* OVERVIEW & COVENANTS TAB */}
              <TabsContent value="overview" className="m-0 space-y-6 outline-none">
                {/* Visual state timeline */}
                <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-3">
                  <h3 className="font-bold text-slate-800 text-xs tracking-wider uppercase text-slate-400">Offer Cycle Timeline</h3>
                  <div className="flex items-center justify-between max-w-lg mx-auto pt-2">
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="h-8 w-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-sm">
                        <FileCheck className="h-4 w-4" />
                      </div>
                      <span className="text-[10px] font-bold text-slate-800">Generated</span>
                      <span className="text-[9px] text-slate-400">{offer.created_at ? new Date(offer.created_at).toLocaleDateString() : 'N/A'}</span>
                    </div>

                    <div className="flex-1 h-0.5 bg-slate-200 mx-2 border-t-2 border-dashed border-slate-200" />

                    <div className="flex flex-col items-center gap-1.5">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center shadow-sm ${
                        ['sent', 'accepted', 'rejected'].includes(status) 
                          ? 'bg-blue-500 text-white' 
                          : 'bg-slate-200 text-slate-500'
                      }`}>
                        <Send className="h-4 w-4" />
                      </div>
                      <span className="text-[10px] font-bold text-slate-800">Dispatched</span>
                      <span className="text-[9px] text-slate-400">{offer.sent_at ? new Date(offer.sent_at).toLocaleDateString() : 'Pending'}</span>
                    </div>

                    <div className="flex-1 h-0.5 bg-slate-200 mx-2 border-t-2 border-dashed border-slate-200" />

                    <div className="flex flex-col items-center gap-1.5">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center shadow-sm ${
                        status === 'accepted' 
                          ? 'bg-emerald-500 text-white' 
                          : status === 'rejected'
                            ? 'bg-rose-500 text-white'
                            : 'bg-slate-200 text-slate-500'
                      }`}>
                        {status === 'rejected' ? <XCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                      </div>
                      <span className="text-[10px] font-bold text-slate-800">Candidate Action</span>
                      <span className="text-[9px] text-slate-400">
                        {status === 'accepted' && offer.accepted_at ? new Date(offer.accepted_at).toLocaleDateString() : 
                         status === 'rejected' && offer.rejected_at ? new Date(offer.rejected_at).toLocaleDateString() : 'Awaiting'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Position metadata */}
                  <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-4">
                    <h3 className="font-bold text-slate-800 text-sm border-b pb-2 flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-indigo-600" /> Job Parameters
                    </h3>

                    <div className="grid grid-cols-2 gap-y-3 text-xs">
                      <div className="text-slate-500 font-medium">Corporate Level:</div>
                      <div className="text-slate-900 font-bold flex items-center gap-1">
                        <Award className="h-3.5 w-3.5 text-indigo-650" /> Band {gradeBand}
                      </div>

                      <div className="text-slate-500 font-medium">Engagement Format:</div>
                      <div className="text-slate-900 font-semibold capitalize">{employmentType.replace('-', ' ')}</div>

                      <div className="text-slate-500 font-medium">Work Layout:</div>
                      <div className="text-slate-900 font-semibold capitalize">{workModel}</div>

                      <div className="text-slate-500 font-medium">Office Base:</div>
                      <div className="text-slate-900 font-semibold flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-slate-400" /> {officeLocation}
                      </div>

                      <div className="text-slate-500 font-medium">Reporting Manager:</div>
                      <div className="text-slate-900 font-semibold">{reportingManager}</div>

                      <div className="text-slate-500 font-medium">Probation Tenure:</div>
                      <div className="text-slate-900 font-semibold">{probationPeriod}</div>

                      <div className="text-slate-500 font-medium">Notice Duration:</div>
                      <div className="text-slate-900 font-semibold">{noticePeriod}</div>
                    </div>
                  </div>

                  {/* Compliance & dates */}
                  <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-4">
                    <h3 className="font-bold text-slate-800 text-sm border-b pb-2 flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-indigo-600" /> Key Dates & Clauses
                    </h3>

                    <div className="grid grid-cols-2 gap-y-3 text-xs border-b pb-3 mb-3">
                      <div className="text-slate-500 font-medium">Joining Target Date:</div>
                      <div className="text-slate-900 font-bold">{startDate}</div>

                      <div className="text-slate-500 font-medium">Acceptance Deadline:</div>
                      <div className="text-rose-600 font-bold">{expiryDate}</div>

                      {relocationAllowance > 0 && (
                        <>
                          <div className="text-slate-500 font-medium">Relocation Allowance:</div>
                          <div className="text-slate-900 font-bold">{getCurrencySymbol()}{parseFloat(relocationAllowance).toLocaleString()}</div>
                        </>
                      )}
                    </div>

                    <div className="space-y-2">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Assigned Clauses</p>
                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div className={`p-2 border rounded-md flex items-center gap-1.5 ${bgvMandatory ? 'border-emerald-100 bg-emerald-50/30 text-emerald-800' : 'border-slate-100 text-slate-400'}`}>
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> BGV Clearance
                        </div>
                        <div className={`p-2 border rounded-md flex items-center gap-1.5 ${ndaMandatory ? 'border-emerald-100 bg-emerald-50/30 text-emerald-800' : 'border-slate-100 text-slate-400'}`}>
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> Standard NDIA
                        </div>
                        <div className={`p-2 border rounded-md flex items-center gap-1.5 ${nonCompete ? 'border-emerald-100 bg-emerald-50/30 text-emerald-800' : 'border-slate-100 text-slate-400'}`}>
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> 12-Mo Noncompete
                        </div>
                        <div className={`p-2 border rounded-md flex items-center gap-1.5 ${relievingLetter ? 'border-emerald-100 bg-emerald-50/30 text-emerald-800' : 'border-slate-100 text-slate-400'}`}>
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> Relieving Letter
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {customClause && (
                  <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-2">
                    <h3 className="font-bold text-slate-800 text-xs tracking-wider uppercase text-slate-400">Addendum Remarks</h3>
                    <p className="text-xs text-slate-700 italic bg-slate-50 p-3 rounded-lg border border-slate-100">"{customClause}"</p>
                  </div>
                )}
              </TabsContent>

              {/* SALARY ANNEXURE A TAB */}
              <TabsContent value="salary" className="m-0 space-y-6 outline-none">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                  
                  {/* Detailed calculations summary card */}
                  <div className="lg:col-span-3 bg-white p-6 rounded-xl border border-slate-150 shadow-sm space-y-4">
                    <h3 className="font-bold text-slate-800 text-sm border-b pb-2 flex items-center gap-2">
                      <Award className="h-4 w-4 text-indigo-600" /> Detailed Compensation Structures
                    </h3>

                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="border-b border-slate-100 text-slate-400 font-semibold">
                          <th className="pb-2">Component</th>
                          <th className="pb-2 text-right">Monthly ({getCurrencySymbol()})</th>
                          <th className="pb-2 text-right">Annual ({getCurrencySymbol()})</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 text-slate-700">
                        <tr>
                          <td className="py-2 font-medium">Basic Pay</td>
                          <td className="py-2 text-right font-semibold">{Math.round(basic / 12).toLocaleString()}</td>
                          <td className="py-2 text-right font-semibold">{basic.toLocaleString()}</td>
                        </tr>
                        <tr>
                          <td className="py-2 font-medium">House Rent Allowance (HRA)</td>
                          <td className="py-2 text-right">{Math.round(hra / 12).toLocaleString()}</td>
                          <td className="py-2 text-right">{hra.toLocaleString()}</td>
                        </tr>
                        <tr>
                          <td className="py-2 font-medium">Special Allowance</td>
                          <td className="py-2 text-right">{Math.round(specialAllowance / 12).toLocaleString()}</td>
                          <td className="py-2 text-right">{specialAllowance.toLocaleString()}</td>
                        </tr>
                        <tr className="text-slate-500">
                          <td className="py-2 font-medium">Employer EPF Contribution</td>
                          <td className="py-2 text-right">{Math.round(epf / 12).toLocaleString()}</td>
                          <td className="py-2 text-right">{epf.toLocaleString()}</td>
                        </tr>
                        <tr className="text-slate-500">
                          <td className="py-2 font-medium">Gratuity Accrual (4.81%)</td>
                          <td className="py-2 text-right">{Math.round(gratuity / 12).toLocaleString()}</td>
                          <td className="py-2 text-right">{gratuity.toLocaleString()}</td>
                        </tr>
                        {variablePay > 0 && (
                          <tr className="text-indigo-650 font-semibold bg-indigo-50/20">
                            <td className="py-2 pl-1">Performance Variable Pay</td>
                            <td className="py-2 text-right">-</td>
                            <td className="py-2 text-right">{variablePay.toLocaleString()}</td>
                          </tr>
                        )}
                        <tr className="bg-slate-50 font-bold border-t border-slate-200 text-slate-900">
                          <td className="py-2">Cost to Company (CTC)</td>
                          <td className="py-2 text-right">{Math.round(ctc / 12).toLocaleString()}</td>
                          <td className="py-2 text-right">{ctc.toLocaleString()}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Highlights overview card */}
                  <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm text-center space-y-4">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Salary Summary Highlights</p>
                      
                      <div className="bg-indigo-50/40 border border-indigo-100 rounded-lg p-3">
                        <p className="text-[10px] text-slate-500 font-medium">Annual Structured CTC</p>
                        <p className="text-2xl font-black text-indigo-950 mt-1">{getCurrencySymbol()}{ctc.toLocaleString()}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="border border-slate-100 rounded-lg p-2.5 bg-slate-50/50">
                          <p className="text-[9px] text-slate-400 uppercase font-semibold">Monthly Gross</p>
                          <p className="text-sm font-bold text-slate-900 mt-0.5">{getCurrencySymbol()}{monthlyGross.toLocaleString()}</p>
                        </div>
                        <div className="border border-slate-100 rounded-lg p-2.5 bg-emerald-50 text-emerald-800">
                          <p className="text-[9px] text-emerald-600 uppercase font-bold">Monthly Take-Home</p>
                          <p className="text-sm font-bold text-emerald-700 mt-0.5">{getCurrencySymbol()}{monthlyInHand.toLocaleString()}</p>
                        </div>
                      </div>
                      
                      <p className="text-[9px] text-slate-400 italic">Values are approximations based on default EPF slabs. Net pay depends on candidate tax declarations & deductions.</p>
                    </div>

                    {/* Bonus & extras card */}
                    {(joiningBonus > 0 || relocationAllowance > 0) && (
                      <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-3">
                        <h3 className="font-bold text-slate-800 text-xs tracking-wider uppercase text-slate-400">Additional Rewards Included</h3>
                        {joiningBonus > 0 && (
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-650 font-medium">Joining Sign-on Bonus:</span>
                            <span className="text-slate-900 font-bold">{getCurrencySymbol()}{parseFloat(joiningBonus).toLocaleString()}</span>
                          </div>
                        )}
                        {relocationAllowance > 0 && (
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-650 font-medium">Relocation Grant Limit:</span>
                            <span className="text-slate-900 font-bold">{getCurrencySymbol()}{parseFloat(relocationAllowance).toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                </div>
              </TabsContent>

              {/* OFFICIAL OFFER LETTER TAB */}
              <TabsContent value="document" className="m-0 outline-none pb-4">
                <div id="printable-offer-document" className="bg-white border border-slate-200 shadow-md rounded-xl p-8 max-w-2xl mx-auto font-serif text-slate-800 relative">
                  {/* Letterhead Header decoration */}
                  <div className="border-b-2 border-indigo-950 pb-4 mb-6 flex justify-between items-end font-sans">
                    <div>
                      <h2 className="text-lg font-black tracking-tight text-indigo-950 uppercase">{meta.companyName || 'APPONEXT TECHNOLOGIES PVT. LTD.'}</h2>
                      <p className="text-[9px] text-slate-500 tracking-wider">{meta.companyAddress || 'Level 6, Tech Park Phase 2, Outer Ring Road, Bengaluru, 560103'}</p>
                    </div>
                    <div className="text-right text-[10px] text-slate-400">
                      <p className="font-bold text-indigo-900">CONFIDENTIAL</p>
                      <p>www.apponext.com</p>
                    </div>
                  </div>

                  {/* Document Body */}
                  <div className="space-y-4 text-xs leading-relaxed">
                    <div className="flex justify-between font-sans text-[10px] text-slate-500">
                      <span>Ref: AN/OFFER/2026/{id + '-' + Math.round(Math.random() * 1000)}</span>
                      <span>Date: {new Date(offer.created_at || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                    </div>

                    <div>
                      <p className="font-bold font-sans">To,</p>
                      <p className="font-bold font-sans">{candidateName}</p>
                      <p className="font-sans text-slate-500">{candidateEmail}</p>
                    </div>

                    <p className="font-bold text-center text-sm tracking-wide text-slate-900 my-4 font-sans underline">
                      {meta.compiledSubject || 'Subject: Letter of Offer & Employment Agreement'}
                    </p>

                    {meta.compiledBody ? (
                      <div className="whitespace-pre-line text-slate-800 space-y-3 font-serif">
                        {meta.compiledBody}
                      </div>
                    ) : (
                      <>
                        <p>Dear <span className="font-bold">{candidateName}</span>,</p>

                        <p>
                          We are pleased to offer you employment with Apponext Technologies Pvt. Ltd. (the "Company") in the capacity of <strong>{positionTitle}</strong>. 
                          You will be positioned in corporate grade <strong>{gradeBand}</strong> at our <strong>{officeLocation}</strong> office, reporting directly to your supervisor under a <strong>{workModel}</strong> work engagement layout.
                        </p>

                        <p>
                          Your target date of joining is set as <strong>{startDate ? new Date(startDate).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }) : '[Start Date]'}</strong>, subject to successful completion of all background checking protocols. 
                          Your Annualized Cost to Company (CTC) compensation package is structured at <strong>{getCurrencySymbol()}{ctc.toLocaleString()}</strong>. Detailed split calculations are detailed in Annexure A.
                        </p>
                      </>
                    )}

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
                            <td className="px-4 py-1.5 text-right">{Math.round(basic / 12).toLocaleString()}</td>
                            <td className="px-4 py-1.5 text-right">{basic.toLocaleString()}</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-1.5">House Rent Allowance (HRA)</td>
                            <td className="px-4 py-1.5 text-right">{Math.round(hra / 12).toLocaleString()}</td>
                            <td className="px-4 py-1.5 text-right">{hra.toLocaleString()}</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-1.5">Special Allowance</td>
                            <td className="px-4 py-1.5 text-right">{Math.round(specialAllowance / 12).toLocaleString()}</td>
                            <td className="px-4 py-1.5 text-right">{specialAllowance.toLocaleString()}</td>
                          </tr>
                          <tr className="text-slate-500 font-medium">
                            <td className="px-4 py-1.5">Employer Provident Fund (EPF)</td>
                            <td className="px-4 py-1.5 text-right">{Math.round(epf / 12).toLocaleString()}</td>
                            <td className="px-4 py-1.5 text-right">{epf.toLocaleString()}</td>
                          </tr>
                          <tr className="text-slate-500 font-medium">
                            <td className="px-4 py-1.5">Gratuity Provision (4.81%)</td>
                            <td className="px-4 py-1.5 text-right">{Math.round(gratuity / 12).toLocaleString()}</td>
                            <td className="px-4 py-1.5 text-right">{gratuity.toLocaleString()}</td>
                          </tr>
                          {variablePay > 0 && (
                            <tr className="bg-indigo-50/30 text-indigo-955 font-semibold">
                              <td className="px-4 py-1.5">Performance Linked Bonus (Annual)</td>
                              <td className="px-4 py-1.5 text-right">-</td>
                              <td className="px-4 py-1.5 text-right">{variablePay.toLocaleString()}</td>
                            </tr>
                          )}
                          <tr className="bg-slate-100 font-bold border-t border-slate-200 text-slate-900">
                            <td className="px-4 py-2">Total Cost to Company (CTC)</td>
                            <td className="px-4 py-2 text-right">{Math.round(ctc / 12).toLocaleString()}</td>
                            <td className="px-4 py-2 text-right">{ctc.toLocaleString()}</td>
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
                        {joiningBonus > 0 && <li>Sign-on bonus of {getCurrencySymbol()}{parseFloat(joiningBonus).toLocaleString()} has a 12-month tenure clawback constraint.</li>}
                        {relocationAllowance > 0 && <li>Relocation reimbursement of up to {getCurrencySymbol()}{parseFloat(relocationAllowance).toLocaleString()} upon bill submission.</li>}
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
                        <div className="h-12 w-32 border-b border-dashed border-slate-300 mt-2 flex items-end justify-start pl-2 text-[10px] text-slate-450 font-semibold italic select-none">
                          {status === 'accepted' ? 'Signed digitally via portal' : 'Type signature on portal'}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">Acceptance Deadline: {expiryDate}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

            </div>
          </Tabs>
        </div>

        <DialogFooter className="px-6 py-4 bg-white border-t border-slate-100 shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close Window</Button>
        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
};
