import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  CalendarDays,
  Plus,
  Search,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Building2,
  MapPin,
  Send,
  Upload,
  ArrowLeft,
  Clock,
  ShieldCheck,
  Check,
  FileSpreadsheet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { showToast } from '@/components/ui/toast';
import { apiClient } from '@/lib/api';
import { useCompanyStore } from '@/features/settings/store/companyStore';
import { CreateHolidayCalendarModal } from '../components/CreateHolidayCalendarModal';
import { BulkHolidayImportModal } from '../components/BulkHolidayImportModal';
import { cn } from '@/lib/utils';

// ─── Interfaces ──────────────────────────────────────────────────────────────
export interface HolidayCalendarItem {
  id: number;
  uuid?: string;
  name?: string;
  calendar_name: string;
  year?: number;
  calendar_year: number;
  company_id?: number | null;
  company_name?: string;
  region_id?: number | null;
  region_name?: string;
  location_id?: number | null;
  location_name?: string;
  status: 'Draft' | 'Published' | 'Archived';
  description?: string | null;
  total_holidays?: number;
  holidays_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface HolidayItem {
  id: number;
  calendar_id: number;
  holiday_name: string;
  holiday_date: string;
  month?: string;
  month_number?: number;
  holiday_type: 'National' | 'Festival' | 'Optional' | 'Restricted' | string;
  is_optional: boolean;
  description?: string | null;
}

export interface WeeklyOffRule {
  id?: number;
  week_day: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun' | string;
  off_type: 'Full Day' | 'Half Day';
  is_alternate: boolean;
  alternate_weeks?: string | null;
}

export interface CalendarAssignment {
  id: number;
  calendar_id: number;
  company_id?: number | null;
  company_name?: string;
  location_id?: number | null;
  location_name?: string;
  department_id?: number | null;
  department_name?: string;
  employee_group_id?: number | null;
  assigned_at?: string;
}

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
const FULL_DAY_NAMES: Record<string, string> = {
  Mon: 'Monday',
  Tue: 'Tuesday',
  Wed: 'Wednesday',
  Thu: 'Thursday',
  Fri: 'Friday',
  Sat: 'Saturday',
  Sun: 'Sunday',
};

const HOLIDAY_TYPES = ['National', 'Festival', 'Optional', 'Restricted'] as const;

export interface HolidayCalendarsPageProps {
  onBackToMasters?: () => void;
}

export function HolidayCalendarsPage({ onBackToMasters }: HolidayCalendarsPageProps = {}) {
  const { selectedCompanyId } = useCompanyStore();
  const currentYear = new Date().getFullYear();

  // ─── Main View State ───────────────────────────────────────────────────────
  const [selectedCalendarId, setSelectedCalendarId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'holidays' | 'weekly-off' | 'assign'>('holidays');

  // ─── List State ────────────────────────────────────────────────────────────
  const [calendars, setCalendars] = useState<HolidayCalendarItem[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCompany, setFilterCompany] = useState<string>('all');
  const [filterRegion, setFilterRegion] = useState<string>('all');
  const [filterLocation, setFilterLocation] = useState<string>('all');
  const [filterYear, setFilterYear] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Master options
  const [companies, setCompanies] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);

  // ─── Modal States ──────────────────────────────────────────────────────────
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [calendarToEdit, setCalendarToEdit] = useState<HolidayCalendarItem | null>(null);

  // Holiday Modal State
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [holidayToEdit, setHolidayToEdit] = useState<HolidayItem | null>(null);
  const [savingHoliday, setSavingHoliday] = useState(false);
  const [holidayError, setHolidayError] = useState<string | null>(null);

  // Holiday Form
  const [hName, setHName] = useState('');
  const [hDate, setHDate] = useState('');
  const [hType, setHType] = useState<string>('National');
  const [hIsOptional, setHIsOptional] = useState(false);
  const [hDescription, setHDescription] = useState('');

  // ─── Calendar Detail State ─────────────────────────────────────────────────
  const [calendarDetail, setCalendarDetail] = useState<any | null>(null);

  // Weekly Off State
  const [weeklyOffRules, setWeeklyOffRules] = useState<Record<string, { enabled: boolean; off_type: 'Full Day' | 'Half Day'; is_alternate: boolean; alternate_weeks: string[] }>>({
    Sun: { enabled: true, off_type: 'Full Day', is_alternate: false, alternate_weeks: [] },
    Mon: { enabled: false, off_type: 'Full Day', is_alternate: false, alternate_weeks: [] },
    Tue: { enabled: false, off_type: 'Full Day', is_alternate: false, alternate_weeks: [] },
    Wed: { enabled: false, off_type: 'Full Day', is_alternate: false, alternate_weeks: [] },
    Thu: { enabled: false, off_type: 'Full Day', is_alternate: false, alternate_weeks: [] },
    Fri: { enabled: false, off_type: 'Full Day', is_alternate: false, alternate_weeks: [] },
    Sat: { enabled: true, off_type: 'Full Day', is_alternate: true, alternate_weeks: ['2', '4'] },
  });
  const [savingWeeklyOff, setSavingWeeklyOff] = useState(false);

  // Assignment Form State
  const [assignLocationId, setAssignLocationId] = useState<string>('all');
  const [assignDepartmentId, setAssignDepartmentId] = useState<string>('all');
  const [assignEmployeeGroup, setAssignEmployeeGroup] = useState<string>('');
  const [savingAssign, setSavingAssign] = useState(false);

  // Publish Dialog
  const [isPublishConfirmOpen, setIsPublishConfirmOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // Delete Dialog
  const [calendarToDelete, setCalendarToDelete] = useState<HolidayCalendarItem | null>(null);
  const [deletingCalendar, setDeletingCalendar] = useState(false);

  // ─── Initial Data Load ─────────────────────────────────────────────────────
  useEffect(() => {
    fetchDropdowns();
    fetchCalendars();
  }, [selectedCompanyId]);

  useEffect(() => {
    if (selectedCalendarId) {
      fetchCalendarDetail(selectedCalendarId);
    } else {
      setCalendarDetail(null);
    }
  }, [selectedCalendarId]);

  const fetchDropdowns = async () => {
    try {
      const [compRes, locRes, deptRes] = await Promise.all([
        apiClient.get('/settings/companies').catch(() => ({ data: { data: [] } })),
        apiClient.get('/settings/locations?pageSize=100').catch(() => ({ data: { data: [] } })),
        apiClient.get('/settings/departments?pageSize=100').catch(() => ({ data: { data: [] } })),
      ]);

      setCompanies(compRes.data?.data || compRes.data || []);
      setLocations(locRes.data?.data || locRes.data || []);
      setDepartments(deptRes.data?.data || deptRes.data || []);
    } catch (err) {
      console.error('Error fetching master dropdowns:', err);
    }
  };

  const fetchCalendars = async () => {
    setLoadingList(true);
    try {
      const params: any = {};
      if (filterCompany !== 'all') params.company_id = filterCompany;
      if (filterRegion !== 'all') params.region_id = filterRegion;
      if (filterLocation !== 'all') params.location_id = filterLocation;
      if (filterYear !== 'all') params.year = filterYear;
      if (filterStatus !== 'all') params.status = filterStatus;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await apiClient.get('/master/holiday-calendars', { params });
      if (res.data?.success) {
        setCalendars(res.data.data || []);
      }
    } catch (err: any) {
      console.error('Error fetching holiday calendars:', err);
      showToast.error('Fetch Error', err?.response?.data?.message || 'Failed to load holiday calendars.');
    } finally {
      setLoadingList(false);
    }
  };

  const fetchCalendarDetail = async (id: number) => {
    try {
      const res = await apiClient.get(`/master/holiday-calendars/${id}`);
      if (res.data?.success) {
        const data = res.data.data;
        setCalendarDetail(data);

        // Populate weekly off rules
        const rulesMap: Record<string, { enabled: boolean; off_type: 'Full Day' | 'Half Day'; is_alternate: boolean; alternate_weeks: string[] }> = {
          Sun: { enabled: false, off_type: 'Full Day', is_alternate: false, alternate_weeks: [] },
          Mon: { enabled: false, off_type: 'Full Day', is_alternate: false, alternate_weeks: [] },
          Tue: { enabled: false, off_type: 'Full Day', is_alternate: false, alternate_weeks: [] },
          Wed: { enabled: false, off_type: 'Full Day', is_alternate: false, alternate_weeks: [] },
          Thu: { enabled: false, off_type: 'Full Day', is_alternate: false, alternate_weeks: [] },
          Fri: { enabled: false, off_type: 'Full Day', is_alternate: false, alternate_weeks: [] },
          Sat: { enabled: false, off_type: 'Full Day', is_alternate: false, alternate_weeks: [] },
        };

        if (Array.isArray(data.weekly_off_rules)) {
          data.weekly_off_rules.forEach((rule: any) => {
            const day = rule.week_day;
            if (rulesMap[day]) {
              rulesMap[day] = {
                enabled: true,
                off_type: rule.off_type || 'Full Day',
                is_alternate: !!rule.is_alternate,
                alternate_weeks: rule.alternate_weeks ? String(rule.alternate_weeks).split(',').map((s) => s.trim()) : [],
              };
            }
          });
        }
        setWeeklyOffRules(rulesMap);
      }
    } catch (err: any) {
      console.error('Error fetching calendar detail:', err);
      showToast.error('Error', err?.response?.data?.message || 'Failed to load calendar details.');
    }
  };

  // ─── Filtered Calendars ────────────────────────────────────────────────────
  const filteredCalendars = useMemo(() => {
    return calendars.filter((c) => {
      if (filterCompany !== 'all' && String(c.company_id) !== filterCompany) return false;
      if (filterRegion !== 'all' && String(c.region_id) !== filterRegion) return false;
      if (filterLocation !== 'all' && String(c.location_id) !== filterLocation) return false;
      if (filterYear !== 'all' && String(c.calendar_year || c.year) !== filterYear) return false;
      if (filterStatus !== 'all' && c.status !== filterStatus) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const name = (c.calendar_name || c.name || '').toLowerCase();
        return name.includes(q);
      }
      return true;
    });
  }, [calendars, filterCompany, filterRegion, filterLocation, filterYear, filterStatus, searchQuery]);

  // ─── Actions ───────────────────────────────────────────────────────────────
  const handleOpenCreateModal = (calToEdit: HolidayCalendarItem | null = null) => {
    setCalendarToEdit(calToEdit);
    setIsCreateModalOpen(true);
  };

  const handleOpenHolidayModal = (item: HolidayItem | null = null) => {
    setHolidayToEdit(item);
    setHolidayError(null);
    if (item) {
      setHName(item.holiday_name);
      setHDate(item.holiday_date);
      setHType(item.holiday_type || 'National');
      setHIsOptional(!!item.is_optional);
      setHDescription(item.description || '');
    } else {
      const year = calendarDetail?.calendar_year || calendarDetail?.year || currentYear;
      setHName('');
      setHDate(`${year}-01-01`);
      setHType('National');
      setHIsOptional(false);
      setHDescription('');
    }
    setIsHolidayModalOpen(true);
  };

  const handleSaveHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    setHolidayError(null);

    const nameTrim = hName.trim();
    if (!nameTrim) {
      setHolidayError('Holiday name is required.');
      return;
    }
    if (!hDate) {
      setHolidayError('Valid holiday date is required.');
      return;
    }

    const payload = {
      holiday_name: nameTrim,
      holiday_date: hDate,
      holiday_type: hType,
      is_optional: hIsOptional,
      description: hDescription.trim() || undefined,
    };

    setSavingHoliday(true);
    try {
      if (holidayToEdit) {
        await apiClient.put(`/master/holiday-calendars/holidays/${holidayToEdit.id}`, payload);
        showToast.success('Holiday Updated', `"${nameTrim}" updated successfully.`);
      } else {
        await apiClient.post(`/master/holiday-calendars/${selectedCalendarId}/holidays`, payload);
        showToast.success('Holiday Added', `"${nameTrim}" added to calendar.`);
      }
      setIsHolidayModalOpen(false);
      fetchCalendarDetail(selectedCalendarId!);
      fetchCalendars();
    } catch (err: any) {
      const status = err?.response?.status;
      const msg = err?.response?.data?.message || 'Failed to save holiday.';
      if (status === 409) {
        setHolidayError(`A holiday on date ${hDate} already exists in this calendar.`);
      } else {
        setHolidayError(msg);
      }
    } finally {
      setSavingHoliday(false);
    }
  };

