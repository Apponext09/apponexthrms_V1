import React from 'react';

// RegularizationForm stub
export const RegularizationForm: React.FC<{ onSubmit?: () => void }> = () => (
  <form className="bg-white rounded-lg shadow-md p-6 space-y-4">
    <h3 className="text-lg font-semibold">Request Regularization</h3>
    <input placeholder="Type" className="w-full px-3 py-2 border rounded" />
    <input placeholder="Date" type="date" className="w-full px-3 py-2 border rounded" />
    <textarea placeholder="Reason" className="w-full px-3 py-2 border rounded" />
    <button className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
      Submit
    </button>
  </form>
);

// OvertimeForm stub
export const OvertimeForm: React.FC = () => (
  <form className="bg-white rounded-lg shadow-md p-6 space-y-4">
    <h3 className="text-lg font-semibold">Request Overtime</h3>
    <input placeholder="Date" type="date" className="w-full px-3 py-2 border rounded" />
    <input placeholder="Hours" type="number" className="w-full px-3 py-2 border rounded" />
    <select className="w-full px-3 py-2 border rounded">
      <option>Extra Hours</option>
      <option>Weekend Work</option>
      <option>Holiday Work</option>
    </select>
    <textarea placeholder="Reason" className="w-full px-3 py-2 border rounded" />
    <button className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
      Submit
    </button>
  </form>
);

// TimesheetForm stub
export const TimesheetForm: React.FC = () => (
  <form className="bg-white rounded-lg shadow-md p-6 space-y-4">
    <h3 className="text-lg font-semibold">Create Timesheet</h3>
    <input placeholder="Period Start" type="date" className="w-full px-3 py-2 border rounded" />
    <input placeholder="Period End" type="date" className="w-full px-3 py-2 border rounded" />
    <button className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
      Create
    </button>
  </form>
);

// AttendanceChart stub
export const AttendanceChart: React.FC = () => (
  <div className="bg-white rounded-lg shadow-md p-6 h-96 flex items-center justify-center">
    <p className="text-gray-500">Chart will render here</p>
  </div>
);

// ShiftSwapModal stub
export const ShiftSwapModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen }) =>
  isOpen ? (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 max-w-md">
        <h3 className="text-lg font-semibold mb-4">Request Shift Swap</h3>
        <form className="space-y-4">
          <input placeholder="Swap with employee" className="w-full px-3 py-2 border rounded" />
          <textarea placeholder="Reason" className="w-full px-3 py-2 border rounded" />
          <button className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Submit
          </button>
        </form>
      </div>
    </div>
  ) : null;

// LocationMap stub
export const LocationMap: React.FC<{ location: any }> = () => (
  <div className="bg-white rounded-lg shadow-md p-6 h-96 flex items-center justify-center">
    <p className="text-gray-500">Map will render here</p>
  </div>
);

// AttendanceStats stub
export const AttendanceStats: React.FC = () => (
  <div className="grid grid-cols-4 gap-4">
    {[
      { label: 'Present', value: '20', color: 'bg-green-100' },
      { label: 'Absent', value: '2', color: 'bg-red-100' },
      { label: 'Late', value: '5', color: 'bg-yellow-100' },
      { label: 'Percentage', value: '90%', color: 'bg-blue-100' },
    ].map((stat) => (
      <div key={stat.label} className={`${stat.color} rounded-lg p-4 text-center`}>
        <p className="text-sm text-gray-600">{stat.label}</p>
        <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
      </div>
    ))}
  </div>
);

// BreakTimer stub
export const BreakTimer: React.FC = () => (
  <div className="bg-white rounded-lg shadow-md p-6 text-center">
    <h3 className="text-lg font-semibold mb-4">Break Timer</h3>
    <p className="text-4xl font-bold text-gray-900 mb-4">00:15:30</p>
    <button className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">End Break</button>
  </div>
);

// TimelineEntry stub
export const TimelineEntry: React.FC<{ entry: any }> = ({ entry }) => (
  <div className="flex items-center gap-4 p-3 bg-gray-50 rounded">
    <div className="w-2 h-2 bg-blue-600 rounded-full" />
    <div className="flex-1">
      <p className="font-medium text-gray-900">{entry.title}</p>
      <p className="text-sm text-gray-600">{entry.time}</p>
    </div>
  </div>
);

// AttendanceFilters stub
export const AttendanceFilters: React.FC = () => (
  <div className="bg-white rounded-lg shadow-md p-4 space-y-3">
    <input placeholder="From Date" type="date" className="w-full px-3 py-2 border rounded" />
    <input placeholder="To Date" type="date" className="w-full px-3 py-2 border rounded" />
    <select className="w-full px-3 py-2 border rounded">
      <option>All Statuses</option>
      <option>Present</option>
      <option>Absent</option>
    </select>
    <button className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
      Filter
    </button>
  </div>
);

// GeoLocationCheck stub
export const GeoLocationCheck: React.FC = () => (
  <div className="bg-white rounded-lg shadow-md p-6">
    <h3 className="text-lg font-semibold mb-4">Location Status</h3>
    <p className="text-green-600 font-semibold">✓ Within Office Geofence</p>
  </div>
);

// TimesheetEntryForm stub
export const TimesheetEntryForm: React.FC = () => (
  <form className="bg-white rounded-lg shadow-md p-6 space-y-4">
    <h3 className="text-lg font-semibold">Add Entry</h3>
    <input placeholder="Task Name" className="w-full px-3 py-2 border rounded" />
    <input placeholder="Hours" type="number" className="w-full px-3 py-2 border rounded" />
    <button className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
      Add
    </button>
  </form>
);
