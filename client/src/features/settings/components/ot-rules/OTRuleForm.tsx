import React, { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Settings,
  History,
  Plus,
  Loader2,
  X,
  Sliders,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  useOTRule,
  useCreateOTRule,
  useUpdateOTRule,
  useOTEligibilityMasters,
  useOTRuleAuditLogs,
} from '../../hooks/useOTRules';
import { AccordionSection } from './AccordionSection';
import { EligibilityPanel } from './EligibilityPanel';
import { HelpHint } from '../HelpHint';

// ── Schema Definition ────────────────────────────────────────────────────────
const dayConfigSchema = z.object({
  calculateOT: z.object({
    beforeShift: z.object({
      enabled: z.boolean(),
      value: z.coerce.number(),
      unit: z.string(),
    }),
    afterShift: z.object({
      enabled: z.boolean(),
      value: z.coerce.number(),
      unit: z.string(),
    }),
    shiftBound: z.boolean(),
    irrespectiveBatchHours: z.object({
      enabled: z.boolean(),
      value: z.coerce.number(),
      unit: z.string(),
    }),
    considerAllAsOT: z.boolean(),
  }),
  deduction: z.object({
    enabled: z.boolean(),
    value: z.coerce.number(),
    unit: z.string(),
  }),
  pay: z.object({
    useFormula: z.boolean(),
    formula: z.string().optional(),
    payPerMinMultiplier: z.coerce.number().optional(),
  }),
});

const otRuleFormSchema = z.object({
  ruleName: z.string().min(1, 'Rule name is required'),
  titleChange: z.string().optional(),
  period: z.enum(['daily', 'weekly']),
  shiftType: z.enum(['time_bound', 'flexible']),
  dailyMaxOTLimit: z.coerce.number().min(0),
  dailyMaxOTLimitUnit: z.string(),
  weeklyMaxOTLimit: z.coerce.number().min(0),
  weeklyMaxOTLimitUnit: z.string(),
  autoOTApprove: z.boolean(),
  autoApproveMinTime: z.string(),
  autoApproveMaxTime: z.string(),
  otFormula: z.boolean(),
  otCalculation: z.string().optional(),
  employeeTiming: z.string(),
  isActive: z.boolean(),
  normalDay: dayConfigSchema,
  holiday: dayConfigSchema,
  weekend: dayConfigSchema,
  eligibility: z.object({
    company_location: z.array(z.number()),
    department: z.array(z.number()),
    grade: z.array(z.number()),
    employee_type: z.array(z.number()),
    shift: z.array(z.number()),
    employee_status: z.array(z.number()),
  }),
});

type OTRuleFormValues = z.infer<typeof otRuleFormSchema>;

interface OTRuleFormProps {
  ruleId?: number;
  onSaved?: (id: number) => void;
  onCancel?: () => void;
}

const defaultDayConfig = {
  calculateOT: {
    beforeShift: { enabled: false, value: 0, unit: 'minutes' },
    afterShift: { enabled: true, value: 30, unit: 'minutes' },
    shiftBound: false,
    irrespectiveBatchHours: { enabled: false, value: 0, unit: 'minutes' },
    considerAllAsOT: false,
  },
  deduction: { enabled: false, value: 0, unit: 'minutes' },
  pay: { useFormula: false, formula: '', payPerMinMultiplier: 1.5 },
};

