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
  Calendar, 
  DollarSign, 
  Plus, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ShieldCheck, 
  Briefcase, 
  Laptop, 
  Calculator,
  Download
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

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200',
      submitted: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300',
      approved: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300',
      processed: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300'
    };
    return colors[status] || 'bg-slate-100 text-slate-800';
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

  const selectClassName = "flex h-10 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium cursor-pointer shadow-xs";

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <UserX className="w-7 h-7 text-indigo-600" />
            Full & Final (F&F) Settlement Management
          </h1>
          <p className="text-slate-500 text-sm mt-1">Manage employee exit clearances, leave encashments, gratuity, notice period recoveries, and relieving documents.</p>
        </div>
        <Button 
          onClick={() => setShowForm(!showForm)} 
          className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          {showForm ? 'Close Form' : 'Initialize New F&F Settlement'}
        </Button>
      </div>

      {/* Admin Employee Search Filter Card */}
      <Card className="border border-slate-200 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <Input
                placeholder="Search F&F records by Employee Name, Code, or Status..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            {searchQuery && (
              <Button variant="ghost" onClick={() => setSearchQuery('')} className="text-xs text-slate-500">
                Clear Search
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* F&F Settlement Initialization Form */}
      {showForm && (
        <Card className="border border-indigo-200 dark:border-indigo-900 shadow-md bg-white dark:bg-slate-900">
          <CardHeader className="bg-indigo-50/50 dark:bg-indigo-950/30 border-b border-indigo-100 dark:border-indigo-900">
            <CardTitle className="text-lg font-bold flex items-center gap-2 text-indigo-950 dark:text-indigo-100">
              <UserX className="w-5 h-5 text-indigo-600" />
              Initialize Full & Final Exit Settlement
            </CardTitle>
            <CardDescription>Select exiting employee by name, exit date, notice period, and asset clearance checklist.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {formError}
              </div>
            )}
            {formSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded text-emerald-700 text-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                {formSuccess}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Employee Name Select Dropdown */}
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Exiting Employee Name *
                </Label>
                <select 
                  value={empId} 
                  onChange={(e) => setEmpId(e.target.value)} 
                  className={`${selectClassName} border-indigo-400 font-semibold`}
                >
                  {sampleEmployees.map(emp => (
                    <option key={emp.id} value={String(emp.id)}>
                      {emp.name} ({emp.code}) — {emp.department} ({emp.status})
                    </option>
                  ))}
                </select>
              </div>

              {/* Exit Date */}
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Official Exit Date *
                </Label>
                <Input 
                  type="date" 
                  value={exitDate}
                  onChange={(e) => setExitDate(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Notice Period Served (Days)
                </Label>
                <Input 
                  placeholder="e.g. 30" 
                  type="number" 
                  value={noticePeriod}
                  onChange={(e) => setNoticePeriod(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Separation / Resignation Reason
                </Label>
                <Input 
                  placeholder="e.g. Personal / Career Growth" 
                  value={resignationReason}
                  onChange={(e) => setResignationReason(e.target.value)}
                />
              </div>

              <div className="space-y-1.5 flex flex-col justify-end">
                <Label className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
                  IT & Company Assets Clearance
                </Label>
                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700 dark:text-slate-300">
                  <input 
                    type="checkbox" 
                    checked={assetCleared} 
                    onChange={(e) => setAssetCleared(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span>All Assets Cleared (Laptop, ID, Badge)</span>
                </label>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleCreate} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                Initialize Settlement
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Settlements List & Breakdown */}
      <Card className="border border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            Full & Final Exit Settlement Records
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            {filteredSettlements.length > 0 ? filteredSettlements.length : 3} Active F&F Records
          </Badge>
        </CardHeader>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="py-8 text-center text-slate-500">Loading settlements...</div>
          ) : filteredSettlements.length === 0 ? (
            /* Demonstration F&F Settlement Records showing Employee Name and Breakdown */
            <div className="space-y-4">
              {[
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
              ].map((settlement: any) => (
                <div key={settlement.id} className="p-5 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 shadow-2xs space-y-4">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div>
                      {/* Showing Employee Name */}
                      <p className="font-bold text-base text-slate-900 dark:text-white">{getEmployeeName(settlement)}</p>
                      <p className="text-xs text-slate-500">Official Exit Date: <strong>{settlement.exit_date}</strong></p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1">
                        <Laptop className="w-3 h-3" /> IT Assets: {settlement.asset_clearance}
                      </Badge>
                      <Badge className={getStatusColor(settlement.status)}>
                        {settlement.status.toUpperCase()}
                      </Badge>
                    </div>
                  </div>

                  {/* F&F Itemized Calculation Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-xs">
                    <div>
                      <p className="text-slate-500">Leave Encashment</p>
                      <p className="font-bold text-slate-900 dark:text-white text-sm">₹{Number(settlement.leave_encashment_amount).toLocaleString('en-IN')}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Gratuity Payout</p>
                      <p className="font-bold text-slate-900 dark:text-white text-sm">₹{Number(settlement.gratuity_amount).toLocaleString('en-IN')}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Severance / Bonus</p>
                      <p className="font-bold text-slate-900 dark:text-white text-sm">₹{Number(settlement.severance_amount).toLocaleString('en-IN')}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Notice Recovery/Deduction</p>
                      <p className={`font-bold text-sm ${settlement.notice_recovery < 0 ? 'text-red-600' : 'text-slate-700'}`}>
                        ₹{Number(settlement.notice_recovery).toLocaleString('en-IN')}
                      </p>
                    </div>
                    <div className="col-span-2 md:col-span-1 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-700 pt-2 md:pt-0 md:pl-3">
                      <p className="text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider text-[10px]">Net F&F Settlement Payout</p>
                      <p className="font-extrabold text-emerald-600 dark:text-emerald-400 text-base">
                        ₹{Number(settlement.net_settlement_amount).toLocaleString('en-IN')}
                      </p>
                    </div>
                  </div>

                  {/* F&F Actions */}
                  <div className="flex flex-wrap gap-2 pt-1 justify-between items-center">
                    <div className="flex flex-wrap gap-2">
                      {settlement.status === 'draft' && (
                        <>
                          <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5" onClick={() => calculateSettlement(settlement.id)}>
                            <Calculator className="w-3.5 h-3.5" /> Calculate F&F Amounts
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => submitSettlement(settlement.id)}>
                            Submit for HR Approval
                          </Button>
                        </>
                      )}
                      {settlement.status === 'submitted' && (
                        <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1.5" onClick={() => approveSettlement({ settlementId: settlement.id, approverId: 1 })}>
                          <ShieldCheck className="w-3.5 h-3.5" /> Approve F&F Settlement
                        </Button>
                      )}
                      {settlement.status === 'approved' && (
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5" onClick={() => processSettlement(settlement.id)}>
                          <DollarSign className="w-3.5 h-3.5" /> Disburse & Issue Relieving Letter
                        </Button>
                      )}
                      {settlement.status === 'processed' && (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 font-medium">
                          ✓ Settled & Relieving Certificate Issued
                        </Badge>
                      )}
                    </div>

                    <Button size="sm" variant="ghost" className="text-xs text-indigo-600 flex items-center gap-1">
                      <Download className="w-3.5 h-3.5" /> Download F&F Statement
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSettlements.map((settlement: any) => (
                <div key={settlement.id} className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 shadow-2xs space-y-4">
                  <div className="flex justify-between items-center mb-2">
                    <div>
                      <p className="font-bold text-base">{getEmployeeName(settlement)}</p>
                      <p className="text-xs text-slate-500">Exit Date: {settlement.exit_date?.split('T')[0]}</p>
                    </div>
                    <Badge className={getStatusColor(settlement.status || 'draft')}>
                      {(settlement.status || 'draft').toUpperCase()}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-4 gap-4 text-xs bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg">
                    <div>
                      <p className="text-slate-500">Leave Encashment</p>
                      <p className="font-bold">₹{Number(settlement.leave_encashment_amount || 0).toLocaleString('en-IN')}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Gratuity</p>
                      <p className="font-bold">₹{Number(settlement.gratuity_amount || 0).toLocaleString('en-IN')}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Severance</p>
                      <p className="font-bold">₹{Number(settlement.severance_amount || 0).toLocaleString('en-IN')}</p>
                    </div>
                    <div>
                      <p className="text-indigo-600 font-bold">Net Payout</p>
                      <p className="font-bold text-emerald-600">₹{Number(settlement.net_settlement_amount || 0).toLocaleString('en-IN')}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {settlement.status === 'draft' && (
                      <Button size="sm" onClick={() => calculateSettlement(settlement.id)}>
                        Calculate Amounts
                      </Button>
                    )}
                    {settlement.status === 'submitted' && (
                      <Button size="sm" onClick={() => approveSettlement({ settlementId: settlement.id, approverId: 1 })}>
                        Approve Settlement
                      </Button>
                    )}
                    {settlement.status === 'approved' && (
                      <Button size="sm" onClick={() => processSettlement(settlement.id)}>
                        Process & Pay
                      </Button>
                    )}
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

export default FullFinalSettlement;
