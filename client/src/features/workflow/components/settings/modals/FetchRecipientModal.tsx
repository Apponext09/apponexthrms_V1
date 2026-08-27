import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, UserPlus } from 'lucide-react';

export interface SelectedUserTag {
  id: number;
  name: string;
}

export interface RecipientSelection {
  isEmployee?: boolean;
  isReportingOfficer?: boolean;
  isSelf?: boolean;
  isCustomEmail?: boolean;
  customEmailText?: string;
  selectedUserSearch?: string;
  selectedUsers?: SelectedUserTag[];
  selectedDepartmentIds?: number[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  departments?: Array<{ id: number; name: string }>;
  employees?: Array<{ id: number; fullName?: string; full_name?: string; employeeCode?: string; employee_code?: string }>;
  initialValues?: RecipientSelection;
  onConfirm: (selection: RecipientSelection) => void;
}

export function FetchRecipientModal({
  open,
  onClose,
  departments = [],
  employees = [],
  initialValues,
  onConfirm,
}: Props) {
  const [isEmployee, setIsEmployee] = useState(false);
  const [isReportingOfficer, setIsReportingOfficer] = useState(false);
  const [isSelf, setIsSelf] = useState(false);
  const [isCustomEmail, setIsCustomEmail] = useState(false);
  const [customEmailText, setCustomEmailText] = useState('');
  
  // User tags state
  const [selectedUserTags, setSelectedUserTags] = useState<SelectedUserTag[]>([]);
  const [userQuery, setUserQuery] = useState('');
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  // Department state
  const [selectedDepts, setSelectedDepts] = useState<number[]>([]);

  useEffect(() => {
    if (initialValues) {
      setIsEmployee(!!initialValues.isEmployee);
      setIsReportingOfficer(!!initialValues.isReportingOfficer);
      setIsSelf(!!initialValues.isSelf);
      setIsCustomEmail(!!initialValues.isCustomEmail);
      setCustomEmailText(initialValues.customEmailText || '');
      setSelectedUserTags(initialValues.selectedUsers || []);
      setSelectedDepts(initialValues.selectedDepartmentIds || []);
    } else {
      setIsEmployee(false);
      setIsReportingOfficer(false);
      setIsSelf(false);
      setIsCustomEmail(false);
      setCustomEmailText('');
      setSelectedUserTags([]);
      setSelectedDepts([]);
    }
    setUserQuery('');
    setUserDropdownOpen(false);
  }, [open, initialValues]);

  const toggleDept = (id: number) => {
    setSelectedDepts((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleAddUserTag = (emp: { id: number; fullName?: string; full_name?: string; employeeCode?: string; employee_code?: string }) => {
    const fn = emp.fullName || emp.full_name || `Employee #${emp.id}`;
    const code = emp.employeeCode || emp.employee_code;
    const name = code ? `${fn} (${code})` : fn;

    if (!selectedUserTags.some((tag) => tag.id === emp.id)) {
      setSelectedUserTags((prev) => [...prev, { id: emp.id, name }]);
    }
    setUserQuery('');
    setUserDropdownOpen(false);
  };

  const handleRemoveUserTag = (id: number) => {
    setSelectedUserTags((prev) => prev.filter((tag) => tag.id !== id));
  };

  const handleFetch = () => {
    onConfirm({
      isEmployee,
      isReportingOfficer,
      isSelf,
      isCustomEmail,
      customEmailText,
      selectedUsers: selectedUserTags,
      selectedDepartmentIds: selectedDepts,
    });
    onClose();
  };

  // Filter employees for user search dropdown
  const filteredEmployees = employees.filter((e) => {
    const fn = (e.fullName || e.full_name || '').toLowerCase();
    const code = (e.employeeCode || e.employee_code || '').toLowerCase();
    const q = userQuery.toLowerCase();
    return fn.includes(q) || code.includes(q);
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 gap-0 border rounded-lg bg-background shadow-lg overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-5 py-3 border-b flex-shrink-0">
          <DialogTitle className="text-base font-medium text-foreground">
            Fetch Receipient
          </DialogTitle>
        </DialogHeader>

        {/* Content Box */}
        <div className="p-5 space-y-4">
          <div className="border rounded-md bg-card overflow-hidden">
            {/* 1. Employee */}
            <div className="flex items-center gap-3 px-4 py-3 border-b hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => setIsEmployee(!isEmployee)}>
              <Checkbox id="recip-emp" checked={isEmployee} onCheckedChange={(v) => setIsEmployee(!!v)} />
              <Label htmlFor="recip-emp" className="text-sm font-bold cursor-pointer text-foreground">Employee</Label>
            </div>

            {/* 2. Reporting Officer */}
            <div className="flex items-center gap-3 px-4 py-3 border-b hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => setIsReportingOfficer(!isReportingOfficer)}>
              <Checkbox id="recip-ro" checked={isReportingOfficer} onCheckedChange={(v) => setIsReportingOfficer(!!v)} />
              <Label htmlFor="recip-ro" className="text-sm font-bold cursor-pointer text-foreground">Reporting Officer</Label>
            </div>

            {/* 3. Self */}
            <div className="flex items-center gap-3 px-4 py-3 border-b hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => setIsSelf(!isSelf)}>
              <Checkbox id="recip-self" checked={isSelf} onCheckedChange={(v) => setIsSelf(!!v)} />
              <Label htmlFor="recip-self" className="text-sm font-bold cursor-pointer text-foreground">Self</Label>
            </div>

            {/* 4. Custom Email */}
            <div className="flex items-center gap-3 px-4 py-3 border-b hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => setIsCustomEmail(!isCustomEmail)}>
              <Checkbox id="recip-custom" checked={isCustomEmail} onCheckedChange={(v) => setIsCustomEmail(!!v)} />
              <Label htmlFor="recip-custom" className="text-sm font-bold cursor-pointer text-foreground">Custom Email</Label>
            </div>
            {isCustomEmail && (
              <div className="px-4 py-2 bg-muted/20 border-b">
                <Input
                  placeholder="Enter email addresses..."
                  value={customEmailText}
                  onChange={(e) => setCustomEmailText(e.target.value)}
                  className="h-8 text-xs bg-background"
                />
              </div>
            )}

            {/* Users Tag Section (User requested tag addition) */}
            <div className="p-4 border-b space-y-2 relative">
              <Label className="text-xs font-bold text-foreground">Users</Label>
              
              {/* Selected User Tags display */}
              <div className="flex flex-wrap gap-1.5 mb-2">
                {selectedUserTags.map((tag) => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 shadow-2xs"
                  >
                    <span>{tag.name}</span>
                    <button
                      onClick={() => handleRemoveUserTag(tag.id)}
                      className="hover:text-destructive text-primary/70 transition-colors"
                      title="Remove user"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>

              {/* User search input + dropdown */}
              <div className="relative">
                <Input
                  placeholder="Search & add user tags..."
                  value={userQuery}
                  onFocus={() => setUserDropdownOpen(true)}
                  onChange={(e) => {
                    setUserQuery(e.target.value);
                    setUserDropdownOpen(true);
                  }}
                  className="h-9 text-xs bg-background"
                />

                {userDropdownOpen && (
                  <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-background border rounded-md shadow-lg max-h-44 overflow-y-auto divide-y">
                    {filteredEmployees.length === 0 && (
                      <div className="px-3 py-2 text-xs text-muted-foreground">No matching users</div>
                    )}
                    {filteredEmployees.map((emp) => {
                      const fn = emp.fullName || emp.full_name || `Employee #${emp.id}`;
                      const code = emp.employeeCode || emp.employee_code;
                      const isSelected = selectedUserTags.some((t) => t.id === emp.id);
                      return (
                        <div
                          key={emp.id}
                          onClick={() => handleAddUserTag(emp)}
                          className={`flex items-center justify-between px-3 py-2 text-xs cursor-pointer transition-colors ${
                            isSelected ? 'bg-muted/40 text-muted-foreground' : 'hover:bg-primary/10 hover:text-primary font-medium'
                          }`}
                        >
                          <span>{fn} {code ? `(${code})` : ''}</span>
                          <UserPlus size={13} className={isSelected ? 'text-green-500' : 'text-muted-foreground'} />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Department List */}
            <div className="p-4 space-y-2">
              <Label className="text-xs font-bold text-foreground">Department List</Label>
              <div className="border rounded-md p-3 max-h-36 overflow-y-auto space-y-2.5 bg-background">
                {departments.length === 0 && (
                  <p className="text-xs text-muted-foreground">No departments</p>
                )}
                {departments.map((dept) => (
                  <div key={dept.id} className="flex items-center gap-2.5 cursor-pointer" onClick={() => toggleDept(dept.id)}>
                    <Checkbox
                      id={`dept-recip-${dept.id}`}
                      checked={selectedDepts.includes(dept.id)}
                      onCheckedChange={() => toggleDept(dept.id)}
                    />
                    <Label htmlFor={`dept-recip-${dept.id}`} className="text-xs font-bold uppercase tracking-wide cursor-pointer text-foreground">
                      {dept.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t flex justify-between items-center bg-muted/10">
          <Button
            size="sm"
            onClick={handleFetch}
            className="bg-[#00a65a] hover:bg-[#008d4c] text-white font-bold px-5 h-8 rounded-md text-xs"
          >
            Fetch
          </Button>
          <Button
            size="sm"
            onClick={onClose}
            className="bg-[#dd4b39] hover:bg-[#c9302c] text-white font-bold px-5 h-8 rounded-md text-xs"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
