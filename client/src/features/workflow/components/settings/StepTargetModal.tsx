import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { User, Building2, ShieldCheck } from 'lucide-react';

export type StepTargetType = 'employee' | 'department' | 'role';

// Exact 7 Access Roles requested by user
const ALLOWED_ACCESS_ROLES = [
  { id: 101, name: 'Admin', code: 'organization_admin' },
  { id: 102, name: 'Employee', code: 'employee' },
  { id: 103, name: 'Team Lead', code: 'team_lead' },
  { id: 104, name: 'Manager', code: 'department_head' },
  { id: 105, name: 'HR', code: 'hr' },
  { id: 106, name: 'Intern', code: 'intern' },
  { id: 107, name: 'Consultant', code: 'consultant' },
];

interface Props {
  open: boolean;
  type: StepTargetType | null;
  onClose: () => void;
  employees?: Array<{ id: number; fullName?: string; full_name?: string; employeeCode?: string; employee_code?: string }>;
  departments?: Array<{ id: number; name: string; code?: string }>;
  roles?: Array<{ id: number; name: string; display_name?: string; code?: string }>;
  onConfirm: (data: { targetId: number; targetName: string }) => void;
}

export function StepTargetModal({
  open,
  type,
  onClose,
  employees = [],
  departments = [],
  roles = [],
  onConfirm,
}: Props) {
  const [selectedId, setSelectedId] = useState<string>('');

  useEffect(() => {
    setSelectedId('');
  }, [open, type]);

  if (!type) return null;

  const getTitle = () => {
    switch (type) {
      case 'employee':
        return 'Select Employee';
      case 'department':
        return 'Select Department';
      case 'role':
        return 'Select Role';
      default:
        return 'Select Approver';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'employee':
        return <User size={18} className="text-purple-600" />;
      case 'department':
        return <Building2 size={18} className="text-orange-600" />;
      case 'role':
        return <ShieldCheck size={18} className="text-green-600" />;
    }
  };

  // Build normalized list of ONLY the 7 requested access roles
  const formattedRoles = ALLOWED_ACCESS_ROLES.map((allowed) => {
    // Check if there is a matching real DB role to adopt its real DB ID
    const dbMatch = roles.find(
      (r) =>
        r.code?.toLowerCase() === allowed.code.toLowerCase() ||
        r.name?.toLowerCase().includes(allowed.name.toLowerCase())
    );
    return {
      id: dbMatch ? dbMatch.id : allowed.id,
      name: allowed.name,
    };
  });

  const handleConfirm = () => {
    if (!selectedId) return;
    const idNum = Number(selectedId);
    let name = '';

    if (type === 'employee') {
      const emp = employees.find((e) => e.id === idNum);
      const fn = emp?.fullName || emp?.full_name || `Employee #${idNum}`;
      const code = emp?.employeeCode || emp?.employee_code;
      name = code ? `${fn} (${code})` : fn;
    } else if (type === 'department') {
      const d = departments.find((dept) => dept.id === idNum);
      name = d?.name || `Department #${idNum}`;
    } else if (type === 'role') {
      const r = formattedRoles.find((role) => role.id === idNum);
      name = r?.name || `Role #${idNum}`;
    }

    onConfirm({ targetId: idNum, targetName: name });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            {getIcon()}
            {getTitle()}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {type === 'employee' && (
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                Employee
              </Label>
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="w-full h-10 text-sm border rounded-lg px-3 bg-background font-medium focus:ring-2 focus:ring-primary/20 outline-hidden"
              >
                <option value="">-- Choose Employee --</option>
                {employees.map((emp) => {
                  const fn = emp.fullName || emp.full_name || `Employee #${emp.id}`;
                  const code = emp.employeeCode || emp.employee_code;
                  return (
                    <option key={emp.id} value={emp.id}>
                      {fn} {code ? `(${code})` : ''}
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {type === 'department' && (
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                Department
              </Label>
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="w-full h-10 text-sm border rounded-lg px-3 bg-background font-medium focus:ring-2 focus:ring-primary/20 outline-hidden"
              >
                <option value="">-- Choose Department --</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} {d.code ? `(${d.code})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {type === 'role' && (
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                Access Role
              </Label>
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="w-full h-10 text-sm border rounded-lg px-3 bg-background font-medium focus:ring-2 focus:ring-primary/20 outline-hidden"
              >
                <option value="">-- Choose Access Role --</option>
                {formattedRoles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleConfirm}
            disabled={!selectedId}
            className="bg-primary text-primary-foreground font-bold px-4"
          >
            Confirm & Add Step
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
