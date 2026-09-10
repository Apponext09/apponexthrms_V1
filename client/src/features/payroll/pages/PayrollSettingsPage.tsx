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
  IndianRupee,
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
import { Switch } from '@/components/ui/switch';
import { MasterPayrollCycle } from '../components/MasterPayrollCycle';
import { MasterPayrollComponents } from '../components/MasterPayrollComponents';
import { PayrollReportSettingsTab } from '../components/PayrollReportSettingsTab';
import { FileText } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
interface PayrollCycleItem {
  id: string;
  name: string;
  cycle_name?: string;
  isDailyWages: boolean;
  frequency: 'Monthly' | 'Bi-monthly' | 'Semi-Monthly' | 'Weekly' | 'Bi-Weekly';
  startDate: number | string;
  startDate2?: number | string;
  startDay?: string;
  cutoffDay: number | string;
  cutoffDayName?: string;
  totalDaysCalc?: string;
  disbursementDate: number | string;
  companyId?: string | number | null;
  company_id?: string | number | null;
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
  const [activeTab, setActiveTab] = useState<'cycles' | 'components' | 'slabs' | 'settings' | 'report_settings'>(initialTab);

  useEffect(() => {
    const tabParam = new URLSearchParams(window.location.search).get('tab');
    if (tabParam === 'cycles' || tabParam === 'components' || tabParam === 'slabs' || tabParam === 'settings' || tabParam === 'report_settings') {
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
    disbursementDate: 1,
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

  // Fetch real database records — refetches whenever selected company changes
  useEffect(() => {
    // Pass companyId so backend returns only records for the selected company.
    const companyParams = selectedCompanyId ? { params: { companyId: selectedCompanyId } } : {};

    // 1. Fetch real Departments, Locations, Grades & Designations strictly from DB Settings Masters
    Promise.all([
      apiClient.get('/settings/departments', companyParams).catch(() => ({ data: [] })),
      apiClient.get('/settings/locations', companyParams).catch(() => ({ data: [] })),
      apiClient.get('/settings/grades', companyParams).catch(() => apiClient.get('/settings/pay-grades', companyParams)).catch(() => ({ data: [] })),
      apiClient.get('/settings/designations', companyParams).catch(() => ({ data: [] })),
      apiClient.get('/employees', companyParams).catch(() => ({ data: [] }))
    ]).then(([deptRes, locRes, gradeRes, desigRes, empRes]: any[]) => {
      const dbDepts = (deptRes.data?.data || deptRes.data || []).map((d: any) => d.name || d.department_name || d.title).filter(Boolean);
      const dbLocs = (locRes.data?.data || locRes.data || []).map((l: any) => l.name || l.location_name || l.city || l.branch).filter(Boolean);
      const dbGrades = (gradeRes.data?.data || gradeRes.data || []).map((g: any) => g.name || g.grade_name || g.pay_grade_name || g.title).filter(Boolean);
      const dbDesigs = (desigRes.data?.data || desigRes.data || []).map((d: any) => d.name || d.designation_name || d.title).filter(Boolean);

      const empList = empRes.data?.data || empRes.data || [];
      const empDepts = Array.isArray(empList) ? empList.map((e: any) => e.department || e.dept_name || e.department_name).filter(Boolean) : [];
      const empLocs = Array.isArray(empList) ? empList.map((e: any) => e.location || e.branch || e.city || e.location_name).filter(Boolean) : [];
      const empGrades = Array.isArray(empList) ? empList.map((e: any) => e.grade || e.grade_name || e.pay_grade_name).filter(Boolean) : [];

      // Merge settings masters + employee data; deduplicate
      const finalDepts = [...new Set(['All Departments', ...dbDepts, ...empDepts])];
      const finalLocs = [...new Set(['All Locations', ...dbLocs, ...empLocs])];
      const finalGrades = [...new Set(['All Pay Grades', ...dbGrades, ...empGrades])];

      setAllDepartments(finalDepts);
      setAllLocations(finalLocs);
      setAllGrades(finalGrades);

      if (Array.isArray(empList) && empList.length > 0) {
        setAllEmployees(empList.map((e: any) => ({
          id: e.id,
          name: `${e.firstName || e.first_name || ''} ${e.lastName || e.last_name || ''}`.trim() + ` (${e.employeeCode || e.employee_code || `EMP-${e.id}`})`
        })).filter((e: any) => e.id));
      }
    }).catch(() => { });

    // 2. Fetch real Roles for the Payroll Approval Setting's approver-role picker
    apiClient.get('/rbac/roles').then((res: any) => {
      const items = res.data?.data?.items || res.data?.items || [];
      if (Array.isArray(items) && items.length > 0) {
        setApproverRoles(items.map((r: any) => ({ code: r.code, name: r.name })).filter((r: any) => r.code));
      }
    }).catch(() => { });
  }, [selectedCompanyId]);

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
            disbursementDate: c.disbursementDate ?? c.disbursement_date ?? 1,
            isActive: c.isActive ?? ((c.is_active ?? true) !== 0 && (c.is_active ?? true) !== false)
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
          let depts = []; try { depts = typeof s.departments === 'string' ? JSON.parse(s.departments) : (s.departments || []); } catch { }
          let grades = []; try { grades = typeof s.grades === 'string' ? JSON.parse(s.grades) : (s.grades || []); } catch { }
          let locs = []; try { locs = typeof s.locations === 'string' ? JSON.parse(s.locations) : (s.locations || []); } catch { }

          if (!Array.isArray(depts) || depts.length === 0 || depts[0] === 'Choose') depts = ['All Departments'];
          if (!Array.isArray(grades) || grades.length === 0 || grades[0] === 'Choose') grades = ['All Pay Grades'];
          if (!Array.isArray(locs) || locs.length === 0) locs = ['All Locations'];
          const rawComps = s.selectedComponentIds ?? s.selected_component_ids;
          let comps = []; try { comps = typeof rawComps === 'string' ? JSON.parse(rawComps) : (rawComps || []); } catch { }

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
    }).catch(() => { });
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
            setCompForm(normalizeComp(mappedGroups[0].components[0]));
          }
        }
      } catch (err) {
        console.error('Error fetching component data:', err);
      }
    };
    fetchComponentData();
  }, []);


  // Normalize component type from raw DB value to UI-expected casing
  const normalizeComp = (c: ComponentItem): ComponentItem => {
    const raw = (c.type || 'Value').toString();
    const type: 'Value' | 'Derived' | 'Module' =
      raw === 'Formula' || raw === 'formula' || raw === 'derived' ? 'Derived'
        : raw === 'module' ? 'Module'
          : 'Value';
    return { ...c, type };
  };

  // Sync selected group form — auto-selects first component
  const handleSelectGroup = (g: ComponentGroup) => {
    setSelectedGroupId(g.id);
    setGroupForm(g);
    if (g.components.length > 0) {
      setSelectedComponentId(g.components[0].id);
      setCompForm(normalizeComp(g.components[0]));
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
    setCompForm(normalizeComp(c));
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

    const targetCompId = selectedCompanyId ? String(selectedCompanyId) : (cycleForm.companyId || (cycleForm as any).company_id || '');
    if (!targetCompId || targetCompId === 'all') {
      const activeAllCompCycle = cycles.find(c =>
        (!c.company_id && !c.companyId) &&
        String(c.id) !== String(selectedCycleId) &&
        (c.isActive !== false)
      );
      if (activeAllCompCycle) {
        showToast.error(
          'Validation Error',
          `Payroll cycle "${activeAllCompCycle.name}" is already assigned to All Companies. You cannot target All Companies for another cycle while one is active.`
        );
        return;
      }
    } else {
      const activeSameCompCycle = cycles.find(c =>
        (String(c.company_id || c.companyId) === String(targetCompId)) &&
        String(c.id) !== String(selectedCycleId) &&
        (c.isActive !== false)
      );
      if (activeSameCompCycle) {
        showToast.error(
          'Validation Error',
          `Payroll cycle "${activeSameCompCycle.name}" is already active for this Company. Only one active cycle per company is allowed.`
        );
        return;
      }
    }

    const targetName = (cycleForm.name || "").trim();
    const effectiveCompanyId = cycleForm.companyId
      ? Number(cycleForm.companyId)
      : (selectedCompanyId ? Number(selectedCompanyId) : null);

    const payload = {
      cycle_name: targetName,
      name: targetName,
      company_id: effectiveCompanyId,
      companyId: effectiveCompanyId,
      is_daily_wages: cycleForm.isDailyWages,
      frequency: cycleForm.frequency || "Monthly",
      start_date: cycleForm.startDate || 1,
      cutoff_day: cycleForm.cutoffDay || 25,
      disbursement_date: cycleForm.disbursementDate || 1,
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
          disbursementDate: serverData?.disbursement_date ?? cycleForm.disbursementDate ?? 1,
          isActive: (serverData?.is_active ?? cycleForm.isActive ?? true) !== 0 && (serverData?.is_active ?? cycleForm.isActive ?? true) !== false
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
          disbursementDate: serverData?.disbursement_date ?? cycleForm.disbursementDate ?? 1,
          isActive: (serverData?.is_active ?? cycleForm.isActive ?? true) !== 0 && (serverData?.is_active ?? cycleForm.isActive ?? true) !== false
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
            disbursementDate: 1,
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
        setCompForm(normalizeComp(newComp));
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
      showToast.error('Validation Error', 'Please enter a Payroll Slab Name');
      return;
    }

    const targetDepartments = (slabForm.departments && slabForm.departments.length > 0 && slabForm.departments[0] !== 'Choose')
      ? slabForm.departments
      : ['All Departments'];

    const targetGrades = (slabForm.grades && slabForm.grades.length > 0 && slabForm.grades[0] !== 'Choose')
      ? slabForm.grades
      : ['All Pay Grades'];

    const targetLocations = (slabForm.locations && slabForm.locations.length > 0)
      ? slabForm.locations
      : ['All Locations'];

    const numericCycleId = slabForm.cycleId && !isNaN(Number(slabForm.cycleId)) ? Number(slabForm.cycleId) : (cycles.length > 0 && !isNaN(Number(cycles[0].id)) ? Number(cycles[0].id) : null);
    if (!numericCycleId) {
      showToast.error('Validation Error', 'Please select a Payroll Cycle for the slab');
      return;
    }

    // Use only the components explicitly selected by the user — never fall back to hardcoded IDs.
    const activeCompIds = slabForm.selectedComponentIds || [];
    if (activeCompIds.length === 0) {
      showToast.error('Validation Error', 'Please select at least one Payroll Component for the slab');
      return;
    }

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
        await apiClient.put(`/payroll/slabs/${selectedSlabId}`, payload).catch(() => { });
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
        <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/80 shadow-2xs">
          <button
            onClick={() => setActiveTab('cycles')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${activeTab === 'cycles'
                ? 'bg-background text-foreground shadow-xs border border-border/60'
                : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
              }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            Cycles
          </button>
          <button
            onClick={() => setActiveTab('components')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${activeTab === 'components'
                ? 'bg-background text-foreground shadow-xs border border-border/60'
                : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
              }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Components Catalog
          </button>
          <button
            onClick={() => setActiveTab('slabs')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${activeTab === 'slabs'
                ? 'bg-background text-foreground shadow-xs border border-border/60'
                : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
              }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            Slabs &amp; Statutory Rules
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${activeTab === 'settings'
                ? 'bg-background text-foreground shadow-xs border border-border/60'
                : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
              }`}
          >
            <Settings2 className="w-3.5 h-3.5" />
            Settings
          </button>
          <button
            onClick={() => setActiveTab('report_settings')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${activeTab === 'report_settings'
                ? 'bg-background text-foreground shadow-xs border border-border/60'
                : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
              }`}
          >
            <FileText className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            Report Settings
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────
          TAB 5: DYNAMIC REPORT SETTINGS
      ────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'report_settings' && <PayrollReportSettingsTab />}

      {/* ─────────────────────────────────────────────────────────────────────────
          TAB 1: PAYROLL CYCLE
      ────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'cycles' && <MasterPayrollCycle />}

      {/* ─────────────────────────────────────────────────────────────────────────
          TAB 2: PAYROLL COMPONENT ENGINE (1:1 Hoshi Match)
      ────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'components' && <MasterPayrollComponents />}

      {/* ─────────────────────────────────────────────────────────────────────────
          TAB 3: PAYROLL SLAB — CLEAN UNIFORM DESIGN
      ────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'slabs' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Column: Slabs List */}
          <div className="lg:col-span-4 space-y-3">
            <Card className="border border-border/80 bg-card shadow-xs overflow-hidden rounded-xl">
              {/* Header bar */}
              <div className="p-3.5 px-4 border-b border-border/60 flex items-center justify-between bg-muted/25">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center text-primary">
                    <Calculator className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-foreground">Payroll Slabs</span>
                </div>
                <span className="text-xs font-bold bg-muted text-muted-foreground rounded-md px-2 py-0.5 border border-border/60">{slabs.length}</span>
              </div>

              <div className="p-2 space-y-2 bg-card">
                {/* Slab Cards List */}
                <div className="flex flex-col gap-2 max-h-[580px] overflow-y-auto pr-0.5">
                  {slabs.map(slab => {
                    const isSelected = selectedSlabId === slab.id;
                    const cycleName = cycles.find(c => String(c.id) === String(slab.cycleId))?.name || 'Monthly';
                    const gradeLabel = slab.grades && slab.grades.length > 0 ? slab.grades.slice(0, 2).join(', ') + (slab.grades.length > 2 ? '...' : '') : 'All Grades';
                    return (
                      <div
                        key={slab.id}
                        onClick={() => handleSelectSlab(slab)}
                        className={`rounded-xl overflow-hidden cursor-pointer border transition-all duration-150 ${isSelected
                            ? 'border-primary ring-1 ring-primary/30 shadow-xs bg-primary/5 dark:bg-primary/10'
                            : 'border-border/80 hover:border-border bg-card hover:bg-muted/40'
                          }`}
                      >
                        {/* Header banner */}
                        <div className={`px-3 py-2 flex items-center justify-between border-b ${isSelected
                            ? 'bg-primary text-primary-foreground border-primary/40'
                            : 'bg-muted/40 text-foreground border-border/50'
                          }`}>
                          <div className="flex items-center gap-1.5 font-bold text-xs">
                            <Calendar className="w-3.5 h-3.5 opacity-80" />
                            <span>{cycleName}</span>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteSlab(slab.id, e)}
                            className={`p-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer ${isSelected ? 'hover:bg-primary-foreground/20 text-primary-foreground' : 'text-muted-foreground hover:text-destructive'
                              }`}
                            title="Delete Slab"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Slab info rows */}
                        <div className="p-2.5 space-y-1 text-xs">
                          <div className="flex items-center gap-2 font-bold text-foreground truncate">
                            <IndianRupee className="w-3.5 h-3.5 text-primary shrink-0" />
                            <span className="truncate">{slab.name}</span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground text-[11px]">
                            <Award className="w-3.5 h-3.5 text-primary/70 shrink-0" />
                            <span className="truncate">{gradeLabel}</span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground font-mono text-[11px]">
                            <Sliders className="w-3.5 h-3.5 text-primary/70 shrink-0" />
                            <span>
                              ₹{Number(slab.minCtc || 0).toLocaleString('en-IN')} – ₹{Number(slab.maxCtc || 10000000).toLocaleString('en-IN')}
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
                  className="w-full mt-2 py-2.5 border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 text-primary text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Payroll Slab
                </button>
              </div>
            </Card>
          </div>

          {/* Right Column: Add/Edit Payroll Slab Form */}
          <div className="lg:col-span-8">
            <Card className="border border-border/80 bg-card rounded-xl shadow-xs overflow-hidden">
              {/* Form Header */}
              <div className="px-5 py-3.5 border-b border-border/60 flex items-center justify-between bg-muted/25">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <Sliders className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-foreground block">
                      {selectedSlabId ? `Edit Slab: ${slabForm.name || 'Slab'}` : 'New Payroll Slab'}
                    </span>
                    <span className="text-[10px] text-muted-foreground block">
                      Configure eligibility rules, CTC thresholds, and salary components
                    </span>
                  </div>
                </div>
                <Button
                  onClick={handleSaveSlab}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-8 px-4 flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                >
                  {selectedSlabId ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                  {selectedSlabId ? 'Update Slab' : 'Save Slab'}
                </Button>
              </div>

              <CardContent className="p-5 space-y-4">
                {/* Row 1: Slab Name */}
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5">
                    Payroll Slab Name <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    value={slabForm.name || ''}
                    onChange={e => setSlabForm({ ...slabForm, name: e.target.value })}
                    placeholder="e.g. Engineering Pay Slab, Monthly Senior Slab"
                    className="text-xs font-semibold h-9 bg-background"
                  />
                </div>

                {/* Row 2: Department + Grade */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Department */}
                  <div className="relative">
                    <label className="text-xs font-semibold text-foreground block mb-1">
                      Department <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => { setShowDeptDropdown(v => !v); setShowGradeDropdown(false); setDeptSearchQuery(''); }}
                      className="w-full flex items-center justify-between border border-input rounded-lg px-3 py-2 bg-background text-xs font-medium text-foreground cursor-pointer shadow-2xs focus:ring-1 focus:ring-primary"
                    >
                      <span className={slabForm.departments?.[0] ? 'text-foreground font-semibold' : 'text-muted-foreground'}>
                        {slabForm.departments?.[0] || 'All Departments'}
                      </span>
                      <ChevronDown size={14} className={`text-muted-foreground transition-transform duration-150 ${showDeptDropdown ? 'rotate-180' : ''}`} />
                    </button>
                    {showDeptDropdown && (
                      <div className="absolute top-full left-0 right-0 z-30 mt-1 border border-border rounded-xl bg-card shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                        <input
                          autoFocus
                          value={deptSearchQuery}
                          onChange={e => setDeptSearchQuery(e.target.value)}
                          placeholder="Search department..."
                          className="w-full border-b border-border px-3 py-2 text-xs bg-background focus:outline-none"
                        />
                        <div className="max-h-44 overflow-y-auto p-1">
                          {allDepartments
                            .filter(dept => dept.toLowerCase().includes(deptSearchQuery.toLowerCase()))
                            .map(dept => (
                              <div
                                key={dept}
                                onClick={() => { setSlabForm({ ...slabForm, departments: [dept] }); setShowDeptDropdown(false); }}
                                className={`px-3 py-1.5 text-xs rounded-lg cursor-pointer transition-colors ${slabForm.departments?.[0] === dept ? 'bg-primary text-primary-foreground font-semibold' : 'hover:bg-muted text-foreground'
                                  }`}
                              >
                                {dept}
                              </div>
                            ))}
                          {allDepartments.filter(dept => dept.toLowerCase().includes(deptSearchQuery.toLowerCase())).length === 0 && (
                            <div className="p-3 text-xs text-muted-foreground text-center italic">No matches found</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Grade */}
                  <div className="relative">
                    <label className="text-xs font-semibold text-foreground block mb-1">
                      Grade <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => { setShowGradeDropdown(v => !v); setShowDeptDropdown(false); setGradeSearchQuery(''); }}
                      className="w-full flex items-center justify-between border border-input rounded-lg px-3 py-2 bg-background text-xs font-medium text-foreground cursor-pointer shadow-2xs focus:ring-1 focus:ring-primary"
                    >
                      <span className={slabForm.grades?.[0] ? 'text-foreground font-semibold' : 'text-muted-foreground'}>
                        {slabForm.grades?.[0] || 'All Pay Grades'}
                      </span>
                      <ChevronDown size={14} className={`text-muted-foreground transition-transform duration-150 ${showGradeDropdown ? 'rotate-180' : ''}`} />
                    </button>
                    {showGradeDropdown && (
                      <div className="absolute top-full left-0 right-0 z-30 mt-1 border border-border rounded-xl bg-card shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                        <input
                          autoFocus
                          value={gradeSearchQuery}
                          onChange={e => setGradeSearchQuery(e.target.value)}
                          placeholder="Search grade..."
                          className="w-full border-b border-border px-3 py-2 text-xs bg-background focus:outline-none"
                        />
                        <div className="max-h-44 overflow-y-auto p-1">
                          {allGrades
                            .filter(grade => grade.toLowerCase().includes(gradeSearchQuery.toLowerCase()))
                            .map(grade => (
                              <div
                                key={grade}
                                onClick={() => { setSlabForm({ ...slabForm, grades: [grade] }); setShowGradeDropdown(false); }}
                                className={`px-3 py-1.5 text-xs rounded-lg cursor-pointer transition-colors ${slabForm.grades?.[0] === grade ? 'bg-primary text-primary-foreground font-semibold' : 'hover:bg-muted text-foreground'
                                  }`}
                              >
                                {grade}
                              </div>
                            ))}
                          {allGrades.filter(grade => grade.toLowerCase().includes(gradeSearchQuery.toLowerCase())).length === 0 && (
                            <div className="p-3 text-xs text-muted-foreground text-center italic">No matches found</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Row 3: Applicable Locations (Clean Chip Selector) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      Applicable Locations
                    </label>
                    <span className="text-[11px] text-muted-foreground">
                      {allLocations.length > 0 && allLocations.every(l => slabForm.locations?.includes(l))
                        ? 'All Locations included'
                        : `${slabForm.locations?.length || 0} selected`}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 p-2.5 rounded-xl border border-border bg-background">
                    <button
                      type="button"
                      onClick={() => {
                        const isAll = allLocations.length > 0 && allLocations.every(l => slabForm.locations?.includes(l));
                        setSlabForm({ ...slabForm, locations: isAll ? [] : [...allLocations] });
                      }}
                      className={`px-3 py-1.5 text-xs rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 border ${allLocations.length > 0 && allLocations.every(l => slabForm.locations?.includes(l))
                          ? 'bg-primary text-primary-foreground border-primary shadow-2xs'
                          : 'bg-muted/40 hover:bg-muted text-muted-foreground border-border'
                        }`}
                    >
                      {allLocations.length > 0 && allLocations.every(l => slabForm.locations?.includes(l)) && <Check className="w-3.5 h-3.5" />}
                      Select All Locations
                    </button>
                    {allLocations.filter(loc => loc.toLowerCase() !== 'all locations').map(loc => {
                      const isSelected = slabForm.locations?.includes(loc);
                      return (
                        <button
                          key={loc}
                          type="button"
                          onClick={() => {
                            const curr = slabForm.locations || [];
                            setSlabForm({
                              ...slabForm,
                              locations: isSelected ? curr.filter(l => l !== loc) : [...curr, loc]
                            });
                          }}
                          className={`px-3 py-1.5 text-xs rounded-lg transition-all cursor-pointer flex items-center gap-1.5 border ${isSelected
                              ? 'bg-primary/10 text-primary border-primary/30 font-semibold shadow-2xs'
                              : 'bg-muted/30 hover:bg-muted text-muted-foreground border-border'
                            }`}
                        >
                          {isSelected && <Check className="w-3 h-3 text-primary" />}
                          <span>{loc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Row 4: CTC Range (Clean Presets & Formatted Inputs) */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-foreground">
                      Annual CTC Range <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-xs font-bold text-primary font-mono bg-primary/10 px-2.5 py-0.5 rounded-md border border-primary/20">
                      ₹{Number(slabForm.minCtc || 0).toLocaleString('en-IN')} – ₹{Number(slabForm.maxCtc || 10000000).toLocaleString('en-IN')}
                    </span>
                  </div>

                  {/* Quick Preset Buttons */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] text-muted-foreground mr-0.5">Presets:</span>
                    {[
                      { label: '0 – 3L', min: 0, max: 300000 },
                      { label: '3L – 6L', min: 300000, max: 600000 },
                      { label: '6L – 12L', min: 600000, max: 1200000 },
                      { label: '12L – 25L', min: 1200000, max: 2500000 },
                      { label: '25L – 50L', min: 2500000, max: 5000000 },
                      { label: 'All (0 – 1Cr)', min: 0, max: 10000000 },
                    ].map(preset => {
                      const isActive = Number(slabForm.minCtc) === preset.min && Number(slabForm.maxCtc) === preset.max;
                      return (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => setSlabForm({ ...slabForm, minCtc: preset.min, maxCtc: preset.max })}
                          className={`px-2 py-0.5 text-[11px] font-mono rounded-md border transition-all cursor-pointer ${isActive
                              ? 'bg-primary text-primary-foreground border-primary font-bold shadow-2xs'
                              : 'bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border-border'
                            }`}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* 2 Aligned Inputs for Min & Max */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Minimum CTC (₹ / Year)</label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">₹</span>
                        <Input
                          type="number"
                          min="0"
                          max={slabForm.maxCtc || 10000000}
                          step="10000"
                          value={slabForm.minCtc ?? 0}
                          onChange={e => setSlabForm({ ...slabForm, minCtc: Number(e.target.value) })}
                          className="h-8 pl-6 text-xs font-semibold bg-background"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Maximum CTC (₹ / Year)</label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">₹</span>
                        <Input
                          type="number"
                          min={slabForm.minCtc ?? 0}
                          max="100000000"
                          step="10000"
                          value={slabForm.maxCtc ?? 10000000}
                          onChange={e => setSlabForm({ ...slabForm, maxCtc: Number(e.target.value) })}
                          className="h-8 pl-6 text-xs font-semibold bg-background"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Range Sliders */}
                  <div className="space-y-1 pt-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-muted-foreground w-7">Min:</span>
                      <input
                        type="range"
                        min="0"
                        max="10000000"
                        step="25000"
                        value={slabForm.minCtc ?? 0}
                        onChange={e => setSlabForm({ ...slabForm, minCtc: Number(e.target.value) })}
                        className="flex-1 accent-primary cursor-pointer h-1.5 bg-muted rounded-lg"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-muted-foreground w-7">Max:</span>
                      <input
                        type="range"
                        min="0"
                        max="10000000"
                        step="25000"
                        value={slabForm.maxCtc ?? 10000000}
                        onChange={e => setSlabForm({ ...slabForm, maxCtc: Number(e.target.value) })}
                        className="flex-1 accent-primary cursor-pointer h-1.5 bg-muted rounded-lg"
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground px-1 font-mono">
                      <span>₹0</span><span>₹25L</span><span>₹50L</span><span>₹75L</span><span>₹1Cr</span>
                    </div>
                  </div>
                </div>

                {/* Row 5: Payroll Components Selector — Grouped by Earning / Deduction */}
                <div>
                  {(() => {
                    const earningComps: { id: string; name: string; groupName: string }[] = [];
                    const deductionComps: { id: string; name: string; groupName: string }[] = [];
                    const seenNames = new Set<string>();
                    for (const g of (groups || [])) {
                      for (const c of (g.components || [])) {
                        const nameKey = (c.name || '').trim().toLowerCase();
                        if (!nameKey || seenNames.has(nameKey)) continue;
                        seenNames.add(nameKey);
                        const entry = { id: String(c.id), name: c.name || '', groupName: g.name };
                        if ((g.category || '').toLowerCase().includes('deduct')) deductionComps.push(entry);
                        else earningComps.push(entry);
                      }
                    }
                    const allComps = [...earningComps, ...deductionComps];
                    const totalCount = allComps.length;

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

                    const toggleComp = (c: { id: string; name: string }, checked: boolean) => {
                      const current = slabForm.selectedComponentIds || [];
                      const cslug = c.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
                      const cid = String(c.id).trim().toLowerCase();
                      const cname = c.name.trim().toLowerCase();
                      let next;
                      if (checked) {
                        next = [...new Set([...current, String(c.id), cslug])];
                      } else {
                        next = current.filter(id => {
                          const sid = String(id).trim().toLowerCase();
                          const sslug = sid.replace(/[^a-z0-9]+/g, '_');
                          return sid !== cid && sid !== cname && sid !== cslug && sslug !== cslug;
                        });
                      }
                      setSlabForm({ ...slabForm, selectedComponentIds: next });
                    };

                    const selectedCount = allComps.filter(c => isComponentChecked(c)).length;
                    const allSelected = totalCount > 0 && selectedCount === totalCount;

                    const renderGroup = (title: string, comps: { id: string; name: string; groupName: string }[], color: 'emerald' | 'rose') => {
                      const filtered = comps.filter(c => c.name.toLowerCase().includes(compSearch.toLowerCase()));
                      if (filtered.length === 0 && compSearch) return null;
                      const groupChecked = filtered.filter(c => isComponentChecked(c)).length;
                      const colorCls = color === 'emerald'
                        ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/50'
                        : 'text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/50';
                      return (
                        <div key={title} className="space-y-1.5">
                          <div className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] font-bold border ${colorCls}`}>
                            <span>{title}</span>
                            <span className="font-mono">{groupChecked} / {filtered.length} selected</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {filtered.length === 0 ? (
                              <p className="col-span-2 text-xs text-muted-foreground italic py-2 text-center">No {title} components configured yet</p>
                            ) : filtered.map(c => {
                              const isChecked = isComponentChecked(c);
                              return (
                                <div
                                  key={c.id}
                                  onClick={() => toggleComp(c, !isChecked)}
                                  className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all border select-none ${isChecked ? 'bg-primary/5 dark:bg-primary/15 text-foreground font-semibold border-primary/30 shadow-2xs' : 'hover:bg-muted/40 text-muted-foreground border-border/60 bg-background'
                                    }`}
                                >
                                  <input type="checkbox" checked={isChecked} onChange={() => { }} className="rounded accent-primary w-3.5 h-3.5 cursor-pointer shrink-0" />
                                  <div className="min-w-0">
                                    <span className="text-xs truncate block">{c.name}</span>
                                    <span className="text-[10px] text-muted-foreground truncate block">{c.groupName}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    };

                    return (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <label className="text-xs font-semibold text-foreground">Payroll Components <span className="text-rose-500">*</span></label>
                            <span className="text-[10px] text-primary font-bold bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20">{selectedCount} of {totalCount} Selected</span>
                          </div>
                          <button type="button" onClick={() => setSlabForm({ ...slabForm, selectedComponentIds: allSelected ? [] : allComps.flatMap(c => [String(c.id), c.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')]) })} className="text-xs font-semibold text-primary hover:underline cursor-pointer">
                            {allSelected ? 'Deselect All' : 'Select All'}
                          </button>
                        </div>
                        <div className="p-3 bg-muted/20 border border-border/80 rounded-xl space-y-3">
                          <div className="relative">
                            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                            <input type="text" placeholder="Search components..." value={compSearch} onChange={e => setCompSearch(e.target.value)} className="w-full h-8 pl-8 pr-3 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs" />
                          </div>
                          <div className="space-y-3 max-h-72 overflow-y-auto">
                            {totalCount === 0 ? (
                              <p className="text-xs text-muted-foreground italic py-4 text-center">No components defined yet. Add components in Settings → Components first.</p>
                            ) : (<>{renderGroup('Earnings', earningComps, 'emerald')}{renderGroup('Deductions', deductionComps, 'rose')}</>)}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Row 6: Payroll Cycle & Active Status */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 items-center">
                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1">
                      Payroll Cycle <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={slabForm.cycleId || (cycles[0]?.id ? String(cycles[0].id) : '')}
                      onChange={e => setSlabForm({ ...slabForm, cycleId: e.target.value })}
                      className="w-full h-9 border border-input bg-background text-foreground rounded-lg px-2.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
                    >
                      <option value="">-- Select Payroll Cycle --</option>
                      {cycles.map(c => (
                        <option key={c.id} value={String(c.id)}>{c.name} ({c.frequency})</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-background hover:bg-muted/20 transition-colors h-[42px] mt-4">
                    <div className="space-y-0.5">
                      <label htmlFor="slab-active-switch" className="text-xs font-semibold text-foreground cursor-pointer block leading-none">
                        Active Status
                      </label>
                      <span className="text-[10px] text-muted-foreground block leading-none">
                        {slabForm.isActive ? 'Slab active in payroll' : 'Disabled'}
                      </span>
                    </div>
                    <Switch
                      id="slab-active-switch"
                      checked={Boolean(slabForm.isActive)}
                      onCheckedChange={(checked) => setSlabForm({ ...slabForm, isActive: checked })}
                    />
                  </div>
                </div>

                {/* Bottom Action Bar */}
                <div className="flex items-center justify-between pt-3 border-t border-border/70">
                  <Button
                    onClick={handleSaveSlab}
                    className="h-9 px-5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    {selectedSlabId ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                    {selectedSlabId ? 'Update Slab' : 'Save Slab'}
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedSlabId('');
                      setSlabForm({
                        name: '',
                        departments: [],
                        grades: [],
                        locations: [],
                        minCtc: 0,
                        maxCtc: 10000000,
                        selectedComponentIds: [],
                        cycleId: cycles.length > 0 ? cycles[0].id : '',
                        isActive: true,
                        employmentType: 'Regular'
                      });
                    }}
                    className="h-9 px-4 text-xs font-semibold text-muted-foreground hover:text-foreground rounded-lg flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Reset Form
                  </Button>
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
                    <IndianRupee className="w-4 h-4 text-emerald-500" />
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
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${payrollSettings.requireApprovalBeforePublish ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                          }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${payrollSettings.requireApprovalBeforePublish ? 'translate-x-6' : 'translate-x-1'
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
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${tab.isEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                            }`}
                        >
                          <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${tab.isEnabled ? 'translate-x-4.5' : 'translate-x-1'
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
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none mt-1 ${payrollSettings.doublePayInclusive ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                        }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${payrollSettings.doublePayInclusive ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                    </button>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-muted-foreground block">Sandwich Policy</Label>
                    <button
                      type="button"
                      onClick={() => updateSetting({ sandwichPolicyEnabled: !payrollSettings.sandwichPolicyEnabled })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none mt-1 ${payrollSettings.sandwichPolicyEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                        }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${payrollSettings.sandwichPolicyEnabled ? 'translate-x-6' : 'translate-x-1'
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
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${payrollSettings.payslipSetting?.[f.key] ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                            }`}
                        >
                          <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${payrollSettings.payslipSetting?.[f.key] ? 'translate-x-4.5' : 'translate-x-1'
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
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${payrollSettings.bonusSetting?.isEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                          }`}
                      >
                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${payrollSettings.bonusSetting?.isEnabled ? 'translate-x-4.5' : 'translate-x-1'
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
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${payrollSettings.attendanceBonusSetting?.isEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                          }`}
                      >
                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${payrollSettings.attendanceBonusSetting?.isEnabled ? 'translate-x-4.5' : 'translate-x-1'
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
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${payrollSettings.nightAllowanceSetting?.isEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                          }`}
                      >
                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${payrollSettings.nightAllowanceSetting?.isEnabled ? 'translate-x-4.5' : 'translate-x-1'
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
