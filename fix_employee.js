const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'server', 'src', 'modules', 'employee', 'services', 'EmployeeService.ts');
let code = fs.readFileSync(filePath, 'utf8');

// 1. Fix createEmployee
// Replace from // Create employee to // Create user login credentials
code = code.replace(
  /\/\/ Create employee\s+const employee = await this\.employeeRepo\.create\(ctx, \{([\s\S]*?)\} as any\);\s*\/\/ Create user login credentials/g,
  \// Create user login credentials\
);

// We also need to move the employee creation inside the try { await db.transaction(async (trx) => { ...
code = code.replace(
  /try \{\s*await db\.transaction\(async \(trx\) => \{\s*\/\/ 1\. Create user/g,
  \	ry {
      let employeeId;
      await db.transaction(async (trx) => {
        // Create employee inside transaction
        const [insertedId] = await trx('employees').insert({
          uuid: uuidv4(),
          employee_code: input.employeeCode,
          first_name: input.firstName,
          last_name: input.lastName,
          middle_name: input.middleName || null,
          email: input.email,
          phone: input.phone || null,
          mobile: input.mobile || null,
          date_of_birth: input.dateOfBirth || null,
          gender: input.gender || null,
          date_of_joining: input.dateOfJoining,
          employment_type: input.employmentType,
          current_designation_id: currentDesignationId,
          current_department_id: input.departmentId || null,
          current_branch_id: input.branchId || null,
          current_location_id: input.locationId || null,
          reporting_manager_id: finalReportingManagerId,
          cost_center_id: input.costCenterId || null,
          avatar_url: input.avatarUrl || null,
          status: 'active',
          organization_id: ctx.organizationId,
          created_by: ctx.userId,
          updated_by: ctx.userId,
          created_at: new Date(),
          updated_at: new Date(),
        });
        employeeId = insertedId;
        
        // 1. Create user\
);

// We need to fetch the employee outside the transaction, or inside it.
code = code.replace(
  /employee_id: employee\.id,/g,
  \employee_id: employeeId,\
);

// For the audit log we need the employee object, so let's fetch it at the end of createEmployee
code = code.replace(
  /entityId: employee\.id,\s*afterState:/g,
  \entityId: employeeId,
      afterState:\
);

code = code.replace(
  /return \{ employee, generatedPassword: plainPassword \};/g,
  \const employee = await this.employeeRepo.getById(ctx, employeeId);
      if (!employee) throw new Error('Employee not found after creation');
      return { employee, generatedPassword: plainPassword };\
);

// Remove the catch block hardDelete
code = code.replace(
  /await this\.employeeRepo\.hardDelete\(ctx, employee\.id\)\.catch\(delErr => \{\s*console\.error\('\[EmployeeService\] Failed to rollback orphaned employee:', delErr\);\s*\}\);/g,
  \// employee creation is now part of the transaction, no manual rollback needed\
);


// 2. Fix deleteEmployee
code = code.replace(
  /await trx\('employees'\)\s*\.where\('organization_id', ctx\.organizationId\)\s*\.where\('id', employeeId\)\s*\.update\(\{[\s\S]*?\}\);/g,
  \wait trx('employees')
          .where('organization_id', ctx.organizationId)
          .where('id', employeeId)
          .del();\
);
code = code.replace(
  /await trx\('users'\)\.where\('id', user\.id\)\.update\(\{[\s\S]*?\}\);/g,
  \wait trx('users').where('id', user.id).del();\
);

fs.writeFileSync(filePath, code);
