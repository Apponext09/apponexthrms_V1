/**
 * Comprehensive Report Field Registry
 * Categorized by Table / Functionality with SQL mapping & sensitive data flags.
 */

export type FieldGroup =
  | 'emp_master'
  | 'emp_dept'
  | 'emp_desig'
  | 'emp_company'
  | 'emp_location'
  | 'attendance_rec'
  | 'attendance_reg'
  | 'attendance_break'
  | 'leave_app'
  | 'leave_bal'
  | 'leave_encash'
  | 'payroll_slip'
  | 'payroll_loan'
  | 'asset_inv'
  | 'comp_off';

export type ModuleType = 'all' | 'attendance' | 'payroll' | 'leave' | 'employee' | 'recruitment';

export interface FieldDef {
  key: string;
  label: string;
  module: ModuleType;
  group: FieldGroup;
  /** Raw SQL expression or column reference */
  sqlExpr: string;
  /** Knex join keys required to resolve this field */
  requiredJoins: string[];
  /** Output type for formatting */
  type: 'string' | 'number' | 'time' | 'date' | 'boolean' | 'minutes' | 'currency';
  /** Flag for masking/unmasking sensitive PII or financial fields */
  isSensitive?: boolean;
}

// ─── 1. Employees Table ───────────────────────────────────────────────────

const EMPLOYEE_TABLE_FIELDS: FieldDef[] = [
  {
    key: 'emp_employeeCode',
    label: 'Employee Code',
    module: 'employee',
    group: 'emp_master',
    sqlExpr: 'e.employee_code',
    requiredJoins: ['employees'],
    type: 'string',
  },
  {
    key: 'emp_firstName',
    label: 'First Name',
    module: 'employee',
    group: 'emp_master',
    sqlExpr: 'e.first_name',
    requiredJoins: ['employees'],
    type: 'string',
  },
  {
    key: 'emp_lastName',
    label: 'Last Name',
    module: 'employee',
    group: 'emp_master',
    sqlExpr: 'e.last_name',
    requiredJoins: ['employees'],
    type: 'string',
  },
  {
    key: 'emp_fullName',
    label: 'Full Name',
    module: 'employee',
    group: 'emp_master',
    sqlExpr: "CONCAT(COALESCE(e.first_name, ''), ' ', COALESCE(e.last_name, ''))",
    requiredJoins: ['employees'],
    type: 'string',
  },
  {
    key: 'emp_email',
    label: 'Email Address',
    module: 'employee',
    group: 'emp_master',
    sqlExpr: 'e.email',
    requiredJoins: ['employees'],
    type: 'string',
    isSensitive: true,
  },
  {
    key: 'emp_phone',
    label: 'Phone Number',
    module: 'employee',
    group: 'emp_master',
    sqlExpr: 'e.phone',
    requiredJoins: ['employees'],
    type: 'string',
    isSensitive: true,
  },
  {
    key: 'emp_gender',
    label: 'Gender',
    module: 'employee',
    group: 'emp_master',
    sqlExpr: 'e.gender',
    requiredJoins: ['employees'],
    type: 'string',
  },
  {
    key: 'emp_dob',
    label: 'Date of Birth',
    module: 'employee',
    group: 'emp_master',
    sqlExpr: 'e.date_of_birth',
    requiredJoins: ['employees'],
    type: 'date',
    isSensitive: true,
  },
  {
    key: 'emp_doj',
    label: 'Date of Joining',
    module: 'employee',
    group: 'emp_master',
    sqlExpr: 'e.date_of_joining',
    requiredJoins: ['employees'],
    type: 'date',
  },
  {
    key: 'emp_employmentType',
    label: 'Employment Type',
    module: 'employee',
    group: 'emp_master',
    sqlExpr: 'e.employment_type',
    requiredJoins: ['employees'],
    type: 'string',
  },
  {
    key: 'emp_status',
    label: 'Employee Status',
    module: 'employee',
    group: 'emp_master',
    sqlExpr: 'e.status',
    requiredJoins: ['employees'],
    type: 'string',
  },
  {
    key: 'emp_pan',
    label: 'PAN / Tax ID',
    module: 'employee',
    group: 'emp_master',
    sqlExpr: 'e.pan_number',
    requiredJoins: ['employees'],
    type: 'string',
    isSensitive: true,
  },
  {
    key: 'emp_bankAccount',
    label: 'Bank Account Number',
    module: 'employee',
    group: 'emp_master',
    sqlExpr: 'e.account_no',
    requiredJoins: ['employees'],
    type: 'string',
    isSensitive: true,
  },
  {
    key: 'emp_bankName',
    label: 'Bank Name',
    module: 'employee',
    group: 'emp_master',
    sqlExpr: 'e.bank_name',
    requiredJoins: ['employees'],
    type: 'string',
  },
  {
    key: 'emp_ifsc',
    label: 'IFSC / Bank Code',
    module: 'employee',
    group: 'emp_master',
    sqlExpr: 'e.ifsc_code',
    requiredJoins: ['employees'],
    type: 'string',
    isSensitive: true,
  },
];

