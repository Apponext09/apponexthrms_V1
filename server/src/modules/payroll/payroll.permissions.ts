export const PAYROLL_PERMISSIONS = [
  {
    code: 'payroll:view',
    name: 'View Payroll',
    description: 'View payroll runs and processing status'
  },
  {
    code: 'payroll:generate',
    name: 'Generate Payroll',
    description: 'Create new payroll runs for processing'
  },
  {
    code: 'payroll:process',
    name: 'Process Payroll',
    description: 'Calculate earnings and deductions for payroll'
  },
  {
    code: 'payroll:lock',
    name: 'Lock Payroll',
    description: 'Lock payroll for approval'
  },
  {
    code: 'payroll:unlock',
    name: 'Unlock Payroll',
    description: 'Unlock payroll to make changes'
  },
  {
    code: 'payroll:approve',
    name: 'Approve Payroll',
    description: 'Approve locked payroll for publishing'
  },
  {
    code: 'payroll:publish',
    name: 'Publish Payroll',
    description: 'Publish payroll and generate payslips'
  },
  {
    code: 'structure:view',
    name: 'View Salary Structures',
    description: 'View salary structure templates'
  },
  {
    code: 'structure:create',
    name: 'Create Salary Structure',
    description: 'Create new salary structure templates'
  },
  {
    code: 'structure:edit',
    name: 'Edit Salary Structure',
    description: 'Edit salary structure templates and components'
  },
  {
    code: 'structure:assign',
    name: 'Assign Salary Structure',
    description: 'Assign salary structures to employees'
  },
  {
    code: 'revision:view',
    name: 'View Salary Revisions',
    description: 'View salary revision requests'
  },
  {
    code: 'revision:request',
    name: 'Request Salary Revision',
    description: 'Create new salary revision requests'
  },
  {
    code: 'revision:submit',
    name: 'Submit Salary Revision',
    description: 'Submit salary revisions for approval'
  },
  {
    code: 'revision:approve',
    name: 'Approve Salary Revision',
    description: 'Approve or reject salary revision requests'
  },
  {
    code: 'payslip:view',
    name: 'View Payslips',
    description: 'View generated payslips'
  },
  {
    code: 'payslip:send',
    name: 'Send Payslips',
    description: 'Send payslips to employees'
  },
  {
    code: 'payslip:lock',
    name: 'Lock Payslips',
    description: 'Lock payslips from further changes'
  },
  {
    code: 'loan:view',
    name: 'View Loans',
    description: 'View employee loans and EMI schedules'
  },
  {
    code: 'loan:create',
    name: 'Create Loan',
    description: 'Create new employee loans'
  },
  {
    code: 'tax:view',
    name: 'View Tax Declarations',
    description: 'View tax declarations and calculations'
  },
  {
    code: 'tax:declare',
    name: 'Manage Tax Declaration',
    description: 'Create and manage tax declarations'
  },
  {
    code: 'settlement:view',
    name: 'View Settlements',
    description: 'View full & final settlements'
  },
  {
    code: 'settlement:create',
    name: 'Create Settlement',
    description: 'Create new settlement records'
  },
  {
    code: 'settlement:calculate',
    name: 'Calculate Settlement',
    description: 'Calculate settlement amounts'
  },
  {
    code: 'settlement:submit',
    name: 'Submit Settlement',
    description: 'Submit settlement for approval'
  },
  {
    code: 'settlement:approve',
    name: 'Approve Settlement',
    description: 'Approve settlement requests'
  },
  {
    code: 'settlement:process',
    name: 'Process Settlement',
    description: 'Process approved settlements'
  },
  {
    code: 'advance:view',
    name: 'View Salary Advances',
    description: 'View salary advance requests'
  },
  {
    code: 'advance:create',
    name: 'Request Salary Advance',
    description: 'Create salary advance requests'
  },
  {
    code: 'advance:approve',
    name: 'Approve Salary Advance',
    description: 'Approve or reject salary advance requests'
  }
];

export const PAYROLL_ROLES = {
  finance_manager: [
    'payroll:view',
    'payroll:generate',
    'payroll:process',
    'payroll:lock',
    'payroll:unlock',
    'payroll:approve',
    'payroll:publish',
    'structure:view',
    'structure:create',
    'structure:edit',
    'structure:assign',
    'revision:view',
    'revision:approve',
    'payslip:view',
    'payslip:send',
    'payslip:lock',
    'loan:view',
    'loan:create',
    'tax:view',
    'settlement:view',
    'settlement:approve',
    'settlement:process',
    'advance:view',
    'advance:approve'
  ],
  hr_manager: [
    'payroll:view',
    'structure:view',
    'revision:view',
    'revision:request',
    'revision:submit',
    'payslip:view',
    'loan:view',
    'loan:create',
    'tax:view',
    'settlement:view',
    'settlement:create',
    'settlement:calculate',
    'settlement:submit',
    'advance:view',
    'advance:create'
  ],
  employee: [
    'payslip:view',
    'loan:view',
    'tax:view',
    'tax:declare',
    'advance:view',
    'advance:create'
  ]
};
