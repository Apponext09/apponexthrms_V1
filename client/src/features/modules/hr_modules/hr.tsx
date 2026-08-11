import React from 'react';
import { ModuleNode } from './../types';

export const HR_MODULES: ModuleNode[] = [
  {
    id: 'hr_dashboard',
    name: 'Dashboard',
    description: 'Overview of HR metrics, alerts, and pending approvals',
    iconName: 'LayoutDashboard',
    defaultEnabled: true,
    children: [
      { id: 'hr_dashboard_notifications', name: 'Notifications', defaultEnabled: true },
      { id: 'hr_dashboard_org_structure', name: 'Organization Structure', defaultEnabled: true },
    ],
  },
  {
    id: 'hr_employee_management',
    name: 'Employee Management',
    description: 'Employee profiles, records, directory, and actions',
    iconName: 'Users',
    defaultEnabled: true,
  },
  {
    id: 'hr_employee_lifecycle',
    name: 'Employee Lifecycle',
    description: 'Track onboarding, probation, status changes, and exits',
    iconName: 'Repeat',
    defaultEnabled: true,
  },
  {
    id: 'hr_org_management',
    name: 'Organization Management',
    description: 'Company profiles, entities, and global structure',
    iconName: 'Building2',
    defaultEnabled: true,
    children: [
      { id: 'hr_org_profile_details', name: 'Organization Profile Details', defaultEnabled: true },
    ],
  },
  {
    id: 'hr_dept_management',
    name: 'Department Management',
    description: 'Department list, managers, and structural units',
    iconName: 'Building',
    defaultEnabled: true,
    children: [
      { id: 'hr_dept_module', name: 'Department Module', defaultEnabled: true },
    ],
  },
  {
    id: 'hr_branch_management',
    name: 'Branch Management',
    description: 'Office branches, physical locations, and regional sites',
    iconName: 'MapPin',
    defaultEnabled: true,
  },
  {
    id: 'hr_recruitment_platform',
    name: 'Recruitment Platform',
    description: 'End-to-end applicant tracking, hiring, and onboarding',
    iconName: 'UserPlus',
    defaultEnabled: true,
    children: [
      {
        id: 'hr_candidate_management',
        name: 'Candidate Management',
        defaultEnabled: true,
        children: [
          { id: 'hr_ats', name: 'ATS', defaultEnabled: true },
          { id: 'hr_job_openings', name: 'Job Openings', defaultEnabled: true },
          { id: 'hr_resume_management', name: 'Resume Management', defaultEnabled: true },
          { id: 'hr_interview_scheduling', name: 'Interview Scheduling', defaultEnabled: true },
          { id: 'hr_offer_letter', name: 'Offer Letter', defaultEnabled: true },
          { id: 'hr_bg_verification', name: 'Background Verification', defaultEnabled: true },
          { id: 'hr_onboarding_offboarding', name: 'Onboarding & Offboarding', defaultEnabled: true },
        ],
      },
    ],
  },
  {
    id: 'hr_attendance_management',
    name: 'Attendance Management',
    description: 'Daily logs, biometric sync, regularizations, and timing',
    iconName: 'CalendarCheck',
    defaultEnabled: true,
  },
  {
    id: 'hr_leave_management',
    name: 'Leave Management',
    description: 'Leave applications, approvals, and balances',
    iconName: 'Palmtree',
    defaultEnabled: true,
  },
  {
    id: 'hr_shift_management',
    name: 'Shift Management',
    description: 'Shift rosters, timing rules, and rotation schedules',
    iconName: 'Clock',
    defaultEnabled: true,
  },
  {
    id: 'hr_payroll',
    name: 'Payroll',
    description: 'Salary calculations, tax declarations, and settlements',
    iconName: 'Wallet',
    defaultEnabled: true,
    children: [
      { id: 'hr_salary_structure', name: 'Salary Structure', defaultEnabled: true },
      { id: 'hr_fnf_settlement', name: 'Full & Final Settlement', defaultEnabled: true },
    ],
  },
  {
    id: 'hr_performance_management',
    name: 'Performance Management',
    description: 'Goals, OKRs, review cycles, and appraisals',
    iconName: 'TrendingUp',
    defaultEnabled: true,
    children: [
      { id: 'hr_goal_kpi_okr', name: 'Goal / KPI / OKR Management', defaultEnabled: true },
      { id: 'hr_surveys', name: 'Surveys', defaultEnabled: true },
      { id: 'hr_emp_engagement', name: 'Employee Engagement', defaultEnabled: true },
    ],
  },
  {
    id: 'hr_training_management',
    name: 'Training Management',
    description: 'Training programs, workshops, and skill sessions',
    iconName: 'GraduationCap',
    defaultEnabled: true,
  },
  {
    id: 'hr_lms_admin',
    name: 'LMS Admin',
    description: 'Learning management system courses and enrollments',
    iconName: 'BookOpen',
    defaultEnabled: true,
  },
  {
    id: 'hr_asset_management',
    name: 'Asset Management',
    description: 'Equipment inventory, allocations, and maintenance',
    iconName: 'Package',
    defaultEnabled: true,
  },
  {
    id: 'hr_travel_management',
    name: 'Travel Management',
    description: 'Travel requests, bookings, and itinerary approvals',
    iconName: 'Plane',
    defaultEnabled: true,
  },
  {
    id: 'hr_expense_management',
    name: 'Expense Management',
    description: 'Reimbursement claims, receipts, and finance sync',
    iconName: 'Receipt',
    defaultEnabled: true,
  },
  {
    id: 'hr_helpdesk_management',
    name: 'Helpdesk Management',
    description: 'Employee query tickets and resolution workflows',
    iconName: 'Headphones',
    defaultEnabled: true,
  },
  {
    id: 'hr_policy_management',
    name: 'Policy Management',
    description: 'Company handbooks, compliance policies, and terms',
    iconName: 'ShieldCheck',
    defaultEnabled: true,
  },
  {
    id: 'hr_reports_analytics',
    name: 'Reports & Analytics',
    description: 'Comprehensive HR insights, audit logs, and analytics',
    iconName: 'BarChart3',
    defaultEnabled: true,
    children: [
      { id: 'hr_reports', name: 'HR Reports', defaultEnabled: true },
      { id: 'hr_emp_audit_logs', name: 'Employee Audit Logs', defaultEnabled: true },
      { id: 'hr_analytics', name: 'HR Analytics', defaultEnabled: true },
    ],
  },
  {
    id: 'hr_workflow_management',
    name: 'Workflow Management',
    description: 'Custom approval workflows and trigger rules',
    iconName: 'GitMerge',
    defaultEnabled: true,
  },
  {
    id: 'hr_letter_management',
    name: 'Letter Management',
    description: 'Generate offer, appointment, and experience letters',
    iconName: 'FileText',
    defaultEnabled: true,
  },
  {
    id: 'hr_email_templates',
    name: 'Email Templates',
    description: 'System email layouts and custom notifications',
    iconName: 'Mail',
    defaultEnabled: true,
  },
  {
    id: 'hr_documentation',
    name: 'Documentation',
    description: 'Central document repository and document templates',
    iconName: 'Folder',
    defaultEnabled: true,
    children: [
      { id: 'hr_doc_letter_mgt', name: 'Letter Management', defaultEnabled: true },
      { id: 'hr_doc_email_templates', name: 'Email Templates', defaultEnabled: true },
      { id: 'hr_doc_templates', name: 'Document Templates', defaultEnabled: true },
    ],
  },
  {
    id: 'hr_roles_permissions',
    name: 'Roles & Permissions',
    description: 'Access control levels, role assignments, and security',
    iconName: 'Lock',
    defaultEnabled: true,
  },
];

export function HRModulesView(): JSX.Element {
  return (
    <div className="p-4 bg-card rounded-lg border border-border">
      <h3 className="text-sm font-bold mb-2">HR Modules Blueprint</h3>
      <p className="text-xs text-muted-foreground">
        Defines the complete module taxonomy for HR role users.
      </p>
    </div>
  );
}
