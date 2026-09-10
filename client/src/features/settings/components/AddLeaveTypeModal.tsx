import React, { useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Info, Loader2, Sparkles, ArrowRight } from 'lucide-react';

interface AddLeaveTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newLeaveType: any) => void;
  onCreateApi: (data: any) => Promise<any>;
}

const COLOR_OPTIONS = [
  { id: 'None', label: '⚪ None / Slate', dot: 'bg-slate-400' },
  { id: 'Sky', label: '🔵 Sky Blue', dot: 'bg-sky-500' },
  { id: 'Indigo', label: '🟣 Indigo Purple', dot: 'bg-indigo-600' },
  { id: 'Emerald', label: '🟢 Emerald Green', dot: 'bg-emerald-500' },
  { id: 'Amber', label: '🟠 Amber Gold', dot: 'bg-amber-500' },
  { id: 'Rose', label: '🔴 Rose Red', dot: 'bg-rose-500' },
  { id: 'Teal', label: '🩵 Teal Cyan', dot: 'bg-teal-500' },
  { id: 'Violet', label: '🔮 Deep Violet', dot: 'bg-violet-600' },
  { id: 'Fuchsia', label: '🌸 Fuchsia Pink', dot: 'bg-fuchsia-500' },
  { id: 'Orange', label: '🔥 Sunset Orange', dot: 'bg-orange-500' },
  { id: 'Lime', label: '🌱 Lime Green', dot: 'bg-lime-500' },
  { id: 'Cyan', label: '💠 Electric Cyan', dot: 'bg-cyan-500' },
];

const ICON_OPTIONS = [
  { id: 'None', emoji: '🚫', label: 'None' },
  { id: 'Sun', emoji: '☀️', label: 'Sun' },
  { id: 'Palm', emoji: '🌴', label: 'Palm' },
  { id: 'Vacation', emoji: '🏖️', label: 'Vacation' },
  { id: 'Hospital', emoji: '🏥', label: 'Hospital' },
  { id: 'Pill', emoji: '💊', label: 'Pill' },
  { id: 'Thermometer', emoji: '🌡️', label: 'Flu/Fever' },
  { id: 'Heart', emoji: '💖', label: 'Wellness' },
  { id: 'Baby', emoji: '👶', label: 'Maternity' },
  { id: 'Briefcase', emoji: '💼', label: 'Official' },
  { id: 'Coffee', emoji: '☕', label: 'Break' },
  { id: 'Clock', emoji: '⏰', label: 'Comp-off' },
  { id: 'Plane', emoji: '✈️', label: 'Travel' },
  { id: 'Book', emoji: '📚', label: 'Study' },
  { id: 'Home', emoji: '🏠', label: 'Personal' },
  { id: 'Award', emoji: '🏆', label: 'Privilege' },
  { id: 'Star', emoji: '⭐', label: 'Special' },
  { id: 'Shield', emoji: '🛡️', label: 'Emergency' },
  { id: 'Party', emoji: '🎉', label: 'Celebration' },
  { id: 'Umbrella', emoji: '☂️', label: 'Weather' },
];

