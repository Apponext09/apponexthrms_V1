import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Plus, Trash2, Edit2, CheckCircle2, XCircle, Palmtree, MapPin } from 'lucide-react';
import { apiClient } from '@/lib/api';

export function HolidayCalendarsPage() {
  const [calendars, setCalendars] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [selectedCalendar, setSelectedCalendar] = useState<any | null>(null);
  const [holidays, setHolidays] = useState<any[]>([]);

  const [isCalModalOpen, setIsCalModalOpen] = useState(false);
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);

  // Forms
  const [calForm, setCalForm] = useState({ name: '', year: new Date().getFullYear(), is_default: false, applicable_location_id: '' });
  const [holForm, setHolForm] = useState({ id: null, holiday_name: '', holiday_date: '', holiday_type: 'national', is_optional: false });

  useEffect(() => {
    fetchCalendars();
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      const res = await apiClient.get('/settings/locations?pageSize=100');
      if (res.data?.success) setLocations(res.data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCalendars = async () => {
    try {
      const res = await apiClient.get(`/settings/holiday-calendars?year=${new Date().getFullYear()}`);
      if (res.data?.success) {
        setCalendars(res.data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchHolidays = async (calendarId: number) => {
    try {
      const res = await apiClient.get(`/settings/holiday-calendars/${calendarId}/holidays`);
      if (res.data?.success) {
        setHolidays(res.data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectCalendar = (cal: any) => {
    setSelectedCalendar(cal);
    fetchHolidays(cal.id);
  };

  const saveCalendar = async () => {
    try {
      await apiClient.post('/settings/holiday-calendars', calForm);
      setIsCalModalOpen(false);
      fetchCalendars();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteCalendar = async (id: number) => {
    if (!confirm('Are you sure you want to delete this calendar and all its holidays?')) return;
    try {
      await apiClient.delete(`/settings/holiday-calendars/${id}`);
      if (selectedCalendar?.id === id) setSelectedCalendar(null);
      fetchCalendars();
    } catch (err) {
      console.error(err);
    }
  };

  const saveHoliday = async () => {
    try {
      if (holForm.id) {
        await apiClient.put(`/settings/holidays/${holForm.id}`, holForm);
      } else {
        await apiClient.post(`/settings/holiday-calendars/${selectedCalendar.id}/holidays`, holForm);
      }
      setIsHolidayModalOpen(false);
      fetchHolidays(selectedCalendar.id);
    } catch (err) {
      console.error(err);
    }
  };

  const deleteHoliday = async (id: number) => {
    if (!confirm('Delete this holiday?')) return;
    try {
      await apiClient.delete(`/settings/holidays/${id}`);
      fetchHolidays(selectedCalendar.id);
    } catch (err) {
      console.error(err);
    }
  };

  const openHolidayModal = (h?: any) => {
    if (h) {
      const rawDate = h.holidayDate || h.holiday_date;
      const d = new Date(rawDate);
      const tzOffset = d.getTimezoneOffset() * 60000;
      const localISOTime = new Date(d.getTime() - tzOffset).toISOString().slice(0, 10);

      setHolForm({
        id: h.id,
        holiday_name: h.holidayName || h.holiday_name,
        holiday_date: localISOTime,
        holiday_type: h.holidayType || h.holiday_type,
        is_optional: h.isOptional ?? h.is_optional ?? false
      });
    } else {
      setHolForm({ id: null, holiday_name: '', holiday_date: '', holiday_type: 'national', is_optional: false });
    }
    setIsHolidayModalOpen(true);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Holiday Calendars</h1>
          <p className="text-gray-500 text-sm mt-1">Manage company and regional holidays across locations.</p>
        </div>
        <Button onClick={() => setIsCalModalOpen(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" /> Create Calendar
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-500" /> All Calendars ({calendars.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {calendars.length === 0 ? (
                <div className="p-6 text-center text-gray-500 text-sm">No calendars created.</div>
              ) : (
                <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                  {calendars.map(c => (
                    <li
                      key={c.id}
                      onClick={() => handleSelectCalendar(c)}
                      className={`p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${selectedCalendar?.id === c.id ? 'bg-blue-50/50 dark:bg-blue-900/20' : ''}`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                            {c.name}
                            {(c.isDefault || c.is_default) ? (
                              <span className="bg-green-100 text-green-700 text-[10px] px-1.5 py-0.5 rounded font-bold">DEFAULT</span>
                            ) : null}
                          </p>
                          <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {c.locationName || c.location_name || 'All Locations'}
                          </p>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); deleteCalendar(c.id); }} className="text-gray-400 hover:text-red-500">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2">
          {selectedCalendar ? (
            <Card>
              <CardHeader className="pb-3 border-b flex flex-row justify-between items-center">
                <div>
                  <CardTitle className="text-sm font-bold">{selectedCalendar.name} Holidays</CardTitle>
                  <p className="text-xs text-gray-500 mt-1">Configure the dates for this specific calendar.</p>
                </div>
                <Button size="sm" onClick={() => openHolidayModal()} className="bg-indigo-600 hover:bg-indigo-700">
                  <Plus className="w-4 h-4 mr-1" /> Add Holiday
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-bold text-xs uppercase px-4 py-3">Holiday Name</TableHead>
                      <TableHead className="font-bold text-xs uppercase px-4 py-3">Date</TableHead>
                      <TableHead className="font-bold text-xs uppercase px-4 py-3">Type</TableHead>
                      <TableHead className="font-bold text-xs uppercase px-4 py-3 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {holidays.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="h-32 text-center text-gray-500">
                          No holidays added yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      holidays.map(h => {
                        const rawDate = h.holidayDate || h.holiday_date;
                        const hDate = new Date(rawDate);
                        return (
                          <TableRow key={h.id}>
                            <TableCell className="px-4 py-3 text-sm font-medium">
                              {h.holidayName || h.holiday_name}
                              {(h.isOptional || h.is_optional) && <span className="ml-2 text-[10px] text-amber-600 font-semibold bg-amber-50 px-1.5 py-0.5 rounded">Optional</span>}
                            </TableCell>
                            <TableCell className="px-4 py-3 text-sm font-mono">{hDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</TableCell>
                            <TableCell className="px-4 py-3 text-xs">
                              <span className="capitalize bg-gray-100 text-gray-800 px-2 py-0.5 rounded-full font-medium">{h.holidayType || h.holiday_type}</span>
                            </TableCell>
                            <TableCell className="px-4 py-3 text-right">
                              <div className="flex justify-end gap-2">
                                <button onClick={() => openHolidayModal(h)} className="text-gray-400 hover:text-blue-600"><Edit2 className="w-4 h-4" /></button>
                                <button onClick={() => deleteHoliday(h.id)} className="text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-gray-400 bg-gray-50/50 dark:bg-gray-800/20 rounded-xl border border-dashed border-gray-200 dark:border-gray-800">
              <Palmtree className="w-12 h-12 mb-4 text-gray-300" />
              <p className="text-sm font-medium">Select a calendar from the list to manage its holidays.</p>
            </div>
          )}
        </div>
      </div>

      {/* Calendar Modal */}
      <Dialog open={isCalModalOpen} onOpenChange={setIsCalModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create Holiday Calendar</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Calendar Name (e.g. Mumbai Branch 2026)</Label>
              <Input
                value={calForm.name}
                onChange={(e) => setCalForm({ ...calForm, name: e.target.value })}
                placeholder="Name"
              />
            </div>
            <div className="space-y-2">
              <Label>Year</Label>
              <Input
                type="number"
                value={calForm.year}
                onChange={(e) => setCalForm({ ...calForm, year: parseInt(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>Applicable Location</Label>
              <Select
                value={calForm.applicable_location_id || 'all'}
                onValueChange={(val) => setCalForm({ ...calForm, applicable_location_id: val === 'all' ? '' : val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations (Default)</SelectItem>
                  {locations.map(l => (
                    <SelectItem key={l.id} value={l.id.toString()}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 mt-2 cursor-pointer" onClick={() => setCalForm({ ...calForm, is_default: !calForm.is_default })}>
              {calForm.is_default ? <CheckCircle2 className="w-5 h-5 text-blue-600" /> : <XCircle className="w-5 h-5 text-gray-400" />}
              <span className="text-sm font-medium text-gray-700">Set as default company calendar</span>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setIsCalModalOpen(false)}>Cancel</Button>
            <Button onClick={saveCalendar} disabled={!calForm.name}>Save Calendar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Holiday Modal */}
      <Dialog open={isHolidayModalOpen} onOpenChange={setIsHolidayModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{holForm.id ? 'Edit Holiday' : 'Add New Holiday'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Holiday Name</Label>
              <Input
                value={holForm.holiday_name}
                onChange={(e) => setHolForm({ ...holForm, holiday_name: e.target.value })}
                placeholder="e.g. Diwali"
              />
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={holForm.holiday_date}
                onChange={(e) => setHolForm({ ...holForm, holiday_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={holForm.holiday_type}
                onValueChange={(val) => setHolForm({ ...holForm, holiday_type: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="national">National Holiday</SelectItem>
                  <SelectItem value="regional">Regional Holiday</SelectItem>
                  <SelectItem value="company">Company Holiday</SelectItem>
                  <SelectItem value="restricted">Restricted / Optional</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 mt-2 cursor-pointer" onClick={() => setHolForm({ ...holForm, is_optional: !holForm.is_optional })}>
              {holForm.is_optional ? <CheckCircle2 className="w-5 h-5 text-amber-500" /> : <XCircle className="w-5 h-5 text-gray-400" />}
              <span className="text-sm font-medium text-gray-700">This is an Optional/Restricted holiday</span>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setIsHolidayModalOpen(false)}>Cancel</Button>
            <Button onClick={saveHoliday} className="bg-indigo-600 hover:bg-indigo-700" disabled={!holForm.holiday_name || !holForm.holiday_date}>Save Holiday</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
