import React from 'react';
import { Controller, type Control } from 'react-hook-form';

interface OTDeductionSectionProps {
  prefix:  'normalDay' | 'holiday' | 'weekend';
  control: Control<any>;
}

export const OTDeductionSection: React.FC<OTDeductionSectionProps> = ({ prefix, control }) => {
  return (
    <div className="border border-border/80 rounded-xl p-4 bg-muted/20 space-y-3">
      <h4 className="text-xs font-bold text-foreground tracking-wide uppercase">
        OT Deduction
      </h4>

      <div className="flex items-center gap-2 flex-wrap text-xs font-medium text-foreground">
        <Controller
          name={`${prefix}.deduction.enabled`}
          control={control}
          defaultValue={false}
          render={({ field }) => (
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={!!field.value}
                onChange={field.onChange}
                className="w-3.5 h-3.5 rounded border-input text-primary focus:ring-primary/20 accent-primary cursor-pointer"
              />
              <span className="font-semibold text-foreground">Calculate OT after</span>
            </label>
          )}
        />
        <Controller
          name={`${prefix}.deduction.value`}
          control={control}
          defaultValue={0}
          render={({ field }) => (
            <input
              {...field}
              type="number"
              className="w-16 h-8 text-xs font-bold text-center bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          )}
        />
        <Controller
          name={`${prefix}.deduction.unit`}
          control={control}
          defaultValue="minutes"
          render={({ field }) => (
            <select
              {...field}
              className="h-8 text-xs font-semibold bg-background border border-input rounded-xl px-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
            >
              <option value="minutes">Minutes</option>
              <option value="hours">Hours</option>
            </select>
          )}
        />
      </div>
    </div>
  );
};
