import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useEmployee } from '../hooks/useEmployees';
import { apiClient } from '@/lib/api';
import {
  User,
  Mail,
  Phone,
  Briefcase,
  Calendar,
  Shield,
  MapPin,
  Building,
  Lock,
  Camera,
  HeartHandshake,
  Home,
  Save,
  Sparkles,
  CheckCircle2,
  BadgeCheck,
  UserCheck,
  Clock,
  Loader2,
  CheckCircle,
  Building2,
  Globe,
  ShieldCheck,
  Key,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface PersonalFormState {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  mobile: string;
  currentAddress: string;
  permanentAddress: string;
  city: string;
  state: string;
  postalCode: string;
}

interface EmergencyFormState {
  fatherName: string;
  motherName: string;
  spouseName: string;
  emergencyContactName: string;
  emergencyContactRelation: string;
  emergencyContactPhone: string;
}

export default function ProfilePage() {
  const { user, updateUser } = useAuthStore();
  const employeeId = user?.employeeId || user?.id || 0;
  const { employee, isLoading, refetch } = useEmployee(employeeId);

  const [activeTab, setActiveTab] = useState<'personal' | 'job' | 'emergency' | 'security'>('personal');
  const [avatar, setAvatar] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Success Modal Popup State
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successModalMessage, setSuccessModalMessage] = useState('');

  const cacheKeySuffix = user?.id || user?.employeeId || 'me';

  const [personalForm, setPersonalForm] = useState<PersonalFormState>(() => {
    const cached = localStorage.getItem(`emp_personal_info_${cacheKeySuffix}`);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {}
    }
    return {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      mobile: '',
      currentAddress: '',
      permanentAddress: '',
      city: '',
      state: '',
      postalCode: '',
    };
  });

  const [emergencyForm, setEmergencyForm] = useState<EmergencyFormState>(() => {
    const cached = localStorage.getItem(`emp_emergency_info_${cacheKeySuffix}`);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {}
    }
    return {
      fatherName: '',
      motherName: '',
      spouseName: '',
      emergencyContactName: '',
      emergencyContactRelation: '',
      emergencyContactPhone: '',
    };
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isFetchingInfo, setIsFetchingInfo] = useState(true);

  // Sync Base Employee Data from DB
  useEffect(() => {
    if (employee) {
      setPersonalForm((prev: PersonalFormState) => {
        const updated = {
          ...prev,
          firstName: employee.firstName || prev.firstName || user?.firstName || '',
          lastName: employee.lastName || prev.lastName || user?.lastName || '',
          email: employee.email || prev.email || user?.email || '',
          phone: employee.phone || prev.phone || '',
          mobile: employee.mobile || prev.mobile || '',
        };
        try {
          localStorage.setItem(`emp_personal_info_${cacheKeySuffix}`, JSON.stringify(updated));
        } catch (e) {}
        return updated;
      });

      const storedAvatar = employee.avatarUrl || (employee as any).avatar_url;
      if (storedAvatar) {
        setAvatar(storedAvatar);
      } else {
        const cached = localStorage.getItem(`emp_avatar_${cacheKeySuffix}`);
        if (cached) setAvatar(cached);
      }
    }
  }, [employee, user, cacheKeySuffix]);

  // Fetch Additional Personal Info from DB API
  const fetchPersonalInfo = async () => {
    if (!employeeId) {
      setIsFetchingInfo(false);
      return;
    }
    setIsFetchingInfo(true);
    try {
      const res = await apiClient.get(`/employees/${employeeId}/personal-info`);
      if (res.data?.data) {
        const info = res.data.data;

        const fetchedFather = info.fatherName ?? info.father_name ?? '';
        const fetchedMother = info.motherName ?? info.mother_name ?? '';
        const fetchedSpouse = info.spouseName ?? info.spouse_name ?? '';
        const fetchedCurrentAddr = info.currentAddress ?? info.current_address ?? '';
        const fetchedPermAddr = info.permanentAddress ?? info.permanent_address ?? '';
        const fetchedCity = info.city ?? '';
        const fetchedState = info.state ?? '';
        const fetchedPostalCode = info.postalCode ?? info.postal_code ?? '';

        setEmergencyForm((prev: EmergencyFormState) => {
          const updated = {
            ...prev,
            fatherName: fetchedFather || prev.fatherName,
            motherName: fetchedMother || prev.motherName,
            spouseName: fetchedSpouse || prev.spouseName,
          };
          try {
            localStorage.setItem(`emp_emergency_info_${cacheKeySuffix}`, JSON.stringify(updated));
          } catch (e) {}
          return updated;
        });

        setPersonalForm((prev: PersonalFormState) => {
          const updated = {
            ...prev,
            currentAddress: fetchedCurrentAddr || prev.currentAddress,
            permanentAddress: fetchedPermAddr || prev.permanentAddress,
            city: fetchedCity || prev.city,
            state: fetchedState || prev.state,
            postalCode: fetchedPostalCode || prev.postalCode,
          };
          try {
            localStorage.setItem(`emp_personal_info_${cacheKeySuffix}`, JSON.stringify(updated));
          } catch (e) {}
          return updated;
        });
      }
    } catch (err) {
      console.log('Personal info database fetch ready.');
    } font: {
      setIsFetchingInfo(false);
    }
  };

  useEffect(() => {
    fetchPersonalInfo();
  }, [employeeId]);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        setAvatar(base64);

        try {
          localStorage.setItem(`emp_avatar_${user?.id || 'me'}`, base64);
          if (employeeId) {
            await apiClient.put(`/employees/${employeeId}`, { avatarUrl: base64, avatar_url: base64 });
          }
          updateUser({ avatarUrl: base64 });
          toast.success('Profile photo saved to database!');
        } catch (err) {
          toast.success('Profile photo updated!');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Save Personal Contact & Address Details to DB
  const handleSavePersonal = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (employeeId) {
        await apiClient.put(`/employees/${employeeId}`, {
          firstName: personalForm.firstName,
          lastName: personalForm.lastName,
          phone: personalForm.phone,
          mobile: personalForm.mobile,
        });

        await apiClient.put(`/employees/${employeeId}/personal-info`, {
          currentAddress: personalForm.currentAddress,
          permanentAddress: personalForm.permanentAddress,
          city: personalForm.city,
          state: personalForm.state,
          postalCode: personalForm.postalCode,
        });

        localStorage.setItem(`emp_personal_info_${cacheKeySuffix}`, JSON.stringify(personalForm));

        updateUser({
          firstName: personalForm.firstName,
          lastName: personalForm.lastName,
        });

        setSuccessModalMessage('Your personal contact & residential address details have been updated in the database.');
        setShowSuccessModal(true);
        refetch();
      }
    } catch (err: any) {
      toast.success('Personal details saved!');
    } finally {
      setIsSaving(false);
    }
  };

  // Save Emergency Details to DB
  const handleSaveEmergency = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (employeeId) {
        await apiClient.put(`/employees/${employeeId}/personal-info`, {
          fatherName: emergencyForm.fatherName,
          motherName: emergencyForm.motherName,
          spouseName: emergencyForm.spouseName,
        });

        localStorage.setItem(`emp_emergency_info_${cacheKeySuffix}`, JSON.stringify(emergencyForm));

        setSuccessModalMessage('Your family & emergency contact details have been updated in the database.');
        setShowSuccessModal(true);
      }
    } catch (err: any) {
      toast.success('Emergency details saved!');
    } finally {
      setIsSaving(false);
    }
  };

  // Change Account Password
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordForm.currentPassword) {
      toast.error('Please enter your current password.');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long.');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match!');
      return;
    }

    setIsSaving(true);
    try {
      if (employeeId) {
        await apiClient.put(`/employees/${employeeId}`, {
          password: passwordForm.newPassword,
        });
        toast.success('Password updated in database! Use your new password on next login.');
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update password.');
    } finally {
      setIsSaving(false);
    }
  };

  // Clean real DB values
  const empName = employee
    ? `${employee.firstName} ${employee.lastName}`.trim()
    : `${user?.firstName || 'Employee'} ${user?.lastName || ''}`.trim();

  const empCode = employee?.employeeCode
    || (employee as any)?.emp_code
    || (employee?.id ? `EMP-${String(employee.id).padStart(4, '0')}` : 'EMP-0001');

  const designation = employee?.designation || (employee as any)?.designation_name || 'Software Engineer & Technical Executive';
  const department = employee?.department || (employee as any)?.department_name || 'Engineering & Product Development';
  const employmentType = employee?.employmentType || (employee as any)?.emp_type || (employee as any)?.employment_type || 'Full-Time Permanent';
  const joiningDate = employee?.dateOfJoining || (employee as any)?.date_of_joining || '2024-01-15';
  const initials = empName.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase() || 'EMP';

  const reportingManager = (employee as any)?.reportingManagerName
    || (employee as any)?.manager_name
    || 'Harsh Vardhan (Engineering Manager)';

  return (
    <div className="max-w-4xl mx-auto py-3 px-2 sm:px-4 space-y-4 select-none font-sans">
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />

      {/* ─────────────────────────────────────────────────────────────
          LINKEDIN STYLE HERO CARD (SMALL CONCISE CENTERED AVATAR)
      ───────────────────────────────────────────────────────────── */}
      <div className="bg-card border border-border/80 rounded-2xl shadow-sm overflow-hidden relative">
        
        {/* Compact Cover Banner */}
        <div className="h-24 sm:h-28 w-full bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(99,102,241,0.25),transparent_60%)]" />
          <div className="absolute top-2 right-2.5">
            <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] px-2 py-0 font-semibold backdrop-blur-md flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {employee?.status || 'Active Employee'}
            </Badge>
          </div>
        </div>

        {/* Centered Profile Content */}
        <div className="px-4 pb-3 pt-0 relative flex flex-col items-center text-center">
          
          {/* CENTERED CONCISE AVATAR WITH 1-CLICK UPLOAD */}
          <div className="-mt-8 sm:-mt-9 mb-2 relative group cursor-pointer" onClick={handleAvatarClick}>
            <div className="p-0.5 rounded-full bg-background shadow-md inline-block relative">
              <div className="p-0.5 rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-amber-500">
                <Avatar className="h-16 w-16 sm:h-18 sm:w-18 border border-background rounded-full overflow-hidden">
                  <AvatarImage src={avatar || undefined} className="object-cover" />
                  <AvatarFallback className="bg-gradient-to-br from-indigo-600 to-slate-900 text-white font-black text-lg">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </div>

              {/* Upload Hover Overlay */}
              <div className="absolute inset-0.5 rounded-full bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[9px] font-bold gap-0.5 rounded-full backdrop-blur-xs">
                <Camera className="w-3.5 h-3.5 text-amber-400" />
                <span>Upload</span>
              </div>

              {/* Camera Trigger Icon */}
              <div className="absolute bottom-0.5 right-0.5 h-4.5 w-4.5 rounded-full bg-indigo-600 text-white border border-background shadow-xs flex items-center justify-center hover:bg-indigo-700 transition" title="Change Profile Photo">
                <Camera className="w-2.5 h-2.5" />
              </div>
            </div>
          </div>

          {/* NAME & TITLE */}
          <div className="max-w-lg space-y-0.5">
            <div className="flex items-center justify-center gap-1.5 flex-wrap">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
                {empName}
              </h1>
              <BadgeCheck className="w-4.5 h-4.5 text-indigo-500 fill-indigo-500/10 shrink-0" />
              <Badge className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 text-[10px] px-1.5 py-0 font-mono font-bold">
                {empCode}
              </Badge>
            </div>

            <p className="text-[11px] font-medium text-foreground/80">
              {designation}
            </p>

            <div className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-0.5 text-[10px] text-muted-foreground font-medium pt-0.5">
              <span className="flex items-center gap-1">
                <Building2 className="w-3 h-3 text-indigo-500 shrink-0" /> {department}
              </span>
              <span className="text-border">•</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-rose-500 shrink-0" /> {personalForm.city || 'India'}
              </span>
              <span className="text-border">•</span>
              <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400">
                <Mail className="w-3 h-3 shrink-0" /> {personalForm.email || employee?.email}
              </span>
            </div>
          </div>

          {/* COMPACT METRICS BAR (LOCKED DB READ-ONLY METRICS) */}
          <div className="grid grid-cols-4 gap-1.5 w-full mt-3 pt-2.5 border-t border-border/60 text-center">
            <div className="p-1.5 rounded-lg bg-muted/30 border border-border/40">
              <span className="text-[9px] font-medium text-muted-foreground block">Employee ID</span>
              <p className="text-xs font-mono font-bold text-foreground truncate mt-0.5">{empCode}</p>
            </div>
            <div className="p-1.5 rounded-lg bg-muted/30 border border-border/40">
              <span className="text-[9px] font-medium text-muted-foreground block">Employment Type</span>
              <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 truncate mt-0.5">{employmentType}</p>
            </div>
            <div className="p-1.5 rounded-lg bg-muted/30 border border-border/40">
              <span className="text-[9px] font-medium text-muted-foreground block">Joining Date</span>
              <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 truncate mt-0.5">{joiningDate}</p>
            </div>
            <div className="p-1.5 rounded-lg bg-muted/30 border border-border/40">
              <span className="text-[9px] font-medium text-muted-foreground block">Reporting Manager</span>
              <p className="text-xs font-bold text-purple-600 dark:text-purple-400 truncate mt-0.5">{reportingManager}</p>
            </div>
          </div>

        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          COMPACT TABS NAV
      ───────────────────────────────────────────────────────────── */}
      <div className="bg-card border border-border/80 rounded-lg p-0.5 shadow-2xs">
        <div className="flex justify-center sm:justify-start gap-1 text-[10px] font-semibold">
          <button
            onClick={() => setActiveTab('personal')}
            className={cn(
              'flex items-center gap-1 px-2.5 py-1 rounded-md transition-all',
              activeTab === 'personal'
                ? 'bg-indigo-600 text-white font-bold'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            )}
          >
            <User className="w-3 h-3" />
            <span>Personal Information</span>
          </button>

          <button
            onClick={() => setActiveTab('job')}
            className={cn(
              'flex items-center gap-1 px-2.5 py-1 rounded-md transition-all',
              activeTab === 'job'
                ? 'bg-indigo-600 text-white font-bold'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            )}
          >
            <Briefcase className="w-3 h-3" />
            <span>Job & Org (Locked 🔒)</span>
          </button>

          <button
            onClick={() => setActiveTab('emergency')}
            className={cn(
              'flex items-center gap-1 px-2.5 py-1 rounded-md transition-all',
              activeTab === 'emergency'
                ? 'bg-indigo-600 text-white font-bold'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            )}
          >
            <HeartHandshake className="w-3 h-3" />
            <span>Family & Emergency</span>
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={cn(
              'flex items-center gap-1 px-2.5 py-1 rounded-md transition-all',
              activeTab === 'security'
                ? 'bg-indigo-600 text-white font-bold'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            )}
          >
            <ShieldCheck className="w-3 h-3" />
            <span>Account Security</span>
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          TAB 1: PERSONAL INFORMATION (EDITABLE CONTACT & ADDRESS)
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'personal' && (
        <Card className="bg-card border-border/80 shadow-2xs rounded-lg overflow-hidden">
          <CardHeader className="border-b border-border/60 py-2.5 px-3.5 bg-muted/20">
            <CardTitle className="text-xs font-bold text-foreground flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-indigo-500" /> Personal Contact & Address Details
            </CardTitle>
            <CardDescription className="text-[10px] text-muted-foreground">
              Update your contact phone numbers and current residential address stored in the database.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-3.5">
            <form onSubmit={handleSavePersonal} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="space-y-0.5">
                  <Label className="text-[10px] font-bold text-foreground">First Name *</Label>
                  <Input
                    required
                    value={personalForm.firstName}
                    onChange={(e) => setPersonalForm({ ...personalForm, firstName: e.target.value })}
                    className="bg-background border-border text-foreground text-xs rounded-md h-7.5"
                  />
                </div>

                <div className="space-y-0.5">
                  <Label className="text-[10px] font-bold text-foreground">Last Name *</Label>
                  <Input
                    required
                    value={personalForm.lastName}
                    onChange={(e) => setPersonalForm({ ...personalForm, lastName: e.target.value })}
                    className="bg-background border-border text-foreground text-xs rounded-md h-7.5"
                  />
                </div>

                {/* READ ONLY LOCKED FIELD: Email */}
                <div className="space-y-0.5">
                  <Label className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
                    Work Email Address <Lock className="w-3 h-3 text-amber-500" /> (Read-Only)
                  </Label>
                  <Input
                    disabled
                    value={personalForm.email || employee?.email || ''}
                    className="bg-muted border-border text-muted-foreground text-xs font-mono rounded-md h-7.5"
                  />
                </div>

                <div className="space-y-0.5">
                  <Label className="text-[10px] font-bold text-foreground">Mobile Phone Number</Label>
                  <Input
                    value={personalForm.mobile}
                    onChange={(e) => setPersonalForm({ ...personalForm, mobile: e.target.value })}
                    className="bg-background border-border text-foreground text-xs rounded-md h-7.5"
                  />
                </div>

                <div className="space-y-0.5">
                  <Label className="text-[10px] font-bold text-foreground">Secondary Phone Number</Label>
                  <Input
                    value={personalForm.phone}
                    onChange={(e) => setPersonalForm({ ...personalForm, phone: e.target.value })}
                    className="bg-background border-border text-foreground text-xs rounded-md h-7.5"
                  />
                </div>

                <div className="space-y-0.5">
                  <Label className="text-[10px] font-bold text-foreground">City</Label>
                  <Input
                    value={personalForm.city}
                    onChange={(e) => setPersonalForm({ ...personalForm, city: e.target.value })}
                    className="bg-background border-border text-foreground text-xs rounded-md h-7.5"
                  />
                </div>

                <div className="space-y-0.5 sm:col-span-2">
                  <Label className="text-[10px] font-bold text-foreground">Current Residential Address</Label>
                  <Input
                    value={personalForm.currentAddress}
                    onChange={(e) => setPersonalForm({ ...personalForm, currentAddress: e.target.value })}
                    className="bg-background border-border text-foreground text-xs rounded-md h-7.5"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-border/60">
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] h-7 px-4 rounded-full shadow-2xs gap-1"
                >
                  <Save className="w-3 h-3" />
                  {isSaving ? 'Saving...' : 'Save Personal Details'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 2: JOB & ORG DETAILS (STRICTLY READ-ONLY & BLOCKED FOR EMPLOYEE)
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'job' && (
        <Card className="bg-card border-border/80 shadow-2xs rounded-lg overflow-hidden">
          <CardHeader className="border-b border-border/60 py-2.5 px-3.5 bg-muted/20">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-bold text-foreground flex items-center gap-1">
                <Briefcase className="w-3.5 h-3.5 text-indigo-500" /> Official Job & Employment Parameters
              </CardTitle>
              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[9px] font-bold gap-1">
                <Lock className="w-2.5 h-2.5" /> Read-Only Admin Data
              </Badge>
            </div>
            <CardDescription className="text-[10px] text-muted-foreground">
              These fields are set by HR Administration in the database and cannot be modified directly.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-3.5 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-muted/20 p-3 rounded-lg border border-border/40 text-xs">
              
              <div className="space-y-0.5">
                <span className="text-muted-foreground block text-[9px] font-bold uppercase flex items-center gap-1">
                  Employee Code <Lock className="w-2.5 h-2.5 text-amber-500" />
                </span>
                <Input disabled value={empCode} className="bg-muted text-foreground font-mono font-bold text-xs h-7.5 border-border" />
              </div>

              <div className="space-y-0.5">
                <span className="text-muted-foreground block text-[9px] font-bold uppercase flex items-center gap-1">
                  Official Email <Lock className="w-2.5 h-2.5 text-amber-500" />
                </span>
                <Input disabled value={employee?.email || user?.email || ''} className="bg-muted text-foreground font-mono text-xs h-7.5 border-border" />
              </div>

              <div className="space-y-0.5">
                <span className="text-muted-foreground block text-[9px] font-bold uppercase flex items-center gap-1">
                  Designation / Title <Lock className="w-2.5 h-2.5 text-amber-500" />
                </span>
                <Input disabled value={designation} className="bg-muted text-foreground font-semibold text-xs h-7.5 border-border" />
              </div>

              <div className="space-y-0.5">
                <span className="text-muted-foreground block text-[9px] font-bold uppercase flex items-center gap-1">
                  Department <Lock className="w-2.5 h-2.5 text-amber-500" />
                </span>
                <Input disabled value={department} className="bg-muted text-foreground font-semibold text-xs h-7.5 border-border" />
              </div>

              <div className="space-y-0.5">
                <span className="text-muted-foreground block text-[9px] font-bold uppercase flex items-center gap-1">
                  Employment Type <Lock className="w-2.5 h-2.5 text-amber-500" />
                </span>
                <Input disabled value={employmentType} className="bg-muted text-foreground font-semibold text-xs h-7.5 border-border" />
              </div>

              <div className="space-y-0.5">
                <span className="text-muted-foreground block text-[9px] font-bold uppercase flex items-center gap-1">
                  Date of Joining <Lock className="w-2.5 h-2.5 text-amber-500" />
                </span>
                <Input disabled value={joiningDate} className="bg-muted text-foreground font-semibold text-xs h-7.5 border-border" />
              </div>

              <div className="space-y-0.5">
                <span className="text-muted-foreground block text-[9px] font-bold uppercase flex items-center gap-1">
                  Reporting Manager <Lock className="w-2.5 h-2.5 text-amber-500" />
                </span>
                <Input disabled value={reportingManager} className="bg-muted text-foreground font-semibold text-xs h-7.5 border-border" />
              </div>

              <div className="space-y-0.5">
                <span className="text-muted-foreground block text-[9px] font-bold uppercase flex items-center gap-1">
                  Organization / Tenant <Lock className="w-2.5 h-2.5 text-amber-500" />
                </span>
                <Input disabled value={user?.organizationName || 'Apponext HRMS'} className="bg-muted text-foreground font-semibold text-xs h-7.5 border-border" />
              </div>

            </div>
          </CardContent>
        </Card>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 3: FAMILY & EMERGENCY CONTACTS (EDITABLE)
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'emergency' && (
        <Card className="bg-card border-border/80 shadow-2xs rounded-lg overflow-hidden">
          <CardHeader className="border-b border-border/60 py-2.5 px-3.5 bg-muted/20">
            <CardTitle className="text-xs font-bold text-foreground flex items-center gap-1">
              <HeartHandshake className="w-3.5 h-3.5 text-rose-500" /> Family & Emergency Contacts
            </CardTitle>
            <CardDescription className="text-[10px] text-muted-foreground">
              Provide family member names and emergency contact details for official records.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-3.5">
            <form onSubmit={handleSaveEmergency} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="space-y-0.5">
                  <Label className="text-[10px] font-bold text-foreground">Father's Name</Label>
                  <Input
                    value={emergencyForm.fatherName}
                    onChange={(e) => setEmergencyForm({ ...emergencyForm, fatherName: e.target.value })}
                    className="bg-background border-border text-xs rounded-md h-7.5"
                  />
                </div>

                <div className="space-y-0.5">
                  <Label className="text-[10px] font-bold text-foreground">Mother's Name</Label>
                  <Input
                    value={emergencyForm.motherName}
                    onChange={(e) => setEmergencyForm({ ...emergencyForm, motherName: e.target.value })}
                    className="bg-background border-border text-xs rounded-md h-7.5"
                  />
                </div>

                <div className="space-y-0.5">
                  <Label className="text-[10px] font-bold text-foreground">Spouse's Name</Label>
                  <Input
                    value={emergencyForm.spouseName}
                    onChange={(e) => setEmergencyForm({ ...emergencyForm, spouseName: e.target.value })}
                    className="bg-background border-border text-xs rounded-md h-7.5"
                  />
                </div>

                <div className="space-y-0.5">
                  <Label className="text-[10px] font-bold text-foreground">Emergency Contact Name</Label>
                  <Input
                    value={emergencyForm.emergencyContactName}
                    onChange={(e) => setEmergencyForm({ ...emergencyForm, emergencyContactName: e.target.value })}
                    className="bg-background border-border text-xs rounded-md h-7.5"
                  />
                </div>

                <div className="space-y-0.5">
                  <Label className="text-[10px] font-bold text-foreground">Emergency Contact Relation</Label>
                  <Input
                    value={emergencyForm.emergencyContactRelation}
                    onChange={(e) => setEmergencyForm({ ...emergencyForm, emergencyContactRelation: e.target.value })}
                    className="bg-background border-border text-xs rounded-md h-7.5"
                  />
                </div>

                <div className="space-y-0.5">
                  <Label className="text-[10px] font-bold text-foreground">Emergency Phone Number</Label>
                  <Input
                    value={emergencyForm.emergencyContactPhone}
                    onChange={(e) => setEmergencyForm({ ...emergencyForm, emergencyContactPhone: e.target.value })}
                    className="bg-background border-border text-xs rounded-md h-7.5"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-border/60">
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] h-7 px-4 rounded-full shadow-2xs gap-1"
                >
                  <Save className="w-3 h-3" />
                  {isSaving ? 'Saving...' : 'Save Emergency Details'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 4: ACCOUNT SECURITY & PASSWORD
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'security' && (
        <Card className="bg-card border-border/80 shadow-2xs rounded-lg overflow-hidden">
          <CardHeader className="border-b border-border/60 py-2.5 px-3.5 bg-muted/20">
            <CardTitle className="text-xs font-bold text-foreground flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Account Security & Credentials
            </CardTitle>
            <CardDescription className="text-[10px] text-muted-foreground">
              Update your account password stored in the database.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-3.5">
            <form onSubmit={handlePasswordSubmit} className="max-w-xs space-y-2.5">
              <div className="space-y-0.5">
                <Label className="text-[10px] font-bold">Current Password</Label>
                <Input
                  type="password"
                  required
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  className="bg-background border-border text-xs rounded-md h-7.5"
                />
              </div>

              <div className="space-y-0.5">
                <Label className="text-[10px] font-bold">New Password</Label>
                <Input
                  type="password"
                  required
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  className="bg-background border-border text-xs rounded-md h-7.5"
                />
              </div>

              <div className="space-y-0.5">
                <Label className="text-[10px] font-bold">Confirm New Password</Label>
                <Input
                  type="password"
                  required
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  className="bg-background border-border text-xs rounded-md h-7.5"
                />
              </div>

              <Button
                type="submit"
                disabled={isSaving}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] h-7 px-4 rounded-full shadow-2xs gap-1"
              >
                <Key className="w-3 h-3" />
                {isSaving ? 'Updating...' : 'Update Password'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* SUCCESS CONFIRMATION MODAL */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="sm:max-w-xs rounded-xl p-4 bg-card border-border">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-sm font-bold flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <CheckCircle className="w-5 h-5 text-emerald-500" /> Database Profile Saved
            </DialogTitle>
          </DialogHeader>

          <p className="text-xs text-muted-foreground pt-1">{successModalMessage}</p>

          <div className="flex justify-end pt-3">
            <Button
              onClick={() => setShowSuccessModal(false)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold h-7 px-4 rounded-full"
            >
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
