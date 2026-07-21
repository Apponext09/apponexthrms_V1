import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type {  Employee  } from '@/types';

interface EmployeeBasicInfoProps {
  employee: Employee;
}

export function EmployeeBasicInfo({ employee }: EmployeeBasicInfoProps) {
  const gridData = [
    { label: 'Employee Code', value: employee.employeeCode },
    { label: 'Email', value: employee.email },
    { label: 'Mobile', value: employee.email || '-' },
    { label: 'Phone', value: employee.email || '-' },
    { label: 'Date of Birth', value: employee.status ? new Date().toLocaleDateString() : '-' },
    { label: 'Gender', value: employee.status || '-' },
    { label: 'Nationality', value: employee.status || '-' },
    { label: 'Blood Group', value: employee.status || '-' },
    { label: 'Date of Joining', value: employee.dateOfJoining ? new Date(employee.dateOfJoining).toLocaleDateString() : '-' },
    { label: 'Employment Type', value: employee.status },
    { label: 'Status', value: employee.status },
    { label: 'PAN Number', value: employee.status || '-' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Basic Information</CardTitle>
        <CardDescription>Employee personal and employment details</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-6">
          {gridData.map((item) => (
            <div key={item.label}>
              <label className="text-sm font-semibold text-muted-foreground">
                {item.label}
              </label>
              <p className="mt-1 text-base">{item.value}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}


