import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Edit2, Trash2, Calendar } from 'lucide-react';
import { showToast } from '@/components/ui/toast';
import { apiClient } from '@/config/api';
import { useQueryClient } from '@tanstack/react-query';

export interface PayrollCycleItem {
  id: string;
  name: string;
  cycle_name?: string;
  isDailyWages?: boolean;
  dailyWagesIncludePaidHolidays?: boolean;
  dailyWagesIncludeWeekOff?: boolean;
  frequency: 'Monthly' | 'Bi-monthly' | 'Semi-Monthly' | 'Weekly' | 'Bi-Weekly';
  startDate: number | string;
  startDate2?: number | string;
  startDay?: string;
  cutoffDay: number | string;
  cutoffDayName?: string;
  totalDaysCalc?: string;
  monthOffset: 'Choose' | 'First' | 'Last' | 'Current' | 'Previous' | 'Next';
  disbursementDate: number | string;
  capAmount?: number | string;
  toleranceEnabled?: boolean;
  toleranceMinutes?: number;
  isActive: boolean;
}

export const MasterPayrollCycle: React.FC = () => {
  const queryClient = useQueryClient();
  const [cycles, setCycles] = useState<PayrollCycleItem[]>([]);
  const [selectedCycleId, setSelectedCycleId] = useState<string>('');

  const [cycleForm, setCycleForm] = useState<Partial<PayrollCycleItem>>({
    name: '',
    isDailyWages: false,
    frequency: 'Monthly',
    startDate: 1,
    cutoffDay: 0,
    monthOffset: 'First',
    disbursementDate: 27,
    totalDaysCalc: 'Select',
    capAmount: 3,
    isActive: true
  });

  const fetchCycles = async () => {
    try {
      const res = await apiClient.get('/payroll/cycles');
      const rawData = res.data?.data || res.data?.cycles || res.data;
      const data = Array.isArray(rawData) ? rawData : (Array.isArray(res) ? res : []);
      if (Array.isArray(data)) {
        const dbMapped: PayrollCycleItem[] = data.map((c: any) => {
          const cycleName = c.cycleName || c.cycle_name || c.name || (c.frequency ? `${c.frequency}` : 'Monthly');
          return {
            id: String(c.id || c.uuid),
            name: cycleName,
            cycle_name: cycleName,
            isDailyWages: Boolean(c.isDailyWages ?? c.is_daily_wages),
            frequency: c.frequency || 'Monthly',
            startDate: c.startDate ?? c.start_date ?? 1,
            cutoffDay: c.cutoffDay ?? c.cutoff_day ?? 0,
            monthOffset: c.monthOffset || c.month_offset || 'First',
            disbursementDate: c.disbursementDate ?? c.disbursement_date ?? 27,
            capAmount: c.capAmount ?? c.cap_amount ?? 3,
            isActive: c.isActive ?? (c.status !== 'closed' && (c.is_active ?? true))
          };
        });

        const unique = dbMapped.filter((c, index, self) =>
          index === self.findIndex((t) => String(t.id) === String(c.id))
        );

        setCycles(unique);
        if (unique.length > 0) {
          if (!selectedCycleId) {
            setSelectedCycleId(unique[0].id);
            setCycleForm({ ...unique[0] });
          } else {
            const active = unique.find(t => String(t.id) === String(selectedCycleId));
            if (active) {
              setCycleForm({ ...active });
            }
          }
        }
      }
    } catch (err) {
      console.error('Error fetching cycles:', err);
    }
  };

  useEffect(() => {
    fetchCycles();
  }, []);

  const handleSelectCycle = (c: PayrollCycleItem) => {
    setSelectedCycleId(c.id);
    setCycleForm({ ...c });
  };

  const handleSaveCycle = async () => {
    if (!cycleForm.name) {
      showToast.error('Validation Error', 'Please enter a valid Payroll Cycle Name');
      return;
    }

    const payload = {
      cycle_name: cycleForm.name,
      name: cycleForm.name,
      is_daily_wages: cycleForm.isDailyWages,
      isDailyWages: cycleForm.isDailyWages,
      daily_wages_include_paid_holidays: cycleForm.dailyWagesIncludePaidHolidays,
      dailyWagesIncludePaidHolidays: cycleForm.dailyWagesIncludePaidHolidays,
      daily_wages_include_week_off: cycleForm.dailyWagesIncludeWeekOff,
      dailyWagesIncludeWeekOff: cycleForm.dailyWagesIncludeWeekOff,
      frequency: cycleForm.frequency,
      start_date: Number(cycleForm.startDate || 1),
      cutoff_day: Number(cycleForm.cutoffDay ?? 25),
      month_offset: cycleForm.monthOffset || 'Current',
      disbursement_date: Number(cycleForm.disbursementDate || 1),
      cap_amount: Number(cycleForm.capAmount || 1000000),
      tolerance_enabled: cycleForm.toleranceEnabled,
      tolerance_minutes: Number(cycleForm.toleranceMinutes || 15),
      is_active: cycleForm.isActive
    };

    const isEdit = Boolean(selectedCycleId && cycles.some(c => String(c.id) === String(selectedCycleId)));

    try {
      let savedId = selectedCycleId;
      if (isEdit) {
        const putRes = await apiClient.put(`/payroll/cycles/${selectedCycleId}`, payload);
        const serverData = putRes?.data?.data || putRes?.data;
        const updatedItem: PayrollCycleItem = {
          id: String(serverData?.id || selectedCycleId),
          name: serverData?.cycle_name || cycleForm.name || 'Monthly',
          cycle_name: serverData?.cycle_name || cycleForm.name || 'Monthly',
          isDailyWages: Boolean(serverData?.is_daily_wages ?? cycleForm.isDailyWages),
          frequency: serverData?.frequency || cycleForm.frequency || 'Monthly',
          startDate: serverData?.start_date ?? cycleForm.startDate ?? 1,
          cutoffDay: serverData?.cutoff_day ?? cycleForm.cutoffDay ?? 0,
          monthOffset: serverData?.month_offset || cycleForm.monthOffset || 'First',
          disbursementDate: serverData?.disbursement_date ?? cycleForm.disbursementDate ?? 27,
          capAmount: serverData?.cap_amount ?? cycleForm.capAmount ?? 3,
          isActive: serverData?.status !== 'closed' && (serverData?.is_active ?? cycleForm.isActive ?? true)
        };

        setCycles(prev => prev.map(c => String(c.id) === String(selectedCycleId) ? updatedItem : c));
        setCycleForm(updatedItem);
        showToast.success('Cycle Updated', `Master Payroll "${updatedItem.name}" updated successfully.`);
      } else {
        const postRes = await apiClient.post('/payroll/cycles', payload);
        const serverData = postRes?.data?.data || postRes?.data || {};
        savedId = String(serverData.id || serverData.uuid || '');

        const newItem: PayrollCycleItem = {
          id: savedId || String(Date.now()),
          name: serverData?.cycle_name || cycleForm.name || 'Monthly',
          cycle_name: serverData?.cycle_name || cycleForm.name || 'Monthly',
          isDailyWages: Boolean(serverData?.is_daily_wages ?? cycleForm.isDailyWages),
          frequency: serverData?.frequency || cycleForm.frequency || 'Monthly',
          startDate: serverData?.start_date ?? cycleForm.startDate ?? 1,
          cutoffDay: serverData?.cutoff_day ?? cycleForm.cutoffDay ?? 0,
          monthOffset: serverData?.month_offset || cycleForm.monthOffset || 'First',
          disbursementDate: serverData?.disbursement_date ?? cycleForm.disbursementDate ?? 27,
          capAmount: serverData?.cap_amount ?? cycleForm.capAmount ?? 3,
          isActive: serverData?.status !== 'closed' && (serverData?.is_active ?? cycleForm.isActive ?? true)
        };

        if (savedId) setSelectedCycleId(savedId);
        setCycles(prev => [newItem, ...prev]);
        setCycleForm(newItem);
        showToast.success('Cycle Saved', `Master Payroll "${newItem.name}" created successfully.`);
      }

      await fetchCycles();
      queryClient.invalidateQueries({ queryKey: ['payroll-cycles'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-settings'] });
    } catch (err) {
      console.error('Error saving cycle:', err);
      showToast.error('Save Error', 'Failed to save Master Payroll Cycle.');
    }
  };

  const handleDeleteCycle = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this Master Payroll Cycle?')) return;

    try {
      await apiClient.delete(`/payroll/cycles/${id}`);
      setCycles(prev => prev.filter(c => String(c.id) !== String(id)));
      if (selectedCycleId === id) {
        setSelectedCycleId('');
        setCycleForm({
          name: '',
          frequency: 'Monthly',
          startDate: 1,
          cutoffDay: 0,
          monthOffset: 'First',
          disbursementDate: 27,
          capAmount: 3,
          isActive: true
        });
      }
      showToast.success('Cycle Deleted', 'Master Payroll Cycle deleted successfully.');
      queryClient.invalidateQueries({ queryKey: ['payroll-cycles'] });
    } catch (err) {
      console.error('Delete error:', err);
      showToast.error('Delete Error', 'Failed to delete Master Payroll Cycle.');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* Left Column: Master Payroll Cycles List */}
      <div className="lg:col-span-4 space-y-3">
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="p-3 px-4 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-indigo-500" />
              <CardTitle className="text-xs font-bold">Master Payroll</CardTitle>
            </div>
            <span className="text-[11px] font-bold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-full">
              {cycles.length}
            </span>
          </CardHeader>

          <CardContent className="p-2 space-y-1.5">
            {cycles.map(cycle => (
              <div
                key={cycle.id}
                onClick={() => handleSelectCycle(cycle)}
                className={`p-3 rounded-md border transition-all cursor-pointer ${
                  selectedCycleId === cycle.id
                    ? 'bg-teal-700 text-white border-teal-700 shadow-xs'
                    : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-foreground'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-bold text-xs truncate max-w-[180px]">
                    <span className="capitalize">{cycle.name || cycle.cycle_name || 'Monthly'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectCycle(cycle);
                      }}
                      title="Edit Master Payroll"
                      className={`p-1 rounded transition-all ${
                        selectedCycleId === cycle.id ? 'hover:bg-white/20 text-white' : 'hover:bg-indigo-50 text-indigo-600 dark:text-indigo-400'
                      }`}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteCycle(cycle.id, e)}
                      title="Delete Master Payroll"
                      className={`p-1 rounded transition-all ${
                        selectedCycleId === cycle.id ? 'hover:bg-red-500/30 text-white' : 'hover:bg-red-50 text-red-500 hover:text-red-600'
                      }`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            <Button
              onClick={() => {
                setSelectedCycleId('');
                setCycleForm({
                  name: '',
                  isDailyWages: false,
                  frequency: 'Monthly',
                  startDate: 1,
                  cutoffDay: 0,
                  monthOffset: 'First',
                  disbursementDate: 27,
                  totalDaysCalc: 'Select',
                  capAmount: 3,
                  isActive: true
                });
              }}
              variant="outline"
              className="w-full mt-2 border-dashed border-indigo-400 text-xs font-bold text-indigo-600 flex items-center gap-1.5 justify-center h-9 hover:bg-indigo-50"
            >
              <Plus className="w-3.5 h-3.5" /> Add New Master Payroll
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Right Column: Add / Edit Form (Hoshi HRMS Layout) */}
      <div className="lg:col-span-8">
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="p-3 px-4 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-bold flex items-center gap-1.5">
              {selectedCycleId ? (
                <>
                  <Edit2 className="w-3.5 h-3.5 text-indigo-500" />
                  Edit Master Payroll ({cycleForm.name || 'Selected'})
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5 text-indigo-500" />
                  Add New Master Payroll
                </>
              )}
            </CardTitle>
          </CardHeader>

          <CardContent className="p-5 space-y-4">
            <div className="space-y-4">
              {/* Field 1: Payroll Cycle Name */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                <label className="md:col-span-4 text-xs font-bold text-slate-700 dark:text-slate-200">
                  Payroll Cycle <span className="text-red-500">*</span>
                </label>
                <div className="md:col-span-8">
                  <Input
                    value={cycleForm.name || ''}
                    onChange={e => {
                      const val = e.target.value;
                      setCycleForm(prev => ({ ...prev, name: val }));
                      if (selectedCycleId) {
                        setCycles(prev => prev.map(c => String(c.id) === String(selectedCycleId) ? { ...c, name: val, cycle_name: val } : c));
                      }
                    }}
                    placeholder="e.g. Monthly, Weekly"
                    className="h-9 text-xs font-medium border-slate-300 dark:border-slate-700"
                  />
                </div>
              </div>

              {/* Field 2: Daily Wages & Sub-options */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                <label className="md:col-span-4 text-xs font-bold text-slate-700 dark:text-slate-200">
                  Daily wages
                </label>
                <div className="md:col-span-8 flex items-center">
                  <input
                    type="checkbox"
                    checked={cycleForm.isDailyWages || false}
                    onChange={e => {
                      const isChecked = e.target.checked;
                      setCycleForm({
                        ...cycleForm,
                        isDailyWages: isChecked,
                        dailyWagesIncludePaidHolidays: isChecked ? cycleForm.dailyWagesIncludePaidHolidays : false,
                        dailyWagesIncludeWeekOff: isChecked ? cycleForm.dailyWagesIncludeWeekOff : false
                      });
                    }}
                    className="w-4 h-4 rounded border-slate-300 accent-indigo-600 cursor-pointer"
                  />
                </div>
              </div>

              {/* Sub-checkboxes appear ONLY when Daily wages is checked */}
              {cycleForm.isDailyWages && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center animate-fade-in">
                    <label className="md:col-span-4 text-xs font-bold text-slate-700 dark:text-slate-200">
                      Daily wages include paid holidays
                    </label>
                    <div className="md:col-span-8 flex items-center">
                      <input
                        type="checkbox"
                        checked={cycleForm.dailyWagesIncludePaidHolidays || false}
                        onChange={e => setCycleForm({ ...cycleForm, dailyWagesIncludePaidHolidays: e.target.checked })}
                        className="w-4 h-4 rounded border-slate-300 accent-indigo-600 cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center animate-fade-in">
                    <label className="md:col-span-4 text-xs font-bold text-slate-700 dark:text-slate-200">
                      Daily wages include week off
                    </label>
                    <div className="md:col-span-8 flex items-center">
                      <input
                        type="checkbox"
                        checked={cycleForm.dailyWagesIncludeWeekOff || false}
                        onChange={e => setCycleForm({ ...cycleForm, dailyWagesIncludeWeekOff: e.target.checked })}
                        className="w-4 h-4 rounded border-slate-300 accent-indigo-600 cursor-pointer"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Field 3: Payslip Frequency */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                <label className="md:col-span-4 text-xs font-bold text-slate-700 dark:text-slate-200">
                  Payslip Frequency <span className="text-red-500">*</span>
                </label>
                <div className="md:col-span-8">
                  <select
                    value={cycleForm.frequency || 'Monthly'}
                    onChange={e => setCycleForm({ ...cycleForm, frequency: e.target.value as any })}
                    className="w-full h-9 border border-slate-300 dark:border-slate-700 bg-background text-foreground rounded-md px-3 text-xs font-medium focus:outline-none"
                  >
                    <option value="Monthly">Monthly</option>
                    <option value="Bi-monthly">Bi-monthly</option>
                    <option value="Semi-Monthly">Semi-Monthly</option>
                    <option value="Weekly">Weekly</option>
                    <option value="Bi-Weekly">Bi-Weekly</option>
                  </select>
                </div>
              </div>

              {/* Field 4: Payroll Calculation Start Date 1 & 2 */}
              {cycleForm.frequency === 'Bi-monthly' || cycleForm.frequency === 'Semi-Monthly' ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                    <label className="md:col-span-4 text-xs font-bold text-slate-700 dark:text-slate-200">
                      Payroll Calculation Start Date 1 <span className="text-red-500">*</span>
                    </label>
                    <div className="md:col-span-8 flex items-center gap-2">
                      <Input
                        type="number"
                        min="1"
                        max="31"
                        value={cycleForm.startDate ?? ''}
                        onChange={e => setCycleForm({ ...cycleForm, startDate: parseInt(e.target.value) || 1 })}
                        placeholder="e.g. 1"
                        className="h-9 w-28 text-xs font-medium border-slate-300 dark:border-slate-700"
                      />
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-400">of 1st cycle in a month</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                    <label className="md:col-span-4 text-xs font-bold text-slate-700 dark:text-slate-200">
                      Payroll Calculation Start Date 2 <span className="text-red-500">*</span>
                    </label>
                    <div className="md:col-span-8 flex items-center gap-2">
                      <Input
                        type="number"
                        min="1"
                        max="31"
                        value={(cycleForm as any).startDate2 ?? 0}
                        onChange={e => setCycleForm({ ...cycleForm, startDate2: parseInt(e.target.value) || 0 } as any)}
                        placeholder="e.g. 16"
                        className="h-9 w-28 text-xs font-medium border-slate-300 dark:border-slate-700"
                      />
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-400">of 2nd cycle in a month</span>
                    </div>
                  </div>
                </>
              ) : cycleForm.frequency === 'Weekly' || cycleForm.frequency === 'Bi-Weekly' ? (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                  <label className="md:col-span-4 text-xs font-bold text-slate-700 dark:text-slate-200">
                    Week Start Day <span className="text-red-500">*</span>
                  </label>
                  <div className="md:col-span-8">
                    <select
                      value={(cycleForm as any).startDay || 'Monday'}
                      onChange={e => setCycleForm({ ...cycleForm, startDay: e.target.value } as any)}
                      className="w-full h-9 border border-slate-300 dark:border-slate-700 bg-background text-foreground rounded-md px-3 text-xs font-medium focus:outline-none"
                    >
                      <option value="Monday">Monday</option>
                      <option value="Tuesday">Tuesday</option>
                      <option value="Wednesday">Wednesday</option>
                      <option value="Thursday">Thursday</option>
                      <option value="Friday">Friday</option>
                      <option value="Saturday">Saturday</option>
                      <option value="Sunday">Sunday</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                  <label className="md:col-span-4 text-xs font-bold text-slate-700 dark:text-slate-200">
                    Payroll Calculation Start Date <span className="text-red-500">*</span>
                  </label>
                  <div className="md:col-span-8 flex items-center gap-2">
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={cycleForm.startDate !== undefined && cycleForm.startDate !== null ? String(cycleForm.startDate) : ''}
                      onChange={e => setCycleForm({ ...cycleForm, startDate: e.target.value as any })}
                      className="h-9 w-28 text-xs font-semibold border-slate-300 dark:border-slate-700 bg-background"
                      placeholder="1"
                    />
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400">of every month</span>
                  </div>
                </div>
              )}

              {/* Field 5: CutOff Days */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                <label className="md:col-span-4 text-xs font-bold text-slate-700 dark:text-slate-200">
                  CutOff Days for Payroll Calculations <span className="text-red-500">*</span>
                </label>
                <div className="md:col-span-8">
                  {cycleForm.frequency === 'Weekly' || cycleForm.frequency === 'Bi-Weekly' ? (
                    <select
                      value={(cycleForm as any).cutoffDayName || 'Friday'}
                      onChange={e => setCycleForm({ ...cycleForm, cutoffDayName: e.target.value } as any)}
                      className="w-full h-9 border border-slate-300 dark:border-slate-700 bg-background text-foreground rounded-md px-3 text-xs font-medium focus:outline-none"
                    >
                      <option value="Monday">Monday</option>
                      <option value="Tuesday">Tuesday</option>
                      <option value="Wednesday">Wednesday</option>
                      <option value="Thursday">Thursday</option>
                      <option value="Friday">Friday</option>
                      <option value="Saturday">Saturday</option>
                      <option value="Sunday">Sunday</option>
                    </select>
                  ) : (
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={cycleForm.cutoffDay !== undefined && cycleForm.cutoffDay !== null ? String(cycleForm.cutoffDay) : ''}
                      onChange={e => setCycleForm({ ...cycleForm, cutoffDay: e.target.value as any })}
                      className="h-9 w-28 text-xs font-semibold border-slate-300 dark:border-slate-700 bg-background"
                      placeholder="25"
                    />
                  )}
                </div>
              </div>

              {/* Field 6: Month */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                <label className="md:col-span-4 text-xs font-bold text-slate-700 dark:text-slate-200">
                  Month
                </label>
                <div className="md:col-span-8">
                  <select
                    value={cycleForm.monthOffset || 'Choose'}
                    onChange={e => setCycleForm({ ...cycleForm, monthOffset: e.target.value as any })}
                    className="w-48 h-9 border border-slate-300 dark:border-slate-700 bg-background text-foreground rounded-md px-3 text-xs font-medium focus:outline-none cursor-pointer"
                  >
                    <option value="Choose">Choose</option>
                    <option value="First">First</option>
                    <option value="Last">Last</option>
                    <option value="Current">Current Month</option>
                    <option value="Previous">Previous Month</option>
                    <option value="Next">Next Month</option>
                  </select>
                </div>
              </div>

              {/* Field: [+] Tolerance Accordion (Hoshi Match) */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                <div className="md:col-span-12">
                  <details className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 bg-slate-50/50 dark:bg-slate-900/50">
                    <summary className="font-bold text-xs text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                      [+] Tolerance
                    </summary>
                    <div className="pt-3 space-y-3 text-xs">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={cycleForm.toleranceEnabled || false}
                          onChange={e => setCycleForm({ ...cycleForm, toleranceEnabled: e.target.checked })}
                          className="w-4 h-4 rounded border-slate-300 accent-indigo-600 cursor-pointer"
                        />
                        <span className="font-semibold text-slate-700 dark:text-slate-300">Enable Attendance Tolerance Minutes</span>
                      </div>
                      {cycleForm.toleranceEnabled && (
                        <div className="flex items-center gap-2">
                          <label className="font-bold text-slate-600 dark:text-slate-400">Tolerance (Minutes):</label>
                          <Input
                            type="number"
                            value={cycleForm.toleranceMinutes || 15}
                            onChange={e => setCycleForm({ ...cycleForm, toleranceMinutes: parseInt(e.target.value) || 0 })}
                            className="h-8 w-28 text-xs font-bold"
                          />
                        </div>
                      )}
                    </div>
                  </details>
                </div>
              </div>

              {/* Field 7: Payroll Disbursement Date */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                <label className="md:col-span-4 text-xs font-bold text-slate-700 dark:text-slate-200">
                  Payroll Disbursement Date <span className="text-red-500">*</span>
                </label>
                <div className="md:col-span-8">
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={cycleForm.disbursementDate !== undefined && cycleForm.disbursementDate !== null ? String(cycleForm.disbursementDate) : ''}
                    onChange={e => setCycleForm({ ...cycleForm, disbursementDate: e.target.value as any })}
                    className="h-9 w-28 text-xs font-semibold border-slate-300 dark:border-slate-700 bg-background"
                    placeholder="27"
                  />
                </div>
              </div>

              {/* Field 8: Total no. of days for Payroll calculation */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                <label className="md:col-span-4 text-xs font-bold text-slate-700 dark:text-slate-200">
                  Total no. of days for Payroll calculation <span className="text-red-500">*</span>
                </label>
                <div className="md:col-span-8">
                  <select
                    value={(cycleForm as any).totalDaysCalc || 'Select'}
                    onChange={e => setCycleForm({ ...cycleForm, totalDaysCalc: e.target.value } as any)}
                    className="w-full h-9 border border-slate-300 dark:border-slate-700 bg-background text-foreground rounded-md px-3 text-xs font-medium focus:outline-none"
                  >
                    <option value="Select">Select</option>
                    <option value="30">30</option>
                    <option value="Month-Days">Month-Days</option>
                    <option value="WorkDays">WorkDays</option>
                    <option value="WorkDays-Holidays">WorkDays-Holidays</option>
                    <option value="WorkDays-Weekends">WorkDays-Weekends</option>
                    <option value="Payroll-Month-Days">Payroll-Month-Days</option>
                    <option value="Custom-Month-Days">Custom-Month-Days</option>
                  </select>
                </div>
              </div>

              {/* Field 9: Payroll Calculation Cap */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                <label className="md:col-span-4 text-xs font-bold text-slate-700 dark:text-slate-200">
                  Payroll Calculation Cap
                </label>
                <div className="md:col-span-8">
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={cycleForm.capAmount !== undefined && cycleForm.capAmount !== null ? String(cycleForm.capAmount) : ''}
                    onChange={e => setCycleForm({ ...cycleForm, capAmount: e.target.value as any })}
                    className="h-9 w-44 text-xs font-semibold border-slate-300 dark:border-slate-700 bg-background"
                    placeholder="1000000.00"
                  />
                </div>
              </div>

              {/* Field 10: Active Toggle */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                <label className="md:col-span-4 text-xs font-bold text-slate-700 dark:text-slate-200">
                  Active
                </label>
                <div className="md:col-span-8">
                  <div className="inline-flex border border-slate-300 dark:border-slate-700 rounded-md overflow-hidden p-0.5 bg-slate-100 dark:bg-slate-900">
                    <button
                      type="button"
                      onClick={() => setCycleForm({ ...cycleForm, isActive: true })}
                      className={`px-4 py-1 text-xs font-bold transition-all ${
                        cycleForm.isActive ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-foreground'
                      }`}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => setCycleForm({ ...cycleForm, isActive: false })}
                      className={`px-4 py-1 text-xs font-bold transition-all ${
                        !cycleForm.isActive ? 'bg-slate-700 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-foreground'
                      }`}
                    >
                      No
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Form Action Buttons */}
            <div className="flex items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                onClick={handleSaveCycle}
                className="h-9 px-5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-sm rounded-md"
              >
                <Plus className="w-3.5 h-3.5 text-white" />
                {selectedCycleId ? '+ Update' : '+ Save Cycle'}
              </Button>

              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  setSelectedCycleId('');
                  setCycleForm({
                    name: '',
                    frequency: 'Monthly',
                    startDate: 1,
                    cutoffDay: 0,
                    monthOffset: 'First',
                    disbursementDate: 27,
                    capAmount: 3,
                    isActive: true
                  });
                }}
                className="h-9 px-4 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1 rounded-md"
              >
                ✕ Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
