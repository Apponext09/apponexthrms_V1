import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  Plus, 
  Send, 
  CheckCircle2, 
  Clock, 
  Tag 
} from 'lucide-react';
import { useTimesheet } from '../hooks/useTimesheet';
import { toast } from 'sonner';

export const TimesheetView: React.FC = () => {
  const { createTimesheet, addEntry, submitTimesheet } = useTimesheet();

  const [projectName, setProjectName] = useState('HRMS Portal Core Development');
  const [taskName, setTaskName] = useState('');
  const [hours, setHours] = useState(4);
  const [isBillable, setIsBillable] = useState(true);

  const [entries, setEntries] = useState([
    { id: 1, date: '2026-07-22', project: 'HRMS Portal', task: 'Attendance Module UI Redesign', hours: 4.5, isBillable: true },
    { id: 2, date: '2026-07-22', project: 'HRMS Portal', task: 'Backend API Integration & Testing', hours: 3.5, isBillable: true },
    { id: 3, date: '2026-07-21', project: 'SuperAdmin SaaS', task: 'Organization Subscription Schema Migration', hours: 8.0, isBillable: true },
  ]);

  const handleAddEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskName.trim()) {
      toast.error('Please enter a task description.');
      return;
    }

    const newEntry = {
      id: Date.now(),
      date: new Date().toISOString().split('T')[0],
      project: projectName,
      task: taskName,
      hours,
      isBillable,
    };

    setEntries([newEntry, ...entries]);
    setTaskName('');
    toast.success('Task entry logged to weekly timesheet!');
  };

  const handleSubmitTimesheet = () => {
    toast.success('Weekly timesheet submitted for manager approval!');
  };

  const totalLoggedHours = entries.reduce((acc, item) => acc + item.hours, 0);
  const billableHours = entries.filter((item) => item.isBillable).reduce((acc, item) => acc + item.hours, 0);

  return (
    <div className="space-y-6">
      {/* Header & Stats Banner */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <FileSpreadsheet className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Project Work Timesheets</h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">Log task hours, billable effort, and submit weekly work reports</p>
        </div>

        <div className="flex items-center space-x-4">
          <div className="text-right">
            <span className="text-xs text-slate-400 font-medium block">Total Weekly Hours</span>
            <span className="text-lg font-bold text-slate-900 dark:text-white font-mono">{totalLoggedHours}h</span>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400 font-medium block">Billable Hours</span>
            <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono">{billableHours}h</span>
          </div>
          <button
            onClick={handleSubmitTimesheet}
            className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-600/20 flex items-center space-x-1.5 transition-all"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Submit Timesheet</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* New Entry Form */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <Plus className="w-4 h-4 text-indigo-600" />
            <span>Add Work Log Entry</span>
          </h4>

          <form onSubmit={handleAddEntry} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Project Name
              </label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Task Description
              </label>
              <input
                type="text"
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                placeholder="e.g. Design responsive UI components"
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Hours Spent
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="12"
                  value={hours}
                  onChange={(e) => setHours(parseFloat(e.target.value) || 1)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-end pb-2">
                <label className="flex items-center space-x-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isBillable}
                    onChange={(e) => setIsBillable(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span>Billable Client Work</span>
                </label>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs shadow-md shadow-indigo-600/20 flex items-center justify-center space-x-1.5 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Log Task Entry</span>
            </button>
          </form>
        </div>

        {/* Entries Table */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">Logged Work Entries</h4>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Project</th>
                  <th className="py-3 px-3">Task Details</th>
                  <th className="py-3 px-3">Hours</th>
                  <th className="py-3 px-3">Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {entries.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3 font-mono font-medium text-slate-700 dark:text-slate-300">{item.date}</td>
                    <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">{item.project}</td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-400">{item.task}</td>
                    <td className="py-3 px-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">{item.hours}h</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        item.isBillable
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        {item.isBillable ? 'Billable' : 'Internal'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
