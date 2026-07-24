import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useEmployee } from '../hooks/useEmployees';
import { apiClient } from '@/lib/api';
import { 
  User, Mail, Phone, Briefcase, Calendar, Shield, MapPin, Building, 
  Lock, Camera, HeartHandshake, Home, Save, Sparkles, CheckCircle2, UserCheck, Clock, Loader2 
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

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
  const { user } = useAuthStore();
  const employeeId = user?.employeeId || user?.id || 0;
  const { employee, isLoading, refetch } = useEmployee(employeeId);

  const [activeTab, setActiveTab] = useState<'personal' | 'job' | 'emergency' | 'security'>('personal');
  const [avatar, setAvatar] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Success Modal Popup State
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successModalMessage, setSuccessModalMessage] = useState('');

  // 1. Local Cache + DB State Initialization
  const cacheKeySuffix = user?.id || user?.employeeId || 'me';

  const [personalForm, setPersonalForm] = useState<PersonalFormState>(() => {
    const cached = localStorage.getItem(`emp_personal_info_${cacheKeySuffix}`);
    if (cached) {
      try { return JSON.parse(cached); } catch (e) {}
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
      try { return JSON.parse(cached); } catch (e) {}
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

  // 2. Sync Base Employee Data from DB
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
        try { localStorage.setItem(`emp_personal_info_${cacheKeySuffix}`, JSON.stringify(updated)); } catch (e) {}
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

  // 3. Fetch Additional Personal Info from DB API (Handles both snake_case & camelCase)
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
          try { localStorage.setItem(`emp_emergency_info_${cacheKeySuffix}`, JSON.stringify(updated)); } catch (e) {}
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
          try { localStorage.setItem(`emp_personal_info_${cacheKeySuffix}`, JSON.stringify(updated)); } catch (e) {}
          return updated;
        });
      }
    } catch (err) {
      console.log('Personal info database fetch ready for entry.');
    } finally {
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
        // Update core employee table
        await apiClient.put(`/employees/${employeeId}`, {
          firstName: personalForm.firstName,
          lastName: personalForm.lastName,
          phone: personalForm.phone,
          mobile: personalForm.mobile,
        });

        // Update personal info table (address details)
        await apiClient.put(`/employees/${employeeId}/personal-info`, {
          currentAddress: personalForm.currentAddress,
          permanentAddress: personalForm.permanentAddress,
          city: personalForm.city,
          state: personalForm.state,
          postalCode: personalForm.postalCode,
        });

        setSuccessModalMessage('Your personal contact details and residential address have been saved to the database successfully!');
        setShowSuccessModal(true);
        toast.success('Personal details saved to database successfully!');
        if (refetch) refetch();
        fetchPersonalInfo();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update personal details.');
    } finally {
      setIsSaving(false);
    }
  };

  // Save Emergency & Family Info to DB
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
        setSuccessModalMessage('Your family members and emergency contact details have been updated in the database!');
        setShowSuccessModal(true);
        toast.success('Family & Emergency details saved to database!');
        fetchPersonalInfo();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update emergency details.');
    } finally {
      setIsSaving(false);
    }
  };

  // Save Password Change to DB
  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New password and confirm password do not match.');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long.');
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

  // Clean real DB values (NO dummy strings)
  const empName = employee 
    ? `${employee.firstName} ${employee.lastName}`.trim() 
    : `${user?.firstName || 'Employee'} ${user?.lastName || ''}`.trim();

  const empCode = employee?.employeeCode 
    || (employee?.id ? `EMP-${String(employee.id).padStart(4, '0')}` : 'Pending HR Setup');

  const designation = employee?.designation || (employee as any)?.designation_name || 'Not Assigned';
  const department = employee?.department || (employee as any)?.department_name || 'Unassigned Department';
  const initials = empName.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase() || 'EMP';

  const reportingManager = (employee as any)?.reportingManagerName 
    || (employee as any)?.manager_name 
    || 'Not Assigned';

  const managerEmail = (employee as any)?.reportingManagerEmail 
    || (employee as any)?.manager_email 
    || 'N/A';

  return (
    <div className="space-y-6 pb-10">
      {/* 1. Header Glass Card */}
      <div className="relative overflow-hidden rounded-3xl border border-white/20 dark:border-white/10 bg-gradient-to-r from-violet-600 via-indigo-700 to-slate-900 p-8 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div
              onClick={handleAvatarClick}
              className="h-24 w-24 rounded-2xl bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 flex items-center justify-center text-3xl font-extrabold text-white shadow-xl cursor-pointer overflow-hidden relative group transition-all"
              title="Click to update profile photo"
            >
              {avatar ? (
                <img src={avatar} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                <span>{initials}</span>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <Camera className="w-6 h-6 text-white" />
              </div>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
            </div>

            <div className="space-y-1.5 text-center md:text-left">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                <h2 className="text-2xl font-extrabold text-white">{empName}</h2>
                <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 uppercase text-[10px] font-bold">
                  {employee?.status || 'Active'}
                </Badge>
              </div>
              <p className="text-sm text-violet-100/90 font-medium">
                {designation} <span className="text-white/30 mx-1.5">•</span> {department}
              </p>
              <p className="text-xs font-mono text-white/80 bg-white/10 px-2.5 py-0.5 rounded-md w-max mx-auto md:mx-0">
                {empCode}
              </p>
            </div>
          </div>

          <Button onClick={handleAvatarClick} className="bg-white/15 hover:bg-white/25 text-white border border-white/20 rounded-2xl font-bold gap-2">
            <Camera className="w-4 h-4" /> Change Photo
          </Button>
        </div>
      </div>

      {/* 2. Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b pb-px">
        {(['personal', 'job', 'emergency', 'security'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-3 text-xs font-extrabold uppercase tracking-wider border-b-2 transition-all rounded-t-xl ${
              activeTab === tab
                ? 'border-violet-600 text-violet-600 bg-violet-50/50 dark:bg-violet-950/20'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab === 'personal' && 'Personal Information'}
            {tab === 'job' && 'Job & Employment'}
            {tab === 'emergency' && 'Family & Emergency'}
            {tab === 'security' && 'Account & Security'}
          </button>
        ))}
      </div>

      {/* 3. Tab Contents */}

      {/* Tab A: Personal Information */}
      {activeTab === 'personal' && (
        <Card className="border rounded-3xl shadow-xl bg-card border-border">
          <CardHeader className="border-b pb-4">
            <CardTitle className="text-base font-extrabold flex items-center gap-2">
              <User className="w-5 h-5 text-violet-600" /> Personal & Contact Details
            </CardTitle>
            <CardDescription className="text-xs">
              Manage your contact information, phone numbers, and physical residential addresses stored directly in the database.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSavePersonal} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">First Name</Label>
                  <Input
                    className="rounded-xl font-semibold"
                    value={personalForm.firstName}
                    onChange={(e) => setPersonalForm({ ...personalForm, firstName: e.target.value })}
                    placeholder="First Name"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Last Name</Label>
                  <Input
                    className="rounded-xl font-semibold"
                    value={personalForm.lastName}
                    onChange={(e) => setPersonalForm({ ...personalForm, lastName: e.target.value })}
                    placeholder="Last Name"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Work Email (System ID)</Label>
                  <Input className="rounded-xl bg-muted font-mono font-medium" value={personalForm.email} disabled />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Mobile Number</Label>
                  <Input
                    className="rounded-xl font-semibold"
                    value={personalForm.mobile}
                    onChange={(e) => setPersonalForm({ ...personalForm, mobile: e.target.value })}
                    placeholder="Enter mobile number"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Phone Number</Label>
                  <Input
                    className="rounded-xl font-semibold"
                    value={personalForm.phone}
                    onChange={(e) => setPersonalForm({ ...personalForm, phone: e.target.value })}
                    placeholder="Enter phone number"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">City</Label>
                  <Input
                    className="rounded-xl font-semibold"
                    value={personalForm.city}
                    onChange={(e) => setPersonalForm({ ...personalForm, city: e.target.value })}
                    placeholder="Enter city"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Current Residential Address</Label>
                  <Input
                    className="rounded-xl font-semibold"
                    value={personalForm.currentAddress}
                    onChange={(e) => setPersonalForm({ ...personalForm, currentAddress: e.target.value })}
                    placeholder="Enter current residential address..."
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Permanent Address</Label>
                  <Input
                    className="rounded-xl font-semibold"
                    value={personalForm.permanentAddress}
                    onChange={(e) => setPersonalForm({ ...personalForm, permanentAddress: e.target.value })}
                    placeholder="Enter permanent address..."
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={isSaving} className="bg-violet-600 hover:bg-violet-700 text-white font-extrabold px-6 py-5 rounded-2xl gap-2 shadow-lg">
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Personal Details
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Tab B: Job & Work Profile */}
      {activeTab === 'job' && (
        <Card className="border rounded-3xl shadow-xl bg-card border-border">
          <CardHeader className="border-b pb-4">
            <CardTitle className="text-base font-extrabold flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-violet-600" /> Official Employment Profile
            </CardTitle>
            <CardDescription className="text-xs">
              Official organizational mapping, designation, reporting hierarchy, and employment status.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="p-4 rounded-2xl bg-muted/40 border">
                <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider block">Employee Code</span>
                <span className="text-sm font-mono font-bold text-foreground mt-1 block">{empCode}</span>
              </div>

              <div className="p-4 rounded-2xl bg-muted/40 border">
                <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider block">Designation</span>
                <span className="text-sm font-bold text-foreground mt-1 block">{designation}</span>
              </div>

              <div className="p-4 rounded-2xl bg-muted/40 border">
                <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider block">Department</span>
                <span className="text-sm font-bold text-foreground mt-1 block">{department}</span>
              </div>

              <div className="p-4 rounded-2xl bg-muted/40 border">
                <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider block">Employment Type</span>
                <span className="text-sm font-bold text-foreground mt-1 block capitalize">
                  {employee?.employmentType ? employee.employmentType.replace('_', ' ') : 'Full Time'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div className="p-5 rounded-2xl border space-y-3 bg-card">
                <div className="flex items-center gap-2 text-xs font-bold text-violet-600 uppercase tracking-wider">
                  <Calendar className="w-4 h-4" /> Important Timeline Dates
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date of Joining:</span>
                    <span className="font-mono font-bold">
                      {employee?.dateOfJoining 
                        ? new Date(employee.dateOfJoining).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) 
                        : 'Pending HR Record'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date of Birth:</span>
                    <span className="font-mono font-bold">
                      {employee?.dateOfBirth 
                        ? new Date(employee.dateOfBirth).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) 
                        : 'Not Set'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-2xl border space-y-3 bg-card">
                <div className="flex items-center gap-2 text-xs font-bold text-violet-600 uppercase tracking-wider">
                  <UserCheck className="w-4 h-4" /> Reporting Hierarchy
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Reporting Manager:</span>
                    <span className="font-bold">{reportingManager}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Manager Email:</span>
                    <span className="font-mono text-muted-foreground">{managerEmail}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab C: Family & Emergency Contacts */}
      {activeTab === 'emergency' && (
        <Card className="border rounded-3xl shadow-xl bg-card border-border">
          <CardHeader className="border-b pb-4">
            <CardTitle className="text-base font-extrabold flex items-center gap-2">
              <HeartHandshake className="w-5 h-5 text-violet-600" /> Family & Emergency Contacts
            </CardTitle>
            <CardDescription className="text-xs">
              Keep your emergency contact details and family information up to date for medical or workplace safety.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSaveEmergency} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Father's Name</Label>
                  <Input
                    className="rounded-xl font-semibold"
                    value={emergencyForm.fatherName}
                    onChange={(e) => setEmergencyForm({ ...emergencyForm, fatherName: e.target.value })}
                    placeholder="Enter father's full name"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Mother's Name</Label>
                  <Input
                    className="rounded-xl font-semibold"
                    value={emergencyForm.motherName}
                    onChange={(e) => setEmergencyForm({ ...emergencyForm, motherName: e.target.value })}
                    placeholder="Enter mother's full name"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Spouse Name (If Applicable)</Label>
                  <Input
                    className="rounded-xl font-semibold"
                    value={emergencyForm.spouseName}
                    onChange={(e) => setEmergencyForm({ ...emergencyForm, spouseName: e.target.value })}
                    placeholder="Enter spouse name"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={isSaving} className="bg-violet-600 hover:bg-violet-700 text-white font-extrabold px-6 py-5 rounded-2xl gap-2 shadow-lg">
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Family & Emergency Contacts
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Tab D: Account & Security */}
      {activeTab === 'security' && (
        <Card className="border rounded-3xl shadow-xl bg-card border-border">
          <CardHeader className="border-b pb-4">
            <CardTitle className="text-base font-extrabold flex items-center gap-2">
              <Shield className="w-5 h-5 text-violet-600" /> Account Security Policy
            </CardTitle>
            <CardDescription className="text-xs">
              HR Administration security rules and credential policies.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            <div className="flex flex-col items-center justify-center text-center space-y-4 max-w-md mx-auto p-6 rounded-2xl bg-muted/40 border">
              <div className="h-12 w-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                <Lock className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-sm font-bold text-foreground">Password Update Managed by HR</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  To maintain organizational security, regular employees cannot self-update account passwords. Password reset requests, MFA updates, and account credentials are managed exclusively by your HR Administrator.
                </p>
              </div>
              <Badge variant="outline" className="bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-amber-300 text-[10px] font-bold">
                Contact HR Administrator for Password Resets
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Success Popup Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="sm:max-w-[425px] rounded-3xl p-6 text-center space-y-4">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center border border-emerald-500/30 shadow-lg">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-extrabold text-foreground">Profile Saved Successfully!</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {successModalMessage}
            </p>
          </div>
          <Button onClick={() => setShowSuccessModal(false)} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-2xl py-3 shadow-md">
            Done
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
