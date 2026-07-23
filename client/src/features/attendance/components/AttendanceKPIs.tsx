import React from 'react';

interface AttendanceKPIsProps {
  present?: number;
  absent?: number;
  late?: number;
  percentage?: string;
}

export const AttendanceKPIs: React.FC<AttendanceKPIsProps> = ({
  present = 20,
  absent = 2,
  late = 5,
  percentage = '90%',
}) => {
  const kpiItems = [
    {
      label: 'Present',
      value: String(present),
      color: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    },
    {
      label: 'Absent',
      value: String(absent),
      color: 'bg-rose-100 dark:bg-rose-950/60 text-rose-900 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    },
    {
      label: 'Late',
      value: String(late),
      color: 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    },
    {
      label: 'Percentage',
      value: percentage,
      color: 'bg-blue-100 dark:bg-blue-950/60 text-blue-900 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {kpiItems.map((stat) => (
        <div
          key={stat.label}
          className={`${stat.color} rounded-2xl p-5 border text-center shadow-sm flex flex-col justify-between items-center`}
        >
          <p className="text-sm font-bold opacity-80">{stat.label}</p>
          <p className="text-3xl font-extrabold mt-1 tracking-tight">{stat.value}</p>
        </div>
      ))}
    </div>
  );
};
