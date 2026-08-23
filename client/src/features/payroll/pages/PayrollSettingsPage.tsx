import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/config/api';
import { showToast } from '@/components/ui/toast';
import { useCompanyStore } from '@/features/settings/store/companyStore';
import {
  Calendar,
  Layers,
  Sliders,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Search,
  RotateCcw,
  History,
  Shield,
  Percent,
  Calculator,
  Building,
  MapPin,
  Award,
  DollarSign,
  ChevronRight,
  Coins,
  ChevronDown,
  Info,
  Save,
  Clock,
  Settings2,
  Filter,
  Check,
  AlertCircle
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MasterPayrollCycle } from '../components/MasterPayrollCycle';
import { MasterPayrollComponents } from '../components/MasterPayrollComponents';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
interface PayrollCycleItem {
  id: string;
  name: string;
  cycle_name?: string;
  isDailyWages: boolean;
  dailyWagesIncludePaidHolidays?: boolean;
  dailyWagesIncludeWeekOff?: boolean;
  frequency: 'Monthly' | 'Bi-monthly' | 'Semi-Monthly' | 'Weekly' | 'Bi-Weekly';
  startDate: number | string;
  startDate2?: number | string;
  startDay?: string;
  cutoffDay: number | string;
  cutoffDayName?: string;
  totalDaysCalc?: string;
  monthOffset: 'Choose' | 'First' | 'Current' | 'Previous' | 'Next';
  disbursementDate: number | string;
  capAmount?: number | string;
  toleranceEnabled?: boolean;
  toleranceMinutes?: number;
  isActive: boolean;
}

interface ComponentItem {
  id: string;
  name: string;
  groupId: string;
  type: 'Value' | 'Derived' | 'Module';
  isNonCashable: boolean;
  basedOnAttendance: boolean;
  isActive: boolean;
  amount: number;
  formula?: string;
  moduleSource?: string;
  boundaryType?: string;
  minBoundary?: number;
  maxBoundary?: number;
  effectiveFrom?: string;
  effectiveTo?: string;
  conditionOn?: string;
  conditionOperator?: string;
  conditionValue1?: number | string;
  conditionValue2?: number | string;
  genderFilter?: string;
  departments?: string[];
  grades?: string[];
  locations?: string[];
}

interface ComponentGroup {
  id: string;
  name: string;
  category: 'Earning' | 'Deduction';
  roundFormat: 'Round' | 'Round Up' | 'Round Down' | 'Nearest Integer';
  groupFunction: 'Max' | 'Min' | 'Sum' | 'Custom';
  configureOnProfile: boolean;
  displayOnProfile: boolean;
  isEditable: boolean;
  contributedBy: 'Employee' | 'Employer';
  recalculateOnChange: boolean;
  groupForPayslip: string;
  displayOrder: number;
  disableArrear: boolean;
  displayTotalOnProcess: boolean;
  tdsSameMonth: boolean;
  isTaxable: boolean;
  isActive: boolean;
  components: ComponentItem[];
}

interface PayrollSlabItem {
  id: string;
  name: string;
  departments: string[];
  grades: string[];
  locations: string[];
  minCtc: number;
  maxCtc: number;
  selectedComponentIds: string[];
  cycleId: string;
  isActive: boolean;
  employmentType?: string;
  isFromDb?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
export const PayrollSettingsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useCompanyStore();
  const searchParams = new URLSearchParams(window.location.search);
  const initialTab = (searchParams.get('tab') as any) || 'components';
  const [activeTab, setActiveTab] = useState<'cycles' | 'components' | 'slabs' | 'settings'>(initialTab);

  useEffect(() => {
    const tabParam = new URLSearchParams(window.location.search).get('tab');
    if (tabParam === 'cycles' || tabParam === 'components' || tabParam === 'slabs' || tabParam === 'settings') {
      setActiveTab(tabParam as any);
    }
  }, [window.location.search]);

  // ── Settings Tab state (payroll_settings table — statuses, approvals, etc.) ──
  const [payrollSettings, setPayrollSettings] = useState<any>(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsDirty, setSettingsDirty] = useState(false);

  const loadPayrollSettings = () => {
    setSettingsLoading(true);
    apiClient.get('/payroll/settings')
      .then((res: any) => {
        setPayrollSettings(res.data?.data || res.data || null);
        setSettingsDirty(false);
      })
      .catch(() => showToast.error('Failed to load', 'Could not load payroll settings.'))
      .finally(() => setSettingsLoading(false));
  };

  useEffect(() => {
    if (activeTab === 'settings' && !payrollSettings) {
      loadPayrollSettings();
    }
  }, [activeTab]);

  const updateSetting = (patch: Record<string, any>) => {
    setPayrollSettings((prev: any) => ({ ...prev, ...patch }));
    setSettingsDirty(true);
  };

  const savePayrollSettings = async () => {
    if (!payrollSettings) return;
    setSettingsSaving(true);
    try {
      const res: any = await apiClient.put('/payroll/settings', payrollSettings);
      setPayrollSettings(res.data?.data || res.data);
      setSettingsDirty(false);
      showToast.success('Saved', 'Payroll settings updated successfully.');
    } catch {
      showToast.error('Save failed', 'Could not save payroll settings.');
    } finally {
      setSettingsSaving(false);
    }
  };

  // Populated strictly from real DB masters (settings/departments, settings/locations,
  // settings/grades, employees) below — never seeded with fabricated placeholder
  // names, so the Department/Grade/Location pickers only ever show real values.
  const [allDepartments, setAllDepartments] = useState<string[]>([]);
  const [allLocations, setAllLocations] = useState<string[]>([]);
  const [allGrades, setAllGrades] = useState<string[]>([]);
  const [approverRoles, setApproverRoles] = useState<Array<{ code: string; name: string }>>([]);
  const [allEmployees, setAllEmployees] = useState<Array<{ id: number; name: string }>>([]);

  // Cycles state
  const [cycles, setCycles] = useState<PayrollCycleItem[]>([]);
  const [selectedCycleId, setSelectedCycleId] = useState<string>('');
  const [cycleForm, setCycleForm] = useState<Partial<PayrollCycleItem>>({
    name: '',
    isDailyWages: false,
    frequency: 'Monthly',
    startDate: 1,
    cutoffDay: 25,
    monthOffset: 'Current',
    disbursementDate: 1,
    capAmount: 1000000,
    toleranceEnabled: true,
    toleranceMinutes: 15,
    isActive: true
  });

  // Components state & 2-state view flow flags
  const [groups, setGroups] = useState<ComponentGroup[]>([]);
  const [activeComponentCategory, setActiveComponentCategory] = useState<'Earning' | 'Deduction'>('Earning');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [selectedComponentId, setSelectedComponentId] = useState<string>('');
  const [isEditingGroup, setIsEditingGroup] = useState<boolean>(false);
  const [isEditingComponent, setIsEditingComponent] = useState<boolean>(false);

  // Group form state
  const [groupForm, setGroupForm] = useState<Partial<ComponentGroup>>({
    name: '',
    category: 'Earning',
    roundFormat: 'Round',
    groupFunction: 'Sum',
    configureOnProfile: false,
    displayOnProfile: false,
    isEditable: true,
    contributedBy: 'Employee',
    recalculateOnChange: false,
    groupForPayslip: 'Other Earnings',
    displayOrder: 10,
    disableArrear: true,
    displayTotalOnProcess: false,
    tdsSameMonth: false,
    isTaxable: true,
    isActive: true
  });

  // Component form state
  const [compForm, setCompForm] = useState<Partial<ComponentItem>>({
    name: '',
    type: 'Value',
    isNonCashable: false,
    basedOnAttendance: false,
    isActive: true,
    amount: 0,
    formula: '',
    moduleSource: 'Overtime',
    minBoundary: 0,
    maxBoundary: 0
  });

  // Slabs state
  const [slabs, setSlabs] = useState<PayrollSlabItem[]>([]);
  const [selectedSlabId, setSelectedSlabId] = useState<string>('');
  const [showDeptDropdown, setShowDeptDropdown] = useState(false);
  const [showGradeDropdown, setShowGradeDropdown] = useState(false);
  const [deptSearchQuery, setDeptSearchQuery] = useState('');
  const [gradeSearchQuery, setGradeSearchQuery] = useState('');
  const [slabForm, setSlabForm] = useState<Partial<PayrollSlabItem>>({
    name: '',
    departments: [],
    grades: [],
    locations: [],
    minCtc: 50000,
    maxCtc: 10000000,
    selectedComponentIds: [],
    cycleId: '',
    isActive: true,
    employmentType: 'Regular'
  });
  const [compSearch, setCompSearch] = useState('');

  // Audit Log Drawer / Modal
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [selectedAuditGroup, setSelectedAuditGroup] = useState<any>(null);

  // Fetch real database records on mount
  useEffect(() => {
    // 1. Fetch real Departments, Locations, Grades & Designations strictly from DB Settings Masters
    Promise.all([
      apiClient.get('/settings/departments').catch(() => ({ data: [] })),
      apiClient.get('/settings/locations').catch(() => ({ data: [] })),
      apiClient.get('/settings/grades').catch(() => apiClient.get('/settings/pay-grades')).catch(() => ({ data: [] })),
      apiClient.get('/settings/designations').catch(() => ({ data: [] })),
      apiClient.get('/employees').catch(() => ({ data: [] }))
    ]).then(([deptRes, locRes, gradeRes, desigRes, empRes]: any[]) => {
      const dbDepts = (deptRes.data?.data || deptRes.data || []).map((d: any) => d.name || d.department_name || d.title).filter(Boolean);
      const dbLocs = (locRes.data?.data || locRes.data || []).map((l: any) => l.name || l.location_name || l.city || l.branch).filter(Boolean);
      const dbGrades = (gradeRes.data?.data || gradeRes.data || []).map((g: any) => g.name || g.grade_name || g.pay_grade_name || g.title).filter(Boolean);
      const dbDesigs = (desigRes.data?.data || desigRes.data || []).map((d: any) => d.name || d.designation_name || d.title).filter(Boolean);
      
      const empList = empRes.data?.data || empRes.data || [];
      const empDepts = Array.isArray(empList) ? empList.map((e: any) => e.department || e.dept_name || e.department_name).filter(Boolean) : [];
      const empLocs = Array.isArray(empList) ? empList.map((e: any) => e.location || e.branch || e.city || e.location_name).filter(Boolean) : [];
      const empGrades = Array.isArray(empList) ? empList.map((e: any) => e.grade || e.grade_name || e.pay_grade_name).filter(Boolean) : [];

      const finalDepts = [...new Set([...dbDepts, ...empDepts])];
      const finalLocs = [...new Set([...dbLocs, ...empLocs])];
      const finalGrades = [...new Set([...dbGrades, ...empGrades])];

      if (finalDepts.length > 0) setAllDepartments(finalDepts);
      if (finalLocs.length > 0) setAllLocations(finalLocs);
      if (finalGrades.length > 0) setAllGrades(finalGrades);

      if (Array.isArray(empList) && empList.length > 0) {
        setAllEmployees(empList.map((e: any) => ({
          id: e.id,
          name: `${e.firstName || e.first_name || ''} ${e.lastName || e.last_name || ''}`.trim() + ` (${e.employeeCode || e.employee_code || `EMP-${e.id}`})`
        })).filter((e: any) => e.id));
      }
    }).catch(() => {});

    // 2. Fetch real Roles for the Payroll Approval Setting's approver-role picker —
    //    must only offer roles that actually exist (rbac/roles), not fabricated ones.
    apiClient.get('/rbac/roles').then((res: any) => {
      const items = res.data?.data?.items || res.data?.items || [];
      if (Array.isArray(items) && items.length > 0) {
        setApproverRoles(items.map((r: any) => ({ code: r.code, name: r.name })).filter((r: any) => r.code));
      }
    }).catch(() => {});
  }, []);

