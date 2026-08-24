import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RuleConditionBuilder } from './RuleConditionBuilder';
import { HelpHint } from './HelpHint';
import { 
  Calculator, 
  Coins, 
  RotateCcw, 
  MapPin, 
  GitBranch, 
  Sparkles,
  FileText,
  Info,
  Filter,
  Layers,
  Clock,
  SlidersHorizontal,
} from 'lucide-react';

interface LeaveAllocationTabProps {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  companies?: { id: number; name: string }[];
  departments: { id: number; name: string }[];
  locations: { id: number; name: string }[];
  gradeOptions: string[];
  employeeTypeOptions: string[];
  leaveTypes: any[];
}

export const LeaveAllocationTab: React.FC<LeaveAllocationTabProps> = ({
  formData,
  setFormData,
  companies = [],
  departments,
  locations,
  gradeOptions,
}) => {
  const alloc = formData.allocation || {};

  const updateAlloc = (key: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      allocation: {
        ...prev.allocation,
        [key]: value,
      },
    }));
  };

  const updateEmployment = (category: string, id: any) => {
    setFormData((prev: any) => {
      const currentArr = prev.employment_allocation?.[category] || [];
      const exists = currentArr.some((x: any) => String(x) === String(id));
      const updated = exists
        ? currentArr.filter((x: any) => String(x) !== String(id))
        : [...currentArr, id];
      return {
        ...prev,
        employment_allocation: {
          ...prev.employment_allocation,
          [category]: updated,
        },
      };
    });
  };

  const toggleSelectAll = (category: string, allItems: any[]) => {
    setFormData((prev: any) => {
      const currentArr = prev.employment_allocation?.[category] || [];
      const allSelected =
        allItems.length > 0 &&
        allItems.every((item) => currentArr.some((x: any) => String(x) === String(item.id)));
      const updated = allSelected ? [] : allItems.map((item) => item.id);
      return {
        ...prev,
        employment_allocation: {
          ...prev.employment_allocation,
          [category]: updated,
        },
      };
    });
  };

  return (
    <div className="space-y-5 text-slate-800 dark:text-slate-100">
      {/* 0. Basic Leave Category Meta Information */}
      <Card className="border border-slate-200/90 dark:border-slate-800 shadow-2xs rounded-xl bg-white dark:bg-slate-950">
        <CardHeader className="bg-slate-50/60 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-600 text-white shadow-2xs">
              <FileText className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <CardTitle className="text-xs font-bold text-slate-900 dark:text-white">
                  Basic Leave Details
                </CardTitle>
                <HelpHint
                  title="Basic Leave Details"
                  titleHi="लीव की बुनियादी जानकारी"
                  description="Set the leave category title, unique code identifier, and paid status."
                  descriptionHi="इस लीव का नाम, कोड, वर्गीकरण और पेड/अनपेड प्रकार तय करें।"
                />
              </div>
              <CardDescription className="text-[11px] text-slate-500">
                Define category name, short code, and salary paid type.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-3.5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <div>
              <Label className="text-[11px] font-extrabold text-slate-800 dark:text-slate-200">
                Leave Name *
              </Label>
              <Input
                type="text"
                value={formData.leave_name || ''}
                onChange={(e) => setFormData((prev: any) => ({ ...prev, leave_name: e.target.value }))}
                placeholder="e.g. Sick Leave, Casual Leave"
                className="h-8 mt-1 text-xs font-semibold"
                required
              />
            </div>

            <div>
              <Label className="text-[11px] font-extrabold text-slate-800 dark:text-slate-200">
                Leave Code *
              </Label>
              <Input
                type="text"
                value={formData.leave_code || ''}
                onChange={(e) => setFormData((prev: any) => ({ ...prev, leave_code: e.target.value.toUpperCase() }))}
                placeholder="e.g. SL, CL"
                className="h-8 mt-1 text-xs uppercase font-bold"
                required
              />
            </div>

            <div>
              <Label className="text-[11px] font-extrabold text-indigo-600 dark:text-indigo-400 flex items-center justify-between">
                <span>Annual Leave Count (Days) *</span>
                <span className="text-[9px] font-normal text-slate-400">Total yearly quota</span>
              </Label>
              <Input
                type="number"
                min="0"
                max="365"
                value={formData.annual_quota ? formData.annual_quota : ''}
                onChange={(e) => {
                  const val = e.target.value === '' ? '' : (parseFloat(e.target.value) || 0);
                  setFormData((prev: any) => ({
                    ...prev,
                    annual_quota: val,
                    allocation: {
                      ...prev.allocation,
                      entitlementDays: val
                    }
                  }));
                }}
                placeholder="e.g. 10"
                className="h-8 mt-1 text-xs font-extrabold text-indigo-600 dark:text-indigo-400 bg-indigo-50/40 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-0.5">
            <div>
              <div className="flex items-center gap-1">
                <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                  Leave Classification
                </Label>
                <HelpHint
                  title="Leave Classification"
                  titleHi="लीव का वर्गीकरण"
                  description="Defines whether the leave quota recurs on an annual calendar cycle or for special life events."
                  descriptionHi="तय करें कि छुट्टी सालाना कैलेंडर चक्र पर मिलती है या विशेष घटनाओं (शादी/मातृत्व) के लिए।"
                  effect="Calendar Leave resets every financial year. Non-Calendar Leave triggers on specific events."
                  effectHi="कैलेंडर लीव हर साल 1 अप्रैल को रीसेट होती है, जबकि नॉन-कैलेंडर लीव विशेष इवेंट पर मिलती है।"
                  example="Annual Leave = Calendar, Maternity Leave = Non-Calendar."
                />
              </div>
              <select
                value={formData.leave_classification || 'calendar'}
                onChange={(e: any) => setFormData((prev: any) => ({ ...prev, leave_classification: e.target.value }))}
                className="w-full h-8 mt-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="calendar">Calendar Leave (Annual cycle)</option>
                <option value="non-calendar">Non-Calendar Leave (Special event)</option>
                <option value="uncategorized">Uncategorized (LWP / Custom)</option>
              </select>
            </div>

            <div>
              <div className="flex items-center gap-1">
                <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                  Paid / Unpaid Type
                </Label>
                <HelpHint
                  title="Paid vs Unpaid Classification"
                  titleHi="पेड बनाम अनपेड लीव"
                  description="Determines whether payroll calculates full daily salary or deducts wages when taken."
                  descriptionHi="तय करें कि छुट्टी लेने पर पूरा वेतन मिलेगा या सैलरी से कटौैती होगी।"
                  effect="Paid Leave = Full compensation. Unpaid LWP = Daily wage automatically deducted in payroll."
                  effectHi="पेड लीव में पूरा वेतन मिलता है, अनपेड लीव (LWP) में सैलरी स्लिप से दिन का वेतन कटता है।"
                  example="Casual Leave = Paid, Leave Without Pay = Unpaid."
                />
              </div>
              <select
                value={formData.paid_type || 'paid'}
                onChange={(e: any) => setFormData((prev: any) => ({ ...prev, paid_type: e.target.value }))}
                className="w-full h-8 mt-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="paid">Paid Leave (Full salary paid)</option>
                <option value="unpaid">Unpaid Leave / LWP (Salary deducted)</option>
                <option value="half_paid">Half-Paid Leave (50% salary)</option>
              </select>
            </div>

            <div>
              <div className="flex items-center gap-1">
                <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                  Policy Status
                </Label>
                <HelpHint
                  title="Policy Status"
                  titleHi="नीति की स्थिति"
                  description="Controls whether this leave policy is active and available for employees to select."
                  descriptionHi="तय करें कि यह लीव पॉलिसी सक्रिय है या कर्मचारियों के लिए बंद है।"
                  effect="Active = Visible in employee dropdowns & balance cards. Inactive = Hidden from employees."
                  effectHi="Active होने पर कर्मचारी अप्लाई कर सकेंगे, Inactive होने पर लीव ड्रॉपडाउन से हट जाएगी।"
                />
              </div>
              <select
                value={formData.status || 'active'}
                onChange={(e: any) => setFormData((prev: any) => ({ ...prev, status: e.target.value }))}
                className="w-full h-8 mt-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2.5 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 1. Days worked to leave earned */}
      <Card className="border border-slate-200/90 dark:border-slate-800 shadow-2xs rounded-xl bg-white dark:bg-slate-950">
        <CardHeader className="bg-slate-50/60 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800/80 pb-3">
          <div className="flex items-center gap-1.5">
            <CardTitle className="text-xs font-bold text-slate-900 dark:text-white">
              Days worked to leave earned
            </CardTitle>
            <Info className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <CardDescription className="text-[11px] text-slate-500">
            How time on the clock turns into leave.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 space-y-4 text-xs text-slate-700 dark:text-slate-300">
          {/* Row 1: Frequency */}
          <div className="flex flex-wrap items-center gap-2">
            <span>Work out what was earned</span>
            <select
              value={alloc.entitlementPeriodicity || 'Monthly'}
              onChange={(e) => updateAlloc('entitlementPeriodicity', e.target.value)}
              className="h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2.5 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="Monthly">how often...</option>
              <option value="Monthly">Monthly</option>
              <option value="Quarterly">Quarterly</option>
              <option value="Half-Yearly">Half-Yearly</option>
              <option value="Yearly">Yearly</option>
            </select>

            <HelpHint
              title="Work Out What Was Earned (Calculation Frequency)"
              titleHi="अक्रूअल गणना आवृत्ति"
              description="Controls how often the system triggers leave-earning calculations."
              descriptionHi="तय करें कि सिस्टम लीव कैलकुलेशन कितनी बार (कब-कब) चलाएगा।"
              effect="Monthly = System calculates & credits accrued leave at the end of every month. Yearly = Calculates at financial year end."
              effectHi="Monthly चुनने पर हर महीने के अंत में लीव क्रेडिट होगी; Yearly चुनने पर 31 मार्च को एक साथ क्रेडिट होगी।"
              example="Monthly accrual."
            />
          </div>

          {/* Row 2: Basis & Counting */}
          <div className="flex flex-wrap items-center gap-2">
            <span>Base the earning on</span>
            <select
              value={alloc.accrualBasis || 'ratio'}
              onChange={(e) => updateAlloc('accrualBasis', e.target.value)}
              className="h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2.5 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="ratio">a fixed ratio of days worked</option>
              <option value="fixed">annual fixed quota periodicity</option>
            </select>
            <span>counted as</span>
            <select
              value={alloc.countedAs || 'working_days'}
              onChange={(e) => updateAlloc('countedAs', e.target.value)}
              className="h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2.5 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="working_days">working days</option>
              <option value="calendar_days">calendar days</option>
            </select>

            <HelpHint
              title="Base Earning On & Days Counted Unit"
              titleHi="कमाई का आधार और दिनों की गिनती"
              description="Formula method (Ratio of days worked vs Fixed periodic quota) and counting unit."
              descriptionHi="तय करें कि अटेंडेंस के अनुपात पर लीव मिलेगी या फिक्स्ड कोटा, और वीकेंड/हॉलिडे गिने जाएंगे या नहीं।"
              effect="Ratio = Earn X leaves for every Y payable days worked. Working days = Excludes weekends & holidays from calculation."
              effectHi="Working days चुनने पर सिर्फ वर्किंग दिनों की अटेंडेंस पर लीव कैलकुलेट होगी, वीकेंड्स छूट जाएंगे।"
            />
          </div>

          {/* Row 3: Ratio / Entitlement inputs */}
          {alloc.accrualBasis !== 'fixed' ? (
            <div className="flex flex-wrap items-center gap-2 bg-slate-50/70 dark:bg-slate-900/40 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-800">
              <span>Earn</span>
              <Input
                type="number"
                step="0.25"
                value={alloc.ratioEarnLeaves ?? '1'}
                onChange={(e) => updateAlloc('ratioEarnLeaves', e.target.value)}
                placeholder=""
                className="w-16 h-7 text-center text-xs font-semibold"
              />
              <span>leave(s) for every</span>
              <Input
                type="number"
                value={alloc.ratioForEveryDays ?? '20'}
                onChange={(e) => updateAlloc('ratioForEveryDays', e.target.value)}
                placeholder=""
                className="w-16 h-7 text-center text-xs font-semibold"
              />
              <span>payable days worked in the period just ended</span>

              <HelpHint
                title="Accrual Ratio Formula (Earn X leaves per Y days)"
                titleHi="अक्रूअल अनुपात फॉर्मूला"
                description="Actual formula parameters defining exact leaves earned per payable days worked."
                descriptionHi="एक्चुअल फॉर्मूला: कितने काम के दिनों पर कितनी लीव मिलेगी।"
                effect="Earn 1 leave for every 20 days worked = 20 payable days worked credits 1 day leave."
                effectHi="उदा. Earn 1 for every 20 days: 20 दिन काम करने पर कर्मचारी को 1 लीव क्रेडिट होगी।"
                example="Earn 1 leave for every 20 payable days."
              />
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2 bg-slate-50/70 dark:bg-slate-900/40 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-800">
              <span>Grant</span>
              <Input
                type="number"
                step="0.5"
                value={alloc.entitlementDays ?? formData.annual_quota ?? '12'}
                onChange={(e) => {
                  updateAlloc('entitlementDays', e.target.value);
                  setFormData((prev: any) => ({ ...prev, annual_quota: parseFloat(e.target.value) || 0 }));
                }}
                className="w-16 h-7 text-center text-xs font-semibold"
              />
              <span>total annual leave quota credited {alloc.entitlementPeriodicity || 'Monthly'}</span>
            </div>
          )}

          {/* Row 4: Resignation Date Allocation */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span>When an employee leaves, keep allocating up to their</span>
            <select
              value={alloc.whenEmployeeLeaves || (alloc.considerAllocationTillResignedDate ? 'resignation_date' : 'none')}
              onChange={(e) => {
                updateAlloc('whenEmployeeLeaves', e.target.value);
                updateAlloc('considerAllocationTillResignedDate', e.target.value === 'resignation_date');
              }}
              className="h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2.5 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="none">choose a date...</option>
              <option value="resignation_date">resignation date</option>
              <option value="last_working_day">last working day</option>
            </select>
            <span className="text-slate-400">— select none and an exit changes nothing</span>

            <HelpHint
              title="Resignation Date Allocation Cutoff"
              titleHi="इस्तीफा अक्रूअल कटऑफ तिथि"
              description="Determines which exit date stops leave allocation during employee notice period."
              descriptionHi="तय करें कि कर्मचारी के इस्तीफा देने पर लीव अक्रूअल किस तारीख तक जारी रहेगा।"
              effect="Resignation Date = Stop allocation on resignation submission date. Last Working Day = Allocate till LWD."
              effectHi="Resignation Date चुनने पर इस्तीफा देने की तारीख तक लीव मिलेगी; LWD चुनने पर नोटिस पीरियड के अंत तक अक्रूअल चलेगा।"
            />
          </div>

          {/* Row 5: Cap balance on resignation */}
          <div className="space-y-1.5 pt-1">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer">
              <Checkbox
                checked={!!alloc.capOnResignation}
                onCheckedChange={(c) => updateAlloc('capOnResignation', !!c)}
              />
              <span>Cap the balance when an employee resigns</span>
              <Info className="w-3.5 h-3.5 text-slate-400" />
            </label>
            {alloc.capOnResignation && (
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-400 pl-6">
                <span>On resignation, keep at most</span>
                <Input
                  type="number"
                  value={alloc.resignationCapDays ?? '0'}
                  onChange={(e) => updateAlloc('resignationCapDays', e.target.value)}
                  className="w-16 h-7 text-center text-xs font-semibold"
                />
                <select
                  value={alloc.resignationCapUnit || 'days'}
                  onChange={(e) => updateAlloc('resignationCapUnit', e.target.value)}
                  className="h-7 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2 text-xs font-medium"
                >
                  <option value="days">days</option>
                  <option value="hours">hours</option>
                </select>
                <span>— everything above that lapses, and 0 keeps nothing</span>
              </div>
            )}
          </div>

          {/* Row 6: Show expired leaves on dashboard */}
          <div className="pt-1">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer">
              <Checkbox
                checked={alloc.showExpiredLeavesOnDashboard !== false}
                onCheckedChange={(c) => updateAlloc('showExpiredLeavesOnDashboard', !!c)}
              />
              <span>Show expired leaves on dashboard</span>
              <Info className="w-3.5 h-3.5 text-slate-400" />
            </label>
          </div>
        </CardContent>
      </Card>

      {/* 2. Opening and maximum balance */}
      <Card className="border border-slate-200/90 dark:border-slate-800 shadow-2xs rounded-xl bg-white dark:bg-slate-950">
        <CardHeader className="bg-slate-50/60 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800/80 pb-3">
          <div className="flex items-center gap-1.5">
            <CardTitle className="text-xs font-bold text-slate-900 dark:text-white">
              Opening and maximum balance
            </CardTitle>
            <Info className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <CardDescription className="text-[11px] text-slate-500">
            What an employee starts with, and how much they may hold at once.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 text-xs text-slate-700 dark:text-slate-300">
          <div className="flex flex-wrap items-center gap-2">
            <span>Start an employee with</span>
            <Input
              type="number"
              step="0.5"
              value={alloc.maxBalanceOnStartDate ?? ''}
              onChange={(e) => updateAlloc('maxBalanceOnStartDate', e.target.value)}
              placeholder=""
              className="w-20 h-8 text-center text-xs font-semibold"
            />
            <span>leave(s), and never let the balance exceed</span>
            <Input
              type="number"
              step="0.5"
              value={alloc.neverLetBalanceExceed ?? alloc.maxBalanceCap ?? ''}
              onChange={(e) => {
                updateAlloc('neverLetBalanceExceed', e.target.value);
                updateAlloc('maxBalanceCap', e.target.value);
              }}
              placeholder=""
              className="w-20 h-8 text-center text-xs font-semibold"
            />
            <span>leave(s)</span>
          </div>
        </CardContent>
      </Card>

      {/* 3. Round off */}
      <Card className="border border-slate-200/90 dark:border-slate-800 shadow-2xs rounded-xl bg-white dark:bg-slate-950">
        <CardHeader className="bg-slate-50/60 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800/80 pb-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={alloc.roundOffType ? alloc.roundOffType !== 'none' : !!alloc.leaveRoundOff}
              onCheckedChange={(c) => {
                updateAlloc('leaveRoundOff', !!c);
                if (!c) updateAlloc('roundOffType', 'none');
                else if (!alloc.roundOffType || alloc.roundOffType === 'none') updateAlloc('roundOffType', 'nearest');
              }}
            />
            <div className="flex items-center gap-1.5">
              <CardTitle className="text-xs font-bold text-slate-900 dark:text-white">
                Round off
              </CardTitle>
              <Info className="w-3.5 h-3.5 text-slate-400" />
            </div>
          </label>
          <CardDescription className="text-[11px] text-slate-500 pl-6">
            What happens when a calculation produces a fraction.
          </CardDescription>
        </CardHeader>
        {(alloc.roundOffType ? alloc.roundOffType !== 'none' : !!alloc.leaveRoundOff) && (
          <CardContent className="p-4 text-xs text-slate-700 dark:text-slate-300">
            <div className="flex flex-wrap items-center gap-2">
              <span>Settle a fraction to the</span>
              <select
                value={alloc.roundOffType || 'nearest'}
                onChange={(e) => updateAlloc('roundOffType', e.target.value)}
                className="h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2.5 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="nearest">nearest</option>
                <option value="ceil">round up (ceil)</option>
                <option value="floor">round down (floor)</option>
              </select>
              <select
                value={alloc.roundOffUnit || 'day'}
                onChange={(e) => updateAlloc('roundOffUnit', e.target.value)}
                className="h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2.5 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="day">day</option>
                <option value="half_day">half day</option>
              </select>
            </div>
          </CardContent>
        )}
      </Card>

      {/* 4. Credited leave expires */}
      <Card className="border border-slate-200/90 dark:border-slate-800 shadow-2xs rounded-xl bg-white dark:bg-slate-950">
        <CardHeader className="bg-slate-50/60 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800/80 pb-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={!!alloc.creditedLeaveExpires}
              onCheckedChange={(c) => updateAlloc('creditedLeaveExpires', !!c)}
            />
            <div className="flex items-center gap-1.5">
              <CardTitle className="text-xs font-bold text-slate-900 dark:text-white">
                Credited leave expires
              </CardTitle>
              <Info className="w-3.5 h-3.5 text-slate-400" />
            </div>
          </label>
          <CardDescription className="text-[11px] text-slate-500 pl-6">
            Unused days lapse — after a set time, or when their period ends.
          </CardDescription>
        </CardHeader>
        {alloc.creditedLeaveExpires && (
          <CardContent className="p-4 space-y-3 text-xs text-slate-700 dark:text-slate-300">
            <div className="flex flex-wrap items-center gap-2">
              <span>Credited leave lapses</span>
              <select
                value={alloc.expiryMode || 'set_days'}
                onChange={(e) => updateAlloc('expiryMode', e.target.value)}
                className="h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2.5 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="set_days">a set number of days after it was credited</option>
                <option value="end_of_financial_year">at the end of financial year</option>
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span>Expires</span>
              <Input
                type="number"
                value={alloc.expiryDays ?? '365'}
                onChange={(e) => updateAlloc('expiryDays', e.target.value)}
                placeholder=""
                className="w-20 h-8 text-center text-xs font-semibold"
              />
              <span>days after the date it was</span>
              <select
                value={alloc.expiryTriggerDate || 'credited'}
                onChange={(e) => updateAlloc('expiryTriggerDate', e.target.value)}
                className="h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2.5 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="credited">which date...</option>
                <option value="credited">credited date</option>
                <option value="joining">joining date</option>
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span>Warn the employee</span>
              <Input
                type="number"
                value={alloc.warnBeforeExpiryDays ?? '30'}
                onChange={(e) => updateAlloc('warnBeforeExpiryDays', e.target.value)}
                placeholder=""
                className="w-20 h-8 text-center text-xs font-semibold"
              />
              <span>days before that</span>
            </div>
          </CardContent>
        )}
      </Card>

      {/* 5. Applies to (Scope Cards) */}
      <Card className="border border-slate-200/90 dark:border-slate-800 shadow-2xs rounded-xl bg-white dark:bg-slate-950">
        <CardHeader className="bg-slate-50/60 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800/80 pb-3">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <CardTitle className="text-xs font-bold text-slate-900 dark:text-white">
              Applies to
            </CardTitle>
          </div>
          <CardDescription className="text-[11px] text-slate-500">
            Leave this empty and this accrual applies to every employee.
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
                      {companies.length > 0 && companies.every((c) => (formData.employment_allocation?.companies || []).some((x: any) => String(x) === String(c.id)))
                        ? 'Clear'
                        : 'Select all'}
                    </button>
                  )}
                </div>
                <span className="text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded font-bold">
                  {formData.employment_allocation?.companies?.length || 0}
                </span>
              </div>
              <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
                {companies && companies.length > 0 ? (
                  <>
                    <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-800 dark:text-slate-200 cursor-pointer pb-1 border-b border-slate-200/80 dark:border-slate-800 mb-1">
                      <Checkbox
                        checked={companies.length > 0 && companies.every((c) => (formData.employment_allocation?.companies || []).some((x: any) => String(x) === String(c.id)))}
                        onCheckedChange={() => toggleSelectAll('companies', companies)}
                      />
                      <span>Select All</span>
                    </label>
                    {companies.map((comp) => {
                      const isChecked = (formData.employment_allocation?.companies || []).some((x: any) => String(x) === String(comp.id));
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
                      {locations.length > 0 && locations.every((l) => (formData.employment_allocation?.locations || []).some((x: any) => String(x) === String(l.id)))
                        ? 'Clear'
                        : 'Select all'}
                    </button>
                  )}
                </div>
                <span className="text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded font-bold">
                  {formData.employment_allocation?.locations?.length || 0}
                </span>
              </div>
              <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
                {locations && locations.length > 0 ? (
                  <>
                    <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-800 dark:text-slate-200 cursor-pointer pb-1 border-b border-slate-200/80 dark:border-slate-800 mb-1">
                      <Checkbox
                        checked={locations.length > 0 && locations.every((l) => (formData.employment_allocation?.locations || []).some((x: any) => String(x) === String(l.id)))}
                        onCheckedChange={() => toggleSelectAll('locations', locations)}
                      />
                      <span>Select All</span>
                    </label>
                    {locations.map((loc) => {
                      const isChecked = (formData.employment_allocation?.locations || []).some((x: any) => String(x) === String(loc.id));
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
                      {departments.length > 0 && departments.every((d) => (formData.employment_allocation?.departments || []).some((x: any) => String(x) === String(d.id)))
                        ? 'Clear'
                        : 'Select all'}
                    </button>
                  )}
                </div>
                <span className="text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded font-bold">
                  {formData.employment_allocation?.departments?.length || 0}
                </span>
              </div>
              <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
                {departments && departments.length > 0 ? (
                  <>
                    <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-800 dark:text-slate-200 cursor-pointer pb-1 border-b border-slate-200/80 dark:border-slate-800 mb-1">
                      <Checkbox
                        checked={departments.length > 0 && departments.every((d) => (formData.employment_allocation?.departments || []).some((x: any) => String(x) === String(d.id)))}
                        onCheckedChange={() => toggleSelectAll('departments', departments)}
                      />
                      <span>Select All</span>
                    </label>
                    {departments.map((dept) => {
                      const isChecked = (formData.employment_allocation?.departments || []).some((x: any) => String(x) === String(dept.id));
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

      {/* 6. Only when (Advanced Allocation Conditions) */}
      <Card className="border border-slate-200/90 dark:border-slate-800 shadow-2xs rounded-xl bg-white dark:bg-slate-950">
        <CardHeader className="bg-slate-50/60 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800/80 pb-3">
          <div className="flex items-center gap-1.5">
            <GitBranch className="w-3.5 h-3.5 text-slate-500" />
            <CardTitle className="text-xs font-bold text-slate-900 dark:text-white">
              Only when
            </CardTitle>
          </div>
          <CardDescription className="text-[11px] text-slate-500">
            Leave this empty and this accrual always applies.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          <RuleConditionBuilder
            value={alloc.onlyWhen || alloc.only_when}
            onChange={(newGroup) => updateAlloc('onlyWhen', newGroup)}
            departments={departments}
            locations={locations}
            grades={gradeOptions.map((g, i) => ({ id: i + 1, name: g }))}
          />
        </CardContent>
      </Card>
    </div>
  );
};