// ─── 2. Departments & Designations Tables ────────────────────────────────

const DEPT_DESIG_FIELDS: FieldDef[] = [
  {
    key: 'emp_department',
    label: 'Department Name',
    module: 'employee',
    group: 'emp_dept',
    sqlExpr: 'd.name',
    requiredJoins: ['departments'],
    type: 'string',
  },
  {
    key: 'dept_code',
    label: 'Department Code',
    module: 'employee',
    group: 'emp_dept',
    sqlExpr: 'd.code',
    requiredJoins: ['departments'],
    type: 'string',
  },
  {
    key: 'emp_designation',
    label: 'Designation Name',
    module: 'employee',
    group: 'emp_desig',
    sqlExpr: 'des.name',
    requiredJoins: ['designations'],
    type: 'string',
  },
  {
    key: 'desig_code',
    label: 'Designation Code',
    module: 'employee',
    group: 'emp_desig',
    sqlExpr: 'des.code',
    requiredJoins: ['designations'],
    type: 'string',
  },
];

// ─── 3. Company & Location Tables ─────────────────────────────────────────

const COMPANY_LOCATION_FIELDS: FieldDef[] = [
  {
    key: 'company_name',
    label: 'Company Name',
    module: 'employee',
    group: 'emp_company',
    sqlExpr: 'mc.name',
    requiredJoins: ['company'],
    type: 'string',
  },
  {
    key: 'company_code',
    label: 'Company Code',
    module: 'employee',
    group: 'emp_company',
    sqlExpr: 'mc.code',
    requiredJoins: ['company'],
    type: 'string',
  },
  {
    key: 'location_name',
    label: 'Location / Branch Name',
    module: 'employee',
    group: 'emp_location',
    sqlExpr: 'loc.name',
    requiredJoins: ['locations'],
    type: 'string',
  },
  {
    key: 'location_city',
    label: 'Location City',
    module: 'employee',
    group: 'emp_location',
    sqlExpr: 'loc.city',
    requiredJoins: ['locations'],
    type: 'string',
  },
  {
    key: 'location_state',
    label: 'Location State',
    module: 'employee',
    group: 'emp_location',
    sqlExpr: 'loc.state',
    requiredJoins: ['locations'],
    type: 'string',
  },
];

// ─── 4. Attendance Functionality Tables ──────────────────────────────────

