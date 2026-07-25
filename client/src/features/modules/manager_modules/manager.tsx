import React from 'react';
import { ModuleNode } from './../types';

export const MANAGER_MODULES: ModuleNode[] = [
  {
    id: 'mgr_dashboard',
    name: 'Dashboard',
    description: 'High-level manager portal metrics and alerts',
    iconName: 'Gauge',
    defaultEnabled: true,
  },
  {
    id: 'mgr_departments',
    name: 'Departments',
    description: 'Departmental oversight, analytics, and goals',
    iconName: 'Building',
    defaultEnabled: true,
    children: [
      { id: 'mgr_dept_dashboard', name: 'Dashboard', defaultEnabled: true },
      { id: 'mgr_dept_management', name: 'Department Management', defaultEnabled: true },
      { id: 'mgr_dept_analytics', name: 'Department Analytics', defaultEnabled: true },
      { id: 'mgr_dept_announcements', name: 'Department Announcements', defaultEnabled: true },
      { id: 'mgr_dept_reports', name: 'Department Reports', defaultEnabled: true },
      { id: 'mgr_dept_goals', name: 'Department Goals', defaultEnabled: true },
    ],
  },
  {
    id: 'mgr_resource_planning',
    name: 'Resource Planning',
    description: 'Allocate and manage departmental personnel resources',
    iconName: 'UserCog',
    defaultEnabled: true,
  },
  {
    id: 'mgr_workforce_planning',
    name: 'Workforce Planning',
    description: 'Capacity forecasting and workforce strategy',
    iconName: 'Users2',
    defaultEnabled: true,
  },
  {
    id: 'mgr_recommendations',
    name: 'Recommendations',
    description: 'Manage promotions, transfers, and team analytics',
    iconName: 'Lightbulb',
    defaultEnabled: true,
    children: [
      { id: 'mgr_rec_promotion', name: 'Promotion', defaultEnabled: true },
      { id: 'mgr_rec_transfer', name: 'Transfer', defaultEnabled: true },
      { id: 'mgr_rec_reports_analytics', name: 'Reports & Analytics', defaultEnabled: true },
    ],
  },
  {
    id: 'mgr_recruitment',
    name: 'Recruitment',
    description: 'Requisition requests and candidate evaluation',
    iconName: 'UserSearch',
    defaultEnabled: true,
    children: [
      { id: 'mgr_rec_hiring_request', name: 'Hiring Request', defaultEnabled: true },
      { id: 'mgr_rec_interview_feedback', name: 'Interview Feedback', defaultEnabled: true },
      { id: 'mgr_rec_candidate_evaluation', name: 'Candidate Evaluation', defaultEnabled: true },
    ],
  },
  {
    id: 'mgr_budget_management',
    name: 'Budget Management',
    description: 'Track department expenditure and financial limits',
    iconName: 'CreditCard',
    defaultEnabled: true,
  },
  {
    id: 'mgr_org_analytics',
    name: 'Organization Analytics',
    description: 'Attrition rates, team productivity, and operational metrics',
    iconName: 'LineChart',
    defaultEnabled: true,
    children: [
      { id: 'mgr_org_attrition', name: 'Attrition', defaultEnabled: true },
      { id: 'mgr_org_productivity', name: 'Productivity', defaultEnabled: true },
    ],
  },
  {
    id: 'mgr_pip_management',
    name: 'PIP Management',
    description: 'Performance improvement plans for team members',
    iconName: 'ClipboardList',
    defaultEnabled: true,
  },
  {
    id: 'mgr_team_management',
    name: 'Team Management',
    description: 'Multi-team leadership and cross-team resource allocation',
    iconName: 'Users',
    defaultEnabled: true,
    children: [
      { id: 'mgr_team_multi_team', name: 'Multi-Team', defaultEnabled: true },
      { id: 'mgr_team_cross_resource_allocation', name: 'Cross-Team Resource Allocation', defaultEnabled: true },
    ],
  },
];

export function ManagerModulesView(): JSX.Element {
  return (
    <div className="p-4 bg-card rounded-lg border border-border">
      <h3 className="text-sm font-bold mb-2">Manager Modules Blueprint</h3>
      <p className="text-xs text-muted-foreground">
        Defines the complete module taxonomy for Department Manager role users.
      </p>
    </div>
  );
}
