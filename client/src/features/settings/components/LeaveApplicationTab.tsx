import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RuleConditionBuilder } from './RuleConditionBuilder';
import { MultiSelectDropdown, MultiSelectOption } from './MultiSelectDropdown';
import { HelpHint } from './HelpHint';
import { 
  Calendar, 
  Layers, 
  Hourglass, 
  PieChart, 
  FileCheck, 
  ShieldAlert, 
  GitMerge, 
  MapPin,
  GitBranch,
  Info,
  Filter,
} from 'lucide-react';

interface LeaveApplicationTabProps {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  companies?: { id: number; name: string }[];
  departments: { id: number; name: string }[];
  locations: { id: number; name: string }[];
  gradeOptions: string[];
  employeeTypeOptions: string[];
  leaveTypes: any[];
}

export const LeaveApplicationTab: React.FC<LeaveApplicationTabProps> = ({
  formData,
  setFormData,
  companies = [],
  departments,
  locations,
  gradeOptions,
  leaveTypes,
}) => {
  const app = formData.application || {};

  const updateApp = (key: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      application: {
        ...prev.application,
        [key]: value,
      },
    }));
  };

  const updateEmployment = (category: string, id: any) => {
    setFormData((prev: any) => {
      const currentArr = prev.employment_application?.[category] || [];
      const exists = currentArr.some((x: any) => String(x) === String(id));
      const updated = exists
        ? currentArr.filter((x: any) => String(x) !== String(id))
        : [...currentArr, id];
      return {
        ...prev,
        employment_application: {
          ...prev.employment_application,
          [category]: updated,
        },
      };
    });
  };

  const toggleSelectAll = (category: string, allItems: any[]) => {
    setFormData((prev: any) => {
      const currentArr = prev.employment_application?.[category] || [];
      const allSelected =
        allItems.length > 0 &&
        allItems.every((item) => currentArr.some((x: any) => String(x) === String(item.id)));
      const updated = allSelected ? [] : allItems.map((item) => item.id);
      return {
        ...prev,
        employment_application: {
          ...prev.employment_application,
          [category]: updated,
        },
      };
    });
  };

  const toggleAllowedUnit = (unit: string) => {
    const current = app.allowedUnits || ['fullday', 'halfday'];
    const updated = current.includes(unit)
      ? current.filter((u: string) => u !== unit)
      : [...current, unit];
    updateApp('allowedUnits', updated);
  };

  const otherLeaveTypes = leaveTypes.filter((lt) => lt.id !== formData.id);

  const leaveTypeOptions: MultiSelectOption[] = otherLeaveTypes.map((lt) => ({
    id: lt.id,
    label: lt.leaveName || lt.leave_name,
  }));

  const dayTypeOptions: MultiSelectOption[] = [
    { id: 'weekends', label: 'Weekends' },
    { id: 'public_holidays', label: 'Public Holidays' },
  ];

  return (
    <div className="space-y-5 text-slate-800 dark:text-slate-100">
      {/* 1. When it can be requested */}
      <Card className="border border-slate-200/90 dark:border-slate-800 shadow-2xs rounded-xl bg-white dark:bg-slate-950">
        <CardHeader className="bg-slate-50/60 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800/80 pb-3">
          <div className="flex items-center gap-1.5">
            <CardTitle className="text-xs font-bold text-slate-900 dark:text-white">
              When it can be requested
            </CardTitle>
            <Info className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <CardDescription className="text-[11px] text-slate-500">
            Which dates a request may cover, and how far ahead or behind today.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 space-y-3.5 text-xs text-slate-700 dark:text-slate-300">
          {/* Checkbox 1: Past dates */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-200 cursor-pointer">
                <Checkbox
                  checked={app.pastDates !== false}
                  onCheckedChange={(c) => updateApp('pastDates', !!c)}
                />
                <span>Past dates</span>
              </label>
              <HelpHint
                title="Allow Past Dates (Retrospective Leave)"
                titleHi="बीती तारीखों पर लीव की अनुमति"
                description="Allows employees to submit leave applications for dates that have already passed."
                descriptionHi="कर्मचारियों को बीती हुई तारीखों के लिए लीव आवेदन जमा करने की अनुमति दें।"
                effect="Past Dates Enabled = Employee can apply for a leave taken yesterday or last week up to X days limit."
                effectHi="सक्षम होने पर कर्मचारी बीते दिनों की छुट्टी के लिए सिस्टम में बैकडेटेड रिक्वेस्ट डाल सकेंगे।"
                example="Apply up to 7 days in the past."
              />
            </div>

            {app.pastDates !== false && (
              <div className="flex flex-wrap items-center gap-2 pl-6">
                <span>Up to</span>
                <Input
                  type="number"
                  value={app.pastDaysLimit ?? ''}
                  onChange={(e) => updateApp('pastDaysLimit', e.target.value)}
                  placeholder=""
                  className="w-20 h-7 text-center text-xs font-semibold"
                />
                <select
                  value={app.pastDaysUnit || 'calendar_days'}
                  onChange={(e) => updateApp('pastDaysUnit', e.target.value)}
                  className="h-7 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2 text-xs font-medium"
                >
                  <option value="calendar_days">calendar days</option>
                  <option value="working_days">working days</option>
                </select>
                <span>into the past — leave blank for no limit</span>
              </div>
            )}
          </div>

          {/* Checkbox 2: Future dates */}
          <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-200 cursor-pointer">
                <Checkbox
                  checked={app.futureDates !== false}
                  onCheckedChange={(c) => updateApp('futureDates', !!c)}
                />
                <span>Future dates</span>
              </label>
              <HelpHint
                title="Allow Future Dates & Advance Notice Window"
                titleHi="भविष्य की तारीखों में लीव बुकिंग और नोटिस पीरियड"
                description="Allows employees to book leave for upcoming future dates with maximum booking window & notice period constraints."
                descriptionHi="कर्मचारियों को आने वाली तारीखों के लिए अग्रिम में लीव अप्लाई करने दें।"
                effect="Up to 90 days = Select dates within next 90 days. Requested 3 days in advance = Must apply at least 3 days before leave date."
                effectHi="Up to 90 days चुनने पर कर्मचारी अगले 90 दिनों की तारीखें ही चुन सकेंगे; 3 days in advance चुनने पर कम से कम 3 दिन पहले अप्लाई करना अनिवार्य होगा।"
                example="Apply at least 3 days in advance."
              />
            </div>

            {app.futureDates !== false && (
              <div className="space-y-2 pl-6">
                <div className="flex flex-wrap items-center gap-2">
                  <span>Up to</span>
                  <Input
                    type="number"
                    value={app.upToDaysAhead ?? ''}
                    onChange={(e) => updateApp('upToDaysAhead', e.target.value)}
                    placeholder=""
                    className="w-20 h-7 text-center text-xs font-semibold"
                  />
                  <span>days ahead — leave blank for no limit</span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span>Requested at least</span>
                  <Input
                    type="number"
                    value={app.daysInAdvance ?? ''}
                    onChange={(e) => updateApp('daysInAdvance', e.target.value)}
                    placeholder=""
                    className="w-20 h-7 text-center text-xs font-semibold"
                  />
                  <span>days in advance</span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span>Count both as</span>
                  <select
                    value={app.countBothAs || 'calendar_days'}
                    onChange={(e) => updateApp('countBothAs', e.target.value)}
                    className="h-7 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2.5 text-xs font-medium"
                  >
                    <option value="calendar_days">calendar days</option>
                    <option value="working_days">working days</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 2. Size of one request */}
      <Card className="border border-slate-200/90 dark:border-slate-800 shadow-2xs rounded-xl bg-white dark:bg-slate-950">
        <CardHeader className="bg-slate-50/60 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800/80 pb-3">
          <div className="flex items-center gap-1.5">
            <CardTitle className="text-xs font-bold text-slate-900 dark:text-white">
              Size of one request
            </CardTitle>
            <Info className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <CardDescription className="text-[11px] text-slate-500">
            The shortest and longest a single request may be, and the part-days it may be taken in.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 space-y-3 text-xs text-slate-700 dark:text-slate-300">
          <div className="flex flex-wrap items-center gap-2">
            <span>One request must be between</span>
            <Input
              type="number"
              step="0.25"
              value={app.minDaysAllowed ?? ''}
              onChange={(e) => updateApp('minDaysAllowed', e.target.value)}
              placeholder=""
              className="w-20 h-7 text-center text-xs font-semibold"
            />
            <span>and</span>
            <Input
              type="number"
              step="0.5"
              value={app.maxDaysAllowed ?? ''}
              onChange={(e) => updateApp('maxDaysAllowed', e.target.value)}
              placeholder=""
              className="w-20 h-7 text-center text-xs font-semibold"
            />
            <span>days long</span>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span>It may be requested as</span>
            <div className="flex flex-wrap gap-2.5">
              {[
                { id: 'fullday', label: 'Full day' },
                { id: 'halfday', label: 'Half day' },
                { id: 'quarterday', label: 'Quarter day (2 Hours)' },
              ].map((unit) => {
                const isSelected = (app.allowedUnits || ['fullday', 'halfday']).includes(unit.id);
                return (
                  <label key={unit.id} className="flex items-center gap-1.5 cursor-pointer bg-slate-50 dark:bg-slate-900 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-800">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleAllowedUnit(unit.id)}
                    />
                    <span className="text-[11px] font-medium">{unit.label}</span>
                  </label>
                );
              })}
            </div>
            <span className="text-slate-400">— select none to allow every duration</span>
          </div>
        </CardContent>
      </Card>

      {/* 3. Gap between requests */}
      <Card className="border border-slate-200/90 dark:border-slate-800 shadow-2xs rounded-xl bg-white dark:bg-slate-950">
        <CardHeader className="bg-slate-50/60 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800/80 pb-3">
          <div className="flex items-center gap-1.5">
            <CardTitle className="text-xs font-bold text-slate-900 dark:text-white">
              Gap between requests
            </CardTitle>
            <Info className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <CardDescription className="text-[11px] text-slate-500">
            How long an employee must wait before applying again, and which leave the wait is measured against.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 text-xs text-slate-700 dark:text-slate-300">
          <div className="flex flex-wrap items-center gap-2">
            <span>Wait</span>
            <Input
              type="number"
              value={app.gapBetweenApplication ?? ''}
              onChange={(e) => updateApp('gapBetweenApplication', e.target.value)}
              placeholder=""
              className="w-16 h-7 text-center text-xs font-semibold"
            />
            <select
              value={app.gapBetweenApplicationUnit || 'Days'}
              onChange={(e) => updateApp('gapBetweenApplicationUnit', e.target.value)}
              className="h-7 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2 text-xs font-medium"
            >
              <option value="Days">calendar days</option>
              <option value="WorkingDays">working days</option>
              <option value="Weeks">weeks</option>
            </select>
            <span>after</span>
            <MultiSelectDropdown
              placeholder="choose leave types..."
              options={leaveTypeOptions}
              selectedIds={app.gapLeaveTypeIds || []}
              onChange={(newIds) => updateApp('gapLeaveTypeIds', newIds)}
            />
            <span>before applying again</span>
          </div>
        </CardContent>
      </Card>

      {/* 4. How much in a period */}
      <Card className="border border-slate-200/90 dark:border-slate-800 shadow-2xs rounded-xl bg-white dark:bg-slate-950">
        <CardHeader className="bg-slate-50/60 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800/80 pb-3">
          <div className="flex items-center gap-1.5">
            <CardTitle className="text-xs font-bold text-slate-900 dark:text-white">
              How much in a period
            </CardTitle>
            <Info className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <CardDescription className="text-[11px] text-slate-500">
            How often this leave can be requested, and how many days can be taken, inside a single period.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 space-y-3 text-xs text-slate-700 dark:text-slate-300">
          <div className="flex flex-wrap items-center gap-2">
            <span>No more than</span>
            <Input
              type="number"
              value={app.noOfTimesEmployeeCanApply ?? app.numTimesEmployeeCanApply ?? ''}
              onChange={(e) => updateApp('noOfTimesEmployeeCanApply', e.target.value)}
              placeholder=""
              className="w-16 h-7 text-center text-xs font-semibold"
            />
            <span>requests in each</span>
            <select
              value={app.noOfTimesEmployeeCanApplyUnit || 'Per Month'}
              onChange={(e) => updateApp('noOfTimesEmployeeCanApplyUnit', e.target.value)}
              className="h-7 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2 text-xs font-medium"
            >
              <option value="Per Month">period (Month)</option>
              <option value="Per Quarter">Quarter</option>
              <option value="Per Year">Year</option>
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span>No more than</span>
            <Input
              type="number"
              step="0.5"
              value={app.noOfLeavesEmployeeCanApply ?? app.numLeavesEmployeeCanApply ?? ''}
              onChange={(e) => updateApp('noOfLeavesEmployeeCanApply', e.target.value)}
              placeholder=""
              className="w-16 h-7 text-center text-xs font-semibold"
            />
            <span>days in each</span>
            <select
              value={app.noOfLeavesEmployeeCanApplyUnit || 'Per Month'}
              onChange={(e) => updateApp('noOfLeavesEmployeeCanApplyUnit', e.target.value)}
              className="h-7 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2 text-xs font-medium"
            >
              <option value="Per Month">period (Month)</option>
              <option value="Per Quarter">Quarter</option>
              <option value="Per Year">Year</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* 5. Which days it may cover */}
      <Card className="border border-slate-200/90 dark:border-slate-800 shadow-2xs rounded-xl bg-white dark:bg-slate-950">
        <CardHeader className="bg-slate-50/60 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800/80 pb-3">
          <div className="flex items-center gap-1.5">
            <CardTitle className="text-xs font-bold text-slate-900 dark:text-white">
              Which days it may cover
            </CardTitle>
            <Info className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <CardDescription className="text-[11px] text-slate-500">
            Restrict this leave to particular kinds of day, such as a birthday.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 text-xs text-slate-700 dark:text-slate-300">
          <div className="flex flex-wrap items-center gap-2">
            <span>It may be requested only on a</span>
            <select
              value={app.whichDayType || 'Select'}
              onChange={(e) => updateApp('whichDayType', e.target.value)}
              className="h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2.5 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="Select">Select...</option>
              <option value="birthday">Birthday</option>
              <option value="work_anniversary">Work Anniversary</option>
              <option value="weekend">Weekend</option>
              <option value="holiday">Public Holiday</option>
            </select>
            <span className="text-slate-400">— select none to allow any day</span>
          </div>
        </CardContent>
      </Card>

      {/* 6. Require a supporting document */}
      <Card className="border border-slate-200/90 dark:border-slate-800 shadow-2xs rounded-xl bg-white dark:bg-slate-950">
        <CardHeader className="bg-slate-50/60 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800/80 pb-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={!!app.supportingDocumentsRequired}
              onCheckedChange={(c) => updateApp('supportingDocumentsRequired', !!c)}
            />
            <div className="flex items-center gap-1.5">
              <CardTitle className="text-xs font-bold text-slate-900 dark:text-white">
                Require a supporting document
              </CardTitle>
              <Info className="w-3.5 h-3.5 text-slate-400" />
            </div>
          </label>
          <CardDescription className="text-[11px] text-slate-500 pl-6">
            The request cannot be submitted without an attachment.
          </CardDescription>
        </CardHeader>
        {app.supportingDocumentsRequired && (
          <CardContent className="p-4 text-xs text-slate-700 dark:text-slate-300 pl-8">
            <div className="flex flex-wrap items-center gap-2">
              <span>Only when the request is longer than</span>
              <Input
                type="number"
                value={app.docRequiredIfLongerThanDays ?? ''}
                onChange={(e) => updateApp('docRequiredIfLongerThanDays', e.target.value)}
                placeholder=""
                className="w-16 h-7 text-center text-xs font-semibold"
              />
              <span>days — leave blank to require one every time</span>
            </div>
          </CardContent>
        )}
      </Card>

      {/* 7. Restrictions */}
      <Card className="border border-slate-200/90 dark:border-slate-800 shadow-2xs rounded-xl bg-white dark:bg-slate-950">
        <CardHeader className="bg-slate-50/60 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800/80 pb-3">
          <div className="flex items-center gap-1.5">
            <CardTitle className="text-xs font-bold text-slate-900 dark:text-white">
              Restrictions
            </CardTitle>
            <Info className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <CardDescription className="text-[11px] text-slate-500">
            Days that are not counted, and requests that are refused outright.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 space-y-3.5 text-xs text-slate-700 dark:text-slate-300">
          <div className="flex flex-wrap items-center gap-2">
            <span>Do not count</span>
            <MultiSelectDropdown
              placeholder="choose day types..."
              options={dayTypeOptions}
              selectedIds={app.excludeDayTypes || []}
              onChange={(newIds) => updateApp('excludeDayTypes', newIds)}
            />
            <span>days that fall inside a leave — select none to count every day</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span>Block leave that starts or ends next to</span>
            <MultiSelectDropdown
              placeholder="choose day types..."
              options={dayTypeOptions}
              selectedIds={app.blockNextToDayTypes || []}
              onChange={(newIds) => updateApp('blockNextToDayTypes', newIds)}
            />
            <span>— select none for no such block</span>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 dark:border-slate-800 pt-2">
            <span>Do not allow {formData.leave_name || 'this leave'} until</span>
            <MultiSelectDropdown
              placeholder="choose leave types..."
              options={leaveTypeOptions}
              selectedIds={app.doNotAllowUntilUsed || []}
              onChange={(newIds) => updateApp('doNotAllowUntilUsed', newIds)}
            />
            <span>is fully used — select none for no such condition</span>
          </div>
        </CardContent>
      </Card>

      {/* 8. Clubbing policy */}
      <Card className="border border-slate-200/90 dark:border-slate-800 shadow-2xs rounded-xl bg-white dark:bg-slate-950">
        <CardHeader className="bg-slate-50/60 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800/80 pb-3">
          <div className="flex items-center gap-1.5">
            <CardTitle className="text-xs font-bold text-slate-900 dark:text-white">
              Clubbing policy
            </CardTitle>
            <Info className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <CardDescription className="text-[11px] text-slate-500">
            The leave types that cannot be taken together with this one.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 text-xs text-slate-700 dark:text-slate-300">
          <div className="flex flex-wrap items-center gap-2">
            <span>The leave cannot be taken along with</span>
            <MultiSelectDropdown
              placeholder="choose leave types..."
              options={leaveTypeOptions}
              selectedIds={app.clubbingRestrictedWith || []}
              onChange={(newIds) => updateApp('clubbingRestrictedWith', newIds)}
            />
            <span>— select none to allow clubbing with any leave</span>
          </div>
        </CardContent>
      </Card>

      {/* 9. Applies to */}
      <Card className="border border-slate-200/90 dark:border-slate-800 shadow-2xs rounded-xl bg-white dark:bg-slate-950">
        <CardHeader className="bg-slate-50/60 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800/80 pb-3">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <CardTitle className="text-xs font-bold text-slate-900 dark:text-white">
              Applies to
            </CardTitle>
          </div>
          <CardDescription className="text-[11px] text-slate-500">
            Leave this empty and these request rules apply to every employee.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Scope Card 1: Company */}
            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
              <div className="flex items-center justify-between text-xs font-semibold mb-2 text-slate-800 dark:text-slate-200">
                <div className="flex items-center gap-2">
                  <span>[-] Company</span>
                  {companies && companies.length > 0 && (
                    <button
                      type="button"
                      onClick={() => toggleSelectAll('companies', companies)}
                      className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-medium cursor-pointer"
                    >
                      {companies.length > 0 && companies.every((c) => (formData.employment_application?.companies || []).some((x: any) => String(x) === String(c.id)))
                        ? 'Clear'
                        : 'Select all'}
                    </button>
                  )}
                </div>
                <span className="text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded font-bold">
                  {formData.employment_application?.companies?.length || 0}
                </span>
              </div>
              <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
                {companies && companies.length > 0 ? (
                  <>
                    <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-800 dark:text-slate-200 cursor-pointer pb-1 border-b border-slate-200/80 dark:border-slate-800 mb-1">
                      <Checkbox
                        checked={companies.length > 0 && companies.every((c) => (formData.employment_application?.companies || []).some((x: any) => String(x) === String(c.id)))}
                        onCheckedChange={() => toggleSelectAll('companies', companies)}
                      />
                      <span>Select All</span>
                    </label>
                    {companies.map((comp) => {
                      const isChecked = (formData.employment_application?.companies || []).some((x: any) => String(x) === String(comp.id));
                      return (
                        <label key={comp.id} className="flex items-center gap-2 text-[11px] text-slate-700 dark:text-slate-300 cursor-pointer">
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => updateEmployment('companies', comp.id)}
                          />
                          <span className="truncate">{comp.name}</span>
                        </label>
                      );
                    })}
                  </>
                ) : (
                  <span className="text-[11px] text-slate-400 italic">No companies found</span>
                )}
              </div>
            </div>

            {/* Scope Card 2: Location */}
            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
              <div className="flex items-center justify-between text-xs font-semibold mb-2 text-slate-800 dark:text-slate-200">
                <div className="flex items-center gap-2">
                  <span>[-] Location</span>
                  {locations && locations.length > 0 && (
                    <button
                      type="button"
                      onClick={() => toggleSelectAll('locations', locations)}
                      className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-medium cursor-pointer"
                    >
                      {locations.length > 0 && locations.every((l) => (formData.employment_application?.locations || []).some((x: any) => String(x) === String(l.id)))
                        ? 'Clear'
                        : 'Select all'}
                    </button>
                  )}
                </div>
                <span className="text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded font-bold">
                  {formData.employment_application?.locations?.length || 0}
                </span>
              </div>
              <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
                {locations && locations.length > 0 ? (
                  <>
                    <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-800 dark:text-slate-200 cursor-pointer pb-1 border-b border-slate-200/80 dark:border-slate-800 mb-1">
                      <Checkbox
                        checked={locations.length > 0 && locations.every((l) => (formData.employment_application?.locations || []).some((x: any) => String(x) === String(l.id)))}
                        onCheckedChange={() => toggleSelectAll('locations', locations)}
                      />
                      <span>Select All</span>
                    </label>
                    {locations.map((loc) => {
                      const isChecked = (formData.employment_application?.locations || []).some((x: any) => String(x) === String(loc.id));
                      return (
                        <label key={loc.id} className="flex items-center gap-2 text-[11px] text-slate-700 dark:text-slate-300 cursor-pointer">
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => updateEmployment('locations', loc.id)}
                          />
                          <span className="truncate">{loc.name}</span>
                        </label>
                      );
                    })}
                  </>
                ) : (
                  <span className="text-[11px] text-slate-400 italic">No locations found</span>
                )}
              </div>
            </div>

            {/* Scope Card 3: Department */}
            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
              <div className="flex items-center justify-between text-xs font-semibold mb-2 text-slate-800 dark:text-slate-200">
                <div className="flex items-center gap-2">
                  <span>[-] Department</span>
                  {departments && departments.length > 0 && (
                    <button
                      type="button"
                      onClick={() => toggleSelectAll('departments', departments)}
                      className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-medium cursor-pointer"
                    >
                      {departments.length > 0 && departments.every((d) => (formData.employment_application?.departments || []).some((x: any) => String(x) === String(d.id)))
                        ? 'Clear'
                        : 'Select all'}
                    </button>
                  )}
                </div>
                <span className="text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded font-bold">
                  {formData.employment_application?.departments?.length || 0}
                </span>
              </div>
              <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
                {departments && departments.length > 0 ? (
                  <>
                    <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-800 dark:text-slate-200 cursor-pointer pb-1 border-b border-slate-200/80 dark:border-slate-800 mb-1">
                      <Checkbox
                        checked={departments.length > 0 && departments.every((d) => (formData.employment_application?.departments || []).some((x: any) => String(x) === String(d.id)))}
                        onCheckedChange={() => toggleSelectAll('departments', departments)}
                      />
                      <span>Select All</span>
                    </label>
                    {departments.map((dept) => {
                      const isChecked = (formData.employment_application?.departments || []).some((x: any) => String(x) === String(dept.id));
                      return (
                        <label key={dept.id} className="flex items-center gap-2 text-[11px] text-slate-700 dark:text-slate-300 cursor-pointer">
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => updateEmployment('departments', dept.id)}
                          />
                          <span className="truncate">{dept.name}</span>
                        </label>
                      );
                    })}
                  </>
                ) : (
                  <span className="text-[11px] text-slate-400 italic">No departments found</span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 10. Only when */}
      <Card className="border border-slate-200/90 dark:border-slate-800 shadow-2xs rounded-xl bg-white dark:bg-slate-950">
        <CardHeader className="bg-slate-50/60 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800/80 pb-3">
          <div className="flex items-center gap-1.5">
            <GitBranch className="w-3.5 h-3.5 text-slate-500" />
            <CardTitle className="text-xs font-bold text-slate-900 dark:text-white">
              Only when
            </CardTitle>
          </div>
          <CardDescription className="text-[11px] text-slate-500">
            Leave this empty and these request rules always apply.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          <RuleConditionBuilder
            value={app.onlyWhen || app.only_when}
            onChange={(newGroup) => updateApp('onlyWhen', newGroup)}
            departments={departments}
            locations={locations}
            grades={gradeOptions.map((g, i) => ({ id: i + 1, name: g }))}
          />
        </CardContent>
      </Card>
    </div>
  );
};
