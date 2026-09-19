import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RuleConditionBuilder } from './RuleConditionBuilder';
import { HelpHint } from './HelpHint';
import { LeaveScopeCards } from './LeaveScopeCards';
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
  subDepartments?: { id: number; name: string }[];
  designations?: { id: number; name: string }[];
  gradeOptions: string[];
  employeeTypeOptions: string[];
  employeeStatusOptions?: string[];
  leaveTypes: any[];
}

export const LeaveAllocationTab: React.FC<LeaveAllocationTabProps> = ({
  formData,
  setFormData,
  companies = [],
  departments = [],
  locations = [],
  subDepartments = [],
  designations = [],
  gradeOptions = [],
  employeeTypeOptions = [],
  employeeStatusOptions = [],
  leaveTypes = [],
}) => {
  const alloc = formData?.allocation || {};

  const updateAlloc = (key: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      allocation: {
        ...(prev?.allocation || {}),
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
    <div className="space-y-5 text-foreground dark:text-slate-100">
      {/* 1. Days worked to leave earned */}
      <Card className="border border-border/60/90 dark:border-slate-800 shadow-2xs rounded-xl bg-background dark:bg-slate-950">
        <CardHeader className="bg-muted/30/60 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800/80 pb-3">
          <div className="flex items-center gap-1.5">
            <CardTitle className="text-xs font-bold text-foreground dark:text-white">
              Days worked to leave earned
            </CardTitle>
            <Info className="w-3.5 h-3.5 text-muted-foreground/70" />
          </div>
          <CardDescription className="text-[11px] text-muted-foreground">
            How time on the clock turns into leave.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 space-y-4 text-xs text-foreground dark:text-slate-300">
          {/* Row 1: Frequency */}
          <div className="flex flex-wrap items-center gap-2">
            <span>Work out what was earned</span>
            <select
              value={alloc.entitlementPeriodicity || 'Monthly'}
              onChange={(e) => updateAlloc('entitlementPeriodicity', e.target.value)}
              className="h-8 rounded-lg border border-border/60 dark:border-slate-700 bg-muted/30 dark:bg-slate-900 px-2.5 text-xs font-semibold text-foreground dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
              className="h-8 rounded-lg border border-border/60 dark:border-slate-700 bg-muted/30 dark:bg-slate-900 px-2.5 text-xs font-semibold text-foreground dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="ratio">a fixed ratio of days worked</option>
              <option value="fixed">annual fixed quota periodicity</option>
            </select>
            <span>counted as</span>
            <select
              value={alloc.countedAs || 'working_days'}
              onChange={(e) => updateAlloc('countedAs', e.target.value)}
              className="h-8 rounded-lg border border-border/60 dark:border-slate-700 bg-muted/30 dark:bg-slate-900 px-2.5 text-xs font-semibold text-foreground dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
            <div className="flex flex-wrap items-center gap-2 bg-muted/30/70 dark:bg-slate-900/40 p-2.5 rounded-lg border border-border/60/60 dark:border-slate-800">
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
            <div className="flex flex-wrap items-center gap-2 bg-muted/30/70 dark:bg-slate-900/40 p-2.5 rounded-lg border border-border/60/60 dark:border-slate-800">
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
              className="h-8 rounded-lg border border-border/60 dark:border-slate-700 bg-muted/30 dark:bg-slate-900 px-2.5 text-xs font-semibold text-foreground dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="none">choose a date...</option>
              <option value="resignation_date">resignation date</option>
              <option value="last_working_day">last working day</option>
            </select>
            <span className="text-muted-foreground/70">— select none and an exit changes nothing</span>

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
            <label className="flex items-center gap-2 text-xs font-semibold text-foreground dark:text-slate-200 cursor-pointer">
              <Checkbox
                checked={!!alloc.capOnResignation}
                onCheckedChange={(c) => updateAlloc('capOnResignation', !!c)}
              />
              <span>Cap the balance when an employee resigns</span>
              <Info className="w-3.5 h-3.5 text-muted-foreground/70" />
            </label>
            {alloc.capOnResignation && (
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground dark:text-muted-foreground/70 pl-6">
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
                  className="h-7 rounded-md border border-border/60 dark:border-slate-700 bg-muted/30 dark:bg-slate-900 px-2 text-xs font-medium"
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
            <label className="flex items-center gap-2 text-xs font-semibold text-foreground dark:text-slate-200 cursor-pointer">
              <Checkbox
                checked={alloc.showExpiredLeavesOnDashboard !== false}
                onCheckedChange={(c) => updateAlloc('showExpiredLeavesOnDashboard', !!c)}
              />
              <span>Show expired leaves on dashboard</span>
              <Info className="w-3.5 h-3.5 text-muted-foreground/70" />
            </label>
          </div>
        </CardContent>
      </Card>

      {/* 2. Opening and maximum balance */}
      <Card className="border border-border/60/90 dark:border-slate-800 shadow-2xs rounded-xl bg-background dark:bg-slate-950">
        <CardHeader className="bg-muted/30/60 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800/80 pb-3">
          <div className="flex items-center gap-1.5">
            <CardTitle className="text-xs font-bold text-foreground dark:text-white">
              Opening and maximum balance
            </CardTitle>
            <Info className="w-3.5 h-3.5 text-muted-foreground/70" />
          </div>
          <CardDescription className="text-[11px] text-muted-foreground">
            What an employee starts with, and how much they may hold at once.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 text-xs text-foreground dark:text-slate-300">
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
      <Card className="border border-border/60/90 dark:border-slate-800 shadow-2xs rounded-xl bg-background dark:bg-slate-950">
        <CardHeader className="bg-muted/30/60 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800/80 pb-3">
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
              <CardTitle className="text-xs font-bold text-foreground dark:text-white">
                Round off
              </CardTitle>
              <Info className="w-3.5 h-3.5 text-muted-foreground/70" />
            </div>
          </label>
          <CardDescription className="text-[11px] text-muted-foreground pl-6">
            What happens when a calculation produces a fraction.
          </CardDescription>
        </CardHeader>
        {(alloc.roundOffType ? alloc.roundOffType !== 'none' : !!alloc.leaveRoundOff) && (
          <CardContent className="p-4 text-xs text-foreground dark:text-slate-300">
            <div className="flex flex-wrap items-center gap-2">
              <span>Settle a fraction to the</span>
              <select
                value={alloc.roundOffType || 'nearest'}
                onChange={(e) => updateAlloc('roundOffType', e.target.value)}
                className="h-8 rounded-lg border border-border/60 dark:border-slate-700 bg-muted/30 dark:bg-slate-900 px-2.5 text-xs font-semibold text-foreground dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="nearest">nearest</option>
                <option value="ceil">round up (ceil)</option>
                <option value="floor">round down (floor)</option>
              </select>
              <select
                value={alloc.roundOffUnit || 'day'}
                onChange={(e) => updateAlloc('roundOffUnit', e.target.value)}
                className="h-8 rounded-lg border border-border/60 dark:border-slate-700 bg-muted/30 dark:bg-slate-900 px-2.5 text-xs font-semibold text-foreground dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="day">day</option>
                <option value="half_day">half day</option>
              </select>
            </div>
          </CardContent>
        )}
      </Card>

      {/* 4. Credited leave expires */}
      <Card className="border border-border/60/90 dark:border-slate-800 shadow-2xs rounded-xl bg-background dark:bg-slate-950">
        <CardHeader className="bg-muted/30/60 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800/80 pb-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={!!alloc.creditedLeaveExpires}
              onCheckedChange={(c) => updateAlloc('creditedLeaveExpires', !!c)}
            />
            <div className="flex items-center gap-1.5">
              <CardTitle className="text-xs font-bold text-foreground dark:text-white">
                Credited leave expires
              </CardTitle>
              <Info className="w-3.5 h-3.5 text-muted-foreground/70" />
            </div>
          </label>
          <CardDescription className="text-[11px] text-muted-foreground pl-6">
            Unused days lapse — after a set time, or when their period ends.
          </CardDescription>
        </CardHeader>
        {alloc.creditedLeaveExpires && (
          <CardContent className="p-4 space-y-3 text-xs text-foreground dark:text-slate-300">
            <div className="flex flex-wrap items-center gap-2">
              <span>Credited leave lapses</span>
              <select
                value={alloc.expiryMode || 'set_days'}
                onChange={(e) => updateAlloc('expiryMode', e.target.value)}
                className="h-8 rounded-lg border border-border/60 dark:border-slate-700 bg-muted/30 dark:bg-slate-900 px-2.5 text-xs font-semibold text-foreground dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                className="h-8 rounded-lg border border-border/60 dark:border-slate-700 bg-muted/30 dark:bg-slate-900 px-2.5 text-xs font-semibold text-foreground dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
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

      {/* 5. Applies to (Dynamic Scope Cards) */}
      <LeaveScopeCards
        title="Applies to"
        description="Leave this empty and this accrual applies to every employee."
        scopeData={formData?.employment_allocation || {}}
        onUpdateScope={(key, values) => {
          setFormData((prev: any) => ({
            ...prev,
            employment_allocation: {
              ...(prev?.employment_allocation || {}),
              [key]: values,
            },
          }));
        }}
        companies={companies || []}
        locations={locations || []}
        departments={departments || []}
        subDepartments={subDepartments || []}
        designations={designations || []}
        grades={gradeOptions || []}
        employeeTypes={employeeTypeOptions || []}
        employeeStatuses={employeeStatusOptions || []}
      />

      {/* 6. Only when (Advanced Allocation Conditions) */}
      <Card className="border border-border/60/90 dark:border-slate-800 shadow-2xs rounded-xl bg-background dark:bg-slate-950">
        <CardHeader className="bg-muted/30/60 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800/80 pb-3">
          <div className="flex items-center gap-1.5">
            <GitBranch className="w-3.5 h-3.5 text-muted-foreground" />
            <CardTitle className="text-xs font-bold text-foreground dark:text-white">
              Only when
            </CardTitle>
          </div>
          <CardDescription className="text-[11px] text-muted-foreground">
            Leave this empty and this accrual always applies.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          <RuleConditionBuilder
            value={alloc.onlyWhen || alloc.only_when}
            onChange={(newGroup) => updateAlloc('onlyWhen', newGroup)}
            departments={departments || []}
            locations={locations || []}
            grades={(gradeOptions || []).map((g, i) => ({ id: i + 1, name: g }))}
          />
        </CardContent>
      </Card>
    </div>
  );
};
