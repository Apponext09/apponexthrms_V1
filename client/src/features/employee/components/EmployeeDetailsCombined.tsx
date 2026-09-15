import React from 'react';
import { EmployeeBasicInfo } from './EmployeeBasicInfo';
import { EmployeePersonalInfo } from './EmployeePersonalInfo';
import { EmployeeProfessionalInfo } from './EmployeeProfessionalInfo';
import { EmployeeCustomMastersInfo } from './EmployeeCustomMastersInfo';
import type { Employee } from '@/types';

interface EmployeeDetailsCombinedProps {
  employee: Employee;
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
        editUnlocked={isBasicUnlocked}
        approvedRequestId={approvedRequestId}
      />

      {/* 2. Linked Custom Masters & Organizational Attributes */}
      <EmployeeCustomMastersInfo
        employeeId={employee.id as number}
        editUnlocked={isProfessionalUnlocked}
      />

      {/* 3. Personal Information */}
      <EmployeePersonalInfo
        employeeId={employee.id as number}
        editUnlocked={isPersonalUnlocked}
        approvedRequestId={approvedRequestId}
      />

      {/* 4. Professional & Education Information */}
      <EmployeeProfessionalInfo
        employeeId={employee.id as number}
        editUnlocked={isProfessionalUnlocked}
        approvedRequestId={approvedRequestId}
      />
    </div>
  );
}
