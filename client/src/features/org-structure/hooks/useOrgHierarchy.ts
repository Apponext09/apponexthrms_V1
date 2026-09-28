import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/config/api";
import { useCompanyStore } from "@/features/settings/store/companyStore";
import type { Employee } from "@/types";

/**
 * Full, uncapped roster for the Organization Chart, backed by
 * GET /employees/org-hierarchy (a narrow-field, purpose-built endpoint —
 * see server/src/modules/employee/repositories/EmployeeRepository.ts
 * listForOrgHierarchy) rather than the generic paginated /employees list.
 * This replaces the previous `useEmployees({ pageSize: 1000 })` call, which
 * silently truncated any organization above 1000 employees.
 */
export function useOrgHierarchy() {
  const { selectedCompanyId } = useCompanyStore();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["org-hierarchy", selectedCompanyId],
    queryFn: async () => {
      const response = await apiClient.get("/employees/org-hierarchy");
      return response.data;
    },
  });

  const employees: Employee[] = Array.isArray(data?.data) ? data.data : [];

  return {
    employees,
    isLoading,
    isError,
    error: error ? (error as Error).message : null,
    refetch,
  };
}
