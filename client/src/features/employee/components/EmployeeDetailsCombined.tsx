import React from 'react';
import { EmployeeBasicInfo } from './EmployeeBasicInfo';
import { EmployeePersonalInfo } from './EmployeePersonalInfo';
import { EmployeeProfessionalInfo } from './EmployeeProfessionalInfo';
import { EmployeeStatutoryDetails } from './EmployeeStatutoryDetails';
import type { Employee } from '@/types';

interface EmployeeDetailsCombinedProps {
  employee: Employee;
  isEditingBasicInfo: boolean;
  onEditBasicInfoToggle: (editing: boolean) => void;
}

export function EmployeeDetailsCombined({
  employee,
  isEditingBasicInfo,
  onEditBasicInfoToggle,
}: EmployeeDetailsCombinedProps) {
  return (
    <div className="space-y-4">
      {/* 1. Basic Employee Information */}
      <EmployeeBasicInfo
        employee={employee}
        isEditing={isEditingBasicInfo}
        onEditToggle={onEditBasicInfoToggle}
      />

      {/* 2. Statutory & Banking Details (Matches screenshot reference) */}
      <EmployeeStatutoryDetails employee={employee} />

      {/* 3. Personal Information */}
      <EmployeePersonalInfo employeeId={employee.id as number} />

      {/* 4. Professional & Education Information */}
      <EmployeeProfessionalInfo employeeId={employee.id as number} />
    </div>
  );
}
