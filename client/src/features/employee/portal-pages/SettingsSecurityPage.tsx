import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, Shield, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

export default function SettingsSecurityPage() {
  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
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

    toast.success('Security settings password updated successfully.');
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
    <div className="space-y-6 max-w-xl mx-auto">
      <div className="pb-3 border-b">
        <h2 className="text-lg font-bold text-foreground">Settings & Security</h2>
        <p className="text-xs text-muted-foreground">Manage your credentials, two-factor authentication, and email alert configs.</p>
      </div>

      <div className="space-y-6">
        {/* Password update */}
        <Card className="border rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Lock className="w-4.5 h-4.5 text-violet-500" /> Change Portal Password
            </CardTitle>
            <CardDescription>Update your credentials regularly to secure your self service portal.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="curPass">Current Password</Label>
                <Input
                  id="curPass"
                  type="password"
                  value={form.currentPassword}
                  onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="newPass">New Password</Label>
                  <Input
                    id="newPass"
                    type="password"
                    value={form.newPassword}
                    onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="confPass">Confirm New Password</Label>
                  <Input
                    id="confPass"
                    type="password"
                    value={form.confirmPassword}
                    onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                  />
                </div>
              </div>
              <Button type="submit" className="bg-violet-600 hover:bg-violet-700 text-white font-bold">
                Update Password
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Security toggles */}
        <Card className="border rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Shield className="w-4.5 h-4.5 text-violet-500" /> Two-Factor Authentication
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div className="flex justify-between items-center py-2 border-b">
              <div>
                <span className="font-bold text-foreground block">Email Verification Alerts</span>
                <span className="text-muted-foreground mt-0.5 block">Alert me via email on any suspicious login attempts.</span>
              </div>
              <button 
                onClick={() => handleToggle('emailAlerts')}
                className={`w-11 h-6 rounded-full transition-colors flex items-center px-1 ${
                  toggles.emailAlerts ? 'bg-violet-600 justify-end' : 'bg-muted justify-start'
                }`}
              >
                <span className="w-4 h-4 bg-white rounded-full shadow" />
              </button>
            </div>
            <div className="flex justify-between items-center pt-2">
              <div>
                <span className="font-bold text-foreground block">Require 2FA OTP</span>
                <span className="text-muted-foreground mt-0.5 block">Enable additional authentication step during login details check.</span>
              </div>
              <button 
                onClick={() => handleToggle('twoFactor')}
                className={`w-11 h-6 rounded-full transition-colors flex items-center px-1 ${
                  toggles.twoFactor ? 'bg-violet-600 justify-end' : 'bg-muted justify-start'
                }`}
              >
                <span className="w-4 h-4 bg-white rounded-full shadow" />
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
