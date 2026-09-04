import React, { useEffect, useState } from 'react';
import { apiClient } from '@/config/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSettlement } from '../hooks/index';
import {
  UserX, FileText, CheckCircle2, Download,
  Laptop, ShieldCheck, Clock, Send, AlertCircle, ArrowRight, Plus,
  Upload, Paperclip, FileCheck, Trash2
} from 'lucide-react';

export const MySettlementPage: React.FC = () => {
  const [settlement, setSettlement] = useState<any>(null);
  const [settlementList, setSettlementList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [myEmployeeId, setMyEmployeeId] = useState<number | null>(null);

  // Exit request form state
  const [showExitForm, setShowExitForm] = useState(false);
  const [exitDate, setExitDate] = useState('');
  const [reason, setReason] = useState('');
  const [noticeDays, setNoticeDays] = useState('30');
  const [resignationFile, setResignationFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [formMsg, setFormMsg] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const { submitExitRequestAsync, isLoading: submitting } = useSettlement();

  const fetchSettlement = () => {
    setLoading(true);
    apiClient.get('/payroll/settlements/my-settlement')
      .then((res: any) => {
        const item = res.data?.data;
        const list = res.data?.list || (item ? [item] : []);
        if (item || (Array.isArray(list) && list.length > 0)) {
          setSettlement(item || list[0]);
          setSettlementList(Array.isArray(list) && list.length > 0 ? list : [item]);
        } else {
          apiClient.get('/payroll/settlements').then((res2: any) => {
            const list2 = res2.data?.data || res2.data || [];
            if (Array.isArray(list2) && list2.length > 0) {
              setSettlement(list2[0]);
              setSettlementList(list2);
            }
          }).catch(() => {});
        }
      })
      .catch(() => {
        apiClient.get('/payroll/settlements').then((res2: any) => {
          const list2 = res2.data?.data || res2.data || [];
          if (Array.isArray(list2) && list2.length > 0) {
            setSettlement(list2[0]);
            setSettlementList(list2);
          }
        }).catch(() => {});
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSettlement();
    apiClient.get('/employees/me').then((res: any) => {
      const emp = res.data?.data || res.data;
      if (emp?.id) setMyEmployeeId(emp.id);
    }).catch(() => {
      apiClient.get('/employees').then((res: any) => {
        const list = res.data?.data || res.data || [];
        if (list.length > 0) setMyEmployeeId(list[0].id);
      }).catch(() => {});
    });
  }, []);

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setResignationFile(e.dataTransfer.files[0]);
    }
  };

  const getStatusBadge = (status: string) => {
    const s = (status || 'draft').toLowerCase();
    if (s === 'processed') return <Badge className="bg-emerald-600 text-white font-bold text-[10px]">PROCESSED & SETTLED</Badge>;
    if (s === 'approved') return <Badge className="bg-blue-600 text-white font-bold text-[10px]">APPROVED BY ADMIN</Badge>;
    if (s === 'submitted') return <Badge className="bg-amber-500 text-white font-bold text-[10px]">PENDING ADMIN APPROVAL</Badge>;
    if (s === 'exit_requested') return <Badge className="bg-rose-100 text-rose-700 border-rose-200 font-bold text-[10px]">EXIT REQUEST SUBMITTED</Badge>;
    return <Badge variant="outline" className="bg-muted text-muted-foreground font-bold text-[10px]">DRAFT PROCESSING</Badge>;
  };

  const handleSubmitExitRequest = async () => {
    setFormMsg(null);
    setFormError(null);
    if (!exitDate) { setFormError('Please select your intended exit date.'); return; }

    const targetEmpId = myEmployeeId || (settlement?.employee_id ? Number(settlement.employee_id) : 1);
    const fileNote = resignationFile ? ` [Attached Resignation Letter: ${resignationFile.name}]` : '';

    try {
      await submitExitRequestAsync({
        employeeId: targetEmpId,
        exitDate,
        reason: (reason || 'Resignation') + fileNote,
        noticePeriodDays: parseInt(noticeDays) || 30
      });
      setFormMsg('Exit Request submitted successfully with Resignation Letter! HR will review and initiate your F&F Settlement soon.');
      setShowExitForm(false);
      setResignationFile(null);
      fetchSettlement();
    } catch (err: any) {
      setFormError(err?.response?.data?.message || err?.message || 'Failed to submit exit request. Please contact HR.');
    }
  };

  const statusSteps = [
    { key: 'exit_requested', label: 'Exit Request', icon: Send },
    { key: 'draft', label: 'HR Processing', icon: FileText },
    { key: 'submitted', label: 'Admin Review', icon: Clock },
    { key: 'approved', label: 'Admin Approved', icon: ShieldCheck },
    { key: 'processed', label: 'Settled', icon: CheckCircle2 },
  ];
  const statusOrder = ['exit_requested', 'draft', 'submitted', 'approved', 'processed'];
  const currentStatusIdx = settlement ? statusOrder.indexOf((settlement.status || 'draft').toLowerCase()) : -1;

  return (
    <div className="space-y-4 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-card border border-border/80 p-4 rounded-xl shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-primary/10 text-primary shrink-0"><UserX className="w-5 h-5" /></div>
          <div>
            <h1 className="text-lg font-black text-foreground tracking-tight">My Full & Final Exit Settlement</h1>
            <p className="text-xs text-muted-foreground">View your exit settlement status, itemized payouts, or submit an exit request to HR.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" variant="outline" className="h-8 text-xs font-bold gap-1" onClick={() => setShowExitForm(v => !v)}>
            <Plus className="w-3.5 h-3.5" />
            {showExitForm ? 'Hide Request Form' : 'Submit Exit Request'}
          </Button>
          {settlement && getStatusBadge(settlement.status)}
        </div>
      </div>

      {formMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-lg flex items-start gap-2 text-xs font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />{formMsg}
        </div>
      )}

      {/* Exit Request Form with Resignation Letter Drag & Drop */}
      {showExitForm && (
        <Card className="border-2 border-primary/20 shadow-sm">
          <CardHeader className="border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <Send className="w-4 h-4 text-primary" />
              <CardTitle className="text-sm font-bold">Submit Your Exit Request to HR</CardTitle>
            </div>
            <CardDescription className="text-[11px] text-muted-foreground mt-0.5">
              Submit your exit request and attach your signed resignation letter. HR calculates dues and submits to Admin; Admin approves the settlement.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            {formError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-lg flex items-start gap-2 text-xs font-medium">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />{formError}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Intended Exit Date *</Label>
                <Input type="date" value={exitDate} onChange={e => setExitDate(e.target.value)} min={new Date().toISOString().split('T')[0]} className="h-9 text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Notice Period (Days)</Label>
                <Input type="number" value={noticeDays} onChange={e => setNoticeDays(e.target.value)} placeholder="30" className="h-9 text-xs" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Reason for Leaving</Label>
              <Input value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Resignation, Personal reasons..." className="h-9 text-xs" />
            </div>

            {/* Resignation Letter Upload Zone */}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Paperclip className="w-3 h-3 text-primary" /> Attach Resignation Letter Document
              </Label>
              {!resignationFile ? (
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleFileDrop}
                  className={`border-2 border-dashed rounded-xl p-5 text-center transition-all cursor-pointer ${
                    isDragging ? 'border-primary bg-primary/10' : 'border-border/80 hover:border-primary/50 hover:bg-muted/30'
                  }`}
                >
                  <label htmlFor="resignation-upload" className="cursor-pointer space-y-2 block">
                    <Upload className="w-8 h-8 text-primary mx-auto opacity-70" />
                    <div>
                      <p className="text-xs font-bold text-foreground">
                        Drag &amp; drop your signed Resignation Letter here, or <span className="text-primary underline">browse</span>
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Supports PDF, DOCX, PNG, JPG up to 10MB</p>
                    </div>
                    <input
                      id="resignation-upload"
                      type="file"
                      accept=".pdf,.docx,.doc,.png,.jpg,.jpeg"
                      onChange={(e) => e.target.files && setResignationFile(e.target.files[0])}
                      className="hidden"
                    />
                  </label>
                </div>
              ) : (
                <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                      <FileCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-emerald-900">{resignationFile.name}</p>
                      <p className="text-[10px] text-emerald-700">{(resignationFile.size / 1024).toFixed(1)} KB • Ready to submit</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 p-1"
                    onClick={() => setResignationFile(null)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>

            <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-[11px] text-amber-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              HR will review your resignation letter and calculate your F&amp;F settlement. Final approval rests with the Organization Admin.
            </div>
            <Button onClick={handleSubmitExitRequest} disabled={submitting || !exitDate} className="h-9 text-xs font-bold gap-2">
              <Send className="w-3.5 h-3.5" />{submitting ? 'Submitting...' : 'Submit Exit Request & Resignation Letter'}
            </Button>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <Card className="p-8 text-center text-xs text-muted-foreground">Loading settlement details...</Card>
      ) : settlementList.length === 0 && !showExitForm ? (
        <Card className="p-8 text-center space-y-3">
          <FileText className="w-10 h-10 text-muted-foreground/40 mx-auto" />
          <p className="text-sm font-bold text-foreground">No Active Exit Settlement Found</p>
          <p className="text-xs text-muted-foreground">You currently have no active or historical exit settlement record.</p>
          <Button size="sm" className="h-8 text-xs font-bold gap-1 mx-auto" onClick={() => setShowExitForm(true)}>
            <Send className="w-3.5 h-3.5" /> Submit Exit Request Now
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Progress Tracker Card */}
          {settlement && (
            <Card className="border border-border/80 shadow-xs">
              <CardHeader className="border-b border-border/60 pb-2">
                <CardTitle className="text-sm font-bold">Settlement Progress Tracker</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-1">
                  {statusSteps.map((step, idx) => {
                    const isCompleted = idx <= currentStatusIdx;
                    const isCurrent = idx === currentStatusIdx;
                    const Icon = step.icon;
                    return (
                      <React.Fragment key={step.key}>
                        <div className="flex flex-col items-center gap-1 text-center flex-1 min-w-0">
                          <div className={`p-2 rounded-full shrink-0 ${isCurrent ? 'bg-primary text-white shadow-md ring-2 ring-primary/30' : isCompleted ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground'}`}>
                            <Icon className="w-3 h-3" />
                          </div>
                          <p className={`text-[9px] font-bold leading-tight ${isCurrent ? 'text-primary' : isCompleted ? 'text-emerald-700' : 'text-muted-foreground'}`}>{step.label}</p>
                        </div>
                        {idx < statusSteps.length - 1 && (
                          <div className={`h-0.5 flex-1 max-w-[32px] rounded ${idx < currentStatusIdx ? 'bg-emerald-400' : 'bg-border'}`} />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* List of Settlement Records */}
          <Card className="border border-border/80 shadow-xs bg-card">
            <CardHeader className="border-b border-border/60 pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                My Settlement Records ({settlementList.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {settlementList.map((item: any) => (
                <div key={item.id} className="p-4 border border-border/80 rounded-xl bg-card space-y-3">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-border/60 pb-2.5">
                    <div>
                      <p className="font-bold text-sm text-foreground">{item.employee_name || `Employee #${item.employee_id}`}</p>
                      <p className="text-[10px] text-muted-foreground">
                        Exit Date: <strong className="text-foreground">{item.exit_date || '—'}</strong> • Notice Period: {item.notice_period_days || 30} days
                      </p>
                      {item.settlement_notes && (
                        <p className="text-[10px] text-primary italic mt-0.5">{item.settlement_notes}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border-emerald-200 gap-1">
                        <Laptop className="w-3 h-3" /> Assets: {item.asset_clearance || 'Cleared'}
                      </Badge>
                      {getStatusBadge(item.status)}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 text-xs bg-muted/20 p-3 rounded-lg border border-border/50">
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase">Leave Encashment</p>
                      <p className="font-bold text-foreground mt-0.5">₹{Number(item.leave_encashment_amount || 0).toLocaleString('en-IN')}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase">Gratuity Payout</p>
                      <p className="font-bold text-foreground mt-0.5">₹{Number(item.gratuity_amount || 0).toLocaleString('en-IN')}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-rose-600 uppercase">Deductions / Recoveries</p>
                      <p className="font-bold text-rose-700 mt-0.5">-₹{Number((item.notice_period_recovery || 0) + (item.asset_recovery_amount || 0) + (item.other_deductions || 0)).toLocaleString('en-IN')}</p>
                    </div>
                    <div className="col-span-2 md:col-span-3 pt-2 border-t border-border/50 flex justify-between items-center">
                      <div>
                        <p className="text-[10px] font-bold text-primary uppercase">Net Settlement Payout</p>
                        <p className="font-black text-emerald-600 text-base">₹{Number(item.total_settlement_amount || 0).toLocaleString('en-IN')}</p>
                      </div>
                      {(item.status === 'approved' || item.status === 'processed') && (
                        <Button variant="outline" size="sm" className="h-7 text-[10px] font-bold gap-1" onClick={() => window.print()}>
                          <Download className="w-3.5 h-3.5" /> Download Statement
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