const ATTENDANCE_TABLE_FIELDS: FieldDef[] = [
  // attendance_records table
  {
    key: 'att_date',
    label: 'Attendance Date',
    module: 'attendance',
    group: 'attendance_rec',
    sqlExpr: 'ar.check_in_date',
    requiredJoins: ['attendance_records'],
    type: 'date',
  },
  {
    key: 'att_day',
    label: 'Day Name',
    module: 'attendance',
    group: 'attendance_rec',
    sqlExpr: 'DAYNAME(ar.check_in_date)',
    requiredJoins: ['attendance_records'],
    type: 'string',
  },
  {
    key: 'att_checkInTime',
    label: 'Check-In Time',
    module: 'attendance',
    group: 'attendance_rec',
    sqlExpr: 'ar.check_in_time',
    requiredJoins: ['attendance_records'],
    type: 'time',
  },
  {
    key: 'att_checkOutTime',
    label: 'Check-Out Time',
    module: 'attendance',
    group: 'attendance_rec',
    sqlExpr: 'ar.check_out_time',
    requiredJoins: ['attendance_records'],
    type: 'time',
  },
  {
    key: 'att_checkInMethod',
    label: 'Check-In Method',
    module: 'attendance',
    group: 'attendance_rec',
    sqlExpr: 'ar.check_in_method',
    requiredJoins: ['attendance_records'],
    type: 'string',
  },
  {
    key: 'att_checkOutMethod',
    label: 'Check-Out Method',
    module: 'attendance',
    group: 'attendance_rec',
    sqlExpr: 'ar.check_out_method',
    requiredJoins: ['attendance_records'],
    type: 'string',
  },
  {
    key: 'att_durationMinutes',
    label: 'Duration (mins)',
    module: 'attendance',
    group: 'attendance_rec',
    sqlExpr: 'ar.duration_minutes',
    requiredJoins: ['attendance_records'],
    type: 'minutes',
  },
  {
    key: 'att_workDurationMinutes',
    label: 'Work Duration (mins)',
    module: 'attendance',
    group: 'attendance_rec',
    sqlExpr: 'ar.work_duration_minutes',
    requiredJoins: ['attendance_records'],
    type: 'minutes',
  },
  {
    key: 'att_breakTimeMinutes',
    label: 'Break Time (mins)',
    module: 'attendance',
    group: 'attendance_rec',
    sqlExpr: 'ar.break_time_minutes',
    requiredJoins: ['attendance_records'],
    type: 'minutes',
  },
  {
    key: 'att_overtimeMinutes',
    label: 'Overtime (mins)',
    module: 'attendance',
    group: 'attendance_rec',
    sqlExpr: 'ar.overtime_minutes',
    requiredJoins: ['attendance_records'],
    type: 'minutes',
  },
  {
    key: 'att_status',
    label: 'Attendance Status',
    module: 'attendance',
    group: 'attendance_rec',
    sqlExpr: 'ar.status',
    requiredJoins: ['attendance_records'],
    type: 'string',
  },
  {
    key: 'att_isLate',
    label: 'Is Late Entry',
    module: 'attendance',
    group: 'attendance_rec',
    sqlExpr: 'ar.is_late',
    requiredJoins: ['attendance_records'],
    type: 'boolean',
  },
  {
    key: 'att_isEarlyDeparture',
    label: 'Is Early Departure',
    module: 'attendance',
    group: 'attendance_rec',
    sqlExpr: 'ar.is_early_departure',
    requiredJoins: ['attendance_records'],
    type: 'boolean',
  },
  {
    key: 'att_isRegularized',
    label: 'Is Regularized',
    module: 'attendance',
    group: 'attendance_rec',
    sqlExpr: 'ar.is_regularized',
    requiredJoins: ['attendance_records'],
    type: 'boolean',
  },

  // attendance_regularizations table
  {
    key: 'reg_requestDate',
    label: 'Regularization Request Date',
    module: 'attendance',
    group: 'attendance_reg',
    sqlExpr: 'areg.request_date',
    requiredJoins: ['attendance_regularizations'],
    type: 'date',
  },
  {
    key: 'reg_type',
    label: 'Regularization Type',
    module: 'attendance',
    group: 'attendance_reg',
    sqlExpr: 'areg.regularization_type',
    requiredJoins: ['attendance_regularizations'],
    type: 'string',
  },
  {
    key: 'reg_status',
    label: 'Regularization Status',
    module: 'attendance',
    group: 'attendance_reg',
    sqlExpr: 'areg.status',
    requiredJoins: ['attendance_regularizations'],
    type: 'string',
  },
  {
    key: 'reg_reason',
    label: 'Regularization Reason',
    module: 'attendance',
    group: 'attendance_reg',
    sqlExpr: 'areg.reason_description',
    requiredJoins: ['attendance_regularizations'],
    type: 'string',
  },

  // attendance_breaks table
  {
    key: 'break_start',
    label: 'Break Start Time',
    module: 'attendance',
    group: 'attendance_break',
    sqlExpr: 'ab.break_start_time',
    requiredJoins: ['attendance_records', 'attendance_breaks'],
    type: 'time',
  },
  {
    key: 'break_end',
    label: 'Break End Time',
    module: 'attendance',
    group: 'attendance_break',
    sqlExpr: 'ab.break_end_time',
    requiredJoins: ['attendance_records', 'attendance_breaks'],
    type: 'time',
  },
  {
    key: 'break_duration',
    label: 'Break Duration (mins)',
    module: 'attendance',
    group: 'attendance_break',
    sqlExpr: 'ab.break_duration_minutes',
    requiredJoins: ['attendance_records', 'attendance_breaks'],
    type: 'minutes',
  },
  {
    key: 'break_type',
    label: 'Break Type',
    module: 'attendance',
    group: 'attendance_break',
    sqlExpr: 'ab.break_type',
    requiredJoins: ['attendance_records', 'attendance_breaks'],
    type: 'string',
  },
];

