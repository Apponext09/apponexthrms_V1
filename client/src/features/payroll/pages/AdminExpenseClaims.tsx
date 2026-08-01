import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Receipt, Search, CheckCircle2, XCircle, Clock } from 'lucide-react';
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

    toast.success(`Expense claim approved successfully!`);
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

    toast.success(`Expense claim rejected.`);
    setActionLoadingId(null);
  };

  const filteredClaims = claims.filter(c => {
    const matchesStatus = statusFilter === 'all' ? true : c.status === statusFilter;
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || c.empName.toLowerCase().includes(q) || c.code.toLowerCase().includes(q) || c.type.toLowerCase().includes(q) || c.description.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  const pendingCount = claims.filter(c => c.status === 'pending').length;
  const approvedTotal = claims.filter(c => c.status === 'approved').reduce((sum, c) => sum + c.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-border/80">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Receipt className="w-5 h-5 text-primary" />
            Expense Claims Management
          </h2>
          <p className="text-xs text-muted-foreground">
            Review and action live employee and manager expense reimbursement requests stored in database.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs font-bold px-3 py-1">
            {pendingCount} Pending
          </Badge>
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-bold px-3 py-1">
            ₹{approvedTotal.toLocaleString('en-IN')} Approved Total
          </Badge>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card border border-border/80 p-3 rounded-xl shadow-2xs">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
          <Input
            placeholder="Search employee, claim type..."
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
              variant={statusFilter === st ? 'default' : 'outline'}
              onClick={() => setStatusFilter(st)}
              className="h-8 text-xs font-bold capitalize"
            >
              {st}
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      <Card className="border border-border/80 shadow-xs bg-card">
        <CardHeader className="border-b border-border/60 pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
              <Receipt className="w-4 h-4 text-primary" /> Real Expense Claims Queue
            </CardTitle>
            <CardDescription className="text-xs">Database submitted reimbursement applications.</CardDescription>
          </div>
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold">
            {filteredClaims.length} Claims
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/30 text-[10px] font-bold text-muted-foreground uppercase border-b border-border/60">
                <tr>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Claim Type</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Claim Date</th>
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
                      No real expense claims found.
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
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-bold">
                          🧾 {c.type}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground max-w-[220px] truncate">{c.description}</td>
                      <td className="px-4 py-3 font-mono text-muted-foreground">{c.date}</td>
                      <td className="px-4 py-3 font-bold text-emerald-600">₹{c.amount.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3">
                        {c.status === 'pending' && <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-bold">Pending</Badge>}
                        {c.status === 'approved' && <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">Approved</Badge>}
                        {c.status === 'rejected' && <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-bold">Rejected</Badge>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {c.status === 'pending' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              onClick={() => handleApprove(c.id)}
                              disabled={actionLoadingId === c.id}
                              className="h-7 text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-2.5"
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleReject(c.id)}
                              disabled={actionLoadingId === c.id}
                              className="h-7 text-[10px] font-bold text-rose-600 border-rose-200 hover:bg-rose-50 px-2.5"
                            >
                              Reject
                            </Button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-muted-foreground font-medium">Processed</span>
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
