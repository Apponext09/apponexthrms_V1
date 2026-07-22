import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Employee } from '@/types';

interface EmployeeBasicInfoProps {
  employee: Employee;
}

function formatValue(value: unknown): string {
  if (value === undefined || value === null || value === '') return '-';
  return String(value);
}

function formatDate(value?: string | null): string {
  if (!value) return '-';
  const d = new Date(value);
  return isNaN(d.getTime()) ? '-' : d.toLocaleDateString();
}

function titleCase(value?: string | null): string {
  if (!value) return '-';
  return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function EmployeeBasicInfo({ employee }: EmployeeBasicInfoProps) {
  const gridData = [
    { label: 'Employee Code', value: formatValue(employee.employeeCode) },
    { label: 'Email', value: formatValue(employee.email) },
    { label: 'Mobile', value: formatValue(employee.mobile) },
    { label: 'Phone', value: formatValue(employee.phone) },
    { label: 'Date of Birth', value: formatDate(employee.dateOfBirth) },
    { label: 'Gender', value: titleCase(employee.gender) },
    { label: 'Nationality', value: formatValue(employee.nationality) },
    { label: 'Blood Group', value: formatValue(employee.bloodGroup) },
    { label: 'Date of Joining', value: formatDate(employee.dateOfJoining) },
    { label: 'Employment Type', value: titleCase(employee.employmentType) },
    { label: 'Status', value: titleCase(employee.status) },
    { label: 'PAN Number', value: formatValue(employee.panNumber) },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Basic Information</CardTitle>
        <CardDescription>Employee personal and employment details</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