// ─── 5. Leave Functionality Tables ───────────────────────────────────────

const LEAVE_TABLE_FIELDS: FieldDef[] = [
  // leave_applications table
  {
    key: 'leave_type',
    label: 'Leave Type Name',
    module: 'leave',
    group: 'leave_app',
    sqlExpr: 'lt.leave_name',
    requiredJoins: ['leave_applications', 'leave_types'],
    type: 'string',
  },
  {
    key: 'leave_fromDate',
    label: 'Leave From Date',
    module: 'leave',
    group: 'leave_app',
    sqlExpr: 'la.application_start_date',
    requiredJoins: ['leave_applications'],
    type: 'date',
  },
  {
    key: 'leave_toDate',
    label: 'Leave To Date',
    module: 'leave',
    group: 'leave_app',
    sqlExpr: 'la.application_end_date',
    requiredJoins: ['leave_applications'],
    type: 'date',
  },
  {
    key: 'leave_days',
    label: 'Leave Days Applied',
    module: 'leave',
    group: 'leave_app',
    sqlExpr: 'la.total_days',
    requiredJoins: ['leave_applications'],
    type: 'number',
  },
  {
    key: 'leave_status',
    label: 'Leave Application Status',
    module: 'leave',
    group: 'leave_app',
    sqlExpr: 'la.status',
    requiredJoins: ['leave_applications'],
    type: 'string',
  },
  {
    key: 'leave_appliedOn',
    label: 'Leave Applied Date',
    module: 'leave',
    group: 'leave_app',
    sqlExpr: 'la.created_at',
    requiredJoins: ['leave_applications'],
    type: 'date',
  },
  {
    key: 'leave_reason',
    label: 'Leave Reason',
    module: 'leave',
    group: 'leave_app',
    sqlExpr: 'la.reason_description',
    requiredJoins: ['leave_applications'],
    type: 'string',
  },

  // leave_balances table
  {
    key: 'bal_opening',
    label: 'Opening Leave Balance',
    module: 'leave',
    group: 'leave_bal',
    sqlExpr: 'lb.opening_balance',
    requiredJoins: ['leave_balances'],
    type: 'number',
  },
  {
    key: 'bal_consumed',
    label: 'Consumed Leave Days',
    module: 'leave',
    group: 'leave_bal',
    sqlExpr: 'lb.consumed_balance',
    requiredJoins: ['leave_balances'],
    type: 'number',
  },
  {
    key: 'bal_available',
    label: 'Available Leave Balance',
    module: 'leave',
    group: 'leave_bal',
    sqlExpr: 'lb.available_balance',
    requiredJoins: ['leave_balances'],
    type: 'number',
  },
  {
    key: 'bal_credited',
    label: 'Credited Leave Days',
    module: 'leave',
    group: 'leave_bal',
    sqlExpr: 'lb.credited_balance',
    requiredJoins: ['leave_balances'],
    type: 'number',
  },

  // leave_encashments table
  {
    key: 'enc_days',
    label: 'Encashment Days',
    module: 'leave',
    group: 'leave_encash',
    sqlExpr: 'le.encashment_days',
    requiredJoins: ['leave_encashments'],
    type: 'number',
  },
  {
    key: 'enc_amount',
    label: 'Total Encashment Amount',
    module: 'leave',
    group: 'leave_encash',
    sqlExpr: 'le.total_amount',
    requiredJoins: ['leave_encashments'],
    type: 'currency',
    isSensitive: true,
  },
  {
    key: 'enc_status',
    label: 'Encashment Status',
    module: 'leave',
    group: 'leave_encash',
    sqlExpr: 'le.status',
    requiredJoins: ['leave_encashments'],
    type: 'string',
  },
];

