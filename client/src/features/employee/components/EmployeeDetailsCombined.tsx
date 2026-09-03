import React from 'react';
import { EmployeeBasicInfo } from './EmployeeBasicInfo';
import { EmployeePersonalInfo } from './EmployeePersonalInfo';
import { EmployeeProfessionalInfo } from './EmployeeProfessionalInfo';
import type { Employee } from '@/types';

interface EmployeeDetailsCombinedProps {
  employee: Employee;
  isEditingBasicInfo: boolean;
  onEditBasicInfoToggle: (editing: boolean) => void;
  /** Overall unlock status */
  editUnlocked?: boolean;
  /** Section-specific unlock flags */
  isBasicUnlocked?: boolean;
  isPersonalUnlocked?: boolean;
  isProfessionalUnlocked?: boolean;
  isStatutoryUnlocked?: boolean;
  /** The approved request ID to consume after the employee saves */
  approvedRequestId?: number | null;
}

export function EmployeeDetailsCombined({
  employee,
  isEditingBasicInfo,
  onEditBasicInfoToggle,
  editUnlocked = false,
  isBasicUnlocked = editUnlocked,
  isPersonalUnlocked = editUnlocked,
  isProfessionalUnlocked = editUnlocked,
  isStatutoryUnlocked = editUnlocked,
  approvedRequestId,
}: EmployeeDetailsCombinedProps) {
  return (
    <div className="space-y-4">
      {/* 1. Basic Employee Information */}
      <EmployeeBasicInfo
        employee={employee}
        isEditing={isEditingBasicInfo}
        onEditToggle={onEditBasicInfoToggle}
        editUnlocked={isBasicUnlocked}
        approvedRequestId={approvedRequestId}
      />

      {/* 2. Personal Information */}
      <EmployeePersonalInfo
        employeeId={employee.id as number}
        editUnlocked={isPersonalUnlocked}
        approvedRequestId={approvedRequestId}
      />

      {/* 3. Professional & Education Information */}
      <EmployeeProfessionalInfo
        employeeId={employee.id as number}
        editUnlocked={isProfessionalUnlocked}
        approvedRequestId={approvedRequestId}
      />
    </div>
  );
}
