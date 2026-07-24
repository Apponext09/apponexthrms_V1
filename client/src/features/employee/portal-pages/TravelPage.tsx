import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plane, Plus, MapPin, Compass } from 'lucide-react';
import { toast } from 'sonner';

export default function TravelPage() {
  const [requests, setRequests] = useState([
    { id: 1, date: '2026-08-20', dest: 'Mumbai', duration: '3 Days', purpose: 'Client HRMS Rollout support', status: 'Approved' },
  ]);

  const [form, setForm] = useState({
    destination: '',
    date: '',
    purpose: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.destination || !form.date || !form.purpose) {
      toast.error('All fields are required.');
      return;
    }

    setRequests([
      {
        id: requests.length + 1,
        date: form.date,
        dest: form.destination,
        duration: '2 Days',
        purpose: form.purpose,
        status: 'Pending',
      },
      ...requests,
    ]);

    toast.success('Travel request submitted for approval.');
    setForm({ destination: '', date: '', purpose: '' });
  };

  return (
    <div className="space-y-6">
      <div className="pb-3 border-b">
        <h2 className="text-lg font-bold text-foreground">Travel Requests</h2>
        <p className="text-xs text-muted-foreground">Apply for business trips, flights, accommodation and travel bookings.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Travel Request Form */}
        <div className="lg:col-span-1">
          <Card className="border rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Compass className="w-4.5 h-4.5 text-violet-500" /> Book Business Travel
              </CardTitle>
              <CardDescription>File booking requests for business travel.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="dest">Destination City</Label>
                  <Input
                    id="dest"
                    placeholder="E.g., Bangalore, Delhi"
                    value={form.destination}
                    onChange={(e) => setForm({ ...form, destination: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="date">Departure Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="purpose">Purpose of Travel</Label>
                  <textarea
                    id="purpose"
                    rows={3}
                    placeholder="Business purpose detail..."
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={form.purpose}
                    onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                  />
                </div>
                <Button type="submit" className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold gap-1">
                  <Plus className="w-4 h-4" /> Request Booking
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Request Logs */}
        <div className="lg:col-span-2">
          <Card className="border rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Plane className="w-4.5 h-4.5 text-violet-500" /> Travel Logs & Status
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-bold text-xs uppercase px-6 py-4">Departure</TableHead>
                    <TableHead className="font-bold text-xs uppercase px-6 py-4">Destination</TableHead>
                    <TableHead className="font-bold text-xs uppercase px-6 py-4">Purpose</TableHead>
                    <TableHead className="font-bold text-xs uppercase px-6 py-4">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="px-6 py-4 text-xs font-semibold">{r.date}</TableCell>
                      <TableCell className="px-6 py-4 text-xs font-semibold text-violet-600 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-violet-500" /> {r.dest} ({r.duration})
                      </TableCell>
                      <TableCell className="px-6 py-4 text-xs text-muted-foreground">{r.purpose}</TableCell>
                      <TableCell className="px-6 py-4 text-xs">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          r.status === 'Approved' 
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}>{r.status}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