// ─── 6. Payroll & Loans Functionality Tables ──────────────────────────────

const PAYROLL_TABLE_FIELDS: FieldDef[] = [
  // payslips table
  {
    key: 'pay_month',
    label: 'Payslip Month',
    module: 'payroll',
    group: 'payroll_slip',
    sqlExpr: 'pp.payslip_month',
    requiredJoins: ['payslips'],
    type: 'string',
  },
  {
    key: 'pay_grossSalary',
    label: 'Gross Salary',
    module: 'payroll',
    group: 'payroll_slip',
    sqlExpr: 'pp.gross_salary',
    requiredJoins: ['payslips'],
    type: 'currency',
    isSensitive: true,
  },
  {
    key: 'pay_netSalary',
    label: 'Net Salary',
    module: 'payroll',
    group: 'payroll_slip',
    sqlExpr: 'pp.net_salary',
    requiredJoins: ['payslips'],
    type: 'currency',
    isSensitive: true,
  },
  {
    key: 'pay_totalDeductions',
    label: 'Total Deductions',
    module: 'payroll',
    group: 'payroll_slip',
    sqlExpr: 'pp.total_deductions',
    requiredJoins: ['payslips'],
    type: 'currency',
    isSensitive: true,
  },
  {
    key: 'pay_status',
    label: 'Payslip Lock Status',
    module: 'payroll',
    group: 'payroll_slip',
    sqlExpr: "IF(pp.is_locked = 1, 'Locked', 'Draft')",
    requiredJoins: ['payslips'],
    type: 'string',
  },

  // employee_loans table
  {
    key: 'loan_type',
    label: 'Loan Type',
    module: 'payroll',
    group: 'payroll_loan',
    sqlExpr: 'el.loan_type',
    requiredJoins: ['employee_loans'],
    type: 'string',
  },
  {
    key: 'loan_amount',
    label: 'Loan Amount',
    module: 'payroll',
    group: 'payroll_loan',
    sqlExpr: 'el.loan_amount',
    requiredJoins: ['employee_loans'],
    type: 'currency',
    isSensitive: true,
  },
  {
    key: 'loan_date',
    label: 'Loan Disbursed Date',
    module: 'payroll',
    group: 'payroll_loan',
    sqlExpr: 'el.loan_date',
    requiredJoins: ['employee_loans'],
    type: 'date',
  },
  {
    key: 'loan_tenure',
    label: 'Tenure (Months)',
    module: 'payroll',
    group: 'payroll_loan',
    sqlExpr: 'el.tenure_months',
    requiredJoins: ['employee_loans'],
    type: 'number',
  },
  {
    key: 'loan_emi',
    label: 'Monthly EMI Amount',
    module: 'payroll',
    group: 'payroll_loan',
    sqlExpr: 'el.emi',
    requiredJoins: ['employee_loans'],
    type: 'currency',
    isSensitive: true,
  },
  {
    key: 'loan_repaid',
    label: 'Loan Repaid Amount',
    module: 'payroll',
    group: 'payroll_loan',
    sqlExpr: 'el.repaid_amount',
    requiredJoins: ['employee_loans'],
    type: 'currency',
    isSensitive: true,
  },
  {
    key: 'loan_outstanding',
    label: 'Outstanding Loan Balance',
    module: 'payroll',
    group: 'payroll_loan',
    sqlExpr: 'el.outstanding_amount',
    requiredJoins: ['employee_loans'],
    type: 'currency',
    isSensitive: true,
  },
  {
    key: 'loan_status',
    label: 'Loan Status',
    module: 'payroll',
    group: 'payroll_loan',
    sqlExpr: 'el.status',
    requiredJoins: ['employee_loans'],
    type: 'string',
  },
];

