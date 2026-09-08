import React from 'react';
import { Info } from 'lucide-react';
import { Controller, type Control, useWatch } from 'react-hook-form';

interface PaySectionProps {
  prefix:  'normalDay' | 'holiday' | 'weekend';
  control: Control<any, any>;
}

export const PaySection: React.FC<PaySectionProps> = ({ prefix, control }) => {
  const useFormula = useWatch({ control, name: `${prefix}.pay.useFormula`, defaultValue: false });

  return (
    <div className="border border-border/80 rounded-xl p-4 bg-muted/20 space-y-4">
      <h4 className="text-xs font-bold text-foreground tracking-wide uppercase">
        Pay Calculation
      </h4>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
        {/* Toggle */}
        <div className="md:col-span-4 space-y-1.5">
          <label className="text-xs font-bold text-foreground block">
            PAY as per Formula
          </label>
          <Controller
            name={`${prefix}.pay.useFormula`}
            control={control}
            defaultValue={false}
            render={({ field }) => (
              <div className="flex border border-input rounded-xl w-fit overflow-hidden bg-muted/30 p-0.5 h-9 items-center">
                <button
                  type="button"
                  onClick={() => field.onChange(true)}
                  className={`px-4 h-full text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    field.value
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => field.onChange(false)}
                  className={`px-4 h-full text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    !field.value
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  No
                </button>
              </div>
            )}
          />
        </div>

        {/* Right: Formula input OR multiplier */}
        <div className="md:col-span-8">
          {useFormula ? (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <label className="text-xs font-bold text-foreground flex items-center gap-1">
                  Pay Amount Formula <span className="text-rose-500">*</span>
                </label>
                <span title="Available variables: OT_HOURS, OT_MINUTES, BASIC, GROSS, DAILY_RATE, HOURLY_RATE">
                  <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                </span>
              </div>
              <Controller
                name={`${prefix}.pay.formula`}
                control={control}
                defaultValue=""
                render={({ field }) => (
                  <textarea
                    {...field}
                    rows={3}
                    placeholder="e.g. (BASIC / 26 / 8) * OT_HOURS * 1.5"
                    className="w-full bg-background border border-input text-foreground text-xs rounded-xl p-2.5 font-mono focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                )}
              />
              <p className="text-[11px] text-muted-foreground font-semibold">
                Variables: <code className="bg-muted px-1 py-0.5 rounded text-[10px]">OT_HOURS</code>, <code className="bg-muted px-1 py-0.5 rounded text-[10px]">OT_MINUTES</code>, <code className="bg-muted px-1 py-0.5 rounded text-[10px]">BASIC</code>, <code className="bg-muted px-1 py-0.5 rounded text-[10px]">GROSS</code>, <code className="bg-muted px-1 py-0.5 rounded text-[10px]">HOURLY_RATE</code>
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground block">
                Default Calculation Settings
              </label>
              <div className="flex items-center gap-2 flex-wrap text-xs font-medium text-foreground">
                <span className="font-semibold text-foreground">OT Amount = Hourly Rate ×</span>
                <Controller
                  name={`${prefix}.pay.payPerMinMultiplier`}
                  control={control}
                  defaultValue={1.5}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="number"
                      step="0.1"
                      min="0.1"
                      className="w-16 h-8 text-xs font-bold text-center bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  )}
                />
                <span className="font-semibold text-muted-foreground">times</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
