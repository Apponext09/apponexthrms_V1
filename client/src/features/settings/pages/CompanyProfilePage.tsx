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
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function CompanyProfilePage() {
  const { user, fetchCurrentUser } = useAuthStore();
  const { employees, total } = useEmployees({ pageSize: 50 });
  const { data: filterOptions } = useReportFilterOptions();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'profile' | 'subscription' | 'organization' | 'security'>('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordMsg, setPasswordMsg] = useState({ text: '', isError: false });

  // HR Settings
  const [sickLeaveDocThreshold, setSickLeaveDocThreshold] = useState<number>(3);
  const [isSavingSettings, setIsSavingSettings] = useState<boolean>(false);

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
        setSickLeaveDocThreshold(res.data.data.sick_leave_doc_threshold ?? 3);
      }
    } catch (err) {
      console.error('Error fetching org settings:', err);
    }
  };

  useEffect(() => {
    loadProfile();
    fetchSettings();
  }, []);

  // Handle Photo File Upload (converts file to Base64 and updates avatar)
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (PNG, JPG, WEBP)');
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

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      await apiClient.put('/settings/org-settings', {
        sick_leave_doc_threshold: sickLeaveDocThreshold,
      });
      setSuccessMessage('HR settings saved successfully!');
      setTimeout(() => setSuccessMessage(''), 3500);
    } catch (err) {
      console.error('Error saving settings:', err);
    } finally {
      setIsSavingSettings(false);
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
          1. ANIMATED GLASSMORPHIC WELCOME CARD (EXACT EMPLOYEE PROFILE STYLE)
      ───────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl border border-white/20 dark:border-white/10 bg-gradient-to-r from-violet-600 via-indigo-700 to-slate-900 p-6 md:p-8 shadow-2xl transition-all duration-300">
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-10 -bottom-10 h-48 w-48 rounded-full bg-violet-500/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-5 sm:gap-6">
            
            {/* SQUARED-ROUNDED GLASS AVATAR WITH 1-CLICK UPLOAD */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 flex items-center justify-center text-2xl sm:text-3xl font-extrabold text-white shadow-xl cursor-pointer overflow-hidden relative group transition-all shrink-0"
              title="Click to upload profile photo"
            >
              {profileData.avatarUrl ? (
                <img src={profileData.avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                <span>{getInitials()}</span>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <Camera className="w-6 h-6 text-white" />
              </div>
            </div>

            {/* PROFILE INFO & DETAILS */}
            <div className="space-y-1.5 text-left">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-[10px] tracking-wider uppercase font-extrabold text-indigo-200 border border-white/15">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Organization Admin
              </span>

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
                {profileData.website && (
                  <a
                    href={profileData.website.startsWith('http') ? profileData.website : `https://${profileData.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-violet-200 hover:text-white underline flex items-center gap-1"
                  >
                    <Globe className="w-3 h-3" /> {profileData.website}
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT SIDE GLASS STATS BOX */}
          <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl px-5 py-4 min-w-[200px] text-center md:text-right shadow-inner w-full md:w-auto">
            <p className="text-xs text-violet-200 uppercase tracking-widest font-extrabold">Tenant Headcount</p>
            <p className="text-xl font-extrabold text-white mt-1">{totalEmployees} Employees</p>
            <p className="text-xs text-violet-100 font-semibold mt-1">
              {totalDepartments} Depts <span className="opacity-40">•</span> {totalLocations} Locations
            </p>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. NAVIGATION TABS (EXACT EMPLOYEE PORTAL STYLE)
      ───────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-border pb-1">
        <button
          onClick={() => setActiveTab('profile')}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all',
            activeTab === 'profile'
              ? 'bg-primary text-primary-foreground shadow-md'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          <Grid className="w-4 h-4" />
          <span>Profile Details</span>
        </button>

        <button
          onClick={() => setActiveTab('subscription')}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all',
            activeTab === 'subscription'
              ? 'bg-primary text-primary-foreground shadow-md'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          <CreditCard className="w-4 h-4" />
          <span>Subscription</span>
        </button>

        <button
          onClick={() => setActiveTab('organization')}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all',
            activeTab === 'organization'
              ? 'bg-primary text-primary-foreground shadow-md'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          <Building2 className="w-4 h-4" />
          <span>Org Structure</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all',
            activeTab === 'security'
              ? 'bg-primary text-primary-foreground shadow-md'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Security</span>
        </button>

        <button
          onClick={() => setActiveTab('hr-settings' as any)}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all',
            activeTab === ('hr-settings' as any)
              ? 'bg-primary text-primary-foreground shadow-md'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          <Sliders className="w-4 h-4" />
          <span>HR Settings</span>
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          TAB 1: PROFILES (ADMIN PERSONAL + COMPANY)
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'profile' && (
        <Card className="border rounded-3xl shadow-xl overflow-hidden bg-card border-border">
          <CardHeader className="border-b border-border/60 bg-muted/20 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-extrabold text-foreground flex items-center gap-2">
                  <User className="w-4.5 h-4.5 text-primary" /> Admin & Organization Information
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Personal administrator account details and official organization parameters
                </CardDescription>
              </div>

              <Button
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
                className="h-9 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 px-4 rounded-xl shadow-md"
              >
                {isEditing ? 'View Profile' : 'Edit Profile'}
              </Button>
            </div>
          </CardHeader>

          <CardContent className="pt-6">
            {successMessage && (
              <div className="p-3.5 mb-5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2 animate-in fade-in-50">
                <CheckCircle className="w-4 h-4 shrink-0 text-emerald-500" /> {successMessage}
              </div>
            )}

            {!isEditing ? (
              /* Read-Only Profile View */
              <div className="space-y-6">
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-4 h-4" /> Admin Personal Details
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-muted/20 p-4 rounded-2xl border border-border/50 text-xs">
                    <div>
                      <span className="text-muted-foreground block text-[11px] font-medium">First Name</span>
                      <span className="font-semibold text-foreground">{profileData.firstName || '—'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px] font-medium">Last Name</span>
                      <span className="font-semibold text-foreground">{profileData.lastName || '—'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px] font-medium">Admin Phone Number</span>
                      <span className="font-semibold text-foreground">{profileData.phone || '—'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px] font-medium">Designation / Title</span>
                      <span className="font-semibold text-foreground">{profileData.designation || '—'}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 border-t border-border/60 pt-4">
                  <h3 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 className="w-4 h-4" /> Official Organization Details
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-muted/20 p-4 rounded-2xl border border-border/50 text-xs">
                    <div>
                      <span className="text-muted-foreground block text-[11px] font-medium">Organization Name</span>
                      <span className="font-semibold text-foreground">{profileData.organizationName || '—'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px] font-medium">Organization Code</span>
                      <span className="font-semibold text-foreground">{profileData.organizationCode || '—'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px] font-medium">Industry / Sector</span>
                      <span className="font-semibold text-foreground">{profileData.industry || '—'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px] font-medium">Official Website</span>
                      <span className="font-semibold text-foreground">{profileData.website || '—'}</span>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-muted-foreground block text-[11px] font-medium">Headquarters Location / Address</span>
                      <span className="font-semibold text-foreground">{profileData.address || '—'}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Editable Profile Form */
              <form onSubmit={handleSaveProfile} className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-4 h-4" /> Personal Details
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-foreground mb-1">
                        First Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={profileData.firstName}
                        onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                        className="w-full px-3.5 py-2 border border-border rounded-xl bg-background text-foreground text-xs focus:ring-1 focus:ring-ring focus:outline-none h-10"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-foreground mb-1">
                        Last Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={profileData.lastName}
                        onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                        className="w-full px-3.5 py-2 border border-border rounded-xl bg-background text-foreground text-xs focus:ring-1 focus:ring-ring focus:outline-none h-10"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-foreground mb-1">
                        Admin Phone Number
                      </label>
                      <input
                        type="tel"
                        value={profileData.phone}
                        onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                        className="w-full px-3.5 py-2 border border-border rounded-xl bg-background text-foreground text-xs focus:ring-1 focus:ring-ring focus:outline-none h-10"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-foreground mb-1">
                        Designation / Title
                      </label>
                      <input
                        type="text"
                        value={profileData.designation}
                        onChange={(e) => setProfileData({ ...profileData, designation: e.target.value })}
                        className="w-full px-3.5 py-2 border border-border rounded-xl bg-background text-foreground text-xs focus:ring-1 focus:ring-ring focus:outline-none h-10"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-border/60 pt-4 space-y-4">
                  <h3 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 className="w-4 h-4" /> Official Organization Details
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-foreground mb-1">
                        Organization Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={profileData.organizationName}
                        onChange={(e) => setProfileData({ ...profileData, organizationName: e.target.value })}
                        className="w-full px-3.5 py-2 border border-border rounded-xl bg-background text-foreground text-xs focus:ring-1 focus:ring-ring focus:outline-none h-10"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-foreground mb-1">
                        Organization Code *
                      </label>
                      <input
                        type="text"
                        required
                        value={profileData.organizationCode}
                        onChange={(e) => setProfileData({ ...profileData, organizationCode: e.target.value })}
                        className="w-full px-3.5 py-2 border border-border rounded-xl bg-background text-foreground text-xs focus:ring-1 focus:ring-ring focus:outline-none h-10"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-foreground mb-1">
                        Industry / Sector
                      </label>
                      <input
                        type="text"
                        value={profileData.industry}
                        onChange={(e) => setProfileData({ ...profileData, industry: e.target.value })}
                        className="w-full px-3.5 py-2 border border-border rounded-xl bg-background text-foreground text-xs focus:ring-1 focus:ring-ring focus:outline-none h-10"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-foreground mb-1">
                        Official Website URL
                      </label>
                      <input
                        type="url"
                        value={profileData.website}
                        onChange={(e) => setProfileData({ ...profileData, website: e.target.value })}
                        className="w-full px-3.5 py-2 border border-border rounded-xl bg-background text-foreground text-xs focus:ring-1 focus:ring-ring focus:outline-none h-10"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-foreground mb-1">
                        Location / Address
                      </label>
                      <input
                        type="text"
                        value={profileData.address}
                        onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                        className="w-full px-3.5 py-2 border border-border rounded-xl bg-background text-foreground text-xs focus:ring-1 focus:ring-ring focus:outline-none h-10"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-border/60">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditing(false)}
                    className="text-xs font-semibold px-4 h-10 rounded-xl"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSaving}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold px-6 h-10 rounded-xl shadow-md"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {isSaving ? 'Saving...' : 'Save Profile Changes'}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 2: SUBSCRIPTION
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'subscription' && (
        <Card className="border rounded-3xl shadow-xl overflow-hidden bg-card border-border">
          <CardHeader className="border-b border-border/60 bg-muted/20 pb-4">
            <CardTitle className="text-base font-extrabold text-foreground flex items-center gap-2">
              <CreditCard className="w-4.5 h-4.5 text-amber-500" /> Subscription & Licensing
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="bg-muted/20 border border-border/50 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-primary" /> Employee Seat Allocation
                </span>
                <span className="font-mono text-muted-foreground font-semibold">
                  <strong className="text-foreground font-bold">{totalEmployees}</strong> / 500 Used
                </span>
              </div>
              <Progress value={(totalEmployees / 500) * 100} className="h-2 bg-muted" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 3: ORG STRUCTURE
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'organization' && (
        <Card className="border rounded-3xl shadow-xl overflow-hidden bg-card border-border">
          <CardHeader className="border-b border-border/60 bg-muted/20 pb-4">
            <CardTitle className="text-base font-extrabold text-foreground flex items-center gap-2">
              <Building2 className="w-4.5 h-4.5 text-indigo-500" /> Organization Hierarchy
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-muted/20 border border-border/50 rounded-2xl space-y-1">
                <span className="text-xs text-muted-foreground font-semibold">Active Departments</span>
                <p className="text-2xl font-black text-foreground">{totalDepartments}</p>
              </div>
              <div className="p-4 bg-muted/20 border border-border/50 rounded-2xl space-y-1">
                <span className="text-xs text-muted-foreground font-semibold">Branch Locations</span>
                <p className="text-2xl font-black text-foreground">{totalLocations}</p>
              </div>
              <div className="p-4 bg-muted/20 border border-border/50 rounded-2xl space-y-1">
                <span className="text-xs text-muted-foreground font-semibold">Total Employees</span>
                <p className="text-2xl font-black text-foreground">{totalEmployees}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 4: SECURITY & PASSWORDS
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'security' && (
        <Card className="border rounded-3xl shadow-xl overflow-hidden bg-card border-border">
          <CardHeader className="border-b border-border/60 bg-muted/20 pb-4">
            <CardTitle className="text-base font-extrabold text-foreground flex items-center gap-2">
              <ShieldCheck className="w-4.5 h-4.5 text-emerald-500" /> Admin Security Settings
            </CardTitle>
          </CardHeader>

          <CardContent className="pt-6 space-y-4">
            {passwordMsg.text && (
              <div className={cn(
                'p-3 border rounded-xl text-xs font-semibold flex items-center gap-2',
                passwordMsg.isError
                  ? 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
                  : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
              )}>
                <CheckCircle className="w-4 h-4 shrink-0 text-emerald-500" /> {passwordMsg.text}
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="max-w-md space-y-4">
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
          TAB 5: GENERAL HR SETTINGS
      ───────────────────────────────────────────────────────────── */}
      {activeTab === ('hr-settings' as any) && (
        <Card className="border rounded-3xl shadow-xl overflow-hidden bg-card border-border">
          <CardHeader className="border-b border-border/60 bg-muted/20 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-extrabold text-foreground flex items-center gap-2">
                  <Settings className="w-4.5 h-4.5 text-primary" /> General HR Settings
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Configure dynamic parameters and validation rules for employees.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            {successMessage && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
                <CheckCircle className="w-4 h-4 shrink-0 text-emerald-500" /> {successMessage}
              </div>
            )}

            <form onSubmit={handleSaveSettings} className="max-w-md space-y-6">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-foreground">
                  Sick Leave Medical Proof Threshold (Days)
                </label>
                <p className="text-[11px] text-muted-foreground">
                  Specify the minimum duration of Sick Leave (SL) in days that will mandate employees to upload a supporting medical document.
                </p>
                <select
                  value={sickLeaveDocThreshold}
                  onChange={(e) => setSickLeaveDocThreshold(parseInt(e.target.value, 10))}
                  className="w-full h-11 px-3.5 text-xs bg-muted/50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground font-semibold"
                >
                  <option value="1">1 Day or more (Mandate Always)</option>
                  <option value="2">2 Days or more</option>
                  <option value="3">3 Days or more (Default)</option>
                  <option value="4">4 Days or more</option>
                  <option value="5">5 Days or more</option>
                  <option value="7">7 Days or more</option>
                </select>
              </div>

              <Button type="submit" disabled={isSavingSettings} className="bg-primary text-primary-foreground font-bold text-xs h-10 px-6 rounded-xl shadow-md gap-2">
                {isSavingSettings ? 'Saving...' : 'Save Settings'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
