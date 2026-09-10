import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plane, Plus, MapPin, Compass, CheckCircle2, Clock, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/features/auth/store/authStore';
import { apiClient } from '@/config/api';

interface TravelRequest {
  id: number;
  date: string;
  dest: string;
  duration: string;
  purpose: string;
  status: 'Approved' | 'Pending' | 'Rejected';
}

export default function TravelPage() {
  const { user } = useAuthStore();
  const [requests, setRequests] = useState<TravelRequest[]>([
    { id: 1, date: '2026-08-20', dest: 'Mumbai', duration: '3 Days', purpose: 'Client HRMS Rollout support', status: 'Approved' },
  ]);

  const [form, setForm] = useState({
    destination: '',
    date: '',
    purpose: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.destination || !form.date || !form.purpose) {
      toast.error('All fields are required.');
      return;
    }

    const newReq: TravelRequest = {
      id: Date.now(),
      date: form.date,
      dest: form.destination,
      duration: '2 Days',
      purpose: form.purpose,
      status: 'Pending',
    };

    setRequests([newReq, ...requests]);

    // Save travel request into MySQL DB reimbursement_claims table via API with claimType: 'travel'
    try {
      await apiClient.post('/payroll/reimbursements', {
        employeeId: (user as any)?.employeeId || user?.id || 1,
        claimType: 'travel',
        claimDate: form.date,
        amount: 0,
        description: `Travel to ${form.destination} - ${form.purpose}`
      });
    } catch {}

    // Save travel request into shared localStorage for real-time UI sync
    try {
      const storageKey = 'shared_hr_reimbursements';
      const existing = JSON.parse(localStorage.getItem(storageKey) || '[]');
      const adminRecord = {
        id: newReq.id,
        empName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Employee' : 'Employee',
        code: (user as any)?.employeeCode || (user as any)?.employee_code || `EMP-${user?.id || '001'}`,
        type: `Travel Request (${form.destination})`,
        amount: 0,
        date: form.date,
        description: `Travel to ${form.destination} - ${form.purpose}`,
        status: 'pending',
        isTravel: true
      };
      localStorage.setItem(storageKey, JSON.stringify([adminRecord, ...existing]));
    } catch {}

    toast.success('Travel request submitted and saved to DB for Admin approval.');
    setForm({ destination: '', date: '', purpose: '' });
  };

  const totalTrips = requests.length;
  const approvedTrips = requests.filter(r => r.status === 'Approved').length;
  const pendingTrips = requests.filter(r => r.status === 'Pending').length;

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card border border-border/80 rounded-xl p-4 sm:p-5 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-foreground tracking-tight flex items-center gap-2">
              <Plane className="w-5 h-5 text-primary" /> Travel Requests
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 font-bold">
              Business Travel
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Apply for official business trips, flight & hotel bookings, and travel allowances.
          </p>
        </div>
      </div>

      {/* Stats Summary Grid */}
      <div className="grid grid-cols-3 gap-3.5">
        <Card className="p-4 bg-card border border-border/80 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Requests</p>
              <p className="text-xl font-black text-foreground mt-0.5">{totalTrips}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <Plane className="w-4 h-4" />
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-card border border-border/80 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Approved Trips</p>
              <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{approvedTrips}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-card border border-border/80 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Pending Approval</p>
              <p className="text-xl font-black text-amber-600 dark:text-amber-400 mt-0.5">{pendingTrips}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Travel Request Form */}
        <div className="lg:col-span-1">
          <Card className="border border-border/80 rounded-xl shadow-2xs bg-card">
            <CardHeader className="pb-3 pt-4 px-4 border-b border-border/60">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                <Compass className="w-4 h-4 text-primary" /> Book Business Travel
              </CardTitle>
              <CardDescription className="text-xs">Submit booking details for business travel.</CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="dest" className="text-xs font-bold text-foreground">Destination City</Label>
                  <Input
                    id="dest"
                    placeholder="E.g., Bangalore, Delhi"
                    value={form.destination}
                    onChange={(e) => setForm({ ...form, destination: e.target.value })}
                    className="h-9 text-xs font-semibold rounded-lg border-border bg-muted/50 focus-visible:ring-primary"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="date" className="text-xs font-bold text-foreground">Departure Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="h-9 text-xs font-semibold rounded-lg border-border bg-muted/50 focus-visible:ring-primary"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="purpose" className="text-xs font-bold text-foreground">Purpose of Travel</Label>
                  <textarea
                    id="purpose"
                    rows={3}
                    required
                    placeholder="Business purpose details..."
                    className="flex w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none placeholder:text-muted-foreground/60"
                    value={form.purpose}
                    onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                  />
                </div>
                <Button type="submit" className="w-full h-9 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs rounded-lg gap-1.5 shadow-2xs">
                  <Plus className="w-3.5 h-3.5" /> Request Booking
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Travel Logs Table */}
        <div className="lg:col-span-2">
          <Card className="border border-border/80 rounded-xl shadow-2xs bg-card overflow-hidden">
            <CardHeader className="pb-3 pt-4 px-4 sm:px-5 border-b border-border/60 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                  <Plane className="w-4 h-4 text-primary" /> Travel Logs & Status
                </CardTitle>
                <CardDescription className="text-xs">{requests.length} travel booking records</CardDescription>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border font-bold">
                {approvedTrips} Approved
              </span>
            </CardHeader>
            <CardContent className="p-0">
              {requests.length === 0 ? (
                <div className="py-14 text-center text-muted-foreground flex flex-col items-center gap-2">
                  <Compass className="w-8 h-8 opacity-40" />
                  <p className="text-xs font-bold text-foreground">No travel requests submitted yet</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border/60">
                      <TableHead className="font-bold text-xs uppercase text-muted-foreground px-4 py-3">Departure</TableHead>
                      <TableHead className="font-bold text-xs uppercase text-muted-foreground px-4 py-3">Destination</TableHead>
                      <TableHead className="font-bold text-xs uppercase text-muted-foreground px-4 py-3">Purpose</TableHead>
                      <TableHead className="font-bold text-xs uppercase text-muted-foreground px-4 py-3">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map((r) => (
                      <TableRow key={r.id} className="hover:bg-muted/20 transition-colors border-b border-border/50">
                        <TableCell className="px-4 py-3 text-xs font-mono font-semibold text-foreground">{r.date}</TableCell>
                        <TableCell className="px-4 py-3 text-xs font-bold">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 text-[11px]">
                            <MapPin className="w-3 h-3 shrink-0" />
                            {r.dest} ({r.duration})
                          </span>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-xs text-muted-foreground font-medium max-w-[180px] truncate">{r.purpose}</TableCell>
                        <TableCell className="px-4 py-3 text-xs">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                            r.status === 'Approved' 
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20' 
                              : r.status === 'Rejected'
                              ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20'
                              : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
                          }`}>
                            {r.status}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
