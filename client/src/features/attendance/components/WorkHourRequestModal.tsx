import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import { X, Clock, Calendar as CalendarIcon, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface WorkHourRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialDate?: string;
  initialCheckIn?: string;
  initialCheckOut?: string;
}

export const WorkHourRequestModal: React.FC<WorkHourRequestModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialDate,
  initialCheckIn,
  initialCheckOut,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  const [date, setDate] = useState<string>(initialDate || todayStr);
  const [applyDateRange, setApplyDateRange] = useState<boolean>(false);
  const [startDate, setStartDate] = useState<string>(initialDate || todayStr);
  const [endDate, setEndDate] = useState<string>(initialDate || todayStr);

  const [actualCheckIn, setActualCheckIn] = useState<string>('11:57 AM');
  const [actualCheckOut, setActualCheckOut] = useState<string>('11:57 AM');

  const [checkInTime, setCheckInTime] = useState<string>(initialCheckIn || '11:57AM');
  const [checkOutTime, setCheckOutTime] = useState<string>(initialCheckOut || '11:57AM');
  const [reason, setReason] = useState<string>('');
  const [dayType, setDayType] = useState<string>('');
  const [comment, setComment] = useState<string>('');

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [fetchingActual, setFetchingActual] = useState<boolean>(false);

  // Sync date when props change
  useEffect(() => {
    if (initialDate) {
      setDate(initialDate);
      setStartDate(initialDate);
      setEndDate(initialDate);
    }
  }, [initialDate]);

  // Fetch actual attendance log when single date changes
  useEffect(() => {
    if (!isOpen || applyDateRange || !date) return;

    const fetchActualAttendance = async () => {
      setFetchingActual(true);
      try {
        const res = await apiClient.get('/attendance/history', { params: { startDate: date, endDate: date } });
        const records = Array.isArray(res.data?.data) ? res.data.data : [];
        const match = records.find((r: any) => r.check_in_date === date || (r.check_in_time && r.check_in_time.startsWith(date)));

        if (match) {
          if (match.check_in_time) {
            const inDate = new Date(match.check_in_time);
            setActualCheckIn(inDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }));
          } else {
            setActualCheckIn('--');
          }
          if (match.check_out_time) {
            const outDate = new Date(match.check_out_time);
            setActualCheckOut(outDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }));
          } else {
            setActualCheckOut('--');
          }
        } else {
          setActualCheckIn('11:57 AM');
          setActualCheckOut('11:57 AM');
        }
      } catch (err) {
        setActualCheckIn('11:57 AM');
        setActualCheckOut('11:57 AM');
      } finally {
        setFetchingActual(false);
      }
    };

    fetchActualAttendance();
  }, [date, isOpen, applyDateRange]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reason || reason === '- Select -') {
      toast.error('Please select a Reason.');
      return;
    }
    if (!dayType || dayType === '- Select -') {
      toast.error('Please select a Day type.');
      return;
    }
    if (!comment.trim()) {
      toast.error('Please enter a Comment.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        date: applyDateRange ? startDate : date,
        isDateRange: applyDateRange,
        endDate: applyDateRange ? endDate : date,
        checkIn: checkInTime,
        checkOut: checkOutTime,
        actualCheckIn: applyDateRange ? undefined : actualCheckIn,
        actualCheckOut: applyDateRange ? undefined : actualCheckOut,
        reason,
        dayType,
        comment,
      };

      const res = await apiClient.post('/attendance/regularization', payload);
      if (res.data?.success || res.status === 201) {
        toast.success('Work Hour Request submitted successfully!');
        if (onSuccess) onSuccess();
        onClose();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit work hour request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden text-slate-800 dark:text-slate-100">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 tracking-tight">
            Work Hour Request
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">

          {/* Date Row & Checkbox */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 dark:text-slate-100">Date :</span>
              {applyDateRange ? (
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="h-8 px-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                  <span>to</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="h-8 px-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
              ) : (
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-8 px-2 text-xs font-mono rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                />
              )}
            </div>

            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={applyDateRange}
                onChange={(e) => setApplyDateRange(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 dark:border-slate-700"
              />
              Apply For Date Range
            </label>
          </div>

          {/* Actual Checkin / Checkout Row (Only when NOT date range) */}
          {!applyDateRange && (
            <div className="grid grid-cols-2 gap-6 text-sm py-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 dark:text-slate-100">Actual Checkin :</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {fetchingActual ? '...' : actualCheckIn}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 dark:text-slate-100">Actual Checkout :</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {fetchingActual ? '...' : actualCheckOut}
                </span>
              </div>
            </div>
          )}

          {/* Date Range Input Display (When Apply Date Range IS checked) */}
          {applyDateRange && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1">
                Date Range <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                readOnly
                value={`${startDate} - ${endDate}`}
                className="w-full h-9 px-3 text-xs font-mono font-medium rounded border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
              />
            </div>
          )}

          {/* Checkin & Checkout Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1">
                Checkin <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={checkInTime}
                onChange={(e) => setCheckInTime(e.target.value)}
                placeholder="11:57AM"
                className="w-full h-9 px-3 text-xs font-medium rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1">
                Checkout <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={checkOutTime}
                onChange={(e) => setCheckOutTime(e.target.value)}
                placeholder="11:57AM"
                className="w-full h-9 px-3 text-xs font-medium rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Reason & Day Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1">
                Reason <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full h-9 px-3 text-xs font-medium rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="">- Select -</option>
                <option value="Missed Punch">Missed Punch</option>
                <option value="On Duty">On Duty</option>
                <option value="Technical Issue">Technical Issue</option>
                <option value="Work From Home">Work From Home</option>
                <option value="Personal Reason">Personal Reason</option>
                <option value="Forgot to Punch">Forgot to Punch</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1">
                Day <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={dayType}
                onChange={(e) => setDayType(e.target.value)}
                className="w-full h-9 px-3 text-xs font-medium rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="">- Select -</option>
                <option value="Full Day">Full Day</option>
                <option value="Half Day">Half Day</option>
                <option value="First Half">First Half</option>
                <option value="Second Half">Second Half</option>
              </select>
            </div>
          </div>

          {/* Comment Textarea */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1">
              Comment <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full px-3 py-2 text-xs font-medium rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
            />
          </div>

          {/* Action Buttons Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-[#00a65a] hover:bg-[#008d4c] text-white text-xs font-bold rounded shadow-xs transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Requesting...
                </>
              ) : (
                'Request'
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded border border-slate-300 dark:border-slate-700 transition-colors"
            >
              Close
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
