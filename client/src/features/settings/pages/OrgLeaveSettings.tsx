import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import { ArrowLeft, Save, Calendar, Clock, MapPin, AlertCircle, CheckCircle2, Plus, Trash2, X, ChevronUp, ChevronDown, Check, Edit } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

interface WeeklyWorkDay {
  is_working: boolean;
  start?: string;
  end?: string;
}

type WeeklyWorkPattern = Record<string, WeeklyWorkDay>;

interface Location {
  id: number;
  uuid: string;
  name: string;
  code: string;
}

export function OrgLeaveSettings() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [companyName, setCompanyName] = useState<string>('');
  const [selectedLocationUuid, setSelectedLocationUuid] = useState<string>(''); // empty means Org-Wide

  // Settings Form State
  const [id, setId] = useState<string | null>(null);
  const [normalWorkingHoursDaily, setNormalWorkingHoursDaily] = useState<number>(9);
  const [fullTimeHours, setFullTimeHours] = useState<number>(8);
  const [holidayYearStartMonth, setHolidayYearStartMonth] = useState<number>(4);
  const [maxConsecutiveAnnualLeaveDays, setMaxConsecutiveAnnualLeaveDays] = useState<string>('');

  // Leave Year Setting States
  const [leaveApplicationStartDay, setLeaveApplicationStartDay] = useState<number | ''>(1);
  const [leaveApplicationStartMonth, setLeaveApplicationStartMonth] = useState<number | ''>('');
  const [defaultLeaveMonth, setDefaultLeaveMonth] = useState<number | ''>('');
  const [allOrgSettings, setAllOrgSettings] = useState<any[]>([]);

  // Modal states for Holiday Year Setting / Leave Year Setting
  const [isHolidayMonthModalOpen, setIsHolidayMonthModalOpen] = useState(false);
  const [isLeaveYearModalOpen, setIsLeaveYearModalOpen] = useState(false);
  const [isLeaveWeekModalOpen, setIsLeaveWeekModalOpen] = useState(false);
  const [modalSelectedLocations, setModalSelectedLocations] = useState<string[]>([]);
  const [modalSelectedMonth, setModalSelectedMonth] = useState<number>(4);
  const [modalSelectedLeaveMonth, setModalSelectedLeaveMonth] = useState<number>(1);
  const [modalSelectedWeekDay, setModalSelectedWeekDay] = useState<string>('Monday');
  const [isModalLocationExpanded, setIsModalLocationExpanded] = useState(true);

  // Advanced Policy Settings State
  const [leaveClubbingRules, setLeaveClubbingRules] = useState<any[]>([{ leaveTypes: [], maxDays: 0 }]);
  const [leaveRestrictionRules, setLeaveRestrictionRules] = useState<any[]>([{ allowLeaveType: '', whenLeaveTypes: [], numDays: '' }]);
  const [defaultWeekDay, setDefaultWeekDay] = useState<string>('');
  const [disableLeaveApplicationReminder, setDisableLeaveApplicationReminder] = useState<boolean>(false);
  const [showPopupOnWeekOffOrHoliday, setShowPopupOnWeekOffOrHoliday] = useState<boolean>(false);
  const [leaveApplicationDateRestriction, setLeaveApplicationDateRestriction] = useState<boolean>(false);
  const [enableBackupPerson, setEnableBackupPerson] = useState<boolean>(true);

  // Reference Data
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);

  const [workPattern, setWorkPattern] = useState<WeeklyWorkPattern>({
    sunday: { is_working: false },
    monday: { is_working: true, start: '09:00', end: '18:00' },
    tuesday: { is_working: true, start: '09:00', end: '18:00' },
    wednesday: { is_working: true, start: '09:00', end: '18:00' },
    thursday: { is_working: true, start: '09:00', end: '18:00' },
    friday: { is_working: true, start: '09:00', end: '18:00' },
    saturday: { is_working: false },
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Month list helper
  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];

  const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

  // Load locations list
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        let orgName = 'Organization';
        let orgLoc = '';
        try {
          const compRes = await apiClient.get('/settings/company-profile');
          if (compRes.data && compRes.data.success) {
            orgName = compRes.data.data.company_name;
            orgLoc = compRes.data.data.location || compRes.data.data.address_line1 || '';
            setCompanyName(orgName);
          }
        } catch (e) {
          console.error("Failed to load company profile", e);
        }

        let res = await apiClient.get('/settings/locations?pageSize=100');
        let list = res.data?.data || res.data?.data?.items || [];
        if (!Array.isArray(list) || list.length === 0) {
          const fallbackLocName = orgLoc || orgName;
          list = [{ uuid: 'org-location-default', name: fallbackLocName, code: 'HQ' }];
        }
        if (Array.isArray(list)) {
          const normalized = list.map((loc: any) => ({
            ...loc,
            name: loc.name || loc.locationName || loc.location_name || 'Unknown Location',
            code: loc.code || loc.locationCode || 'HQ',
            uuid: loc.uuid || 'org-location-default'
          }));
          setLocations(normalized);
        }
      } catch (err) {
        console.error('Failed to load locations', err);
      }
    };

    const fetchLeaveTypes = async () => {
      try {
        const res = await apiClient.get('/settings/leave-types');
        if (res.data && res.data.success) {
          setLeaveTypes(res.data.data || []);
        }
      } catch (err) {
        console.error('Failed to load leave types', err);
      }
    };

    fetchLocations();
    fetchLeaveTypes();
  }, []);

  // Fetch settings for selected location
  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      setMessage(null);
      try {
        const res = await apiClient.get('/settings/org-leave-settings');
        if (res.data && res.data.success) {
          const allSettings = res.data.data || [];
          setAllOrgSettings(allSettings);
          const isDefaultLoc = (locId: string | null | undefined) =>
            !locId || locId === '' || locId === 'org-location-default' || locId === 'all';

          // Find matching row
          const matched = allSettings.find((row: any) => {
            if (isDefaultLoc(selectedLocationUuid)) {
              return isDefaultLoc(row.location_id);
            }
            return row.location_id === selectedLocationUuid;
          });

          if (matched) {
            setId(matched.id);
            setNormalWorkingHoursDaily(parseFloat(matched.normal_working_hours_daily || matched.normalWorkingHoursDaily) || 9);
            setFullTimeHours(parseFloat(matched.full_time_hours || matched.fullTimeHours) || 8);
            setHolidayYearStartMonth(parseInt(matched.holiday_year_start_month || matched.holidayYearStartMonth) || 4);

            const maxConsecDays = matched.max_consecutive_annual_leave_days !== undefined && matched.max_consecutive_annual_leave_days !== null
              ? matched.max_consecutive_annual_leave_days
              : matched.maxConsecutiveAnnualLeaveDays;
            setMaxConsecutiveAnnualLeaveDays(maxConsecDays?.toString() || '');

            const startDayVal = matched.leave_application_start_day !== undefined && matched.leave_application_start_day !== null
              ? matched.leave_application_start_day
              : matched.leaveApplicationStartDay;
            setLeaveApplicationStartDay(startDayVal !== undefined && startDayVal !== null ? parseInt(startDayVal) : 1);

            const startMonthVal = matched.leave_application_start_month !== undefined && matched.leave_application_start_month !== null
              ? matched.leave_application_start_month
              : matched.leaveApplicationStartMonth;
            setLeaveApplicationStartMonth(startMonthVal !== undefined && startMonthVal !== null && startMonthVal !== '' ? parseInt(startMonthVal) : '');

            const defaultLeaveMonthVal = matched.default_leave_month !== undefined && matched.default_leave_month !== null
              ? matched.default_leave_month
              : matched.defaultLeaveMonth;
            setDefaultLeaveMonth(defaultLeaveMonthVal !== undefined && defaultLeaveMonthVal !== null && defaultLeaveMonthVal !== '' ? parseInt(defaultLeaveMonthVal) : '');

            let pattern = matched.weekly_work_pattern || matched.weeklyWorkPattern;
            if (typeof pattern === 'string') {
              try { pattern = JSON.parse(pattern); } catch (e) { pattern = null; }
            }
            if (pattern) {
              setWorkPattern(pattern);
            }

            let clubbingRules = matched.leave_clubbing_rules || matched.leaveClubbingRules || [];
            if (typeof clubbingRules === 'string') {
              try { clubbingRules = JSON.parse(clubbingRules); } catch (e) { clubbingRules = []; }
            }
            const clubbingArray = Array.isArray(clubbingRules) ? clubbingRules : [];
            setLeaveClubbingRules(clubbingArray);

            let restrictionRules = matched.leave_restriction_rules || matched.leaveRestrictionRules || [];
            if (typeof restrictionRules === 'string') {
              try { restrictionRules = JSON.parse(restrictionRules); } catch (e) { restrictionRules = []; }
            }
            const restrictionArray = Array.isArray(restrictionRules) ? restrictionRules : [];
            setLeaveRestrictionRules(restrictionArray);
            setDefaultWeekDay(matched.default_week_day || matched.defaultWeekDay || '');

            const disableReminder = matched.disable_leave_application_reminder !== undefined && matched.disable_leave_application_reminder !== null
              ? matched.disable_leave_application_reminder
              : matched.disableLeaveApplicationReminder;
            setDisableLeaveApplicationReminder(!!disableReminder);

            const showPopup = matched.show_popup_on_week_off_or_holiday !== undefined && matched.show_popup_on_week_off_or_holiday !== null
              ? matched.show_popup_on_week_off_or_holiday
              : matched.showPopupOnWeekOffOrHoliday;
            setShowPopupOnWeekOffOrHoliday(!!showPopup);

            const dateRestriction = matched.leave_application_date_restriction !== undefined && matched.leave_application_date_restriction !== null
              ? matched.leave_application_date_restriction
              : matched.leaveApplicationDateRestriction;
            setLeaveApplicationDateRestriction(!!dateRestriction);

            const backupPersonOpt = matched.enable_backup_person !== undefined && matched.enable_backup_person !== null
              ? matched.enable_backup_person
              : matched.enableBackupPerson;
            setEnableBackupPerson(backupPersonOpt !== undefined && backupPersonOpt !== null ? !!backupPersonOpt : true);
          } else {
            // Reset to defaults
            setId(null);
            setNormalWorkingHoursDaily(9);
            setFullTimeHours(8);
            setHolidayYearStartMonth(4);
            setMaxConsecutiveAnnualLeaveDays('');
            setLeaveApplicationStartDay(1);
            setLeaveApplicationStartMonth('');
            setDefaultLeaveMonth('');
            setWorkPattern({
              sunday: { is_working: false },
              monday: { is_working: true, start: '09:00', end: '18:00' },
              tuesday: { is_working: true, start: '09:00', end: '18:00' },
              wednesday: { is_working: true, start: '09:00', end: '18:00' },
              thursday: { is_working: true, start: '09:00', end: '18:00' },
              friday: { is_working: true, start: '09:00', end: '18:00' },
              saturday: { is_working: false },
            });
            setLeaveClubbingRules([]);
            setLeaveRestrictionRules([]);
            setDefaultWeekDay('');
            setDisableLeaveApplicationReminder(false);
            setShowPopupOnWeekOffOrHoliday(false);
            setLeaveApplicationDateRestriction(false);
            setEnableBackupPerson(true);
          }
        }
      } catch (err) {
        console.error('Failed to load leave settings', err);
        setMessage({ type: 'error', text: 'Error loading configurations.' });
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, [selectedLocationUuid]);

  const handleDayToggle = (day: string) => {
    setWorkPattern((prev) => {
      const current = prev[day];
      return {
        ...prev,
        [day]: current.is_working
          ? { is_working: false }
          : { is_working: true, start: '09:00', end: '18:00' },
      };
    });
  };

  const handleTimeChange = (day: string, field: 'start' | 'end', value: string) => {
    setWorkPattern((prev) => {
      const current = prev[day];
      return {
        ...prev,
        [day]: {
          ...current,
          [field]: value,
        },
      };
    });
  };

  const handleSave = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    // Validate times
    for (const day of daysOfWeek) {
      const d = workPattern[day];
      if (d.is_working && (!d.start || !d.end)) {
        const errMsg = `Please specify start and end times for ${day}.`;
        toast.error(errMsg);
        setMessage({ type: 'error', text: errMsg });
        setIsSaving(false);
        return;
      }
    }

    // Validate Leave Year Setting
    if (!leaveApplicationStartDay) {
      const errMsg = 'Please specify a Leave Application Start Day.';
      toast.error(errMsg);
      setMessage({ type: 'error', text: errMsg });
      setIsSaving(false);
      return;
    }
    if (String(leaveApplicationStartMonth) === '') {
      const errMsg = 'Please select a Month for Leave Year Setting.';
      toast.error(errMsg);
      setMessage({ type: 'error', text: errMsg });
      setIsSaving(false);
      return;
    }
    if (String(defaultLeaveMonth) === '') {
      const errMsg = 'Please select a Default Leave Month.';
      toast.error(errMsg);
      setMessage({ type: 'error', text: errMsg });
      setIsSaving(false);
      return;
    }

    // Validate Leave Week Setting
    if (!defaultWeekDay || String(defaultWeekDay) === '') {
      const errMsg = 'Please select a Default Week Day.';
      toast.error(errMsg);
      setMessage({ type: 'error', text: errMsg });
      setIsSaving(false);
      return;
    }

    // Validate Leave Clubbing Rules
    for (let i = 0; i < leaveClubbingRules.length; i++) {
      const rule = leaveClubbingRules[i];
      if (!rule.leaveTypes || rule.leaveTypes.length < 2) {
        const errMsg = `Leave Clubbing (Rule ${i + 1}): Please select at least two leaves to combine.`;
        toast.error(errMsg);
        setMessage({ type: 'error', text: errMsg });
        setIsSaving(false);
        return;
      }
      if (!rule.maxDays || rule.maxDays <= 0) {
        const errMsg = `Leave Clubbing (Rule ${i + 1}): Please specify a valid maximum number of days.`;
        toast.error(errMsg);
        setMessage({ type: 'error', text: errMsg });
        setIsSaving(false);
        return;
      }
    }

    // Validate Leave Restriction Rules
    for (let i = 0; i < leaveRestrictionRules.length; i++) {
      const rule = leaveRestrictionRules[i];
      if (!rule.allowLeaveType || !rule.whenLeaveTypes || rule.whenLeaveTypes.length === 0 || !rule.numDays || parseFloat(rule.numDays) <= 0) {
        const errMsg = `Leave Restriction Policy (Rule ${i + 1}): Please completely fill out the rule (Allow leave, when leaves, and valid number of days).`;
        toast.error(errMsg);
        setMessage({ type: 'error', text: errMsg });
        setIsSaving(false);
        return;
      }
    }

    try {
      const payload = {
        locationId: selectedLocationUuid || null,
        normalWorkingHoursDaily,
        fullTimeHours,
        weeklyWorkPattern: workPattern,
        holidayYearStartMonth,
        maxConsecutiveAnnualLeaveDays: maxConsecutiveAnnualLeaveDays ? parseFloat(maxConsecutiveAnnualLeaveDays) : null,
        leaveClubbingRules: leaveClubbingRules,
        leaveRestrictionRules: leaveRestrictionRules,
        defaultWeekDay,
        disableLeaveApplicationReminder,
        showPopupOnWeekOffOrHoliday,
        leaveApplicationDateRestriction,
        enableBackupPerson,
        leaveApplicationStartDay: String(leaveApplicationStartDay) !== '' ? leaveApplicationStartDay : 1,
        leaveApplicationStartMonth: String(leaveApplicationStartMonth) !== '' ? leaveApplicationStartMonth : null,
        defaultLeaveMonth: String(defaultLeaveMonth) !== '' ? defaultLeaveMonth : null
      };

      const res = await apiClient.post('/settings/org-leave-settings', payload);
      if (res.data && res.data.success) {
        toast.success('Leave settings saved successfully.');
        setMessage({ type: 'success', text: 'Leave settings saved successfully.' });
        if (res.data.data?.id) {
          setId(res.data.data.id);
        }
      } else {
        const errorMsg = res.data?.message || 'Failed to save settings.';
        toast.error(errorMsg);
        setMessage({ type: 'error', text: errorMsg });
      }
    } catch (err: any) {
      console.error(err);
      const errorMsg = err.response?.data?.message || 'Error occurred while saving configurations.';
      toast.error(errorMsg);
      setMessage({ type: 'error', text: errorMsg });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleSelectAllLocations = () => {
    const allSelected = locations.length > 0 && modalSelectedLocations.length === locations.length;
    if (allSelected) {
      setModalSelectedLocations([]);
    } else {
      setModalSelectedLocations(locations.map(loc => loc.uuid));
    }
  };

  const handleSaveHolidayMonthSetting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (modalSelectedLocations.length === 0) {
      toast.error("Please select at least one location");
      return;
    }
    setIsSaving(true);
    try {
      // Loop through each selected location and upsert
      const resGet = await apiClient.get('/settings/org-leave-settings');
      const allSettings = resGet.data?.data || [];

      for (const locUuid of modalSelectedLocations) {
        const matched = allSettings.find((row: any) => row.location_id === locUuid);

        const payload = {
          locationId: locUuid || null,
          holidayYearStartMonth: modalSelectedMonth
        };

        await apiClient.post('/settings/org-leave-settings', payload);
      }

      toast.success("Holiday year month setting saved successfully for selected locations.");

      // Refresh settings table list
      const resRefresh = await apiClient.get('/settings/org-leave-settings');
      if (resRefresh.data && resRefresh.data.success) {
        setAllOrgSettings(resRefresh.data.data || []);
      }

      if (modalSelectedLocations.includes(selectedLocationUuid)) {
        setHolidayYearStartMonth(modalSelectedMonth);
      }
      setIsHolidayMonthModalOpen(false);
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to save holiday month setting.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveLeaveYearSetting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (modalSelectedLocations.length === 0) {
      toast.error("Please select at least one location");
      return;
    }
    setIsSaving(true);
    try {
      const resGet = await apiClient.get('/settings/org-leave-settings');
      const allSettings = resGet.data?.data || [];

      for (const locUuid of modalSelectedLocations) {
        const matched = allSettings.find((row: any) => row.location_id === locUuid);

        const payload = {
          locationId: locUuid || null,
          leaveApplicationStartMonth: modalSelectedLeaveMonth
        };

        await apiClient.post('/settings/org-leave-settings', payload);
      }

      toast.success("Leave year month setting saved successfully for selected locations.");

      const resRefresh = await apiClient.get('/settings/org-leave-settings');
      if (resRefresh.data && resRefresh.data.success) {
        setAllOrgSettings(resRefresh.data.data || []);
      }

      if (modalSelectedLocations.includes(selectedLocationUuid)) {
        setLeaveApplicationStartMonth(modalSelectedLeaveMonth);
      }
      setIsLeaveYearModalOpen(false);
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to save leave year setting.");
    } finally {
      setIsSaving(false);
    }
  };

  // Save Leave Week Setting per location
  const handleSaveLeaveWeekSetting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (modalSelectedLocations.length === 0) {
      toast.error("Please select at least one location");
      return;
    }
    setIsSaving(true);
    try {
      const resGet = await apiClient.get('/settings/org-leave-settings');
      const allSettings = resGet.data?.data || [];

      for (const locUuid of modalSelectedLocations) {
        const matched = allSettings.find((row: any) => row.location_id === locUuid);

        const payload = {
          locationId: locUuid || null,
          defaultWeekDay: modalSelectedWeekDay
        };

        await apiClient.post('/settings/org-leave-settings', payload);
      }

      toast.success("Leave week setting saved successfully for selected locations.");

      const resRefresh = await apiClient.get('/settings/org-leave-settings');
      if (resRefresh.data && resRefresh.data.success) {
        setAllOrgSettings(resRefresh.data.data || []);
      }

      if (modalSelectedLocations.includes(selectedLocationUuid)) {
        setDefaultWeekDay(modalSelectedWeekDay);
      }
      setIsLeaveWeekModalOpen(false);
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to save leave week setting.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          to="/settings/leave-policies"
          className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Organization Leave Settings</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Configure default working hours, holiday cycles, and weekly work patterns across locations.
          </p>
        </div>
      </div>

      {/* Message Banner */}
      {message && (
        <div
          className={`flex items-center gap-3 p-4 rounded-xl mb-6 shadow-sm border ${message.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-900 dark:text-emerald-300'
              : 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/20 dark:border-rose-900 dark:text-rose-300'
            }`}
        >
          {message.type === 'success' ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
          <span className="text-sm font-medium">{message.text}</span>
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          <span className="mt-4 text-sm text-gray-500 dark:text-gray-400 font-medium">Loading settings...</span>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-8">
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-850 rounded-2xl p-6 shadow-sm space-y-8">
            {/* Header */}
            <div className="flex items-center gap-2 pb-4 border-b border-gray-50 dark:border-gray-800">
              <span className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <span className="text-indigo-600 text-2xl font-black">+</span> LEAVE POLICY SETTINGS
              </span>
            </div>

            {/* Leave Clubbing */}
            <div className="mb-6">
              <fieldset className="border border-gray-200 dark:border-gray-755 rounded-xl p-5 bg-[#f9f9f9] dark:bg-gray-850/30 relative">
                <legend className="text-xs font-bold px-2.5 py-1 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md">Leave Clubbing</legend>
                <div className="space-y-4">
                  {leaveClubbingRules.map((rule, idx) => (
                    <div key={idx} className="space-y-3 pb-4 mb-4 border-b border-gray-200 dark:border-gray-700 last:border-0 last:mb-0 last:pb-0 relative">
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{idx + 1}) Please specify which leave can be taken together:</p>
                      <div className="flex flex-wrap gap-4 mt-2">
                        {leaveTypes.map(lt => (
                          <label key={lt.id} className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                              checked={rule.leaveTypes?.includes(lt.leave_name || lt.leaveName)}
                              onChange={(e) => {
                                const newRules = [...leaveClubbingRules];
                                if (!newRules[idx].leaveTypes) newRules[idx].leaveTypes = [];
                                if (e.target.checked) {
                                  newRules[idx].leaveTypes.push(lt.leave_name || lt.leaveName);
                                } else {
                                  newRules[idx].leaveTypes = newRules[idx].leaveTypes.filter((t: string) => t !== (lt.leave_name || lt.leaveName));
                                }
                                setLeaveClubbingRules(newRules);
                              }}
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">{lt.leave_name || lt.leaveName}</span>
                          </label>
                        ))}
                      </div>
                      <div className="flex flex-col gap-1.5 mt-4">
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                          Combine Maximum Days <span className="text-red-500">*</span>
                        </span>
                        <input type="number" className="w-full max-w-[300px] px-3 py-1.5 border border-gray-250 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-sm"
                          value={rule.maxDays || ''}
                          onChange={(e) => {
                            const newRules = [...leaveClubbingRules];
                            newRules[idx].maxDays = parseFloat(e.target.value) || 0;
                            setLeaveClubbingRules(newRules);
                          }}
                          required
                        />
                      </div>
                      <button type="button" onClick={() => setLeaveClubbingRules(leaveClubbingRules.filter((_, i) => i !== idx))} className="absolute top-0 right-0 p-1 text-gray-400 hover:text-red-500 transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}

                  <div className="flex justify-end mt-2">
                    <button type="button" onClick={() => setLeaveClubbingRules([...leaveClubbingRules, { leaveTypes: [], maxDays: 0 }])} className="text-blue-600 dark:text-blue-400 text-xs font-semibold hover:underline flex items-center gap-1">
                      <span className="text-sm font-black">+</span>Add more
                    </button>
                  </div>
                </div>
              </fieldset>

              <div className="flex items-center gap-4 mt-4">
                <button
                  type="button"
                  onClick={handleSave}
                  className="bg-[#00a65a] hover:bg-[#008d4c] text-white text-xs font-bold h-9 px-4 rounded flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="h-4.5 w-4.5" /> Add
                </button>
                <Link
                  to="/settings/leave-policies"
                  className="bg-[#d9534f] hover:bg-[#c9302c] text-white text-xs font-bold h-9 px-4 rounded flex items-center gap-1.5 shadow-sm"
                >
                  <X className="h-4.5 w-4.5" /> Cancel
                </Link>
              </div>
            </div>

            {/* Leave Restriction Policy */}
            <div className="mb-6">
              <fieldset className="border border-gray-200 dark:border-gray-750 rounded-xl p-5 bg-[#f9f9f9] dark:bg-gray-850/30 relative">
                <legend className="text-xs font-bold px-2.5 py-1 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-850 border border-gray-200 dark:border-gray-700 rounded-md">Leave Restriction Policy</legend>
                <div className="space-y-4">
                  {leaveRestrictionRules.map((rule, idx) => (
                    <div key={idx} className="space-y-3 pb-4 mb-4 border-b border-gray-200 dark:border-gray-700 last:border-0 last:mb-0 last:pb-0 relative">
                      <div className="flex items-center gap-3">
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{idx + 1}) Allow</p>
                        <select
                          className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-sm font-semibold"
                          value={rule.allowLeaveType || ''}
                          onChange={(e) => {
                            const newRules = [...leaveRestrictionRules];
                            newRules[idx].allowLeaveType = e.target.value;
                            setLeaveRestrictionRules(newRules);
                          }}
                        >
                          <option value="">Choose</option>
                          {leaveTypes.map(lt => (
                            <option key={lt.id} value={lt.leave_name || lt.leaveName}>{lt.leave_name || lt.leaveName}</option>
                          ))}
                        </select>
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">when</p>
                      </div>
                      <div className="flex flex-wrap gap-4 mt-2">
                        {leaveTypes.map(lt => (
                          <label key={lt.id} className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                              checked={rule.whenLeaveTypes?.includes(lt.leave_name || lt.leaveName)}
                              onChange={(e) => {
                                const newRules = [...leaveRestrictionRules];
                                if (!newRules[idx].whenLeaveTypes) newRules[idx].whenLeaveTypes = [];
                                if (e.target.checked) {
                                  newRules[idx].whenLeaveTypes.push(lt.leave_name || lt.leaveName);
                                } else {
                                  newRules[idx].whenLeaveTypes = newRules[idx].whenLeaveTypes.filter((t: string) => t !== (lt.leave_name || lt.leaveName));
                                }
                                setLeaveRestrictionRules(newRules);
                              }}
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">{lt.leave_name || lt.leaveName}</span>
                          </label>
                        ))}
                      </div>
                      <div className="flex flex-col gap-1.5 mt-4">
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                          <span className="text-red-500">*</span>Number of leave days is
                        </span>
                        <input
                          type="number"
                          className="w-full max-w-[300px] px-3 py-1.5 border border-gray-250 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-sm"
                          value={rule.numDays || ''}
                          onChange={(e) => {
                            const newRules = [...leaveRestrictionRules];
                            newRules[idx].numDays = e.target.value;
                            setLeaveRestrictionRules(newRules);
                          }}
                          required
                        />
                      </div>
                      <button type="button" onClick={() => setLeaveRestrictionRules(leaveRestrictionRules.filter((_, i) => i !== idx))} className="absolute top-0 right-0 p-1 text-gray-400 hover:text-red-500 transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}

                  <div className="flex justify-end mt-2">
                    <button type="button" onClick={() => setLeaveRestrictionRules([...leaveRestrictionRules, { allowLeaveType: '', whenLeaveTypes: [], numDays: '' }])} className="text-blue-600 dark:text-blue-400 text-xs font-semibold hover:underline flex items-center gap-1">
                      <span className="text-sm font-black">+</span>Add more
                    </button>
                  </div>
                </div>
              </fieldset>

              <div className="flex items-center gap-3 mt-4">
                <button
                  type="button"
                  onClick={handleSave}
                  className="bg-[#00a65a] hover:bg-[#008d4c] text-white text-xs font-bold h-9 px-4 rounded flex items-center justify-center shadow-sm"
                >
                  Save
                </button>
              </div>
            </div>

            {/* Leave Year Setting */}
            <div className="mb-6">
              <fieldset className="border border-gray-200 dark:border-gray-750 rounded-xl p-5 bg-[#f9f9f9] dark:bg-gray-850/30 relative">
                <legend className="text-xs font-bold px-2.5 py-1 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md">Leave Year Setting</legend>
                <div className="space-y-4">

                  {/* Leave Application Start Day */}
                  <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-4">
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-250">
                      Leave Application Start Day:<span className="text-red-500">*</span>
                    </span>
                    <div className="md:col-span-2">
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={leaveApplicationStartDay}
                        onChange={(e) => setLeaveApplicationStartDay(e.target.value === '' ? '' : (parseInt(e.target.value) || ''))}
                        className="w-full max-w-[200px] px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-sm font-medium"
                        required
                      />
                    </div>
                  </div>

                  {/* Month */}
                  <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-4">
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-250">Month:</span>
                    <div className="md:col-span-2">
                      <select
                        value={leaveApplicationStartMonth}
                        onChange={(e) => setLeaveApplicationStartMonth(e.target.value ? parseInt(e.target.value) : '')}
                        className="w-full max-w-[300px] px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-sm font-medium"
                      >
                        <option value="">Choose</option>
                        {months.map(m => (
                          <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Default Leave Month */}
                  <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-4">
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-250">Default Leave Month :</span>
                    <div className="md:col-span-2">
                      <select
                        value={defaultLeaveMonth}
                        onChange={(e) => setDefaultLeaveMonth(e.target.value ? parseInt(e.target.value) : '')}
                        className="w-full max-w-[300px] px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-sm font-medium"
                      >
                        <option value="">Choose</option>
                        {months.map(m => (
                          <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Save Default Button */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleSave}
                      className="bg-[#00a65a] hover:bg-[#008d4c] text-white text-xs font-bold h-9 px-4 rounded shadow-sm flex items-center justify-center"
                    >
                      Save Default
                    </button>
                  </div>

                  {/* Table with Overrides */}
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="overflow-x-auto border border-gray-200 dark:border-gray-750 rounded-lg bg-white dark:bg-gray-900 shadow-sm">
                      <table className="w-full text-left text-xs font-medium text-gray-700 dark:text-gray-300">
                        <thead className="bg-gray-50 dark:bg-gray-850 text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-755">
                          <tr>
                            <th className="px-4 py-2.5 w-16">#</th>
                            <th className="px-4 py-2.5">Leave Year Month</th>
                            <th className="px-4 py-2.5">Company - Location</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-755">
                          {allOrgSettings
                            .filter(row => row.leave_application_start_month !== null && row.leave_application_start_month !== undefined)
                            .map((row, idx) => {
                              const locationObj = locations.find(l => l.uuid === row.location_id || (row.location_id === null && (l.uuid === '' || l.uuid === 'org-location-default')));
                              const monthName = months.find(m => m.value === row.leave_application_start_month)?.label || 'January';
                              return (
                                <tr key={row.id || idx} className="hover:bg-gray-50 dark:hover:bg-gray-850/50">
                                  <td className="px-4 py-2.5 flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setModalSelectedLocations([row.location_id || '']);
                                        setModalSelectedLeaveMonth(row.leave_application_start_month || 1);
                                        setIsLeaveYearModalOpen(true);
                                      }}
                                      className="text-gray-500 hover:text-indigo-600 transition-colors"
                                      title="Edit"
                                    >
                                      <Edit className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        if (confirm("Are you sure you want to delete this setting?")) {
                                          try {
                                            await apiClient.post('/settings/org-leave-settings', {
                                              locationId: row.location_id,
                                              leaveApplicationStartMonth: null
                                            });
                                            toast.success("Setting removed successfully.");
                                            const res = await apiClient.get('/settings/org-leave-settings');
                                            if (res.data && res.data.success) {
                                              setAllOrgSettings(res.data.data || []);
                                            }
                                          } catch (err) {
                                            console.error(err);
                                            toast.error("Failed to delete setting.");
                                          }
                                        }
                                      }}
                                      className="text-gray-500 hover:text-red-600 transition-colors"
                                      title="Delete"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </td>
                                  <td className="px-4 py-2.5 font-semibold text-gray-900 dark:text-white">{monthName}</td>
                                  <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 font-medium">
                                    {locationObj ? `${locationObj.name}` : (companyName || 'Global Default')}
                                  </td>
                                </tr>
                              );
                            })}
                          {allOrgSettings.filter(row => row.leave_application_start_month !== null && row.leave_application_start_month !== undefined).length === 0 && (
                            <tr>
                              <td colSpan={3} className="px-4 py-6 text-center text-gray-450 dark:text-gray-500">
                                No location overrides configured.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Add more overrides button */}
                  <div className="flex justify-end mt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setModalSelectedLocations([]);
                        setModalSelectedLeaveMonth(1);
                        setIsLeaveYearModalOpen(true);
                      }}
                      className="text-blue-600 dark:text-blue-400 text-xs font-semibold hover:underline flex items-center gap-1"
                    >
                      <span className="text-sm font-black">+</span>Add more
                    </button>
                  </div>

                </div>
              </fieldset>
            </div>

            {/* Holiday Month Setting */}
            <div className="mb-6">
              <fieldset className="border border-gray-200 dark:border-gray-750 rounded-xl p-5 bg-[#f9f9f9] dark:bg-gray-850/30 relative">
                <legend className="text-xs font-bold px-2.5 py-1 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md">Holiday Month Setting</legend>
                <div className="space-y-4">

                  {/* Default Start Holiday Month + Save Default inline */}
                  <div className="flex items-center gap-4 flex-wrap">
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-250">
                      Default Start Holiday Month:
                    </span>
                    <select
                      value={holidayYearStartMonth}
                      onChange={(e) => setHolidayYearStartMonth(e.target.value ? parseInt(e.target.value) : 4)}
                      className="w-full max-w-[300px] px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-sm font-medium"
                    >
                      {months.map(m => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleSave}
                      className="bg-[#00a65a] hover:bg-[#008d4c] text-white text-xs font-bold h-9 px-4 rounded shadow-sm flex items-center justify-center"
                    >
                      Save Default
                    </button>
                  </div>

                  {/* Table with Overrides */}
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="overflow-x-auto border border-gray-200 dark:border-gray-750 rounded-lg bg-white dark:bg-gray-900 shadow-sm">
                      <table className="w-full text-left text-xs font-medium text-gray-700 dark:text-gray-300">
                        <thead className="bg-gray-50 dark:bg-gray-850 text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-755">
                          <tr>
                            <th className="px-4 py-2.5 w-16">#</th>
                            <th className="px-4 py-2.5">Holiday Month</th>
                            <th className="px-4 py-2.5">Company - Location</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-755">
                          {allOrgSettings
                            .filter(row => row.holiday_year_start_month !== null && row.holiday_year_start_month !== undefined)
                            .map((row, idx) => {
                              const locationObj = locations.find(l => l.uuid === row.location_id || (row.location_id === null && (l.uuid === '' || l.uuid === 'org-location-default')));
                              const monthName = months.find(m => m.value === row.holiday_year_start_month)?.label || 'January';
                              return (
                                <tr key={row.id || idx} className="hover:bg-gray-50 dark:hover:bg-gray-850/50">
                                  <td className="px-4 py-2.5 flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setModalSelectedLocations([row.location_id || '']);
                                        setModalSelectedMonth(row.holiday_year_start_month || 4);
                                        setIsHolidayMonthModalOpen(true);
                                      }}
                                      className="text-gray-500 hover:text-indigo-600 transition-colors"
                                      title="Edit"
                                    >
                                      <Edit className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        if (confirm("Are you sure you want to delete this setting?")) {
                                          try {
                                            await apiClient.post('/settings/org-leave-settings', {
                                              locationId: row.location_id,
                                              holidayYearStartMonth: null
                                            });
                                            toast.success("Setting removed successfully.");
                                            const res = await apiClient.get('/settings/org-leave-settings');
                                            if (res.data && res.data.success) {
                                              setAllOrgSettings(res.data.data || []);
                                            }
                                          } catch (err) {
                                            console.error(err);
                                            toast.error("Failed to delete setting.");
                                          }
                                        }
                                      }}
                                      className="text-gray-500 hover:text-red-600 transition-colors"
                                      title="Delete"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </td>
                                  <td className="px-4 py-2.5 font-semibold text-gray-900 dark:text-white">{monthName}</td>
                                  <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 font-medium">
                                    {locationObj ? `${locationObj.name}` : (companyName || 'Global Default')}
                                  </td>
                                </tr>
                              );
                            })}
                          {allOrgSettings.filter(row => row.holiday_year_start_month !== null && row.holiday_year_start_month !== undefined).length === 0 && (
                            <tr>
                              <td colSpan={3} className="px-4 py-6 text-center text-gray-450 dark:text-gray-500">
                                No location overrides configured.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Add more overrides button */}
                  <div className="flex justify-end mt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setModalSelectedLocations([]);
                        setModalSelectedMonth(4);
                        setIsHolidayMonthModalOpen(true);
                      }}
                      className="text-blue-600 dark:text-blue-400 text-xs font-semibold hover:underline flex items-center gap-1"
                    >
                      <span className="text-sm font-black">+</span>Add more
                    </button>
                  </div>

                </div>
              </fieldset>
            </div>

            {/* Leave Week Setting */}
            <div className="mb-6">
              <fieldset className="border border-gray-200 dark:border-gray-750 rounded-xl p-5 bg-[#f9f9f9] dark:bg-gray-850/30 relative">
                <legend className="text-xs font-bold px-2.5 py-1 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md">Leave Week Setting</legend>
                <div className="space-y-4">
                  <div className="flex items-center gap-4 flex-wrap">
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-250">Default Week Day:</span>
                    <select
                      className="w-full max-w-[300px] px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-sm font-medium capitalize"
                      value={defaultWeekDay || ''}
                      onChange={(e) => setDefaultWeekDay(e.target.value)}
                    >
                      <option value="">Choose</option>
                      {daysOfWeek.map(day => (
                        <option key={day} value={day} className="capitalize">{day.charAt(0).toUpperCase() + day.slice(1)}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleSave}
                      className="bg-[#00a65a] hover:bg-[#008d4c] text-white text-xs font-bold h-9 px-4 rounded shadow-sm flex items-center justify-center"
                    >
                      Save Default
                    </button>
                  </div>

                  {/* Table with Overrides */}
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="overflow-x-auto border border-gray-200 dark:border-gray-750 rounded-lg bg-white dark:bg-gray-900 shadow-sm">
                      <table className="w-full text-left text-xs font-medium text-gray-700 dark:text-gray-300">
                        <thead className="bg-gray-50 dark:bg-gray-850 text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-755">
                          <tr>
                            <th className="px-4 py-2.5 w-16">#</th>
                            <th className="px-4 py-2.5">Week Day</th>
                            <th className="px-4 py-2.5">Company - Location</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-755">
                          {allOrgSettings
                            .filter(row => row.default_week_day !== null && row.default_week_day !== undefined && row.default_week_day !== '')
                            .map((row, idx) => {
                              const locationObj = locations.find(l => l.uuid === row.location_id || (row.location_id === null && (l.uuid === '' || l.uuid === 'org-location-default')));
                              const dayName = row.default_week_day ? (row.default_week_day.charAt(0).toUpperCase() + row.default_week_day.slice(1)) : '-';
                              return (
                                <tr key={row.id || idx} className="hover:bg-gray-50 dark:hover:bg-gray-850/50">
                                  <td className="px-4 py-2.5 flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setModalSelectedLocations([row.location_id || '']);
                                        setModalSelectedWeekDay(row.default_week_day || 'Monday');
                                        setIsLeaveWeekModalOpen(true);
                                      }}
                                      className="text-gray-500 hover:text-indigo-600 transition-colors"
                                      title="Edit"
                                    >
                                      <Edit className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        if (confirm("Are you sure you want to delete this setting?")) {
                                          try {
                                            await apiClient.post('/settings/org-leave-settings', {
                                              locationId: row.location_id,
                                              defaultWeekDay: null
                                            });
                                            toast.success("Setting removed successfully.");
                                            const res = await apiClient.get('/settings/org-leave-settings');
                                            if (res.data && res.data.success) {
                                              setAllOrgSettings(res.data.data || []);
                                            }
                                          } catch (err) {
                                            console.error(err);
                                            toast.error("Failed to delete setting.");
                                          }
                                        }
                                      }}
                                      className="text-gray-500 hover:text-red-600 transition-colors"
                                      title="Delete"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </td>
                                  <td className="px-4 py-2.5 font-semibold text-gray-900 dark:text-white">{dayName}</td>
                                  <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 font-medium">
                                    {locationObj ? `${locationObj.name}` : (companyName || 'Global Default')}
                                  </td>
                                </tr>
                              );
                            })}
                          {allOrgSettings.filter(row => row.default_week_day !== null && row.default_week_day !== undefined && row.default_week_day !== '').length === 0 && (
                            <tr>
                              <td colSpan={3} className="px-4 py-6 text-center text-gray-450 dark:text-gray-500">
                                No location overrides configured.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Add more overrides button */}
                  <div className="flex justify-end mt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setModalSelectedLocations([]);
                        setModalSelectedWeekDay('Monday');
                        setIsLeaveWeekModalOpen(true);
                      }}
                      className="text-blue-600 dark:text-blue-400 text-xs font-semibold hover:underline flex items-center gap-1"
                    >
                      <span className="text-sm font-black">+</span>Add more
                    </button>
                  </div>

                </div>
              </fieldset>
            </div>

            {/* Leave Application Reminder Settings */}
            <fieldset className="border border-gray-200 dark:border-gray-750 rounded-xl p-5 bg-[#f9f9f9] dark:bg-gray-850/30 relative mt-4">
              <legend className="text-xs font-bold px-2.5 py-1 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md">
                Leave Application Reminder Settings
              </legend>
              <div className="space-y-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 mt-1"
                    checked={disableLeaveApplicationReminder}
                    onChange={(e) => setDisableLeaveApplicationReminder(e.target.checked)}
                  />
                  <div>
                    <span className="text-sm text-gray-700 dark:text-gray-300 font-medium block">Disable leave application reminder on dashboard</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 block mt-0.5">
                      <strong>If Checked:</strong> Hides the dashboard banner/widget reminding employees to apply for pending leaves.<br />
                      <strong>If Unchecked:</strong> Shows reminders on the dashboard when employees have missing logs.
                    </span>
                  </div>
                </label>
              </div>
            </fieldset>

            {/* Leave Application Settings */}
            <fieldset className="border border-gray-200 dark:border-gray-755 rounded-xl p-5 bg-[#f9f9f9] dark:bg-gray-850/30 relative mt-4">
              <legend className="text-xs font-bold px-2.5 py-1 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md">
                Leave Application Settings
              </legend>
              <div className="space-y-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 mt-1"
                    checked={enableBackupPerson}
                    onChange={(e) => setEnableBackupPerson(e.target.checked)}
                  />
                  <div>
                    <span className="text-sm text-gray-700 dark:text-gray-300 font-medium block">Enable Backup Person Selection in Apply for Leave Modal</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 block mt-0.5">
                      <strong>If Checked (ON):</strong> Displays the Backup Person (Optional) selection field when employees apply for leave.<br />
                      <strong>If Unchecked (OFF):</strong> Hides the Backup Person field from the Apply for Leave modal.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 mt-1"
                    checked={showPopupOnWeekOffOrHoliday}
                    onChange={(e) => setShowPopupOnWeekOffOrHoliday(e.target.checked)}
                  />
                  <div>
                    <span className="text-sm text-gray-700 dark:text-gray-300 font-medium block">Show Popup on Leave Application on Week off or Holiday</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 block mt-0.5">
                      <strong>If Checked:</strong> Displays a warning popup to the employee if they apply for leave on a weekend or public holiday.<br />
                      <strong>If Unchecked:</strong> Automatically processes/ignores week offs and holidays during leave application without showing a popup.
                    </span>
                  </div>
                </label>

                <div className="space-y-3 mt-4">
                  <span className="text-xs font-bold px-2.5 py-1 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md inline-block">
                    Leave Application Date Restriction (Advance & Grace Period)
                  </span>
                  <div className="w-full p-5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 shadow-sm flex items-center animate-fade-in">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input type="checkbox" className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 mt-1"
                        checked={leaveApplicationDateRestriction}
                        onChange={(e) => setLeaveApplicationDateRestriction(e.target.checked)}
                        id="date-restriction"
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                          Leave Application Date Restriction <AlertCircle className="h-3.5 w-3.5 text-gray-400" />
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 block mt-0.5">
                          <strong>If Checked:</strong> Enforces strict advance notice periods and grace days (e.g. must apply 3 days in advance).<br />
                          <strong>If Unchecked:</strong> Allows employees to apply for past or future leaves without any date restrictions.
                        </span>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="mt-6">
                  <button
                    type="button"
                    onClick={handleSave}
                    className="bg-[#00a65a] hover:bg-[#008d4c] text-white text-sm font-bold h-10 px-8 rounded flex items-center justify-center shadow-sm"
                  >
                    Save
                  </button>
                </div>
              </div>
            </fieldset>

          </div>
        </form>
      )}
      {/* Holiday Year Start Month Modal (Holiday Month Setting) */}
      <Dialog open={isHolidayMonthModalOpen} onOpenChange={setIsHolidayMonthModalOpen}>
        <DialogContent className="sm:max-w-[480px] p-6 rounded-2xl shadow-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
          <DialogHeader className="border-b pb-3 mb-4">
            <DialogTitle className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center justify-between">
              <span>Holiday Month Setting</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveHolidayMonthSetting} className="space-y-4">

            {/* Accordion Location List */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
              <button
                type="button"
                onClick={() => setIsModalLocationExpanded(!isModalLocationExpanded)}
                className="w-full p-3 bg-gray-50 dark:bg-gray-850 flex items-center justify-between border-b border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-755 dark:text-gray-300"
              >
                <span className="flex items-center gap-2">
                  {isModalLocationExpanded ? '[-]' : '[+]'} Company - Location
                </span>
                {modalSelectedLocations.length > 0 && (
                  <span className="bg-gray-800 dark:bg-gray-700 text-white rounded-full text-[10px] w-5 h-5 flex items-center justify-center font-bold">
                    {modalSelectedLocations.length}
                  </span>
                )}
              </button>

              {isModalLocationExpanded && (
                <div className="p-4 space-y-3 bg-white dark:bg-gray-900 max-h-56 overflow-y-auto">
                  <label className="flex items-center gap-2.5 text-xs font-semibold text-gray-700 dark:text-gray-300 cursor-pointer border-b pb-2 mb-2 w-full">
                    <input
                      type="checkbox"
                      checked={locations.length > 0 && locations.every(loc => modalSelectedLocations.includes(loc.uuid))}
                      onChange={() => {
                        const allSelected = locations.length > 0 && locations.every(loc => modalSelectedLocations.includes(loc.uuid));
                        if (allSelected) {
                          setModalSelectedLocations([]);
                        } else {
                          setModalSelectedLocations(locations.map(loc => loc.uuid));
                        }
                      }}
                      className="h-4 w-4 rounded border-gray-300 text-indigo-650 focus:ring-indigo-500"
                    />
                    {locations.length > 0 && locations.every(loc => modalSelectedLocations.includes(loc.uuid)) ? 'Unselect All' : 'Select All'}
                  </label>

                  {locations.map((loc) => (
                    <label key={loc.uuid} className="flex items-center gap-2.5 text-xs font-semibold text-gray-700 dark:text-gray-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={modalSelectedLocations.includes(loc.uuid)}
                        onChange={() => {
                          if (modalSelectedLocations.includes(loc.uuid)) {
                            setModalSelectedLocations(modalSelectedLocations.filter(uuid => uuid !== loc.uuid));
                          } else {
                            setModalSelectedLocations([...modalSelectedLocations, loc.uuid]);
                          }
                        }}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-650 focus:ring-indigo-500"
                      />
                      {loc.name}
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Month Dropdown Selector */}
            <div className="space-y-1.5">
              <select
                value={modalSelectedMonth}
                onChange={(e) => setModalSelectedMonth(parseInt(e.target.value) || 4)}
                className="w-full h-10 px-3 text-xs bg-muted/50 dark:bg-gray-800 border rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-foreground font-semibold"
              >
                {months.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Save Button */}
            <div className="flex justify-start pt-3 border-t">
              <button
                type="submit"
                disabled={isSaving}
                className="bg-[#00a65a] hover:bg-[#008d4c] text-white text-xs font-bold h-9 px-5 rounded flex items-center justify-center gap-1.5 shadow-sm transition-all"
              >
                Save
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Leave Year Month Setting Modal */}
      <Dialog open={isLeaveYearModalOpen} onOpenChange={setIsLeaveYearModalOpen}>
        <DialogContent className="sm:max-w-[480px] p-6 rounded-2xl shadow-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
          <DialogHeader className="border-b pb-3 mb-4">
            <DialogTitle className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center justify-between">
              <span>Leave Year Month Setting</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveLeaveYearSetting} className="space-y-4">

            {/* Accordion Location List */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
              <button
                type="button"
                onClick={() => setIsModalLocationExpanded(!isModalLocationExpanded)}
                className="w-full p-3 bg-gray-50 dark:bg-gray-850 flex items-center justify-between border-b border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-755 dark:text-gray-300"
              >
                <span className="flex items-center gap-2">
                  {isModalLocationExpanded ? '[-]' : '[+]'} Company - Location
                </span>
                {modalSelectedLocations.length > 0 && (
                  <span className="bg-gray-800 dark:bg-gray-700 text-white rounded-full text-[10px] w-5 h-5 flex items-center justify-center font-bold">
                    {modalSelectedLocations.length}
                  </span>
                )}
              </button>

              {isModalLocationExpanded && (
                <div className="p-4 space-y-3 bg-white dark:bg-gray-900 max-h-56 overflow-y-auto">
                  <label className="flex items-center gap-2.5 text-xs font-semibold text-gray-700 dark:text-gray-300 cursor-pointer border-b pb-2 mb-2 w-full">
                    <input
                      type="checkbox"
                      checked={locations.length > 0 && locations.every(loc => modalSelectedLocations.includes(loc.uuid))}
                      onChange={() => {
                        const allSelected = locations.length > 0 && locations.every(loc => modalSelectedLocations.includes(loc.uuid));
                        if (allSelected) {
                          setModalSelectedLocations([]);
                        } else {
                          setModalSelectedLocations(locations.map(loc => loc.uuid));
                        }
                      }}
                      className="h-4 w-4 rounded border-gray-300 text-indigo-650 focus:ring-indigo-500"
                    />
                    {locations.length > 0 && locations.every(loc => modalSelectedLocations.includes(loc.uuid)) ? 'Unselect All' : 'Select All'}
                  </label>

                  {locations.map((loc) => (
                    <label key={loc.uuid} className="flex items-center gap-2.5 text-xs font-semibold text-gray-700 dark:text-gray-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={modalSelectedLocations.includes(loc.uuid)}
                        onChange={() => {
                          if (modalSelectedLocations.includes(loc.uuid)) {
                            setModalSelectedLocations(modalSelectedLocations.filter(uuid => uuid !== loc.uuid));
                          } else {
                            setModalSelectedLocations([...modalSelectedLocations, loc.uuid]);
                          }
                        }}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-650 focus:ring-indigo-500"
                      />
                      {loc.name}
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Month Dropdown Selector */}
            <div className="space-y-1.5">
              <select
                value={modalSelectedLeaveMonth}
                onChange={(e) => setModalSelectedLeaveMonth(parseInt(e.target.value) || 1)}
                className="w-full h-10 px-3 text-xs bg-muted/50 dark:bg-gray-800 border rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-foreground font-semibold"
              >
                {months.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Save Button */}
            <div className="flex justify-start pt-3 border-t">
              <button
                type="submit"
                disabled={isSaving}
                className="bg-[#00a65a] hover:bg-[#008d4c] text-white text-xs font-bold h-9 px-5 rounded flex items-center justify-center gap-1.5 shadow-sm transition-all"
              >
                Save
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Leave Week Setting Modal */}
      <Dialog open={isLeaveWeekModalOpen} onOpenChange={setIsLeaveWeekModalOpen}>
        <DialogContent className="sm:max-w-[480px] p-6 rounded-2xl shadow-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
          <DialogHeader className="border-b pb-3 mb-4">
            <DialogTitle className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center justify-between">
              <span>Leave Week Setting</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveLeaveWeekSetting} className="space-y-4">

            {/* Accordion Location List */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
              <button
                type="button"
                onClick={() => setIsModalLocationExpanded(!isModalLocationExpanded)}
                className="w-full p-3 bg-gray-50 dark:bg-gray-850 flex items-center justify-between border-b border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-755 dark:text-gray-300"
              >
                <span className="flex items-center gap-2">
                  {isModalLocationExpanded ? '[-]' : '[+]'} Company - Location
                </span>
                {modalSelectedLocations.length > 0 && (
                  <span className="bg-gray-800 dark:bg-gray-700 text-white rounded-full text-[10px] w-5 h-5 flex items-center justify-center font-bold">
                    {modalSelectedLocations.length}
                  </span>
                )}
              </button>

              {isModalLocationExpanded && (
                <div className="p-4 space-y-3 bg-white dark:bg-gray-900 max-h-56 overflow-y-auto">
                  <label className="flex items-center gap-2.5 text-xs font-semibold text-gray-700 dark:text-gray-300 cursor-pointer border-b pb-2 mb-2 w-full">
                    <input
                      type="checkbox"
                      checked={locations.length > 0 && locations.every(loc => modalSelectedLocations.includes(loc.uuid))}
                      onChange={() => {
                        const allSelected = locations.length > 0 && locations.every(loc => modalSelectedLocations.includes(loc.uuid));
                        if (allSelected) {
                          setModalSelectedLocations([]);
                        } else {
                          setModalSelectedLocations(locations.map(loc => loc.uuid));
                        }
                      }}
                      className="h-4 w-4 rounded border-gray-300 text-indigo-650 focus:ring-indigo-500"
                    />
                    {locations.length > 0 && locations.every(loc => modalSelectedLocations.includes(loc.uuid)) ? 'Unselect All' : 'Select All'}
                  </label>

                  {locations.map((loc) => (
                    <label key={loc.uuid} className="flex items-center gap-2.5 text-xs font-semibold text-gray-700 dark:text-gray-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={modalSelectedLocations.includes(loc.uuid)}
                        onChange={() => {
                          if (modalSelectedLocations.includes(loc.uuid)) {
                            setModalSelectedLocations(modalSelectedLocations.filter(uuid => uuid !== loc.uuid));
                          } else {
                            setModalSelectedLocations([...modalSelectedLocations, loc.uuid]);
                          }
                        }}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-650 focus:ring-indigo-500"
                      />
                      {loc.name}
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Week Day Dropdown Selector */}
            <div className="space-y-1.5">
              <select
                value={modalSelectedWeekDay}
                onChange={(e) => setModalSelectedWeekDay(e.target.value)}
                className="w-full h-10 px-3 text-xs bg-muted/50 dark:bg-gray-800 border rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-foreground font-semibold capitalize"
              >
                {daysOfWeek.map((day) => (
                  <option key={day} value={day}>
                    {day.charAt(0).toUpperCase() + day.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Save Button */}
            <div className="flex justify-start pt-3 border-t">
              <button
                type="submit"
                disabled={isSaving}
                className="bg-[#00a65a] hover:bg-[#008d4c] text-white text-xs font-bold h-9 px-5 rounded flex items-center justify-center gap-1.5 shadow-sm transition-all"
              >
                Save
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}
