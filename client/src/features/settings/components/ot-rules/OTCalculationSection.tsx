import React from 'react';
import { Controller, type Control } from 'react-hook-form';

interface OTCalculationSectionProps {
  prefix:     'normalDay' | 'holiday' | 'weekend';
  control:    Control<any, any>;
  shiftType?: 'time_bound' | 'flexible';
}

const UnitSelect: React.FC<{ name: string; control: Control<any, any> }> = ({ name, control }) => (
  <Controller
    name={name}
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
);

export const OTCalculationSection: React.FC<OTCalculationSectionProps> = ({ prefix, control, shiftType = 'time_bound' }) => {
  const isFlexible = shiftType === 'flexible';

  return (
    <div className="border border-border/80 rounded-xl p-4 bg-muted/20 space-y-4">
      <h4 className="text-xs font-bold text-foreground tracking-wide uppercase">
        Calculate OT If
      </h4>

      <div className="space-y-3">
        {/* ── 1. TIME BOUND SHIFT: Before / After Shift Timing & Shiftbound ── */}
        {!isFlexible && (
          <>
            {/* Before shift time */}
            <div className="flex items-center gap-2 flex-wrap text-xs font-medium text-foreground">
              <Controller
                name={`${prefix}.calculateOT.beforeShift.enabled`}
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
                    <span className="font-semibold text-foreground">Daily Worked For Minimum</span>
                  </label>
                )}
              />
              <Controller
                name={`${prefix}.calculateOT.beforeShift.value`}
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
              <UnitSelect name={`${prefix}.calculateOT.beforeShift.unit`} control={control} />
              <span className="text-muted-foreground font-semibold">before shift time</span>
            </div>

            {/* After shift time */}
            <div className="flex items-center gap-2 flex-wrap text-xs font-medium text-foreground">
              <Controller
                name={`${prefix}.calculateOT.afterShift.enabled`}
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
                    <span className="font-semibold text-foreground">Daily Worked For Minimum</span>
                  </label>
                )}
              />
              <Controller
                name={`${prefix}.calculateOT.afterShift.value`}
                control={control}
                defaultValue={30}
                render={({ field }) => (
                  <input
                    {...field}
                    type="number"
                    className="w-16 h-8 text-xs font-bold text-center bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                )}
              />
              <UnitSelect name={`${prefix}.calculateOT.afterShift.unit`} control={control} />
              <span className="text-muted-foreground font-semibold">after shift time</span>
            </div>

            {/* Shiftbound */}
            <Controller
              name={`${prefix}.calculateOT.shiftBound`}
              control={control}
              defaultValue={false}
              render={({ field }) => (
                <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-foreground pt-1">
                  <input
                    type="checkbox"
                    checked={!!field.value}
                    onChange={field.onChange}
                    className="w-3.5 h-3.5 rounded border-input text-primary focus:ring-primary/20 accent-primary cursor-pointer"
                  />
                  <span>Consider Above Setting As Shiftbound</span>
                </label>
              )}
            />

            {/* Divider */}
            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-border"></div>
              <span className="shrink mx-3 text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest bg-muted px-2 py-0.5 rounded-full">OR</span>
              <div className="flex-grow border-t border-border"></div>
            </div>
          </>
        )}

        {/* ── 2. FLEXIBLE SHIFT: Irrespective Batch Hours ── */}
        {isFlexible && (
          <>
            <div className="flex items-center gap-2 flex-wrap text-xs font-medium text-foreground">
              <Controller
                name={`${prefix}.calculateOT.irrespectiveBatchHours.enabled`}
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
                    <span className="font-semibold text-foreground">Daily Worked For Minimum</span>
                  </label>
                )}
              />
              <Controller
                name={`${prefix}.calculateOT.irrespectiveBatchHours.value`}
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
              <UnitSelect name={`${prefix}.calculateOT.irrespectiveBatchHours.unit`} control={control} />
              <span className="text-muted-foreground font-semibold">irrespective batch hours</span>
            </div>

            {/* Divider */}
            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-border"></div>
              <span className="shrink mx-3 text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest bg-muted px-2 py-0.5 rounded-full">OR</span>
              <div className="flex-grow border-t border-border"></div>
            </div>
          </>
        )}

        {/* ── 3. Consider All Daily Worked Hours As OT (Universal) ── */}
        <Controller
          name={`${prefix}.calculateOT.considerAllAsOT`}
          control={control}
          defaultValue={false}
          render={({ field }) => (
            <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-foreground">
              <input
                type="checkbox"
                checked={!!field.value}
                onChange={field.onChange}
                className="w-3.5 h-3.5 rounded border-input text-primary focus:ring-primary/20 accent-primary cursor-pointer"
              />
              <span>Consider All Daily Worked Hours As OT</span>
            </label>
          )}
        />
      </div>
    </div>
  );
};