const defaultFormValues: OTRuleFormValues = {
  ruleName: '',
  titleChange: '',
  period: 'daily',
  shiftType: 'time_bound',
  dailyMaxOTLimit: 0,
  dailyMaxOTLimitUnit: 'hours',
  weeklyMaxOTLimit: 0,
  weeklyMaxOTLimitUnit: 'hours',
  autoOTApprove: false,
  autoApproveMinTime: '',
  autoApproveMaxTime: '',
  otFormula: false,
  otCalculation: '',
  employeeTiming: 'no_round',
  isActive: true,
  normalDay: defaultDayConfig,
  holiday: { ...defaultDayConfig, calculateOT: { ...defaultDayConfig.calculateOT, considerAllAsOT: true }, pay: { useFormula: false, formula: '', payPerMinMultiplier: 2.0 } },
  weekend: { ...defaultDayConfig, calculateOT: { ...defaultDayConfig.calculateOT, considerAllAsOT: true }, pay: { useFormula: false, formula: '', payPerMinMultiplier: 2.0 } },
  eligibility: {
    company_location: [],
    department: [],
    grade: [],
    employee_type: [],
    shift: [],
    employee_status: [],
  },
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function hhmmToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function minutesToHHMM(mins: number): string {
  if (!mins || mins < 0) return '00:00';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export const OTRuleForm: React.FC<OTRuleFormProps> = ({ ruleId, onSaved, onCancel }) => {
  const [showAuditLog, setShowAuditLog] = useState(false);
  const { data: existingRule, isLoading: isLoadingRule } = useOTRule(ruleId);
  const { locations, departments, grades, employeeTypes, shifts, statuses } = useOTEligibilityMasters();
  const { data: auditLogsData, isLoading: isLoadingLogs } = useOTRuleAuditLogs(ruleId);

  const createMutation = useCreateOTRule();
  const updateMutation = useUpdateOTRule();

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<OTRuleFormValues>({
    resolver: zodResolver(otRuleFormSchema),
    defaultValues: defaultFormValues,
  });

  const autoOTApproveValue = watch('autoOTApprove');
  const otFormulaValue      = watch('otFormula');
  const periodValue         = watch('period');
  const shiftTypeValue      = watch('shiftType');

  useEffect(() => {
    if (ruleId && existingRule) {
      const r = existingRule;
      const elMap: Record<string, number[]> = {
        company_location: [],
        department: [],
        grade: [],
        employee_type: [],
        shift: [],
        employee_status: [],
      };

      if (Array.isArray(r.eligibility)) {
        for (const item of r.eligibility) {
          const typeKey = (item.entityType ?? item.entity_type) as keyof typeof elMap;
          const entityId = Number(item.entityId ?? item.entity_id);
          if (elMap[typeKey] && !isNaN(entityId)) {
            elMap[typeKey].push(entityId);
          }
        }
      }

      reset({
        ruleName: r.ruleName ?? r.rule_name ?? '',
        titleChange: r.titleChange ?? r.title_change ?? '',
        period: (r.period as any) ?? 'daily',
        shiftType: (r.shiftType as any) ?? (r as any).shift_type ?? 'time_bound',
        dailyMaxOTLimit: Number(r.dailyMaxOTLimit ?? (r as any).daily_max_ot_limit ?? 4),
        dailyMaxOTLimitUnit: r.dailyMaxOTLimitUnit ?? (r as any).daily_max_ot_limit_unit ?? 'hours',
        weeklyMaxOTLimit: Number(r.weeklyMaxOTLimit ?? (r as any).weekly_max_ot_limit ?? 16),
        weeklyMaxOTLimitUnit: r.weeklyMaxOTLimitUnit ?? (r as any).weekly_max_ot_limit_unit ?? 'hours',
        autoOTApprove: Boolean(r.autoOtApprove ?? (r as any).auto_ot_approve),
        autoApproveMinTime: minutesToHHMM(r.autoApproveMinMinutes ?? (r as any).auto_approve_min_minutes ?? 30),
        autoApproveMaxTime: minutesToHHMM(r.autoApproveMaxMinutes ?? (r as any).auto_approve_max_minutes ?? 240),
        otFormula: Boolean(r.otFormulaEnabled ?? (r as any).ot_formula_enabled),
        otCalculation: r.otFormulaExpression ?? (r as any).ot_formula_expression ?? '',
        employeeTiming: r.employeeTimingRounding ?? (r as any).employee_timing_rounding ?? 'round',
        isActive: Boolean(r.isActive ?? r.is_active ?? true),
        normalDay: r.normalDayConfig ?? (r as any).normal_day_config_json ?? defaultDayConfig,
        holiday: r.holidayConfig ?? (r as any).holiday_config_json ?? defaultFormValues.holiday,
        weekend: r.weekendConfig ?? (r as any).weekend_config_json ?? defaultFormValues.weekend,
        eligibility: elMap,
      });
    } else if (!ruleId) {
      reset(defaultFormValues);
    }
  }, [ruleId, existingRule, reset]);

  const onSubmit = async (values: OTRuleFormValues) => {
    try {
      const eligibilityPayload: { entityType: string; entityId: number }[] = [];
      Object.entries(values.eligibility).forEach(([entityType, ids]) => {
        ids.forEach((entityId) => {
          eligibilityPayload.push({ entityType, entityId });
        });
      });

      const payload = {
        ruleName: values.ruleName,
        titleChange: values.titleChange,
        period: values.period,
        shiftType: values.shiftType,
        dailyMaxOTLimit: values.dailyMaxOTLimit,
        dailyMaxOTLimitUnit: values.dailyMaxOTLimitUnit,
        weeklyMaxOTLimit: values.weeklyMaxOTLimit,
        weeklyMaxOTLimitUnit: values.weeklyMaxOTLimitUnit,
        autoOtApprove: values.autoOTApprove,
        autoApproveMinMinutes: hhmmToMinutes(values.autoApproveMinTime),
        autoApproveMaxMinutes: hhmmToMinutes(values.autoApproveMaxTime),
        otFormulaEnabled: values.otFormula,
        otFormulaExpression: values.otCalculation,
        employeeTimingRounding: values.employeeTiming,
        isActive: values.isActive,
        normalDayConfig: values.normalDay,
        holidayConfig: values.holiday,
        weekendConfig: values.weekend,
        eligibility: eligibilityPayload,
      };

      if (ruleId) {
        await updateMutation.mutateAsync({ id: ruleId, data: payload });
        toast.success('Overtime policy updated successfully!');
        if (onSaved) onSaved(ruleId);
      } else {
        const created = await createMutation.mutateAsync(payload);
        toast.success('Overtime policy created successfully!');
        if (onSaved) onSaved(created.id);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save OT Rule');
    }
  };

  if (ruleId && isLoadingRule) {
    return (
      <div className="bg-card border border-border/80 rounded-2xl p-8 flex items-center justify-center text-xs font-semibold text-muted-foreground gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
        Loading policy details...
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      
      {/* Top Bar Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Sliders className="w-4 h-4 stroke-[2.5]" />
          </div>
          <h2 className="text-base font-bold text-foreground">
            {ruleId ? 'Edit Overtime Policy' : 'Create Overtime Policy'}
          </h2>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => setShowAuditLog(true)}
          className="rounded-xl text-xs font-bold h-9 px-4 cursor-pointer gap-1.5"
        >
          <History className="w-3.5 h-3.5" />
          Audit Log
        </Button>
      </div>

      {/* Main Module 1: OT Rule Config Card */}
      <div className="bg-card border border-border/80 rounded-2xl p-5 md:p-6 shadow-xs space-y-5">
        
        <div className="flex items-center gap-2 pb-3 border-b border-border">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <Settings className="w-3.5 h-3.5 stroke-[2.5]" />
          </div>
          <h3 className="text-sm font-bold text-foreground">
            Policy Specification & Thresholds
          </h3>
        </div>

        <div className="space-y-4">
          
          {/* OT Rule Name */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            <label className="md:col-span-4 text-xs font-bold text-foreground flex items-center gap-0.5">
              OT Rule Name <span className="text-rose-500">*</span>
              <HelpHint
                title="OT Rule Name"
                description="A unique name to identify this Overtime policy. It will appear in reports, payslips, and employee notifications."
                example="e.g. 'Standard OT Policy', 'Field Staff OT', 'Holiday OT Rule'"
                titleMr="ओव्हरटाइम नियमाचे नाव"
                descriptionMr="या ओव्हरटाइम धोरणाला ओळखण्यासाठी एक अनोखे नाव. हे अहवाल, पे-स्लिप आणि कर्मचारी सूचनांमध्ये दिसेल."
                exampleMr="उदा. 'मानक OT धोरण', 'फील्ड स्टाफ OT', 'सुट्टी OT नियम'"
              />
            </label>
            <div className="md:col-span-8">
              <Controller
                name="ruleName"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    placeholder="Enter rule name"
                    className="h-9 bg-background border-input text-foreground text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                )}
              />
              {errors.ruleName && <p className="text-rose-500 text-[11px] mt-1 font-semibold">{errors.ruleName.message}</p>}
            </div>
          </div>

          {/* Title in case of change */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            <label className="md:col-span-4 text-xs font-bold text-foreground flex items-center gap-0.5">
              Title In Case Of Change
              <HelpHint
                title="Title In Case Of Change"
                description="An alternative display title shown to employees when the OT rule is dynamically changed or overridden for a specific event or period."
                example="If the standard rule changes for a festival week, set a special title like 'Festival OT — December'"
                titleMr="बदल झाल्यास शीर्षक"
                descriptionMr="जेव्हा OT नियम एखाद्या विशेष कालावधीसाठी बदलला जातो तेव्हा कर्मचाऱ्यांना दाखवले जाणारे वैकल्पिक शीर्षक."
                exampleMr="सणासुदीच्या आठवड्यात नियम बदलल्यास 'सण OT — डिसेंबर' असे विशेष शीर्षक द्या."
              />
            </label>
            <div className="md:col-span-8">
              <Controller
                name="titleChange"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    placeholder="Optional title variation"
                    className="h-9 bg-background border-input text-foreground text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                )}
              />
            </div>
          </div>

          {/* Period */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            <label className="md:col-span-4 text-xs font-bold text-foreground flex items-center gap-0.5">
              Period
              <HelpHint
                title="OT Calculation Period"
                description="Defines whether overtime is calculated on a daily basis or accumulated over the entire week."
                effect="Daily: OT starts after the daily shift hours are exceeded. Weekly: OT is only counted if total week hours exceed the weekly limit."
                example="Daily period: If shift is 8h and employee works 10h, 2h OT is credited that day. Weekly: OT only after 40+ hours in the week."
                titleMr="OT गणना कालावधी"
                descriptionMr="ओव्हरटाइम दररोज मोजला जाईल की संपूर्ण आठवड्यात एकत्रित मोजला जाईल हे ठरवते."
                effectMr="दैनिक: शिफ्टचे तास ओलांडल्यावर लगेच OT मोजला जातो. साप्ताहिक: आठवड्यातील एकूण तास मर्यादा ओलांडल्यावरच OT मिळतो."
                exampleMr="दैनिक: 8 तासांची शिफ्ट असल्यास 10 तास काम केल्यावर 2 तास OT त्याच दिवशी. साप्ताहिक: 40+ तासांनंतरच OT."
              />
            </label>
            <div className="md:col-span-8">
              <Controller
                name="period"
                control={control}
                render={({ field }) => (
                  <div className="flex border border-input rounded-xl w-fit overflow-hidden bg-muted/30 p-0.5 h-9 items-center">
                    <button
                      type="button"
                      onClick={() => field.onChange('daily')}
                      className={cn(
                        "px-4 h-full text-xs font-bold rounded-lg transition-all cursor-pointer",
                        field.value === 'daily' ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:bg-muted/50"
                      )}
                    >
                      Daily
                    </button>
                    <button
                      type="button"
                      onClick={() => field.onChange('weekly')}
                      className={cn(
                        "px-4 h-full text-xs font-bold rounded-lg transition-all cursor-pointer",
                        field.value === 'weekly' ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:bg-muted/50"
                      )}
                    >
                      Weekly
                    </button>
                  </div>
                )}
              />
            </div>
          </div>

          {/* Shift Type */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            <label className="md:col-span-4 text-xs font-bold text-foreground flex items-center gap-0.5">
              Shift Type
              <HelpHint
                title="Shift Type"
                description="Determines how overtime is measured relative to the shift schedule."
                effect="Time Bound: OT is only counted before or after the defined shift start/end times. Flexible Shift: OT is measured from actual first punch — no fixed boundary."
                example="Time Bound: Shift 9AM-6PM, punch at 7PM = 1hr OT. Flexible: Punch in 8AM, punch out 7PM = 11hrs total, OT beyond 8hrs standard."
                titleMr="शिफ्ट प्रकार"
                descriptionMr="शिफ्ट वेळापत्रकाच्या तुलनेत ओव्हरटाइम कसा मोजला जातो हे ठरवते."
                effectMr="वेळ-बद्ध: फक्त ठरलेल्या शिफ्टच्या आधी/नंतरचा वेळ OT म्हणून मोजला जातो. लवचिक: प्रत्यक्ष पहिल्या पंचपासून एकूण वेळ मोजला जातो."
                exampleMr="वेळ-बद्ध: शिफ्ट 9AM-6PM, 7PM ला पंच = 1 तास OT. लवचिक: 8AM ते 7PM = 11 तास, 8 तासांपेक्षा जास्त = OT."
              />
            </label>
            <div className="md:col-span-8">
              <Controller
                name="shiftType"
                control={control}
                render={({ field }) => (
                  <div className="flex border border-input rounded-xl w-fit overflow-hidden bg-muted/30 p-0.5 h-9 items-center">
                    <button
                      type="button"
                      onClick={() => field.onChange('time_bound')}
                      className={cn(
                        "px-4 h-full text-xs font-bold rounded-lg transition-all cursor-pointer",
                        field.value === 'time_bound' ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:bg-muted/50"
                      )}
                    >
                      Time Bound
                    </button>
                    <button
                      type="button"
                      onClick={() => field.onChange('flexible')}
                      className={cn(
                        "px-4 h-full text-xs font-bold rounded-lg transition-all cursor-pointer",
                        field.value === 'flexible' ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:bg-muted/50"
                      )}
                    >
                      Flexible Shift
                    </button>
                  </div>
                )}
              />
            </div>
          </div>

          {/* Daily Max OT Limit (Shown only when Period is Daily) */}
          {periodValue === 'daily' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
              <label className="md:col-span-4 text-xs font-bold text-foreground flex items-center gap-0.5">
                Daily Max OT Limit
                <HelpHint
                  title="Daily Max OT Limit"
                  description="The maximum overtime hours/minutes an employee can earn in a single day. Any OT beyond this cap is NOT credited."
                  effect="Excess OT beyond the cap will be ignored for pay calculation. Use this to prevent runaway OT costs."
                  example="Cap = 4 hours: Employee works 14 hours (6h OT) but only 4 hours OT will be paid."
                  titleMr="दैनिक कमाल OT मर्यादा"
                  descriptionMr="एका दिवसात कर्मचारी जास्तीत जास्त किती OT मिळवू शकतो. या मर्यादेपेक्षा जास्त OT जमा होणार नाही."
                  effectMr="मर्यादेपेक्षा जास्त OT वेतन गणनेत विचारात घेतला जाणार नाही. OT खर्च नियंत्रणात ठेवण्यासाठी वापरा."
                  exampleMr="मर्यादा = 4 तास: कर्मचारी 14 तास काम करतो (6 तास OT) पण फक्त 4 तास OT दिला जाईल."
                />
              </label>
              <div className="md:col-span-8 flex items-center gap-2">
                <Controller
                  name="dailyMaxOTLimit"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      type="number"
                      className="w-24 h-9 bg-background border-input text-foreground text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-center font-bold"
                    />
                  )}
                />
                <Controller
                  name="dailyMaxOTLimitUnit"
                  control={control}
                  render={({ field }) => (
                    <select
                      {...field}
                      className="h-9 text-xs font-semibold bg-background border border-input rounded-xl px-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                    >
                      <option value="minutes">Minutes</option>
                      <option value="hours">Hours</option>
                    </select>
                  )}
                />
              </div>
            </div>
          )}

          {/* Weekly Max OT Limit (Shown only when Period is Weekly) */}
          {periodValue === 'weekly' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
              <label className="md:col-span-4 text-xs font-bold text-foreground flex items-center gap-0.5">
                Weekly Max OT Limit
                <HelpHint
                  title="Weekly Max OT Limit"
                  description="The maximum overtime hours/minutes an employee can accumulate in a full calendar week. Any OT beyond this is not credited."
                  effect="Prevents excessive weekly OT claims. Resets every Monday (or as per the company's week start setting)."
                  example="Cap = 16 hours/week: Even if employee works 25h OT in a week, only 16h will be paid."
                  titleMr="साप्ताहिक कमाल OT मर्यादा"
                  descriptionMr="संपूर्ण कॅलेंडर आठवड्यात कर्मचारी जास्तीत जास्त किती OT जमा करू शकतो."
                  effectMr="आठवड्यात जास्त OT दावे रोखतो. प्रत्येक सोमवारी रीसेट होतो (कंपनीच्या आठवडा सुरुवात सेटिंगनुसार)."
                  exampleMr="मर्यादा = 16 तास/आठवडा: कर्मचारी 25 तास OT केला तरी फक्त 16 तास दिले जातील."
                />
              </label>
              <div className="md:col-span-8 flex items-center gap-2">
                <Controller
                  name="weeklyMaxOTLimit"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      type="number"
                      className="w-24 h-9 bg-background border-input text-foreground text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-center font-bold"
                    />
                  )}
                />
                <Controller
                  name="weeklyMaxOTLimitUnit"
                  control={control}
                  render={({ field }) => (
                    <select
                      {...field}
                      className="h-9 text-xs font-semibold bg-background border border-input rounded-xl px-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                    >
                      <option value="minutes">Minutes</option>
                      <option value="hours">Hours</option>
                    </select>
                  )}
                />
              </div>
            </div>
          )}

          {/* Auto OT Approve */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start border-t border-border/60 pt-4">
            <label className="md:col-span-4 text-xs font-bold text-foreground pt-1 flex items-center gap-0.5">
              Auto OT Approve
              <HelpHint
                title="Auto OT Approve"
                description="When ON, overtime requests within the defined min-max time window are automatically approved without manager intervention."
                effect="ON: OT within time window auto-approved instantly. OFF: OT must be manually approved by Team Lead or Manager."
                example="Min: 00:30, Max: 04:00 — Any OT between 30 mins and 4 hours is auto-approved. OT above 4 hours needs manual approval."
                titleMr="OT स्वयंचलित मंजुरी"
                descriptionMr="चालू असल्यास, ठरलेल्या वेळ मर्यादेत केलेला ओव्हरटाइम व्यवस्थापकाच्या हस्तक्षेपाशिवाय आपोआप मंजूर होतो."
                effectMr="चालू: वेळ मर्यादेतील OT त्वरित मंजूर. बंद: OT साठी टीम लीड किंवा व्यवस्थापकाची मॅन्युअल मंजुरी आवश्यक."
                exampleMr="किमान: 00:30, कमाल: 04:00 — 30 मिनिटे ते 4 तासांदरम्यानचा OT आपोआप मंजूर. 4 तासांपेक्षा जास्त OT मॅन्युअल मंजुरी आवश्यक."
              />
            </label>
            <div className="md:col-span-8 space-y-3">
              <Controller
                name="autoOTApprove"
                control={control}
                render={({ field }) => (
                  <div className="flex border border-input rounded-xl w-fit overflow-hidden bg-muted/30 p-0.5 h-9 items-center">
                    <button
                      type="button"
                      onClick={() => field.onChange(true)}
                      className={cn(
                        "px-4 h-full text-xs font-bold rounded-lg transition-all cursor-pointer",
                        field.value ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:bg-muted/50"
                      )}
                    >
                      On
                    </button>
                    <button
                      type="button"
                      onClick={() => field.onChange(false)}
                      className={cn(
                        "px-4 h-full text-xs font-bold rounded-lg transition-all cursor-pointer",
                        !field.value ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:bg-muted/50"
                      )}
                    >
                      Off
                    </button>
                  </div>
                )}
              />

              {autoOTApproveValue && (
                <div className="flex items-center gap-3 p-3 bg-muted/20 border border-border/80 rounded-xl flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground">Min Time:</span>
                    <Controller
                      name="autoApproveMinTime"
                      control={control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          type="time"
                          className="h-8 w-28 text-xs bg-background border-input text-foreground rounded-lg text-center font-semibold"
                        />
                      )}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground">Max Time:</span>
                    <Controller
                      name="autoApproveMaxTime"
                      control={control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          type="time"
                          className="h-8 w-28 text-xs bg-background border-input text-foreground rounded-lg text-center font-semibold"
                        />
                      )}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>



        </div>
      </div>

      {/* Main Module 2: Day-Type Accordions */}
      <div className="space-y-3">
        <AccordionSection title="For Normal Days" prefix="normalDay" control={control as any} shiftType={shiftTypeValue} />
        <AccordionSection title="For Holidays" prefix="holiday" control={control as any} shiftType={shiftTypeValue} />
        <AccordionSection title="For Weekends" prefix="weekend" control={control as any} shiftType={shiftTypeValue} />
      </div>

      {/* Main Module 3: Eligibility Rules Card */}
      <div className="bg-card border border-border/80 rounded-2xl p-5 md:p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-border">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <Sparkles className="w-3.5 h-3.5 stroke-[2.5]" />
          </div>
          <h3 className="text-sm font-bold text-foreground flex items-center gap-1">
            Eligibility Mapping
            <HelpHint
              title="Eligibility Mapping"
              description="Defines which employees this OT Rule applies to. Only employees matching ALL selected filters (Location, Department, Grade, Type, Shift, Status) will be governed by this rule."
              effect="If no filters are selected, the rule applies to ALL employees. Adding filters narrows the scope to matching employees only."
              example="Select 'Sales Dept' + 'Grade A' → Only Grade A employees in the Sales department will follow this OT policy."
              titleMr="पात्रता मॅपिंग"
              descriptionMr="हा OT नियम कोणत्या कर्मचाऱ्यांना लागू होतो हे ठरवते. निवडलेल्या सर्व फिल्टर्सशी (स्थान, विभाग, ग्रेड, प्रकार, शिफ्ट, स्थिती) जुळणाऱ्या कर्मचाऱ्यांनाच हा नियम लागू होईल."
              effectMr="कोणतेही फिल्टर नसल्यास नियम सर्व कर्मचाऱ्यांना लागू होतो. फिल्टर जोडल्यास फक्त जुळणाऱ्या कर्मचाऱ्यांपुरता मर्यादित होतो."
              exampleMr="'विक्री विभाग' + 'ग्रेड A' निवडल्यास → फक्त विक्री विभागातील ग्रेड A कर्मचाऱ्यांना हे OT धोरण लागू होईल."
            />
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Controller
            name="eligibility.company_location"
            control={control}
            render={({ field }) => (
              <EligibilityPanel
                title="Company Location"
                entityType="company_location"
                items={locations}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
          <Controller
            name="eligibility.department"
            control={control}
            render={({ field }) => (
              <EligibilityPanel
                title="Department"
                entityType="department"
                items={departments}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
          <Controller
            name="eligibility.grade"
            control={control}
            render={({ field }) => (
              <EligibilityPanel
                title="Grade"
                entityType="grade"
                items={grades}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
          <Controller
            name="eligibility.employee_type"
            control={control}
            render={({ field }) => (
              <EligibilityPanel
                title="Employee Type"
                entityType="employee_type"
                items={employeeTypes}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
          <Controller
            name="eligibility.shift"
            control={control}
            render={({ field }) => (
              <EligibilityPanel
                title="Shift"
                entityType="shift"
                items={shifts}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
          <Controller
            name="eligibility.employee_status"
            control={control}
            render={({ field }) => (
              <EligibilityPanel
                title="Employee Status"
                entityType="employee_status"
                items={statuses}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </div>
      </div>

      {/* Footer Action Controls */}
      <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-xs flex items-center justify-between">
        
        {/* Active Status */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-foreground">
            Active Status:
          </span>
          <Controller
            name="isActive"
            control={control}
            render={({ field }) => (
              <button
                type="button"
                onClick={() => field.onChange(!field.value)}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1",
                  field.value
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                    : "bg-rose-500/10 text-rose-600 border border-rose-500/20"
                )}
              >
                <CheckCircle2 className="w-3 h-3" />
                {field.value ? 'Active' : 'Inactive'}
              </button>
            )}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (onCancel) onCancel();
              else reset();
            }}
            className="rounded-xl text-xs font-bold h-9 px-5 cursor-pointer"
          >
            Cancel
          </Button>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-xs font-bold h-9 px-6 shadow-xs cursor-pointer gap-1.5"
          >
            {isSubmitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            )}
            {ruleId ? 'Update Policy' : 'Save Policy'}
          </Button>
        </div>
      </div>

      {/* Audit Log Modal Dialog */}
      {showAuditLog && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl p-5 w-full max-w-lg shadow-xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <History className="w-4 h-4 text-primary" />
                Overtime Policy Audit Log
              </h3>
              <button
                type="button"
                onClick={() => setShowAuditLog(false)}
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {isLoadingLogs && (
                <div className="py-6 text-center text-xs font-semibold text-muted-foreground flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  Loading audit logs...
                </div>
              )}

              {!isLoadingLogs && (!auditLogsData?.items || auditLogsData.items.length === 0) && (
                <div className="py-6 text-center text-xs font-semibold text-muted-foreground">
                  No audit log entries recorded for this policy yet.
                </div>
              )}

              {auditLogsData?.items?.map((log: any) => (
                <div key={log.id} className="p-3 bg-muted/20 border border-border/80 rounded-xl space-y-1 text-xs">
                  <div className="flex items-center justify-between font-bold text-foreground">
                    <span>{log.action}</span>
                    <span className="text-[10px] text-muted-foreground font-normal">
                      {new Date(log.created_at || log.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-muted-foreground text-[11px]">
                    User #{log.user_id || log.userId || 'System'}
                  </p>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-border flex justify-end">
              <Button
                type="button"
                onClick={() => setShowAuditLog(false)}
                className="rounded-xl text-xs font-bold h-8 px-4"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

    </form>
  );
};
