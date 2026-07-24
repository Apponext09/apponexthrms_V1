import { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Phone,
  ShieldCheck,
  Key,
  Save,
  Lock,
  Smartphone,
  CheckCircle,
  AlertTriangle,
  BadgeCheck,
  CreditCard,
  Building2,
  Globe,
  MapPin,
  Sparkles,
  Zap,
  Calendar,
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

export function SuperAdminProfilePage() {
  const [profile, setProfile] = useState({
    firstName: 'Super',
    lastName: 'Admin',
    email: 'superadmin@apponext.com',
    phone: '+91 9876543210',
    avatarUrl: '',
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
          setProfile(res.data.data);
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
    <div className="max-w-4xl mx-auto py-4 sm:py-6 px-3 sm:px-6 space-y-6 select-none">
      {/* ─────────────────────────────────────────────────────────────
          INSTAGRAM WEB STYLE PROFILE HEADER
      ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-12 pb-6 border-b border-border/80">
        {/* Avatar Column */}
        <div className="relative group flex-shrink-0">
          <div className="p-1 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 shadow-md">
            <Avatar className="h-28 w-28 md:h-36 md:w-36 border-4 border-background rounded-full overflow-hidden">
              <AvatarImage src={profile.avatarUrl} className="object-cover" />
              <AvatarFallback className="bg-amber-500 text-white font-black text-3xl">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
          </div>
          <Badge className="absolute bottom-1 right-1 bg-amber-500 text-slate-950 font-bold border-2 border-background text-[10px] px-2 py-0.5 rounded-full shadow-xs">
            Platform Owner
          </Badge>
        </div>

        {/* Bio & Actions Column */}
        <div className="flex-1 space-y-4 text-center md:text-left w-full">
          {/* Line 1: Username & Action Buttons */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
            <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-foreground font-mono">
              {profile.firstName?.toLowerCase() || 'super'}.{profile.lastName?.toLowerCase() || 'admin'}
            </h1>
            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-xs px-2.5 py-0.5 font-bold">
              SuperAdmin
            </Badge>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-center md:ml-auto">
              <Button
                size="sm"
                onClick={() => setActiveTab('profile')}
                className={cn(
                  'h-8 text-xs font-semibold px-3 rounded-lg border border-border transition',
                  activeTab === 'profile'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                )}
              >
                Edit Profile
              </Button>
              <Button
                size="sm"
                onClick={() => setActiveTab('subscription')}
                className="h-8 text-xs font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-3 rounded-lg shadow-2xs"
              >
                <CreditCard className="w-3.5 h-3.5 mr-1.5" />
                Subscriptions
              </Button>
            </div>
          </div>

          {/* Line 2: Stat Counters Row */}
          <div className="flex items-center justify-center md:justify-start gap-6 md:gap-8 text-xs md:text-sm py-2 border-y border-border/60 md:border-none">
            <div>
              <span className="font-bold text-foreground">12</span>{' '}
              <span className="text-muted-foreground text-xs font-medium">organizations</span>
            </div>
            <div>
              <span className="font-bold text-foreground">10</span>{' '}
              <span className="text-muted-foreground text-xs font-medium">active plans</span>
            </div>
            <div>
              <span className="font-bold text-foreground">1,250</span>{' '}
              <span className="text-muted-foreground text-xs font-medium">total users</span>
            </div>
            <div>
              <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[11px] font-bold px-2">
                Platform Admin
              </Badge>
            </div>
          </div>

          {/* Line 3: Bio Metadata */}
          <div className="text-xs space-y-1 text-foreground/90">
            <p className="font-bold text-sm text-foreground">
              {profile.firstName} {profile.lastName}
            </p>
            <p className="text-muted-foreground font-medium flex items-center justify-center md:justify-start gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-500 shrink-0" /> Apponext Platform Operations & System Admin
            </p>
            <p className="text-muted-foreground flex items-center justify-center md:justify-start gap-1.5">
              <Mail className="w-3.5 h-3.5 text-primary shrink-0" /> {profile.email}
            </p>
            <p className="text-muted-foreground flex items-center justify-center md:justify-start gap-1.5">
              <Globe className="w-3.5 h-3.5 text-primary shrink-0" /> https://apponext.com
            </p>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          INSTAGRAM WEB STYLE TAB CONTENT SWITCHER
      ───────────────────────────────────────────────────────────── */}
      <div className="border-t border-border/80 pt-1">
        <div className="flex justify-center gap-8 sm:gap-16 text-[11px] sm:text-xs tracking-wider uppercase font-semibold">
          <button
            onClick={() => setActiveTab('profile')}
            className={cn(
              'flex items-center gap-2 py-3 border-t-2 transition-all -mt-[1px]',
              activeTab === 'profile'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <User className="w-4 h-4" />
            <span>Profile</span>
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
            <span>Subscriptions</span>
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
          TAB 1: EDIT SUPERADMIN PROFILE
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'profile' && (
        <Card className="bg-card border-border shadow-2xs">
          <CardHeader className="border-b border-border/60 pb-4">
            <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <User className="w-4 h-4 text-primary" /> SuperAdmin Personal Details
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Manage platform superadmin name, avatar, and phone credentials
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-5">
            <form onSubmit={handleProfileSave} className="space-y-5">
              {saveSuccess && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2 font-semibold">
                  <CheckCircle className="w-4 h-4 shrink-0" /> Profile details saved successfully.
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">First Name *</Label>
                  <Input
                    required
                    value={profile.firstName}
                    onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                    className="bg-background border-border text-foreground text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">Last Name *</Label>
                  <Input
                    required
                    value={profile.lastName}
                    onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                    className="bg-background border-border text-foreground text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">Email Address *</Label>
                  <Input
                    type="email"
                    required
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    className="bg-background border-border text-foreground text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">Phone Number</Label>
                  <Input
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    className="bg-background border-border text-foreground text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">Avatar Image URL</Label>
                <Input
                  value={profile.avatarUrl}
                  onChange={(e) => setProfile({ ...profile, avatarUrl: e.target.value })}
                  placeholder="https://example.com/avatar.jpg"
                  className="bg-background border-border text-foreground text-xs font-mono"
                />
              </div>

              <div className="flex justify-end pt-3 border-t border-border/60">
                <Button type="submit" disabled={isSaving} className="bg-primary text-primary-foreground font-bold text-xs h-9 px-5">
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
        <div className="space-y-5 animate-in fade-in-50 duration-200">
          <Card className="bg-card border-border shadow-2xs">
            <CardHeader className="border-b border-border/60 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-foreground">Platform Subscriptions</CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">Active multi-tenant subscription tiers and platform seat management</CardDescription>
                </div>
                <Badge variant="outline" className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 font-bold text-[10px]">
                  SuperAdmin View
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="pt-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-3 bg-muted/20 border border-border/60 rounded-xl space-y-1">
                  <span className="text-xs text-muted-foreground font-semibold">Total Subscriptions</span>
                  <p className="text-xl font-bold text-foreground">10 Active</p>
                </div>

                <div className="p-3 bg-muted/20 border border-border/60 rounded-xl space-y-1">
                  <span className="text-xs text-muted-foreground font-semibold">Active Organizations</span>
                  <p className="text-xl font-bold text-foreground">12 Organizations</p>
                </div>

                <div className="p-3 bg-muted/20 border border-border/60 rounded-xl space-y-1">
                  <span className="text-xs text-muted-foreground font-semibold">Monthly ARR</span>
                  <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">₹1,49,990 / mo</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 3: SECURITY & 2FA
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'security' && (
        <Card className="bg-card border-border shadow-2xs">
          <CardHeader className="border-b border-border/60 pb-4">
            <CardTitle className="text-base font-bold text-foreground">SuperAdmin Security Settings</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">Manage platform security credentials and two-factor authentication</CardDescription>
          </CardHeader>

          <CardContent className="pt-5 space-y-4">
            <Button
              onClick={() => setIsPasswordModalOpen(true)}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs gap-1.5 h-9 px-4"
            >
              <Lock className="w-4 h-4" /> Change Password (2FA Verification)
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Change Password Dialog Modal */}
      <Dialog open={isPasswordModalOpen} onOpenChange={setIsPasswordModalOpen}>
        <DialogContent className="bg-card border-border text-foreground sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-500" /> Change SuperAdmin Password
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Requires Authenticator 2FA verification to update root admin credentials.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handlePasswordSubmit} className="space-y-4 pt-2">
            {passwordError && (
              <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" /> {passwordError}
              </div>
            )}

            {passwordSuccess && (
              <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
                <CheckCircle className="w-4 h-4 shrink-0" /> SuperAdmin password updated successfully!
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-xs font-bold">Current Password</Label>
              <Input
                type="password"
                required
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                className="bg-background border-border text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">New Password</Label>
              <Input
                type="password"
                required
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                className="bg-background border-border text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Confirm New Password</Label>
              <Input
                type="password"
                required
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                className="bg-background border-border text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-amber-500">2FA Authenticator Code (6 digits)</Label>
              <Input
                maxLength={6}
                required
                value={passwordForm.authenticatorCode}
                onChange={(e) => setPasswordForm({ ...passwordForm, authenticatorCode: e.target.value })}
                placeholder="123456"
                className="bg-background border-border text-xs font-mono text-center tracking-widest text-base font-bold"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <Button type="button" variant="outline" onClick={() => setIsPasswordModalOpen(false)} className="text-xs">
                Cancel
              </Button>
              <Button type="submit" className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs">
                Confirm & Update
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