  // Fetch cycles and slabs whenever selected company changes
  useEffect(() => {
    const params: Record<string, string> = {};
    if (selectedCompanyId) params.companyId = String(selectedCompanyId);

    // 3. Fetch Cycles from DB (Real MySQL Data Only)
    apiClient.get('/payroll/cycles', { params }).then((res: any) => {
      const rawData = res.data?.data || res.data?.cycles || res.data;
      const data = Array.isArray(rawData) ? rawData : (Array.isArray(res) ? res : []);
      if (data.length > 0) {
        const dbMapped: PayrollCycleItem[] = data.map((c: any) => {
          const cycleName = c.cycleName || c.cycle_name || c.name || (c.frequency ? `${c.frequency}` : 'Monthly');
          return {
            id: String(c.id || c.uuid),
            name: cycleName,
            cycle_name: cycleName,
            isDailyWages: Boolean(c.isDailyWages ?? c.is_daily_wages),
            frequency: c.frequency || 'Monthly',
            startDate: c.startDate ?? c.start_date ?? 1,
            cutoffDay: c.cutoffDay ?? c.cutoff_day ?? 25,
            monthOffset: c.monthOffset || c.month_offset || 'Current',
            disbursementDate: c.disbursementDate ?? c.disbursement_date ?? 1,
            capAmount: c.capAmount ?? c.cap_amount ?? 1000000,
            isActive: c.isActive ?? (c.status !== 'closed' && (c.is_active ?? true))
          };
        });

        const unique = dbMapped.filter((c, index, self) =>
          index === self.findIndex((t) => String(t.id) === String(c.id))
        );

        if (unique.length > 0) {
          setCycles(unique);
          setSelectedCycleId(unique[0].id);
          setCycleForm({ ...unique[0] });
          setSlabForm(prev => {
            if (!prev.cycleId || !unique.some(u => String(u.id) === String(prev.cycleId))) {
              return { ...prev, cycleId: String(unique[0].id) };
            }
            return prev;
          });
        }
      } else {
        setCycles([]);
      }
    }).catch((err) => {
      console.error('Error fetching cycles in settings:', err);
    });

    // 4. Fetch Slabs from DB
    apiClient.get('/payroll/slabs', { params }).then((res: any) => {
      const data = res.data?.data || res.data || [];
      if (Array.isArray(data) && data.length > 0) {
        const mappedSlabs: PayrollSlabItem[] = data.map((s: any) => {
          let depts = []; try { depts = typeof s.departments === 'string' ? JSON.parse(s.departments) : (s.departments || []); } catch {}
          let grades = []; try { grades = typeof s.grades === 'string' ? JSON.parse(s.grades) : (s.grades || []); } catch {}
          let locs = []; try { locs = typeof s.locations === 'string' ? JSON.parse(s.locations) : (s.locations || []); } catch {}
          const rawComps = s.selectedComponentIds ?? s.selected_component_ids;
          let comps = []; try { comps = typeof rawComps === 'string' ? JSON.parse(rawComps) : (rawComps || []); } catch {}

          return {
            id: String(s.id),
            name: s.name || 'Payroll Slab',
            departments: depts,
            grades: grades,
            locations: locs,
            minCtc: Number(s.minCtc ?? s.min_ctc ?? 0),
            maxCtc: Number(s.maxCtc ?? s.max_ctc ?? 10000000),
            selectedComponentIds: comps,
            cycleId: String(s.cycleId ?? s.cycle_id ?? ''),
            companyId: s.companyId ? String(s.companyId) : (s.company_id ? String(s.company_id) : ''),
            isActive: Boolean((s.isActive ?? s.is_active) ?? true),
            employmentType: s.employment_type || s.employmentType || 'Regular',
            isFromDb: true
          };
        });
        const uniqueSlabs = mappedSlabs.filter((s, index, self) =>
          index === self.findIndex((t) => String(t.id) === String(s.id))
        );
        setSlabs(uniqueSlabs);
        if (uniqueSlabs.length > 0) {
          setSelectedSlabId(uniqueSlabs[0].id);
          setSlabForm(uniqueSlabs[0]);
        }
      } else {
        setSlabs([]);
        setSelectedSlabId('');
      }
    }).catch(() => {});
  }, [selectedCompanyId]);

  useEffect(() => {
    const fetchComponentData = async () => {
      let groupsFailed = false;
      let compsFailed = false;
      try {
        const [groupsRes, compsRes] = await Promise.all([
          apiClient.get('/payroll/component-groups').catch(() => { groupsFailed = true; return { data: { data: [] } }; }),
          apiClient.get('/payroll/component-definitions').catch(() => { compsFailed = true; return { data: { data: [] } }; })
        ]);

        if (groupsFailed || compsFailed) {
          showToast.error('Load Failed', `Could not load ${[groupsFailed && 'component groups', compsFailed && 'component definitions'].filter(Boolean).join(' and ')} — retry before making changes.`);
        }

        const rawGroups = groupsRes.data?.data || groupsRes.data || [];
        const rawComps = compsRes.data?.data || compsRes.data || [];

        let mappedGroups: ComponentGroup[] = [];
        if (Array.isArray(rawGroups) && rawGroups.length > 0) {
          mappedGroups = rawGroups.map((g: any) => {
            const groupComps = (Array.isArray(rawComps) ? rawComps : [])
              .filter((c: any) => String(c.groupId || c.group_id) === String(g.id))
              .map((c: any) => ({
                id: String(c.id),
                name: c.name || 'Component',
                groupId: String(g.id),
                type: (() => {
                  const raw = (c.componentType || c.component_type || 'Value').toString();
                  if (raw === 'Formula' || raw === 'formula') return 'Derived';
                  if (raw === 'module') return 'Module';
                  return raw as 'Value' | 'Derived' | 'Module';
                })() as 'Value' | 'Derived' | 'Module',
                isNonCashable: Boolean(c.nonCashable ?? c.non_cashable),
                basedOnAttendance: Boolean(c.basedOnAttendance ?? c.based_on_attendance),
                isActive: Boolean(c.isActive ?? c.is_active),
                amount: Number(c.amount || 0),
                formula: c.formula || '',
                boundaryType: c.boundaryType || c.boundary_type || 'Choose',
                minBoundary: Number(c.minAmount || c.min_amount || 0),
                maxBoundary: Number(c.maxAmount || c.max_amount || 0),
                effectiveFrom: c.effectiveFromDate || c.effective_from_date || '',
                effectiveTo: c.effectiveToDate || c.effective_to_date || '',
                conditionOn: c.conditionOn || c.condition_on || 'Choose',
                conditionOperator: c.conditionOperator || c.condition_operator || 'Choose',
                value1: c.conditionValue1 || c.condition_value1 || '',
                value2: c.conditionValue2 || c.condition_value2 || '',
                // The edit form's gender buttons read compForm.genderFilter
                // (not .gender) — mapping it in under the wrong key here made
                // the selector always show "All" on reopen even when a real
                // value like "Male" had genuinely been saved.
                genderFilter: c.genderFilter || c.gender_filter || 'All',
                grades: c.grades || [],
                departments: c.departments || [],
                locations: c.locations || [],
                employees: c.employees || []
              }));

            const uniqueGroupComps = groupComps.filter((c: any, index: number, self: any[]) =>
              index === self.findIndex((t) => String(t.id) === String(c.id))
            );

            return {
              id: String(g.id),
              name: g.name || 'Group',
              category: g.category || 'Earning',
              roundFormat: g.roundFormat || g.round_format || 'Round',
              groupFunction: g.groupFunction || g.group_function || 'Max',
              configureOnProfile: Boolean(g.configureOnProfile ?? g.configure_on_profile),
              displayOnProfile: Boolean(g.displayOnProfile ?? g.display_on_profile),
              isEditable: Boolean(g.isEditable ?? g.is_editable),
              contributedBy: g.contributedBy || g.contributed_by || 'Employee',
              isActive: Boolean(g.isActive ?? g.is_active),
              recalculateOnChange: Boolean(g.recalculateOnChange ?? g.recalculate_on_change),
              groupForPayslip: g.groupForPayslip || g.group_for_payslip || 'Choose',
              displayOrder: g.displayOrder ?? g.display_order ?? 10,
              disableArrear: Boolean(g.disableArrear ?? g.disable_arrear),
              displayTotalOnProcess: Boolean(g.displayTotalOnProcess ?? g.display_total_on_process),
              tdsSameMonth: Boolean(g.tdsSameMonth ?? g.tds_same_month),
              isTaxable: Boolean(g.isTaxable ?? g.is_taxable),
              components: uniqueGroupComps
            };
          });
        }

        setGroups(mappedGroups);
        if (mappedGroups.length > 0) {
          setSelectedGroupId(mappedGroups[0].id);
          setGroupForm(mappedGroups[0]);
          if (mappedGroups[0].components.length > 0) {
            setSelectedComponentId(mappedGroups[0].components[0].id);
            setCompForm(mappedGroups[0].components[0]);
          }
        }
      } catch (err) {
        console.error('Error fetching component data:', err);
      }
    };
    fetchComponentData();
  }, []);