export const AddLeaveTypeModal: React.FC<AddLeaveTypeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onCreateApi,
}) => {
  const [leaveName, setLeaveName] = useState('');
  const [leaveCode, setLeaveCode] = useState('');
  const [annualQuota, setAnnualQuota] = useState<number | string>('');
  const [color, setColor] = useState('Indigo');
  const [icon, setIcon] = useState('Sun');
  const [isPaid, setIsPaid] = useState(true);
  const [unit, setUnit] = useState<'Days' | 'Hours'>('Days');
  const [effectiveFrom, setEffectiveFrom] = useState('');
  const [effectiveTo, setEffectiveTo] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const resetForm = () => {
    setLeaveName('');
    setLeaveCode('');
    setAnnualQuota('');
    setColor('Indigo');
    setIcon('Sun');
    setIsPaid(true);
    setUnit('Days');
    setEffectiveFrom('');
    setEffectiveTo('');
    setDescription('');
    setErrorMsg('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveName.trim()) {
      setErrorMsg('Category name is required');
      return;
    }
    if (!leaveCode.trim()) {
      setErrorMsg('Short Code is required');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const payload = {
        leave_name: leaveName.trim(),
        leave_code: leaveCode.trim().toUpperCase(),
        annual_quota: Number(annualQuota) || 10,
        paid_type: isPaid ? 'paid' : 'unpaid',
        unit,
        color,
        icon,
        effective_from: effectiveFrom || null,
        effective_to: effectiveTo || null,
        description: description || null,
        status: 'active',
        gender_applicable: 'all',
        sandwich_rule_enabled: false,
        carry_forward_enabled: false,
        encashment_enabled: false,
      };

      const result = await onCreateApi(payload);
      handleClose();
      if (result) {
        onSuccess(result);
      }
    } catch (err: any) {
      console.error('Failed to create leave type:', err);
      setErrorMsg(err?.response?.data?.message || 'Failed to create leave type');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-xl w-full p-0 gap-0 rounded-3xl overflow-hidden bg-background dark:bg-slate-950 border border-border/60/90 dark:border-slate-800 shadow-2xl flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-6 pb-5 bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 text-white shrink-0 relative overflow-hidden">
          <div className="relative z-10 space-y-1 pr-8">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 rounded-xl shadow-2xs">
                <Sparkles className="w-4 h-4 text-indigo-300" />
              </div>
              <DialogTitle className="text-lg font-extrabold tracking-tight text-white">
                Create Leave Category
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-indigo-200/80 font-medium leading-relaxed">
              Define category title, code, and total annual quota (e.g., Sick Leave = 10 days).
            </DialogDescription>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden flex-1">
          <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(88vh-140px)]">
            {errorMsg && (
              <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-bold">
                {errorMsg}
              </div>
            )}

            {/* Name, Short Code & Annual Quota */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="space-y-1.5 sm:col-span-1">
                <label className="text-xs font-extrabold text-foreground dark:text-slate-200 flex items-center gap-1">
                  <span>Category Name *</span>
                  <Info className="w-3.5 h-3.5 text-muted-foreground/70" />
                </label>
                <Input
                  type="text"
                  value={leaveName}
                  onChange={(e) => setLeaveName(e.target.value)}
                  placeholder="e.g. Sick Leave"
                  className="h-10 text-xs font-semibold rounded-2xl border-border/60 dark:border-slate-800 bg-muted/30/70 dark:bg-slate-900 focus:bg-background dark:focus:bg-slate-950"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-foreground dark:text-slate-200 flex items-center gap-1">
                  <span>Short Code *</span>
                  <Info className="w-3.5 h-3.5 text-muted-foreground/70" />
                </label>
                <Input
                  type="text"
                  value={leaveCode}
                  onChange={(e) => setLeaveCode(e.target.value.toUpperCase())}
                  placeholder="e.g. SL"
                  className="h-10 text-xs font-mono font-bold uppercase rounded-2xl border-border/60 dark:border-slate-800 bg-muted/30/70 dark:bg-slate-900"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-foreground dark:text-slate-200 flex items-center gap-1">
                  <span>Annual Quota (Days) *</span>
                  <Info className="w-3.5 h-3.5 text-muted-foreground/70" />
                </label>
                <Input
                  type="number"
                  min="0"
                  max="365"
                  value={annualQuota}
                  onChange={(e) => setAnnualQuota(e.target.value)}
                  placeholder="e.g. 10"
                  className="h-10 text-xs font-bold rounded-2xl border-border/60 dark:border-slate-800 bg-muted/30/70 dark:bg-slate-900 text-indigo-600 dark:text-indigo-400"
                  required
                />
              </div>
            </div>

            {/* Color Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-foreground dark:text-slate-200 flex items-center gap-1">
                <span>Theme Color Accent</span>
                <Info className="w-3.5 h-3.5 text-muted-foreground/70" />
              </label>
              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                {COLOR_OPTIONS.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setColor(c.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      color === c.id
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/20 shadow-2xs'
                        : 'bg-background dark:bg-slate-900 border-border/60 dark:border-slate-800 text-muted-foreground dark:text-muted-foreground/70 hover:border-border'
                    }`}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full ${c.dot}`} />
                    <span>{c.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Icon Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-foreground dark:text-slate-200 flex items-center gap-1">
                <span>Category Icon</span>
                <Info className="w-3.5 h-3.5 text-muted-foreground/70" />
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2 pt-0.5 max-h-52 overflow-y-auto p-1.5 border border-slate-100 dark:border-slate-800 rounded-2xl bg-muted/30/40 dark:bg-slate-900/40">
                {ICON_OPTIONS.map(i => (
                  <button
                    key={i.id}
                    type="button"
                    onClick={() => setIcon(i.id)}
                    className={`flex items-center justify-center gap-1.5 p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      icon === i.id
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/20'
                        : 'bg-background dark:bg-slate-900 border-border/60 dark:border-slate-800 text-foreground dark:text-slate-300 hover:bg-muted/50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className="text-sm">{i.emoji}</span>
                    <span className="truncate text-[11px]">{i.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Paid Leave Card Toggle */}
            <div className="p-4 rounded-2xl border border-border/60/90 dark:border-slate-800 bg-background dark:bg-slate-900 flex items-center justify-between shadow-2xs">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-extrabold text-foreground dark:text-white">Paid Leave Classification</span>
                  <Info className="w-3.5 h-3.5 text-muted-foreground/70" />
                </div>
                <p className="text-[11px] text-muted-foreground font-medium">
                  {isPaid ? 'Employees receive salary for these leaves' : 'Unpaid leave / Leave Without Pay (LWP)'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsPaid(!isPaid)}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 ease-in-out cursor-pointer ${
                  isPaid ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-background shadow-xs transition duration-200 ease-in-out ${
                    isPaid ? 'translate-x-[22px]' : 'translate-x-[2px]'
                  }`}
                />
              </button>
            </div>

            {/* Counted in Segmented Toggle */}
            <div className="p-4 rounded-2xl border border-border/60/90 dark:border-slate-800 bg-background dark:bg-slate-900 flex items-center justify-between shadow-2xs">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-extrabold text-foreground dark:text-white">Leave Calculation Unit</span>
                  <Info className="w-3.5 h-3.5 text-muted-foreground/70" />
                </div>
                <p className="text-[11px] text-muted-foreground font-medium">
                  Select whether requests are processed in Days or Hours
                </p>
              </div>

              <div className="flex items-center p-1 bg-muted/50 dark:bg-slate-800 rounded-xl border border-border/60/80 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setUnit('Days')}
                  className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    unit === 'Days'
                      ? 'bg-background dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Days
                </button>
                <button
                  type="button"
                  onClick={() => setUnit('Hours')}
                  className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    unit === 'Hours'
                      ? 'bg-background dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Hours
                </button>
              </div>
            </div>

            {/* Effective Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-foreground dark:text-slate-200 flex items-center gap-1">
                  <span>Effective From</span>
                  <Info className="w-3.5 h-3.5 text-muted-foreground/70" />
                </label>
                <Input
                  type="date"
                  value={effectiveFrom}
                  onChange={(e) => setEffectiveFrom(e.target.value)}
                  className="h-10 text-xs font-medium rounded-2xl border-border/60 dark:border-slate-800 bg-muted/30/70 dark:bg-slate-900"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-foreground dark:text-slate-200 flex items-center gap-1">
                  <span>Effective To</span>
                  <Info className="w-3.5 h-3.5 text-muted-foreground/70" />
                </label>
                <Input
                  type="date"
                  value={effectiveTo}
                  onChange={(e) => setEffectiveTo(e.target.value)}
                  className="h-10 text-xs font-medium rounded-2xl border-border/60 dark:border-slate-800 bg-muted/30/70 dark:bg-slate-900"
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-foreground dark:text-slate-200 flex items-center gap-1">
                <span>Description & Guidelines</span>
                <Info className="w-3.5 h-3.5 text-muted-foreground/70" />
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add organizational policy notes..."
                className="w-full p-3 text-xs rounded-2xl border border-border/60 dark:border-slate-800 bg-muted/30/70 dark:bg-slate-900 focus:bg-background dark:focus:bg-slate-950 focus:outline-none"
              />
            </div>
          </div>

          {/* Sticky Footer */}
          <div className="p-4 px-6 border-t border-slate-100 dark:border-slate-800/80 bg-muted/30/80 dark:bg-slate-900/60 backdrop-blur-xs flex items-center justify-end gap-3 shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="h-9 px-4 text-xs font-bold rounded-xl border-border/60 dark:border-slate-800 text-foreground dark:text-slate-300 cursor-pointer hover:bg-muted/50"
            >
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-9 px-6 text-xs font-extrabold rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-md shadow-indigo-500/25 cursor-pointer flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <span>Continue to Rules</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
