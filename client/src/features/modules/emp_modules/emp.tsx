import React from 'react';
import { ModuleNode } from './../types';

export const EMP_MODULES: ModuleNode[] = [
  {
    id: 'emp_dashboard',
    name: 'Dashboard',
    description: 'Personal self-service dashboard and daily summary',
    iconName: 'Gauge',
    defaultEnabled: true,
  },
  {
    id: 'emp_profile',
    name: 'My Profile',
    description: 'Personal details, family info, education, and documents',
    iconName: 'User',
    defaultEnabled: true,
  },
  {
    id: 'emp_attendance',
    name: 'My Attendance',
    description: 'Check in/out, view timelogs, and request regularizations',
    iconName: 'Clock',
    defaultEnabled: true,
  },
  {
    id: 'emp_leaves',
    name: 'My Leaves',
    description: 'Apply for leaves, view leave balances and holiday calendar',
    iconName: 'Calendar',
    defaultEnabled: true,
    children: [
      { id: 'emp_leave_backup_person', name: 'Backup Person Selection', description: 'Enable Backup Person field when applying for leaves', defaultEnabled: true },
    ],
  },
  {
    id: 'emp_payroll',
    name: 'My Payroll & Payslips',
    description: 'View monthly payslips, tax declarations, and salary info',
    iconName: 'Wallet',
    defaultEnabled: true,
  },
  {
    id: 'emp_performance',
    name: 'My Performance & Goals',
    description: 'Track individual goals, self-reviews, and feedback',
    iconName: 'Target',
    defaultEnabled: true,
  },
  {
    id: 'emp_assets',
    name: 'My Assets',
    description: 'View company assets and equipment assigned to you',
    iconName: 'Package',
    defaultEnabled: true,
  },
  {
    id: 'emp_tasks_approvals',
    name: 'My Tasks & Approvals',
    description: 'Action items, assigned tasks, and pending requests',
    iconName: 'CheckSquare',
    defaultEnabled: true,
  },
  {
    id: 'emp_helpdesk',
    name: 'Helpdesk & Requests',
    description: 'Submit support tickets, HR queries, and IT requests',
    iconName: 'Headphones',
    defaultEnabled: true,
  },
  {
    id: 'emp_policies',
    name: 'Company Policies',
    description: 'Access company handbooks, rules, and guidelines',
    iconName: 'FileText',
    defaultEnabled: true,
  },
];

export function EmpModulesView(): JSX.Element {
  return (
    <div className="p-4 bg-card rounded-lg border border-border">
      <h3 className="text-sm font-bold mb-2">Employee Self-Service Modules</h3>
      <p className="text-xs text-muted-foreground">
        Defines the complete module taxonomy for regular Employee role users.
      </p>
    </div>
  );
}
