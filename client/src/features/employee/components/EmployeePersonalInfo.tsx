import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Edit, Save, X, Loader2, Lock } from 'lucide-react';
import { showToast } from '@/components/ui/toast';
import { ProfileEditRequestModal } from './ProfileEditRequestModal';
import { useConsumeEditPermission } from '../hooks/useProfileEditPermission';
import {
  useEmployeePersonalInfo,
  useUpdatePersonalInfo,
} from '../hooks/useEmployeeProfile';
import type { EmployeePersonalInfo as PersonalInfo } from '@/types';

interface EmployeePersonalInfoProps {
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

export function EmployeePersonalInfo({ employeeId, editUnlocked = false, approvedRequestId }: EmployeePersonalInfoProps) {
  const location = useLocation();
  const isEmployeePortal = location.pathname.startsWith('/employee');
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const { consumePermission } = useConsumeEditPermission();

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
      // Consume the approved edit permission so employee can't edit again without another approval
      if (isEmployeePortal && approvedRequestId) {
        await consumePermission(approvedRequestId);
      }
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
    <>
      <Card className="border border-border/80 shadow-2xs rounded-xl bg-card">
        <CardHeader className="flex flex-row justify-between items-center pb-3 px-4 sm:px-5 pt-4 sm:pt-5 border-b border-border/50 mb-4">
          <div>
            <CardTitle className="text-sm font-bold">Personal Information</CardTitle>
            <CardDescription className="text-xs">Family and address details</CardDescription>
          </div>
          {/* --- Header action button --- */}
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
            {isEmployeePortal && !editUnlocked ? 'Request Edit' : 'Edit Personal Info'}
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
          <div className="text-xs text-muted-foreground py-6 text-center">Loading personal info...</div>
        ) : isEditing ? (
          /* ─── EDIT MODE ─── */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <Label htmlFor="fatherName" className="text-xs font-medium">Father's Name</Label>
              <Input
                id="fatherName"
                className="mt-1 h-9 text-xs"
                value={form.fatherName || ''}
                onChange={(e) => setForm({ ...form, fatherName: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="motherName" className="text-xs font-medium">Mother's Name</Label>
              <Input
                id="motherName"
                className="mt-1 h-9 text-xs"
                value={form.motherName || ''}
                onChange={(e) => setForm({ ...form, motherName: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="spouseName" className="text-xs font-medium">Spouse's Name</Label>
              <Input
                id="spouseName"
                className="mt-1 h-9 text-xs"
                value={form.spouseName || ''}
                onChange={(e) => setForm({ ...form, spouseName: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="childrenCount" className="text-xs font-medium">Children Count</Label>
              <Input
                id="childrenCount"
                type="number"
                className="mt-1 h-9 text-xs"
                value={form.childrenCount ?? ''}
                onChange={(e) => setForm({ ...form, childrenCount: e.target.value as any })}
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="currentAddress" className="text-xs font-medium">Current Address</Label>
              <Input
                id="currentAddress"
                className="mt-1 h-9 text-xs"
                value={form.currentAddress || ''}
                onChange={(e) => setForm({ ...form, currentAddress: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="permanentAddress" className="text-xs font-medium">Permanent Address</Label>
              <Input
                id="permanentAddress"
                className="mt-1 h-9 text-xs"
                value={form.permanentAddress || ''}
                onChange={(e) => setForm({ ...form, permanentAddress: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="city" className="text-xs font-medium">City</Label>
              <Input
                id="city"
                className="mt-1 h-9 text-xs"
                value={form.city || ''}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="state" className="text-xs font-medium">State</Label>
              <Input
                id="state"
                className="mt-1 h-9 text-xs"
                value={form.state || ''}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="country" className="text-xs font-medium">Country</Label>
              <Input
                id="country"
                className="mt-1 h-9 text-xs"
                value={form.country || ''}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="postalCode" className="text-xs font-medium">Postal Code</Label>
              <Input
                id="postalCode"
                className="mt-1 h-9 text-xs"
                value={form.postalCode || ''}
                onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
              />
            </div>
          </div>
        ) : (
          /* ─── VIEW MODE ─── */
          <div className="space-y-4 text-xs">
            {/* Family Info */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 pb-1 border-b border-border/60">
                Family Information
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Father's Name</p>
                  <p className="mt-0.5 text-xs font-medium text-foreground">{formatValue(personalInfo?.fatherName)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Mother's Name</p>
                  <p className="mt-0.5 text-xs font-medium text-foreground">{formatValue(personalInfo?.motherName)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Spouse's Name</p>
                  <p className="mt-0.5 text-xs font-medium text-foreground">{formatValue(personalInfo?.spouseName)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Children Count</p>
                  <p className="mt-0.5 text-xs font-medium text-foreground">{formatValue(personalInfo?.childrenCount)}</p>
                </div>
              </div>
            </div>

            {/* Address Info */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 pb-1 border-b border-border/60">
                Address & Location
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div className="sm:col-span-2">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Current Address</p>
                  <p className="mt-0.5 text-xs font-medium text-foreground">{formatValue(personalInfo?.currentAddress)}</p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Permanent Address</p>
                  <p className="mt-0.5 text-xs font-medium text-foreground">{formatValue(personalInfo?.permanentAddress)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">City</p>
                  <p className="mt-0.5 text-xs font-medium text-foreground">{formatValue(personalInfo?.city)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">State</p>
                  <p className="mt-0.5 text-xs font-medium text-foreground">{formatValue(personalInfo?.state)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Country</p>
                  <p className="mt-0.5 text-xs font-medium text-foreground">{formatValue(personalInfo?.country)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Postal Code</p>
                  <p className="mt-0.5 text-xs font-mono font-medium text-foreground">{formatValue(personalInfo?.postalCode)}</p>
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

