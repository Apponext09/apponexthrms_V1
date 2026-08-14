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

export const AdminExpenseClaims: React.FC = () => {
  const [claims, setClaims] = useState<ExpenseClaimRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [actionLoadingId, setActionLoadingId] = useState<number | string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = () => {
    setIsLoading(true);
    const storageKey = 'shared_hr_reimbursements';
    let localShared: any[] = [];
    try {
      localShared = JSON.parse(localStorage.getItem(storageKey) || '[]');
    } catch {}

    apiClient.get('/payroll/reimbursements').then((res: any) => {
      const apiList = res.data?.data || res.data || [];
      const map = new Map<string | number, ExpenseClaimRecord>();

      [...localShared, ...apiList].forEach((c: any) => {
        const idKey = c.id || c.uuid;
        const typeStr = String(c.claim_type || c.type || 'Expense Claim');
        const isTravel = typeStr.toLowerCase().includes('travel') || Boolean(c.isTravel);

        if (!isTravel && idKey && !map.has(idKey)) {
          map.set(idKey, {
            id: idKey,
            empName: c.empName || `${c.first_name || ''} ${c.last_name || ''}`.trim() || `Employee #${c.employee_id || idKey}`,
            code: c.code || c.employee_code || `EMP-${c.employee_id || '001'}`,
            type: typeStr,
            amount: Number(c.amount || 0),
            date: c.claim_date || c.date || new Date().toISOString().slice(0, 10),
            description: c.description || 'Expense claim request',
            status: (c.status || 'pending').toLowerCase() as any
          });
        }
      });

      setClaims(Array.from(map.values()));
    }).catch(() => {
      const map = new Map<string | number, ExpenseClaimRecord>();
      localShared.forEach((c: any) => {
        const idKey = c.id;
        const typeStr = String(c.type || 'Expense Claim');
        if (!c.isTravel && idKey && !map.has(idKey)) {
          map.set(idKey, {
            id: idKey,
            empName: c.empName || 'Employee',
            code: c.code || 'EMP-001',
            type: typeStr,
            amount: Number(c.amount || 0),
            date: c.date || new Date().toISOString().slice(0, 10),
            description: c.description || 'Expense claim request',
            status: (c.status || 'pending').toLowerCase() as any
          });
        }
      });
      setClaims(Array.from(map.values()));
    }).finally(() => {
      setIsLoading(false);
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApprove = async (id: number | string) => {
    setActionLoadingId(id);
    setClaims(prev => prev.map(c => c.id === id ? { ...c, status: 'approved' } : c));

    try {
      const storageKey = 'shared_hr_reimbursements';
      let localShared = JSON.parse(localStorage.getItem(storageKey) || '[]');
      localShared = localShared.map((c: any) => c.id === id ? { ...c, status: 'approved' } : c);
      localStorage.setItem(storageKey, JSON.stringify(localShared));
    } catch {}

    try {
      await apiClient.put(`/payroll/reimbursements/${id}/approve`);
    } catch {}

    toast.success('Expense claim approved!');
    setActionLoadingId(null);
  };

  const handleReject = async (id: number | string) => {
    setActionLoadingId(id);
    setClaims(prev => prev.map(c => c.id === id ? { ...c, status: 'rejected' } : c));

    try {
      const storageKey = 'shared_hr_reimbursements';
      let localShared = JSON.parse(localStorage.getItem(storageKey) || '[]');
      localShared = localShared.map((c: any) => c.id === id ? { ...c, status: 'rejected' } : c);
      localStorage.setItem(storageKey, JSON.stringify(localShared));
    } catch {}

    try {
      await apiClient.put(`/payroll/reimbursements/${id}/reject`);
    } catch {}

    toast.success('Expense claim rejected.');
    setActionLoadingId(null);
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

      {/* Main Claims Table */}
      <Card className="border border-border/80 shadow-2xs bg-card">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 text-[10px] font-bold text-muted-foreground uppercase border-b border-border/60">
                <tr>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Claim Type</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground font-medium">
                      Loading expense claims...
                    </td>
                  </tr>
                ) : filteredClaims.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground font-medium">
                      No expense claims found.
                    </td>
                  </tr>
                ) : (
                  filteredClaims.map((c) => (
                    <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-bold text-foreground">{c.empName}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">{c.code}</div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 text-[10px] font-bold">
                          🧾 {c.type}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground max-w-[220px] truncate">{c.description}</td>
                      <td className="px-4 py-3 font-mono text-muted-foreground">{c.date}</td>
                      <td className="px-4 py-3 font-extrabold text-foreground">₹{c.amount.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3">
                        {c.status === 'pending' && <Badge variant="outline" className="bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 text-[10px] font-bold">Pending</Badge>}
                        {c.status === 'approved' && <Badge variant="outline" className="bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 text-[10px] font-bold">Approved</Badge>}
                        {c.status === 'rejected' && <Badge variant="outline" className="bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800 text-[10px] font-bold">Rejected</Badge>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {c.status === 'pending' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              onClick={() => handleApprove(c.id)}
                              disabled={actionLoadingId === c.id}
                              className="h-7 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer px-2.5"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleReject(c.id)}
                              disabled={actionLoadingId === c.id}
                              className="h-7 text-[11px] font-bold text-rose-600 border-rose-200 hover:bg-rose-50 cursor-pointer px-2.5"
                            >
                              <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                            </Button>
                          </div>
                        ) : (
                          <span className="text-[11px] font-medium text-muted-foreground capitalize">{c.status}</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminExpenseClaims;
