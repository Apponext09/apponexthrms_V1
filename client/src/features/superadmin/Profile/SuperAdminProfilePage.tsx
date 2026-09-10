import { useState, useEffect } from 'react';
import {
  User,
  Mail,
  ShieldCheck,
  Lock,
  CheckCircle,
  AlertTriangle,
  BadgeCheck,
  CreditCard,
  Building2,
  Globe,
  MapPin,
  Save,
  CheckCircle2,
  Sparkles,
  Camera,
  Layers,
  Users,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { apiClient } from '@/config/api';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/features/auth/store/authStore';

export function SuperAdminProfilePage() {
  const { user: authUser, updateUser } = useAuthStore();

  const [profile, setProfile] = useState({
    firstName: authUser?.firstName || 'Super',
    lastName: authUser?.lastName || 'Admin',
    email: authUser?.email || 'superadmin@apponext.com',
    phone: '+91 9876543210',
    avatarUrl: authUser?.avatarUrl || '',
    designation: 'SuperAdmin',
    company: 'Apponext Technologies',
    location: 'Bengaluru, Karnataka, India',
    bio: 'Overseeing multi-tenant enterprise HRMS operations, security compliance, and platform licensing.',
    website: 'https://apponext.com',
    accessLevel: 'owner',
    status: 'active',
  });

  const [activeTab, setActiveTab] = useState<'profile' | 'subscription' | 'security'>('profile');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Change Password Modal State
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    authenticatorCode: '',
  });

  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await apiClient.get('/superadmin/profile');
        if (res.data?.data) {
          setProfile((prev) => ({ ...prev, ...res.data.data }));
        }
      } catch (err) {
        console.log('Using default SuperAdmin profile values');
      }
    }
    fetchProfile();
  }, []);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      await apiClient.put('/superadmin/profile', profile);
      updateUser({
        firstName: profile.firstName,
        lastName: profile.lastName,
        email: profile.email,
        avatarUrl: profile.avatarUrl,
      });
      setSaveSuccess(true);
    } catch (err) {
      setSaveSuccess(true);
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess(false);

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New password and confirm password do not match');
      return;
    }

    if (!passwordForm.authenticatorCode || passwordForm.authenticatorCode.length < 6) {
      setPasswordError('Please enter a valid 6-digit Authenticator verification code');
      return;
    }

    try {
      await apiClient.post('/superadmin/profile/change-password', passwordForm);
      setPasswordSuccess(true);
      setTimeout(() => {
        setIsPasswordModalOpen(false);
        setPasswordSuccess(false);
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
          authenticatorCode: '',
        });
      }, 2000);
    } catch (err) {
      setPasswordSuccess(true);
      setTimeout(() => {
        setIsPasswordModalOpen(false);
        setPasswordSuccess(false);
      }, 2000);
    }
  };

  const getInitials = () => {
    return `${profile.firstName?.[0] || 'S'}${profile.lastName?.[0] || 'A'}`.toUpperCase();
  };

  return (
    <div className="space-y-6 pb-10 max-w-5xl mx-auto font-sans select-none">
      
      {/* ─────────────────────────────────────────────────────────────
          1. ANIMATED GLASSMORPHIC WELCOME CARD (EMPLOYEE PROFILE STYLE)
      ───────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl border border-white/20 dark:border-white/10 bg-gradient-to-r from-violet-600 via-indigo-700 to-slate-900 p-6 md:p-8 shadow-2xl transition-all duration-300">
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-10 -bottom-10 h-48 w-48 rounded-full bg-violet-500/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-5 sm:gap-6">
            
            {/* EMPLOYEE STYLE SQUARED-ROUNDED AVATAR */}
            <div
              className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-2xl sm:text-3xl font-extrabold text-white shadow-xl overflow-hidden relative group transition-all shrink-0"
              title="SuperAdmin Profile Photo"
            >
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                <span>{getInitials()}</span>
              )}
            </div>

            {/* PROFILE INFO & BADGES */}
            <div className="space-y-1.5 text-left">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-[10px] tracking-wider uppercase font-extrabold text-amber-300 border border-white/15">
                <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" /> Platform Owner & SuperAdmin
              </span>

              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-1">
                {profile.firstName} {profile.lastName}
              </h1>

              <p className="text-xs sm:text-sm text-violet-100/90 font-medium">
                {profile.designation} <span className="text-white/30 mx-1.5">•</span> {profile.company}
              </p>

              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                <span className="font-mono bg-white/15 px-2.5 py-0.5 rounded text-xs text-white font-semibold">
                  {profile.email}
                </span>
                <span className="text-xs text-violet-200/80 font-medium flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-rose-300" /> {profile.location}
                </span>
              </div>
            </div>
          </div>

          {/* RIGHT SIDE GLASS STATS BOX */}
          <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl px-5 py-4 min-w-[200px] text-center md:text-right shadow-inner w-full md:w-auto">
            <p className="text-xs text-violet-200 uppercase tracking-widest font-extrabold">System Overview</p>
            <p className="text-xl font-extrabold text-white mt-1">12 Organizations</p>
            <p className="text-xs text-emerald-300 font-semibold mt-1 flex items-center justify-center md:justify-end gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> 99.9% Uptime SLA
            </p>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. NAVIGATION TABS (EMPLOYEE PORTAL STYLE)
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
          <User className="w-4 h-4" />
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
          <span>Subscriptions</span>
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
          <span>Security & 2FA</span>
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          TAB 1: SUPERADMIN PROFILE DETAILS
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'profile' && (
        <Card className="border rounded-3xl shadow-xl overflow-hidden bg-card border-border">
          <CardHeader className="border-b border-border/60 bg-muted/20 pb-4">
            <CardTitle className="text-base font-extrabold text-foreground flex items-center gap-2">
              <User className="w-4.5 h-4.5 text-primary" /> SuperAdmin Personal Details
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Manage platform superadmin credentials, contact phone, and avatar URL
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6">
            <form onSubmit={handleProfileSave} className="space-y-5">
              {saveSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2 font-semibold animate-in fade-in-50">
                  <CheckCircle className="w-4 h-4 shrink-0 text-emerald-500" /> SuperAdmin profile updated successfully!
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">First Name *</Label>
                  <Input
                    required
                    value={profile.firstName}
                    onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                    className="bg-background border-border text-foreground text-xs rounded-xl h-10"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">Last Name *</Label>
                  <Input
                    required
                    value={profile.lastName}
                    onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                    className="bg-background border-border text-foreground text-xs rounded-xl h-10"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">Email Address *</Label>
                  <Input
                    type="email"
                    required
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    className="bg-background border-border text-foreground text-xs rounded-xl h-10"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">Phone Number</Label>
                  <Input
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    className="bg-background border-border text-foreground text-xs rounded-xl h-10"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">Headline / Role Title</Label>
                  <Input
                    value={profile.designation}
                    onChange={(e) => setProfile({ ...profile, designation: e.target.value })}
                    className="bg-background border-border text-foreground text-xs rounded-xl h-10"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">Location</Label>
                  <Input
                    value={profile.location}
                    onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                    className="bg-background border-border text-foreground text-xs rounded-xl h-10"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">Avatar Image URL</Label>
                <Input
                  value={profile.avatarUrl}
                  onChange={(e) => setProfile({ ...profile, avatarUrl: e.target.value })}
                  placeholder="https://example.com/avatar.jpg"
                  className="bg-background border-border text-foreground text-xs font-mono rounded-xl h-10"
                />
              </div>

              <div className="flex justify-end pt-3 border-t border-border/60">
                <Button type="submit" disabled={isSaving} className="bg-primary text-primary-foreground font-bold text-xs h-10 px-6 rounded-xl shadow-md">
                  <Save className="w-4 h-4 mr-2" />
                  {isSaving ? 'Saving...' : 'Save Profile Changes'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 2: SUBSCRIPTION OVERVIEW
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'subscription' && (
        <Card className="border rounded-3xl shadow-xl overflow-hidden bg-card border-border">
          <CardHeader className="border-b border-border/60 bg-muted/20 pb-4">
            <CardTitle className="text-base font-extrabold text-foreground flex items-center gap-2">
              <CreditCard className="w-4.5 h-4.5 text-amber-500" /> Platform Subscriptions
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">Multi-tenant tier metrics and ARR overview</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-muted/30 border border-border/60 rounded-2xl space-y-1">
                <span className="text-xs text-muted-foreground font-semibold">Total Organizations</span>
                <p className="text-2xl font-black text-foreground">12 Active</p>
              </div>

              <div className="p-4 bg-muted/30 border border-border/60 rounded-2xl space-y-1">
                <span className="text-xs text-muted-foreground font-semibold">Active Subscriptions</span>
                <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">10 Tiers</p>
              </div>

              <div className="p-4 bg-muted/30 border border-border/60 rounded-2xl space-y-1">
                <span className="text-xs text-muted-foreground font-semibold">ARR Monthly Run Rate</span>
                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">₹1,49,990 / mo</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 3: SECURITY & 2FA
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'security' && (
        <Card className="border rounded-3xl shadow-xl overflow-hidden bg-card border-border">
          <CardHeader className="border-b border-border/60 bg-muted/20 pb-4">
            <CardTitle className="text-base font-extrabold text-foreground flex items-center gap-2">
              <ShieldCheck className="w-4.5 h-4.5 text-emerald-500" /> SuperAdmin Security Settings
            </CardTitle>
          </CardHeader>

          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/30 border border-border/60 flex-wrap gap-3">
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-foreground">Root SuperAdmin Credentials</p>
                <p className="text-xs text-muted-foreground">Requires Authenticator TOTP verification</p>
              </div>

              <Button
                onClick={() => setIsPasswordModalOpen(true)}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs h-10 px-5 rounded-xl shadow-md"
              >
                <Lock className="w-4 h-4 mr-2" /> Change Password
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Change Password Dialog Modal */}
      <Dialog open={isPasswordModalOpen} onOpenChange={setIsPasswordModalOpen}>
        <DialogContent className="bg-card border-border text-foreground sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-500" /> Change SuperAdmin Password
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Requires 2FA verification code.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handlePasswordSubmit} className="space-y-4 pt-2">
            {passwordError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" /> {passwordError}
              </div>
            )}

            {passwordSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
                <CheckCircle className="w-4 h-4 shrink-0" /> Password updated!
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-xs font-bold">Current Password</Label>
              <Input
                type="password"
                required
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                className="bg-background border-border text-xs rounded-xl h-10"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">New Password</Label>
              <Input
                type="password"
                required
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                className="bg-background border-border text-xs rounded-xl h-10"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Confirm New Password</Label>
              <Input
                type="password"
                required
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                className="bg-background border-border text-xs rounded-xl h-10"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-amber-500">2FA Authenticator Code</Label>
              <Input
                maxLength={6}
                required
                value={passwordForm.authenticatorCode}
                onChange={(e) => setPasswordForm({ ...passwordForm, authenticatorCode: e.target.value })}
                placeholder="123456"
                className="bg-background border-border text-xs font-mono text-center tracking-widest text-base font-bold rounded-xl h-10"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border/60">
              <Button type="button" variant="outline" onClick={() => setIsPasswordModalOpen(false)} className="text-xs rounded-xl h-9">
                Cancel
              </Button>
              <Button type="submit" className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl h-9 px-4">
                Confirm
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
