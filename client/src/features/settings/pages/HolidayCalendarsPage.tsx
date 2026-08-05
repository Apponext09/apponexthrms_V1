import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Trash2, Edit2, MapPin, Tag, Calendar as CalendarIcon, Check, Search, X } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { showToast } from '@/components/ui/toast';

export function HolidayCalendarsPage() {
  const [calendars, setCalendars] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [selectedCalendar, setSelectedCalendar] = useState<any | null>(null);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [searchGroup, setSearchGroup] = useState('');
  const [searchHoliday, setSearchHoliday] = useState('');

  // Group creation modal
  const [isCalModalOpen, setIsCalModalOpen] = useState(false);
  const [calForm, setCalForm] = useState({ name: '', year: new Date().getFullYear(), is_default: false, applicable_location_id: '' });

  // Holiday Form state (matches Hoshi HRMS form fields)
  const [holForm, setHolForm] = useState({
    id: null as number | null,
    holiday_name: '',
    is_half_day: false,
    is_date_range: false,
    holiday_date: '',
    holiday_end_date: '',
    is_optional: false,
    holiday_type: 'company',
    is_active: true,
    assigned_group_id: ''
  });

  useEffect(() => {
    fetchCalendars();
    fetchLocations();
  }, [selectedYear]);

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
      const res = await apiClient.get(`/settings/holiday-calendars?year=${selectedYear}`);
      if (res.data?.success) {
        const list = res.data.data || [];
        setCalendars(list);
        if (list.length > 0) {
          const currentValid = selectedCalendar ? list.find((c: any) => c.id === selectedCalendar.id) : null;
          const activeCal = currentValid || list[0];
          setSelectedCalendar(activeCal);
          setHolForm(prev => ({ ...prev, assigned_group_id: activeCal.id.toString() }));
          fetchHolidays(activeCal.id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchHolidays = async (calendarId: number) => {
    try {
      const res = await apiClient.get(`/settings/holiday-calendars/${calendarId}/holidays`);
      if (res.data?.success) {
        setHolidays(res.data.data || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectCalendar = (cal: any) => {
    setSelectedCalendar(cal);
    setHolForm(prev => ({ ...prev, assigned_group_id: cal.id.toString() }));
    fetchHolidays(cal.id);
  };

  const saveCalendar = async () => {
    if (!calForm.name) {
      showToast.error('Validation Error', 'Group name is required');
      return;
    }
    try {
      await apiClient.post('/settings/holiday-calendars', calForm);
      setIsCalModalOpen(false);
      setCalForm({ name: '', year: selectedYear, is_default: false, applicable_location_id: '' });
      showToast.success('Group Created', `Holiday Group "${calForm.name}" created successfully.`);
      fetchCalendars();
    } catch (err) {
      console.error(err);
      showToast.error('Save Failed', 'Could not create holiday group.');
    }
  };

  const deleteCalendar = async (id: number) => {
    if (!confirm('Are you sure you want to delete this holiday group?')) return;
    try {
      await apiClient.delete(`/settings/holiday-calendars/${id}`);
      if (selectedCalendar?.id === id) {
        setSelectedCalendar(null);
        setHolidays([]);
      }
      showToast.success('Group Deleted', 'Holiday group removed.');
      fetchCalendars();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveHoliday = async () => {
    if (!holForm.holiday_name) {
      showToast.error('Validation Error', 'Holiday Name is required');
      return;
    }
    if (!holForm.holiday_date) {
      showToast.error('Validation Error', 'Date is required');
      return;
    }

    const targetCalId = holForm.assigned_group_id ? parseInt(holForm.assigned_group_id) : selectedCalendar?.id;
    if (!targetCalId) {
      showToast.error('Validation Error', 'Select or create a Group first.');
      return;
    }

    const payload = {
      holiday_name: holForm.holiday_name,
      holiday_date: holForm.holiday_date,
      holiday_end_date: holForm.is_date_range ? holForm.holiday_end_date : null,
      holiday_type: holForm.is_optional ? 'restricted' : holForm.holiday_type,
      is_optional: holForm.is_optional,
      is_half_day: holForm.is_half_day,
      is_active: holForm.is_active
    };

    try {
      if (holForm.id) {
        await apiClient.put(`/settings/holidays/${holForm.id}`, payload);
        showToast.success('Holiday Updated', `Holiday "${holForm.holiday_name}" updated.`);
      } else {
        await apiClient.post(`/settings/holiday-calendars/${targetCalId}/holidays`, payload);
        showToast.success('Holiday Added', `Holiday "${holForm.holiday_name}" added.`);
      }

      resetHolidayForm();
      fetchHolidays(targetCalId);
    } catch (err) {
      console.error(err);
      showToast.error('Error', 'Failed to save holiday.');
    }
  };

  const resetHolidayForm = () => {
    setHolForm({
      id: null,
      holiday_name: '',
      is_half_day: false,
      is_date_range: false,
      holiday_date: '',
      holiday_end_date: '',
      is_optional: false,
      holiday_type: 'company',
      is_active: true,
      assigned_group_id: selectedCalendar?.id?.toString() || ''
    });
  };

  const handleEditHoliday = (h: any) => {
    const rawDate = h.holidayDate || h.holiday_date;
    const d = rawDate ? new Date(rawDate).toISOString().slice(0, 10) : '';
    const endD = (h.holidayEndDate || h.holiday_end_date) ? new Date(h.holidayEndDate || h.holiday_end_date).toISOString().slice(0, 10) : '';

    setHolForm({
      id: h.id,
      holiday_name: h.holidayName || h.holiday_name,
      is_half_day: Boolean(h.isHalfDay ?? h.is_half_day),
      is_date_range: Boolean(endD),
      holiday_date: d,
      holiday_end_date: endD,
      is_optional: Boolean(h.isOptional ?? h.is_optional),
      holiday_type: h.holidayType || h.holiday_type || 'company',
      is_active: Boolean(h.isActive ?? h.is_active ?? true),
      assigned_group_id: selectedCalendar?.id?.toString() || ''
    });
  };

  const deleteHoliday = async (id: number) => {
    if (!confirm('Delete this holiday?')) return;
    try {
      await apiClient.delete(`/settings/holidays/${id}`);
      showToast.success('Deleted', 'Holiday removed.');
      if (selectedCalendar) fetchHolidays(selectedCalendar.id);
    } catch (err) {
      console.error(err);
    }
  };

  const filteredGroups = calendars.filter(c => c.name.toLowerCase().includes(searchGroup.toLowerCase()));
  const filteredHolidays = holidays.filter(h => (h.holidayName || h.holiday_name || '').toLowerCase().includes(searchHoliday.toLowerCase()));

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* ─────────────────────────────────────────────────────────────────────────
            LEFT COLUMN: GROUP LIST (Hoshi Image Left Panel)
        ────────────────────────────────────────────────────────────────────────── */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm border-t-4 border-t-teal-500">
            <CardHeader className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-100">Group</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => setIsCalModalOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 px-3 py-1.5 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" /> +Add Group
                </Button>
                <span className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 text-xs font-extrabold px-2 py-0.5 rounded-md border">
                  {calendars.length}
                </span>
              </div>
            </CardHeader>

            {/* Filter Search */}
            <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2 bg-slate-50/50 dark:bg-slate-900/50">
              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Search term..."
                value={searchGroup}
                onChange={e => setSearchGroup(e.target.value)}
                className="w-full bg-transparent text-xs outline-none font-medium text-slate-700 dark:text-slate-300 placeholder:text-slate-400"
              />
            </div>

            <CardContent className="p-3 space-y-2 max-h-[600px] overflow-y-auto">
              {filteredGroups.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs font-medium">No holiday groups found.</div>
              ) : (
                filteredGroups.map(c => {
                  const isSelected = selectedCalendar?.id === c.id;
                  return (
                    <div
                      key={c.id}
                      onClick={() => handleSelectCalendar(c)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'bg-teal-600 text-white border-teal-700 shadow-md font-bold'
                          : 'bg-white dark:bg-slate-900 hover:bg-slate-50 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-sm font-semibold truncate">{c.name}</span>
                        {(c.isDefault || c.is_default) && (
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-extrabold border uppercase tracking-wider ${
                            isSelected ? 'bg-white/20 text-white border-white/30' : 'bg-emerald-100 text-emerald-700 border-emerald-300'
                          }`}>DEFAULT</span>
                        )}
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteCalendar(c.id); }}
                        className={`p-1 rounded transition-colors ${ isSelected ? 'hover:bg-white/20 text-white/80' : 'hover:bg-slate-100 text-slate-400 hover:text-rose-600' }`}
                        title="Delete Group"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* ─────────────────────────────────────────────────────────────────────────
            RIGHT COLUMN: ADD HOLIDAY INFORMATION FORM (Hoshi Image Right Panel)
        ────────────────────────────────────────────────────────────────────────── */}
        <div className="lg:col-span-8 space-y-5">
          {/* Top Controls: Select Year + Map To Shift Location */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 border-t-4 border-t-emerald-500 rounded-xl shadow-sm">
            <div className="flex items-center gap-3">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Select Year</label>
              <select
                value={selectedYear}
                onChange={e => setSelectedYear(Number(e.target.value))}
                className="border border-slate-300 dark:border-slate-700 bg-background text-xs font-bold rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-teal-500"
              >
                {[2024, 2025, 2026, 2027, 2028].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="text-xs font-bold border-slate-300 text-slate-700 flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 shadow-2xs"
            >
              <Tag className="w-3.5 h-3.5 text-slate-500" /> Map To Shift Location
            </Button>
          </div>

          {/* Form Card: + Add Holiday Information */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="p-4 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-slate-800 dark:text-slate-100">
                <span className="text-emerald-600 font-extrabold text-base">+</span> Add Holiday Information
              </CardTitle>
            </CardHeader>

            <CardContent className="p-5 space-y-4">
              {/* Holiday Name */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Holiday Name <span className="text-red-500">*</span></label>
                <Input
                  value={holForm.holiday_name}
                  onChange={e => setHolForm({ ...holForm, holiday_name: e.target.value })}
                  placeholder="e.g. New Year Day or Independence Day"
                  className="mt-1 text-sm font-semibold"
                />
              </div>

              {/* Checkbox Options Grid */}
              <div className="space-y-2 py-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={holForm.is_half_day}
                    onChange={e => setHolForm({ ...holForm, is_half_day: e.target.checked })}
                    className="rounded accent-teal-600 w-4 h-4 cursor-pointer"
                  />
                  <span>Add Half Day Holiday</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={holForm.is_date_range}
                    onChange={e => setHolForm({ ...holForm, is_date_range: e.target.checked })}
                    className="rounded accent-teal-600 w-4 h-4 cursor-pointer"
                  />
                  <span>Add Date Range</span>
                </label>
              </div>

              {/* Date Pickers */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Date <span className="text-red-500">*</span></label>
                  <Input
                    type="date"
                    value={holForm.holiday_date}
                    onChange={e => setHolForm({ ...holForm, holiday_date: e.target.value })}
                    className="mt-1 text-xs font-semibold"
                  />
                </div>

                {holForm.is_date_range && (
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">End Date</label>
                    <Input
                      type="date"
                      value={holForm.holiday_end_date}
                      onChange={e => setHolForm({ ...holForm, holiday_end_date: e.target.value })}
                      className="mt-1 text-xs font-semibold"
                    />
                  </div>
                )}
              </div>

              {/* Optional Holiday Checkbox */}
              <div className="py-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={holForm.is_optional}
                    onChange={e => setHolForm({ ...holForm, is_optional: e.target.checked })}
                    className="rounded accent-teal-600 w-4 h-4 cursor-pointer"
                  />
                  <span>Optional Holiday</span>
                </label>
              </div>

              {/* Add to Groups */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Add to Groups</label>
                <select
                  value={holForm.assigned_group_id || selectedCalendar?.id?.toString() || ''}
                  onChange={e => setHolForm({ ...holForm, assigned_group_id: e.target.value })}
                  className="w-full mt-1 border border-slate-200 dark:border-slate-800 bg-background rounded-lg p-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-teal-500"
                >
                  <option value="">Select Group</option>
                  {calendars.map(c => (
                    <option key={c.id} value={c.id.toString()}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Active Toggle (Yes / No pill buttons like Hoshi) */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">Active</label>
                <div className="flex gap-1 w-32 border border-slate-200 dark:border-slate-800 rounded-lg p-0.5 bg-slate-50 dark:bg-slate-900">
                  <button
                    type="button"
                    onClick={() => setHolForm({ ...holForm, is_active: true })}
                    className={`flex-1 py-1 rounded-md text-xs font-bold transition-all ${
                      holForm.is_active ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => setHolForm({ ...holForm, is_active: false })}
                    className={`flex-1 py-1 rounded-md text-xs font-bold transition-all ${
                      !holForm.is_active ? 'bg-rose-500 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    No
                  </button>
                </div>
              </div>

              {/* Action Buttons: Save + Cancel */}
              <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <Button
                  onClick={handleSaveHoliday}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-6 shadow-xs"
                >
                  {holForm.id ? 'Update Holiday' : '+ Add'}
                </Button>
                <Button
                  variant="outline"
                  onClick={resetHolidayForm}
                  className="text-xs font-bold border-rose-300 text-rose-600 hover:bg-rose-50"
                >
                  ✕ Cancel
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Table Card: Current Group Holidays */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400">
                Holidays in {selectedCalendar?.name || 'Selected Group'} ({holidays.length})
              </CardTitle>

              {/* Search Holidays */}
              <div className="flex items-center gap-2 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 bg-background text-xs">
                <Search className="w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search holiday..."
                  value={searchHoliday}
                  onChange={e => setSearchHoliday(e.target.value)}
                  className="bg-transparent outline-none text-xs font-medium placeholder:text-slate-400"
                />
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 dark:bg-slate-900/50">
                    <TableHead className="font-bold text-xs text-slate-600 dark:text-slate-400">Name</TableHead>
                    <TableHead className="font-bold text-xs text-slate-600 dark:text-slate-400">Date</TableHead>
                    <TableHead className="font-bold text-xs text-slate-600 dark:text-slate-400">Half Day</TableHead>
                    <TableHead className="font-bold text-xs text-slate-600 dark:text-slate-400">Optional</TableHead>
                    <TableHead className="font-bold text-xs text-slate-600 dark:text-slate-400">Active</TableHead>
                    <TableHead className="font-bold text-xs text-slate-600 dark:text-slate-400 text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filteredHolidays.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-slate-400 text-xs">
                        No holidays configured in this group yet. Use the form above to add one.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredHolidays.map(h => {
                      const rawDate = h.holidayDate || h.holiday_date;
                      const hDate = rawDate ? new Date(rawDate) : null;
                      const isHalf = Boolean(h.isHalfDay ?? h.is_half_day);
                      const isOpt = Boolean(h.isOptional ?? h.is_optional);
                      const isActive = Boolean(h.isActive ?? h.is_active ?? true);

                      return (
                        <TableRow key={h.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                          <TableCell className="px-4 py-2.5 font-semibold text-xs text-slate-800 dark:text-slate-200">
                            {h.holidayName || h.holiday_name}
                          </TableCell>

                          <TableCell className="px-4 py-2.5 text-xs font-mono text-slate-600 dark:text-slate-400">
                            {hDate ? hDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                          </TableCell>

                          <TableCell className="px-4 py-2.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${ isHalf ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500' }`}>
                              {isHalf ? 'Yes' : 'No'}
                            </span>
                          </TableCell>

                          <TableCell className="px-4 py-2.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${ isOpt ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-500' }`}>
                              {isOpt ? 'Yes' : 'No'}
                            </span>
                          </TableCell>

                          <TableCell className="px-4 py-2.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${ isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600' }`}>
                              {isActive ? 'Yes' : 'No'}
                            </span>
                          </TableCell>

                          <TableCell className="px-4 py-2.5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleEditHoliday(h)}
                                className="p-1 rounded hover:bg-indigo-100 text-indigo-600 transition-colors"
                                title="Edit"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => deleteHoliday(h.id)}
                                className="p-1 rounded hover:bg-rose-100 text-slate-400 hover:text-rose-600 transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Group Creation Dialog Modal */}
      <Dialog open={isCalModalOpen} onOpenChange={setIsCalModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-emerald-600" /> Create Holiday Group
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Group Name <span className="text-red-500">*</span></Label>
              <Input
                value={calForm.name}
                onChange={(e) => setCalForm({ ...calForm, name: e.target.value })}
                placeholder="e.g. Uncategorized or Mumbai Head Office"
                className="text-xs font-semibold"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Applicable Year</Label>
              <Input
                type="number"
                value={calForm.year}
                onChange={(e) => setCalForm({ ...calForm, year: parseInt(e.target.value) || selectedYear })}
                className="text-xs font-semibold"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Location</Label>
              <select
                value={calForm.applicable_location_id || ''}
                onChange={(e) => setCalForm({ ...calForm, applicable_location_id: e.target.value })}
                className="w-full border border-slate-200 dark:border-slate-800 bg-background rounded-lg p-2 text-xs font-semibold focus:outline-none"
              >
                <option value="">All Locations (Default)</option>
                {locations.map(l => (
                  <option key={l.id} value={l.id.toString()}>{l.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" size="sm" onClick={() => setIsCalModalOpen(false)} className="text-xs font-bold">Cancel</Button>
            <Button size="sm" onClick={saveCalendar} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs">Save Group</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
