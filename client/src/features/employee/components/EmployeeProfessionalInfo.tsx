import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Edit, Save, X, Loader2, ExternalLink, Lock } from 'lucide-react';
import { showToast } from '@/components/ui/toast';
import { ProfileEditRequestModal } from './ProfileEditRequestModal';
import { useConsumeEditPermission } from '../hooks/useProfileEditPermission';
import { useAuthStore } from '@/features/auth/store/authStore';
import {
  useEmployeeProfessionalInfo,
  useUpdateProfessionalInfo,
} from '../hooks/useEmployeeProfile';
import type { EmployeeProfessionalInfo as ProfessionalInfo } from '@/types';

interface EmployeeProfessionalInfoProps {
  employeeId: number;
  /** When true the employee has an approved request and can edit directly */
  editUnlocked?: boolean;
  /** The approved request ID to consume after saving */
  approvedRequestId?: number | null;
}

function formatValue(value: unknown): string {
  if (value === undefined || value === null || value === '') return '-';
  return String(value);
}

export function EmployeeProfessionalInfo({ employeeId, editUnlocked = false, approvedRequestId }: EmployeeProfessionalInfoProps) {
  const location = useLocation();
  const { user } = useAuthStore();
  const userRoles = Array.isArray(user?.roles) ? user.roles : [];
  const singleRole = (user as any)?.role || (user as any)?.accessRole || '';
  const allUserRoles = [...userRoles, singleRole];
  const isAdminOrHR = allUserRoles.some(r =>
    ['organization_admin', 'hr_admin', 'hr', 'hr_manager', 'super_admin', 'support'].includes(r)
  );

  const isEmployeePortal = location.pathname.startsWith('/employee') && !isAdminOrHR;
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const { consumePermission } = useConsumeEditPermission();

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
      ['linkedinUrl', 'githubUrl', 'qualification', 'specialization', 'university'].forEach((k) => {
        if (payload[k] === '') payload[k] = null;
      });
      await updateProfessionalInfo(payload);
      // Consume the approved edit permission so employee can't edit again without another approval
      if (isEmployeePortal && approvedRequestId) {
        await consumePermission(approvedRequestId);
      }
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

  return (
    <>
    <Card className="border border-border/80 shadow-2xs rounded-xl bg-card">
      <CardHeader className="flex flex-row justify-between items-center pb-3 px-4 sm:px-5 pt-4 sm:pt-5 border-b border-border/50 mb-4">
        <div>
          <CardTitle className="text-sm font-bold">Professional Information</CardTitle>
          <CardDescription className="text-xs">Education, experience, and links</CardDescription>
        </div>
        {!isEditing ? (
          <Button
            variant="outline"
            size="sm"
            className={isEmployeePortal && !editUnlocked
              ? "h-7 text-xs font-bold gap-1.5 px-3 bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20"
              : "h-7 text-xs font-bold gap-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"}
            onClick={() => {
              if (isEmployeePortal && !editUnlocked) {
                setIsRequestModalOpen(true);
              } else {
                setIsEditing(true);
              }
            }}
          >
            {isEmployeePortal && !editUnlocked ? <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" /> : <Edit className="w-3.5 h-3.5" />}
            {isEmployeePortal && !editUnlocked ? 'Request Edit' : 'Edit Professional Info'}
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs font-semibold gap-1.5 px-3"
              onClick={handleCancel}
              disabled={isSaving}
            >
              <X className="w-3.5 h-3.5" />
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-7 text-xs font-semibold gap-1.5 px-3 bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="px-4 sm:px-5 pb-4 sm:pb-5">
        {isLoading ? (
          <div className="text-xs text-muted-foreground py-6 text-center">Loading professional info...</div>
        ) : isEditing ? (
          /* ─── EDIT MODE ─── */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <Label htmlFor="qualification" className="text-xs font-medium">Qualification</Label>
              <Input
                id="qualification"
                className="mt-1 h-9 text-xs"
                placeholder="e.g. Bachelor of Technology"
                value={form.qualification || ''}
                onChange={(e) => setForm({ ...form, qualification: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="specialization" className="text-xs font-medium">Specialization</Label>
              <Input
                id="specialization"
                className="mt-1 h-9 text-xs"
                placeholder="e.g. Computer Science"
                value={form.specialization || ''}
                onChange={(e) => setForm({ ...form, specialization: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="university" className="text-xs font-medium">University / Institute</Label>
              <Input
                id="university"
                className="mt-1 h-9 text-xs"
                placeholder="e.g. Mumbai University"
                value={form.university || ''}
                onChange={(e) => setForm({ ...form, university: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="graduationYear" className="text-xs font-medium">Graduation Year</Label>
              <Input
                id="graduationYear"
                type="number"
                className="mt-1 h-9 text-xs"
                placeholder="e.g. 2020"
                value={form.graduationYear ?? ''}
                onChange={(e) => setForm({ ...form, graduationYear: e.target.value as any })}
              />
            </div>
            <div>
              <Label htmlFor="yearsOfExperience" className="text-xs font-medium">Years of Experience</Label>
              <Input
                id="yearsOfExperience"
                type="number"
                className="mt-1 h-9 text-xs"
                placeholder="e.g. 5"
                value={form.yearsOfExperience ?? ''}
                onChange={(e) => setForm({ ...form, yearsOfExperience: e.target.value as any })}
              />
            </div>
            <div>
              <Label htmlFor="linkedinUrl" className="text-xs font-medium">LinkedIn Profile URL</Label>
              <Input
                id="linkedinUrl"
                className="mt-1 h-9 text-xs"
                placeholder="https://linkedin.com/in/username"
                value={form.linkedinUrl || ''}
                onChange={(e) => setForm({ ...form, linkedinUrl: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="githubUrl" className="text-xs font-medium">GitHub Profile URL</Label>
              <Input
                id="githubUrl"
                className="mt-1 h-9 text-xs"
                placeholder="https://github.com/username"
                value={form.githubUrl || ''}
                onChange={(e) => setForm({ ...form, githubUrl: e.target.value })}
              />
            </div>
          </div>
        ) : (
          /* ─── VIEW MODE ─── */
          <div className="space-y-4 text-xs">
            {/* Education Info */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 pb-1 border-b border-border/60">
                Education & Qualifications
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Qualification</p>
                  <p className="mt-0.5 text-xs font-medium text-foreground">{formatValue(professionalInfo?.qualification)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Specialization</p>
                  <p className="mt-0.5 text-xs font-medium text-foreground">{formatValue(professionalInfo?.specialization)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">University / Institute</p>
                  <p className="mt-0.5 text-xs font-medium text-foreground">{formatValue(professionalInfo?.university)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Graduation Year</p>
                  <p className="mt-0.5 text-xs font-medium text-foreground">{formatValue(professionalInfo?.graduationYear)}</p>
                </div>
              </div>
            </div>

            {/* Experience & Links */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 pb-1 border-b border-border/60">
                Experience & Professional Profiles
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Total Experience</p>
                  <p className="mt-0.5 text-xs font-medium text-foreground">
                    {professionalInfo?.yearsOfExperience !== undefined && professionalInfo?.yearsOfExperience !== null
                      ? `${professionalInfo.yearsOfExperience} Year(s)`
                      : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">LinkedIn</p>
                  {professionalInfo?.linkedinUrl ? (
                    <a
                      href={professionalInfo.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-0.5 inline-flex items-center gap-1 text-xs text-primary underline underline-offset-2 font-medium break-all"
                    >
                      LinkedIn Profile <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  ) : (
                    <p className="mt-0.5 text-xs font-medium text-foreground">-</p>
                  )}
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">GitHub</p>
                  {professionalInfo?.githubUrl ? (
                    <a
                      href={professionalInfo.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-0.5 inline-flex items-center gap-1 text-xs text-primary underline underline-offset-2 font-medium break-all"
                    >
                      GitHub Profile <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  ) : (
                    <p className="mt-0.5 text-xs font-medium text-foreground">-</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
    <ProfileEditRequestModal
      open={isRequestModalOpen}
      onOpenChange={setIsRequestModalOpen}
      employee={{ id: employeeId } as any}
    />
    </>
  );
}

