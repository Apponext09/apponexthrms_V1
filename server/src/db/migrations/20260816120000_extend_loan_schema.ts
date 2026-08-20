import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasLoans = await knex.schema.hasTable('employee_loans');
  if (hasLoans) {
    const [hasLoanTypeId, hasApprovedBy, hasApprovedAt, hasRejectedBy, hasRejectedAt, hasRejectionReason] = await Promise.all([
      knex.schema.hasColumn('employee_loans', 'loan_type_id'),
      knex.schema.hasColumn('employee_loans', 'approved_by'),
      knex.schema.hasColumn('employee_loans', 'approved_at'),
      knex.schema.hasColumn('employee_loans', 'rejected_by'),
      knex.schema.hasColumn('employee_loans', 'rejected_at'),
      knex.schema.hasColumn('employee_loans', 'rejection_reason'),
    ]);

    const hasReason = await knex.schema.hasColumn('employee_loans', 'reason');

    if (!hasLoanTypeId || !hasApprovedBy || !hasApprovedAt || !hasRejectedBy || !hasRejectedAt || !hasRejectionReason || !hasReason) {
      await knex.schema.alterTable('employee_loans', (table) => {
        if (!hasLoanTypeId) table.string('loan_type_id', 100).nullable().after('employee_id');
        if (!hasReason) table.text('reason').nullable().after('interest_rate');
        if (!hasApprovedBy) table.bigInteger('approved_by').unsigned().nullable();
        if (!hasApprovedAt) table.timestamp('approved_at').nullable();
        if (!hasRejectedBy) table.bigInteger('rejected_by').unsigned().nullable();
        if (!hasRejectedAt) table.timestamp('rejected_at').nullable();
        if (!hasRejectionReason) table.text('rejection_reason').nullable();
      });
    }

    // loan_type was a rigid 4-value ENUM that doesn't cover admin-defined types
    // (e.g. the seeded "Advance" type) — widen it to a free-form string.
    await knex.raw('ALTER TABLE employee_loans MODIFY COLUMN loan_type VARCHAR(50) NOT NULL');
  }

  const hasLoanTypes = await knex.schema.hasTable('payroll_loan_types');
  if (hasLoanTypes) {
    const [hasApproverRole, hasReqForm, hasApprForm, hasDisbForm, hasRejForm, hasStopForm] = await Promise.all([
      knex.schema.hasColumn('payroll_loan_types', 'approver_role'),
      knex.schema.hasColumn('payroll_loan_types', 'request_form_template'),
      knex.schema.hasColumn('payroll_loan_types', 'approved_form_template'),
      knex.schema.hasColumn('payroll_loan_types', 'disbursement_form_template'),
      knex.schema.hasColumn('payroll_loan_types', 'rejection_form_template'),
      knex.schema.hasColumn('payroll_loan_types', 'stop_form_template'),
    ]);

    if (!hasApproverRole || !hasReqForm || !hasApprForm || !hasDisbForm || !hasRejForm || !hasStopForm) {
      await knex.schema.alterTable('payroll_loan_types', (table) => {
        if (!hasApproverRole) table.string('approver_role', 50).defaultTo('hr_manager');
        if (!hasReqForm) table.string('request_form_template', 255).nullable();
        if (!hasApprForm) table.string('approved_form_template', 255).nullable();
        if (!hasDisbForm) table.string('disbursement_form_template', 255).nullable();
        if (!hasRejForm) table.string('rejection_form_template', 255).nullable();
        if (!hasStopForm) table.string('stop_form_template', 255).nullable();
      });
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasLoans = await knex.schema.hasTable('employee_loans');
  if (hasLoans) {
    await knex.schema.alterTable('employee_loans', (table) => {
      table.dropColumns('loan_type_id', 'approved_by', 'approved_at', 'rejected_by', 'rejected_at', 'rejection_reason');
    });
  }
  const hasLoanTypes = await knex.schema.hasTable('payroll_loan_types');
  if (hasLoanTypes) {
    await knex.schema.alterTable('payroll_loan_types', (table) => {
      table.dropColumns(
        'approver_role', 'request_form_template', 'approved_form_template',
        'disbursement_form_template', 'rejection_form_template', 'stop_form_template'
      );
    });
  }
}