  const handleDeleteHoliday = async (holiday: HolidayItem) => {
    if (!window.confirm(`Delete holiday "${holiday.holiday_name}" (${holiday.holiday_date})?`)) return;
    try {
      await apiClient.delete(`/master/holiday-calendars/holidays/${holiday.id}`);
      showToast.success('Holiday Deleted', `"${holiday.holiday_name}" has been removed.`);
      fetchCalendarDetail(selectedCalendarId!);
      fetchCalendars();
    } catch (err: any) {
      showToast.error('Delete Failed', err?.response?.data?.message || 'Could not delete holiday.');
    }
  };

  // ─── Save Weekly Off ───────────────────────────────────────────────────────
  const handleSaveWeeklyOff = async () => {
    setSavingWeeklyOff(true);
    try {
      const rulesPayload = Object.entries(weeklyOffRules)
        .filter(([_, rule]) => rule.enabled)
        .map(([day, rule]) => ({
          week_day: day,
          off_type: rule.off_type,
          is_alternate: rule.is_alternate,
          alternate_weeks: rule.is_alternate && rule.alternate_weeks.length > 0 ? rule.alternate_weeks.join(',') : null,
        }));

      const res = await apiClient.post(`/master/holiday-calendars/${selectedCalendarId}/weekly-off`, {
        rules: rulesPayload,
      });

      showToast.success('Weekly Off Rules Saved', res.data?.message || 'Weekly off schedule updated.');
      fetchCalendarDetail(selectedCalendarId!);
    } catch (err: any) {
      showToast.error('Save Failed', err?.response?.data?.message || 'Could not save weekly off rules.');
    } finally {
      setSavingWeeklyOff(false);
    }
  };

