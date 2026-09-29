import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { showToast } from '@/components/ui/toast';
import { apiClient } from '@/config/api';
import { useAccessRoles } from '@/features/settings/hooks/useAccessRoles';
import type { Employee } from '@/types';

interface Props {
  employee: Employee;
  onRoleUpdate?: () => void;
  readOnly?: boolean;
}

export function EmployeeRolesInfo({ employee, onRoleUpdate, readOnly = false }: Props) {
  const { data: availableRoles = [], isLoading, error } = useAccessRoles();
  const [assignedRoles, setAssignedRoles] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const record = employee as any;
    const codes = Array.isArray(record.assignedRoles) ? record.assignedRoles : Array.isArray(record.roles) ? record.roles : [record.accessRole || 'employee'];
    setAssignedRoles([...new Set<string>(codes.filter(Boolean).map((code: string) => String(code).toLowerCase()))]);
  }, [employee]);

  const filteredRoles = useMemo(() => availableRoles.filter((role) =>
    `${role.name} ${role.code} ${role.description ?? ''}`.toLowerCase().includes(search.toLowerCase())
  ), [availableRoles, search]);

  const save = async () => {
    if (assignedRoles.length === 0) {
      showToast.error('Select at least one access role');
      return;
    }
    try {
      setSaving(true);
      await apiClient.patch(`/employees/${employee.id}`, { accessRole: assignedRoles[0], roles: assignedRoles });
      showToast.success('Access roles updated');
      onRoleUpdate?.();
    } catch (err: any) {
      showToast.error(err?.response?.data?.message || 'Failed to update access roles');
    } finally {
      setSaving(false);
    }
  };

  return <Card className="border-border/80">
    <CardHeader>
      <CardTitle>Role &amp; Access</CardTitle>
      <CardDescription>{readOnly ? 'Your assigned access roles.' : `Assign access roles for ${employee.firstName}. Permissions are configured separately.`}</CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      {readOnly ? <div className="flex flex-wrap gap-2">
        {assignedRoles.length === 0 && <p className="text-sm text-muted-foreground">No access role assigned.</p>}
        {assignedRoles.map((code) => <Badge key={code} variant="outline">{availableRoles.find((role) => role.code === code)?.name || code}</Badge>)}
      </div> : <>
        <div className="flex items-center justify-between gap-3">
          <Input aria-label="Search access roles" placeholder="Search access roles" value={search} onChange={(event) => setSearch(event.target.value)} className="max-w-xs" />
          <Button onClick={save} disabled={saving || isLoading || !!error}>{saving ? 'Saving...' : 'Save roles'}</Button>
        </div>
        {isLoading && <p className="text-sm text-muted-foreground">Loading roles...</p>}
        {error && <p className="text-sm text-destructive">Could not load access roles.</p>}
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {filteredRoles.map((role) => <label key={role.id} className="flex cursor-pointer items-start gap-2 rounded-lg border border-border p-3">
            <input type="checkbox" checked={assignedRoles.includes(role.code)} onChange={() => setAssignedRoles((current) => current.includes(role.code) ? current.filter((code) => code !== role.code) : [...current, role.code])} />
            <span><span className="block text-sm font-medium">{role.name}</span><span className="text-xs text-muted-foreground">{role.description || role.code}</span></span>
          </label>)}
        </div>
      </>}
    </CardContent>
  </Card>;
}
