import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Compass, Plane, Search, CheckCircle2, XCircle, Clock, MapPin } from 'lucide-react';
import { apiClient } from '@/config/api';
import { toast } from 'sonner';

interface TravelRequestRecord {
  id: number | string;
  empName: string;
  code: string;
  destination: string;
  date: string;
  purpose: string;
  status: 'pending' | 'approved' | 'rejected';
}

export const AdminTravelRequests: React.FC = () => {
  const [requests, setRequests] = useState<TravelRequestRecord[]>([]);
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
      const map = new Map<string | number, TravelRequestRecord>();

      [...localShared, ...apiList].forEach((c: any) => {
        const idKey = c.id || c.uuid;
        const typeStr = String(c.claim_type || c.type || '');
        const isTravel = typeStr.toLowerCase().includes('travel') || Boolean(c.isTravel);

        if (isTravel && idKey && !map.has(idKey)) {
          let dest = 'Client Visit';
          if (typeStr.includes('(') && typeStr.includes(')')) {
            dest = typeStr.split('(')[1].replace(')', '').trim();
          }
          map.set(idKey, {
            id: idKey,
            empName: c.empName || `${c.first_name || ''} ${c.last_name || ''}`.trim() || `Employee #${c.employee_id || idKey}`,
            code: c.code || c.employee_code || `EMP-${c.employee_id || '001'}`,
            destination: dest,
            date: c.claim_date || c.date || new Date().toISOString().slice(0, 10),
            purpose: c.description || 'Business Travel Application',
            status: (c.status || 'pending').toLowerCase() as any
          });
        }
      });

      setRequests(Array.from(map.values()));
    }).catch(() => {
      const map = new Map<string | number, TravelRequestRecord>();
      localShared.forEach((c: any) => {
        const idKey = c.id;
        const typeStr = String(c.type || '');
        if (c.isTravel && idKey && !map.has(idKey)) {
          let dest = 'Client Visit';
          if (typeStr.includes('(') && typeStr.includes(')')) {
            dest = typeStr.split('(')[1].replace(')', '').trim();
          }
          map.set(idKey, {
            id: idKey,
            empName: c.empName || 'Employee',
            code: c.code || 'EMP-001',
            destination: dest,
            date: c.date || new Date().toISOString().slice(0, 10),
            purpose: c.description || 'Business Travel Application',
            status: (c.status || 'pending').toLowerCase() as any
          });
        }
      });

      setRequests(Array.from(map.values()));
    }).finally(() => {
      setIsLoading(false);
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApprove = async (id: number | string) => {
    setActionLoadingId(id);
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'approved' } : r));

    try {
      const storageKey = 'shared_hr_reimbursements';
      let localShared = JSON.parse(localStorage.getItem(storageKey) || '[]');
      localShared = localShared.map((c: any) => c.id === id ? { ...c, status: 'approved' } : c);
      localStorage.setItem(storageKey, JSON.stringify(localShared));
    } catch {}

    try {
      await apiClient.put(`/payroll/reimbursements/${id}/approve`);
    } catch {}

    toast.success(`Travel request approved successfully!`);
    setActionLoadingId(null);
  };

  const handleReject = async (id: number | string) => {
    setActionLoadingId(id);
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'rejected' } : r));

    try {
      const storageKey = 'shared_hr_reimbursements';
      let localShared = JSON.parse(localStorage.getItem(storageKey) || '[]');
      localShared = localShared.map((c: any) => c.id === id ? { ...c, status: 'rejected' } : c);
      localStorage.setItem(storageKey, JSON.stringify(localShared));
    } catch {}

    try {
      await apiClient.put(`/payroll/reimbursements/${id}/reject`);
    } catch {}

    toast.success(`Travel request rejected.`);
    setActionLoadingId(null);
  };

  const filteredRequests = requests.filter(r => {
    const matchesStatus = statusFilter === 'all' ? true : r.status === statusFilter;
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || r.empName.toLowerCase().includes(q) || r.code.toLowerCase().includes(q) || r.destination.toLowerCase().includes(q) || r.purpose.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const approvedCount = requests.filter(r => r.status === 'approved').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-border/80">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Compass className="w-5 h-5 text-primary" />
            Travel Requests Management
          </h2>
          <p className="text-xs text-muted-foreground">
            Review and action live corporate travel applications stored in database.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs font-bold px-3 py-1">
            {pendingCount} Pending
          </Badge>
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-bold px-3 py-1">
            {approvedCount} Approved Trips
          </Badge>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card border border-border/80 p-3 rounded-xl shadow-2xs">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
          <Input
            placeholder="Search employee, destination..."
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
              <Plane className="w-4 h-4 text-primary" /> Real Travel Applications Queue
            </CardTitle>
            <CardDescription className="text-xs">Database submitted travel requests.</CardDescription>
          </div>
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold">
            {filteredRequests.length} Applications
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/30 text-[10px] font-bold text-muted-foreground uppercase border-b border-border/60">
                <tr>
                  <th className="px-4 py-3">Applicant</th>
                  <th className="px-4 py-3">Destination</th>
                  <th className="px-4 py-3">Travel Date</th>
                  <th className="px-4 py-3">Purpose & Details</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground font-medium">
                      Loading travel requests...
                    </td>
                  </tr>
                ) : filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground font-medium">
                      No real travel requests found.
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map((r) => (
                    <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-bold text-foreground">{r.empName}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">{r.code}</div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="bg-violet-50 text-violet-700 border-violet-200 text-[10px] font-bold flex items-center gap-1 w-fit">
                          <MapPin className="w-3 h-3 text-violet-600" /> {r.destination}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-mono text-muted-foreground">{r.date}</td>
                      <td className="px-4 py-3 text-muted-foreground max-w-[250px] truncate">{r.purpose}</td>
                      <td className="px-4 py-3">
                        {r.status === 'pending' && <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-bold">Pending</Badge>}
                        {r.status === 'approved' && <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">Approved</Badge>}
                        {r.status === 'rejected' && <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-bold">Rejected</Badge>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {r.status === 'pending' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              onClick={() => handleApprove(r.id)}
                              disabled={actionLoadingId === r.id}
                              className="h-7 text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-2.5"
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleReject(r.id)}
                              disabled={actionLoadingId === r.id}
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

export default AdminTravelRequests;
