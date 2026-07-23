import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Palmtree, Plus, BarChart2, CheckCircle2, Clock } from 'lucide-react';

export function LeaveHeaderNav() {
  const location = useLocation();

  const navItems = [
    {
      name: 'My Leaves',
      href: '/leaves',
      icon: Palmtree,
      exact: true,
    },
    {
      name: 'Apply Leave',
      href: '/leaves/apply',
      icon: Plus,
    },
    {
      name: 'Leave Balances',
      href: '/leaves/balance',
      icon: BarChart2,
    },
    {
      name: 'Approval Inbox',
      href: '/leaves/approvals',
      icon: CheckCircle2,
    },
    {
      name: 'Comp-Off Management',
      href: '/leaves/comp-off',
      icon: Clock,
    },
  ];

  return (
    <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 mb-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex space-x-1 sm:space-x-2 overflow-x-auto py-2.5 no-scrollbar">
          {navItems.map((item) => {
            const isActive = item.exact
              ? location.pathname === item.href
              : location.pathname.startsWith(item.href);

            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                to={item.href}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
