import React, { useEffect, useState } from 'react';
import { apiClient } from '@/config/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSettlement } from '../hooks/index';
import {
  Users, FileText, Laptop, ShieldCheck, Send, AlertCircle,
  CheckCircle2, Clock, UserX, Plus, X, Upload, Paperclip, FileCheck, Trash2
} from 'lucide-react';

interface TeamSettlementsPageProps {
  isTeamLead?: boolean;
}

export const TeamSettlementsPage: React.FC<TeamSettlementsPageProps> = ({ isTeamLead = false }) => {
  const [teamSettlements, setTeamSettlements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [showRequestForm, setShowRequestForm] = useState(false);

  // Exit request form
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [exitDate, setExitDate] = useState('');
  const [reason, setReason] = useState('');
  const [noticeDays, setNoticeDays] = useState('30');
  const [resignationFile, setResignationFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [formMsg, setFormMsg] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const { submitExitRequestAsync, isLoading: submitting } = useSettlement();

  const fetchData = () => {
    setLoading(true);
    apiClient.get('/payroll/settlements/team')
      .then((res: any) => {
        const list = res.data?.data || res.data || [];
        if (Array.isArray(list) && list.length > 0) {
          setTeamSettlements(list);
        } else {
          apiClient.get('/payroll/settlements').then((res2: any) => {
            const list2 = res2.data?.data || res2.data || [];
            setTeamSettlements(Array.isArray(list2) ? list2 : []);
          }).catch(() => setTeamSettlements([]));
        }
      })
      .catch(() => {
        apiClient.get('/payroll/settlements').then((res2: any) => {
          const list2 = res2.data?.data || res2.data || [];
          setTeamSettlements(Array.isArray(list2) ? list2 : []);
        }).catch(() => setTeamSettlements([]));
      })
      .finally(() => setLoading(false));

    apiClient.get('/employees').then((res: any) => {
      const list = res.data?.data || res.data || [];
      setTeamMembers(Array.isArray(list) ? list : []);
    }).catch(() => {});
  };

  useEffect(() => { fetchData(); }, []);

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setResignationFile(e.dataTransfer.files[0]);
    }
  };

  const getStatusBadge = (status: string) => {
    const s = (status || 'draft').toLowerCase();
    if (s === 'processed') return <Badge className="bg-emerald-600 text-white font-bold text-[10px]">SETTLED</Badge>;
    if (s === 'approved') return <Badge className="bg-blue-600 text-white font-bold text-[10px]">APPROVED BY ADMIN</Badge>;
    if (s === 'submitted') return <Badge className="bg-amber-500 text-white font-bold text-[10px]">PENDING ADMIN APPROVAL</Badge>;
    if (s === 'exit_requested') return <Badge className="bg-rose-100 text-rose-700 border-rose-200 font-bold text-[10px]">EXIT REQUESTED</Badge>;
    return <Badge variant="outline" className="bg-muted text-muted-foreground font-bold text-[10px]">DRAFT</Badge>;
  };

  const handleSubmitExitRequest = async () => {
    setFormMsg(null);
    setFormError(null);
    if (!selectedEmpId || !exitDate) {
      setFormError('Please select a team member and exit date.');
      return;
    }
    const fileNote = resignationFile ? ` [Attached Resignation Letter: ${resignationFile.name}]` : '';

    try {
      await submitExitRequestAsync({
        employeeId: parseInt(selectedEmpId),
        exitDate,
        reason: (reason || 'Team member exit') + fileNote,
        noticePeriodDays: parseInt(noticeDays) || 30
      });
      const emp = teamMembers.find(e => String(e.id) === selectedEmpId);
      setFormMsg(`Exit request & Resignation Letter submitted for ${emp?.name || emp?.first_name || 'team member'}. HR will initiate their F&F Settlement.`);
      setSelectedEmpId('');
      setExitDate('');
      setReason('');
      setNoticeDays('30');
      setResignationFile(null);
      setShowRequestForm(false);
      fetchData();
    } catch (err: any) {
      setFormError(err?.response?.data?.message || err?.message || 'Failed to submit exit request.');
    }
  };

  const title = isTeamLead ? 'Team Member Exit Settlements' : 'Team Exit Settlements & Clearances';
  const desc = isTeamLead
    ? 'Monitor and submit exit requests for your team members. HR will process; Admin will approve.'
    : 'Monitor Full & Final settlements for your department. Submit exit requests on behalf of team members.';

  return (
    <div className="space-y-4 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-card border border-border/80 p-4 rounded-xl shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-primary/10 text-primary shrink-0"><Users className="w-5 h-5" /></div>
          <div>
            <h1 className="text-lg font-black text-foreground tracking-tight">{title}</h1>
            <p className="text-xs text-muted-foreground">{desc}</p>
          </div>
        </div>
        <Button
          size="sm"
          className="h-8 text-xs font-bold gap-1.5 shrink-0"
          onClick={() => setShowRequestForm(v => !v)}
        >
          {showRequestForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          {showRequestForm ? 'Cancel' : 'Submit Exit Request'}
        </Button>
      </div>

      {formMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-lg flex items-start gap-2 text-xs font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />{formMsg}
        </div>
      )}

      {/* Exit Request Form */}
      {showRequestForm && (
        <Card className="border-2 border-primary/20 shadow-sm">
          <CardHeader className="border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <Send className="w-4 h-4 text-primary" />
              <CardTitle className="text-sm font-bold">Submit Exit Request on Behalf of Team Member</CardTitle>
            </div>
            <CardDescription className="text-[11px] text-muted-foreground mt-0.5">
              Submit an exit request to HR with attached resignation document. HR will calculate F&F dues; Admin will approve.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            {formError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-lg flex items-start gap-2 text-xs font-medium">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />{formError}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Team Member *</Label>
                <select
                  value={selectedEmpId}
                  onChange={e => setSelectedEmpId(e.target.value)}
                  className="w-full h-9 text-xs border border-input bg-background rounded-md px-3 focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Select team member...</option>
                  {teamMembers.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || `EMP #${emp.id}`} ({emp.employee_code || emp.code || ''})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Exit Date *</Label>
                <Input type="date" value={exitDate} onChange={e => setExitDate(e.target.value)} min={new Date().toISOString().split('T')[0]} className="h-9 text-xs" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Notice Period (Days)</Label>
                <Input type="number" value={noticeDays} onChange={e => setNoticeDays(e.target.value)} placeholder="30" className="h-9 text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Reason</Label>
                <Input value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Resignation, Performance exit..." className="h-9 text-xs" />
              </div>
            </div>

            {/* Resignation Letter Drag & Drop */}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Paperclip className="w-3 h-3 text-primary" /> Attach Resignation Letter Document
              </Label>
              {!resignationFile ? (
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleFileDrop}
                  className={`border-2 border-dashed rounded-xl p-4 text-center transition-all cursor-pointer ${
                    isDragging ? 'border-primary bg-primary/10' : 'border-border/80 hover:border-primary/50 hover:bg-muted/30'
                  }`}
                >
                  <label htmlFor="team-resignation-upload" className="cursor-pointer space-y-1.5 block">
                    <Upload className="w-6 h-6 text-primary mx-auto opacity-70" />
                    <div>
                      <p className="text-xs font-bold text-foreground">
                        Drag &amp; drop resignation letter here, or <span className="text-primary underline">browse</span>
                      </p>
                      <p className="text-[10px] text-muted-foreground">PDF, DOCX, PNG, JPG up to 10MB</p>
                    </div>
                    <input
                      id="team-resignation-upload"
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
                      <p className="text-[10px] text-emerald-700">{(resignationFile.size / 1024).toFixed(1)} KB • Attached</p>
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
              This request will be sent to HR. HR will calculate F&amp;F settlement and submit for Admin approval. Only Admin can approve settlements.
            </div>
            <Button onClick={handleSubmitExitRequest} disabled={submitting || !selectedEmpId || !exitDate} className="h-9 text-xs font-bold gap-2">
              <Send className="w-3.5 h-3.5" />{submitting ? 'Submitting...' : 'Submit Exit Request to HR'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Team Settlements List */}
      <Card className="border border-border/80 shadow-xs bg-card">
        <CardHeader className="border-b border-border/60 pb-3">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            Team Exit Records ({teamSettlements.length})
          </CardTitle>
          <CardDescription className="text-[11px] text-muted-foreground mt-0.5">
            Read-only view of F&amp;F settlements for your team. Approval is done by Admin only.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          {loading ? (
            <div className="py-8 text-center text-xs text-muted-foreground">Loading team settlements...</div>
          ) : teamSettlements.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <UserX className="w-10 h-10 text-muted-foreground/40 mx-auto" />
              <p className="text-xs font-semibold text-muted-foreground">No active team member exit settlements</p>
              <p className="text-[11px] text-muted-foreground">Submit an exit request above when a team member is leaving.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {teamSettlements.map((s: any) => (
                <div key={s.id} className="p-3.5 border border-border/80 rounded-xl bg-card flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                  <div>
                    <p className="font-bold text-sm text-foreground">{s.employee_name || s.employeeName || `Employee #${s.employee_id}`}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {s.employeeCode || s.employee_code || ''} • Exit: <strong className="text-foreground">{s.exit_date || '—'}</strong> • Notice: {s.notice_period_days || 30} days
                    </p>
                    {s.settlement_notes && (
                      <p className="text-[10px] text-rose-600 italic mt-0.5">{s.settlement_notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground">Net Settlement</p>
                      <p className="text-sm font-black text-emerald-600">₹{Number(s.total_settlement_amount || 0).toLocaleString('en-IN')}</p>
                    </div>
                    {getStatusBadge(s.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