// ─── 7. Assets & Comp Off Tables ──────────────────────────────────────────

const ASSET_COMPOFF_FIELDS: FieldDef[] = [
  // assets table
  {
    key: 'asset_code',
    label: 'Asset Code',
    module: 'employee',
    group: 'asset_inv',
    sqlExpr: 'ast.asset_code',
    requiredJoins: ['assets'],
    type: 'string',
  },
  {
    key: 'asset_brand',
    label: 'Asset Brand',
    module: 'employee',
    group: 'asset_inv',
    sqlExpr: 'ast.brand',
    requiredJoins: ['assets'],
    type: 'string',
  },
  {
    key: 'asset_model',
    label: 'Asset Model',
    module: 'employee',
    group: 'asset_inv',
    sqlExpr: 'ast.model',
    requiredJoins: ['assets'],
    type: 'string',
  },
  {
    key: 'asset_serial',
    label: 'Serial Number',
    module: 'employee',
    group: 'asset_inv',
    sqlExpr: 'ast.serial_number',
    requiredJoins: ['assets'],
    type: 'string',
    isSensitive: true,
  },
  {
    key: 'asset_status',
    label: 'Asset Status',
    module: 'employee',
    group: 'asset_inv',
    sqlExpr: 'ast.status',
    requiredJoins: ['assets'],
    type: 'string',
  },

  // comp_off_balances table
  {
    key: 'compoff_earnedDate',
    label: 'Comp Off Earned Date',
    module: 'attendance',
    group: 'comp_off',
    sqlExpr: 'cob.comp_off_earned_date',
    requiredJoins: ['comp_off_balances'],
    type: 'date',
  },
  {
    key: 'compoff_earnedHours',
    label: 'Comp Off Earned Hours',
    module: 'attendance',
    group: 'comp_off',
    sqlExpr: 'cob.comp_off_earned_hours',
    requiredJoins: ['comp_off_balances'],
    type: 'number',
  },
  {
    key: 'compoff_status',
    label: 'Comp Off Status',
    module: 'attendance',
    group: 'comp_off',
    sqlExpr: 'cob.status',
    requiredJoins: ['comp_off_balances'],
    type: 'string',
  },
];

// ─── Master Registry ───────────────────────────────────────────────────────

export const FIELD_REGISTRY: FieldDef[] = [
  ...EMPLOYEE_TABLE_FIELDS,
  ...DEPT_DESIG_FIELDS,
  ...COMPANY_LOCATION_FIELDS,
  ...ATTENDANCE_TABLE_FIELDS,
  ...LEAVE_TABLE_FIELDS,
  ...PAYROLL_TABLE_FIELDS,
  ...ASSET_COMPOFF_FIELDS,
];

export function getFieldsByModule(module: ModuleType): FieldDef[] {
  if (module === 'all') {
    return FIELD_REGISTRY;
  }
  // Include common employee identity fields (Code & Full Name) for quick selection in each module
  const commonIdentityKeys = ['emp_employeeCode', 'emp_fullName'];
  return FIELD_REGISTRY.filter(
    (f) => f.module === module || (commonIdentityKeys.includes(f.key) && f.group === 'emp_master')
  );
}

export function getFieldByKey(key: string): FieldDef | undefined {
  return FIELD_REGISTRY.find((f) => f.key === key);
}
