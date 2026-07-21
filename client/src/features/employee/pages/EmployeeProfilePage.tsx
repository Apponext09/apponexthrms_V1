import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useParams } from 'react-router-dom';
import { useEmployee } from '../hooks/useEmployees';
import { EmployeeBasicInfo } from '../components/EmployeeBasicInfo';
import { EmployeePersonalInfo } from '../components/EmployeePersonalInfo';
import { EmployeeProfessionalInfo } from '../components/EmployeeProfessionalInfo';
import { EmployeeDocuments } from '../components/EmployeeDocuments';
import { EmployeeAssets } from '../components/EmployeeAssets';
import { EmployeeLifecycleTimeline } from '../components/EmployeeLifecycleTimeline';

export function EmployeeProfilePage() {
  const { id } = useParams<{ id: string }>();
  const employeeId = parseInt(id || '0', 10);
  const { employee, isLoading } = useEmployee(employeeId);

  if (isLoading) {
    return <div className="p-4">Loading...</div>;
  }

  if (!employee || !employee.id) {
    return <div className="p-4 text-red-600">Employee not found</div>;
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">
            {employee.firstName} {employee.lastName}
          </h1>
          <p className="text-muted-foreground">{employee.employeeCode}</p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-950 px-4 py-2 rounded">
          <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
            {(employee.status || 'ACTIVE').toUpperCase()}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="personal">Personal</TabsTrigger>
          <TabsTrigger value="professional">Professional</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="assets">Assets</TabsTrigger>
          <TabsTrigger value="lifecycle">Lifecycle</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="mt-4">
          <EmployeeBasicInfo employee={employee} />
        </TabsContent>

        <TabsContent value="personal" className="mt-4">
          <EmployeePersonalInfo employeeId={employee.id as number} />
        </TabsContent>

        <TabsContent value="professional" className="mt-4">
          <EmployeeProfessionalInfo employeeId={employee.id as number} />
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <EmployeeDocuments employeeId={employee.id as number} />
        </TabsContent>

        <TabsContent value="assets" className="mt-4">
          <EmployeeAssets employeeId={employee.id as number} />
        </TabsContent>

        <TabsContent value="lifecycle" className="mt-4">
          <EmployeeLifecycleTimeline employeeId={employee.id as number} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

