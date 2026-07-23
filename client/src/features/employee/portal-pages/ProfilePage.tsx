import React, { useState } from 'react';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useEmployee } from '../hooks/useEmployees';
import { User, Mail, Phone, Briefcase, Calendar, Shield, MapPin, Building, Lock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function ProfilePage() {
  const { user } = useAuthStore();
  const { employee, isLoading } = useEmployee(user?.employeeId || 0);
  const [activeTab, setActiveTab] = useState<'personal' | 'job' | 'emergency'>('personal');

  const empName = employee ? `${employee.firstName} ${employee.lastName}` : `${user?.firstName || 'Employee'} ${user?.lastName || ''}`;
  const empCode = employee?.employeeCode || '#EMP12345';
  const designation = employee?.designation || 'Software Engineer';
  const department = employee?.department || 'Engineering';

  const [personalInfo, setPersonalInfo] = useState({
    phone: employee?.mobile || '+91 98765 43210',
    address: '123, Tech Park Residency, Pune',
    personalEmail: 'narendra.personal@gmail.com',
  });

  const [emergencyInfo, setEmergencyInfo] = useState({
    name: 'Rohit Gaikwad',
    relationship: 'Brother',
    phone: '+91 98765 00112',
  });

  const handleSavePersonal = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Personal contact details updated successfully.');
  };

  const handleSaveEmergency = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Emergency contact details updated successfully.');
  };

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="bg-card border rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-violet-600 text-white flex items-center justify-center text-2xl font-extrabold shadow">
            {empName.split(' ').map(w => w[0]).join('').toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">{empName}</h2>
            <p className="text-sm text-muted-foreground">{designation} • {department}</p>
            <p className="text-xs text-muted-foreground mt-1 font-mono bg-muted px-2 py-0.5 rounded w-max">{empCode}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">Change Avatar</Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b pb-px">
        {(['personal', 'job', 'emergency'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
              activeTab === tab
                ? 'border-violet-600 text-violet-600 font-extrabold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab === 'personal' && 'Personal Information'}
            {tab === 'job' && 'Job & Work Profile'}
            {tab === 'emergency' && 'Emergency Contacts'}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      {activeTab === 'personal' && (
        <Card className="border rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <User className="w-4 h-4 text-violet-500" /> Personal Contact Details
            </CardTitle>
            <CardDescription>Update your personal phone, address, and personal email info.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSavePersonal} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Work Email</label>
                  <Input value={employee?.email || user?.email} disabled className="bg-muted" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Personal Email</label>
                  <Input
                    type="email"
                    value={personalInfo.personalEmail}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, personalEmail: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Contact Number</label>
                  <Input
                    value={personalInfo.phone}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Permanent Address</label>
                  <Input
                    value={personalInfo.address}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, address: e.target.value })}
                  />
                </div>
              </div>
              <Button type="submit" className="bg-violet-600 hover:bg-violet-700 text-white font-bold">
                Save Changes
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {activeTab === 'job' && (
        <Card className="border rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-violet-500" /> Job Profile & Employment
            </CardTitle>
            <CardDescription>Official employment settings and hierarchy mapping.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Joined Date</span>
                <span className="text-sm font-semibold text-foreground">
                  {employee?.dateOfJoining ? new Date(employee.dateOfJoining).toLocaleDateString() : 'N/A'}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Employment Type</span>
                <span className="text-sm font-semibold text-foreground capitalize">
                  {employee?.employmentType ? employee.employmentType.replace('_', ' ') : 'Full Time'}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Location</span>
                <span className="text-sm font-semibold text-foreground">Pune HQ</span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Reporting Manager</span>
                <span className="text-sm font-semibold text-foreground">Company Admin</span>
              </div>
            </div>
            <Separator />
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Assigned Roles & Security</h4>
              <div className="flex gap-2">
                <Badge className="bg-violet-100 text-violet-800 dark:bg-violet-950/60 dark:text-violet-300 border-violet-200">
                  Employee Self Service
                </Badge>
                <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200">
                  Active status
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'emergency' && (
        <Card className="border rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Shield className="w-4 h-4 text-violet-500" /> Emergency Contacts
            </CardTitle>
            <CardDescription>Please state details of a trusted contact to reach in emergency circumstances.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveEmergency} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Contact Name</label>
                  <Input
                    value={emergencyInfo.name}
                    onChange={(e) => setEmergencyInfo({ ...emergencyInfo, name: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Relationship</label>
                  <Input
                    value={emergencyInfo.relationship}
                    onChange={(e) => setEmergencyInfo({ ...emergencyInfo, relationship: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Phone Number</label>
                  <Input
                    value={emergencyInfo.phone}
                    onChange={(e) => setEmergencyInfo({ ...emergencyInfo, phone: e.target.value })}
                  />
                </div>
              </div>
              <Button type="submit" className="bg-violet-600 hover:bg-violet-700 text-white font-bold">
                Save Emergency Contact
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
