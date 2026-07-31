import React, { useState } from 'react';
import { useSettlement } from '../hooks/index';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  UserX,
  Search,
  Plus,
  FileText,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Laptop,
  Calculator,
  Download,
  DollarSign,
  User
} from 'lucide-react';

export const FullFinalSettlement: React.FC = () => {
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const {
    settlements,
    createSettlement,
    calculateSettlement,
    submitSettlement,
    approveSettlement,
    processSettlement,
    isLoading
  } = useSettlement();

  const safeSettlements = Array.isArray(settlements) ? settlements : [];

  // Sample employee master list for Admin Employee Name Select dropdown
  const sampleEmployees = [
    { id: 1, name: 'Vikram Singh', code: 'EMP-005', department: 'Operations', status: 'Notice Period', tenure: '3.5 Yrs' },
    { id: 2, name: 'Rahul Sharma', code: 'EMP-001', department: 'Engineering', status: 'Active', tenure: '4.2 Yrs' },
    { id: 3, name: 'Priya Patel', code: 'EMP-002', department: 'Human Resources', status: 'Active', tenure: '2.8 Yrs' },
    { id: 4, name: 'Amit Verma', code: 'EMP-003', department: 'Finance', status: 'Notice Period', tenure: '5.1 Yrs' },
    { id: 5, name: 'Ananya Roy', code: 'EMP-006', department: 'Sales & Marketing', status: 'Resigned', tenure: '1.9 Yrs' },
  ];

  // Form states
  const [empId, setEmpId] = useState('1');
  const [exitDate, setExitDate] = useState(new Date().toISOString().split('T')[0]);
  const [noticePeriod, setNoticePeriod] = useState('30');
  const [resignationReason, setResignationReason] = useState('Better Opportunity / Personal');
  const [assetCleared, setAssetCleared] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const getStatusBadge = (status: string) => {
    const s = (status || 'draft').toLowerCase();
    if (s === 'processed') return <Badge className="bg-emerald-600 text-white font-bold text-[10px]">PROCESSED</Badge>;
    if (s === 'approved') return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold text-[10px]">APPROVED</Badge>;
    if (s === 'submitted') return <Badge className="bg-amber-50 text-amber-700 border-amber-200 font-bold text-[10px]">SUBMITTED</Badge>;
    return <Badge variant="outline" className="bg-muted text-muted-foreground font-bold text-[10px]">DRAFT</Badge>;
  };

  const handleCreate = async () => {
    setFormError(null);
    setFormSuccess(null);
    if (!empId || !exitDate) {
      setFormError('Please select Employee Name and exit date.');
      return;
    }

    try {
      await createSettlement({
        employeeId: parseInt(empId),
        exitDate,
        noticePeriodDays: noticePeriod ? parseInt(noticePeriod) : undefined
      });
      setFormSuccess('Full & Final Settlement initialized successfully!');
      setShowForm(false);
    } catch (err: any) {
      setFormError(err.message || 'Failed to initialize settlement');
    }
  };

  const getEmployeeName = (settlement: any) => {
    if (settlement?.employee_name && !settlement.employee_name.includes('Employee #')) {
      return `${settlement.employee_name} (${settlement.employeeCode || settlement.employee_code || ''})`;
    }
    const found = sampleEmployees.find(e => e.id === Number(settlement?.employee_id));
    if (found) return `${found.name} (${found.code})`;
    return `Employee #${settlement?.employee_id || 1}`;
  };

  const filteredSettlements = safeSettlements.filter((s: any) => {
    const name = getEmployeeName(s).toLowerCase();
    const query = searchQuery.toLowerCase();
    return name.includes(query) || (s.status || '').toLowerCase().includes(query);
  });

  const selectClassName = "flex h-9 w-full rounded-md border border-border bg-background px-3 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium cursor-pointer shadow-2xs";

  const demoRecords = [
    {
      id: 1,
      employee_id: 1,
      exit_date: '2026-07-31',
      status: 'draft',
      leave_encashment_amount: 45000,
      gratuity_amount: 125000,
      severance_amount: 50000,
      notice_recovery: 0,
      net_settlement_amount: 220000,
      asset_clearance: 'Cleared'
    },
    {
      id: 2,
      employee_id: 4,
      exit_date: '2026-06-30',
      status: 'submitted',
      leave_encashment_amount: 32000,
      gratuity_amount: 180000,
      severance_amount: 0,
      notice_recovery: -15000,
      net_settlement_amount: 197000,
      asset_clearance: 'Cleared'
    },
    {
      id: 3,
      employee_id: 5,
      exit_date: '2026-05-15',
      status: 'processed',
      leave_encashment_amount: 28000,
      gratuity_amount: 0,
      severance_amount: 0,
      notice_recovery: 0,
      net_settlement_amount: 28000,
      asset_clearance: 'Cleared'
    },
  ];

  const recordsToDisplay = filteredSettlements.length > 0 ? filteredSettlements : demoRecords;

  return (
    <div className="space-y-4 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-card border border-border/80 p-4 rounded-xl shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-primary/10 text-primary shrink-0">
            <UserX className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-black text-foreground tracking-tight">Full & Final (F&F) Settlement Management</h1>
            <p className="text-xs text-muted-foreground">Manage employee exit clearances, leave encashments, gratuity, notice period recoveries, and relieving documents.</p>
          </div>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="h-8 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground flex items-center gap-1.5 shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          {showForm ? 'Close Form' : 'New F&F Settlement'}
        </Button>
      </div>

      {/* Admin Employee Search Filter Card */}
      <Card className="border border-border/80 shadow-xs bg-card">
        <CardContent className="p-3">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
              <Input
                placeholder="Search F&F records by Employee Name, Code, or Status..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>
            {searchQuery && (
              <Button variant="ghost" size="sm" onClick={() => setSearchQuery('')} className="text-xs text-muted-foreground h-9">
                Clear Search
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* F&F Settlement Initialization Form */}
      {showForm && (
        <Card className="border border-border/80 shadow-xs bg-card">
          <CardHeader className="bg-primary/5 border-b border-border/60 pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
              <UserX className="w-4 h-4 text-primary" />
              Initialize Full & Final Exit Settlement
            </CardTitle>
            <CardDescription className="text-xs">Select exiting employee by name, exit date, notice period, and asset clearance checklist.</CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs flex items-center gap-2 font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {formError}
              </div>
            )}
            {formSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-xs flex items-center gap-2 font-semibold">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                {formSuccess}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Employee Name Select Dropdown */}
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Exiting Employee Name *
                </Label>
                <select
                  value={empId}
                  onChange={(e) => setEmpId(e.target.value)}
                  className={selectClassName}
                >
                  {sampleEmployees.map(emp => (
                    <option key={emp.id} value={String(emp.id)}>
                      {emp.name} ({emp.code}) — {emp.department} ({emp.status})
                    </option>
                  ))}
                </select>
              </div>

              {/* Exit Date */}
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Official Exit Date *
                </Label>
                <Input
                  type="date"
                  value={exitDate}
                  onChange={(e) => setExitDate(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Notice Period Served (Days)
                </Label>
                <Input
                  placeholder="e.g. 30"
                  type="number"
                  value={noticePeriod}
                  onChange={(e) => setNoticePeriod(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Separation / Resignation Reason
                </Label>
                <Input
                  placeholder="e.g. Personal / Career Growth"
                  value={resignationReason}
                  onChange={(e) => setResignationReason(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1 flex flex-col justify-end">
                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                  IT & Company Assets Clearance
                </Label>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-foreground h-9 border border-border rounded-lg px-3 bg-muted/20">
                  <input
                    type="checkbox"
                    checked={assetCleared}
                    onChange={(e) => setAssetCleared(e.target.checked)}
                    className="w-3.5 h-3.5 text-primary accent-primary rounded cursor-pointer"
                  />
                  <span>All Assets Cleared (Laptop, ID, Badge)</span>
                </label>
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-border/60">
              <Button onClick={handleCreate} className="h-8 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground">
                Initialize Settlement
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowForm(false)} className="h-8 text-xs">
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Settlements List & Breakdown */}
      <Card className="border border-border/80 shadow-xs bg-card">
        <CardHeader className="border-b border-border/60 pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
            <FileText className="w-4 h-4 text-primary" />
            Full & Final Exit Settlement Records
          </CardTitle>
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold">
            {recordsToDisplay.length} Exit Records
          </Badge>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          {isLoading ? (
            <div className="py-8 text-center text-xs text-muted-foreground">Loading settlements...</div>
          ) : (
            <div className="space-y-3">
              {recordsToDisplay.map((settlement: any) => {
                const empNameDisplay = getEmployeeName(settlement);
                const noticeVal = Number(settlement.notice_recovery || 0);

                return (
                  <div key={settlement.id} className="p-4 border border-border/80 rounded-xl bg-card shadow-2xs space-y-3">
                    {/* Record Top Bar */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-border/60 pb-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                          <User className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-bold text-sm text-foreground">{empNameDisplay}</p>
                          <p className="text-[10px] text-muted-foreground">Official Exit Date: <strong className="text-foreground">{settlement.exit_date}</strong></p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 border-emerald-200 gap-1">
                          <Laptop className="w-3 h-3 text-emerald-600" /> IT Assets: {settlement.asset_clearance || 'Cleared'}
                        </Badge>
                        {getStatusBadge(settlement.status)}
                      </div>
                    </div>

                    {/* F&F Itemized Calculation Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5 p-3 bg-muted/20 rounded-lg text-xs border border-border/60">
                      <div>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase">Leave Encashment</p>
                        <p className="font-bold text-foreground text-xs mt-0.5">₹{Number(settlement.leave_encashment_amount || 0).toLocaleString('en-IN')}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase">Gratuity Payout</p>
                        <p className="font-bold text-foreground text-xs mt-0.5">₹{Number(settlement.gratuity_amount || 0).toLocaleString('en-IN')}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase">Severance / Bonus</p>
                        <p className="font-bold text-foreground text-xs mt-0.5">₹{Number(settlement.severance_amount || 0).toLocaleString('en-IN')}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase">Notice Recovery</p>
                        <p className={`font-bold text-xs mt-0.5 ${noticeVal < 0 ? 'text-rose-600' : 'text-foreground'}`}>
                          ₹{noticeVal.toLocaleString('en-IN')}
                        </p>
                      </div>
                      <div className="col-span-2 md:col-span-1 border-t md:border-t-0 md:border-l border-border/60 pt-2 md:pt-0 md:pl-3">
                        <p className="text-primary font-bold uppercase tracking-wider text-[9px]">Net Settlement Payout</p>
                        <p className="font-black text-emerald-600 text-sm mt-0.5">
                          ₹{Number(settlement.net_settlement_amount || 0).toLocaleString('en-IN')}
                        </p>
                      </div>
                    </div>

                    {/* F&F Actions */}
                    <div className="flex flex-wrap gap-2 pt-1 justify-between items-center text-xs">
                      <div className="flex flex-wrap gap-1.5 items-center">
                        {settlement.status === 'draft' && (
                          <>
                            <Button size="sm" className="h-7 text-[10px] font-bold bg-primary hover:bg-primary/90 text-primary-foreground gap-1" onClick={() => calculateSettlement(settlement.id)}>
                              <Calculator className="w-3.5 h-3.5" /> Calculate Amounts
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 text-[10px] font-bold" onClick={() => submitSettlement(settlement.id)}>
                              Submit for Approval
                            </Button>
                          </>
                        )}
                        {settlement.status === 'submitted' && (
                          <Button size="sm" className="h-7 text-[10px] font-bold bg-amber-600 hover:bg-amber-700 text-white gap-1" onClick={() => approveSettlement({ settlementId: settlement.id, approverId: 1 })}>
                            <ShieldCheck className="w-3.5 h-3.5" /> Approve Settlement
                          </Button>
                        )}
                        {settlement.status === 'approved' && (
                          <Button size="sm" className="h-7 text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1" onClick={() => processSettlement(settlement.id)}>
                            <DollarSign className="w-3.5 h-3.5" /> Disburse & Issue Certificate
                          </Button>
                        )}
                        {settlement.status === 'processed' && (
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold text-[10px] gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Settled & Relieving Certificate Issued
                          </Badge>
                        )}
                      </div>

                      <Button size="sm" variant="ghost" className="h-7 text-[10px] text-primary font-bold gap-1">
                        <Download className="w-3.5 h-3.5" /> Download F&F Statement
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FullFinalSettlement;
