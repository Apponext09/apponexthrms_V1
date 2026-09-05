import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/config/api';
import { showToast } from '@/components/ui/toast';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  FileText,
  Lock,
  Check,
  RotateCcw,
  Save,
  Sliders,
  IndianRupee,
  Building,
  CalendarDays,
  RefreshCw,
} from 'lucide-react';

export const STORAGE_KEY_REPORT_SETTINGS = 'payroll_report_column_settings';

export interface ComponentVisibilityConfig {
  [compId: string]: boolean;
}

export interface ReportSettingsState {
  showDesignation: boolean;
  showBankDetails: boolean;
  showCTC: boolean;
  showNotes: boolean;
  componentVisibility: ComponentVisibilityConfig;
}

export const DEFAULT_REPORT_SETTINGS: ReportSettingsState = {
  showDesignation: true,
  showBankDetails: true,
  showCTC: true,
  showNotes: true,
  componentVisibility: {},
};

export const loadReportSettings = (): ReportSettingsState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_REPORT_SETTINGS);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_REPORT_SETTINGS, ...parsed };
    }
  } catch {
    /* fallback to default */
  }
  return DEFAULT_REPORT_SETTINGS;
};

export const PayrollReportSettingsTab: React.FC = () => {
  const [settings, setSettings] = useState<ReportSettingsState>(loadReportSettings());
  const [isSaving, setIsSaving] = useState(false);

  // Fetch live active components from database catalog
  const { data: rawComps = [], isLoading } = useQuery({
    queryKey: ['payroll-components-report-settings'],
    queryFn: async () => {
      const res = await apiClient.get('/payroll/components');
      const list = res.data?.data || res.data?.components || res.data || [];
      return Array.isArray(list) ? list : [];
    },
  });

  // Filter strictly for active components in the catalog
  const activeComponents = rawComps.filter((c: any) => c.is_active !== 0 && c.isActive !== false && c.deleted_at == null);

  const earningsComponents = activeComponents.filter((c: any) => {
    const type = String(c.component_type || c.type || c.category || '').toUpperCase();
    const name = String(c.name || '').toLowerCase();
    const isDeduction = type.includes('DEDUCT') || type.includes('STATUTORY') || name.includes('pf') || name.includes('tax') || name.includes('esic') || name.includes('tds') || c.is_earning === false;
    return !isDeduction;
  });

  const deductionsComponents = activeComponents.filter((c: any) => {
    const type = String(c.component_type || c.type || c.category || '').toUpperCase();
    const name = String(c.name || '').toLowerCase();
    const isDeduction = type.includes('DEDUCT') || type.includes('STATUTORY') || name.includes('pf') || name.includes('tax') || name.includes('esic') || name.includes('tds') || c.is_earning === false;
    return isDeduction;
  });

  // Dynamically sync visibility state with present components only
  useEffect(() => {
    if (activeComponents.length > 0) {
      setSettings(prev => {
        const nextVisibility: ComponentVisibilityConfig = {};
        const validIds = new Set(activeComponents.map((c: any) => String(c.id)));
        
        // Preserve user settings for valid components, default to true for new ones
        for (const c of activeComponents) {
          const cid = String(c.id);
          const existing = prev.componentVisibility[cid];
          if (typeof existing === 'object' && existing !== null) {
            nextVisibility[cid] = true;
          } else if (existing !== undefined) {
            nextVisibility[cid] = existing !== false;
          } else {
            nextVisibility[cid] = true;
          }
        }

        return { ...prev, componentVisibility: nextVisibility };
      });
    }
  }, [activeComponents]);

  const toggleComponent = (compId: string | number) => {
    const cid = String(compId);
    setSettings(prev => {
      const currentVal = prev.componentVisibility[cid];
      const isVisible = typeof currentVal === 'object' ? true : currentVal !== false;
      return {
        ...prev,
        componentVisibility: {
          ...prev.componentVisibility,
          [cid]: !isVisible,
        },
      };
    });
  };

  const setAllComponents = (comps: any[], visible: boolean) => {
    setSettings(prev => {
      const nextVis = { ...prev.componentVisibility };
      for (const c of comps) {
        nextVis[String(c.id)] = visible;
      }
      return { ...prev, componentVisibility: nextVis };
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      localStorage.setItem(STORAGE_KEY_REPORT_SETTINGS, JSON.stringify(settings));
      await apiClient.post('/payroll/settings/report-columns', { settings }).catch(() => {});
      showToast.success('Settings Saved! 🎉', 'Report column visibility preferences updated.');
    } catch {
      showToast.error('Save Error', 'Failed to save report preferences.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    const defaultVis: ComponentVisibilityConfig = {};
    for (const c of activeComponents) {
      defaultVis[String(c.id)] = true;
    }
    const resetState = { ...DEFAULT_REPORT_SETTINGS, componentVisibility: defaultVis };
    setSettings(resetState);
    localStorage.setItem(STORAGE_KEY_REPORT_SETTINGS, JSON.stringify(resetState));
    showToast.info('Reset Complete 🔄', 'Restored all report columns to visible.');
  };

  const isComponentVisible = (cid: string | number): boolean => {
    const val = settings.componentVisibility[String(cid)];
    if (typeof val === 'object' && val !== null) return true;
    return val !== false;
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <Card className="border border-border/80 bg-card rounded-2xl shadow-xs overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-indigo-600 text-white shadow-md">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-foreground">Report Column Settings</h2>
                  <Badge variant="outline" className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-bold border-indigo-200">
                    Dynamic Catalog Mode
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Toggle which columns should be shown or hidden when viewing and downloading payroll reports.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="text-xs font-semibold gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Defaults
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
                className="text-xs font-bold gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shadow-sm"
              >
                {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save Settings
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mandatory vs General Preferences */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Mandatory Columns */}
        <Card className="border border-border/80 bg-card rounded-xl shadow-xs">
          <CardHeader className="p-4 pb-3 border-b border-border/60 bg-muted/20">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-bold text-foreground flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-500" />
                Mandatory Columns (Always Shown)
              </CardTitle>
              <Badge variant="secondary" className="text-[10px] uppercase font-bold">Locked</Badge>
            </div>
            <CardDescription className="text-[11px] text-muted-foreground">
              Essential identification, attendance, and summary totals required for all payroll reports.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { name: 'Employee Code', icon: FileText },
                { name: 'Employee Name', icon: FileText },
                { name: 'Department', icon: Building },
                { name: 'Salary Days', icon: CalendarDays },
                { name: 'Paid Days', icon: CalendarDays },
                { name: 'Unpaid Days (LOP)', icon: CalendarDays },
                { name: 'Gross Earned', icon: IndianRupee },
                { name: 'Total Deductions', icon: IndianRupee },
                { name: 'Net Salary Pay', icon: IndianRupee },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 rounded-lg border border-border/60 bg-muted/10 font-medium">
                  <span className="flex items-center gap-1.5 text-foreground">
                    <item.icon className="w-3.5 h-3.5 text-muted-foreground" />
                    {item.name}
                  </span>
                  <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 text-[9px] font-bold border-0">
                    Mandatory
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* General Column Toggles */}
        <Card className="border border-border/80 bg-card rounded-xl shadow-xs">
          <CardHeader className="p-4 pb-3 border-b border-border/60 bg-muted/20">
            <CardTitle className="text-xs font-bold text-foreground flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-500" />
              General Report Columns
            </CardTitle>
            <CardDescription className="text-[11px] text-muted-foreground">
              Toggle optional columns to include or exclude from reports.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {[
              {
                key: 'showDesignation',
                title: 'Designation / Job Title',
                desc: 'Includes employee designation in reports.'
              },
              {
                key: 'showBankDetails',
                title: 'Bank Account & IFSC Details',
                desc: 'Includes Bank Name, Account Number, and IFSC Code.'
              },
              {
                key: 'showCTC',
                title: 'Annual CTC Column',
                desc: 'Includes contractual annual CTC.'
              },
              {
                key: 'showNotes',
                title: 'Calculation Remarks / Notes',
                desc: 'Includes remarks for slab assignments or manual overrides.'
              },
            ].map((opt) => {
              const isChecked = (settings as any)[opt.key];
              return (
                <div
                  key={opt.key}
                  onClick={() => setSettings(prev => ({ ...prev, [opt.key]: !isChecked }))}
                  className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                    isChecked
                      ? 'border-indigo-300 dark:border-indigo-800 bg-indigo-50/40 dark:bg-indigo-950/20'
                      : 'border-border/60 bg-background hover:bg-muted/30'
                  }`}
                >
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-foreground">{opt.title}</p>
                    <p className="text-[10px] text-muted-foreground">{opt.desc}</p>
                  </div>
                  <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                    isChecked ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-input bg-background'
                  }`}>
                    {isChecked && <Check className="w-3.5 h-3.5" />}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Dynamic Earnings Component Column Toggles */}
      <Card className="border border-border/80 bg-card rounded-xl shadow-xs overflow-hidden">
        <CardHeader className="p-4 border-b border-border/60 bg-muted/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-xs font-bold text-foreground flex items-center gap-2">
              <IndianRupee className="w-4 h-4 text-emerald-500" />
              Earnings Component Columns ({earningsComponents.length})
            </CardTitle>
            <CardDescription className="text-[11px] text-muted-foreground">
              Toggle which active earnings component columns appear in reports.
            </CardDescription>
          </div>
          {earningsComponents.length > 0 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAllComponents(earningsComponents, true)}
                className="text-[11px] h-7 px-2.5"
              >
                Show All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAllComponents(earningsComponents, false)}
                className="text-[11px] h-7 px-2.5"
              >
                Hide All
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2 text-indigo-500" />
              Loading components from catalog...
            </div>
          ) : earningsComponents.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground">
              No active earning components present in your catalog.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/40 text-muted-foreground font-bold uppercase text-[10px] border-b border-border">
                  <tr>
                    <th className="py-2.5 px-4">Component Name</th>
                    <th className="py-2.5 px-4">Type</th>
                    <th className="py-2.5 px-4 text-right">Report Column Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {earningsComponents.map((comp: any) => {
                    const cid = String(comp.id);
                    const visible = isComponentVisible(cid);
                    return (
                      <tr key={cid} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3 px-4 font-bold text-foreground flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          {comp.name}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline" className="text-[10px] font-semibold">
                            {comp.component_type || comp.type || 'Earning'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => toggleComponent(cid)}
                            className={`px-3.5 py-1 rounded-md text-[11px] font-bold border transition-all cursor-pointer ${
                              visible
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300'
                                : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'
                            }`}
                          >
                            {visible ? '✓ Show in Report' : 'Hidden'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dynamic Deductions Component Column Toggles */}
      <Card className="border border-border/80 bg-card rounded-xl shadow-xs overflow-hidden">
        <CardHeader className="p-4 border-b border-border/60 bg-muted/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-xs font-bold text-foreground flex items-center gap-2">
              <IndianRupee className="w-4 h-4 text-rose-500" />
              Deductions Component Columns ({deductionsComponents.length})
            </CardTitle>
            <CardDescription className="text-[11px] text-muted-foreground">
              Toggle which active deduction component columns appear in reports.
            </CardDescription>
          </div>
          {deductionsComponents.length > 0 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAllComponents(deductionsComponents, true)}
                className="text-[11px] h-7 px-2.5"
              >
                Show All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAllComponents(deductionsComponents, false)}
                className="text-[11px] h-7 px-2.5"
              >
                Hide All
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2 text-indigo-500" />
              Loading components from catalog...
            </div>
          ) : deductionsComponents.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground">
              No active deduction components present in your catalog.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/40 text-muted-foreground font-bold uppercase text-[10px] border-b border-border">
                  <tr>
                    <th className="py-2.5 px-4">Component Name</th>
                    <th className="py-2.5 px-4">Type</th>
                    <th className="py-2.5 px-4 text-right">Report Column Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {deductionsComponents.map((comp: any) => {
                    const cid = String(comp.id);
                    const visible = isComponentVisible(cid);
                    return (
                      <tr key={cid} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3 px-4 font-bold text-foreground flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-rose-500" />
                          {comp.name}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline" className="text-[10px] font-semibold text-rose-600 border-rose-200">
                            {comp.component_type || comp.type || 'Deduction'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => toggleComponent(cid)}
                            className={`px-3.5 py-1 rounded-md text-[11px] font-bold border transition-all cursor-pointer ${
                              visible
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300'
                                : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'
                            }`}
                          >
                            {visible ? '✓ Show in Report' : 'Hidden'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
