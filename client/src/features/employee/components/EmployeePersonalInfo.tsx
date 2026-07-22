import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Edit, Save, X, Loader2 } from 'lucide-react';
import { showToast } from '@/components/ui/toast';
import {
  useEmployeePersonalInfo,
  useUpdatePersonalInfo,
} from '../hooks/useEmployeeProfile';
import type { EmployeePersonalInfo as PersonalInfo } from '@/types';

interface EmployeePersonalInfoProps {
  employeeId: number;
}

const FIELDS: { key: keyof PersonalInfo; label: string; type?: string }[] = [
  { key: 'fatherName', label: "Father's Name" },
  { key: 'motherName', label: "Mother's Name" },
  { key: 'spouseName', label: "Spouse's Name" },
  { key: 'childrenCount', label: 'Children Count', type: 'number' },
  { key: 'currentAddress', label: 'Current Address' },
  { key: 'permanentAddress', label: 'Permanent Address' },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State' },
  { key: 'country', label: 'Country' },
  { key: 'postalCode', label: 'Postal Code' },
];

export function EmployeePersonalInfo({ employeeId }: EmployeePersonalInfoProps) {
  const { personalInfo, isLoading } = useEmployeePersonalInfo(employeeId);
  const { updatePersonalInfo, isLoading: isSaving } = useUpdatePersonalInfo(employeeId);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<Partial<PersonalInfo>>({});

  useEffect(() => {
    setForm(personalInfo || {});
  }, [personalInfo]);

  const handleSave = async () => {
    try {
      const payload: any = { ...form };
      if (payload.childrenCount !== undefined && payload.childrenCount !== null) {
        payload.childrenCount = Number(payload.childrenCount) || 0;
      }
      await updatePersonalInfo(payload);
      showToast.success('Personal information saved');
      setIsEditing(false);
    } catch {
      showToast.error('Failed to save personal information');
    }
  };

  const handleCancel = () => {
    setForm(personalInfo || {});
    setIsEditing(false);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row justify-between items-start">
        <div>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>Family and address details</CardDescription>
        </div>
        {!isEditing ? (
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setIsEditing(true)}>
            <Edit className="w-4 h-4" />
            Edit
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={handleCancel} disabled={isSaving}>
              <X className="w-4 h-4" />
              Cancel
            </Button>
            <Button size="sm" className="gap-2" onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-muted-foreground">Loading...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {FIELDS.map((field) => (
              <div key={field.key as string}>
                <Label className="text-sm font-semibold text-muted-foreground">
                  {field.label}
                </Label>
                {isEditing ? (
                  <Input
                    type={field.type || 'text'}
                    className="mt-1"
                    value={(form[field.key] as string | number | undefined) ?? ''}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, [field.key]: e.target.value }))
                    }
                  />
                ) : (
                  <p className="mt-1 text-base">
                    {(personalInfo?.[field.key] as string | number | undefined) ?? '-'}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
