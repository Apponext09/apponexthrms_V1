# ApponextHRMS - Workspace Agent Rules

## Department Hierarchy & Team Visibility Rule
For **ALL departments** across the organization (Sales, Engineering, HR, Marketing, Finance, Operations, IT, etc.):

1. **Manager Portal (`/manager/team`)**:
   - Must dynamically query and list **ALL Team Leads and Employees** belonging to that department or reporting under that Manager.
   - The query must use multi-tier hierarchy resolution so that 2nd-tier employees reporting to Team Leads are included alongside 1st-tier Team Leads.
   - SQL condition formula:
     ```sql
     WHERE current_department_id = manager.departmentId
        OR reporting_manager_id = manager.employeeId
        OR reporting_manager_id IN (team_lead_ids)
     ```

2. **Team Lead Portal (`/team-lead/members`)**:
   - Must dynamically query and list **ALL Employees** assigned to or reporting under that specific Team Lead.

3. **Fallback & Data Resilience**:
   - Always ensure data loaders in `useManager` and `useTeam` have fallback resolution so that Manager and Team Lead views are never blank for any department.
