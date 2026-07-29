const fs = require('fs');
const path = require('path');

const srcPath = path.join(__dirname, 'client', 'src', 'features', 'employee', 'components', 'EmployeeCreateModal.tsx');
let code = fs.readFileSync(srcPath, 'utf8');

code = code.replace(/EmployeeCreateModal/g, 'EmployeeEditModal');
code = code.replace(/useCreateEmployee/g, 'useUpdateEmployee');
code = code.replace(/createEmployeeCode\(\)/g, "''");
code = code.replace(/createEmployee/g, 'updateEmployee');

// Replace props
code = code.replace(
  /interface EmployeeEditModalProps \{[\s\S]*?\}/,
  \interface EmployeeEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  employee?: any;
}\
);

// Add employee to destructured props
code = code.replace(
  /onSuccess,\n\}: EmployeeEditModalProps\) \{/,
  \onSuccess,
  employee,
}: EmployeeEditModalProps) {\
);

// Add useEffect
const effectStr = \
  React.useEffect(() => {
    if (employee && open) {
      setFormData({
        employeeCode: employee.employeeCode || employee.employee_code || '',
        firstName: employee.firstName || employee.first_name || '',
        lastName: employee.lastName || employee.last_name || '',
        email: employee.email || '',
        mobile: employee.mobile || '',
        dateOfJoining: employee.dateOfJoining ? new Date(employee.dateOfJoining).toISOString().split('T')[0] : '',
        employmentType: employee.employmentType || employee.employment_type || 'full_time',
        reportingManagerId: employee.reportingManagerId ? String(employee.reportingManagerId) : '',
        avatarUrl: employee.avatarUrl || '',
        departmentId: employee.currentDepartmentId ? String(employee.currentDepartmentId) : '',
        jobTitle: employee.designation?.name || '',
        accessRole: employee.user?.role?.code || 'employee',
        password: '',
        confirmPassword: '',
      });
    }
  }, [employee, open]);
\;
code = code.replace(/const \[createdCredentials, setCreatedCredentials\] = useState[\s\S]*?;/, effectStr);
code = code.replace(/const \[copied, setCopied\] = useState[\s\S]*?;/, '');

// Fix updateEmployee id parameter
code = code.replace(/const \{ updateEmployee, isLoading, error \} = useUpdateEmployee\(\);/, 
  \const { updateEmployee, isLoading, error } = useUpdateEmployee(employee?.id || 0);\);

// Replace submit logic
const payloadLogic = \
    const payload: any = {
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      mobile: formData.mobile || null,
      dateOfJoining: formData.dateOfJoining,
      employmentType: formData.employmentType,
      departmentId: formData.departmentId ? Number(formData.departmentId) : null,
      jobTitle: formData.jobTitle || undefined,
      reportingManagerId: formData.reportingManagerId ? Number(formData.reportingManagerId) : null,
      accessRole: formData.accessRole,
    };
    try {
      setIsSubmitting(true);
      await updateEmployee(payload);
      toast.success('Employee updated successfully');
      onSuccess();
      onOpenChange(false);
    } catch(err: any) {
      console.error(err);
      setValidationError(err.response?.data?.message || 'Failed to update');
    } finally {
      setIsSubmitting(false);
    }
\;

code = code.replace(/try \{[\s\S]*?setIsSubmitting\(false\);\s*\}/, payloadLogic);

// Remove handleCopyCredentials
code = code.replace(/const handleCopyCredentials = \(\) => \{[\s\S]*?^\s*\};/m, '');

// Clean up Header UI
code = code.replace(/Add New Employee/g, 'Edit Employee');
code = code.replace(/Enter details below to create an employee and position them in the organization structure\./g, 'Update employee details below.');
code = code.replace(/<UserPlus/g, '<Edit2');
code = code.replace(/import \{.*?UserPlus/g, 'import { AlertCircle, Edit2');

// Make employee code readonly
code = code.replace(/id="employeeCode"\s*required\s*value=\{formData.employeeCode\}\s*onChange=\{[\s\S]*?\}/,
  \id="employeeCode" readOnly disabled value={formData.employeeCode}\);

// Remove credentials block from JSX
code = code.replace(/\{createdCredentials \? \([\s\S]*?\) : \(/, '(');

// Now find the end of the file and remove the closing \) }
// The last bit should be       </DialogContent>\n    </Dialog>\n  );\n}
// Because we removed the ternary condition createdCredentials ? ... : ( ... ), we have an extra ) at the very end
code = code.replace(/<\/Dialog>\s*\)\s*;\s*\}/, '</Dialog>\\n  );\\n}');
// And we also need to remove the matching ) just before </DialogContent>
code = code.replace(/<\/form>\s*<\/>\s*\)/, '</form>');

const destPath = path.join(__dirname, 'client', 'src', 'features', 'employee', 'components', 'EmployeeEditModal.tsx');
fs.writeFileSync(destPath, code);
console.log('EmployeeEditModal created successfully');