  // ─── Assign Calendar ───────────────────────────────────────────────────────
  const handleAssignCalendar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAssign(true);
    try {
      const payload = {
        company_id: calendarDetail?.company_id || undefined,
        location_id: assignLocationId !== 'all' ? Number(assignLocationId) : undefined,
        department_id: assignDepartmentId !== 'all' ? Number(assignDepartmentId) : undefined,
        employee_group_id: assignEmployeeGroup ? Number(assignEmployeeGroup) : undefined,
      };

      await apiClient.post(`/master/holiday-calendars/${selectedCalendarId}/assign`, payload);
      showToast.success('Calendar Assigned', 'Scope assignment recorded successfully.');
      setAssignLocationId('all');
      setAssignDepartmentId('all');
      setAssignEmployeeGroup('');
      fetchCalendarDetail(selectedCalendarId!);
    } catch (err: any) {
      showToast.error('Assignment Failed', err?.response?.data?.message || 'Could not assign calendar.');
    } finally {
      setSavingAssign(false);
    }
  };

  // ─── Publish Calendar ──────────────────────────────────────────────────────
  const handlePublishCalendar = async () => {
    setPublishing(true);
    try {
      await apiClient.patch(`/master/holiday-calendars/${selectedCalendarId}/publish`);
      showToast.success('Calendar Published', 'Calendar is now active and locked for modifications.');
      setIsPublishConfirmOpen(false);
      fetchCalendarDetail(selectedCalendarId!);
      fetchCalendars();
    } catch (err: any) {
      showToast.error('Publish Failed', err?.response?.data?.message || 'Could not publish calendar.');
    } finally {
      setPublishing(false);
    }
  };

  // ─── Delete Calendar ───────────────────────────────────────────────────────
  const handleDeleteCalendar = async () => {
    if (!calendarToDelete) return;
    setDeletingCalendar(true);
    try {
      await apiClient.delete(`/master/holiday-calendars/${calendarToDelete.id}`);
      showToast.success('Calendar Deleted', `"${calendarToDelete.calendar_name || calendarToDelete.name}" was deleted.`);
      setCalendarToDelete(null);
      if (selectedCalendarId === calendarToDelete.id) {
        setSelectedCalendarId(null);
      }
      fetchCalendars();
    } catch (err: any) {
      showToast.error('Delete Failed', err?.response?.data?.message || 'Could not delete holiday calendar.');
    } finally {
      setDeletingCalendar(false);
    }
  };

  // Helper for computing Formatted Date from ISO / Date string
  const formatHolidayDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      return `${dd}-${mm}-${yyyy}`;
    } catch {
      return dateStr;
    }
  };

  // Helper for computing Day of week from date
  const getDayName = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } catch {
      return '';
    }
  };

  // Helper for Status Badge
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'Published':
        return (
          <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 text-[11px] font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Published
          </Badge>
        );
      case 'Archived':
        return (
          <Badge className="bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700 text-[11px] font-semibold">
            Archived
          </Badge>
        );
      case 'Draft':
      default:
        return (
          <Badge className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700 text-[11px] font-semibold flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-500" />
            Draft
          </Badge>
        );
    }
  };

  // Helper for Holiday Type Badge
  const renderTypeBadge = (type: string, isOptional: boolean) => {
    if (isOptional) {
      return (
        <Badge className="bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800 text-[10px] font-semibold">
          Optional Floater
        </Badge>
      );
    }
    switch (type) {
      case 'National':
        return (
          <Badge className="bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800 text-[10px] font-semibold">
            National
          </Badge>
        );
      case 'Festival':
        return (
          <Badge className="bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800 text-[10px] font-semibold">
            Festival
          </Badge>
        );
      case 'Restricted':
        return (
          <Badge className="bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800 text-[10px] font-semibold">
            Restricted
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-[10px] font-semibold">
            {type || 'General'}
          </Badge>
        );
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER: CALENDAR DETAIL WORKSPACE VIEW
  // ═══════════════════════════════════════════════════════════════════════════
  if (selectedCalendarId && calendarDetail) {
    const isLocked = calendarDetail.status === 'Archived';
    const totalHolidays = calendarDetail.holidays?.length || 0;
    const weeklyOffCount = Object.values(weeklyOffRules).filter((r) => r.enabled).length;

    return (
      <div className="space-y-6 animate-in fade-in-50 duration-200 pb-12">
        {/* ─── UNIFIED SINGLE TOP NAVIGATION & ACTIONS BAR ───────────────── */}
        <div className="flex items-center justify-between pb-1 border-b border-neutral-100 dark:border-neutral-800/80">
          <div className="flex items-center gap-1.5 text-xs">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedCalendarId(null)}
              className="flex items-center gap-1.5 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-indigo-600 dark:hover:text-indigo-400 h-8 px-2.5 rounded-lg"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to All Calendars
            </Button>
            <span className="text-neutral-300 dark:text-neutral-700 font-normal">/</span>
            <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 truncate max-w-[240px]">
              {calendarDetail.calendar_name || calendarDetail.name}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {calendarDetail.status === 'Draft' && (
              <Button
                onClick={() => setIsPublishConfirmOpen(true)}
                className="h-8 px-3.5 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                Publish Calendar
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => handleOpenCreateModal(calendarDetail)}
              className="h-8 px-3 text-xs font-semibold rounded-xl border-neutral-200 dark:border-neutral-800"
            >
              <Edit2 className="w-3.5 h-3.5 mr-1.5" />
              Edit Definition
            </Button>
          </div>
        </div>

        {/* ─── SUMMARY CARD (TOP STICKY HEADER) ────────────────────────────── */}
        <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
                  {calendarDetail.calendar_name || calendarDetail.name}
                </h1>
                {renderStatusBadge(calendarDetail.status)}
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-4 flex-wrap">
                <span className="flex items-center gap-1 font-medium text-neutral-700 dark:text-neutral-300">
                  <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                  Year {calendarDetail.calendar_year || calendarDetail.year}
                </span>
                <span className="flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-neutral-400" />
                  {calendarDetail.company_name || 'All Companies'}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-neutral-400" />
                  {calendarDetail.location_name || 'All Locations'}
                </span>
              </p>
            </div>

            {/* Quick Counters */}
            <div className="flex items-center gap-3">
              <div className="px-4 py-2.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 text-center">
                <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{totalHolidays}</div>
                <div className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400">Total Holidays</div>
              </div>

              <div className="px-4 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 text-center">
                <div className="text-lg font-bold text-neutral-800 dark:text-neutral-200">{weeklyOffCount} Days</div>
                <div className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400">Weekly Offs</div>
              </div>

              <div className="px-4 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 text-center">
                <div className="text-lg font-bold text-neutral-800 dark:text-neutral-200">
                  {calendarDetail.assignments?.length || 0}
                </div>
                <div className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400">Assigned Scopes</div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── TABS HEADER ─────────────────────────────────────────────────── */}
        <div className="border-b border-neutral-200 dark:border-neutral-800 flex items-center gap-2">
          <button
            onClick={() => setActiveTab('holidays')}
            className={cn(
              'px-4 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-2',
              activeTab === 'holidays'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            )}
          >
            <CalendarDays className="w-4 h-4" />
            Holidays List
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-bold">
              {totalHolidays}
            </Badge>
          </button>

          <button
            onClick={() => setActiveTab('weekly-off')}
            className={cn(
              'px-4 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-2',
              activeTab === 'weekly-off'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            )}
          >
            <Clock className="w-4 h-4" />
            Weekly Off Rules
          </button>

          <button
            onClick={() => setActiveTab('assign')}
            className={cn(
              'px-4 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-2',
              activeTab === 'assign'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            )}
          >
            <ShieldCheck className="w-4 h-4" />
            Scope Assignment
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-bold">
              {calendarDetail.assignments?.length || 0}
            </Badge>
          </button>
        </div>

        {/* ─── TAB 1: HOLIDAYS TAB ─────────────────────────────────────────── */}
        {activeTab === 'holidays' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="text-sm font-bold text-neutral-900 dark:text-white">Annual Holidays Schedule</h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Manage festival, national, and restricted holidays for Year {calendarDetail.calendar_year || calendarDetail.year}.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsBulkModalOpen(true)}
                  disabled={isLocked}
                  className="h-9 px-3 text-xs font-semibold rounded-xl border-neutral-200 dark:border-neutral-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" />
                  Bulk Upload (Excel / CSV / PDF)
                </Button>

                <Button
                  onClick={() => handleOpenHolidayModal(null)}
                  disabled={isLocked}
                  className="h-9 px-4 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Add Holiday
                </Button>
              </div>
            </div>

            {/* Holidays Table */}
            <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden bg-white dark:bg-neutral-900 shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-3">Day</th>
                    <th className="py-3 px-4">Holiday Name</th>
                    <th className="py-3 px-3">Category / Type</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {calendarDetail.holidays && calendarDetail.holidays.length > 0 ? (
                    calendarDetail.holidays.map((h: HolidayItem) => (
                      <tr key={h.id} className="hover:bg-neutral-50/60 dark:hover:bg-neutral-800/30 transition-colors">
                        <td className="py-3 px-4 font-mono font-medium text-neutral-900 dark:text-white">
                          {formatHolidayDate(h.holiday_date)}
                        </td>
                        <td className="py-3 px-3 text-neutral-600 dark:text-neutral-400 font-medium">
                          {getDayName(h.holiday_date)}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-neutral-900 dark:text-white block">{h.holiday_name}</span>
                          {h.description && (
                            <span className="text-[11px] text-neutral-400 line-clamp-1">{h.description}</span>
                          )}
                        </td>
                        <td className="py-3 px-3">{renderTypeBadge(h.holiday_type, h.is_optional)}</td>
                        <td className="py-3 px-3">
                          {h.is_optional ? (
                            <span className="text-[11px] text-purple-600 dark:text-purple-400 font-medium">Floater</span>
                          ) : (
                            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Mandatory</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleOpenHolidayModal(h)}
                              disabled={isLocked}
                              className="p-1.5 text-neutral-500 hover:text-indigo-600 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors disabled:opacity-40"
                              title="Edit Holiday"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteHoliday(h)}
                              disabled={isLocked}
                              className="p-1.5 text-neutral-500 hover:text-red-600 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors disabled:opacity-40"
                              title="Delete Holiday"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-neutral-500 dark:text-neutral-400">
                        <Calendar className="w-8 h-8 mx-auto text-neutral-300 dark:text-neutral-600 mb-2" />
                        <p className="text-sm font-semibold">No holidays added yet</p>
                        <p className="text-xs text-neutral-400 mt-0.5">
                          Click "+ Add Holiday" or "Bulk Upload" to populate Year {calendarDetail.calendar_year || calendarDetail.year}.
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── TAB 2: WEEKLY OFF TAB ───────────────────────────────────────── */}
        {activeTab === 'weekly-off' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-neutral-900 dark:text-white">Weekly Off Patterns</h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Configure weekend holidays and alternate Saturday off rules for this calendar.
                </p>
              </div>

              <Button
                onClick={handleSaveWeeklyOff}
                disabled={isLocked || savingWeeklyOff}
                className="h-9 px-5 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm flex items-center gap-2"
              >
                {savingWeeklyOff ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Save Weekly Off Rules
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {WEEK_DAYS.map((day) => {
                const rule = weeklyOffRules[day];
                const isSat = day === 'Sat';

                return (
                  <div
                    key={day}
                    className={cn(
                      'p-4 rounded-2xl border transition-all space-y-3',
                      rule.enabled
                        ? 'bg-white dark:bg-neutral-900 border-indigo-200 dark:border-indigo-900/60 shadow-sm'
                        : 'bg-neutral-50/60 dark:bg-neutral-900/40 border-neutral-200 dark:border-neutral-800'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-3 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={rule.enabled}
                          disabled={isLocked}
                          onChange={(e) => {
                            setWeeklyOffRules((prev) => ({
                              ...prev,
                              [day]: { ...prev[day], enabled: e.target.checked },
                            }));
                          }}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-neutral-300 dark:border-neutral-700"
                        />
                        <div>
                          <span className="text-sm font-bold text-neutral-900 dark:text-white block">
                            {FULL_DAY_NAMES[day]}
                          </span>
                          <span className="text-[11px] text-neutral-400">
                            {rule.enabled ? 'Marked as Off' : 'Regular Working Day'}
                          </span>
                        </div>
                      </label>

                      {rule.enabled && (
                        <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl">
                          <button
                            type="button"
                            disabled={isLocked}
                            onClick={() =>
                              setWeeklyOffRules((prev) => ({
                                ...prev,
                                [day]: { ...prev[day], off_type: 'Full Day' },
                              }))
                            }
                            className={cn(
                              'px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all',
                              rule.off_type === 'Full Day'
                                ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm'
                                : 'text-neutral-500'
                            )}
                          >
                            Full Day
                          </button>
                          <button
                            type="button"
                            disabled={isLocked}
                            onClick={() =>
                              setWeeklyOffRules((prev) => ({
                                ...prev,
                                [day]: { ...prev[day], off_type: 'Half Day' },
                              }))
                            }
                            className={cn(
                              'px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all',
                              rule.off_type === 'Half Day'
                                ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm'
                                : 'text-neutral-500'
                            )}
                          >
                            Half Day
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Saturday Alternate Sub-rules */}
                    {isSat && rule.enabled && (
                      <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 space-y-2.5">
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                          <input
                            type="checkbox"
                            checked={rule.is_alternate}
                            disabled={isLocked}
                            onChange={(e) => {
                              setWeeklyOffRules((prev) => ({
                                ...prev,
                                Sat: {
                                  ...prev.Sat,
                                  is_alternate: e.target.checked,
                                  alternate_weeks: e.target.checked ? ['2', '4'] : [],
                                },
                              }));
                            }}
                            className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500"
                          />
                          Alternate Saturday Schedule (e.g. 2nd & 4th Saturday Off)
                        </label>

                        {rule.is_alternate && (
                          <div className="flex items-center gap-2 pl-5 pt-1">
                            {['1', '2', '3', '4', '5'].map((wNum) => {
                              const isSelected = rule.alternate_weeks.includes(wNum);
                              return (
                                <button
                                  key={wNum}
                                  type="button"
                                  disabled={isLocked}
                                  onClick={() => {
                                    const nextWeeks = isSelected
                                      ? rule.alternate_weeks.filter((w) => w !== wNum)
                                      : [...rule.alternate_weeks, wNum];
                                    setWeeklyOffRules((prev) => ({
                                      ...prev,
                                      Sat: { ...prev.Sat, alternate_weeks: nextWeeks },
                                    }));
                                  }}
                                  className={cn(
                                    'px-2.5 py-1 text-xs font-bold rounded-lg border transition-all',
                                    isSelected
                                      ? 'bg-indigo-600 text-white border-indigo-600'
                                      : 'bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400'
                                  )}
                                >
                                  {wNum === '1'
                                    ? '1st'
                                    : wNum === '2'
                                    ? '2nd'
                                    : wNum === '3'
                                    ? '3rd'
                                    : wNum === '4'
                                    ? '4th'
                                    : '5th'}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── TAB 3: ASSIGN TAB ───────────────────────────────────────────── */}
        {activeTab === 'assign' && (
          <div className="space-y-6">
            <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
              <div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white">Assign Calendar to Organizational Scope</h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Target specific branches, locations, or departments under this holiday policy.
                </p>
              </div>

              <form onSubmit={handleAssignCalendar} className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                {/* Location */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Location</Label>
                  <Select value={assignLocationId} onValueChange={setAssignLocationId}>
                    <SelectTrigger className="h-10 text-xs rounded-xl border-neutral-200 dark:border-neutral-800">
                      <SelectValue placeholder="All Locations" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Locations</SelectItem>
                      {locations.map((loc: any) => (
                        <SelectItem key={loc.id} value={String(loc.id)}>
                          {loc.name || loc.location_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Department */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Department</Label>
                  <Select value={assignDepartmentId} onValueChange={setAssignDepartmentId}>
                    <SelectTrigger className="h-10 text-xs rounded-xl border-neutral-200 dark:border-neutral-800">
                      <SelectValue placeholder="All Departments" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {departments.map((d: any) => (
                        <SelectItem key={d.id} value={String(d.id)}>
                          {d.name || d.department_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Submit */}
                <div className="flex items-end">
                  <Button
                    type="submit"
                    disabled={savingAssign}
                    className="h-10 w-full text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm flex items-center justify-center gap-2"
                  >
                    {savingAssign ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    Assign Scope
                  </Button>
                </div>
              </form>
            </div>

            {/* Assignments List */}
            <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden bg-white dark:bg-neutral-900 shadow-sm">
              <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 font-semibold text-xs text-neutral-900 dark:text-white">
                Active Calendar Scope Assignments
              </div>
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-4">Location</th>
                    <th className="py-2.5 px-4">Department</th>
                    <th className="py-2.5 px-4">Assigned At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {calendarDetail.assignments && calendarDetail.assignments.length > 0 ? (
                    calendarDetail.assignments.map((a: CalendarAssignment) => {
                      const locName = locations.find((l) => l.id === a.location_id)?.name || 'All Locations';
                      const deptName = departments.find((d) => d.id === a.department_id)?.name || 'All Departments';
                      return (
                        <tr key={a.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30">
                          <td className="py-3 px-4 font-medium text-neutral-900 dark:text-white">{locName}</td>
                          <td className="py-3 px-4 text-neutral-600 dark:text-neutral-400">{deptName}</td>
                          <td className="py-3 px-4 text-neutral-400 font-mono text-[11px]">
                            {a.assigned_at ? new Date(a.assigned_at).toLocaleDateString() : '—'}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-neutral-400 text-xs">
                        Applied across default global organization scope.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── ADD/EDIT HOLIDAY MODAL ──────────────────────────────────────── */}
        <Dialog open={isHolidayModalOpen} onOpenChange={(o) => !o && setIsHolidayModalOpen(false)}>
          <DialogContent className="sm:max-w-[480px] p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl">
            <DialogHeader className="pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <DialogTitle className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-500" />
                {holidayToEdit ? 'Edit Holiday' : 'Add Holiday'}
              </DialogTitle>
            </DialogHeader>

            {holidayError && (
              <div className="p-3 my-2 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 flex items-start gap-2.5 text-red-700 dark:text-red-300 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{holidayError}</span>
              </div>
            )}

            <form onSubmit={handleSaveHoliday} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  Holiday Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="e.g. Independence Day"
                  value={hName}
                  onChange={(e) => setHName(e.target.value)}
                  className="h-10 text-xs rounded-xl"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">
                    Date (YYYY-MM-DD) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="date"
                    value={hDate}
                    onChange={(e) => setHDate(e.target.value)}
                    className="h-10 text-xs rounded-xl"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Category</Label>
                  <Select value={hType} onValueChange={setHType}>
                    <SelectTrigger className="h-10 text-xs rounded-xl">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {HOLIDAY_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="opt-holiday"
                  checked={hIsOptional}
                  onChange={(e) => setHIsOptional(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
                <Label htmlFor="opt-holiday" className="text-xs font-semibold cursor-pointer">
                  Optional / Floater Holiday (Employee choice)
                </Label>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  Description <span className="text-neutral-400 font-normal text-[11px]">(Optional)</span>
                </Label>
                <Input
                  placeholder="e.g. National holiday observing sovereignty"
                  value={hDescription}
                  onChange={(e) => setHDescription(e.target.value)}
                  className="h-10 text-xs rounded-xl"
                />
              </div>

              <DialogFooter className="pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <Button type="button" variant="outline" onClick={() => setIsHolidayModalOpen(false)} className="h-9 px-4 text-xs font-semibold rounded-xl">
                  Cancel
                </Button>
                <Button type="submit" disabled={savingHoliday} className="h-9 px-5 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
                  {savingHoliday ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : holidayToEdit ? 'Save Changes' : 'Add Holiday'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* ─── BULK IMPORT MODAL (EXCEL / CSV / PDF) ─────────────────────── */}
        <BulkHolidayImportModal
          isOpen={isBulkModalOpen}
          onClose={() => setIsBulkModalOpen(false)}
          calendarId={selectedCalendarId}
          calendarYear={calendarDetail.calendar_year || calendarDetail.year || currentYear}
          calendarName={calendarDetail.calendar_name || calendarDetail.name}
          onSuccess={() => {
            fetchCalendarDetail(selectedCalendarId);
            fetchCalendars();
          }}
        />

        {/* ─── PUBLISH CONFIRM MODAL ──────────────────────────────────────── */}
        <Dialog open={isPublishConfirmOpen} onOpenChange={setIsPublishConfirmOpen}>
          <DialogContent className="sm:max-w-[420px] p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl">
            <DialogHeader className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <DialogTitle className="text-base font-bold text-neutral-900 dark:text-white">
                Publish Holiday Calendar?
              </DialogTitle>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                Publishing this calendar locks the holiday policy and makes it effective for all targeted employees and attendance cycles.
              </p>
            </DialogHeader>

            <DialogFooter className="pt-4 gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setIsPublishConfirmOpen(false)} className="h-9 px-4 text-xs font-semibold rounded-xl">
                Cancel
              </Button>
              <Button onClick={handlePublishCalendar} disabled={publishing} className="h-9 px-5 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm">
                {publishing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Confirm & Publish'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Calendar Definition Modal */}
        <CreateHolidayCalendarModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          calendarToEdit={calendarToEdit}
          onSuccess={() => {
            fetchCalendarDetail(selectedCalendarId);
            fetchCalendars();
          }}
        />
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER: CALENDARS LIST VIEW
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-neutral-900 dark:text-white">Holiday Calendars Master</h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Configure official yearly holiday schedules, weekly offs, and regional calendars across organization.
          </p>
        </div>

        <Button
          onClick={() => handleOpenCreateModal(null)}
          className="h-10 px-4 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Calendar
        </Button>
      </div>

      {/* ─── FILTER BAR ────────────────────────────────────────────────────── */}
      <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-neutral-400" />
            <Input
              placeholder="Search by calendar name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 pl-9 text-xs rounded-xl border-neutral-200 dark:border-neutral-800"
            />
          </div>

          {/* Company Filter */}
          <Select value={filterCompany} onValueChange={setFilterCompany}>
            <SelectTrigger className="h-9 text-xs rounded-xl border-neutral-200 dark:border-neutral-800">
              <SelectValue placeholder="All Companies" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Companies</SelectItem>
              {companies.map((c: any) => (
                <SelectItem key={c.company_id || c.id} value={String(c.company_id || c.id)}>
                  {c.name || c.company_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Location Filter */}
          <Select value={filterLocation} onValueChange={setFilterLocation}>
            <SelectTrigger className="h-9 text-xs rounded-xl border-neutral-200 dark:border-neutral-800">
              <SelectValue placeholder="All Locations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              {locations.map((loc: any) => (
                <SelectItem key={loc.id} value={String(loc.id)}>
                  {loc.name || loc.location_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Year Filter */}
          <Select value={filterYear} onValueChange={setFilterYear}>
            <SelectTrigger className="h-9 text-xs rounded-xl border-neutral-200 dark:border-neutral-800">
              <SelectValue placeholder="All Years" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              {[currentYear - 1, currentYear, currentYear + 1, currentYear + 2].map((yr) => (
                <SelectItem key={yr} value={String(yr)}>
                  Year {yr}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-9 text-xs rounded-xl border-neutral-200 dark:border-neutral-800">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="Draft">Draft</SelectItem>
              <SelectItem value="Published">Published</SelectItem>
              <SelectItem value="Archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ─── CALENDARS TABLE ───────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden bg-white dark:bg-neutral-900 shadow-sm">
        <table className="w-full text-left text-xs">
          <thead className="bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 font-semibold uppercase tracking-wider text-[10px]">
            <tr>
              <th className="py-3.5 px-4">Calendar Name</th>
              <th className="py-3.5 px-3">Year</th>
              <th className="py-3.5 px-4">Company</th>
              <th className="py-3.5 px-3">Region / Location</th>
              <th className="py-3.5 px-3">Status</th>
              <th className="py-3.5 px-3">Holidays</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {loadingList ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-neutral-500">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-500 mb-2" />
                  Loading holiday calendars...
                </td>
              </tr>
            ) : filteredCalendars.length > 0 ? (
              filteredCalendars.map((cal) => {
                const compName = companies.find((c) => (c.company_id || c.id) === cal.company_id)?.name || 'All Companies';
                const locName = locations.find((l) => l.id === cal.location_id)?.name || 'All Locations';
                const yearVal = cal.calendar_year || cal.year;

                return (
                  <tr
                    key={cal.id}
                    onClick={() => setSelectedCalendarId(cal.id)}
                    className="hover:bg-neutral-50/70 dark:hover:bg-neutral-800/30 transition-colors cursor-pointer group"
                  >
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-neutral-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {cal.calendar_name || cal.name}
                      </div>
                      {cal.description && (
                        <div className="text-[11px] text-neutral-400 line-clamp-1 mt-0.5">{cal.description}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-3 font-mono font-medium text-neutral-700 dark:text-neutral-300">
                      {yearVal}
                    </td>
                    <td className="py-3.5 px-4 text-neutral-600 dark:text-neutral-400">{compName}</td>
                    <td className="py-3.5 px-3 text-neutral-600 dark:text-neutral-400">{locName}</td>
                    <td className="py-3.5 px-3">{renderStatusBadge(cal.status)}</td>
                    <td className="py-3.5 px-3">
                      <span className="font-bold text-neutral-900 dark:text-white">
                        {cal.total_holidays ?? cal.holidays_count ?? 0}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedCalendarId(cal.id)}
                          className="h-8 px-2.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg"
                        >
                          View & Manage
                        </Button>

                        {cal.status === 'Draft' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedCalendarId(cal.id);
                              setIsPublishConfirmOpen(true);
                            }}
                            className="h-8 px-2 text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg"
                            title="Publish Calendar"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </Button>
                        )}

                        <button
                          onClick={() => handleOpenCreateModal(cal)}
                          className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-white rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => setCalendarToDelete(cal)}
                          className="p-1.5 text-neutral-400 hover:text-red-600 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} className="py-14 text-center text-neutral-500">
                  <Calendar className="w-8 h-8 mx-auto text-neutral-300 dark:text-neutral-600 mb-2" />
                  <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">No holiday calendars found</p>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Click "+ Create Calendar" to set up a new yearly holiday policy.
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ─── CREATE / EDIT MODAL ────────────────────────────────────────────── */}
      <CreateHolidayCalendarModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        calendarToEdit={calendarToEdit}
        onSuccess={() => {
          fetchCalendars();
        }}
      />

      {/* ─── DELETE CONFIRM MODAL ──────────────────────────────────────────── */}
      <Dialog open={!!calendarToDelete} onOpenChange={(o) => !o && setCalendarToDelete(null)}>
        <DialogContent className="sm:max-w-[420px] p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl">
          <DialogHeader className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center">
              <Trash2 className="w-5 h-5" />
            </div>
            <DialogTitle className="text-base font-bold text-neutral-900 dark:text-white">
              Delete Holiday Calendar?
            </DialogTitle>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
              Are you sure you want to delete{' '}
              <strong className="text-neutral-800 dark:text-neutral-200">
                "{calendarToDelete?.calendar_name || calendarToDelete?.name}"
              </strong>
              ? This action will permanently remove all associated holidays and weekly off rules.
            </p>
          </DialogHeader>

          <DialogFooter className="pt-4 gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setCalendarToDelete(null)} className="h-9 px-4 text-xs font-semibold rounded-xl">
              Cancel
            </Button>
            <Button onClick={handleDeleteCalendar} disabled={deletingCalendar} className="h-9 px-5 text-xs font-semibold rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-sm">
              {deletingCalendar ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Delete Calendar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
