import React, { useState } from 'react';
import { useAuthStore } from '@/features/auth/store/authStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  TrendingUp,
  Plus,
  CheckCircle,
  ChevronUp,
  Send,
  Sparkles,
  FileCheck,
  XCircle
} from 'lucide-react';
import { apiClient } from '@/config/api';

interface RevisionRecord {
  id: number;
  empId: number;
  empName: string;
  empCode: string;
  revisionType: string;
  currentCtc: number;
  proposedCtc: number;
  effectiveFrom: string;
  reason: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'implemented';
}

export const SalaryRevisionManagement: React.FC = () => {
  const { user } = useAuthStore();
  // Revision list starts empty — populated from API on mount
  const [revisionsList, setRevisionsList] = useState<RevisionRecord[]>([]);

  const [showForm, setShowForm] = useState(false);
  const [selectedEmpId, setSelectedEmpId] = useState<string>('38');
  const [revisionType, setRevisionType] = useState('Annual Performance Appraisal');
  const [newCtcInput, setNewCtcInput] = useState<string>('1150000');
  const [effectiveFrom, setEffectiveFrom] = useState('2026-08-01');
  const [reason, setReason] = useState('Outstanding performance evaluation');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Dynamic employee list — fetched live from API
  const [employees, setEmployees] = useState<{ id: number; name: string; code: string; ctc: number }[]>([]);

  React.useEffect(() => {
    // Load existing salary revisions for this org
    apiClient.get('/payroll/salary-revisions').then((res: any) => {
      const list = res.data?.data || res.data || [];
      if (Array.isArray(list) && list.length > 0) {
        const mapped: RevisionRecord[] = list.map((r: any) => ({
          id: r.id || r.uuid || Date.now(),
          empId: r.employee_id || r.employeeId || 0,
          empName: r.employee_name || r.employeeName || `Employee #${r.employee_id}`,
          empCode: r.employee_code || r.employeeCode || `EMP-${r.employee_id}`,
          revisionType: r.revision_type || r.revisionType || 'Revision',
          currentCtc: Number(r.current_ctc || r.currentCtc || 0),
          proposedCtc: Number(r.proposed_ctc || r.newCTC || r.newCtc || 0),
          effectiveFrom: r.effective_from || r.effectiveFrom || '',
          reason: r.reason || '',
          status: r.status || 'submitted'
        }));
        setRevisionsList(mapped);
      }
    }).catch(() => {});

    // Load live employee list for this org
    apiClient.get('/employees', { params: { pageSize: 500 } }).then((res: any) => {
      const list = res.data?.data || res.data || [];
      if (Array.isArray(list) && list.length > 0) {
        const mapped = list.map((e: any) => ({
          id: e.id,
          name: `${e.first_name || e.firstName || ''} ${e.last_name || e.lastName || ''}`.trim() || e.name || e.email || `Employee #${e.id}`,
          code: e.employee_code || e.employeeCode || `EMP-${e.id}`,
          ctc: Number(e.annual_ctc || e.annualCtc || (e.gross_salary ? e.gross_salary * 12 : 0) || 0)
        }));
        setEmployees(mapped);
        if (mapped.length > 0) setSelectedEmpId(String(mapped[0].id));
      }
    }).catch(() => {});
  }, [user?.organizationId]);

  const activeEmp = employees.find(e => e.id === parseInt(selectedEmpId)) || employees[0] || { id: 0, name: '—', code: '—', ctc: 0 };
  const currentCtcVal = activeEmp.ctc;
  const proposedCtcVal = parseFloat(newCtcInput) || currentCtcVal;
  const hikeAmount = Math.max(0, proposedCtcVal - currentCtcVal);
  const hikePercentage = currentCtcVal > 0 ? ((hikeAmount / currentCtcVal) * 100).toFixed(2) : '0.00';
  const currentMonthlyGross = Math.round(currentCtcVal / 12);
  const proposedMonthlyGross = Math.round(proposedCtcVal / 12);
  const monthlyDifference = proposedMonthlyGross - currentMonthlyGross;

  const handleCreateRevision = async () => {
    const record: RevisionRecord = {
      id: Date.now(),
      empId: activeEmp.id,
      empName: activeEmp.name,
      empCode: activeEmp.code,
      revisionType,
      currentCtc: currentCtcVal,
      proposedCtc: proposedCtcVal,
      effectiveFrom,
      reason,
      status: 'submitted'
    };

    setRevisionsList([record, ...revisionsList]);
    setSuccessMsg(`Salary revision request submitted for ${activeEmp.name} (+${hikePercentage}% Hike)!`);

    try {
      await apiClient.post('/payroll/salary-revisions', {
        employeeId: activeEmp.id,
        revisionType,
        newCTC: proposedCtcVal,
        effectiveFrom,
        reason
      });
    } catch (e) {}

    setShowForm(false);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const handleApprove = (id: number) => {
    setRevisionsList(prev => prev.map(r => r.id === id ? { ...r, status: 'approved' } : r));
  };

  const handleReject = (id: number) => {
    setRevisionsList(prev => prev.map(r => r.id === id ? { ...r, status: 'rejected' } : r));
  };

  const getBadgeStyle = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'implemented': return 'bg-purple-50 text-purple-800 border-purple-200';
      case 'submitted': return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'rejected': return 'bg-rose-50 text-rose-800 border-rose-200';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 text-white p-6 rounded-2xl shadow-lg">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <TrendingUp className="w-4 h-4" /> Compensation & Appraisal Engine
          </div>
          <h2 className="text-2xl font-extrabold">Salary Revisions & Hike Management</h2>
          <p className="text-slate-300 text-sm mt-1">
            Calculate percentage increments, process promotion CTC revisions, and manage HR approval workflows.
          </p>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2 shadow-md shrink-0"
        >
          {showForm ? <ChevronUp className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Close Builder' : 'Request Salary Revision'}
        </Button>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-2 font-medium text-sm">
          <CheckCircle className="w-5 h-5 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Revision Form & Hike Calculator */}
      {showForm && (
        <Card className="border border-emerald-200 dark:border-emerald-900 shadow-xl bg-slate-50/50 dark:bg-slate-900">
          <CardHeader className="border-b bg-white dark:bg-slate-800">
            <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
              <TrendingUp className="w-5 h-5 text-emerald-600" /> Proposed Salary Increment Calculator
            </CardTitle>
            <CardDescription>Select employee and set proposed annual CTC to compute real-time hike percentage and monthly pay difference.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Employee Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Select Employee *</label>
                <select
                  value={selectedEmpId}
                  onChange={(e) => setSelectedEmpId(e.target.value)}
                  className="w-full h-10 px-3 border rounded-lg text-sm bg-white dark:bg-slate-800 font-semibold text-slate-900 dark:text-white"
                >
                  {employees.map(e => (
                    <option key={e.id} value={String(e.id)}>
                      {e.name} ({e.code}) - Current: ₹{(e.ctc / 100000).toFixed(2)}L
                    </option>
                  ))}
                </select>
              </div>

              {/* Revision Type */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Revision Type *</label>
                <select
                  value={revisionType}
                  onChange={(e) => setRevisionType(e.target.value)}
                  className="w-full h-10 px-3 border rounded-lg text-sm bg-white dark:bg-slate-800 font-semibold text-slate-900 dark:text-white"
                >
                  <option value="Annual Performance Appraisal">Annual Performance Appraisal</option>
                  <option value="Role Promotion (Lead Engineer)">Role Promotion</option>
                  <option value="Market Alignment Revision">Market Alignment Revision</option>
                  <option value="Retention Bonus / Special Hike">Retention Bonus / Special Hike</option>
                </select>
              </div>

              {/* Proposed Annual CTC */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Proposed Annual CTC (INR) *</label>
                <Input
                  type="number"
                  value={newCtcInput}
                  onChange={(e) => setNewCtcInput(e.target.value)}
                  placeholder="e.g. 1150000"
                  className="h-10 text-sm font-bold bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400"
                />
              </div>

              {/* Effective From */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Effective Date *</label>
                <Input
                  type="date"
                  value={effectiveFrom}
                  onChange={(e) => setEffectiveFrom(e.target.value)}
                  className="h-10 text-sm bg-white dark:bg-slate-800"
                />
              </div>
            </div>

            {/* Real-time Increment Summary Card */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b pb-3">
                <span className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" /> Real-time Increment Impact Analysis
                </span>
                <Badge variant="outline" className="bg-emerald-100 text-emerald-900 font-bold border-emerald-300 text-sm px-3 py-1">
                  +{hikePercentage}% Salary Hike
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-semibold">
                <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg space-y-1 border">
                  <span className="text-slate-500">Current Annual CTC</span>
                  <div className="text-base font-bold text-slate-900 dark:text-white">₹{(currentCtcVal / 100000).toFixed(2)} Lakhs</div>
                  <div className="text-[11px] text-slate-400">₹{currentMonthlyGross.toLocaleString('en-IN')}/mo</div>
                </div>

                <div className="p-3 bg-emerald-50 dark:bg-slate-900 rounded-lg space-y-1 border border-emerald-200">
                  <span className="text-slate-500">Proposed Annual CTC</span>
                  <div className="text-base font-bold text-emerald-700 dark:text-emerald-400">₹{(proposedCtcVal / 100000).toFixed(2)} Lakhs</div>
                  <div className="text-[11px] text-emerald-600 font-bold">₹{proposedMonthlyGross.toLocaleString('en-IN')}/mo</div>
                </div>

                <div className="p-3 bg-indigo-50 dark:bg-slate-900 rounded-lg space-y-1 border border-indigo-100">
                  <span className="text-slate-500">Annual Increase</span>
                  <div className="text-base font-bold text-indigo-900 dark:text-indigo-300">+₹{hikeAmount.toLocaleString('en-IN')}</div>
                  <div className="text-[11px] text-indigo-600">+₹{monthlyDifference.toLocaleString('en-IN')}/mo net gain</div>
                </div>

                <div className="p-3 bg-purple-50 dark:bg-slate-900 rounded-lg space-y-1 border border-purple-100">
                  <span className="text-slate-500">Effective Date</span>
                  <div className="text-base font-bold text-purple-900 dark:text-purple-300">{effectiveFrom}</div>
                  <div className="text-[11px] text-purple-600">Pending HR Approval</div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Reason / Appraisal Note</label>
                <Input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Justification for salary revision"
                  className="h-10 text-sm bg-white dark:bg-slate-800"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={handleCreateRevision} className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2 shadow-md">
                <Send className="w-4 h-4" /> Submit Revision for HR Approval
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Revision History & Status Table */}
      <Card className="shadow border-slate-200 dark:border-slate-800">
        <CardHeader className="border-b pb-4 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-emerald-600" /> Salary Revision Requests & Approval Register
            </CardTitle>
            <CardDescription>Track all submitted salary revisions, appraisal hikes, and role promotions.</CardDescription>
          </div>
          <Badge variant="outline" className="font-bold">{revisionsList.length} Total Records</Badge>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-600 uppercase border-b">
                <tr>
                  <th className="px-6 py-3">Employee</th>
                  <th className="px-6 py-3">Revision Type</th>
                  <th className="px-6 py-3">Current CTC</th>
                  <th className="px-6 py-3">Proposed CTC</th>
                  <th className="px-6 py-3">Effective Date</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {revisionsList.map((rev) => (
                  <tr key={rev.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                    <td className="px-6 py-4 font-semibold">
                      <div className="text-slate-900 dark:text-white">{rev.empName}</div>
                      <div className="text-xs text-slate-400 font-mono">{rev.empCode}</div>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-800 dark:text-slate-200">
                      {rev.revisionType}
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-400">
                      ₹{(rev.currentCtc / 100000).toFixed(2)} Lakhs
                    </td>
                    <td className="px-6 py-4 font-bold text-emerald-600 dark:text-emerald-400">
                      ₹{(rev.proposedCtc / 100000).toFixed(2)} Lakhs
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-slate-600 dark:text-slate-400">
                      {rev.effectiveFrom}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className={`font-bold capitalize ${getBadgeStyle(rev.status)}`}>
                        {rev.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      {rev.status === 'submitted' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleApprove(rev.id)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 px-2.5"
                          >
                            <CheckCircle className="w-3.5 h-3.5 mr-1" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReject(rev.id)}
                            className="text-rose-600 border-rose-200 text-xs h-8 px-2.5"
                          >
                            <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                          </Button>
                        </>
                      )}
                      {rev.status === 'approved' && (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-800 font-bold border-emerald-200">
                          Ready for Next Payroll Run
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SalaryRevisionManagement;
