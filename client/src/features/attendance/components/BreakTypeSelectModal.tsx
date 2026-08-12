import React, { useState, useEffect } from 'react';
import { Coffee, Clock, X, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAttendance, type BreakTypeOption } from '../hooks/useAttendance';
import { useAttendanceStore } from '../store/attendanceStore';

interface BreakTypeSelectModalProps {
  onClose: () => void;
  onConfirm: () => void;
}

/**
 * BreakTypeSelectModal — shown when employee clicks "Stop Break".
 * Asks which break type the break was and then calls break-out API.
 */
export const BreakTypeSelectModal: React.FC<BreakTypeSelectModalProps> = ({ onClose, onConfirm }) => {
  const { breakOut, getBreakTypes } = useAttendance();
  const { setBreakStatusFromAPI, clearBreakState, assignedBreakMinutes, totalUsedMinutes } = useAttendanceStore();

  const [breakTypes, setBreakTypes] = useState<BreakTypeOption[]>([]);
  const [selectedBreakType, setSelectedBreakType] = useState<BreakTypeOption | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingTypes, setLoadingTypes] = useState(true);

  useEffect(() => {
    setLoadingTypes(true);
    getBreakTypes()
      .then((types) => {
        setBreakTypes(types);
        if (types.length > 0) {
          setSelectedBreakType(types[0]);
        }
      })
      .catch(() => setBreakTypes([]))
      .finally(() => setLoadingTypes(false));
  }, [getBreakTypes]);

  const handleConfirm = async () => {
    if (!selectedBreakType) return;
    setLoading(true);
    try {
      await breakOut({
        breakTypeName: selectedBreakType.name,
        breakSettingId: Number(selectedBreakType.id),
      });
      clearBreakState();
      toast.success(`Break ended — recorded as "${selectedBreakType.name}"`);
      onConfirm();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to end break. Please try again.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    /* Overlay backdrop */
    <div className="fixed inset-0 z-[10001] flex items-end sm:items-center justify-center p-4">
      {/* Blurred backdrop (over the break overlay) */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal card */}
      <div className="relative z-10 w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-in slide-in-from-bottom-8 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-amber-100 dark:bg-amber-950 rounded-lg">
              <Coffee className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">Select Break Type</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">What type of break did you take?</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Break type list */}
        <div className="px-5 py-4 space-y-2 max-h-72 overflow-y-auto">
          {loadingTypes ? (
            <div className="flex items-center justify-center py-8 gap-2 text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-xs">Loading break types...</span>
            </div>
          ) : breakTypes.length === 0 ? (
            <div className="text-center py-6">
              <Coffee className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-500 dark:text-slate-400">No break types configured.</p>
              <p className="text-[10px] text-slate-400 mt-1">Contact HR to configure break types in Settings.</p>
            </div>
          ) : (
            breakTypes.map((type) => {
              const isSelected = selectedBreakType?.id === type.id;
              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setSelectedBreakType(type)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all text-left ${
                    isSelected
                      ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/60 dark:border-amber-500'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-amber-300 dark:hover:border-amber-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${
                      isSelected ? 'bg-amber-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}>
                      {type.name.toLowerCase().includes('lunch') ? '🍽️' :
                       type.name.toLowerCase().includes('tea') || type.name.toLowerCase().includes('coffee') ? '☕' :
                       type.name.toLowerCase().includes('prayer') ? '🕌' :
                       type.name.toLowerCase().includes('personal') ? '🚶' : '⏸️'}
                    </div>
                    <div>
                      <p className={`text-xs font-bold ${isSelected ? 'text-amber-700 dark:text-amber-300' : 'text-slate-800 dark:text-slate-200'}`}>
                        {type.name}
                      </p>
                      {type.max_allow_time && (
                        <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" />
                          Max: {type.max_allow_time} hrs
                        </p>
                      )}
                    </div>
                  </div>
                  {isSelected && (
                    <CheckCircle2 className="w-4 h-4 text-amber-500 shrink-0" />
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-800 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!selectedBreakType || loading || breakTypes.length === 0}
            className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Ending Break...</span>
              </>
            ) : (
              <>
                <span>Confirm & End Break</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
