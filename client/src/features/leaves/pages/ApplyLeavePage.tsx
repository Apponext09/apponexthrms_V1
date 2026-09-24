import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApplyLeave } from '../hooks/useLeave';
import { useLeaveBalance } from '../hooks/useLeaveBalance';
import { Calendar, Clock, FileText, Send, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/features/auth/store/authStore';
import { apiClient } from '@/lib/api';
import { isLeaveTypeApplicableForGender } from '@/utils/genderFilter';

export function ApplyLeavePage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const currentEmployeeId = (user as any)?.employeeId || (user as any)?.employee_id || user?.id || 1;
  const [formData, setFormData] = useState({
    leaveTypeId: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    reason: '',
    isHalfDay: false,
    halfDayPeriod: 'first_half',
    isHourly: false,
    hourlyDuration: '2',
  });

  const { applyLeave, isLoading, error } = useApplyLeave();
  const { balances, employee } = useLeaveBalance();

  const [resolvedSettings, setResolvedSettings] = useState<any>(null);
  const [holidaysList, setHolidaysList] = useState<any[]>([]);

  useEffect(() => {
    const loadSettingsAndHolidays = async () => {
      try {
        const [settingsRes, holidaysRes, calRes] = await Promise.all([
          apiClient.get('/settings/org-leave-settings/my-resolved').catch(() => ({ data: { success: false } })),
          apiClient.get('/settings/holidays/upcoming?limit=100').catch(() => ({ data: { success: false } })),
          apiClient.get('/leaves/calendar').catch(() => ({ data: { success: false } })),
        ]);

        if (settingsRes.data && settingsRes.data.success) {
          setResolvedSettings(settingsRes.data.data);
        }

        let combinedHolidays: any[] = [];
        if (holidaysRes.data && holidaysRes.data.success && Array.isArray(holidaysRes.data.data)) {
          combinedHolidays = [...holidaysRes.data.data];
        }
        if (calRes.data?.data?.holidays && Array.isArray(calRes.data.data.holidays)) {
          combinedHolidays = [...combinedHolidays, ...calRes.data.data.holidays];
        }
        setHolidaysList(combinedHolidays);
      } catch (err) {
        console.error("Failed to load settings or holidays", err);
      }
    };
    loadSettingsAndHolidays();
  }, []);

  const employeeContext = useMemo(() => ({
    ...(user || {}),
    ...(employee || {}),
    gender: ((employee as any)?.gender || (user as any)?.gender || '').toString().trim().toLowerCase(),
    marital_status: ((employee as any)?.marital_status || (employee as any)?.maritalStatus || (user as any)?.marital_status || '').toString().trim().toLowerCase(),
    current_department_id: (employee as any)?.current_department_id || (employee as any)?.currentDepartmentId || (user as any)?.department_id,
    current_location_id: (employee as any)?.current_location_id || (employee as any)?.currentLocationId || (user as any)?.location_id,
    current_grade_id: (employee as any)?.current_grade_id || (employee as any)?.currentGradeId,
    employment_type: ((employee as any)?.employment_type || (employee as any)?.employmentType || '').toString(),
    status: ((employee as any)?.status || '').toString(),
    date_of_joining: (employee as any)?.date_of_joining || (employee as any)?.dateOfJoining,
    date_of_confirmation: (employee as any)?.date_of_confirmation || (employee as any)?.dateOfConfirmation,
  }), [user, employee]);

  const selectedBalance = balances.find((b: any) => String(b.leave_type_id || b.leaveTypeId) === formData.leaveTypeId);
  const isRuleRestricted = selectedBalance ? !isLeaveTypeApplicableForGender(selectedBalance, employeeContext) : false;
  const isGenderRestricted = isRuleRestricted;
<<<<<<< HEAD
  const leaveGender = (selectedBalance as any)?.applicable_gender || (selectedBalance as any)?.applicableGender || '';
=======
  const leaveGender = (selectedBalance as any)?.applicable_gender || (selectedBalance as any)?.applicableGender || (selectedBalance as any)?.gender || 'specific';
>>>>>>> b13431884f6e3fb77d4463ab4da204cadac8faca

  const isProbationUser = employee?.status === 'probation' || (employee?.probationEndDate && new Date(employee.probationEndDate) > new Date());
  const isProbationRestricted = isProbationUser && Boolean(selectedBalance?.probation_excluded || selectedBalance?.probationExcluded);

  const isBlocked = isRuleRestricted || isProbationRestricted;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.leaveTypeId || !formData.startDate || !formData.endDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (isBlocked || isRuleRestricted) {
      toast.error('You do not meet the eligibility conditions configured for this leave category.');
      return;
    }

    if (isProbationRestricted) {
      toast.error('Leaves of this category cannot be applied for during probation period.');
      return;
    }

    if (resolvedSettings?.showPopupOnWeekOffOrHoliday) {
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const startDayName = dayNames[new Date(formData.startDate).getDay()];
      const endDayName = dayNames[new Date(formData.endDate).getDay()];

      const isStartWeekOff = resolvedSettings.weeklyWorkPattern?.[startDayName]?.is_working === false;
      const isEndWeekOff = resolvedSettings.weeklyWorkPattern?.[endDayName]?.is_working === false;

      const getFormattedDate = (dStr: any) => {
        if (!dStr) return '';
        try {
          return new Date(dStr).toISOString().split('T')[0];
        } catch (e) {
          return '';
        }
      };

      const isStartHoliday = holidaysList.some(h => getFormattedDate(h.date || h.holidayDate) === formData.startDate);
      const isEndHoliday = holidaysList.some(h => getFormattedDate(h.date || h.holidayDate) === formData.endDate);

      if (isStartWeekOff || isEndWeekOff || isStartHoliday || isEndHoliday) {
        const proceed = await window.appConfirm("Your selected leave date falls on a weekend or public holiday. Do you still want to apply?");
        if (!proceed) return;
      }
    }

    try {
      await applyLeave({
        employeeId: currentEmployeeId,
        leaveTypeId: parseInt(formData.leaveTypeId, 10),
        startDate: formData.startDate,
        endDate: formData.endDate,
        reason: formData.reason,
        isHalfDay: formData.isHalfDay,
        halfDayPeriod: formData.isHalfDay ? (formData.halfDayPeriod as any) : undefined,
        isHourly: formData.isHourly,
        hourlyDuration: formData.isHourly ? parseInt(formData.hourlyDuration, 10) : undefined,
      });

      toast.success('Leave application submitted successfully!');
      navigate('/leaves');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit leave application');
    }
  };

  const getAvailableBalance = (leaveTypeId: string): number => {
    if (!leaveTypeId) return 0;
    const balance = balances.find((b: any) => (b.leave_type_id || b.leaveTypeId) === parseInt(leaveTypeId, 10));
    return balance ? ((balance as any).available_balance ?? (balance as any).availableBalance ?? 0) : 0;
  };

  const getEstimatedDays = (): number => {
    if (!formData.startDate || !formData.endDate) return 0;
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    const diffTime = end.getTime() - start.getTime();
    if (diffTime < 0) return 0;
    let diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    if (formData.isHalfDay) diffDays -= 0.5;
    if (formData.isHourly) {
      diffDays = parseInt(formData.hourlyDuration, 10) / 8;
    }
    return diffDays > 0 ? diffDays : 0;
  };

  const estimatedDays = getEstimatedDays();
  const availableBal = getAvailableBalance(formData.leaveTypeId);
  const exceedsBalance = estimatedDays > availableBal;

  return (
    <div className="flex flex-col min-h-screen bg-background p-4 sm:p-6">
      <div className="max-w-4xl mx-auto space-y-6 w-full">
        {/* Header */}
        <div className="flex items-center space-x-4 bg-card border border-border/80 p-4 sm:p-5 rounded-xl shadow-2xs">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg border border-border hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-black text-foreground tracking-tight">Apply for Leave</h1>
            <p className="text-xs text-muted-foreground">Submit a leave request for manager approval</p>
          </div>
        </div>

        {error && (
          <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-semibold flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{typeof error === 'string' ? error : (error as any)?.message || 'An error occurred'}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <form onSubmit={handleSubmit} className="p-6 rounded-xl border border-border bg-card space-y-4 shadow-xs">
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-foreground flex items-center space-x-1.5 mb-1.5">
                    <FileText className="w-3.5 h-3.5 text-primary" />
                    <span>Leave Type *</span>
                  </label>
                  <select
                    name="leaveTypeId"
                    value={formData.leaveTypeId}
                    onChange={handleChange}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    required
                  >
                    <option value="">Select Leave Category</option>
                    {balances
                      .filter((b: any) => isLeaveTypeApplicableForGender(b, employeeContext))
                      .map((b: any) => (
                        <option key={b.leave_type_id || b.leaveTypeId} value={String(b.leave_type_id || b.leaveTypeId)}>
                          {b.leave_name || b.leaveName || `Category ${b.leave_type_id || b.leaveTypeId}`} ({b.leave_code || b.leaveCode})
                        </option>
                      ))}
                  </select>
                  {formData.leaveTypeId && (() => {
                    const selectedBalance = balances.find((b: any) => String(b.leave_type_id || b.leaveTypeId) === formData.leaveTypeId);
                    const paidType = (selectedBalance as any)?.paid_type || (selectedBalance as any)?.paidType || 'paid';
                    const isGenderRestricted = false;
                    const leaveGender = '';
                    const isProbationRestricted = false;
                    return (
                      <div className="space-y-2 pt-0.5">
                        <div className="flex items-center space-x-3 text-xs font-semibold">
                          <div className="flex items-center space-x-1 text-primary">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Available Balance: {availableBal} days</span>
                          </div>
                          <span>•</span>
                          {paidType === 'paid' && (
                            <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded-sm font-bold dark:bg-blue-950/20">Fully Paid Leave</span>
                          )}
                          {paidType === 'unpaid' && (
                            <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded-sm font-bold dark:bg-rose-950/20">Unpaid Leave (100% LOP)</span>
                          )}
                          {paidType === 'half_paid' && (
                            <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded-sm font-bold dark:bg-amber-950/20">Half Paid Leave (0.5 days LOP per day)</span>
                          )}
                        </div>

                        {isGenderRestricted && (
                          <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-lg text-xs font-semibold flex items-start space-x-2">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                            <p>
                              <strong>Gender Restriction!</strong> This leave category is only applicable for <strong>{leaveGender}</strong> employees. Your profile gender is <strong>{employee?.gender || 'not specified'}</strong>.
                            </p>
                          </div>
                        )}

                        {isProbationRestricted && (
                          <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-lg text-xs font-semibold flex items-start space-x-2">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                            <p>
                              <strong>Probation Restriction!</strong> You are currently on probation. This leave category is not available for employees on probation.
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                  {exceedsBalance && estimatedDays > 0 && (
                    <div className="mt-2 p-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-lg text-xs font-medium flex items-start space-x-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <p>
                        <strong>Insufficient Balance!</strong> You are requesting <strong>{estimatedDays} days</strong>, but only have <strong>{availableBal} days</strong> available. The excess <strong>{estimatedDays - availableBal} days</strong> will be considered as Loss of Pay (LOP) or fallback to pool leave per organization policy upon approval.
                      </p>
                    </div>
                  )}
                </div>

                {/* Start Date */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground flex items-center space-x-1.5">
                    <Calendar className="w-3.5 h-3.5 text-primary" />
                    <span>Start Date *</span>
                  </label>
                  <input
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleChange}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    required
                  />
                </div>

                {/* End Date */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground flex items-center space-x-1.5">
                    <Calendar className="w-3.5 h-3.5 text-primary" />
                    <span>End Date *</span>
                  </label>
                  <input
                    type="date"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleChange}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    required
                  />
                </div>
              </div>

              {/* Half Day Option */}
              <div className="p-3.5 bg-muted/40 rounded-lg border border-border/60 space-y-2.5">
                <label className="flex items-center space-x-2 text-xs font-semibold text-foreground cursor-pointer select-none">
                  <input
                    type="checkbox"
                    name="isHalfDay"
                    checked={formData.isHalfDay}
                    onChange={handleChange}
                    className="w-4 h-4 rounded border-input text-primary focus:ring-primary"
                  />
                  <span>Is this a Half-Day Leave request?</span>
                </label>

                {formData.isHalfDay && (
                  <div className="space-y-1 pt-1">
                    <label className="text-[11px] font-bold text-muted-foreground flex items-center space-x-1">
                      <Clock className="w-3 h-3 text-primary" />
                      <span>Half Day Session</span>
                    </label>
                    <select
                      name="halfDayPeriod"
                      value={formData.halfDayPeriod}
                      onChange={handleChange}
                      className="flex h-8 w-full rounded-md border border-input bg-background px-2.5 py-1 text-xs font-medium"
                    >
                      <option value="first_half">First Half (Morning Session)</option>
                      <option value="second_half">Second Half (Afternoon Session)</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Hourly Option */}
              <div className="p-3.5 bg-muted/40 rounded-lg border border-border/60 space-y-2.5">
                <label className="flex items-center space-x-2 text-xs font-semibold text-foreground cursor-pointer select-none">
                  <input
                    type="checkbox"
                    name="isHourly"
                    checked={formData.isHourly}
                    disabled={formData.isHalfDay}
                    onChange={(e) => {
                      setFormData((prev) => ({
                        ...prev,
                        isHourly: e.target.checked,
                        endDate: prev.startDate,
                      }));
                    }}
                    className="w-4 h-4 rounded border-input text-primary focus:ring-primary"
                  />
                  <span>Is this an Hourly/Short Leave request?</span>
                </label>

                {formData.isHourly && (
                  <div className="space-y-1.5 pt-1">
                    <label className="text-[11px] font-bold text-muted-foreground flex items-center space-x-1">
                      <Clock className="w-3 h-3 text-primary" />
                      <span>Hourly Duration (Hours)</span>
                    </label>
                    <select
                      name="hourlyDuration"
                      value={formData.hourlyDuration}
                      onChange={handleChange}
                      className="flex h-8 w-full rounded-md border border-input bg-background px-2.5 py-1 text-xs font-medium"
                    >
                      <option value="1">1 Hour</option>
                      <option value="2">2 Hours</option>
                      <option value="3">3 Hours</option>
                      <option value="4">4 Hours</option>
                      <option value="5">5 Hours</option>
                      <option value="6">6 Hours</option>
                      <option value="7">7 Hours</option>
                      <option value="8">8 Hours (Full Day)</option>
                    </select>
                    <p className="text-[10px] text-muted-foreground">Note: For hourly leave, start date and end date will match automatically.</p>
                  </div>
                )}
              </div>

              {/* Reason */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground block">
                  Reason / Notes
                </label>
                <textarea
                  name="reason"
                  value={formData.reason}
                  onChange={handleChange}
                  rows={3}
                  className="w-full p-3 text-xs bg-background border border-input rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Please describe the reason for your leave request..."
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-border/60">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="px-4 py-2 text-xs font-semibold text-foreground bg-muted hover:bg-accent rounded-lg transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isLoading || isBlocked}
                  className="px-5 py-2 text-xs font-semibold text-primary-foreground bg-primary hover:bg-primary/90 disabled:opacity-50 rounded-lg shadow-2xs transition-all flex items-center space-x-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isLoading ? 'Submitting Application...' : isBlocked ? 'Leave Restricted' : 'Submit Leave Request'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
}
