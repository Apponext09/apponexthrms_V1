import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Edit, Save, X, Loader2, ExternalLink } from 'lucide-react';
import { showToast } from '@/components/ui/toast';
import {
  useEmployeeProfessionalInfo,
  useUpdateProfessionalInfo,
} from '../hooks/useEmployeeProfile';
import type { EmployeeProfessionalInfo as ProfessionalInfo } from '@/types';

interface EmployeeProfessionalInfoProps {
  employeeId: number;
}

const FIELDS: { key: keyof ProfessionalInfo; label: string; type?: string }[] = [
  { key: 'qualification', label: 'Qualification' },
  { key: 'specialization', label: 'Specialization' },
  { key: 'university', label: 'University / Institute' },
  { key: 'graduationYear', label: 'Graduation Year', type: 'number' },
  { key: 'yearsOfExperience', label: 'Years of Experience', type: 'number' },
  { key: 'linkedinUrl', label: 'LinkedIn URL' },
  { key: 'githubUrl', label: 'GitHub URL' },
];

export function EmployeeProfessionalInfo({ employeeId }: EmployeeProfessionalInfoProps) {
  const { professionalInfo, isLoading } = useEmployeeProfessionalInfo(employeeId);
  const { updateProfessionalInfo, isLoading: isSaving } = useUpdateProfessionalInfo(employeeId);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<Partial<ProfessionalInfo>>({});

  useEffect(() => {
    setForm(professionalInfo || {});
  }, [professionalInfo]);

  const handleSave = async () => {
    try {
      const payload: any = { ...form };
      ['graduationYear', 'yearsOfExperience'].forEach((k) => {
        if (payload[k] === '' || payload[k] === null) {
          payload[k] = k === 'yearsOfExperience' ? 0 : null;
        } else if (payload[k] !== undefined) {
          payload[k] = Number(payload[k]);
        }
      });
      // Empty strings for optional url/text fields -> null to satisfy url() validation
      ['linkedinUrl', 'githubUrl', 'qualification', 'specialization', 'university'].forEach((k) => {
        if (payload[k] === '') payload[k] = null;
      });
      await updateProfessionalInfo(payload);
      showToast.success('Professional information saved');
      setIsEditing(false);
    } catch {
      showToast.error('Failed to save. Check that URLs are valid.');
    }
  };

  const handleCancel = () => {
    setForm(professionalInfo || {});
    setIsEditing(false);
  };

  const renderValue = (key: keyof ProfessionalInfo) => {
    const value = professionalInfo?.[key];
    if (value === undefined || value === null || value === '') return '-';
    if ((key === 'linkedinUrl' || key === 'githubUrl') && typeof value === 'string') {
      return (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-blue-600 hover:underline"
        >
          {value} <ExternalLink className="w-3 h-3" />
        </a>
      );
    }
    return value;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row justify-between items-start">
        <div>
          <CardTitle>Professional Information</CardTitle>
          <CardDescription>Education, experience, and links</CardDescription>
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
                  <p className="mt-1 text-base break-all">{renderValue(field.key)}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
