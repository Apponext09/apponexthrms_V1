import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RuleConditionBuilder } from './RuleConditionBuilder';
import { HelpHint } from './HelpHint';
import { 
  Info,
  Filter,
  GitBranch,
} from 'lucide-react';

interface LeaveEncashmentTabProps {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  departments: { id: number; name: string }[];
  locations: { id: number; name: string }[];
  gradeOptions: string[];
}

export const LeaveEncashmentTab: React.FC<LeaveEncashmentTabProps> = ({
  formData,
  setFormData,
  departments,
  locations,
  gradeOptions,
}) => {
  const enc = formData.encashment || {};

  const updateEnc = (key: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      encashment: {
        ...prev.encashment,
        [key]: value,
      },
    }));
  };

  const updateEmployment = (category: string, id: any) => {
    setFormData((prev: any) => {
      const currentArr = prev.employment_allocation?.[category] || [];
      const updated = currentArr.includes(id)
        ? currentArr.filter((x: any) => x !== id)
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

  return (
    <div className="space-y-5 text-slate-800 dark:text-slate-100">
      {/* 1. Reset */}
      <Card className="border border-slate-200/90 dark:border-slate-800 shadow-2xs rounded-xl bg-white dark:bg-slate-950">
        <CardHeader className="bg-slate-50/60 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800/80 pb-3">
          <div className="flex items-center gap-1.5">
            <CardTitle className="text-xs font-bold text-slate-900 dark:text-white">
              Reset
            </CardTitle>
            <Info className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <CardDescription className="text-[11px] text-slate-500">
            When unused leave is dealt with, and which fate is applied first.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 space-y-3.5 text-xs text-slate-700 dark:text-slate-300">
          <div className="flex flex-wrap items-center gap-2">
            <span>Work out what happens to unused leave</span>
            <select
              value={enc.resetFrequency || 'yearly'}
              onChange={(e) => updateEnc('resetFrequency', e.target.value)}
              className="h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2.5 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="yearly">how often...</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="half_yearly">Half-yearly</option>
              <option value="yearly">Yearly</option>
              <option value="when_employee_leaves">When the employee leaves</option>
            </select>

            <HelpHint
              title="Reset & Year-End Processing Frequency"
              titleHi="रीसेट और ईयर-एंड प्रोसेसिंग आवृत्ति"
              description="Determines how often unused leave balances are processed for carry forward or encashment."
              descriptionHi="तय करें कि बची हुई छुट्टियों को कैरी फॉरवर्ड या एनकैशमेंट के लिए कितनी बार प्रोसेस किया जाएगा।"
              effect="Yearly = Balances process on March 31st. Monthly = Unused leaves process at end of every month."
              effectHi="Yearly पर चुनने पर साल के अंत में बची छुट्टियां कैरी फॉरवर्ड होंगी, Monthly पर हर महीने होंगी।"
              example="Yearly on March 31st."
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span>Fill the</span>
            <select
              value={enc.fillCapFirst || 'carry_forward'}
              onChange={(e) => updateEnc('fillCapFirst', e.target.value)}
              className="h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2.5 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="carry_forward">carry forward</option>
              <option value="encashment">encashment</option>
            </select>
            <span>cap first — this decides whether a leftover day is kept or paid out</span>

            <HelpHint
              title="Priority Cap Order (Carry Over vs Cash Out)"
              titleHi="कैरी फॉरवर्ड बनाम एनकैशमेंट प्राथमिकता"
              description="Controls whether leftover leaves fill the Carry Forward quota first or Cash Encashment first."
              descriptionHi="तय करें कि बची छुट्टियां पहले अगले साल में जुड़ेंगी (Carry Forward) या पहले उनका कैश मिलेगा (Encashment)।"
              effect="Carry Forward First = Unused leaves roll over to next year up to max cap; leftover is paid out."
              effectHi="Carry Forward First चुनने पर बची छुट्टियां पहले अगले साल जुडेंगी, उसके बाद बची हुई का पैसा मिलेगा।"
            />
          </div>
        </CardContent>
      </Card>

      {/* 2. Limits */}
      <Card className="border border-slate-200/90 dark:border-slate-800 shadow-2xs rounded-xl bg-white dark:bg-slate-950">
        <CardHeader className="bg-slate-50/60 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800/80 pb-3">
          <div className="flex items-center gap-1.5">
            <CardTitle className="text-xs font-bold text-slate-900 dark:text-white">
              Limits
            </CardTitle>
            <Info className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <CardDescription className="text-[11px] text-slate-500">
            How much may roll over, how much may be paid out, and the ceiling on both together.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 space-y-3.5 text-xs text-slate-700 dark:text-slate-300">
          {/* Row 1: Carry over */}
          <div className="flex flex-wrap items-center gap-2">
            <span>Carry over at most</span>
            <Input
              type="number"
              step="0.5"
              value={enc.carryForwardUnit === 'percent' ? (enc.maxCarryForwardPercent ?? '') : (enc.carryForwardLimit ?? '')}
              onChange={(e) => {
                if (enc.carryForwardUnit === 'percent') {
                  updateEnc('maxCarryForwardPercent', e.target.value);
                } else {
                  updateEnc('carryForwardLimit', e.target.value);
                }
              }}
              placeholder=""
              className="w-20 h-7 text-center text-xs font-semibold"
            />
            <select
              value={enc.carryForwardUnit || 'days'}
              onChange={(e) => updateEnc('carryForwardUnit', e.target.value)}
              className="h-7 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2 text-xs font-medium"
            >
              <option value="days">days</option>
              <option value="percent">% of unused</option>
            </select>
            <span>into the next cycle</span>

            <HelpHint
              title="Maximum Carry Over Limit"
              titleHi="अधिकतम कैरी फॉरवर्ड सीमा"
              description="Maximum leave days or % of unused balance carried over into the next cycle."
              descriptionHi="तय करें कि अगले चक्र में ज्यादा से ज्यादा कितने दिन (या बची लीव का कितना %) ट्रांसफर होंगे।"
              effect="Carry 10 days = If employee has 15 unused days, only 10 days roll over to next year."
              effectHi="उदा. अगर 10 days सेट किया और कर्मचारी के पास 15 दिन बचे हैं, तो सिर्फ 10 दिन अगले साल जुड़ेंगे।"
              example="Carry over at most 10 days."
            />
          </div>

          {/* Row 2: Pay out */}
          <div className="flex flex-wrap items-center gap-2">
            <span>Pay out at most</span>
            <Input
              type="number"
              step="0.5"
              value={enc.encashUnit === 'percent' ? (enc.maxEncashPercent ?? '') : (enc.encashLimit ?? '')}
              onChange={(e) => {
                if (enc.encashUnit === 'percent') {
                  updateEnc('maxEncashPercent', e.target.value);
                } else {
                  updateEnc('encashLimit', e.target.value);
                }
              }}
              placeholder=""
              className="w-20 h-7 text-center text-xs font-semibold"
            />
            <select
              value={enc.encashUnit || 'days'}
              onChange={(e) => updateEnc('encashUnit', e.target.value)}
              className="h-7 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2 text-xs font-medium"
            >
              <option value="days">days</option>
              <option value="percent">% of unused</option>
            </select>

            <HelpHint
              title="Maximum Cash Encashment Payout Limit"
              titleHi="अधिकतम कैश एनकैशमेंट सीमा"
              description="Maximum leave days or % allowed to be paid out as salary encashment."
              descriptionHi="तय करें कि सैलरी पेरोल में अधिकतम कितने दिनों का पैसा कैश में मिलेगा।"
              effect="Pay out 5 days = Maximum 5 days will be paid out as cash in payroll regardless of balance."
              effectHi="अगर 5 days सेट किया तो बैलेंस चाहे जितना हो, अधिकतम 5 दिनों का ही पैसा सैलरी में मिलेगा।"
              example="Pay out at most 5 days."
            />
          </div>

          {/* Row 3: Combined cap */}
          <div className="flex flex-wrap items-center gap-2">
            <span>Carried and paid-out days together may not exceed</span>
            <Input
              type="number"
              step="0.5"
              value={enc.combinedCap ?? enc.maxLimit ?? ''}
              onChange={(e) => {
                updateEnc('combinedCap', e.target.value);
                updateEnc('maxLimit', e.target.value);
              }}
              placeholder=""
              className="w-20 h-7 text-center text-xs font-semibold"
            />
            <span>days</span>

            <HelpHint
              title="Combined Carry Forward & Encashment Ceiling"
              titleHi="कुल संयुक्त सीमा (Combined Ceiling)"
              description="Overall combined limit covering both carry-forward and encashment together."
              descriptionHi="कैरी फॉरवर्ड और एनकैशमेंट दोनों मिलाकर कुल अधिकतम सीमा।"
              effect="Carry=10, Pay=8, Combined=12 = Only 12 total days process across both."
              effectHi="अगर कैरी 10 और पेआउट 8 है, पर Combined Cap 12 है, तो दोनों मिलाकर सिर्फ 12 दिन ही प्रोसेस होंगे।"
            />
          </div>

          {/* Row 4: Carried day lapse */}
          <div className="flex flex-wrap items-center gap-2">
            <span>A carried day lapses</span>
            <Input
              type="number"
              value={enc.lapseDays ?? enc.expireAfterDays ?? ''}
              onChange={(e) => {
                updateEnc('lapseDays', e.target.value);
                updateEnc('expireAfterDays', e.target.value);
              }}
              placeholder=""
              className="w-20 h-7 text-center text-xs font-semibold"
            />
            <span>days into the new cycle — blank means it lasts the whole cycle</span>

            <HelpHint
              title="Carried Leave Expiry Timeframe"
              titleHi="कैरी फॉरवर्ड लीव एक्सपायरी अवधि"
              description="Number of days into the new cycle after which carried-over leaves automatically expire."
              descriptionHi="अगले साल में कैरी की गई छुट्टियां कितने दिनों बाद ऑटो-एक्सपायर हो जाएंगी।"
              effect="Set to 90 days = Carried leaves expire 90 days into the new cycle. Blank = Valid for whole cycle."
              effectHi="90 डालने पर कैरी लीव नए साल के 90 दिन बाद एक्सपायर हो जाएगी; खाली छोड़ने पर पूरे साल वैध रहेगी।"
            />
          </div>
        </CardContent>
      </Card>

      {/* 3. Employees can request encashment */}
      <Card className="border border-slate-200/90 dark:border-slate-800 shadow-2xs rounded-xl bg-white dark:bg-slate-950">
        <CardHeader className="bg-slate-50/60 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800/80 pb-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={enc.employeesCanRequestEncashment !== false && enc.allow_employee_encashment_request !== false}
              onCheckedChange={(c) => {
                updateEnc('employeesCanRequestEncashment', !!c);
                updateEnc('allow_employee_encashment_request', !!c);
              }}
            />
            <div className="flex items-center gap-1.5">
              <CardTitle className="text-xs font-bold text-slate-900 dark:text-white">
                Employees can request encashment
              </CardTitle>
            </div>
            <HelpHint
              title="Employee Self-Service Encashment Request"
              titleHi="कर्मचारी स्वयं एनकैशमेंट अनुरोध"
              description="Allows employees to manually apply for cash encashment from their dashboard anytime instead of cycle-end only."
              descriptionHi="कर्मचारियों को डैशबोर्ड से स्वयं एनकैशमेंट रिक्वेस्ट डालने की अनुमति दें।"
              effect="Checked = Employee can request encashment from dashboard anytime. Unchecked = Automatic cycle-end payout only."
              effectHi="Checked होने पर एम्प्लॉई डैशबोर्ड से स्वयं एनकैशमेंट की मांग कर सकेगा; Unchecked होने पर सिर्फ ईयर-एंड पर ऑटोमैटिक एनकैश होगा।"
            />
          </label>
          <CardDescription className="text-[11px] text-slate-500 pl-6">
            Without this, leave is only ever encashed automatically at the end of a cycle.
          </CardDescription>
        </CardHeader>
        {(enc.employeesCanRequestEncashment !== false && enc.allow_employee_encashment_request !== false) && (
          <CardContent className="p-4 space-y-3 text-xs text-slate-700 dark:text-slate-300 pl-8">
            <div className="flex flex-wrap items-center gap-2">
              <span>They must be left with at least</span>
              <Input
                type="number"
                step="0.5"
                value={enc.minBalanceToRetain ?? ''}
                onChange={(e) => updateEnc('minBalanceToRetain', e.target.value)}
                placeholder=""
                className="w-20 h-7 text-center text-xs font-semibold"
              />
              <span>days afterwards</span>

              <HelpHint
                title="Minimum Retained Balance Cushion"
                titleHi="न्यूनतम रिटेंड बैलेंस सुरक्षा सीमा"
                description="Minimum leave balance an employee must retain after encashing."
                descriptionHi="एनकैशमेंट करने के बाद कर्मचारी के खाते में कम से कम कितनी छुट्टियां बचना अनिवार्य है।"
                effect="Retain 5 days = Employee must keep at least 5 days balance and can encash only the excess."
                effectHi="उदा. 5 days रिटेन रखने पर एम्प्लॉई 5 दिन के ऊपर की बची हुई लीव ही एनकैश कर सकेगा।"
              />
            </div>

            <div className="pt-1">
              <label className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-200 cursor-pointer">
                <Checkbox
                  checked={!!enc.allowMultipleEncashmentPerCycle}
                  onCheckedChange={(c) => updateEnc('allowMultipleEncashmentPerCycle', !!c)}
                />
                <span>Allow more than one encashment per cycle</span>
                <Info className="w-3.5 h-3.5 text-slate-400" />
              </label>
            </div>
          </CardContent>
        )}
      </Card>

      {/* 4. Pay out */}
      <Card className="border border-slate-200/90 dark:border-slate-800 shadow-2xs rounded-xl bg-white dark:bg-slate-950">
        <CardHeader className="bg-slate-50/60 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800/80 pb-3">
          <div className="flex items-center gap-1.5">
            <CardTitle className="text-xs font-bold text-slate-900 dark:text-white">
              Pay out
            </CardTitle>
            <Info className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <CardDescription className="text-[11px] text-slate-500">
            Which balance an encashment draws from, and when the money is released.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 space-y-3.5 text-xs text-slate-700 dark:text-slate-300">
          <div className="flex flex-wrap items-center gap-2">
            <span>Take the days from</span>
            <select
              value={enc.takeDaysFrom || 'closed_year'}
              onChange={(e) => updateEnc('takeDaysFrom', e.target.value)}
              className="h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2.5 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="closed_year">the year being closed</option>
              <option value="active_balance">current active balance</option>
              <option value="new_year">the new year</option>
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span>Release the money</span>
            <select
              value={enc.releaseMoneySchedule || enc.disbursement?.periodicity || 'monthly'}
              onChange={(e) => {
                updateEnc('releaseMoneySchedule', e.target.value);
                updateEnc('disbursement', { ...(enc.disbursement || {}), periodicity: e.target.value });
              }}
              className="h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2.5 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="monthly">how often...</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="half_yearly">Half-yearly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* 5. Applies to */}
      <Card className="border border-slate-200/90 dark:border-slate-800 shadow-2xs rounded-xl bg-white dark:bg-slate-950">
        <CardHeader className="bg-slate-50/60 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800/80 pb-3">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <CardTitle className="text-xs font-bold text-slate-900 dark:text-white">
              Applies to
            </CardTitle>
          </div>
          <CardDescription className="text-[11px] text-slate-500">
            Leave this empty and this carry forward applies to every employee.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Scope Card 1: Company */}
            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
              <div className="flex items-center justify-between text-xs font-semibold mb-2 text-slate-800 dark:text-slate-200">
                <span>[-] Company</span>
                <span className="text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded font-bold">0</span>
              </div>
              <select className="w-full h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-xs text-slate-700 dark:text-slate-300 font-medium">
                <option value="all">All</option>
              </select>
            </div>

            {/* Scope Card 2: Location */}
            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
              <div className="flex items-center justify-between text-xs font-semibold mb-2 text-slate-800 dark:text-slate-200">
                <span>[-] Location</span>
                <span className="text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded font-bold">
                  {formData.employment_allocation?.locations?.length || 0}
                </span>
              </div>
              <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
                {locations.map((loc) => {
                  const isChecked = (formData.employment_allocation?.locations || []).includes(loc.id);
                  return (
                    <label key={loc.id} className="flex items-center gap-2 text-[11px] text-slate-700 dark:text-slate-300 cursor-pointer">
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => updateEmployment('locations', loc.id)}
                      />
                      <span>{loc.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Scope Card 3: Department */}
            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
              <div className="flex items-center justify-between text-xs font-semibold mb-2 text-slate-800 dark:text-slate-200">
                <span>[-] Department</span>
                <span className="text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded font-bold">
                  {formData.employment_allocation?.departments?.length || 0}
                </span>
              </div>
              <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
                {departments.map((dept) => {
                  const isChecked = (formData.employment_allocation?.departments || []).includes(dept.id);
                  return (
                    <label key={dept.id} className="flex items-center gap-2 text-[11px] text-slate-700 dark:text-slate-300 cursor-pointer">
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => updateEmployment('departments', dept.id)}
                      />
                      <span>{dept.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 6. Only when */}
      <Card className="border border-slate-200/90 dark:border-slate-800 shadow-2xs rounded-xl bg-white dark:bg-slate-950">
        <CardHeader className="bg-slate-50/60 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800/80 pb-3">
          <div className="flex items-center gap-1.5">
            <GitBranch className="w-3.5 h-3.5 text-slate-500" />
            <CardTitle className="text-xs font-bold text-slate-900 dark:text-white">
              Only when
            </CardTitle>
          </div>
          <CardDescription className="text-[11px] text-slate-500">
            Leave this empty and this carry forward always applies.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          <RuleConditionBuilder
            value={enc.onlyWhen || enc.only_when}
            onChange={(newGroup) => updateEnc('onlyWhen', newGroup)}
            departments={departments}
            locations={locations}
            grades={gradeOptions.map((g, i) => ({ id: i + 1, name: g }))}
          />
        </CardContent>
      </Card>
    </div>
  );
};
