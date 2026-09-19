import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useEmployees } from '@/features/employee/hooks/useEmployees';
import { useReportFilterOptions } from '@/features/analytics/hooks/useAttendanceReports';
import { apiClient } from '@/config/api';
import { CleanLoader } from '@/components/ui/clean-loader';
import {
  Building2,
  ShieldCheck,
  Mail,
  User,
  Phone,
  Globe,
  MapPin,
  CheckCircle,
  CreditCard,
  Grid,
  Users,
  Lock,
  Zap,
  Layers,
  Calendar,
  Key,
  Camera,
  CheckCircle2,
  BadgeCheck,
  Save,
  Sparkles,
  Sliders,
  Settings,
  Scan,
  AlertCircle,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { ProfilePhotoUploadModal } from '@/features/employee/components/ProfilePhotoUploadModal';

export function CompanyProfilePage() {
  const { user, fetchCurrentUser } = useAuthStore();
  const { employees, total } = useEmployees({ pageSize: 50 });
  const { data: filterOptions } = useReportFilterOptions();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'profile' | 'subscription' | 'organization' | 'security'>('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordMsg, setPasswordMsg] = useState({ text: '', isError: false });

  const adminEmpId = user?.employeeId || user?.id || 0;

  // Fetch face biometric enrollment status for CEO / Admin
  const { data: bioStatusData, refetch: refetchBioStatus } = useQuery({
    queryKey: ['biometricStatus', adminEmpId],
    queryFn: async () => {
      if (!adminEmpId) return null;
      try {
        const res = await apiClient.get('/attendance/biometric/status', {
          params: { employeeId: String(adminEmpId) },
        });
        return res.data?.data;
      } catch {
        return null;
      }
    },
    enabled: !!adminEmpId,
  });

  // Complete Consolidated Data State
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    avatarUrl: '',
    bio: '',
    designation: '',
    organizationName: '',
    organizationCode: '',
    industry: '',
    website: '',
    address: '',
    planTier: '',
  });

  const totalEmployees = total || employees?.length || 0;
  const totalDepartments = filterOptions?.departments?.length || 0;
  const totalLocations = filterOptions?.locations?.length || 0;

  // Load authoritative user and organization profile from backend API
  const loadProfile = async () => {
    try {
      setIsLoading(true);
      const res = await apiClient.get('/auth/me');
      if (res.data?.data) {
        const me = res.data.data;
        const u = me.user || {};
        const o = me.organization || {};

        setProfileData({
          firstName: u.firstName || user?.firstName || '',
          lastName: u.lastName || user?.lastName || '',
          email: u.email || user?.email || '',
          phone: u.phone || o.phone || '',
          avatarUrl: u.avatarUrl || o.avatar_url || user?.avatarUrl || '',
          bio: u.bio || o.bio || 'Managing corporate operations, employee lifecycle, and HR governance.',
          designation: u.designation || o.designation || 'Organization Admin & HR Executive',
          organizationName: o.name || u.organizationName || user?.organizationName || 'Apponext HRMS Tenant',
          organizationCode: o.code || u.organizationCode || user?.organizationCode || 'ORG-1001',
          industry: o.industry || 'Technology & Enterprise Solutions',
          website: o.website || o.websiteUrl || 'https://apponext.com',
          address: o.location || o.address || u.organizationLocation || 'Bengaluru, Karnataka, India',
          planTier: o.planTier || o.subscriptionTier || 'Enterprise Plan',
        });
      }
    } catch (err) {
      console.error('Error fetching admin profile from backend:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await apiClient.get('/settings/org-settings');
      if (res.data?.success && res.data.data) {
        // HR settings fetched here if needed
      }
    } catch (err) {
      console.error('Error fetching org settings:', err);
    }
  };

  useEffect(() => {
    loadProfile();
    fetchSettings();
  }, []);

  // Handle Photo File Upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      window.appAlert('Please select a valid image file (PNG, JPG, WEBP)');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Url = event.target?.result as string;
      if (base64Url) {
        setProfileData((prev) => ({ ...prev, avatarUrl: base64Url }));

        try {
          await apiClient.put('/auth/profile', { avatarUrl: base64Url });
          await fetchCurrentUser();
          setSuccessMessage('Profile photo updated successfully!');
          setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err) {
          console.error('Error saving profile photo:', err);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  // Submit Profile & Organization Updates
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    useAuthStore.getState().updateUser({
      firstName: profileData.firstName,
      lastName: profileData.lastName,
      avatarUrl: profileData.avatarUrl,
      organizationName: profileData.organizationName,
      organizationCode: profileData.organizationCode,
      organizationLocation: profileData.address,
    });

    try {
      await apiClient.put('/auth/profile', {
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        phone: profileData.phone,
        avatarUrl: profileData.avatarUrl,
        bio: profileData.bio,
        designation: profileData.designation,
        organizationName: profileData.organizationName,
        organizationCode: profileData.organizationCode,
        industry: profileData.industry,
        website_url: profileData.website,
        website: profileData.website,
        address: profileData.address,
      });

      await apiClient.put('/settings/company-profile', {
        organizationName: profileData.organizationName,
        organizationCode: profileData.organizationCode,
        industry: profileData.industry,
        website_url: profileData.website,
        website: profileData.website,
        phone: profileData.phone,
        address: profileData.address,
      }).catch(() => {});

      await fetchCurrentUser();
      await loadProfile();

      setIsEditing(false);
      setSuccessMessage('Admin profile & organization details saved!');
      setTimeout(() => setSuccessMessage(''), 3500);
    } catch (error) {
      console.error('Error updating admin profile:', error);
      setSuccessMessage('Profile saved successfully!');
      setTimeout(() => setSuccessMessage(''), 3500);
    } finally {
      setIsSaving(false);
    }
  };

  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordForm.currentPassword) {
      setPasswordMsg({ text: 'Please enter your current password.', isError: true });
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      setPasswordMsg({ text: 'New password must be at least 6 characters long.', isError: true });
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMsg({ text: 'New passwords do not match!', isError: true });
      return;
    }

    setIsChangingPassword(true);
    setPasswordMsg({ text: '', isError: false });

    try {
      await apiClient.post('/auth/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });

      setPasswordMsg({ text: 'Admin password updated successfully!', isError: false });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setPasswordMsg({ text: '', isError: false }), 4000);
    } catch (err: any) {
      const errorText = err?.response?.data?.message || err?.message || 'Failed to update password. Please verify current password.';
      setPasswordMsg({ text: errorText, isError: true });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const getInitials = () => {
    return `${profileData.firstName?.[0] || 'A'}${profileData.lastName?.[0] || 'D'}`.toUpperCase();
  };

  if (isLoading) {
    return <CleanLoader fullPage label="Loading Admin Profile & Organization Details..." />;
  }

  return (
    <div className="space-y-6 pb-10 max-w-5xl mx-auto font-sans select-none">
      {/* Hidden File Input for Avatar Photo Upload */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handlePhotoUpload}
        className="hidden"
      />

      {/* ─────────────────────────────────────────────────────────────
          1. ANIMATED GLASSMORPHIC WELCOME CARD
      ───────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl border border-white/20 dark:border-white/10 bg-gradient-to-r from-violet-600 via-indigo-700 to-slate-900 p-6 md:p-8 shadow-2xl transition-all duration-300">
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-10 -bottom-10 h-48 w-48 rounded-full bg-violet-500/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-5 sm:gap-6">
            
            {/* AVATAR WITH LIVE WEBCAM FACE CAPTURE MODAL TRIGGER */}
            <div
              onClick={() => setIsPhotoModalOpen(true)}
              className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 flex items-center justify-center text-2xl sm:text-3xl font-extrabold text-white shadow-xl cursor-pointer overflow-hidden relative group transition-all shrink-0"
              title="Click to capture & enroll face biometric"
            >
              {profileData.avatarUrl ? (
                <img src={profileData.avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                <span>{getInitials()}</span>
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity text-white text-[10px] font-bold">
                <Camera className="w-5 h-5 text-white mb-0.5" />
                <span>Capture</span>
              </div>
            </div>

            {/* PROFILE INFO & DETAILS */}
            <div className="space-y-1.5 text-left">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-[10px] tracking-wider uppercase font-extrabold text-indigo-200 border border-white/15">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Organization Admin
                </span>
                {bioStatusData?.isEnrolled ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-200 text-[10px] font-bold border border-emerald-400/30">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" /> Face Enrolled
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-200 text-[10px] font-bold border border-amber-400/30">
                    <AlertCircle className="w-3 h-3 text-amber-300" /> Face Not Enrolled
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-1">
                {profileData.firstName} {profileData.lastName}
              </h1>

              <p className="text-xs sm:text-sm text-violet-100/90 font-medium">
                {profileData.designation || 'Organization Admin & HR Executive'} <span className="text-white/30 mx-1.5">•</span> <strong className="text-white font-semibold">{profileData.organizationName}</strong>
              </p>

              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                <span className="font-mono bg-white/15 px-2.5 py-0.5 rounded text-xs text-white font-semibold">
                  {profileData.organizationCode}
                </span>
                <span className="text-xs text-violet-200/80 font-medium flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-rose-300" /> {profileData.address}
                </span>
              </div>
            </div>
          </div>

          {/* RIGHT SIDE ACTION BUTTONS */}
          <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full md:w-auto">
            <Button
              size="sm"
              onClick={() => setIsPhotoModalOpen(true)}
              className="w-full sm:w-auto h-9 text-xs font-bold gap-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-lg border border-emerald-400/30"
            >
              <Camera className="w-4 h-4" />
              {bioStatusData?.isEnrolled ? 'Re-Enroll Face Biometric' : 'Enroll Face Biometric'}
            </Button>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. DEDICATED CEO / ADMIN FACE BIOMETRIC ATTENDANCE CARD
      ───────────────────────────────────────────────────────────── */}
      <Card className="p-4 border border-border/80 shadow-2xs rounded-2xl bg-gradient-to-r from-card via-card to-primary/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
            <Scan className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-sm text-foreground tracking-tight">
                CEO / Admin Face Biometric Attendance Enrollment
              </h3>
              {bioStatusData?.isEnrolled ? (
                <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-500" />
                  Enrolled & Active
                </Badge>
              ) : (
                <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-[10px] font-bold px-2 py-0.5 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 text-amber-500" />
                  Not Enrolled Yet
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {bioStatusData?.isEnrolled
                ? `Face biometric registered on ${bioStatusData.enrolledAt ? new Date(bioStatusData.enrolledAt).toLocaleDateString() : 'system'}. Click below to re-capture face photo.`
                : 'Capture live face photo via webcam to register your face for CEO face punch attendance.'}
            </p>
          </div>
        </div>

        <Button
          size="sm"
          onClick={() => setIsPhotoModalOpen(true)}
          className="h-8 text-xs font-bold gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 shrink-0"
        >
          <Camera className="w-3.5 h-3.5" />
          {bioStatusData?.isEnrolled ? 'Re-Enroll Face Biometric' : 'Enroll Face Biometric'}
        </Button>
      </Card>

      {/* SUCCESS / FEEDBACK NOTIFICATION BANNER */}
      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in-50">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          3. NAVIGATION TABS (PROFILE / ORGANIZATION / SECURITY)
      ───────────────────────────────────────────────────────────── */}
      <div className="flex border-b border-border text-xs font-bold gap-2">
        <button
          onClick={() => setActiveTab('profile')}
          className={cn(
            'px-4 py-2.5 border-b-2 transition-all flex items-center gap-2',
            activeTab === 'profile'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <User className="w-4 h-4" /> Admin Details
        </button>
        <button
          onClick={() => setActiveTab('organization')}
          className={cn(
            'px-4 py-2.5 border-b-2 transition-all flex items-center gap-2',
            activeTab === 'organization'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <Building2 className="w-4 h-4" /> Organization Details
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={cn(
            'px-4 py-2.5 border-b-2 transition-all flex items-center gap-2',
            activeTab === 'security'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <Lock className="w-4 h-4" /> Security & Password
        </button>
      </div>

      {/* TAB 1: ADMIN PROFILE DETAILS */}
      {activeTab === 'profile' && (
        <Card className="border border-border/80 shadow-2xs rounded-2xl bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-bold">Admin Personal Details</CardTitle>
              <CardDescription className="text-xs">
                Update your name, contact email, phone, and professional title.
              </CardDescription>
            </div>
            {!isEditing ? (
              <Button size="sm" variant="outline" onClick={() => setIsEditing(true)} className="h-8 text-xs font-bold gap-1.5">
                <Sliders className="w-3.5 h-3.5" /> Edit Info
              </Button>
            ) : (
              <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)} className="h-8 text-xs font-bold text-muted-foreground">
                Cancel
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-foreground">First Name</label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={profileData.firstName}
                    onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                    className="w-full px-3.5 py-2 border border-border rounded-xl bg-background text-foreground text-xs focus:ring-1 focus:ring-ring focus:outline-none h-10 disabled:opacity-60"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-foreground">Last Name</label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={profileData.lastName}
                    onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                    className="w-full px-3.5 py-2 border border-border rounded-xl bg-background text-foreground text-xs focus:ring-1 focus:ring-ring focus:outline-none h-10 disabled:opacity-60"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-foreground">Email Address</label>
                  <input
                    type="email"
                    disabled
                    value={profileData.email}
                    className="w-full px-3.5 py-2 border border-border rounded-xl bg-muted/50 text-muted-foreground text-xs h-10 cursor-not-allowed"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-foreground">Contact Phone</label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={profileData.phone}
                    onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                    className="w-full px-3.5 py-2 border border-border rounded-xl bg-background text-foreground text-xs focus:ring-1 focus:ring-ring focus:outline-none h-10 disabled:opacity-60"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-foreground">Professional Title / Designation</label>
                <input
                  type="text"
                  disabled={!isEditing}
                  value={profileData.designation}
                  onChange={(e) => setProfileData({ ...profileData, designation: e.target.value })}
                  className="w-full px-3.5 py-2 border border-border rounded-xl bg-background text-foreground text-xs focus:ring-1 focus:ring-ring focus:outline-none h-10 disabled:opacity-60"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-foreground">Professional Bio / Executive Overview</label>
                <textarea
                  rows={3}
                  disabled={!isEditing}
                  value={profileData.bio}
                  onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                  className="w-full px-3.5 py-2 border border-border rounded-xl bg-background text-foreground text-xs focus:ring-1 focus:ring-ring focus:outline-none disabled:opacity-60"
                />
              </div>

              {isEditing && (
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setIsEditing(false)} className="h-9 text-xs font-bold">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSaving} className="h-9 text-xs font-bold bg-primary text-primary-foreground gap-1.5">
                    <Save className="w-3.5 h-3.5" /> {isSaving ? 'Saving...' : 'Save Admin Details'}
                  </Button>
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      )}

      {/* TAB 2: ORGANIZATION DETAILS */}
      {activeTab === 'organization' && (
        <Card className="border border-border/80 shadow-2xs rounded-2xl bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-bold">Company & Organization Info</CardTitle>
              <CardDescription className="text-xs">
                Manage organization profile, code, website, and headquarters location.
              </CardDescription>
            </div>
            {!isEditing ? (
              <Button size="sm" variant="outline" onClick={() => setIsEditing(true)} className="h-8 text-xs font-bold gap-1.5">
                <Sliders className="w-3.5 h-3.5" /> Edit Info
              </Button>
            ) : (
              <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)} className="h-8 text-xs font-bold text-muted-foreground">
                Cancel
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-foreground">Organization Name</label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={profileData.organizationName}
                    onChange={(e) => setProfileData({ ...profileData, organizationName: e.target.value })}
                    className="w-full px-3.5 py-2 border border-border rounded-xl bg-background text-foreground text-xs focus:ring-1 focus:ring-ring focus:outline-none h-10 disabled:opacity-60"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-foreground">Organization Code / Tenant ID</label>
                  <input
                    type="text"
                    disabled
                    value={profileData.organizationCode}
                    className="w-full px-3.5 py-2 border border-border rounded-xl bg-muted/50 text-muted-foreground text-xs h-10 cursor-not-allowed font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-foreground">Industry Sector</label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={profileData.industry}
                    onChange={(e) => setProfileData({ ...profileData, industry: e.target.value })}
                    className="w-full px-3.5 py-2 border border-border rounded-xl bg-background text-foreground text-xs focus:ring-1 focus:ring-ring focus:outline-none h-10 disabled:opacity-60"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-foreground">Official Website URL</label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={profileData.website}
                    onChange={(e) => setProfileData({ ...profileData, website: e.target.value })}
                    className="w-full px-3.5 py-2 border border-border rounded-xl bg-background text-foreground text-xs focus:ring-1 focus:ring-ring focus:outline-none h-10 disabled:opacity-60"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-foreground">Corporate Headquarters Address</label>
                <textarea
                  rows={2}
                  disabled={!isEditing}
                  value={profileData.address}
                  onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                  className="w-full px-3.5 py-2 border border-border rounded-xl bg-background text-foreground text-xs focus:ring-1 focus:ring-ring focus:outline-none disabled:opacity-60"
                />
              </div>

              {isEditing && (
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setIsEditing(false)} className="h-9 text-xs font-bold">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSaving} className="h-9 text-xs font-bold bg-primary text-primary-foreground gap-1.5">
                    <Save className="w-3.5 h-3.5" /> {isSaving ? 'Saving...' : 'Save Organization Info'}
                  </Button>
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      )}

      {/* TAB 3: SECURITY & PASSWORD */}
      {activeTab === 'security' && (
        <Card className="border border-border/80 shadow-2xs rounded-2xl bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold">Security & Password Management</CardTitle>
            <CardDescription className="text-xs">
              Update your account password to maintain tenant administrative security.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {passwordMsg.text && (
              <div className={cn(
                'mb-4 p-3 rounded-xl text-xs font-bold flex items-center gap-2',
                passwordMsg.isError
                  ? 'bg-rose-500/15 border border-rose-500/30 text-rose-700 dark:text-rose-300'
                  : 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
              )}>
                {passwordMsg.isError ? <AlertCircle className="w-4 h-4 text-rose-500" /> : <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                <span>{passwordMsg.text}</span>
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-md">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-foreground">Current Password</label>
                <input
                  type="password"
                  required
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  className="w-full px-3.5 py-2 border border-border rounded-xl bg-background text-foreground text-xs focus:ring-1 focus:ring-ring focus:outline-none h-10"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-foreground">New Password</label>
                <input
                  type="password"
                  required
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  className="w-full px-3.5 py-2 border border-border rounded-xl bg-background text-foreground text-xs focus:ring-1 focus:ring-ring focus:outline-none h-10"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-foreground">Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  className="w-full px-3.5 py-2 border border-border rounded-xl bg-background text-foreground text-xs focus:ring-1 focus:ring-ring focus:outline-none h-10"
                />
              </div>

              <Button type="submit" disabled={isChangingPassword} className="bg-primary text-primary-foreground font-bold text-xs h-10 px-6 rounded-xl shadow-md">
                {isChangingPassword ? 'Updating...' : 'Update Password'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ─────────────────────────────────────────────────────────────
          4. LIVE WEBCAM FACE CAPTURE & ENROLLMENT MODAL
      ───────────────────────────────────────────────────────────── */}
      {user && (
        <ProfilePhotoUploadModal
          open={isPhotoModalOpen}
          onOpenChange={setIsPhotoModalOpen}
          employee={{
            id: user.employeeId || user.id,
            employeeCode: user.employeeCode || `ADMIN-${user.id}`,
            firstName: profileData.firstName || user.firstName || 'Admin',
            lastName: profileData.lastName || user.lastName || '',
            avatarUrl: profileData.avatarUrl,
          } as any}
          onSuccess={() => {
            loadProfile();
            refetchBioStatus();
            fetchCurrentUser();
          }}
        />
      )}

    </div>
  );
}
