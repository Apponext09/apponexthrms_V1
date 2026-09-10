import React from 'react';
import { ModuleNode } from './../types';

export const TL_MODULES: ModuleNode[] = [
  {
    id: 'tl_dashboard',
    name: 'Dashboard',
    description: 'Team lead portal overview and daily metrics',
    iconName: 'Gauge',
    defaultEnabled: true,
  },
  {
    id: 'tl_team',
    name: 'Team',
    description: 'Direct report team members, attendance, and leave calendar',
    iconName: 'Users',
    defaultEnabled: true,
    children: [
      { id: 'tl_my_team', name: 'My Team', defaultEnabled: true },
      { id: 'tl_team_attendance', name: 'Team Attendance', defaultEnabled: true },
      { id: 'tl_team_leave_calendar', name: 'Team Leave Calendar / Leave Apply', defaultEnabled: true },
      { id: 'tl_team_shift_mgt', name: 'Team Shift Management', defaultEnabled: true },
    ],
  },
  {
    id: 'tl_my_attendance',
    name: 'My Attendance',
    description: 'Self attendance logs, clock in/out, and regularizations',
    iconName: 'UserCheck',
    defaultEnabled: true,
  },
  {
    id: 'tl_approvals',
    name: 'Approvals',
    description: 'Review and approve team requests and task assignments',
    iconName: 'CheckSquare',
    defaultEnabled: true,
    children: [
      { id: 'tl_appr_expense', name: 'Expense Approval', defaultEnabled: true },
      { id: 'tl_appr_travel', name: 'Travel', defaultEnabled: true },
      { id: 'tl_appr_wfh', name: 'WFH', defaultEnabled: true },
      { id: 'tl_appr_overtime', name: 'Overtime', defaultEnabled: true },
      { id: 'tl_appr_task_assignment', name: 'Task Assignment', defaultEnabled: true },
    ],
  },
  {
    id: 'tl_workload_management',
    name: 'Workload Management',
    description: 'Balance task distribution and capacity across team members',
    iconName: 'BarChart2',
    defaultEnabled: true,
  },
  {
    id: 'tl_project_allocation',
    name: 'Project Allocation',
    description: 'Assign team members to active projects and deliverables',
    iconName: 'FolderKanban',
    defaultEnabled: true,
  },
  {
    id: 'tl_team_performance',
    name: 'Team Performance',
    description: 'Track team KPIs, deliverables, and performance reviews',
    iconName: 'TrendingUp',
    defaultEnabled: true,
  },
  {
    id: 'tl_team_goals',
    name: 'Team Goals',
    description: 'Set and track team OKRs and milestone targets',
    iconName: 'Target',
    defaultEnabled: true,
  },
  {
    id: 'tl_one_on_one_meetings',
    name: '1-on-1 Meetings',
    description: 'Schedule and manage 1-on-1 check-ins via video tools',
    iconName: 'Video',
    defaultEnabled: true,
    children: [
      { id: 'tl_meet_google_meet', name: 'Google Meet', defaultEnabled: true },
      { id: 'tl_meet_ms_teams', name: 'Microsoft Teams', defaultEnabled: true },
      { id: 'tl_meet_zoom', name: 'Zoom', defaultEnabled: true },
    ],
  },
  {
    id: 'tl_team_training_progress',
    name: 'Team Training Progress',
    description: 'Monitor learning progress and course completions',
    iconName: 'GraduationCap',
    defaultEnabled: true,
  },
  {
    id: 'tl_team_reports',
    name: 'Team Reports',
    description: 'Generate team activity and output summary reports',
    iconName: 'FileSpreadsheet',
    defaultEnabled: true,
  },
  {
    id: 'tl_team_announcements',
    name: 'Team Announcements',
    description: 'Broadcast updates and announcements to your team',
    iconName: 'Megaphone',
    defaultEnabled: true,
  },
];

export function TLModulesView(): JSX.Element {
  return (
    <div className="p-4 bg-card rounded-lg border border-border">
      <h3 className="text-sm font-bold mb-2">Team Lead Modules Blueprint</h3>
      <p className="text-xs text-muted-foreground">
        Defines the complete module taxonomy for Team Lead role users.
      </p>
    </div>
  );
}
