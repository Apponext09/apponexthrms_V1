import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, Shield, Bell, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

export default function SettingsSecurityPage() {
  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [showPassword, setShowPassword] = useState({
    current: false,
    newPass: false,
    confirm: false,
  });

  const [toggles, setToggles] = useState({
    twoFactor: false,
    emailAlerts: true,
  });

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.currentPassword || !form.newPassword || !form.confirmPassword) {
      toast.error('All fields are required.');
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      toast.error('New passwords do not match.');
      return;
    }
    toast.success('Portal password updated successfully.');
    setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
  };

  const handleToggle = (key: 'twoFactor' | 'emailAlerts') => {
    setToggles(prev => {
      const nextVal = !prev[key];
      toast.success(`${key === 'twoFactor' ? '2-Factor Auth' : 'Email Alerts'} ${nextVal ? 'enabled' : 'disabled'}.`);
      return { ...prev, [key]: nextVal };
    });
  };

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card border border-border/80 rounded-xl p-4 sm:p-5 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-foreground tracking-tight flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" /> Settings & Security
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 font-bold">
              Account
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage your credentials, two-factor authentication, and email alert configurations.
          </p>
        </div>
      </div>

      {/* Change Password */}
      <Card className="border border-border/80 rounded-xl shadow-2xs bg-card">
        <CardHeader className="pb-3 pt-4 px-4 sm:px-5 border-b border-border/60">
          <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
            <Lock className="w-4 h-4 text-primary" /> Change Portal Password
          </CardTitle>
          <CardDescription className="text-xs">Update your credentials regularly to stay secure.</CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-5">
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="curPass" className="text-xs font-bold text-foreground">Current Password</Label>
              <div className="relative">
                <Input
                  id="curPass"
                  type={showPassword.current ? 'text' : 'password'}
                  placeholder="Enter current password"
                  value={form.currentPassword}
                  onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
                  className="h-9 text-xs rounded-lg border-border bg-muted/50 focus-visible:ring-primary pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => ({ ...p, current: !p.current }))}
                  className="absolute right-2.5 top-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="newPass" className="text-xs font-bold text-foreground">New Password</Label>
                <div className="relative">
                  <Input
                    id="newPass"
                    type={showPassword.newPass ? 'text' : 'password'}
                    placeholder="Enter new password"
                    value={form.newPassword}
                    onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                    className="h-9 text-xs rounded-lg border-border bg-muted/50 focus-visible:ring-primary pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => ({ ...p, newPass: !p.newPass }))}
                    className="absolute right-2.5 top-2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword.newPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confPass" className="text-xs font-bold text-foreground">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confPass"
                    type={showPassword.confirm ? 'text' : 'password'}
                    placeholder="Re-enter new password"
                    value={form.confirmPassword}
                    onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                    className="h-9 text-xs rounded-lg border-border bg-muted/50 focus-visible:ring-primary pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => ({ ...p, confirm: !p.confirm }))}
                    className="absolute right-2.5 top-2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
            <Button type="submit" className="h-9 px-5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs rounded-lg gap-1.5 shadow-2xs">
              <Lock className="w-3.5 h-3.5" /> Update Password
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Security Toggles */}
      <Card className="border border-border/80 rounded-xl shadow-2xs bg-card">
        <CardHeader className="pb-3 pt-4 px-4 sm:px-5 border-b border-border/60">
          <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
            <Bell className="w-4 h-4 text-primary" /> Authentication & Alerts
          </CardTitle>
          <CardDescription className="text-xs">Configure login security and notification alerts.</CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-5 space-y-0">
          {/* Email Alerts */}
          <div className="flex justify-between items-center py-4 border-b border-border/60">
            <div className="space-y-0.5">
              <span className="font-bold text-xs text-foreground block">Email Verification Alerts</span>
              <span className="text-[11px] text-muted-foreground">Alert me via email on any suspicious login attempts.</span>
            </div>
            <button
              onClick={() => handleToggle('emailAlerts')}
              className={`w-11 h-6 rounded-full transition-all duration-200 flex items-center px-0.5 shrink-0 border ${
                toggles.emailAlerts
                  ? 'bg-primary border-primary justify-end'
                  : 'bg-muted border-border/60 justify-start'
              }`}
            >
              <span className={`w-4.5 h-4.5 bg-white rounded-full shadow-md transition-transform duration-200 ${toggles.emailAlerts ? 'translate-x-0' : ''}`} />
            </button>
          </div>

          {/* 2FA Toggle */}
          <div className="flex justify-between items-center py-4">
            <div className="space-y-0.5">
              <span className="font-bold text-xs text-foreground block">Require 2FA OTP</span>
              <span className="text-[11px] text-muted-foreground">Enable additional authentication step during login.</span>
            </div>
            <button
              onClick={() => handleToggle('twoFactor')}
              className={`w-11 h-6 rounded-full transition-all duration-200 flex items-center px-0.5 shrink-0 border ${
                toggles.twoFactor
                  ? 'bg-primary border-primary justify-end'
                  : 'bg-muted border-border/60 justify-start'
              }`}
            >
              <span className={`w-4.5 h-4.5 bg-white rounded-full shadow-md transition-transform duration-200 ${toggles.twoFactor ? 'translate-x-0' : ''}`} />
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
