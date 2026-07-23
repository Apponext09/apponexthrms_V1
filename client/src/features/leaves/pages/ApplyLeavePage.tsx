import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApplyLeave } from '../hooks/useLeave';
import { useLeaveBalance } from '../hooks/useLeaveBalance';
import { LeaveHeaderNav } from '../components/LeaveHeaderNav';
import { Calendar, Clock, FileText, Send, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export function ApplyLeavePage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    leaveTypeId: '1',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    reason: '',
    isHalfDay: false,
    halfDayPeriod: 'first_half',
  });

  const { applyLeave, isLoading, error } = useApplyLeave();
  const { balances } = useLeaveBalance();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.leaveTypeId || !formData.startDate || !formData.endDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      await applyLeave({
        employeeId: 1,
        leaveTypeId: parseInt(formData.leaveTypeId, 10),
        startDate: formData.startDate,
        endDate: formData.endDate,
        reason: formData.reason,
        isHalfDay: formData.isHalfDay,
        halfDayPeriod: formData.isHalfDay ? (formData.halfDayPeriod as any) : undefined,
      });

      toast.success('Leave application submitted successfully!');
      navigate('/leaves');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit leave application');
    }
  };

  const getAvailableBalance = (leaveTypeId: string): number => {
    if (!leaveTypeId) return 0;
    const balance = balances.find((b: any) => (b.leave_type_id || b.leaveTypeId) === parseInt(leaveTypeId, 10));
    return balance ? ((balance as any).available_balance ?? balance.availableBalance ?? 12) : 12;
  };

  return (
    <div>
      <LeaveHeaderNav />
      <div className="max-w-3xl mx-auto px-4 pb-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Apply for Leave</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Submit a leave request for manager approval</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 rounded-2xl text-xs font-bold flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Form Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Leave Type */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center space-x-1">
                <FileText className="w-4 h-4 text-emerald-600" />
                <span>Leave Type *</span>
              </label>
              <select
                name="leaveTypeId"
                value={formData.leaveTypeId}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                required
              >
                <option value="1">Casual Leave (CL)</option>
                <option value="2">Sick Leave (SL)</option>
                <option value="3">Earned Leave (EL)</option>
                <option value="4">Privilege Leave (PL)</option>
              </select>
              {formData.leaveTypeId && (
                <div className="flex items-center space-x-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold pt-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Available Balance: {getAvailableBalance(formData.leaveTypeId)} days</span>
                </div>
              )}
            </div>

            {/* Start Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center space-x-1">
                <Calendar className="w-4 h-4 text-emerald-600" />
                <span>Start Date *</span>
              </label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                required
              />
            </div>

            {/* End Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center space-x-1">
                <Calendar className="w-4 h-4 text-emerald-600" />
                <span>End Date *</span>
              </label>
              <input
                type="date"
                name="endDate"
                value={formData.endDate}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                required
              />
            </div>
          </div>

          {/* Half Day Option */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
            <label className="flex items-center space-x-2 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
              <input
                type="checkbox"
                name="isHalfDay"
                checked={formData.isHalfDay}
                onChange={handleChange}
                className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
              />
              <span>Is this a Half-Day Leave request?</span>
            </label>

            {formData.isHalfDay && (
              <div className="space-y-1.5 pt-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center space-x-1">
                  <Clock className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Half Day Session</span>
                </label>
                <select
                  name="halfDayPeriod"
                  value={formData.halfDayPeriod}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
                >
                  <option value="first_half">First Half (Morning Session)</option>
                  <option value="second_half">Second Half (Afternoon Session)</option>
                </select>
              </div>
            )}
          </div>

          {/* Reason */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
              Reason / Notes
            </label>
            <textarea
              name="reason"
              value={formData.reason}
              onChange={handleChange}
              rows={4}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Please describe the reason for your leave request..."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-5 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl shadow-md transition-all flex items-center space-x-2"
            >
              <Send className="w-4 h-4" />
              <span>{isLoading ? 'Submitting Application...' : 'Submit Leave Request'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
);
}
