import React, { useState } from 'react';
import { apiClient } from '@/config/api';
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
  User,
  History,
  TrendingUp,
  Clock,
  Filter
} from 'lucide-react';

export const FullFinalSettlement: React.FC = () => {
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'submitted' | 'approved' | 'processed'>('all');

  const {
    settlements,
    exitRequests,
    createSettlement,
    calculateSettlement,
    submitSettlement,
    processSettlement,
    createSettlementAsync,
    isLoading
  } = useSettlement();

  const safeExitRequests = Array.isArray(exitRequests) ? exitRequests.filter((r: any) => r.status === 'exit_requested') : [];

  const safeSettlements = Array.isArray(settlements) ? settlements : [];

  // Live active/exiting employee master list from Database API
  const [employees, setEmployees] = React.useState<any[]>([]);

  React.useEffect(() => {
    apiClient.get('/employees').then((res: any) => {
      const list = res.data?.data || res.data || [];
      if (Array.isArray(list) && list.length > 0) {
        const formatted = list.map((e: any) => ({
          id: e.id,
          name: `${e.first_name || e.firstName || ''} ${e.last_name || e.lastName || ''}`.trim() || `Employee #${e.id}`,
          code: e.employee_code || e.employeeCode || `EMP-${e.id}`,
          department: e.department_name || e.department || 'Operations',
          status: e.status || 'Active'
        }));
        setEmployees(formatted);
        if (formatted.length > 0) setEmpId(String(formatted[0].id));
      }
    }).catch(() => { });
  }, []);

  // Form states
  const [empId, setEmpId] = useState('');
  const [exitDate, setExitDate] = useState(new Date().toISOString().split('T')[0]);
  const [noticePeriod, setNoticePeriod] = useState('30');
  const [resignationReason, setResignationReason] = useState('Better Opportunity / Personal');
  const [assetCleared, setAssetCleared] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const getStatusBadge = (status: string) => {
    const s = (status || 'draft').toLowerCase();
    if (s === 'processed') return <Badge className="bg-emerald-600 text-white font-bold text-[10px]">PROCESSED &amp; SETTLED</Badge>;
    if (s === 'approved') return <Badge className="bg-blue-600 text-white font-bold text-[10px]">APPROVED BY ADMIN</Badge>;
    if (s === 'submitted') return <Badge className="bg-amber-500 text-white font-bold text-[10px]">PENDING ADMIN APPROVAL</Badge>;
    if (s === 'exit_requested') return <Badge className="bg-rose-50 text-rose-700 border-rose-200 font-bold text-[10px]">EXIT REQUESTED</Badge>;
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
      await createSettlementAsync({
        employeeId: parseInt(empId),
        exitDate,
        noticePeriodDays: noticePeriod ? parseInt(noticePeriod) : undefined
      });
      setFormSuccess('Full & Final Settlement initialized successfully! Now calculate amounts, then submit for Admin approval.');
      setShowForm(false);
    } catch (err: any) {
      setFormError(err.message || 'Failed to initialize settlement');
    }
  };

  // HR converts an exit request into a full settlement record
  const handleInitFromExitRequest = async (req: any) => {
    try {
      await createSettlementAsync({
        employeeId: req.employee_id,
        exitDate: req.exit_date,
        noticePeriodDays: req.notice_period_days || 30
      });
      setFormSuccess(`Settlement initialized for ${req.employee_name}. Calculate amounts then submit for Admin approval.`);
    } catch (err: any) {
      setFormError(err.message || 'Failed to initialize settlement from exit request');
    }
  };

  const getEmployeeName = (settlement: any) => {
    if (settlement?.employee_name && !settlement.employee_name.includes('Employee #')) {
      return `${settlement.employee_name} (${settlement.employeeCode || settlement.employee_code || ''})`;
    }
    const found = employees.find(e => e.id === Number(settlement?.employee_id));
    if (found) return `${found.name} (${found.code})`;
    return `Employee #${settlement?.employee_id || 1}`;
  };

  const filteredSettlements = safeSettlements.filter((s: any) => {
    const name = getEmployeeName(s).toLowerCase();
    const query = searchQuery.toLowerCase();
    const matchesSearch = name.includes(query) || (s.status || '').toLowerCase().includes(query);
    const matchesStatus = statusFilter === 'all' || (s.status || 'draft').toLowerCase() === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate History Analytics KPIs
  const totalSettledAmount = safeSettlements
    .filter(s => (s.status || '').toLowerCase() === 'processed')
    .reduce((sum, s) => sum + Number(s.total_settlement_amount || s.net_settlement_amount || 0), 0);

  const processedCount = safeSettlements.filter(s => (s.status || '').toLowerCase() === 'processed').length;
  const pendingCount = safeSettlements.filter(s => ['draft', 'submitted'].includes((s.status || '').toLowerCase())).length;

  const selectClassName = "flex h-9 w-full rounded-md border border-border bg-background px-3 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium cursor-pointer shadow-2xs";

  return (
    <div className="space-y-4 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-card border border-border/80 p-4 rounded-xl shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-primary/10 text-primary shrink-0">
            <UserX className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-black text-foreground tracking-tight">Full &amp; Final (F&amp;F) Exit Settlement Console</h1>
            <p className="text-xs text-muted-foreground">Manage employee exit clearances, leave encashments, gratuity, notice period recoveries, and historical settlement archives.</p>
          </div>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="h-9 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground flex items-center gap-2 shrink-0"
        >
          {showForm ? <UserX className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Cancel Form' : '+ Initialize Exit Settlement'}
        </Button>
      </div>

      {/* History Summary KPIs Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border border-border/80 shadow-xs bg-card">
          <CardContent className="p-3.5 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 shrink-0">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase">Total Settled Outlay</p>
              <p className="text-base font-black text-emerald-600 mt-0.5">₹{totalSettledAmount.toLocaleString('en-IN')}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-xs bg-card">
          <CardContent className="p-3.5 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase">Completed Settlements</p>
              <p className="text-base font-black text-foreground mt-0.5">{processedCount} Settled Employees</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-xs bg-card">
          <CardContent className="p-3.5 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase">Pending In-Progress</p>
              <p className="text-base font-black text-foreground mt-0.5">{pendingCount} Active Clearances</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-xs bg-card">
          <CardContent className="p-3.5 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 shrink-0">
              <History className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase">Total Exit Records</p>
              <p className="text-base font-black text-foreground mt-0.5">{safeSettlements.length} Exit Records</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Initialize Exit Settlement Form */}
      {showForm && (
        <Card className="border border-border/80 shadow-xs bg-card">
          <CardHeader className="bg-muted/20 border-b border-border/60 pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <UserX className="w-4 h-4 text-primary" /> Initialize New Exit Settlement
            </CardTitle>
            <CardDescription className="text-xs">Select exiting employee name, exit date, and notice period to auto-calculate leave encashment and statutory gratuity.</CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" /> {formError}
              </div>
            )}
            {formSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold rounded-lg flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" /> {formSuccess}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Select Exiting Employee Name *
                </Label>
                <select
                  value={empId}
                  onChange={(e) => setEmpId(e.target.value)}
                  className={selectClassName}
                >
                  {employees.map(emp => (
                    <option key={emp.id} value={String(emp.id)}>
                      {emp.name} ({emp.code}) — {emp.department} ({emp.status})
                    </option>
                  ))}
                </select>
              </div>

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
                  IT &amp; Company Assets Clearance
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

      {/* Pending Exit Requests — Employees / Managers / Team Leads who submitted exit requests */}
      {safeExitRequests.length > 0 && (
        <Card className="border-2 border-rose-200 shadow-sm bg-rose-50/30">
          <CardHeader className="border-b border-rose-200/60 pb-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              <CardTitle className="text-sm font-bold text-rose-700">
                Pending Exit Requests ({safeExitRequests.length})
              </CardTitle>
            </div>
            <CardDescription className="text-[11px] text-rose-600 mt-0.5">
              Employees, Managers, or Team Leads who have submitted exit requests. Review and initialize F&amp;F Settlement for each.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {safeExitRequests.map((req: any) => (
              <div key={req.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 p-3 bg-white border border-rose-200 rounded-xl shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-rose-100 text-rose-700 shrink-0">
                    <UserX className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-foreground">{req.employee_name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      <span className="font-semibold">{req.employeeCode}</span> • Requested Exit:{' '}
                      <strong className="text-foreground">{req.exit_date}</strong> • Notice:{' '}
                      <strong>{req.notice_period_days || 30} days</strong>
                    </p>
                    {req.settlement_notes && (
                      <p className="text-[10px] text-rose-600 italic mt-0.5">Reason: "{req.settlement_notes}"</p>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  className="h-8 text-[10px] font-bold bg-rose-600 hover:bg-rose-700 text-white gap-1 shrink-0"
                  onClick={() => handleInitFromExitRequest(req)}
                >
                  <Plus className="w-3.5 h-3.5" /> Initialize F&amp;F Settlement
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Settlements History & Active List Card */}
      <Card className="border border-border/80 shadow-xs bg-card">
        <CardHeader className="border-b border-border/60 pb-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm font-bold">Full &amp; Final Exit Settlement History &amp; Data</CardTitle>
          </div>

          {/* Search & Status Filter Controls */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input
                placeholder="Search by name, code, status..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="h-8 text-xs pl-8"
              />
            </div>

            <div className="flex bg-muted/40 p-0.5 rounded-lg border border-border/60 text-xs font-bold shrink-0">
              {[
                { key: 'all', label: 'All' },
                { key: 'draft', label: 'Draft' },
                { key: 'submitted', label: 'Submitted' },
                { key: 'approved', label: 'Approved' },
                { key: 'processed', label: 'Settled' },
              ].map(f => (
                <button
                  key={f.key}
                  onClick={() => setStatusFilter(f.key as any)}
                  className={`px-2.5 py-1 rounded-md text-[10px] transition-all ${
                    statusFilter === f.key
                      ? 'bg-primary text-primary-foreground shadow-2xs font-extrabold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 space-y-4">
          {isLoading ? (
            <div className="py-8 text-center text-xs text-muted-foreground">Loading exit settlement history...</div>
          ) : filteredSettlements.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">No exit settlement history found matching current search/filter.</div>
          ) : (
            <div className="space-y-3">
              {filteredSettlements.map((settlement: any) => {
                const empNameDisplay = getEmployeeName(settlement);
                const noticeVal = Number(settlement.notice_period_recovery || settlement.notice_recovery || 0);

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
                          <p className="text-[10px] text-muted-foreground">
                            Exit Date: <strong className="text-foreground">{settlement.exit_date}</strong> • Notice: <strong>{settlement.notice_period_days || 30} Days</strong>
                          </p>
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
                        <p className="font-bold text-foreground text-xs mt-0.5">₹{Number(settlement.bonus_settlement || settlement.severance_amount || 0).toLocaleString('en-IN')}</p>
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
                          ₹{Number(settlement.total_settlement_amount || settlement.net_settlement_amount || 0).toLocaleString('en-IN')}
                        </p>
                      </div>
                    </div>

                    {/* HR-Specific F&F Actions — HR cannot approve, only Admin can */}
                    <div className="flex flex-wrap gap-2 pt-1 justify-between items-center text-xs">
                      <div className="flex flex-wrap gap-1.5 items-center">
                        {(settlement.status === 'draft' || !settlement.status) && (
                          <>
                            <Button size="sm" className="h-7 text-[10px] font-bold bg-primary hover:bg-primary/90 text-primary-foreground gap-1" onClick={() => calculateSettlement(settlement.id)}>
                              <Calculator className="w-3.5 h-3.5" /> Calculate Dues
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 text-[10px] font-bold border-amber-300 text-amber-700 hover:bg-amber-50" onClick={() => submitSettlement(settlement.id)}>
                              <ShieldCheck className="w-3.5 h-3.5" /> Submit for Admin Approval
                            </Button>
                          </>
                        )}
                        {settlement.status === 'submitted' && (
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 font-bold text-[10px] gap-1">
                            <Clock className="w-3 h-3" /> Awaiting Admin Approval
                          </Badge>
                        )}
                        {settlement.status === 'approved' && (
                          <Button size="sm" className="h-7 text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1" onClick={() => processSettlement(settlement.id)}>
                            <DollarSign className="w-3.5 h-3.5" /> Disburse &amp; Issue Relieving Certificate
                          </Button>
                        )}
                        {settlement.status === 'processed' && (
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold text-[10px] gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Settled &amp; Relieving Certificate Issued
                          </Badge>
                        )}
                      </div>

                      <Button size="sm" variant="ghost" className="h-7 text-[10px] text-primary font-bold gap-1" onClick={() => window.print()}>
                        <Download className="w-3.5 h-3.5" /> Download F&amp;F Statement
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
