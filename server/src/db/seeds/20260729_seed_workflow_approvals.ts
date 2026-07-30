import { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  // Deletes ALL existing entries
  await knex('workflow_approvals').del();

  // Get a few existing employees to use for seeding (if any exist)
  const employees = await knex('employees').select('id', 'organization_id', 'first_name', 'last_name').limit(5);

  if (!employees || employees.length === 0) {
    console.log('No employees found to seed workflow_approvals. Skipping seeder.');
    return;
  }

  const organization_id = employees[0].organizationId;

  // Insert seed entries
  await knex('workflow_approvals').insert([
    {
      organization_id,
      module_type: 'Leave',
      reference_id: 101,
      applicant_id: employees[0].id,
      approver_role: 'Manager',
      status: 'Pending Manager',
      details: JSON.stringify({ 
        name: `${employees[0].firstName} ${employees[0].lastName}`, 
        department: 'Engineering', 
        type: 'Leave', 
        time: '2 hours ago' 
      }),
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    },
    {
      organization_id,
      module_type: 'Leave',
      reference_id: 102,
      applicant_id: employees[1 % employees.length].id,
      approver_role: 'HR',
      status: 'Pending HR',
      details: JSON.stringify({ 
        name: `${employees[1 % employees.length].firstName} ${employees[1 % employees.length].lastName}`, 
        department: 'Marketing', 
        type: 'Leave', 
        time: '3 hours ago' 
      }),
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    },
    {
      organization_id,
      module_type: 'Asset',
      reference_id: 201,
      applicant_id: employees[2 % employees.length].id,
      approver_role: 'Admin',
      status: 'Pending Admin',
      details: JSON.stringify({ 
        name: `${employees[2 % employees.length].firstName} ${employees[2 % employees.length].lastName}`, 
        department: 'Sales', 
        type: 'Asset', 
        time: '5 hours ago' 
      }),
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    },
    {
      organization_id,
      module_type: 'Shift Swap',
      reference_id: 301,
      applicant_id: employees[3 % employees.length].id,
      approver_role: 'Team Lead',
      status: 'Pending Team Lead',
      details: JSON.stringify({ 
        name: `${employees[3 % employees.length].firstName} ${employees[3 % employees.length].lastName}`, 
        department: 'Support', 
        type: 'Shift Swap', 
        time: '1 day ago' 
      }),
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    },
    {
      organization_id,
      module_type: 'Loan',
      reference_id: 401,
      applicant_id: employees[4 % employees.length].id,
      approver_role: 'Finance',
      status: 'Pending Finance',
      details: JSON.stringify({ 
        name: `${employees[4 % employees.length].firstName} ${employees[4 % employees.length].lastName}`, 
        department: 'Human Resources', 
        type: 'Loan', 
        time: '1 day ago' 
      }),
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    }
  ]);
}
