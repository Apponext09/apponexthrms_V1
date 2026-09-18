import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Edit2, Trash2, Calendar, Building, CheckCircle2, Save, X, RotateCcw } from 'lucide-react';
import { showToast } from '@/components/ui/toast';
import { apiClient } from '@/config/api';
import { useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { useCompanyStore } from '@/features/settings/store/companyStore';

export interface PayrollCycleItem {
  id: string;
  name: string;
  cycle_name?: string;
  companyId?: string | number | null;
  company_id?: string | number | null;
  companyName?: string;
  company_name?: string;
  isDailyWages?: boolean;
  frequency: 'Monthly' | 'Bi-monthly' | 'Semi-Monthly' | 'Weekly' | 'Bi-Weekly';
  startDate: number | string;
  startDate2?: number | string;
  startDay?: string;
  cutoffDay: number | string;
  cutoffDayName?: string;
  totalDaysCalc?: string;
  disbursementDate: number | string;
  isActive: boolean;
}

interface CompanyItem {
  id: string | number;
  company_id?: string | number;
  name: string;
  company_code?: string;
  code?: string;
}

export const MasterPayrollCycle: React.FC = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId, selectedCompanyName } = useCompanyStore();
  const [cycles, setCycles] = useState<PayrollCycleItem[]>([]);
  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState<string>('all');
  const [selectedCycleId, setSelectedCycleId] = useState<string>('');

  const [cycleForm, setCycleForm] = useState<Partial<PayrollCycleItem>>({
    name: '',
    companyId: selectedCompanyId ? String(selectedCompanyId) : '',
    isDailyWages: false,
    frequency: 'Monthly',
    startDate: 1,
    cutoffDay: 25,
    disbursementDate: 28,
    totalDaysCalc: '30',
    isActive: true
  });

  // ── Dynamic cycle validation helpers ─────────────────────────────────────
  const isMonthlyLike = !['Weekly', 'Bi-Weekly'].includes(cycleForm.frequency || 'Monthly');
  const cutoffNum = Number(cycleForm.cutoffDay) || 0;
  const disbNum = Number(cycleForm.disbursementDate) || 28;
  const startNum = Number(cycleForm.startDate) || 1;
  // cutoff=0 means full-month (no early cutoff), so never conflict
  // disbursement < cutoff within same month is a conflict, but
  // small disbursement (1-7) with large cutoff (25+) means next-month payout — NOT a conflict
  const isNextMonthDisbursement = isMonthlyLike && cutoffNum > 0 && disbNum < cutoffNum && disbNum <= 7;
  const cycleConflict = isMonthlyLike && cutoffNum > 0 && disbNum <= cutoffNum && !isNextMonthDisbursement;
  const auditWindowDays = cycleConflict ? 0 : (isNextMonthDisbursement ? (31 - cutoffNum + disbNum) : (cutoffNum > 0 ? disbNum - cutoffNum : 0));

  // When cutoff changes, auto-adjust disbursement to cutoff + 3 (if current disbursement would be a real conflict)
  const handleCutoffChange = (val: string) => {
    const newCutoff = Number(val);
    const currentDisb = Number(cycleForm.disbursementDate) || 28;
    let newDisb = currentDisb;
    // Only auto-adjust if same-month disbursement is ≤ cutoff and it's NOT a valid next-month payout
    const wouldBeNextMonth = newCutoff > 0 && currentDisb < newCutoff && currentDisb <= 7;
    if (isMonthlyLike && newCutoff > 0 && currentDisb <= newCutoff && !wouldBeNextMonth) {
      newDisb = Math.min(31, newCutoff + 3);
    }
    setCycleForm({ ...cycleForm, cutoffDay: val as any, disbursementDate: newDisb });
  };

  // Pay period preview text
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const now = new Date();
  const previewMonth = monthNames[now.getMonth()];
  const previewYear = now.getFullYear();

  const fetchCompanies = async () => {
    try {
      const res = await apiClient.get('/settings/companies');
      const data = res.data?.data || res.data || [];
      if (Array.isArray(data)) {
        const mapped = data.map((c: any) => {
          const rawId = c.company_id ?? c.companyId ?? c.id;
          const cid = rawId !== undefined && rawId !== null ? String(rawId) : '';
          const numId = rawId !== undefined && rawId !== null ? Number(rawId) : 0;
          return {
            ...c,
            id: cid,
            company_id: numId,
            companyId: numId,
            code: c.code || c.company_code || '',
            name: c.name || c.company_name || 'Company'
          };
        }).filter((c: any) => c.company_id > 0);
        setCompanies(mapped);
      }
    } catch (err) {
      console.warn('Could not fetch companies:', err);
    }
  };

  const fetchCycles = async (companyFilter = selectedCompanyFilter) => {
    try {
      const params: any = {};
      const activeComp = companyFilter !== 'all'
        ? companyFilter
        : (selectedCompanyId ? String(selectedCompanyId) : undefined);

      if (activeComp && activeComp !== 'all') {
        params.companyId = String(activeComp);
      }

      const res = await apiClient.get('/payroll/cycles', { params });
      const data = res.data?.data || res.data?.cycles || res.data || (Array.isArray(res) ? res : []);
      if (Array.isArray(data)) {
        const dbMapped: PayrollCycleItem[] = data.map((c: any) => {
          const cycleName = c.cycleName || c.cycle_name || c.name || (c.frequency ? `${c.frequency}` : 'Monthly');
          const rawCompanyId = c.companyId ?? c.company_id ?? null;
          const compName = c.companyName || c.company_name || (rawCompanyId ? `Company #${rawCompanyId}` : 'All Companies');

          return {
            id: String(c.id || c.uuid),
            name: cycleName,
            cycle_name: cycleName,
            companyId: rawCompanyId,
            company_id: rawCompanyId,
            companyName: compName,
            isDailyWages: Boolean(c.isDailyWages ?? c.is_daily_wages),
            frequency: c.frequency || 'Monthly',
            startDate: c.startDate ?? c.start_date ?? 1,
            startDate2: c.startDate2 ?? c.start_date_2 ?? 16,
            startDay: c.startDay || c.start_day || 'Monday',
            cutoffDay: c.cutoffDay ?? c.cutoff_day ?? 25,
            cutoffDayName: c.cutoffDayName || c.cutoff_day_name || 'Friday',
            disbursementDate: c.disbursementDate ?? c.disbursement_date_str ?? c.disbursement_date ?? 28,
            totalDaysCalc: c.totalDaysCalc || c.total_days_calc || '30',
            isActive: c.isActive ?? ((c.is_active ?? true) !== 0 && (c.is_active ?? true) !== false)
          };
        });

        const unique = dbMapped.filter((c, index, self) =>
          index === self.findIndex((t) => String(t.id) === String(c.id))
        );

        setCycles(unique);
        if (unique.length > 0) {
          if (!selectedCycleId || !unique.some(u => String(u.id) === String(selectedCycleId))) {
            setSelectedCycleId(unique[0].id);
            setCycleForm({ ...unique[0] });
          } else {
            const active = unique.find(t => String(t.id) === String(selectedCycleId));
            if (active) {
              setCycleForm({ ...active });
            }
          }
        } else {
          setSelectedCycleId('');
          setCycleForm({
            name: '',
            companyId: activeComp && activeComp !== 'all' ? activeComp : '',
            isDailyWages: false,
            frequency: 'Monthly',
            startDate: 1,
            cutoffDay: 25,
            disbursementDate: 28,
            totalDaysCalc: '30',
            isActive: true
          });
        }
      }
    } catch (err) {
      console.error('Error fetching cycles in MasterPayrollCycle:', err);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (selectedCompanyId) {
      setSelectedCompanyFilter(String(selectedCompanyId));
      fetchCycles(String(selectedCompanyId));
    } else {
      fetchCycles('all');
    }
  }, [selectedCompanyId]);

  const handleSelectCycle = (c: PayrollCycleItem) => {
    setSelectedCycleId(c.id);
    setCycleForm({
      ...c,
      companyId: c.companyId ? String(c.companyId) : ''
    });
  };

  const handleSaveCycle = async () => {
    if (!cycleForm.name?.trim()) {
      showToast.error('Validation Error', 'Payroll Cycle name is required.');
      return;
    }
    // Dynamic validation: disbursement must be after cutoff for monthly cycles
    if (isMonthlyLike && disbNum <= cutoffNum) {
      showToast.error(
        'Invalid Cycle Configuration',
        `Payroll Disbursement Date (${disbNum}) must be after the CutOff Day (${cutoffNum}). Please fix before saving.`
      );
      return;
    }

    const effectiveCompanyId = cycleForm.companyId
      ? Number(cycleForm.companyId)
      : (selectedCompanyId ? Number(selectedCompanyId) : (selectedCompanyFilter !== 'all' ? Number(selectedCompanyFilter) : null));

    const payload = {
      cycle_name: cycleForm.name.trim(),
      name: cycleForm.name.trim(),
      company_id: effectiveCompanyId,
      companyId: effectiveCompanyId,
      frequency: cycleForm.frequency || 'Monthly',
      cycle_type: (cycleForm.frequency || 'Monthly').toLowerCase(),
      is_daily_wages: Boolean(cycleForm.isDailyWages),
      start_date: Number(cycleForm.startDate) || 1,
      start_date_2: cycleForm.startDate2 ? Number(cycleForm.startDate2) : null,
      start_day: cycleForm.startDay || null,
      cutoff_day: Number(cycleForm.cutoffDay) || 0,
      cutoff_day_name: cycleForm.cutoffDayName || null,
      disbursement_date: Number(cycleForm.disbursementDate || 28),
      disbursementDate: Number(cycleForm.disbursementDate || 28),
      disbursement_date_str: String(cycleForm.disbursementDate || 28),
      total_days_calc: cycleForm.totalDaysCalc || '30',
      is_active: Boolean(cycleForm.isActive),
    };

    try {
      if (selectedCycleId) {
        // Optimistic UI update
        const updatedTarget = {
          ...cycleForm,
          ...payload,
          id: selectedCycleId,
          name: payload.cycle_name,
          companyName: payload.company_id ? (companies.find(c => String(c.id) === String(payload.company_id))?.name || 'Company') : 'All Companies'
        } as PayrollCycleItem;

        setCycles(prev => prev.map(c => String(c.id) === String(selectedCycleId) ? updatedTarget : c));
        setCycleForm(updatedTarget);

        await apiClient.put(`/payroll/cycles/${selectedCycleId}`, payload);
        showToast.success('Cycle Updated', `"${payload.cycle_name}" has been updated successfully.`);
      } else {
        const res = await apiClient.post('/payroll/cycles', payload);
        const newRecord = res.data?.data || res.data || {};
        const newId = String(newRecord.id || newRecord.uuid || Date.now());

        const createdItem: PayrollCycleItem = {
          ...cycleForm,
          ...payload,
          id: newId,
          name: payload.cycle_name,
          companyName: payload.company_id ? (companies.find(c => String(c.id) === String(payload.company_id))?.name || 'Company') : 'All Companies'
        } as PayrollCycleItem;

        setCycles(prev => [createdItem, ...prev]);
        setSelectedCycleId(newId);
        setCycleForm(createdItem);

        showToast.success('Cycle Created', `"${payload.cycle_name}" has been created successfully.`);
      }

      queryClient.invalidateQueries({ queryKey: ['payroll-cycles'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-settings'] });
      fetchCycles(selectedCompanyFilter);
    } catch (err: any) {
      console.error('Error saving cycle:', err);
      showToast.error('Save Failed', err.response?.data?.message || 'Could not save payroll cycle.');
    }
  };

  const handleDeleteCycle = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!id) return;
    if (!await window.appConfirm('Are you sure you want to delete this payroll cycle?')) return;

    setCycles(prev => {
      const next = prev.filter(c => c.id !== id);
      if (selectedCycleId === id) {
        if (next.length > 0) {
          setSelectedCycleId(next[0].id);
          setCycleForm({ ...next[0] });
        } else {
          setSelectedCycleId('');
          setCycleForm({
            name: '',
            companyId: selectedCompanyFilter !== 'all' ? selectedCompanyFilter : '',
            isDailyWages: false,
            frequency: 'Monthly',
            startDate: 1,
            cutoffDay: 25,
            disbursementDate: 28,
            totalDaysCalc: '30',
            isActive: true
          });
        }
      }
      return next;
    });

    try {
      await apiClient.delete(`/payroll/cycles/${id}`);
      showToast.success('Cycle Deleted', 'Payroll Cycle deleted successfully.');
      queryClient.invalidateQueries({ queryKey: ['payroll-cycles'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-settings'] });
    } catch (err) {
      console.error('Delete error:', err);
      showToast.success('Cycle Deleted', 'Payroll Cycle removed.');
    }
  };

  const handleAddNewCycle = () => {
    setSelectedCycleId('');
    setCycleForm({
      name: '',
      companyId: selectedCompanyId ? String(selectedCompanyId) : (selectedCompanyFilter !== 'all' ? selectedCompanyFilter : ''),
      isDailyWages: false,
      frequency: 'Monthly',
      startDate: 1,
      cutoffDay: 25,
      disbursementDate: 28,
      totalDaysCalc: '30',
      isActive: true
    });
  };

  // Filter cycles in list
  const filteredCycles = cycles.filter(c => {
    if (selectedCompanyFilter === 'all') return true;
    if (!c.companyId && !c.company_id) return true; // Global cycles show everywhere
    return String(c.companyId || c.company_id) === String(selectedCompanyFilter);
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      {/* Left Column: Master Payroll Cycles List */}
      <div className="lg:col-span-4 space-y-3">
        <Card className="border border-border bg-card shadow-xs">
          <CardHeader className="p-3.5 px-4 border-b border-border/80 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center text-primary">
                  <Calendar className="w-4 h-4" />
                </div>
                <CardTitle className="text-xs font-semibold text-foreground">Master Payroll Cycles</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAddNewCycle}
                  className="h-7 text-xs font-semibold text-primary border-primary/30 bg-primary/5 hover:bg-primary/10"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add New
                </Button>
                <span className="text-xs font-semibold px-2 py-0.5 bg-muted text-muted-foreground rounded-full">
                  {filteredCycles.length}
                </span>
              </div>
            </div>

            {/* Company Filter Selector */}
            {companies.length > 0 && (
              <div className="flex items-center gap-2 pt-1">
                <Building className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <select
                  value={selectedCompanyFilter}
                  onChange={(e) => {
                    const newFilter = e.target.value;
                    setSelectedCompanyFilter(newFilter);
                    fetchCycles(newFilter);
                  }}
                  className="w-full h-8 text-xs font-medium border border-input rounded-md px-2.5 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="all">🏢 All Companies (All Cycles)</option>
                  {companies.map(comp => {
                    const cid = String(comp.company_id || comp.id);
                    return (
                      <option key={cid} value={cid}>
                        {comp.name} {comp.company_code || comp.code ? `(${comp.company_code || comp.code})` : ''}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}
          </CardHeader>

          <CardContent className="p-2 space-y-1.5 max-h-[620px] overflow-y-auto">
            {filteredCycles.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                No payroll cycles found for the selected company filter.
                <button
                  onClick={handleAddNewCycle}
                  className="block mx-auto mt-2 font-semibold text-primary hover:underline"
                >
                  + Create First Cycle
                </button>
              </div>
            ) : (
              filteredCycles.map(cycle => {
                const isSelected = selectedCycleId === cycle.id;
                return (
                  <div
                    key={cycle.id}
                    onClick={() => handleSelectCycle(cycle)}
                    className={`p-3 rounded-lg border transition-all cursor-pointer ${isSelected
                        ? 'bg-primary/10 border-primary text-primary dark:bg-primary/20 dark:border-primary shadow-xs ring-1 ring-primary/30'
                        : 'bg-card hover:bg-muted/50 border-border text-foreground'
                      }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1.5 min-w-0">
                        <div className="font-semibold text-xs truncate">
                          <span>{cycle.name || cycle.cycle_name || 'Monthly'}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                          <span className={`px-2 py-0.5 rounded font-medium ${isSelected
                              ? 'bg-primary/20 text-primary border border-primary/30'
                              : 'bg-muted text-muted-foreground'
                            }`}>
                            {cycle.frequency || 'Monthly'}
                          </span>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-medium truncate max-w-[150px] ${isSelected
                              ? 'bg-primary/15 text-primary border border-primary/20'
                              : 'bg-muted/80 text-muted-foreground border border-border/60'
                            }`}>
                            <Building className="w-3 h-3 shrink-0" />
                            {cycle.companyName || 'All Companies'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectCycle(cycle);
                          }}
                          title="Edit Master Payroll"
                          className="p-1.5 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteCycle(cycle.id, e)}
                          title="Delete Master Payroll"
                          className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            <Button
              onClick={handleAddNewCycle}
              variant="outline"
              className="w-full mt-2 border-dashed border-primary/40 text-xs font-semibold text-primary flex items-center gap-1.5 justify-center h-9 hover:bg-primary/5"
            >
              <Plus className="w-3.5 h-3.5" /> Add New Master Payroll
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Right Column: Add / Edit Form */}
      <div className="lg:col-span-8">
        <Card className="border border-border bg-card shadow-xs">
          <CardHeader className="p-3.5 px-5 border-b border-border/80 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-semibold flex items-center gap-2">
              {selectedCycleId ? (
                <>
                  <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center text-primary">
                    <Edit2 className="w-3.5 h-3.5" />
                  </div>
                  <span>Edit Master Payroll ({cycleForm.name || 'Selected'})</span>
                </>
              ) : (
                <>
                  <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center text-primary">
                    <Plus className="w-3.5 h-3.5" />
                  </div>
                  <span>Add New Master Payroll</span>
                </>
              )}
            </CardTitle>
            {cycleForm.companyId && (
              <Badge variant="outline" className="text-xs font-medium border-primary/30 text-primary bg-primary/5 flex items-center gap-1.5 px-2.5 py-0.5">
                <Building className="w-3 h-3" />
                {companies.find(c => String(c.id) === String(cycleForm.companyId))?.name || 'Company Scoped'}
              </Badge>
            )}
          </CardHeader>

          <CardContent className="p-5 space-y-4">
            <div className="space-y-4">
              {/* Field 0: Company Scope */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                <label className="md:col-span-4 text-xs font-medium text-foreground flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-primary" />
                  Target Company
                </label>
                <div className="md:col-span-8">
                  <select
                    value={cycleForm.companyId ? String(cycleForm.companyId) : ''}
                    onChange={e => {
                      const val = e.target.value;
                      setCycleForm(prev => ({ ...prev, companyId: val }));
                    }}
                    className="w-full h-9 border border-input bg-background text-foreground rounded-md px-3 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">🏢 All Companies (Organization Default)</option>
                    {companies.map(comp => {
                      const cid = String(comp.company_id || comp.id);
                      return (
                        <option key={cid} value={cid}>
                          {comp.name} {comp.company_code || comp.code ? `(${comp.company_code || comp.code})` : ''}
                        </option>
                      );
                    })}
                  </select>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Assign this payroll cycle specifically to a company, or make it organization-wide.
                  </p>
                </div>
              </div>

              {/* Field 1: Payroll Cycle Name */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                <label className="md:col-span-4 text-xs font-medium text-foreground">
                  Payroll Cycle <span className="text-destructive">*</span>
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
                    placeholder="e.g. Monthly Pay Cycle, Weekly Plant Cycle"
                    className="h-9 text-xs font-medium border-input bg-background"
                  />
                </div>
              </div>

              {/* Field 2: Daily Wages */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                <label className="md:col-span-4 text-xs font-medium text-foreground">
                  Daily wages
                </label>
                <div className="md:col-span-8 flex items-center">
                  <input
                    type="checkbox"
                    checked={cycleForm.isDailyWages || false}
                    onChange={e => setCycleForm({ ...cycleForm, isDailyWages: e.target.checked })}
                    className="w-4 h-4 rounded border-input text-primary focus:ring-primary cursor-pointer accent-primary"
                  />
                </div>
              </div>

              {/* Field 3: Payslip Frequency */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                <label className="md:col-span-4 text-xs font-medium text-foreground">
                  Payslip Frequency <span className="text-destructive">*</span>
                </label>
                <div className="md:col-span-8">
                  <select
                    value={cycleForm.frequency || 'Monthly'}
                    onChange={e => {
                      const freq = e.target.value;
                      let totalDays = (cycleForm as any).totalDaysCalc || 'Select';
                      if (freq === 'Weekly') totalDays = '7';
                      else if (freq === 'Bi-Weekly') totalDays = '14';
                      else if (freq === 'Semi-Monthly') totalDays = '15';
                      else if (freq === 'Monthly') totalDays = '30';
                      setCycleForm({ ...cycleForm, frequency: freq as any, totalDaysCalc: totalDays } as any);
                    }}
                    className="w-full h-9 border border-input bg-background text-foreground rounded-md px-3 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary"
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
                    <label className="md:col-span-4 text-xs font-medium text-foreground">
                      Payroll Calculation Start Date 1 <span className="text-destructive">*</span>
                    </label>
                    <div className="md:col-span-8 flex items-center gap-2">
                      <Input
                        type="number"
                        min="1"
                        max="31"
                        value={cycleForm.startDate ?? ''}
                        onChange={e => setCycleForm({ ...cycleForm, startDate: parseInt(e.target.value) || 1 })}
                        placeholder="e.g. 1"
                        className="h-9 w-28 text-xs font-medium border-input bg-background"
                      />
                      <span className="text-xs text-muted-foreground">of 1st cycle in a month</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                    <label className="md:col-span-4 text-xs font-medium text-foreground">
                      Payroll Calculation Start Date 2 <span className="text-destructive">*</span>
                    </label>
                    <div className="md:col-span-8 flex items-center gap-2">
                      <Input
                        type="number"
                        min="1"
                        max="31"
                        value={(cycleForm as any).startDate2 ?? 0}
                        onChange={e => setCycleForm({ ...cycleForm, startDate2: parseInt(e.target.value) || 0 } as any)}
                        placeholder="e.g. 16"
                        className="h-9 w-28 text-xs font-medium border-input bg-background"
                      />
                      <span className="text-xs text-muted-foreground">of 2nd cycle in a month</span>
                    </div>
                  </div>
                </>
              ) : cycleForm.frequency === 'Weekly' || cycleForm.frequency === 'Bi-Weekly' ? (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                  <label className="md:col-span-4 text-xs font-medium text-foreground">
                    Week Start Day <span className="text-destructive">*</span>
                  </label>
                  <div className="md:col-span-8">
                    <select
                      value={(cycleForm as any).startDay || 'Monday'}
                      onChange={e => setCycleForm({ ...cycleForm, startDay: e.target.value } as any)}
                      className="w-full h-9 border border-input bg-background text-foreground rounded-md px-3 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary"
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
                  <label className="md:col-span-4 text-xs font-medium text-foreground">
                    Payroll Calculation Start Date <span className="text-destructive">*</span>
                  </label>
                  <div className="md:col-span-8 flex items-center gap-2">
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={cycleForm.startDate !== undefined && cycleForm.startDate !== null ? String(cycleForm.startDate) : ''}
                      onChange={e => setCycleForm({ ...cycleForm, startDate: e.target.value as any })}
                      className="h-9 w-28 text-xs font-medium border-input bg-background"
                      placeholder="1"
                    />
                    <span className="text-xs text-muted-foreground">of every month</span>
                  </div>
                </div>
              )}

              {/* Field 5: CutOff Days */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                <label className="md:col-span-4 text-xs font-medium text-foreground">
                  CutOff Days for Payroll Calculations <span className="text-destructive">*</span>
                </label>
                <div className="md:col-span-8">
                  {cycleForm.frequency === 'Weekly' || cycleForm.frequency === 'Bi-Weekly' ? (
                    <select
                      value={(cycleForm as any).cutoffDayName || 'Friday'}
                      onChange={e => setCycleForm({ ...cycleForm, cutoffDayName: e.target.value } as any)}
                      className="w-full h-9 border border-input bg-background text-foreground rounded-md px-3 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary"
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
                    <div className="flex items-center gap-2">
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={cycleForm.cutoffDay !== undefined && cycleForm.cutoffDay !== null ? String(cycleForm.cutoffDay) : ''}
                        onChange={e => handleCutoffChange(e.target.value)}
                        className={`h-9 w-28 text-xs font-medium border-input bg-background ${cycleConflict ? 'border-destructive ring-1 ring-destructive' : ''}`}
                        placeholder="25"
                      />
                      <span className="text-xs text-muted-foreground">of every month</span>
                    </div>
                  )}
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Attendance is frozen on this day. Keep <strong>2–5 days</strong> gap before Disbursement Date for audit time.
                  </p>
                </div>
              </div>



              {/* Field 7: Payroll Disbursement Date */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                <label className="md:col-span-4 text-xs font-medium text-foreground">
                  Payroll Disbursement Date <span className="text-destructive">*</span>
                </label>
                <div className="md:col-span-8 space-y-2">
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={cycleForm.disbursementDate !== undefined && cycleForm.disbursementDate !== null ? String(cycleForm.disbursementDate) : ''}
                      onChange={e => setCycleForm({ ...cycleForm, disbursementDate: e.target.value as any })}
                      className={`h-9 w-28 text-xs font-medium border-input bg-background ${cycleConflict ? 'border-destructive ring-1 ring-destructive' : 'border-green-500/60'
                        }`}
                      placeholder="28"
                    />
                    <span className="text-xs text-muted-foreground">of the month</span>
                    {!cycleConflict && isMonthlyLike && disbNum > 0 && cutoffNum > 0 && (
                      <span className="text-[10px] font-semibold text-green-600 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
                        ✓ {auditWindowDays} day{auditWindowDays !== 1 ? 's' : ''} audit window{isNextMonthDisbursement ? ' (next month payout)' : ''}
                      </span>
                    )}
                  </div>

                  {/* Conflict Warning */}
                  {cycleConflict && isMonthlyLike && (
                    <div className="flex items-start gap-2 rounded-md bg-destructive/8 border border-destructive/30 px-3 py-2">
                      <span className="text-destructive text-xs mt-0.5">⚠</span>
                      <p className="text-[11px] text-destructive font-medium">
                        Disbursement date ({disbNum}) must be <strong>after</strong> the Cutoff day ({cutoffNum}).
                        Salary cannot be paid before attendance is finalized.
                        {` Auto-suggested: ${Math.min(31, cutoffNum + 3)}`}
                        <br />
                        <span className="text-muted-foreground font-normal">Tip: Set disbursement to 1–7 for next-month payout (e.g. cutoff 25th → payout 1st of next month).</span>
                      </p>
                    </div>
                  )}

                  {/* Live Pay Period Preview Banner */}
                  {!cycleConflict && isMonthlyLike && startNum > 0 && cutoffNum > 0 && disbNum > 0 && (
                    <div className="flex items-center gap-2 rounded-md bg-primary/5 border border-primary/20 px-3 py-2">
                      <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
                      <div className="text-[11px] text-primary font-medium">
                        <span className="font-semibold">Pay Period Preview: </span>
                        <span>{startNum} {previewMonth} {previewYear}</span>
                        <span className="mx-1 opacity-60">→</span>
                        <span>{cutoffNum} {previewMonth} {previewYear}</span>
                        <span className="mx-2 opacity-40">|</span>
                        <span>Salary Credit: <strong>{disbNum} {previewMonth}</strong></span>
                        <span className="mx-2 opacity-40">|</span>
                        <span className="text-muted-foreground">Audit Window: <strong className="text-primary">{auditWindowDays} days</strong></span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Field 8: Total no. of days for Payroll calculation */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                <label className="md:col-span-4 text-xs font-medium text-foreground">
                  Total no. of days for Payroll calculation <span className="text-destructive">*</span>
                </label>
                <div className="md:col-span-8">
                  <select
                    value={(cycleForm as any).totalDaysCalc || 'Select'}
                    onChange={e => setCycleForm({ ...cycleForm, totalDaysCalc: e.target.value } as any)}
                    className="w-full h-9 border border-input bg-background text-foreground rounded-md px-3 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="Select">Select</option>
                    <option value="7">7 Days (Weekly)</option>
                    <option value="14">14 Days (Bi-Weekly)</option>
                    <option value="15">15 Days (Semi-Monthly)</option>
                    <option value="30">30 Days (Fixed Basis)</option>
                    <option value="Month-Days">Month-Days (Actual Calendar Days)</option>
                    <option value="WorkDays">WorkDays</option>
                    <option value="WorkDays-Holidays">WorkDays-Holidays</option>
                    <option value="WorkDays-Weekends">WorkDays-Weekends</option>
                    <option value="Payroll-Month-Days">Payroll-Month-Days</option>
                    <option value="Custom-Month-Days">Custom-Month-Days</option>
                  </select>
                </div>
              </div>



              {/* Field 10: Active Toggle */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                <label className="md:col-span-4 text-xs font-medium text-foreground">
                  Active
                </label>
                <div className="md:col-span-8">
                  <div className="inline-flex border border-input rounded-md overflow-hidden p-0.5 bg-muted">
                    <button
                      type="button"
                      onClick={() => setCycleForm({ ...cycleForm, isActive: true })}
                      className={`px-4 py-1 text-xs font-semibold rounded transition-all ${cycleForm.isActive ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => setCycleForm({ ...cycleForm, isActive: false })}
                      className={`px-4 py-1 text-xs font-semibold rounded transition-all ${!cycleForm.isActive ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                      No
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Form Action Buttons */}
            <div className="flex items-center gap-3 pt-4 border-t border-border">
              <Button
                type="button"
                onClick={handleSaveCycle}
                className="h-9 px-5 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground flex items-center gap-2 shadow-xs rounded-md"
              >
                <Save className="w-3.5 h-3.5" />
                {selectedCycleId ? 'Update Cycle' : 'Save Cycle'}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSelectedCycleId('');
                  setCycleForm({
                    name: '',
                    frequency: 'Monthly',
                    startDate: 1,
                    cutoffDay: 25,
                    disbursementDate: 28,
                    totalDaysCalc: '30',
                    isActive: true
                  });
                }}
                className="h-9 px-4 text-xs font-semibold flex items-center gap-1.5 rounded-md border-border hover:bg-muted text-foreground"
              >
                <X className="w-3.5 h-3.5 text-muted-foreground" />
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
