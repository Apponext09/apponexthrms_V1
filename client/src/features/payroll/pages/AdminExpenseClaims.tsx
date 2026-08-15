import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Receipt, Search, CheckCircle2, XCircle, Clock, DollarSign, RefreshCw, FileText } from 'lucide-react';
import { apiClient } from '@/config/api';
import { toast } from 'sonner';

interface ExpenseClaimRecord {
  id: number | string;
  empName: string;
  code: string;
  type: string;
  amount: number;
  date: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected';
}

const formatDisplayDate = (rawDate: any): string => {
  if (!rawDate) return new Date().toLocaleDateString('en-CA');
  const d = new Date(rawDate);
  if (isNaN(d.getTime())) return String(rawDate).slice(0, 10);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const AdminExpenseClaims: React.FC = () => {
  const [claims, setClaims] = useState<ExpenseClaimRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [actionLoadingId, setActionLoadingId] = useState<number | string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = () => {
    setIsLoading(true);
    apiClient.get('/payroll/reimbursements').then((res: any) => {
      const apiList = res.data?.data || res.data || [];
      const map = new Map<string | number, ExpenseClaimRecord>();

      if (Array.isArray(apiList)) {
        apiList.forEach((c: any) => {
          const idKey = c.id || c.uuid;
          let typeStr = String(c.claim_type || c.type || 'Expense Claim');
          let descStr = c.description || 'Expense claim request';

          if (descStr.startsWith('[')) {
            const match = descStr.match(/^\[(.*?)\]\s*(.*)$/);
            if (match) {
              typeStr = match[1];
              descStr = match[2];
            }
          }

          const isTravel = typeStr.toLowerCase().includes('travel') || String(c.claim_type || '').toLowerCase().includes('travel');

          if (!isTravel && idKey && !map.has(idKey)) {
            const fn = c.firstName || c.first_name || '';
            const ln = c.lastName || c.last_name || '';
            const fullName = `${fn} ${ln}`.trim() || c.empName || `Employee #${c.employee_id || c.employeeId || idKey}`;
            const empCode = c.employeeCode || c.employee_code || c.code || `EMP-${c.employee_id || c.employeeId || '001'}`;

            map.set(idKey, {
              id: idKey,
              empName: fullName,
              code: empCode,
              type: typeStr,
              amount: Number(c.amount || 0),
              date: formatDisplayDate(c.claim_date || c.date || c.created_at),
              description: descStr,
              status: (c.status || 'pending').toLowerCase() as any
            });
          }
        });
      }

      setClaims(Array.from(map.values()));
    }).catch((err) => {
      console.error('Failed to load expense claims:', err);
    }).finally(() => {
      setIsLoading(false);
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApprove = async (id: number | string) => {
    setActionLoadingId(id);
    try {
      await apiClient.put(`/payroll/reimbursements/${id}/approve`);
      toast.success('Expense claim approved!');
      loadData();
    } catch (err: any) {
      toast.error('Failed to approve claim: ' + (err?.response?.data?.message || err?.message || 'Server error'));
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (id: number | string) => {
    setActionLoadingId(id);
    try {
      await apiClient.put(`/payroll/reimbursements/${id}/reject`, { remarks: 'Rejected by admin' });
      toast.success('Expense claim rejected.');
      loadData();
    } catch (err: any) {
      toast.error('Failed to reject claim: ' + (err?.response?.data?.message || err?.message || 'Server error'));
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredClaims = claims.filter(c => {
    const matchesStatus = statusFilter === 'all' ? true : c.status === statusFilter;
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || c.empName.toLowerCase().includes(q) || c.code.toLowerCase().includes(q) || c.type.toLowerCase().includes(q) || c.description.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  const totalClaimsCount = claims.length;
  const pendingCount = claims.filter(c => c.status === 'pending').length;
  const approvedTotal = claims.filter(c => c.status === 'approved').reduce((sum, c) => sum + c.amount, 0);

  return (
    <div className="space-y-5">
      {/* Top Banner & Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-card border border-border/80 p-4 rounded-xl shadow-2xs">
        <div>
          <h2 className="text-lg font-black text-foreground flex items-center gap-2 tracking-tight">
            <Receipt className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Expense Claims Management
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Simple, streamlined portal for reviewing and approving employee reimbursement requests.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={loadData} className="h-8 text-xs font-bold gap-1.5 cursor-pointer">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </Button>
      </div>

      {/* Simplified KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="border border-border/80 shadow-2xs bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Total Claims</p>
              <h3 className="text-xl font-black text-foreground mt-1">{totalClaimsCount}</h3>
            </div>
            <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <FileText className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-2xs bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Pending Action</p>
              <h3 className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1">{pendingCount}</h3>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-2xs bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Approved Total</p>
              <h3 className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">₹{approvedTotal.toLocaleString('en-IN')}</h3>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <DollarSign className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card border border-border/80 p-3 rounded-xl shadow-2xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
          <Input
            placeholder="Search employee, claim type, description..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          {(['all', 'pending', 'approved', 'rejected'] as const).map(st => (
            <Button
              key={st}
              size="sm"
              variant={statusFilter === st ? 'default' : 'ghost'}
              onClick={() => setStatusFilter(st)}
              className={`h-8 text-xs font-bold capitalize px-3 rounded-lg ${
                statusFilter === st ? 'bg-indigo-600 text-white' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {st}
            </Button>
          ))}
        </div>
      </div>

      {/* Claims List Table */}
      <Card className="border border-border/80 shadow-2xs bg-card overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-12 flex items-center justify-center text-muted-foreground gap-2 text-xs">
              <RefreshCw className="w-4 h-4 animate-spin" /> Loading expense claims...
            </div>
          ) : filteredClaims.length === 0 ? (
            <div className="py-14 text-center text-muted-foreground flex flex-col items-center gap-2">
              <Receipt className="w-8 h-8 opacity-40" />
              <p className="text-xs font-bold text-foreground">No expense claims found</p>
              <p className="text-[11px]">Submitted claims from employees will appear here for review.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/40 border-b border-border/80 text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                    <th className="py-3 px-4 text-left">Employee</th>
                    <th className="py-3 px-4 text-left">Claim Type</th>
                    <th className="py-3 px-4 text-left">Description</th>
                    <th className="py-3 px-4 text-left">Date</th>
                    <th className="py-3 px-4 text-left">Amount</th>
                    <th className="py-3 px-4 text-left">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredClaims.map(c => (
                    <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 font-semibold text-foreground">
                        <div>{c.empName}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">{c.code}</div>
                      </td>
                      <td className="py-3 px-4 font-bold text-foreground">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[10px]">
                          <FileText className="w-3 h-3" /> {c.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground max-w-xs truncate" title={c.description}>
                        {c.description}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground font-mono">{c.date}</td>
                      <td className="py-3 px-4 font-black font-mono text-foreground text-sm">
                        ₹{c.amount.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-bold uppercase tracking-wider ${
                            c.status === 'approved'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300'
                              : c.status === 'rejected'
                              ? 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950 dark:text-rose-300'
                              : 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300'
                          }`}
                        >
                          {c.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {c.status === 'pending' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              disabled={actionLoadingId === c.id}
                              onClick={() => handleApprove(c.id)}
                              className="h-7 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-md gap-1 cursor-pointer"
                            >
                              <CheckCircle2 className="w-3 h-3" /> Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={actionLoadingId === c.id}
                              onClick={() => handleReject(c.id)}
                              className="h-7 text-[11px] font-bold text-rose-600 border-rose-200 hover:bg-rose-50 rounded-md gap-1 cursor-pointer"
                            >
                              <XCircle className="w-3 h-3" /> Reject
                            </Button>
                          </div>
                        ) : (
                          <span className="text-[11px] font-semibold text-muted-foreground capitalize">
                            {c.status}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminExpenseClaims;
