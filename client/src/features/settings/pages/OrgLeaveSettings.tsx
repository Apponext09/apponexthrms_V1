import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import {
  ArrowLeft,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle2,
  Plus,
  Trash2,
  X,
  Check,
  Edit2,
  Layers,
  ShieldAlert,
  Sun,
  Bell,
  UserCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { HelpHint } from '../components/HelpHint';

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

            let clubbing = matched.leave_clubbing_rules || matched.leaveClubbingRules;
            if (typeof clubbing === 'string') {
              try { clubbing = JSON.parse(clubbing); } catch (e) { clubbing = null; }
            }
            if (Array.isArray(clubbing) && clubbing.length > 0) {
              setLeaveClubbingRules(clubbing);
            }

            let restrictions = matched.leave_restriction_rules || matched.leaveRestrictionRules;
            if (typeof restrictions === 'string') {
              try { restrictions = JSON.parse(restrictions); } catch (e) { restrictions = null; }
            }
            if (Array.isArray(restrictions) && restrictions.length > 0) {
              setLeaveRestrictionRules(restrictions);
            }

            const defWeekDay = matched.default_week_day !== undefined && matched.default_week_day !== null
              ? matched.default_week_day
              : matched.defaultWeekDay;
            setDefaultWeekDay(defWeekDay || '');

            const disableRemind = matched.disable_leave_application_reminder !== undefined && matched.disable_leave_application_reminder !== null
              ? matched.disable_leave_application_reminder
              : matched.disableLeaveApplicationReminder;
            setDisableLeaveApplicationReminder(Boolean(disableRemind));

            const showPopup = matched.show_popup_on_week_off_or_holiday !== undefined && matched.show_popup_on_week_off_or_holiday !== null
              ? matched.show_popup_on_week_off_or_holiday
              : matched.showPopupOnWeekOffOrHoliday;
            setShowPopupOnWeekOffOrHoliday(Boolean(showPopup));

            const dateRestr = matched.leave_application_date_restriction !== undefined && matched.leave_application_date_restriction !== null
              ? matched.leave_application_date_restriction
              : matched.leaveApplicationDateRestriction;
            setLeaveApplicationDateRestriction(Boolean(dateRestr));

            const enableBackup = matched.enable_backup_person !== undefined && matched.enable_backup_person !== null
              ? matched.enable_backup_person
              : matched.enableBackupPerson;
            setEnableBackupPerson(enableBackup !== undefined && enableBackup !== null ? Boolean(enableBackup) : true);

          } else {
            setId(null);
          }
        }
      } catch (err) {
        console.error('Failed to load org leave settings', err);
        setMessage({ type: 'error', text: 'Failed to load organization settings.' });
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, [selectedLocationUuid]);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    const payload = {
      locationId: selectedLocationUuid || null,
      normalWorkingHoursDaily,
      fullTimeHours,
      holidayYearStartMonth,
      maxConsecutiveAnnualLeaveDays: maxConsecutiveAnnualLeaveDays ? parseInt(maxConsecutiveAnnualLeaveDays) : null,
      leaveApplicationStartDay: leaveApplicationStartDay !== '' ? leaveApplicationStartDay : 1,
      leaveApplicationStartMonth: leaveApplicationStartMonth !== '' ? leaveApplicationStartMonth : null,
      defaultLeaveMonth: defaultLeaveMonth !== '' ? defaultLeaveMonth : null,
      leaveClubbingRules,
      leaveRestrictionRules,
      defaultWeekDay: defaultWeekDay || null,
      disableLeaveApplicationReminder,
      showPopupOnWeekOffOrHoliday,
      leaveApplicationDateRestriction,
      enableBackupPerson,
      weeklyWorkPattern: workPattern,
    };

    try {
      const res = await apiClient.post('/settings/org-leave-settings', payload);
      if (res.data && res.data.success) {
        setMessage({ type: 'success', text: 'Organization leave settings saved successfully.' });
        toast.success("Settings saved successfully.");

        const resRefresh = await apiClient.get('/settings/org-leave-settings');
        if (resRefresh.data && resRefresh.data.success) {
          setAllOrgSettings(resRefresh.data.data || []);
        }
      } else {
        setMessage({ type: 'error', text: res.data?.message || 'Failed to save settings.' });
        toast.error("Failed to save settings.");
      }
    } catch (err: any) {
      console.error('Save error:', err);
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to save settings.' });
      toast.error("Failed to save settings.");
    } finally {
      setIsSaving(false);
    }
  };

  // Save Holiday Month Setting per location
  const handleSaveHolidayMonthSetting = async (e: React.FormEvent) => {
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
          holidayYearStartMonth: modalSelectedMonth
        };

        await apiClient.post('/settings/org-leave-settings', payload);
      }

      toast.success("Holiday month setting saved successfully for selected locations.");

      const resRefresh = await apiClient.get('/settings/org-leave-settings');
      if (resRefresh.data && resRefresh.data.success) {
        setAllOrgSettings(resRefresh.data.data || []);
      }

      setIsHolidayMonthModalOpen(false);
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to save holiday month setting.");
    } finally {
      setIsSaving(false);
    }
  };

  // Save Leave Year Setting per location
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

      toast.success("Leave year setting saved successfully for selected locations.");

      const resRefresh = await apiClient.get('/settings/org-leave-settings');
      if (resRefresh.data && resRefresh.data.success) {
        setAllOrgSettings(resRefresh.data.data || []);
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
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <Link
            to="/settings/leave-policies"
            className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-slate-300 shadow-2xs transition-all"
            title="Back to Leave Policies"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                Organization Leave Settings
              </h1>
              <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold border border-indigo-200/60 dark:border-indigo-800/60">
                Org-Wide Defaults
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Configure default working hours, holiday cycles, clubbing rules, and weekly work patterns across locations.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 px-4 rounded-xl flex items-center gap-1.5 shadow-sm shadow-emerald-500/20 cursor-pointer active:scale-95 transition-all"
          >
            <Check className="w-4 h-4" />
            <span>{isSaving ? 'Saving Settings...' : 'Save All Settings'}</span>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-10 h-10 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          <span className="mt-3 text-xs text-slate-500 dark:text-slate-400 font-medium">Loading settings...</span>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-5">
          {/* LEAVE CLUBBING CARD */}
          <Card className="border border-slate-200 dark:border-slate-800 shadow-xs rounded-xl relative">
            <CardHeader className="pb-2.5 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                    <Layers className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="flex items-center">
                      <CardTitle className="text-xs font-bold text-slate-900 dark:text-white">
                        Leave Clubbing Rules
                      </CardTitle>
                      <HelpHint
                        title="Leave Clubbing Rules"
                        titleHi="लीव क्लबिंग नियम"
                        description="Define which leave types can be taken together in a single request and set combined maximum days."
                        descriptionHi="यह तय करें कि कौन सी दो या अधिक पत्तियां एक साथ ली जा सकती हैं और उनकी अधिकतम कुल अवधि सीमा क्या है।"
                      />
                    </div>
                    <CardDescription className="text-[11px] text-slate-500">
                      Specify leave categories that can be combined in a single application.
                    </CardDescription>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setLeaveClubbingRules([...leaveClubbingRules, { leaveTypes: [], maxDays: 0 }])}
                  className="h-7 px-2.5 rounded-lg text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 border border-indigo-200/60 flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Rule</span>
                </button>
              </div>
            </CardHeader>
            <CardContent className="pt-3.5 space-y-4">
              {leaveClubbingRules.map((rule, idx) => (
                <div key={idx} className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-950 space-y-3 relative shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Rule #{idx + 1}: Select Leave Types to Combine
                    </span>
                    <button
                      type="button"
                      onClick={() => setLeaveClubbingRules(leaveClubbingRules.filter((_, i) => i !== idx))}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                      title="Delete Rule"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-3 p-2.5 rounded-lg bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800">
                    {leaveTypes.map(lt => {
                      const name = lt.leave_name || lt.leaveName;
                      const isChecked = rule.leaveTypes?.includes(name);
                      return (
                        <label key={lt.id} className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-300">
                          <input
                            type="checkbox"
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer"
                            checked={isChecked}
                            onChange={(e) => {
                              const newRules = [...leaveClubbingRules];
                              if (!newRules[idx].leaveTypes) newRules[idx].leaveTypes = [];
                              if (e.target.checked) {
                                newRules[idx].leaveTypes.push(name);
                              } else {
                                newRules[idx].leaveTypes = newRules[idx].leaveTypes.filter((t: string) => t !== name);
                              }
                              setLeaveClubbingRules(newRules);
                            }}
                          />
                          <span>{name}</span>
                        </label>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-3">
                    <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                      Combined Maximum Days Allowed <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      type="number"
                      value={rule.maxDays || ''}
                      onChange={(e) => {
                        const newRules = [...leaveClubbingRules];
                        newRules[idx].maxDays = parseFloat(e.target.value) || 0;
                        setLeaveClubbingRules(newRules);
                      }}
                      placeholder="e.g. 15"
                      className="w-32 h-8 text-xs font-medium"
                      required
                    />
                  </div>
                </div>
              ))}

              <div className="flex items-center justify-between pt-1">
                <Button
                  type="button"
                  onClick={handleSave}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 px-4 rounded-lg flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Clubbing Rules</span>
                </Button>
                <Link
                  to="/settings/leave-policies"
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                >
                  Cancel
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* LEAVE RESTRICTION POLICY CARD */}
          <Card className="border border-slate-200 dark:border-slate-800 shadow-xs rounded-xl relative">
            <CardHeader className="pb-2.5 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
                    <ShieldAlert className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="flex items-center">
                      <CardTitle className="text-xs font-bold text-slate-900 dark:text-white">
                        Leave Restriction Policy
                      </CardTitle>
                      <HelpHint
                        title="Leave Restriction Policy"
                        titleHi="लीव रिस्ट्रिक्शन पॉलिसी"
                        description="Restrict booking specific leave types dependent on other active leave applications."
                        descriptionHi="एक निश्चित प्रकार की लीव लेने पर दूसरी लीव को प्रतिबंधित करने का नियम।"
                      />
                    </div>
                    <CardDescription className="text-[11px] text-slate-500">
                      Define conditional dependencies and limits between leave types.
                    </CardDescription>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setLeaveRestrictionRules([...leaveRestrictionRules, { allowLeaveType: '', whenLeaveTypes: [], numDays: '' }])}
                  className="h-7 px-2.5 rounded-lg text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 border border-amber-200/60 flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Restriction</span>
                </button>
              </div>
            </CardHeader>
            <CardContent className="pt-3.5 space-y-4">
              {leaveRestrictionRules.map((rule, idx) => (
                <div key={idx} className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-950 space-y-3 relative shadow-2xs">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 flex-wrap">
                      <span>Rule #{idx + 1}: Allow</span>
                      <select
                        className="h-7 px-2.5 border border-slate-200 dark:border-slate-700 rounded-md bg-slate-50 dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-200"
                        value={rule.allowLeaveType || ''}
                        onChange={(e) => {
                          const newRules = [...leaveRestrictionRules];
                          newRules[idx].allowLeaveType = e.target.value;
                          setLeaveRestrictionRules(newRules);
                        }}
                      >
                        <option value="">Choose Leave Type...</option>
                        {leaveTypes.map(lt => (
                          <option key={lt.id} value={lt.leave_name || lt.leaveName}>{lt.leave_name || lt.leaveName}</option>
                        ))}
                      </select>
                      <span>when requesting:</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setLeaveRestrictionRules(leaveRestrictionRules.filter((_, i) => i !== idx))}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                      title="Delete Rule"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-3 p-2.5 rounded-lg bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800">
                    {leaveTypes.map(lt => {
                      const name = lt.leave_name || lt.leaveName;
                      const isChecked = rule.whenLeaveTypes?.includes(name);
                      return (
                        <label key={lt.id} className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-300">
                          <input
                            type="checkbox"
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer"
                            checked={isChecked}
                            onChange={(e) => {
                              const newRules = [...leaveRestrictionRules];
                              if (!newRules[idx].whenLeaveTypes) newRules[idx].whenLeaveTypes = [];
                              if (e.target.checked) {
                                newRules[idx].whenLeaveTypes.push(name);
                              } else {
                                newRules[idx].whenLeaveTypes = newRules[idx].whenLeaveTypes.filter((t: string) => t !== name);
                              }
                              setLeaveRestrictionRules(newRules);
                            }}
                          />
                          <span>{name}</span>
                        </label>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-3">
                    <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                      Number of Leave Days Limit <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      type="number"
                      value={rule.numDays || ''}
                      onChange={(e) => {
                        const newRules = [...leaveRestrictionRules];
                        newRules[idx].numDays = e.target.value;
                        setLeaveRestrictionRules(newRules);
                      }}
                      placeholder="e.g. 5"
                      className="w-32 h-8 text-xs font-medium"
                      required
                    />
                  </div>
                </div>
              ))}

              <div className="flex items-center justify-between pt-1">
                <Button
                  type="button"
                  onClick={handleSave}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 px-4 rounded-lg flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Restriction Rules</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* LEAVE YEAR & APPLICATION CYCLE CARD */}
          <Card className="border border-slate-200 dark:border-slate-800 shadow-xs rounded-xl relative">
            <CardHeader className="pb-2.5 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/30">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400">
                  <Calendar className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="flex items-center">
                    <CardTitle className="text-xs font-bold text-slate-900 dark:text-white">
                      Leave Year & Application Cycle
                    </CardTitle>
                    <HelpHint
                      title="Leave Year Setting"
                      titleHi="लीव ईयर साइकिल"
                      description="Configure the default start day and start month for annual leave quota resets across locations."
                      descriptionHi="लीव वर्ष का डिफ़ॉल्ट प्रारंभ दिन और महीना तय करें।"
                    />
                  </div>
                  <CardDescription className="text-[11px] text-slate-500">
                    Configure start day, start month, and default leave month cycles.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-3.5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                <div>
                  <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    Application Start Day <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    max="31"
                    value={leaveApplicationStartDay}
                    onChange={(e) => setLeaveApplicationStartDay(e.target.value === '' ? '' : (parseInt(e.target.value) || ''))}
                    className="h-8 mt-1 text-xs font-medium"
                    required
                  />
                </div>

                <div>
                  <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    Start Month
                  </Label>
                  <select
                    value={leaveApplicationStartMonth}
                    onChange={(e) => setLeaveApplicationStartMonth(e.target.value ? parseInt(e.target.value) : '')}
                    className="w-full h-8 mt-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-xs text-slate-800 dark:text-slate-200 font-medium"
                  >
                    <option value="">Choose Month...</option>
                    {months.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    Default Leave Month
                  </Label>
                  <select
                    value={defaultLeaveMonth}
                    onChange={(e) => setDefaultLeaveMonth(e.target.value ? parseInt(e.target.value) : '')}
                    className="w-full h-8 mt-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-xs text-slate-800 dark:text-slate-200 font-medium"
                  >
                    <option value="">Choose Month...</option>
                    {months.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <Button
                  type="button"
                  onClick={handleSave}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 px-4 rounded-lg flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Default Leave Year</span>
                </Button>

                <button
                  type="button"
                  onClick={() => {
                    setModalSelectedLocations([]);
                    setModalSelectedLeaveMonth(1);
                    setIsLeaveYearModalOpen(true);
                  }}
                  className="text-indigo-600 dark:text-indigo-400 text-xs font-bold hover:underline flex items-center gap-1 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-lg border border-indigo-200/60 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Location Override</span>
                </button>
              </div>

              {/* Location Overrides Table */}
              <div className="pt-2">
                <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 shadow-2xs">
                  <table className="w-full text-left text-xs font-medium text-slate-700 dark:text-slate-300">
                    <thead className="bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="px-3.5 py-2.5 w-16 text-[11px] font-bold">Action</th>
                        <th className="px-3.5 py-2.5 text-[11px] font-bold">Leave Year Month</th>
                        <th className="px-3.5 py-2.5 text-[11px] font-bold">Company / Location</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                      {allOrgSettings
                        .filter(row => row.leave_application_start_month !== null && row.leave_application_start_month !== undefined)
                        .map((row, idx) => {
                          const locationObj = locations.find(l => l.uuid === row.location_id || (row.location_id === null && (l.uuid === '' || l.uuid === 'org-location-default')));
                          const monthName = months.find(m => m.value === row.leave_application_start_month)?.label || 'January';
                          return (
                            <tr key={row.id || idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/60 transition-colors">
                              <td className="px-3.5 py-2 flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setModalSelectedLocations([row.location_id || '']);
                                    setModalSelectedLeaveMonth(row.leave_application_start_month || 1);
                                    setIsLeaveYearModalOpen(true);
                                  }}
                                  className="text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
                                  title="Edit"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (await window.appConfirm("Are you sure you want to delete this setting?")) {
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
                                  className="text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                                  title="Delete"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </td>
                              <td className="px-3.5 py-2 font-semibold text-slate-900 dark:text-white">{monthName}</td>
                              <td className="px-3.5 py-2 text-slate-500 dark:text-slate-400 font-medium">
                                {locationObj ? locationObj.name : (companyName || 'Global Default')}
                              </td>
                            </tr>
                          );
                        })}
                      {allOrgSettings.filter(row => row.leave_application_start_month !== null && row.leave_application_start_month !== undefined).length === 0 && (
                        <tr>
                          <td colSpan={3} className="px-4 py-4 text-center text-slate-400 text-[11px]">
                            No location overrides configured.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* HOLIDAY MONTH SETTING CARD */}
          <Card className="border border-slate-200 dark:border-slate-800 shadow-xs rounded-xl relative">
            <CardHeader className="pb-2.5 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/30">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
                  <Sun className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="flex items-center">
                    <CardTitle className="text-xs font-bold text-slate-900 dark:text-white">
                      Holiday Month Setting
                    </CardTitle>
                    <HelpHint
                      title="Holiday Month Setting"
                      titleHi="हॉलिडे मंथ सेटिंग"
                      description="Configure the default start month for the official annual holiday calendar."
                      descriptionHi="सालाना छुट्टी कैलेंडर का शुरुआती महीना सेट करें।"
                    />
                  </div>
                  <CardDescription className="text-[11px] text-slate-500">
                    Set annual holiday cycle start month and location overrides.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-3.5 space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                  Default Start Holiday Month:
                </Label>
                <select
                  value={holidayYearStartMonth}
                  onChange={(e) => setHolidayYearStartMonth(e.target.value ? parseInt(e.target.value) : 4)}
                  className="h-8 w-48 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-xs text-slate-800 dark:text-slate-200 font-medium"
                >
                  {months.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
                <Button
                  type="button"
                  onClick={handleSave}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 px-4 rounded-lg flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Default</span>
                </Button>

                <button
                  type="button"
                  onClick={() => {
                    setModalSelectedLocations([]);
                    setModalSelectedMonth(4);
                    setIsHolidayMonthModalOpen(true);
                  }}
                  className="text-amber-600 dark:text-amber-400 text-xs font-bold hover:underline flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-lg border border-amber-200/60 ml-auto cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Location Override</span>
                </button>
              </div>

              {/* Location Overrides Table */}
              <div className="pt-1">
                <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 shadow-2xs">
                  <table className="w-full text-left text-xs font-medium text-slate-700 dark:text-slate-300">
                    <thead className="bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="px-3.5 py-2.5 w-16 text-[11px] font-bold">Action</th>
                        <th className="px-3.5 py-2.5 text-[11px] font-bold">Holiday Month</th>
                        <th className="px-3.5 py-2.5 text-[11px] font-bold">Company / Location</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                      {allOrgSettings
                        .filter(row => row.holiday_year_start_month !== null && row.holiday_year_start_month !== undefined)
                        .map((row, idx) => {
                          const locationObj = locations.find(l => l.uuid === row.location_id || (row.location_id === null && (l.uuid === '' || l.uuid === 'org-location-default')));
                          const monthName = months.find(m => m.value === row.holiday_year_start_month)?.label || 'January';
                          return (
                            <tr key={row.id || idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/60 transition-colors">
                              <td className="px-3.5 py-2 flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setModalSelectedLocations([row.location_id || '']);
                                    setModalSelectedMonth(row.holiday_year_start_month || 4);
                                    setIsHolidayMonthModalOpen(true);
                                  }}
                                  className="text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
                                  title="Edit"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (await window.appConfirm("Are you sure you want to delete this setting?")) {
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
                                  className="text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                                  title="Delete"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </td>
                              <td className="px-3.5 py-2 font-semibold text-slate-900 dark:text-white">{monthName}</td>
                              <td className="px-3.5 py-2 text-slate-500 dark:text-slate-400 font-medium">
                                {locationObj ? locationObj.name : (companyName || 'Global Default')}
                              </td>
                            </tr>
                          );
                        })}
                      {allOrgSettings.filter(row => row.holiday_year_start_month !== null && row.holiday_year_start_month !== undefined).length === 0 && (
                        <tr>
                          <td colSpan={3} className="px-4 py-4 text-center text-slate-400 text-[11px]">
                            No location overrides configured.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* LEAVE WEEK SETTING CARD */}
          <Card className="border border-slate-200 dark:border-slate-800 shadow-xs rounded-xl relative">
            <CardHeader className="pb-2.5 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/30">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-cyan-50 dark:bg-cyan-950/50 text-cyan-600 dark:text-cyan-400">
                  <Clock className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="flex items-center">
                    <CardTitle className="text-xs font-bold text-slate-900 dark:text-white">
                      Leave Week Setting
                    </CardTitle>
                    <HelpHint
                      title="Leave Week Setting"
                      titleHi="लीव वीक सेटिंग"
                      description="Configure the default starting day of the week for leave tracking calculations."
                      descriptionHi="लीव गणना के लिए सप्ताह का पहला दिन निर्धारित करें।"
                    />
                  </div>
                  <CardDescription className="text-[11px] text-slate-500">
                    Define week cycle start day and location overrides.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-3.5 space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                  Default Week Day:
                </Label>
                <select
                  className="h-8 w-48 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-xs font-medium text-slate-800 dark:text-slate-200 capitalize"
                  value={defaultWeekDay || ''}
                  onChange={(e) => setDefaultWeekDay(e.target.value)}
                >
                  <option value="">Choose Day...</option>
                  {daysOfWeek.map(day => (
                    <option key={day} value={day} className="capitalize">{day.charAt(0).toUpperCase() + day.slice(1)}</option>
                  ))}
                </select>
                <Button
                  type="button"
                  onClick={handleSave}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 px-4 rounded-lg flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Default</span>
                </Button>

                <button
                  type="button"
                  onClick={() => {
                    setModalSelectedLocations([]);
                    setModalSelectedWeekDay('Monday');
                    setIsLeaveWeekModalOpen(true);
                  }}
                  className="text-cyan-600 dark:text-cyan-400 text-xs font-bold hover:underline flex items-center gap-1 bg-cyan-50 dark:bg-cyan-950/40 px-2.5 py-1 rounded-lg border border-cyan-200/60 ml-auto cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Location Override</span>
                </button>
              </div>

              {/* Location Overrides Table */}
              <div className="pt-1">
                <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 shadow-2xs">
                  <table className="w-full text-left text-xs font-medium text-slate-700 dark:text-slate-300">
                    <thead className="bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="px-3.5 py-2.5 w-16 text-[11px] font-bold">Action</th>
                        <th className="px-3.5 py-2.5 text-[11px] font-bold">Week Day</th>
                        <th className="px-3.5 py-2.5 text-[11px] font-bold">Company / Location</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                      {allOrgSettings
                        .filter(row => row.default_week_day !== null && row.default_week_day !== undefined && row.default_week_day !== '')
                        .map((row, idx) => {
                          const locationObj = locations.find(l => l.uuid === row.location_id || (row.location_id === null && (l.uuid === '' || l.uuid === 'org-location-default')));
                          const dayName = row.default_week_day ? (row.default_week_day.charAt(0).toUpperCase() + row.default_week_day.slice(1)) : '-';
                          return (
                            <tr key={row.id || idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/60 transition-colors">
                              <td className="px-3.5 py-2 flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setModalSelectedLocations([row.location_id || '']);
                                    setModalSelectedWeekDay(row.default_week_day || 'Monday');
                                    setIsLeaveWeekModalOpen(true);
                                  }}
                                  className="text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
                                  title="Edit"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (await window.appConfirm("Are you sure you want to delete this setting?")) {
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
                                  className="text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                                  title="Delete"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </td>
                              <td className="px-3.5 py-2 font-semibold text-slate-900 dark:text-white">{dayName}</td>
                              <td className="px-3.5 py-2 text-slate-500 dark:text-slate-400 font-medium">
                                {locationObj ? locationObj.name : (companyName || 'Global Default')}
                              </td>
                            </tr>
                          );
                        })}
                      {allOrgSettings.filter(row => row.default_week_day !== null && row.default_week_day !== undefined && row.default_week_day !== '').length === 0 && (
                        <tr>
                          <td colSpan={3} className="px-4 py-4 text-center text-slate-400 text-[11px]">
                            No location overrides configured.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* APPLICATION PREFERENCES & REMINDERS CARD */}
          <Card className="border border-slate-200 dark:border-slate-800 shadow-xs rounded-xl relative">
            <CardHeader className="pb-2.5 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/30">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
                  <Bell className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="flex items-center">
                    <CardTitle className="text-xs font-bold text-slate-900 dark:text-white">
                      Application Preferences & Reminders
                    </CardTitle>
                    <HelpHint
                      title="Application Preferences"
                      titleHi="आवेदन प्राथमिकताएँ"
                      description="Configure backup person prompts, popup warnings, and date restriction enforcement."
                      descriptionHi="बैकअप पर्सन, पॉपअप चेतावनियां और तारीख प्रतिबंध लागू करने की प्राथमिकता तय करें।"
                    />
                  </div>
                  <CardDescription className="text-[11px] text-slate-500">
                    Enable optional application fields, warning popups, and advance notice rules.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-3.5 space-y-3">
              <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl border border-slate-200/60 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/30 hover:bg-slate-50 dark:hover:bg-slate-900/60 transition-colors">
                <input
                  type="checkbox"
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 mt-0.5 h-4 w-4 cursor-pointer"
                  checked={disableLeaveApplicationReminder}
                  onChange={(e) => setDisableLeaveApplicationReminder(e.target.checked)}
                />
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                    Disable leave application reminder on dashboard
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                    <strong>Checked:</strong> Hides the dashboard banner reminding employees to apply for missing leaves.<br />
                    <strong>Unchecked:</strong> Shows reminders when employees have missing attendance logs.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl border border-slate-200/60 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/30 hover:bg-slate-50 dark:hover:bg-slate-900/60 transition-colors">
                <input
                  type="checkbox"
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 mt-0.5 h-4 w-4 cursor-pointer"
                  checked={enableBackupPerson}
                  onChange={(e) => setEnableBackupPerson(e.target.checked)}
                />
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    Enable Backup Person Selection in Apply for Leave Modal
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                    <strong>Checked (ON):</strong> Displays the Backup Person field when employees submit leave requests.<br />
                    <strong>Unchecked (OFF):</strong> Hides the Backup Person field.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl border border-slate-200/60 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/30 hover:bg-slate-50 dark:hover:bg-slate-900/60 transition-colors">
                <input
                  type="checkbox"
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 mt-0.5 h-4 w-4 cursor-pointer"
                  checked={showPopupOnWeekOffOrHoliday}
                  onChange={(e) => setShowPopupOnWeekOffOrHoliday(e.target.checked)}
                />
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                    Show Popup on Leave Application on Week off or Holiday
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                    <strong>Checked:</strong> Displays a warning popup if employees apply on weekends or public holidays.<br />
                    <strong>Unchecked:</strong> Ignores week offs and holidays automatically without popups.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl border border-slate-200/60 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/30 hover:bg-slate-50 dark:hover:bg-slate-900/60 transition-colors">
                <input
                  type="checkbox"
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 mt-0.5 h-4 w-4 cursor-pointer"
                  checked={leaveApplicationDateRestriction}
                  onChange={(e) => setLeaveApplicationDateRestriction(e.target.checked)}
                  id="date-restriction"
                />
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                    Leave Application Date Restriction (Advance Notice & Grace Period)
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                    <strong>Checked:</strong> Enforces strict advance notice periods and grace days.<br />
                    <strong>Unchecked:</strong> Allows past or future leaves without date restrictions.
                  </span>
                </div>
              </label>

              <div className="pt-2">
                <Button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 px-5 rounded-xl flex items-center gap-1.5 shadow-sm shadow-emerald-500/20 cursor-pointer transition-all active:scale-95"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSaving ? 'Saving...' : 'Save Organization Settings'}</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      )}
      {/* Holiday Year Start Month Modal (Holiday Month Setting) */}
      <Dialog open={isHolidayMonthModalOpen} onOpenChange={setIsHolidayMonthModalOpen}>
        <DialogContent className="sm:max-w-[480px] p-5 rounded-2xl shadow-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <DialogHeader className="border-b border-slate-100 dark:border-slate-800 pb-3 mb-3">
            <DialogTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center justify-between">
              <span>Holiday Month Setting</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveHolidayMonthSetting} className="space-y-4">
            {/* Accordion Location List */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
              <button
                type="button"
                onClick={() => setIsModalLocationExpanded(!isModalLocationExpanded)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between border-b border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  {isModalLocationExpanded ? '[-]' : '[+]'} Select Company Locations
                </span>
                {modalSelectedLocations.length > 0 && (
                  <span className="bg-indigo-600 text-white rounded-full text-[10px] w-5 h-5 flex items-center justify-center font-bold">
                    {modalSelectedLocations.length}
                  </span>
                )}
              </button>

              {isModalLocationExpanded && (
                <div className="p-3 space-y-2.5 bg-white dark:bg-slate-900 max-h-48 overflow-y-auto">
                  <label className="flex items-center gap-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer border-b pb-2 mb-1 w-full">
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
                      className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    {locations.length > 0 && locations.every(loc => modalSelectedLocations.includes(loc.uuid)) ? 'Unselect All' : 'Select All Locations'}
                  </label>

                  {locations.map((loc) => (
                    <label key={loc.uuid} className="flex items-center gap-2.5 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer hover:text-indigo-600">
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
                        className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      {loc.name}
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Month Dropdown Selector */}
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                Select Holiday Start Month
              </Label>
              <select
                value={modalSelectedMonth}
                onChange={(e) => setModalSelectedMonth(parseInt(e.target.value) || 4)}
                className="w-full h-8 px-2.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 font-medium"
              >
                {months.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Save Button */}
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="submit"
                disabled={isSaving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 px-4 rounded-lg flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save Setting</span>
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Leave Year Month Setting Modal */}
      <Dialog open={isLeaveYearModalOpen} onOpenChange={setIsLeaveYearModalOpen}>
        <DialogContent className="sm:max-w-[480px] p-5 rounded-2xl shadow-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <DialogHeader className="border-b border-slate-100 dark:border-slate-800 pb-3 mb-3">
            <DialogTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center justify-between">
              <span>Leave Year Month Setting</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveLeaveYearSetting} className="space-y-4">
            {/* Accordion Location List */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
              <button
                type="button"
                onClick={() => setIsModalLocationExpanded(!isModalLocationExpanded)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between border-b border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  {isModalLocationExpanded ? '[-]' : '[+]'} Select Company Locations
                </span>
                {modalSelectedLocations.length > 0 && (
                  <span className="bg-indigo-600 text-white rounded-full text-[10px] w-5 h-5 flex items-center justify-center font-bold">
                    {modalSelectedLocations.length}
                  </span>
                )}
              </button>

              {isModalLocationExpanded && (
                <div className="p-3 space-y-2.5 bg-white dark:bg-slate-900 max-h-48 overflow-y-auto">
                  <label className="flex items-center gap-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer border-b pb-2 mb-1 w-full">
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
                      className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    {locations.length > 0 && locations.every(loc => modalSelectedLocations.includes(loc.uuid)) ? 'Unselect All' : 'Select All Locations'}
                  </label>

                  {locations.map((loc) => (
                    <label key={loc.uuid} className="flex items-center gap-2.5 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer hover:text-indigo-600">
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
                        className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      {loc.name}
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Month Dropdown Selector */}
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                Select Leave Year Month
              </Label>
              <select
                value={modalSelectedLeaveMonth}
                onChange={(e) => setModalSelectedLeaveMonth(parseInt(e.target.value) || 1)}
                className="w-full h-8 px-2.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 font-medium"
              >
                {months.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Save Button */}
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="submit"
                disabled={isSaving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 px-4 rounded-lg flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save Setting</span>
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Leave Week Setting Modal */}
      <Dialog open={isLeaveWeekModalOpen} onOpenChange={setIsLeaveWeekModalOpen}>
        <DialogContent className="sm:max-w-[480px] p-5 rounded-2xl shadow-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <DialogHeader className="border-b border-slate-100 dark:border-slate-800 pb-3 mb-3">
            <DialogTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center justify-between">
              <span>Leave Week Setting</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveLeaveWeekSetting} className="space-y-4">
            {/* Accordion Location List */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
              <button
                type="button"
                onClick={() => setIsModalLocationExpanded(!isModalLocationExpanded)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between border-b border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  {isModalLocationExpanded ? '[-]' : '[+]'} Select Company Locations
                </span>
                {modalSelectedLocations.length > 0 && (
                  <span className="bg-indigo-600 text-white rounded-full text-[10px] w-5 h-5 flex items-center justify-center font-bold">
                    {modalSelectedLocations.length}
                  </span>
                )}
              </button>

              {isModalLocationExpanded && (
                <div className="p-3 space-y-2.5 bg-white dark:bg-slate-900 max-h-48 overflow-y-auto">
                  <label className="flex items-center gap-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer border-b pb-2 mb-1 w-full">
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
                      className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    {locations.length > 0 && locations.every(loc => modalSelectedLocations.includes(loc.uuid)) ? 'Unselect All' : 'Select All Locations'}
                  </label>

                  {locations.map((loc) => (
                    <label key={loc.uuid} className="flex items-center gap-2.5 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer hover:text-indigo-600">
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
                        className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      {loc.name}
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Week Day Dropdown Selector */}
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                Select Starting Week Day
              </Label>
              <select
                value={modalSelectedWeekDay}
                onChange={(e) => setModalSelectedWeekDay(e.target.value)}
                className="w-full h-8 px-2.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 font-medium capitalize"
              >
                {daysOfWeek.map((day) => (
                  <option key={day} value={day}>
                    {day.charAt(0).toUpperCase() + day.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Save Button */}
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="submit"
                disabled={isSaving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 px-4 rounded-lg flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save Setting</span>
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}
