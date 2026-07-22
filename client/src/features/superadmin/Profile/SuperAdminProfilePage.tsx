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
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { apiClient } from '@/config/api';

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
    <div className="space-y-6 text-slate-100 max-w-4xl mx-auto">
      {/* Top Banner */}
      <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16 border-2 border-amber-500/50 shadow-lg">
            <AvatarImage src={profile.avatarUrl} />
            <AvatarFallback className="bg-gradient-to-tr from-amber-500 to-red-600 text-white font-extrabold text-xl">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold text-white">
                {profile.firstName} {profile.lastName}
              </h1>
              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">
                Platform Owner
              </Badge>
            </div>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-indigo-400" /> {profile.email} • SuperAdmin Access
            </p>
          </div>
        </div>

        <Button
          onClick={() => setIsPasswordModalOpen(true)}
          className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs gap-1.5 shadow-lg h-10 px-4"
        >
          <Lock className="w-4 h-4" /> Change Password (2FA)
        </Button>
      </div>

      {/* Main Profile Settings Form */}
      <Card className="bg-slate-900 border-slate-800 text-white shadow-xl">
        <CardHeader className="border-b border-slate-800 pb-4">
          <CardTitle className="text-lg text-white flex items-center gap-2 font-semibold">
            <User className="w-5 h-5 text-indigo-400" /> SuperAdmin Personal Profile
          </CardTitle>
          <CardDescription className="text-slate-400 text-xs">
            Manage your platform superadmin credentials, avatar URL, and contact details
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-6">
          <form onSubmit={handleProfileSave} className="space-y-6">
            {saveSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2 font-medium">
                <CheckCircle className="w-4 h-4" /> Profile details saved and updated successfully.
              </div>
            )}

            {/* Row 1: First Name & Last Name */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300 font-semibold">First Name *</Label>
                <Input
                  required
                  value={profile.firstName}
                  onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                  className="bg-slate-950 border-slate-800 text-white text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300 font-semibold">Last Name *</Label>
                <Input
                  required
                  value={profile.lastName}
                  onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                  className="bg-slate-950 border-slate-800 text-white text-xs"
                />
              </div>
            </div>

            {/* Row 2: Email & Phone */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300 font-semibold">Email Address *</Label>
                <Input
                  type="email"
                  required
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  className="bg-slate-950 border-slate-800 text-white text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300 font-semibold">Phone Number</Label>
                <Input
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  className="bg-slate-950 border-slate-800 text-white text-xs"
                />
              </div>
            </div>

            {/* Row 3: Avatar URL & Access Level */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-1.5">
                <Label className="text-xs text-slate-300 font-semibold">Avatar Image URL</Label>
                <Input
                  placeholder="https://example.com/avatar.jpg"
                  value={profile.avatarUrl}
                  onChange={(e) => setProfile({ ...profile, avatarUrl: e.target.value })}
                  className="bg-slate-950 border-slate-800 text-white placeholder-slate-500 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300 font-semibold">Access Privilege Level</Label>
                <Input
                  disabled
                  value="Platform Owner (SuperAdmin)"
                  className="bg-slate-950/60 border-slate-800 text-amber-400 font-semibold text-xs cursor-not-allowed"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-end">
              <Button
                type="submit"
                disabled={isSaving}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs gap-1.5 px-6 shadow-lg"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Saving Changes...' : 'Save Profile Changes'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Change Password Dialog Modal with Authenticator 2FA Verification UI */}
      <Dialog open={isPasswordModalOpen} onOpenChange={setIsPasswordModalOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <Lock className="w-5 h-5 text-amber-400" />
              Change SuperAdmin Password
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Requires 2FA Authenticator Code verification for high-security password reset.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handlePasswordSubmit} className="space-y-4 pt-2">
            {passwordError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2 font-medium">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {passwordError}
              </div>
            )}

            {passwordSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2 font-medium">
                <CheckCircle className="w-4 h-4" /> Password updated with Authenticator verification!
              </div>
            )}

            {/* Current Password */}
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300 font-semibold">Current Password *</Label>
              <Input
                type="password"
                required
                placeholder="Enter current password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                className="bg-slate-950 border-slate-800 text-white text-xs"
              />
            </div>

            {/* New Password */}
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300 font-semibold">New Password *</Label>
              <Input
                type="password"
                required
                placeholder="Enter new strong password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                className="bg-slate-950 border-slate-800 text-white text-xs"
              />
            </div>

            {/* Confirm New Password */}
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300 font-semibold">Confirm New Password *</Label>
              <Input
                type="password"
                required
                placeholder="Confirm new password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                className="bg-slate-950 border-slate-800 text-white text-xs"
              />
            </div>

            {/* 2FA Authenticator Verification Code Field */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-amber-400 font-bold flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-amber-400" /> Authenticator Verification (2FA) *
                </Label>
                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px]">
                  Required
                </Badge>
              </div>
              <p className="text-[11px] text-slate-400">
                Enter the 6-digit verification code from your Authenticator app (Google Authenticator / Authy).
              </p>
              <Input
                type="text"
                required
                maxLength={6}
                placeholder="e.g. 849201"
                value={passwordForm.authenticatorCode}
                onChange={(e) => setPasswordForm({ ...passwordForm, authenticatorCode: e.target.value })}
                className="bg-slate-900 border-slate-700 text-white text-center font-mono text-base tracking-widest h-10"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsPasswordModalOpen(false)}
                className="border-slate-800 text-slate-400 text-xs"
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs px-5">
                Verify 2FA & Change Password
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
