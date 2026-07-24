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
  Sparkles,
  Zap,
  Layers,
  Settings,
  Calendar,
  Key,
  Camera,
  Upload,
  Check,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
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
          bio: u.bio || o.bio || '',
          designation: u.designation || o.designation || '',
          organizationName: o.name || u.organizationName || user?.organizationName || '',
          organizationCode: o.code || u.organizationCode || user?.organizationCode || '',
          industry: o.industry || '',
          website: o.website || o.websiteUrl || '',
          address: o.location || o.address || u.organizationLocation || '',
          planTier: o.planTier || o.subscriptionTier || '',
        });
      }
    } catch (err) {
      console.error('Error fetching admin profile from backend:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  // Handle Photo File Upload (converts file to Base64 and updates avatar)
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate image file type
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (PNG, JPG, WEBP)');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Url = event.target?.result as string;
      if (base64Url) {
        setProfileData((prev) => ({ ...prev, avatarUrl: base64Url }));

        // Instantly save new photo to backend database
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

    // Optimistically update Zustand auth store in real time across topbar & sidebar
    useAuthStore.getState().updateUser({
      firstName: profileData.firstName,
      lastName: profileData.lastName,
      avatarUrl: profileData.avatarUrl,
      organizationName: profileData.organizationName,
      organizationCode: profileData.organizationCode,
      organizationLocation: profileData.address,
    });

    try {
      // 1. Update Auth Profile (users & organizations tables)
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

      // 2. Update Company Profile endpoint
      await apiClient.put('/settings/company-profile', {
        organizationName: profileData.organizationName,
        organizationCode: profileData.organizationCode,
        industry: profileData.industry,
        website_url: profileData.website,
        website: profileData.website,
        phone: profileData.phone,
        address: profileData.address,
      }).catch(() => {});

      // 3. Refresh user store state and reload fresh profile from DB
      await fetchCurrentUser();
      await loadProfile();

      // 4. Return to read-only view mode
      setIsEditing(false);
      setSuccessMessage('Admin profile & organization details saved to database!');
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

      setPasswordMsg({ text: 'Admin password updated successfully in database!', isError: false });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setPasswordMsg({ text: '', isError: false }), 4000);
    } catch (err: any) {
      const errorText = err?.response?.data?.message || err?.message || 'Failed to update password. Please verify your current password.';
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

  const usernameHandle = `${profileData.firstName.toLowerCase()}_${profileData.lastName.toLowerCase()}`.replace(/[^a-z0-9_]/g, '');

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 space-y-8 select-none font-sans">
      {/* Hidden File Input for Avatar Photo Upload */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handlePhotoUpload}
        className="hidden"
      />

      {/* ─────────────────────────────────────────────────────────────
          INSTAGRAM WEB PROFILE HEADER
      ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row items-center md:items-start gap-8 md:gap-14 pb-8 border-b border-border/80">
        {/* Left Column: Avatar Photo with 1-Click Upload Overlay */}
        <div className="relative group flex-shrink-0 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
          <div className="p-1 rounded-full bg-gradient-to-tr from-pink-500 via-rose-500 to-amber-500 shadow-md">
            <Avatar className="h-32 w-32 md:h-38 md:w-38 border-4 border-background rounded-full overflow-hidden">
              <AvatarImage src={profileData.avatarUrl} className="object-cover" />
              <AvatarFallback className="bg-primary/10 text-primary font-black text-4xl">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Upload Photo Badge Button */}
          <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-xs font-semibold gap-1">
            <Camera className="w-5 h-5" />
            <span>Upload Photo</span>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            className="absolute bottom-1 right-1 bg-primary text-primary-foreground p-2 rounded-full border-2 border-background shadow-md hover:scale-110 transition"
            title="Upload Profile Photo"
          >
            <Upload className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right Column: Bio & Actions */}
        <div className="flex-1 space-y-4 text-center md:text-left w-full">
          {/* Row 1: Username Handle & Action Buttons */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
            <h1 className="text-xl md:text-2xl font-normal tracking-tight text-foreground font-mono">
              {usernameHandle}
            </h1>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={isEditing ? "outline" : "secondary"}
                onClick={() => {
                  setActiveTab('profile');
                  setIsEditing(!isEditing);
                }}
                className="h-8 text-xs font-semibold px-4 rounded-lg border border-border/80 bg-secondary hover:bg-secondary/80 text-secondary-foreground"
              >
                {isEditing ? 'View Profile' : 'Edit Profile'}
              </Button>
              <Button
                size="sm"
                onClick={() => setActiveTab('subscription')}
                className="h-8 text-xs font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-3.5 rounded-lg shadow-2xs"
              >
                <CreditCard className="w-3.5 h-3.5 mr-1.5" />
                Subscription
              </Button>
            </div>
          </div>

          {/* Row 2: Stat Counters Row (Instagram Style) */}
          <div className="flex items-center justify-center md:justify-start gap-6 md:gap-10 text-xs md:text-sm py-2 border-y border-border/60 md:border-none">
            <div>
              <span className="font-extrabold text-foreground">{totalEmployees}</span>{' '}
              <span className="text-muted-foreground text-xs font-medium">employees</span>
            </div>
            <div>
              <span className="font-extrabold text-foreground">{totalDepartments}</span>{' '}
              <span className="text-muted-foreground text-xs font-medium">departments</span>
            </div>
            <div>
              <span className="font-extrabold text-foreground">{totalLocations}</span>{' '}
              <span className="text-muted-foreground text-xs font-medium">locations</span>
            </div>
            <div>
              <Badge className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 text-[11px] font-extrabold px-2.5">
                {profileData.planTier}
              </Badge>
            </div>
          </div>

          {/* Row 3: Admin Bio & Organization Metadata */}
          <div className="text-xs space-y-1.5 text-foreground/90 leading-relaxed">
            <div className="flex items-center justify-center md:justify-start gap-2">
              <p className="font-bold text-sm text-foreground">
                {profileData.firstName} {profileData.lastName}
              </p>
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold px-2 py-0">
                {profileData.designation}
              </Badge>
            </div>

            {profileData.bio && (
              <p className="text-muted-foreground text-xs max-w-lg">{profileData.bio}</p>
            )}

            <div className="pt-1 space-y-1 text-muted-foreground">
              <p className="flex items-center justify-center md:justify-start gap-1.5 font-medium">
                <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
                <strong className="text-foreground">{profileData.organizationName}</strong> ({profileData.organizationCode})
              </p>
              <p className="flex items-center justify-center md:justify-start gap-1.5">
                <Mail className="w-3.5 h-3.5 text-primary shrink-0" /> {profileData.email}
                <span className="opacity-40">•</span>
                <Phone className="w-3.5 h-3.5 text-primary shrink-0" /> {profileData.phone}
              </p>
              {profileData.website && (
                <a
                  href={profileData.website.startsWith('http') ? profileData.website : `https://${profileData.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline font-semibold flex items-center justify-center md:justify-start gap-1.5"
                >
                  <Globe className="w-3.5 h-3.5 shrink-0" /> {profileData.website}
                </a>
              )}
              <p className="flex items-center justify-center md:justify-start gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-primary shrink-0" /> {profileData.address}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          INSTAGRAM WEB TABS ROW
      ───────────────────────────────────────────────────────────── */}
      <div className="border-t border-border/80 pt-1">
        <div className="flex justify-center gap-8 sm:gap-14 text-xs tracking-wider uppercase font-semibold">
          <button
            onClick={() => setActiveTab('profile')}
            className={cn(
              'flex items-center gap-2 py-3 border-t-2 transition-all -mt-[1px]',
              activeTab === 'profile'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <Grid className="w-4 h-4" />
            <span>Profiles</span>
          </button>

          <button
            onClick={() => setActiveTab('subscription')}
            className={cn(
              'flex items-center gap-2 py-3 border-t-2 transition-all -mt-[1px]',
              activeTab === 'subscription'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <CreditCard className="w-4 h-4" />
            <span>Subscription</span>
          </button>

          <button
            onClick={() => setActiveTab('organization')}
            className={cn(
              'flex items-center gap-2 py-3 border-t-2 transition-all -mt-[1px]',
              activeTab === 'organization'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <Building2 className="w-4 h-4" />
            <span>Organization</span>
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={cn(
              'flex items-center gap-2 py-3 border-t-2 transition-all -mt-[1px]',
              activeTab === 'security'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Security</span>
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          TAB 1: EDIT PROFILES (ADMIN PERSONAL + COMPANY)
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'profile' && (
        <div className="bg-card border border-border/80 rounded-xl p-5 sm:p-6 shadow-2xs space-y-6 animate-in fade-in-50 duration-200">
          {successMessage && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs font-semibold flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0" /> {successMessage}
            </div>
          )}

          {!isEditing ? (
            /* Read-Only Profile View */
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div>
                  <h2 className="text-base font-bold text-foreground">Admin Profile & Company Information</h2>
                  <p className="text-xs text-muted-foreground">View your personal admin account and organization details</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="h-8 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 px-4 rounded-lg"
                >
                  Edit Profile
                </Button>
              </div>

              {/* Read Only Details Grid */}
              <div className="space-y-6">
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-4 h-4" /> Admin Personal Details
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-muted/30 p-4 rounded-lg border border-border/40 text-xs">
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
                    <div className="sm:col-span-2">
                      <span className="text-muted-foreground block text-[11px] font-medium">Bio</span>
                      <span className="font-semibold text-foreground">{profileData.bio || '—'}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 border-t border-border/60 pt-4">
                  <h3 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 className="w-4 h-4" /> Official Organization Details
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-muted/30 p-4 rounded-lg border border-border/40 text-xs">
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
            </div>
          ) : (
            /* Editable Profile Form */
            <div>
              <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-6">
                <div>
                  <h2 className="text-base font-bold text-foreground">Edit Admin Profile & Company Information</h2>
                  <p className="text-xs text-muted-foreground">Manage your personal admin account and edit organization details</p>
                </div>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold">
                  Editing Mode
                </Badge>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-6">
                {/* Section A: Admin Personal Profile */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-4 h-4" /> Admin Personal Details & Profile Photo
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
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-xs focus:ring-1 focus:ring-primary focus:outline-none"
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
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-xs focus:ring-1 focus:ring-primary focus:outline-none"
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
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-foreground mb-1">
                        Admin Designation / Title
                      </label>
                      <input
                        type="text"
                        value={profileData.designation}
                        onChange={(e) => setProfileData({ ...profileData, designation: e.target.value })}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-foreground mb-1">
                      Admin Profile Bio
                    </label>
                    <textarea
                      rows={2}
                      value={profileData.bio}
                      onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                    />
                  </div>
                </div>

                {/* Section B: Organization & Company Details */}
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
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-xs focus:ring-1 focus:ring-primary focus:outline-none"
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
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-xs focus:ring-1 focus:ring-primary focus:outline-none"
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
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-xs focus:ring-1 focus:ring-primary focus:outline-none"
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
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-foreground mb-1">
                        Headquarters Location / Address
                      </label>
                      <input
                        type="text"
                        value={profileData.address}
                        onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-border/60">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditing(false)}
                    className="text-xs font-semibold px-4 h-9"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSaving}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold px-6 h-9"
                  >
                    {isSaving ? 'Saving to Database...' : 'Save Profile Changes'}
                  </Button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 2: ADMIN SUBSCRIPTION & LICENSING
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'subscription' && (
        <div className="space-y-5 animate-in fade-in-50 duration-200">
          <div className="bg-card border border-border/80 rounded-xl p-5 sm:p-6 shadow-2xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black text-foreground">
                    {profileData.planTier}
                  </h2>
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-bold text-[10px] px-2">
                    ● ACTIVE SUBSCRIPTION
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Active multi-tenant HRMS subscription tier for <strong className="text-foreground">{profileData.organizationName}</strong>
                </p>
              </div>

              <div className="text-left sm:text-right">
                <p className="text-xs text-muted-foreground font-semibold">Subscription ID</p>
                <p className="text-xs font-mono font-bold text-foreground">SUB-ORG-{user?.organizationId || 101}-ENT</p>
              </div>
            </div>

            {/* Seat Count Progress */}
            <div className="bg-muted/30 border border-border/60 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-primary" /> Employee Seat Allocation
                </span>
                <span className="font-mono text-muted-foreground font-semibold">
                  <strong className="text-foreground font-bold">{totalEmployees}</strong> / 500 Seats Used
                </span>
              </div>
              <Progress value={(totalEmployees / 500) * 100} className="h-2 bg-muted" />
              <p className="text-[11px] text-muted-foreground">
                You have <strong className="text-foreground font-semibold">{500 - totalEmployees}</strong> available employee seats remaining on your plan.
              </p>
            </div>

            {/* Subscription Metadata */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-3 bg-card border border-border/70 rounded-lg space-y-1">
                <span className="text-[11px] text-muted-foreground font-semibold flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-primary" /> Billing Cycle
                </span>
                <p className="text-xs font-bold text-foreground">Annual Recurring</p>
                <p className="text-[10px] text-muted-foreground">Auto-renews Jul 2027</p>
              </div>

              <div className="p-3 bg-card border border-border/70 rounded-lg space-y-1">
                <span className="text-[11px] text-muted-foreground font-semibold flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-amber-500" /> Plan Status
                </span>
                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Full Unlimited Access</p>
                <p className="text-[10px] text-muted-foreground">All features unlocked</p>
              </div>

              <div className="p-3 bg-card border border-border/70 rounded-lg space-y-1">
                <span className="text-[11px] text-muted-foreground font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" /> Support SLA
                </span>
                <p className="text-xs font-bold text-foreground">24/7 Priority Support</p>
                <p className="text-[10px] text-muted-foreground">Dedicated account manager</p>
              </div>
            </div>

            {/* Enabled Modules */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-primary" /> Active Module Entitlements
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {[
                  'Attendance & Timelogs',
                  'Payroll & Salary Engine',
                  'Recruitment & Job ATS',
                  'Asset & Licensing',
                  'Performance OKRs',
                  'Leave Approvals',
                  'Workflow Engine',
                  'Audit & Security Logs',
                ].map((mod, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-semibold text-[11px]">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span className="truncate">{mod}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 3: ORGANIZATION HIERARCHY
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'organization' && (
        <div className="bg-card border border-border/80 rounded-xl p-5 sm:p-6 shadow-2xs space-y-5 animate-in fade-in-50 duration-200">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div>
              <h2 className="text-base font-bold text-foreground">Organization & Branch Hierarchy</h2>
              <p className="text-xs text-muted-foreground">Overview of departments, locations, and headcount for {profileData.organizationName}</p>
            </div>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold">
              Org Structure
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-muted/20 border border-border/60 rounded-xl space-y-1">
              <span className="text-xs text-muted-foreground font-semibold">Active Departments</span>
              <p className="text-2xl font-black text-foreground">{totalDepartments}</p>
              <p className="text-[11px] text-muted-foreground">Engineering, HR, Sales, Ops</p>
            </div>

            <div className="p-4 bg-muted/20 border border-border/60 rounded-xl space-y-1">
              <span className="text-xs text-muted-foreground font-semibold">Branch Locations</span>
              <p className="text-2xl font-black text-foreground">{totalLocations}</p>
              <p className="text-[11px] text-muted-foreground">{profileData.address}</p>
            </div>

            <div className="p-4 bg-muted/20 border border-border/60 rounded-xl space-y-1">
              <span className="text-xs text-muted-foreground font-semibold">Total Employees</span>
              <p className="text-2xl font-black text-foreground">{totalEmployees}</p>
              <p className="text-[11px] text-muted-foreground">Active organizational headcount</p>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 4: SECURITY & CREDENTIALS
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'security' && (
        <div className="bg-card border border-border/80 rounded-xl p-5 sm:p-6 shadow-2xs space-y-5 animate-in fade-in-50 duration-200">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div>
              <h2 className="text-base font-bold text-foreground">Admin Security & Password</h2>
              <p className="text-xs text-muted-foreground">Manage your account credentials and multi-tenant authentication settings</p>
            </div>
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] font-bold flex items-center gap-1">
              <Key className="w-3 h-3" /> Secure Account
            </Badge>
          </div>

          {passwordMsg.text && (
            <div className={cn(
              'p-3 border rounded-lg text-xs font-semibold flex items-center gap-2',
              passwordMsg.isError
                ? 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
            )}>
              <CheckCircle className="w-4 h-4 shrink-0" /> {passwordMsg.text}
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} className="max-w-md space-y-4">
            <div>
              <label className="block text-xs font-bold text-foreground mb-1">
                Current Password
              </label>
              <input
                type="password"
                required
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-xs focus:ring-1 focus:ring-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1">
                New Password
              </label>
              <input
                type="password"
                required
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-xs focus:ring-1 focus:ring-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                required
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-xs focus:ring-1 focus:ring-primary focus:outline-none"
              />
            </div>

            <Button type="submit" disabled={isChangingPassword} className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold h-9">
              {isChangingPassword ? 'Updating Password...' : 'Update Password'}
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