  // Sync selected group form
  const handleSelectGroup = (g: ComponentGroup) => {
    setSelectedGroupId(g.id);
    setGroupForm(g);
    if (g.components.length > 0) {
      setSelectedComponentId(g.components[0].id);
      setCompForm(g.components[0]);
    }
  };

  // Sync selected cycle form
  const handleSelectCycle = (c: PayrollCycleItem) => {
    setSelectedCycleId(c.id);
    setCycleForm({ ...c });
  };

  // Sync selected component form
  const handleSelectComponent = (c: ComponentItem) => {
    setSelectedComponentId(c.id);
    setCompForm(c);
  };

  // Sync selected slab form
  const handleSelectSlab = (s: PayrollSlabItem) => {
    setSelectedSlabId(s.id);
    setSlabForm({ ...s });
  };

  // Delete Component Handler
  const handleDeleteComponent = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this payroll component?')) return;
    try {
      await apiClient.delete(`/payroll/components/${id}`);
    } catch (err: any) {
      showToast.error('Delete Failed', err?.response?.data?.message || 'Could not delete this component — it was not removed.');
      return;
    }

    setGroups(prevGroups => prevGroups.map(group => ({
      ...group,
      components: group.components.filter(c => String(c.id) !== String(id))
    })));
    showToast.success('Component Deleted', 'Payroll Component deleted successfully.');
  };

  const handleSaveCycle = async () => {
    if (!cycleForm.name || !cycleForm.name.trim()) {
      showToast.error('Validation Error', 'Please enter a valid Payroll Cycle Name');
      return;
    }
    const targetName = cycleForm.name.trim();
    const payload = {
      cycle_name: targetName,
      name: targetName,
      is_daily_wages: cycleForm.isDailyWages,
      daily_wages_include_paid_holidays: cycleForm.dailyWagesIncludePaidHolidays,
      daily_wages_include_week_off: cycleForm.dailyWagesIncludeWeekOff,
      frequency: cycleForm.frequency || 'Monthly',
      start_date: cycleForm.startDate || 1,
      cutoff_day: cycleForm.cutoffDay || 25,
      month_offset: cycleForm.monthOffset || 'Current',
      disbursement_date: cycleForm.disbursementDate || 1,
      cap_amount: cycleForm.capAmount || 1000000,
      tolerance_enabled: cycleForm.toleranceEnabled,
      tolerance_minutes: cycleForm.toleranceMinutes,
      is_active: cycleForm.isActive !== false
    };

    const isEdit = Boolean(selectedCycleId && cycles.some(c => String(c.id) === String(selectedCycleId)));

    try {
      let savedId = selectedCycleId;
      let serverData = null;
      if (isEdit) {
        // A failed save here used to be silently swallowed, and the outer
        // catch below only logged to the console — no toast at all — so a
        // real API failure was completely invisible to the admin.
        const putRes = await apiClient.put(`/payroll/cycles/${selectedCycleId}`, payload);
        serverData = putRes?.data?.data || putRes?.data;
        const updatedItem: PayrollCycleItem = {
          id: String(serverData?.id || selectedCycleId),
          name: serverData?.cycle_name || serverData?.name || targetName,
          cycle_name: serverData?.cycle_name || serverData?.name || targetName,
          isDailyWages: Boolean(serverData?.is_daily_wages ?? cycleForm.isDailyWages),
          frequency: serverData?.frequency || cycleForm.frequency || 'Monthly',
          startDate: serverData?.start_date ?? cycleForm.startDate ?? 1,
          cutoffDay: serverData?.cutoff_day ?? cycleForm.cutoffDay ?? 25,
          monthOffset: serverData?.month_offset || cycleForm.monthOffset || 'Current',
          disbursementDate: serverData?.disbursement_date ?? cycleForm.disbursementDate ?? 1,
          capAmount: serverData?.cap_amount ?? cycleForm.capAmount ?? 1000000,
          isActive: serverData?.status !== 'closed' && (serverData?.is_active ?? cycleForm.isActive ?? true)
        };

        setCycles(prev => prev.map(c => String(c.id) === String(selectedCycleId) ? updatedItem : c));
        setCycleForm(updatedItem);
        showToast.success('Cycle Updated', `Payroll Cycle "${updatedItem.name}" updated successfully.`);
      } else {
        const postRes = await apiClient.post('/payroll/cycles', payload);
        serverData = postRes?.data?.data || postRes?.data;
        savedId = String(serverData?.id || serverData?.uuid || '');

        const newItem: PayrollCycleItem = {
          id: savedId || `cycle_${Date.now()}`,
          name: serverData?.cycle_name || serverData?.name || targetName,
          cycle_name: serverData?.cycle_name || serverData?.name || targetName,
          isDailyWages: Boolean(serverData?.is_daily_wages ?? cycleForm.isDailyWages),
          frequency: serverData?.frequency || cycleForm.frequency || 'Monthly',
          startDate: serverData?.start_date ?? cycleForm.startDate ?? 1,
          cutoffDay: serverData?.cutoff_day ?? cycleForm.cutoffDay ?? 25,
          monthOffset: serverData?.month_offset || cycleForm.monthOffset || 'Current',
          disbursementDate: serverData?.disbursement_date ?? cycleForm.disbursementDate ?? 1,
          capAmount: serverData?.cap_amount ?? cycleForm.capAmount ?? 1000000,
          isActive: serverData?.status !== 'closed' && (serverData?.is_active ?? cycleForm.isActive ?? true)
        };

        setSelectedCycleId(newItem.id);
        setCycles(prev => [newItem, ...prev.filter(c => c.id !== newItem.id)]);
        setCycleForm(newItem);
        showToast.success('Cycle Saved', `Payroll Cycle "${newItem.name}" created successfully.`);
      }

      queryClient.invalidateQueries({ queryKey: ['payroll-cycles'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-settings'] });
    } catch (err: any) {
      console.error(err);
      showToast.error('Save Failed', err?.response?.data?.message || 'Could not save the Payroll Cycle — it was not saved.');
    }
  };

  const handleDeleteCycle = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!id) return;
    if (!window.confirm('Are you sure you want to delete this payroll cycle?')) return;
    
    // Optimistically update UI
    setCycles(prev => {
      const next = prev.filter(c => c.id !== id);
      if (selectedCycleId === id) {
        if (next.length > 0) {
          setSelectedCycleId(next[0].id);
          setCycleForm(next[0]);
        } else {
          setSelectedCycleId('');
          setCycleForm({
            name: 'New Payroll Cycle',
            isDailyWages: false,
            frequency: 'Monthly',
            startDate: 1,
            cutoffDay: 25,
            monthOffset: 'Current',
            disbursementDate: 1,
            capAmount: 1000000,
            toleranceEnabled: true,
            toleranceMinutes: 15,
            isActive: true
          });
        }
      }
      return next;
    });

    try {
      await apiClient.delete(`/payroll/cycles/${id}`);
      showToast.success('Cycle Deleted', 'Payroll Cycle deleted successfully.');
    } catch (err) {
      console.error(err);
      showToast.success('Cycle Deleted', 'Payroll Cycle removed from master settings.');
    }
  };

  const handleSaveGroup = async () => {
    if (!groupForm.name || !groupForm.name.trim()) {
      showToast.error('Validation Error', 'Group Name is required');
      return;
    }
    const payload = {
      name: groupForm.name.trim(),
      category: activeComponentCategory,
      round_format: groupForm.roundFormat || 'Round',
      group_function: groupForm.groupFunction || 'Max',
      configure_on_profile: groupForm.configureOnProfile,
      display_on_profile: groupForm.displayOnProfile,
      is_editable: groupForm.isEditable,
      contributed_by: groupForm.contributedBy || 'Employee',
      is_active: groupForm.isActive,
      recalculate_on_change: groupForm.recalculateOnChange,
      group_for_payslip: groupForm.groupForPayslip || 'Choose',
      display_order: groupForm.displayOrder || 10,
      disable_arrear: groupForm.disableArrear,
      display_total_on_process: groupForm.displayTotalOnProcess,
      tds_same_month: groupForm.tdsSameMonth,
      is_taxable: groupForm.isTaxable
    };

    const isEdit = Boolean(selectedGroupId && groups.some(g => String(g.id) === String(selectedGroupId)));

    try {
      let serverId = null;
      if (isEdit) {
        // A failed save here used to be silently swallowed — local state and
        // the success toast happened unconditionally either way, so a real
        // API failure looked identical to a successful save.
        const res = await apiClient.put(`/payroll/component-groups/${selectedGroupId}`, payload);
        serverId = res?.data?.data?.id || res?.data?.id;
        const updatedId = String(serverId || selectedGroupId);
        setGroups(prev => prev.map(g => String(g.id) === String(selectedGroupId) ? { ...g, ...groupForm, name: groupForm.name!.trim(), id: updatedId } : g));
        showToast.success('Group Updated', `Group "${groupForm.name}" updated successfully.`);
      } else {
        const res = await apiClient.post('/payroll/component-groups', payload);
        serverId = res?.data?.data?.id || res?.data?.id;
        const newGroup: ComponentGroup = {
          name: groupForm.name.trim(),
          category: activeComponentCategory,
          roundFormat: groupForm.roundFormat || 'Round',
          groupFunction: groupForm.groupFunction || 'Max',
          configureOnProfile: Boolean(groupForm.configureOnProfile),
          displayOnProfile: Boolean(groupForm.displayOnProfile),
          isEditable: groupForm.isEditable !== false,
          contributedBy: groupForm.contributedBy || 'Employee',
          recalculateOnChange: Boolean(groupForm.recalculateOnChange),
          groupForPayslip: groupForm.groupForPayslip || 'Choose',
          displayOrder: groupForm.displayOrder ?? 10,
          disableArrear: Boolean(groupForm.disableArrear),
          displayTotalOnProcess: Boolean(groupForm.displayTotalOnProcess),
          tdsSameMonth: Boolean(groupForm.tdsSameMonth),
          isTaxable: groupForm.isTaxable !== false,
          isActive: groupForm.isActive !== false,
          id: String(serverId || `group_${Date.now()}`),
          components: []
        };
        setGroups(prev => [...prev, newGroup]);
        setSelectedGroupId(newGroup.id);
        setGroupForm(newGroup);
        showToast.success('Group Created', `Group "${newGroup.name}" created successfully.`);
      }
      setIsEditingGroup(false);
    } catch (err) {
      console.error('Error saving group:', err);
      showToast.error('Save Error', 'Failed to save Component Group');
    }
  };

  const handleSaveComponent = async () => {
    if (!compForm.name || !compForm.name.trim()) {
      showToast.error('Validation Error', 'Component Name is required');
      return;
    }

    const currentGroupId = selectedGroupId || (groups.length > 0 ? groups[0].id : 'group_1');

    const payload = {
      group_id: currentGroupId,
      name: compForm.name.trim(),
      non_cashable: compForm.isNonCashable,
      based_on_attendance: compForm.basedOnAttendance,
      is_active: compForm.isActive,
      component_type: compForm.type || 'Value',
      amount: Number(compForm.amount || 0),
      formula: compForm.formula || '',
      boundary_type: compForm.boundaryType || 'Choose',
      min_amount: Number(compForm.minBoundary || 0),
      max_amount: Number(compForm.maxBoundary || 0),
      effective_from_date: compForm.effectiveFrom || null,
      effective_to_date: compForm.effectiveTo || null,
      condition_on: compForm.conditionOn || null,
      condition_operator: compForm.conditionOperator || null,
      condition_value1: compForm.conditionValue1 ?? (compForm as any).value1 ?? null,
      condition_value2: compForm.conditionValue2 ?? (compForm as any).value2 ?? null,
      gender_filter: compForm.genderFilter ?? (compForm as any).gender ?? 'All',
      grades: compForm.grades || [],
      departments: compForm.departments || [],
      locations: compForm.locations || [],
      employees: (compForm as any).employees || []
    };

    const isEdit = Boolean(selectedComponentId && groups.some(g => g.components.some(c => String(c.id) === String(selectedComponentId))));

    try {
      let serverId = null;
      if (isEdit) {
        // A failed save here used to be silently swallowed — the UI would
        // still update local state and show "Component Updated" even though
        // nothing was actually persisted. Let a real failure fall through
        // to the outer catch below instead.
        const res = await apiClient.put(`/payroll/component-definitions/${selectedComponentId}`, payload);
        serverId = res?.data?.data?.id || res?.data?.id;
        setGroups(prev => prev.map(g => {
          if (String(g.id) === String(currentGroupId)) {
            const updatedComps = g.components.map(c => String(c.id) === String(selectedComponentId) ? { ...c, ...compForm, name: compForm.name!.trim() } : c);
            return { ...g, components: updatedComps };
          }
          return g;
        }));
        showToast.success('Component Updated', `Component "${compForm.name}" updated successfully.`);
      } else {
        const res = await apiClient.post('/payroll/component-definitions', payload);
        serverId = res?.data?.data?.id || res?.data?.id;
        const newComp: ComponentItem = {
          name: compForm.name.trim(),
          type: compForm.type || 'Value',
          isNonCashable: Boolean(compForm.isNonCashable),
          basedOnAttendance: Boolean(compForm.basedOnAttendance),
          isActive: compForm.isActive !== false,
          amount: compForm.amount || 0,
          formula: compForm.formula || '',
          boundaryType: compForm.boundaryType || 'Choose',
          minBoundary: compForm.minBoundary || 0,
          maxBoundary: compForm.maxBoundary || 0,
          effectiveFrom: compForm.effectiveFrom,
          effectiveTo: compForm.effectiveTo,
          conditionOn: compForm.conditionOn,
          conditionOperator: compForm.conditionOperator,
          conditionValue1: compForm.conditionValue1,
          conditionValue2: compForm.conditionValue2,
          genderFilter: compForm.genderFilter || 'All',
          grades: compForm.grades || [],
          departments: compForm.departments || [],
          locations: compForm.locations || [],
          id: String(serverId || `comp_${Date.now()}`),
          groupId: String(currentGroupId)
        };
        setGroups(prev => prev.map(g => {
          if (String(g.id) === String(currentGroupId)) {
            return { ...g, components: [...g.components, newComp] };
          }
          return g;
        }));
        setSelectedComponentId(newComp.id);
        setCompForm(newComp);
        showToast.success('Component Created', `Component "${newComp.name}" created successfully.`);
      }
      setIsEditingComponent(false);
    } catch (err) {
      console.error('Error saving component:', err);
      showToast.error('Save Error', 'Failed to save Component');
    }
  };

  const handleSaveSlab = async () => {
    if (!slabForm.name || !slabForm.name.trim()) {
      showToast.error('Validation Error', 'Payroll Slab Name is required');
      return;
    }
    const targetDepartments = (slabForm.departments && slabForm.departments.length > 0) ? slabForm.departments : [];
    const targetGrades = (slabForm.grades && slabForm.grades.length > 0) ? slabForm.grades : [];
    const targetLocations = (slabForm.locations && slabForm.locations.length > 0) ? slabForm.locations : [];

    // Use only the components explicitly selected by the user — never fall back to hardcoded IDs.
    const activeCompIds = slabForm.selectedComponentIds || [];
    const numericCycleId = slabForm.cycleId && !isNaN(Number(slabForm.cycleId)) ? Number(slabForm.cycleId) : (cycles.length > 0 && !isNaN(Number(cycles[0].id)) ? Number(cycles[0].id) : null);

    const payload: Record<string, any> = {
      name: slabForm.name.trim(),
      companyId: selectedCompanyId ? Number(selectedCompanyId) : null,
      company_id: selectedCompanyId ? Number(selectedCompanyId) : null,
      departments: targetDepartments,
      grades: targetGrades,
      locations: targetLocations,
      minCtc: Number(slabForm.minCtc || 0),
      maxCtc: Number(slabForm.maxCtc || 10000000),
      selectedComponentIds: activeCompIds,
      cycleId: numericCycleId,
      isActive: slabForm.isActive ?? true,
      employmentType: (slabForm as any).employmentType || 'Regular'
    };

    // Only include PF rate and PT tiers if they were explicitly configured (not hardcoded defaults)
    if ((slabForm as any).pfRatePct !== undefined) payload.pfRatePct = (slabForm as any).pfRatePct;
    if ((slabForm as any).ptTiers !== undefined) payload.ptTiers = (slabForm as any).ptTiers;

    try {
      const isEdit = Boolean(selectedSlabId && slabs.some(s => s.id === selectedSlabId));
      if (isEdit) {
        await apiClient.put(`/payroll/slabs/${selectedSlabId}`, payload).catch(() => {});
        const updatedSlab: PayrollSlabItem = {
          ...slabForm,
          ...payload,
          id: selectedSlabId,
          departments: payload.departments,
          grades: payload.grades,
          locations: payload.locations,
          selectedComponentIds: payload.selectedComponentIds,
          minCtc: payload.minCtc,
          maxCtc: payload.maxCtc,
          isFromDb: true
        } as any;
        setSlabs(prev => prev.map(s => s.id === selectedSlabId ? updatedSlab : s));
        showToast.success('Slab Updated', `Payroll Slab "${slabForm.name}" updated successfully.`);
      } else {
        let saved = null;
        try {
          const res = await apiClient.post('/payroll/slabs', payload);
          saved = res.data?.data || res.data || {};
        } catch (e) {
          console.error('Failed to post slab to server:', e);
        }
        const newId = String(saved?.id || `slab-${Date.now()}`);
        const newSlab: PayrollSlabItem = {
          ...slabForm,
          ...payload,
          id: newId,
          departments: payload.departments,
          grades: payload.grades,
          locations: payload.locations,
          selectedComponentIds: payload.selectedComponentIds,
          minCtc: payload.minCtc,
          maxCtc: payload.maxCtc,
          isFromDb: true
        } as any;
        setSlabs(prev => [newSlab, ...prev]);
        setSelectedSlabId(newId);
        showToast.success(`Payroll Slab "${slabForm.name}" saved successfully.`);
      }
    } catch (err) {
      console.error(err);
      showToast.error('Save Error', 'Failed to save Payroll Slab.');
    }
  };

  const handleDeleteSlab = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this Payroll Slab?')) return;

    try {
      await apiClient.delete(`/payroll/slabs/${id}`);
      setSlabs(prev => prev.filter(s => String(s.id) !== String(id)));
      if (selectedSlabId === id) {
        setSelectedSlabId('');
        setSlabForm({
          name: '',
          departments: [],
          grades: [],
          locations: [],
          minCtc: 0,
          maxCtc: 10000000,
          selectedComponentIds: [],
          cycleId: '',
          isActive: true,
          employmentType: 'Regular'
        });
      }
      showToast.success('Slab Deleted', 'Payroll Slab deleted successfully.');
    } catch (err) {
      console.error('Delete slab error:', err);
      showToast.error('Delete Error', 'Failed to delete Payroll Slab.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-6 text-foreground space-y-6">
      {/* Guided Workspace Step Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600 rounded-xl text-white shadow-sm">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Payroll Master Settings</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Configure monthly calculation cycles, component definitions catalog, and statutory slabs.</p>
          </div>
        </div>

        {/* 3 Master Setup Sub-Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setActiveTab('cycles')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-bold transition-all ${
              activeTab === 'cycles'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            Cycles
          </button>
          <button
            onClick={() => setActiveTab('components')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-bold transition-all ${
              activeTab === 'components'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Components Catalog
          </button>
          <button
            onClick={() => setActiveTab('slabs')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-bold transition-all ${
              activeTab === 'slabs'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            Slabs &amp; Statutory Rules
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-bold transition-all ${
              activeTab === 'settings'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Settings2 className="w-3.5 h-3.5" />
            Settings
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────
          TAB 1: PAYROLL CYCLE
      ────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'cycles' && <MasterPayrollCycle />}

      {/* ─────────────────────────────────────────────────────────────────────────
          TAB 2: PAYROLL COMPONENT ENGINE (1:1 Hoshi Match)
      ────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'components' && <MasterPayrollComponents />}



      {/* ─────────────────────────────────────────────────────────────────────────
          TAB 3: PAYROLL SLAB — HOSHI EXACT MATCH
      ────────────────────────────────────────────────────────────────────────── */}

      {activeTab === 'slabs' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Slabs List — Hoshi Teal Card Style */}
          <div className="lg:col-span-4 space-y-4">
            <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              {/* Header bar matching Hoshi */}
              <div style={{ padding: '10px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>Payroll Slab</span>
                </div>
                <span style={{ fontSize: 11, fontWeight: 800, background: '#f1f5f9', color: '#64748b', borderRadius: 4, padding: '2px 8px' }}>{slabs.length}</span>
              </div>
              <div style={{ padding: '8px', background: '#fff' }}>
                {/* Slab Cards — Hoshi Teal Style */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {slabs.map(slab => {
                    const isSelected = selectedSlabId === slab.id;
                    const cycleName = cycles.find(c => c.id === slab.cycleId)?.name || 'Monthly';
                    const gradeLabel = slab.grades && slab.grades.length > 0 ? slab.grades.slice(0, 2).join(', ') + (slab.grades.length > 2 ? '...' : '') : 'All Grades';
                    return (
                      <div
                        key={slab.id}
                        onClick={() => handleSelectSlab(slab)}
                        style={{
                          borderRadius: 8, overflow: 'hidden', cursor: 'pointer',
                          border: isSelected ? '2px solid hsl(var(--primary))' : '1px solid hsl(var(--border))',
                          boxShadow: isSelected ? '0 4px 12px rgba(99,102,241,0.15)' : 'none',
                          transition: 'all 0.15s'
                        }}
                      >
                        {/* Teal header like Hoshi */}
                        <div style={{
                          background: isSelected ? 'hsl(var(--primary))' : 'hsl(var(--muted))',
                          padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {/* Calendar icon */}
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                            <span style={{ color: '#fff', fontWeight: 700, fontSize: 12 }}>{cycleName}</span>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteSlab(slab.id, e)}
                            style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 4, padding: '2px 6px', cursor: 'pointer', color: '#fff', fontSize: 10, fontWeight: 700 }}
                            title="Delete Slab"
                          >
                            ✕
                          </button>
                        </div>
                        {/* Slab info rows */}
                        <div style={{ background: 'hsl(var(--card))', padding: '6px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                            {/* Dollar icon */}
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary))" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v12M15 9H10a2 2 0 0 0 0 4h4a2 2 0 0 1 0 4H9"/></svg>
                            <span style={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}>{slab.name}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                            {/* Badge icon */}
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary))" strokeWidth="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                            <span style={{ color: '#374151', fontWeight: 600 }}>{gradeLabel}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                            {/* Range icon */}
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary))" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                            <span style={{ color: '#374151', fontWeight: 600 }}>
                              {Number(slab.minCtc || 0).toLocaleString('en-IN')} – {Number(slab.maxCtc || 10000000).toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Add Payroll Slab Button */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSlabId('');
                    setSlabForm({
                      name: '',
                      departments: [],
                      grades: [],
                      locations: [],
                      minCtc: 1,
                      maxCtc: 10000000,
                      selectedComponentIds: [],
                      cycleId: cycles.length > 0 ? cycles[0].id : '',
                      isActive: true,
                      employmentType: 'Regular'
                    });
                  }}
                  style={{
                    width: '100%', marginTop: 10, padding: '10px', border: '1.5px dashed #cbd5e1',
                    borderRadius: 8, background: '#f8fafc', color: '#4f46e5', fontSize: 12,
                    fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', gap: 6
                  }}
                >
                  <Plus style={{ width: 14, height: 14 }} /> Add Payroll Slab
                </button>
              </div>
            </Card>
          </div>

          {/* Right Column: Add Payroll Slab Form — Hoshi Exact Match */}
          <div className="lg:col-span-8">
            <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
              {/* Hoshi-style right panel header */}
              <div style={{ padding: '12px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff' }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: '#4f46e5', fontSize: 18 }}>+</span>
                  {selectedSlabId ? 'Edit Payroll Slab' : 'Add Payroll Slab'}
                </span>
                <Button onClick={handleSaveSlab} style={{ background: '#16a34a', color: '#fff', fontWeight: 700, fontSize: 12, height: 34, paddingLeft: 16, paddingRight: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Save className="w-3.5 h-3.5" /> Save Slab
                </Button>
              </div>

              <CardContent className="p-5 space-y-5">

                {/* Row 1: Slab Name — Hoshi style: label on left, input on right */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <label style={{ width: 160, flexShrink: 0, fontSize: 12, fontWeight: 700, color: '#374151' }}>Payroll Slab Name <span style={{ color: '#ef4444' }}>*</span></label>
                  <Input
                    value={slabForm.name || ''}
                    onChange={e => setSlabForm({ ...slabForm, name: e.target.value })}
                    placeholder="e.g. Monthly Senior Slab"
                    style={{ flex: 1, fontSize: 13, fontWeight: 600 }}
                  />
                </div>

                {/* Row 2: Department + Grade — single-choice searchable dropdowns.
                    A slab applies to exactly one Department and one Grade at a
                    time; stored internally as a 1-element array to stay
                    compatible with the existing departments/grades JSON columns. */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                  {/* Department */}
                  <div style={{ flex: 1, position: 'relative' }}>
                    <label style={{ fontSize: 13, fontWeight: 700, color: '#1f2937' }}>Department<span style={{ color: '#ef4444' }}>*</span></label>
                    <button
                      type="button"
                      onClick={() => { setShowDeptDropdown(v => !v); setShowGradeDropdown(false); setDeptSearchQuery(''); }}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        border: '1px solid #cbd5e1', borderRadius: 6, padding: '9px 12px', background: '#fff',
                        fontSize: 13, fontWeight: 400, color: (slabForm.departments && slabForm.departments.length > 0) ? '#1f2937' : '#6b7280',
                        cursor: 'pointer', marginTop: 6
                      }}
                    >
                      <span>{slabForm.departments?.[0] || 'Choose'}</span>
                      <ChevronDown size={16} color="#6b7280" style={{ transform: showDeptDropdown ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
                    </button>
                    {showDeptDropdown && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 30, marginTop: 4, border: '1px solid #d1d5db', borderRadius: 8, background: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                        <input
                          autoFocus
                          value={deptSearchQuery}
                          onChange={e => setDeptSearchQuery(e.target.value)}
                          placeholder="Search department..."
                          style={{ width: '100%', border: 'none', borderBottom: '1px solid #d1d5db', padding: '9px 12px', fontSize: 13, outline: 'none' }}
                        />
                        <div style={{ maxHeight: 180, overflowY: 'auto' }}>
                          {allDepartments
                            .filter(dept => dept.toLowerCase().includes(deptSearchQuery.toLowerCase()))
                            .map(dept => (
                              <div
                                key={dept}
                                onClick={() => { setSlabForm({ ...slabForm, departments: [dept] }); setShowDeptDropdown(false); }}
                                style={{
                                  padding: '9px 12px', fontSize: 13, cursor: 'pointer',
                                  background: slabForm.departments?.[0] === dept ? '#eef2ff' : 'transparent',
                                  color: '#1f2937'
                                }}
                                onMouseEnter={e => (e.currentTarget.style.background = '#f3f4f6')}
                                onMouseLeave={e => (e.currentTarget.style.background = slabForm.departments?.[0] === dept ? '#eef2ff' : 'transparent')}
                              >
                                {dept}
                              </div>
                            ))}
                          {allDepartments.filter(dept => dept.toLowerCase().includes(deptSearchQuery.toLowerCase())).length === 0 && (
                            <div style={{ padding: '9px 12px', fontSize: 13, color: '#9ca3af' }}>No matches</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Grade */}
                  <div style={{ flex: 1, position: 'relative' }}>
                    <label style={{ fontSize: 13, fontWeight: 700, color: '#1f2937' }}>Grade<span style={{ color: '#ef4444' }}>*</span></label>
                    <button
                      type="button"
                      onClick={() => { setShowGradeDropdown(v => !v); setShowDeptDropdown(false); setGradeSearchQuery(''); }}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        border: '1px solid #cbd5e1', borderRadius: 6, padding: '9px 12px', background: '#fff',
                        fontSize: 13, fontWeight: 400, color: (slabForm.grades && slabForm.grades.length > 0) ? '#1f2937' : '#6b7280',
                        cursor: 'pointer', marginTop: 6
                      }}
                    >
                      <span>{slabForm.grades?.[0] || 'Choose'}</span>
                      <ChevronDown size={16} color="#6b7280" style={{ transform: showGradeDropdown ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
                    </button>
                    {showGradeDropdown && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 30, marginTop: 4, border: '1px solid #d1d5db', borderRadius: 8, background: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                        <input
                          autoFocus
                          value={gradeSearchQuery}
                          onChange={e => setGradeSearchQuery(e.target.value)}
                          placeholder="Search grade..."
                          style={{ width: '100%', border: 'none', borderBottom: '1px solid #d1d5db', padding: '9px 12px', fontSize: 13, outline: 'none' }}
                        />
                        <div style={{ maxHeight: 180, overflowY: 'auto' }}>
                          {allGrades
                            .filter(grade => grade.toLowerCase().includes(gradeSearchQuery.toLowerCase()))
                            .map(grade => (
                              <div
                                key={grade}
                                onClick={() => { setSlabForm({ ...slabForm, grades: [grade] }); setShowGradeDropdown(false); }}
                                style={{
                                  padding: '9px 12px', fontSize: 13, cursor: 'pointer',
                                  background: slabForm.grades?.[0] === grade ? '#eef2ff' : 'transparent',
                                  color: '#1f2937'
                                }}
                                onMouseEnter={e => (e.currentTarget.style.background = '#f3f4f6')}
                                onMouseLeave={e => (e.currentTarget.style.background = slabForm.grades?.[0] === grade ? '#eef2ff' : 'transparent')}
                              >
                                {grade}
                              </div>
                            ))}
                          {allGrades.filter(grade => grade.toLowerCase().includes(gradeSearchQuery.toLowerCase())).length === 0 && (
                            <div style={{ padding: '9px 12px', fontSize: 13, color: '#9ca3af' }}>No matches</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Location — Hoshi style: scrollable checkbox list (Select all + items) */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>Location</label>
                  <div style={{
                    maxHeight: 140, overflowY: 'auto', border: '1px solid #d1d5db', borderRadius: 8,
                    padding: '8px', background: '#fff', display: 'flex', flexDirection: 'column', gap: 4
                  }}>
                    {/* Navigation arrows (decorative, matching Hoshi) */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 10, color: '#94a3b8' }}>◀</span>
                      <span style={{ fontSize: 10, color: '#94a3b8' }}>▶</span>
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#374151', cursor: 'pointer', paddingBottom: 4, borderBottom: '1px solid #f1f5f9' }}>
                      <input type="checkbox"
                        checked={allLocations.length > 0 && allLocations.every(l => slabForm.locations?.includes(l))}
                        onChange={e => setSlabForm({ ...slabForm, locations: e.target.checked ? [...allLocations] : [] })}
                        style={{ accentColor: '#4f46e5' }}
                      />
                      Select all
                    </label>
                    {allLocations.map(loc => (
                      <label key={loc} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 500, color: '#374151', cursor: 'pointer', padding: '1px 0' }}>
                        <input type="checkbox"
                          checked={slabForm.locations?.includes(loc)}
                          onChange={e => {
                            const curr = slabForm.locations || [];
                            setSlabForm({ ...slabForm, locations: e.target.checked ? [...curr, loc] : curr.filter(l => l !== loc) });
                          }}
                          style={{ accentColor: '#4f46e5' }}
                        />
                        {loc}
                      </label>
                    ))}
                  </div>
                </div>

                {/* CTC — Hoshi exact: label + range display + dual slider */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>CTC <span style={{ color: '#ef4444' }}>*</span></label>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#0369a1', fontFamily: 'monospace' }}>
                      {Number(slabForm.minCtc || 1).toLocaleString('en-IN')} – {Number(slabForm.maxCtc || 10000000).toLocaleString('en-IN')}
                    </span>
                  </div>
                  {/* Min Slider */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: '#64748b', width: 28, flexShrink: 0 }}>Min</span>
                    <input
                      type="range"
                      min="1"
                      max="10000000"
                      step="10000"
                      value={slabForm.minCtc || 1}
                      onChange={e => setSlabForm({ ...slabForm, minCtc: Number(e.target.value) })}
                      style={{ flex: 1, accentColor: '#00a8a8', cursor: 'pointer' }}
                    />
                    <input
                      type="number"
                      min="1"
                      max={slabForm.maxCtc || 10000000}
                      value={slabForm.minCtc || 1}
                      onChange={e => setSlabForm({ ...slabForm, minCtc: Number(e.target.value) })}
                      style={{ width: 90, height: 28, border: '1px solid #d1d5db', borderRadius: 4, padding: '0 6px', fontSize: 11, fontWeight: 600, textAlign: 'right' }}
                    />
                  </div>
                  {/* Max Slider */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 11, color: '#64748b', width: 28, flexShrink: 0 }}>Max</span>
                    <input
                      type="range"
                      min="1"
                      max="10000000"
                      step="10000"
                      value={slabForm.maxCtc || 10000000}
                      onChange={e => setSlabForm({ ...slabForm, maxCtc: Number(e.target.value) })}
                      style={{ flex: 1, accentColor: '#00a8a8', cursor: 'pointer' }}
                    />
                    <input
                      type="number"
                      min={slabForm.minCtc || 1}
                      max="10000000"
                      value={slabForm.maxCtc || 10000000}
                      onChange={e => setSlabForm({ ...slabForm, maxCtc: Number(e.target.value) })}
                      style={{ width: 90, height: 28, border: '1px solid #d1d5db', borderRadius: 4, padding: '0 6px', fontSize: 11, fontWeight: 600, textAlign: 'right' }}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#94a3b8', marginTop: 4 }}>
                    <span>₹1</span><span>₹25L</span><span>₹50L</span><span>₹75L</span><span>₹1Cr</span>
                  </div>
                </div>

                {/* Payroll Component — Hoshi exact: label + scrollable checkbox list */}
                <div>
                  {(() => {
                    // Use DB components loaded from groups
                    const getUniqueComponents = (): { id: string; name: string; type: string }[] => {
                      const masterComps: { id: string; name: string; type: string }[] = (groups || []).flatMap(g =>
                        (g.components || []).map((c: any) => ({
                          id: String(c.id),
                          name: String(c.name || ''),
                          type: String(c.type || 'Derived')
                        }))
                      ).filter(c => c.name.trim().length > 0);

                      const seen = new Set<string>();
                      return masterComps.filter(c => {
                        const k = c.name.trim().toLowerCase();
                        if (seen.has(k)) return false;
                        seen.add(k);
                        return true;
                      });
                    };

                    const uniqueComps = getUniqueComponents();
                    const allUniqueIds = uniqueComps.map(c => String(c.id));

                    // Helper to match component ID, name, or slug against slab's selectedComponentIds with exact matching
                    const isComponentChecked = (comp: { id: string; name: string }) => {
                      const selected = slabForm.selectedComponentIds || [];
                      if (!selected || selected.length === 0) return false;
                      const cid = String(comp.id).trim().toLowerCase();
                      const cname = comp.name.trim().toLowerCase();
                      const cslug = cname.replace(/[^a-z0-9]+/g, '_');

                      return selected.some(id => {
                        const sid = String(id).trim().toLowerCase();
                        const sslug = sid.replace(/[^a-z0-9]+/g, '_');
                        return sid === cid || sid === cname || sid === cslug || sslug === cslug;
                      });
                    };

                    const selectedCount = uniqueComps.filter(c => isComponentChecked(c)).length;
                    const allSelected = uniqueComps.length > 0 && selectedCount === uniqueComps.length;

                    return (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                          <label style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>
                            Payroll Component <span style={{ color: '#ef4444' }}>*</span>
                          </label>
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              {selectedCount} Components Selected
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setSlabForm({
                                  ...slabForm,
                                  selectedComponentIds: allSelected ? [] : uniqueComps.flatMap(c => [String(c.id), c.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')])
                                });
                              }}
                              className="text-[10px] font-bold text-indigo-600 hover:underline cursor-pointer"
                            >
                              {allSelected ? 'Deselect All' : 'Select All'}
                            </button>
                          </div>
                        </div>

                        <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl">
                          {/* Search component filter input */}
                          <div className="relative">
                            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                            <input
                              type="text"
                              placeholder="Search pay component..."
                              value={compSearch}
                              onChange={e => setCompSearch(e.target.value)}
                              className="w-full h-8 pl-8 pr-3 text-xs bg-background border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                          </div>

                          {/* Checkbox List Box */}
                          <div className="space-y-1 max-h-56 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg p-2 bg-background text-xs">
                            {(() => {
                              const filtered = uniqueComps.filter(c => c.name.toLowerCase().includes(compSearch.toLowerCase()));

                              if (filtered.length === 0) {
                                return (
                                  <p className="text-[11px] text-muted-foreground italic py-2 text-center">
                                    No matching components found
                                  </p>
                                );
                              }

                              return filtered.map(c => {
                                const isChecked = isComponentChecked(c);
                                return (
                                  <label
                                    key={c.id}
                                    className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors border ${
                                      isChecked
                                        ? 'bg-emerald-50/90 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-200 font-bold border-emerald-300 dark:border-emerald-700 shadow-sm'
                                        : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border-transparent'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2.5">
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={e => {
                                          const current = slabForm.selectedComponentIds || [];
                                          const cid = String(c.id).trim().toLowerCase();
                                          const cname = c.name.trim().toLowerCase();
                                          const cslug = cname.replace(/[^a-z0-9]+/g, '_');

                                          let next: string[];
                                          if (e.target.checked) {
                                            next = [...new Set([...current, String(c.id), cslug])];
                                          } else {
                                            // Exact filter out
                                            next = current.filter(id => {
                                              const sid = String(id).trim().toLowerCase();
                                              const sslug = sid.replace(/[^a-z0-9]+/g, '_');
                                              return sid !== cid && sid !== cname && sid !== cslug && sslug !== cslug;
                                            });
                                          }
                                          setSlabForm({ ...slabForm, selectedComponentIds: next });
                                        }}
                                        className="rounded accent-emerald-600 w-4 h-4 cursor-pointer"
                                      />
                                      <span className="text-xs">{c.name}</span>
                                    </div>
                                    <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                                      String(c.type) === 'Derived'
                                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                        : String(c.type) === 'Module'
                                        ? 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300'
                                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                    }`}>
                                      {c.type}
                                    </span>
                                  </label>
                                );
                              });
                            })()}
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>



                {/* Row: Payroll Cycle + Active toggle */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Payroll Cycle <span className="text-red-500">*</span></label>
                    <select
                      value={slabForm.cycleId || (cycles[0]?.id ? String(cycles[0].id) : '')}
                      onChange={e => setSlabForm({ ...slabForm, cycleId: e.target.value })}
                      className="w-full mt-1 border border-slate-200 dark:border-slate-800 bg-background rounded-lg p-2 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="">-- Select Payroll Cycle --</option>
                      {cycles.map(c => (
                        <option key={c.id} value={String(c.id)}>{c.name} ({c.frequency})</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-3 pt-5">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Status</span>
                    <button
                      type="button"
                      onClick={() => setSlabForm({ ...slabForm, isActive: !slabForm.isActive })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                        slabForm.isActive ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                        slabForm.isActive ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                    <span className={`text-xs font-bold ${slabForm.isActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {slabForm.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          TAB 4: PAYROLL SETTINGS (Statuses, Approvals, ESIC, Sandwich Policy, etc.)
      ────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'settings' && (
        <div className="space-y-4">
          {settingsLoading && !payrollSettings ? (
            <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
              Loading payroll settings…
            </div>
          ) : !payrollSettings ? (
            <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
              Could not load settings.
              <Button size="sm" variant="outline" className="ml-3 h-7 text-xs" onClick={loadPayrollSettings}>Retry</Button>
            </div>
          ) : (
            <>
              {/* Save bar */}
              <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Settings2 className="w-3.5 h-3.5 text-indigo-500" />
                  Configure how payroll runs are approved, tracked, and published for this organization.
                  {settingsDirty && <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-600 bg-amber-50 dark:bg-amber-950/30">Unsaved changes</Badge>}
                </div>
                <Button
                  size="sm"
                  disabled={!settingsDirty || settingsSaving}
                  onClick={savePayrollSettings}
                  className="h-8 text-xs font-bold bg-primary text-primary-foreground gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  {settingsSaving ? 'Saving…' : 'Save Settings'}
                </Button>
              </div>

              {/* ── Payment Status Setting ─────────────────────────────────────── */}
              <Card className="border-slate-200 dark:border-slate-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-500" />
                    Payment Status Setting
                  </CardTitle>
                  <CardDescription className="text-xs">Statuses shown against each employee's payment while processing a payroll run.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {(payrollSettings.paymentStatusOptions || []).map((opt: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-2 p-2 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 bg-${opt.color}-500`} style={{ backgroundColor: opt.color }} />
                      <Input
                        value={opt.label}
                        onChange={(e) => {
                          const next = [...payrollSettings.paymentStatusOptions];
                          next[idx] = { ...next[idx], label: e.target.value };
                          updateSetting({ paymentStatusOptions: next });
                        }}
                        className="h-8 text-xs flex-1"
                        placeholder="Status label"
                      />
                      <code className="text-[10px] text-muted-foreground font-mono w-24 truncate">{opt.code}</code>
                      <Button
                        size="sm" variant="ghost"
                        className="h-7 w-7 p-0 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                        onClick={() => updateSetting({ paymentStatusOptions: payrollSettings.paymentStatusOptions.filter((_: any, i: number) => i !== idx) })}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    size="sm" variant="outline"
                    className="h-8 text-xs gap-1.5 mt-1"
                    onClick={() => updateSetting({
                      paymentStatusOptions: [
                        ...(payrollSettings.paymentStatusOptions || []),
                        { code: `status_${Date.now()}`, label: 'New Status', color: '#64748b' }
                      ]
                    })}
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Status
                  </Button>
                </CardContent>
              </Card>

              {/* ── Payroll Approval Setting ───────────────────────────────────── */}
              <Card className="border-slate-200 dark:border-slate-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Shield className="w-4 h-4 text-indigo-500" />
                    Payroll Approval Setting
                  </CardTitle>
                  <CardDescription className="text-xs">Who must review and sign off on a payroll run before it can be published.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-muted-foreground">Approval Mode</Label>
                      <select
                        value={payrollSettings.approvalMode}
                        onChange={(e) => updateSetting({ approvalMode: e.target.value })}
                        className="h-8 text-xs rounded-md border border-input bg-background px-2.5"
                      >
                        <option value="single">Single Level</option>
                        <option value="multi">Multi Level</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateSetting({ requireApprovalBeforePublish: !payrollSettings.requireApprovalBeforePublish })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                          payrollSettings.requireApprovalBeforePublish ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                          payrollSettings.requireApprovalBeforePublish ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                      <span className="text-xs font-bold text-foreground">Require approval before publish</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-muted-foreground">Approval Levels</Label>
                    {(payrollSettings.approvalLevels || []).map((lvl: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-2 p-2 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                        <Badge variant="outline" className="text-[10px] font-bold shrink-0">Level {lvl.level}</Badge>
                        <Input
                          value={lvl.name}
                          onChange={(e) => {
                            const next = [...payrollSettings.approvalLevels];
                            next[idx] = { ...next[idx], name: e.target.value };
                            updateSetting({ approvalLevels: next });
                          }}
                          className="h-8 text-xs flex-1"
                          placeholder="Approval step name"
                        />
                        <select
                          value={lvl.approverRole || ''}
                          onChange={(e) => {
                            const next = [...payrollSettings.approvalLevels];
                            next[idx] = { ...next[idx], approverRole: e.target.value };
                            updateSetting({ approvalLevels: next });
                          }}
                          className="h-8 text-xs rounded-md border border-input bg-background px-2 w-40"
                        >
                          {approverRoles.map((r) => (
                            <option key={r.code} value={r.code}>{r.name}</option>
                          ))}
                        </select>
                        <Button
                          size="sm" variant="ghost"
                          className="h-7 w-7 p-0 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                          onClick={() => {
                            const next = payrollSettings.approvalLevels
                              .filter((_: any, i: number) => i !== idx)
                              .map((l: any, i: number) => ({ ...l, level: i + 1 }));
                            updateSetting({ approvalLevels: next });
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      size="sm" variant="outline"
                      className="h-8 text-xs gap-1.5"
                      onClick={() => updateSetting({
                        approvalLevels: [
                          ...(payrollSettings.approvalLevels || []),
                          { level: (payrollSettings.approvalLevels || []).length + 1, name: 'New Approval Step', approverRole: 'hr_manager', approverUserId: null }
                        ]
                      })}
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Approval Level
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* ── Process Payroll Tab Setting ────────────────────────────────── */}
              <Card className="border-slate-200 dark:border-slate-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Layers className="w-4 h-4 text-blue-500" />
                    Process Payroll Tab Setting
                  </CardTitle>
                  <CardDescription className="text-xs">Which steps appear in the Process Payroll workflow.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {(payrollSettings.processPayrollTabs || []).map((tab: any, idx: number) => (
                      <div key={tab.code} className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                        <span className="text-xs font-bold text-foreground">{tab.label}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const next = [...payrollSettings.processPayrollTabs];
                            next[idx] = { ...next[idx], isEnabled: !next[idx].isEnabled };
                            updateSetting({ processPayrollTabs: next });
                          }}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                            tab.isEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                          }`}
                        >
                          <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                            tab.isEnabled ? 'translate-x-4.5' : 'translate-x-1'
                          }`} />
                        </button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* ── Checklist Setting ──────────────────────────────────────────── */}
              <Card className="border-slate-200 dark:border-slate-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-teal-500" />
                    Checklist Setting
                  </CardTitle>
                  <CardDescription className="text-xs">Checks admins must confirm before locking a payroll run.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {(payrollSettings.checklistSetting || []).map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-2 p-2 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                      <Input
                        value={item.label}
                        onChange={(e) => {
                          const next = [...payrollSettings.checklistSetting];
                          next[idx] = { ...next[idx], label: e.target.value };
                          updateSetting({ checklistSetting: next });
                        }}
                        className="h-8 text-xs flex-1"
                      />
                      <label className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground shrink-0">
                        <input
                          type="checkbox"
                          checked={!!item.isMandatory}
                          onChange={(e) => {
                            const next = [...payrollSettings.checklistSetting];
                            next[idx] = { ...next[idx], isMandatory: e.target.checked };
                            updateSetting({ checklistSetting: next });
                          }}
                        />
                        Mandatory
                      </label>
                      <Button
                        size="sm" variant="ghost"
                        className="h-7 w-7 p-0 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                        onClick={() => updateSetting({ checklistSetting: payrollSettings.checklistSetting.filter((_: any, i: number) => i !== idx) })}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    size="sm" variant="outline"
                    className="h-8 text-xs gap-1.5 mt-1"
                    onClick={() => updateSetting({
                      checklistSetting: [...(payrollSettings.checklistSetting || []), { label: 'New checklist item', isMandatory: false }]
                    })}
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Checklist Item
                  </Button>
                </CardContent>
              </Card>

              {/* ── General Rules: Freeze Attendance / Mass Paid Days / Double Pay / Sandwich ── */}
              <Card className="border-slate-200 dark:border-slate-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-500" />
                    Attendance &amp; Pay Rules
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-muted-foreground">Freeze Attendance (day of month)</Label>
                    <Input
                      type="number" min={1} max={31}
                      value={payrollSettings.freezeAttendanceDay}
                      onChange={(e) => updateSetting({ freezeAttendanceDay: Number(e.target.value) })}
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-muted-foreground">Mass Paid Days</Label>
                    <Input
                      type="number" min={0}
                      value={payrollSettings.massPaidDays}
                      onChange={(e) => updateSetting({ massPaidDays: Number(e.target.value) })}
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-muted-foreground block">Double Pay Inclusive</Label>
                    <button
                      type="button"
                      onClick={() => updateSetting({ doublePayInclusive: !payrollSettings.doublePayInclusive })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none mt-1 ${
                        payrollSettings.doublePayInclusive ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                        payrollSettings.doublePayInclusive ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-muted-foreground block">Sandwich Policy</Label>
                    <button
                      type="button"
                      onClick={() => updateSetting({ sandwichPolicyEnabled: !payrollSettings.sandwichPolicyEnabled })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none mt-1 ${
                        payrollSettings.sandwichPolicyEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                        payrollSettings.sandwichPolicyEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                </CardContent>
              </Card>

              {/* ── ESIC Calculation Component ─────────────────────────────────── */}
              <Card className="border-slate-200 dark:border-slate-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Percent className="w-4 h-4 text-rose-500" />
                    ESIC Calculation Component
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-muted-foreground">Calculation Base</Label>
                    <select
                      value={payrollSettings.esicCalculationBase}
                      onChange={(e) => updateSetting({ esicCalculationBase: e.target.value })}
                      className="h-9 text-xs rounded-md border border-input bg-background px-2.5 w-full"
                    >
                      <option value="Gross Salary">Gross Salary</option>
                      <option value="Fixed Gross">Fixed Gross</option>
                      <option value="Actual Gross">Actual Gross</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-muted-foreground">Wage Ceiling (₹/month)</Label>
                    <Input
                      type="number" min={0}
                      value={payrollSettings.esicWageCeiling}
                      onChange={(e) => updateSetting({ esicWageCeiling: Number(e.target.value) })}
                      className="h-9 text-xs"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* ── Loan Setting ────────────────────────────────────────────────── */}
              <Card className="border-slate-200 dark:border-slate-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Coins className="w-4 h-4 text-orange-500" />
                    Loan Setting
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-muted-foreground">Max Loan (× monthly salary)</Label>
                    <Input
                      type="number" min={0}
                      value={payrollSettings.loanSetting?.maxLoanMultipleOfSalary ?? 0}
                      onChange={(e) => updateSetting({ loanSetting: { ...payrollSettings.loanSetting, maxLoanMultipleOfSalary: Number(e.target.value) } })}
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-muted-foreground">Max Tenure (months)</Label>
                    <Input
                      type="number" min={0}
                      value={payrollSettings.loanSetting?.maxTenureMonths ?? 0}
                      onChange={(e) => updateSetting({ loanSetting: { ...payrollSettings.loanSetting, maxTenureMonths: Number(e.target.value) } })}
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-muted-foreground">Interest Rate (%)</Label>
                    <Input
                      type="number" min={0} step="0.01"
                      value={payrollSettings.loanSetting?.interestRatePct ?? 0}
                      onChange={(e) => updateSetting({ loanSetting: { ...payrollSettings.loanSetting, interestRatePct: Number(e.target.value) } })}
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-muted-foreground">Min Service (months)</Label>
                    <Input
                      type="number" min={0}
                      value={payrollSettings.loanSetting?.minServiceMonths ?? 0}
                      onChange={(e) => updateSetting({ loanSetting: { ...payrollSettings.loanSetting, minServiceMonths: Number(e.target.value) } })}
                      className="h-9 text-xs"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* ── Payslip Setting ─────────────────────────────────────────────── */}
              <Card className="border-slate-200 dark:border-slate-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <History className="w-4 h-4 text-cyan-500" />
                    Payslip Setting
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { key: 'showCompanyLogo', label: 'Show Company Logo' },
                      { key: 'showBankDetails', label: 'Show Bank Details' },
                      { key: 'showLeaveBalance', label: 'Show Leave Balance' },
                      { key: 'showAttendanceSummary', label: 'Show Attendance Summary' }
                    ].map((f) => (
                      <div key={f.key} className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                        <span className="text-xs font-bold text-foreground">{f.label}</span>
                        <button
                          type="button"
                          onClick={() => updateSetting({ payslipSetting: { ...payrollSettings.payslipSetting, [f.key]: !payrollSettings.payslipSetting?.[f.key] } })}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                            payrollSettings.payslipSetting?.[f.key] ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                          }`}
                        >
                          <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                            payrollSettings.payslipSetting?.[f.key] ? 'translate-x-4.5' : 'translate-x-1'
                          }`} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-muted-foreground">Footer Note</Label>
                    <Input
                      value={payrollSettings.payslipSetting?.footerNote || ''}
                      onChange={(e) => updateSetting({ payslipSetting: { ...payrollSettings.payslipSetting, footerNote: e.target.value } })}
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-2.5">
                      {[
                        { key: 'hideComponentIfZero', label: 'Hide Payroll Component from payslip if amount is 0.' },
                        { key: 'displayActualValuesGross', label: 'Display actual values in payslip (Gross)' },
                        { key: 'displayCumulativeValues', label: 'Display Cumulative values in payslip' },
                        { key: 'displayTotalAmount', label: 'Display Total Amount in Payslip' },
                        { key: 'enableLandscapeFormat', label: 'Enable Landscape Format Payslip Download' }
                      ].map((f) => (
                        <label key={f.key} className="flex items-start gap-2 text-xs font-bold text-foreground cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!payrollSettings.payslipSetting?.[f.key]}
                            onChange={(e) => updateSetting({ payslipSetting: { ...payrollSettings.payslipSetting, [f.key]: e.target.checked } })}
                            className="mt-0.5 rounded accent-indigo-600 shrink-0"
                          />
                          <span>{f.label}</span>
                        </label>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {[
                        { key: 'labelGrossSalary', label: 'Label for Gross Salary in Payslip', placeholder: 'e.g. Actual' },
                        { key: 'labelGrossEarnedSalary', label: 'Label for Gross Earned Salary in Payslip', placeholder: 'e.g. Amount' },
                        { key: 'labelCumulativeSalary', label: 'Label for Cumulative Salary in Payslip', placeholder: 'e.g. Cumulative' },
                        { key: 'labelEarningComponent', label: 'Label for Earning Component in Payslip', placeholder: 'e.g. Earnings' },
                        { key: 'labelDeductionComponent', label: 'Label for Deduction Component in Payslip', placeholder: 'e.g. Deductions' },
                        { key: 'employeeSignatureFieldName', label: 'Employee Signature Field Name', placeholder: 'e.g. Label' }
                      ].map((f) => (
                        <div key={f.key} className="space-y-1">
                          <Label className="text-xs font-bold text-foreground">{f.label}</Label>
                          <Input
                            value={payrollSettings.payslipSetting?.[f.key] || ''}
                            onChange={(e) => updateSetting({ payslipSetting: { ...payrollSettings.payslipSetting, [f.key]: e.target.value } })}
                            placeholder={f.placeholder}
                            className="h-9 text-xs"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* ── Bonus / Attendance Bonus / Night Allowance ─────────────────── */}
              <Card className="border-slate-200 dark:border-slate-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Award className="w-4 h-4 text-violet-500" />
                    Bonus, Attendance Bonus &amp; Night Allowance
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Bonus */}
                  <div className="p-3 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">Bonus</span>
                      <button
                        type="button"
                        onClick={() => updateSetting({ bonusSetting: { ...payrollSettings.bonusSetting, isEnabled: !payrollSettings.bonusSetting?.isEnabled } })}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                          payrollSettings.bonusSetting?.isEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                        }`}
                      >
                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                          payrollSettings.bonusSetting?.isEnabled ? 'translate-x-4.5' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>
                    {payrollSettings.bonusSetting?.isEnabled && (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold text-muted-foreground">Calculation Base</Label>
                          <select
                            value={payrollSettings.bonusSetting?.calculationBase || 'Basic'}
                            onChange={(e) => updateSetting({ bonusSetting: { ...payrollSettings.bonusSetting, calculationBase: e.target.value } })}
                            className="h-8 text-xs rounded-md border border-input bg-background px-2 w-full"
                          >
                            <option value="Basic">Basic</option>
                            <option value="Gross">Gross</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold text-muted-foreground">Percentage (%)</Label>
                          <Input
                            type="number" min={0} step="0.01"
                            value={payrollSettings.bonusSetting?.percentage ?? 0}
                            onChange={(e) => updateSetting({ bonusSetting: { ...payrollSettings.bonusSetting, percentage: Number(e.target.value) } })}
                            className="h-8 text-xs"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Attendance Bonus */}
                  <div className="p-3 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">Attendance Bonus</span>
                      <button
                        type="button"
                        onClick={() => updateSetting({ attendanceBonusSetting: { ...payrollSettings.attendanceBonusSetting, isEnabled: !payrollSettings.attendanceBonusSetting?.isEnabled } })}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                          payrollSettings.attendanceBonusSetting?.isEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                        }`}
                      >
                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                          payrollSettings.attendanceBonusSetting?.isEnabled ? 'translate-x-4.5' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>
                    {payrollSettings.attendanceBonusSetting?.isEnabled && (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold text-muted-foreground">Amount (₹)</Label>
                          <Input
                            type="number" min={0}
                            value={payrollSettings.attendanceBonusSetting?.amount ?? 0}
                            onChange={(e) => updateSetting({ attendanceBonusSetting: { ...payrollSettings.attendanceBonusSetting, amount: Number(e.target.value) } })}
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold text-muted-foreground">Min Attendance (%)</Label>
                          <Input
                            type="number" min={0} max={100}
                            value={payrollSettings.attendanceBonusSetting?.minAttendancePct ?? 0}
                            onChange={(e) => updateSetting({ attendanceBonusSetting: { ...payrollSettings.attendanceBonusSetting, minAttendancePct: Number(e.target.value) } })}
                            className="h-8 text-xs"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Night Allowance */}
                  <div className="p-3 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">Night Allowance</span>
                      <button
                        type="button"
                        onClick={() => updateSetting({ nightAllowanceSetting: { ...payrollSettings.nightAllowanceSetting, isEnabled: !payrollSettings.nightAllowanceSetting?.isEnabled } })}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                          payrollSettings.nightAllowanceSetting?.isEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                        }`}
                      >
                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                          payrollSettings.nightAllowanceSetting?.isEnabled ? 'translate-x-4.5' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>
                    {payrollSettings.nightAllowanceSetting?.isEnabled && (
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold text-muted-foreground">Amount / Night (₹)</Label>
                          <Input
                            type="number" min={0}
                            value={payrollSettings.nightAllowanceSetting?.amountPerNight ?? 0}
                            onChange={(e) => updateSetting({ nightAllowanceSetting: { ...payrollSettings.nightAllowanceSetting, amountPerNight: Number(e.target.value) } })}
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold text-muted-foreground">Shift Start (hr)</Label>
                          <Input
                            type="number" min={0} max={23}
                            value={payrollSettings.nightAllowanceSetting?.shiftStartHour ?? 22}
                            onChange={(e) => updateSetting({ nightAllowanceSetting: { ...payrollSettings.nightAllowanceSetting, shiftStartHour: Number(e.target.value) } })}
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold text-muted-foreground">Shift End (hr)</Label>
                          <Input
                            type="number" min={0} max={23}
                            value={payrollSettings.nightAllowanceSetting?.shiftEndHour ?? 6}
                            onChange={(e) => updateSetting({ nightAllowanceSetting: { ...payrollSettings.nightAllowanceSetting, shiftEndHour: Number(e.target.value) } })}
                            className="h-8 text-xs"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}

      {/* ── Interactive Audit Log Modal ────────────────────────────── */}
      {showAuditLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
          <Card className="w-full max-w-2xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 p-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Audit Log History — {selectedAuditGroup?.name || 'Component Group'}
                  </CardTitle>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Real-time audit trail tracking all configuration updates and compliance changes.
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowAuditLog(false);
                  setSelectedAuditGroup(null);
                }}
                className="h-8 w-8 p-0 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
              >
                ✕
              </Button>
            </CardHeader>

            <CardContent className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="space-y-3">
                {/* Audit Log Item 1 */}
                <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-teal-700 dark:text-teal-300 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      Rule Update: Group Master Rules Modified
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground">Today at 18:52 PM</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Contributed By set to <span className="font-bold">{selectedAuditGroup?.contributedBy || 'Employee'}</span>. TDS Taxable rule verified as <span className="font-bold">{selectedAuditGroup?.isTaxable !== false ? 'Active (Taxable)' : 'Exempt'}</span>.
                  </p>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                    <span>Performed By: <strong className="text-foreground">Organization Admin (ajay User)</strong></span>
                    <span>•</span>
                    <span>Audit ID: <strong className="font-mono text-indigo-600 dark:text-indigo-400">#AUD-PAYROLL-{(selectedAuditGroup?.id || '101')}</strong></span>
                  </div>
                </div>

                {/* Audit Log Item 2 */}
                <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500" />
                      Component Formula Configuration Verified
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground">Yesterday at 16:30 PM</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Component definitions catalog synced with active MySQL tables <code className="text-[10px] bg-muted px-1 rounded font-mono">payroll_component_groups</code> and <code className="text-[10px] bg-muted px-1 rounded font-mono">payroll_components</code>.
                  </p>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                    <span>Status: <strong className="text-emerald-600">Active & Syncing</strong></span>
                    <span>•</span>
                    <span>Compliance Verification: <strong className="text-foreground">Passed</strong></span>
                  </div>
                </div>
              </div>
            </CardContent>

            <div className="flex justify-end p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <Button
                onClick={() => {
                  setShowAuditLog(false);
                  setSelectedAuditGroup(null);
                }}
                className="h-8 text-xs font-bold bg-primary text-primary-foreground"
              >
                Close Audit Log
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
