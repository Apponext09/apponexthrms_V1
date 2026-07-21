import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useApplyLeave } from '../hooks/useLeave';
import { useLeaveBalance } from '../hooks/useLeaveBalance';

export function ApplyLeavePage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    leaveTypeId: '',
    startDate: '',
    endDate: '',
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
      alert('Please fill in all required fields');
      return;
    }

    try {
      await applyLeave({
        employeeId: 1, // Should come from auth context
        leaveTypeId: parseInt(formData.leaveTypeId),
        startDate: formData.startDate,
        endDate: formData.endDate,
        reason: formData.reason,
        isHalfDay: formData.isHalfDay,
        halfDayPeriod: formData.isHalfDay ? (formData.halfDayPeriod as any) : undefined,
      });

      navigate('/leaves');
    } catch (err) {
      console.error(err);
    }
  };

  const getAvailableBalance = (leaveTypeId: string): number => {
    if (!leaveTypeId) return 0;
    const balance = balances.find((b) => b.leaveTypeId === parseInt(leaveTypeId));
    return balance?.availableBalance || 0;
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Apply for Leave</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Leave Type *</label>
              <select
                name="leaveTypeId"
                value={formData.leaveTypeId}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                required
              >
                <option value="">Select Leave Type</option>
                <option value="1">Casual Leave</option>
                <option value="2">Sick Leave</option>
                <option value="3">Earned Leave</option>
                <option value="4">Privilege Leave</option>
              </select>
              {formData.leaveTypeId && (
                <p className="text-sm text-gray-600 mt-2">
                  Available Balance: {getAvailableBalance(formData.leaveTypeId)} days
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Start Date *</label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">End Date *</label>
              <input
                type="date"
                name="endDate"
                value={formData.endDate}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                required
              />
            </div>

            <div className="flex items-end">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="isHalfDay"
                  checked={formData.isHalfDay}
                  onChange={handleChange}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium">Half Day</span>
              </label>
            </div>
          </div>

          {formData.isHalfDay && (
            <div>
              <label className="block text-sm font-medium mb-2">Half Day Period</label>
              <select
                name="halfDayPeriod"
                value={formData.halfDayPeriod}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="first_half">First Half (Morning)</option>
                <option value="second_half">Second Half (Afternoon)</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">Reason</label>
            <textarea
              name="reason"
              value={formData.reason}
              onChange={handleChange}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="Please provide a reason for your leave request..."
            />
          </div>

          <div className="flex gap-4 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(-1)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Applying...' : 'Apply for Leave'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
