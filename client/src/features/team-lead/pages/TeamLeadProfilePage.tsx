import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/config/api';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useTeam } from '../hooks/useTeam';
import { getUserRoleAndDept } from '@/lib/userProfile';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog';
import {
  Mail, Phone, Building2, Calendar, ShieldCheck, CheckCircle2,
  Users, Briefcase, MapPin, Sparkles, User, Award, ExternalLink,
  Edit2, Camera, Shield, FileText, ChevronRight, Loader2, Save
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ProfilePhotoUploadModal } from '@/features/employee/components/ProfilePhotoUploadModal';

export function TeamLeadProfilePage() {
  const queryClient = useQueryClient();
  const { user, setUser } = useAuthStore();
  const [isSaving, setIsSaving] = useState(false);

  // ── 1. Fetch Logged-In Team Lead Profile via /employees/me ──
  const { data: fetchedEmployee, isLoading: isEmployeeLoading, refetch: refetchEmployee } = useQuery({
    queryKey: ['employee-me'],
    queryFn: async () => {
      try {
        const response = await apiClient.get('/employees/me');
        return response.data?.data || response.data;
      } catch (err) {
        console.warn('Failed to fetch /employees/me, falling back to session user', err);
        return null;
      }
    },
  });

  const { members, isMembersLoading } = useTeam();

  // Combined profile data (backend employee preferred over session user fallback)
  const emp = {
    ...(user || {}),
    ...(fetchedEmployee || {}),
  };
  const employeeId = parseInt(String(emp?.id || user?.employeeId || (user as any)?.employee_id || user?.id || 0), 10);

  // ── 2. Modal States & Edit Form ──
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    mobile: '',
    employeeCode: '',
    jobTitle: '',
  });

  const roleInfo = getUserRoleAndDept(user);
  const departmentName = emp.departmentName || emp.department?.name || emp.department || roleInfo.departmentName || 'Department';

  useEffect(() => {
    if (emp) {
      setEditForm({
        firstName: emp.firstName || emp.first_name || user?.firstName || '',
        lastName: emp.lastName || emp.last_name || user?.lastName || '',
        email: emp.email || user?.email || '',
        mobile: emp.mobile || emp.phone || user?.mobile || user?.phone || '',
        employeeCode: emp.employeeCode || emp.employee_code || emp.code || user?.employeeCode || '',
        jobTitle: emp.jobTitle || emp.job_title || emp.designation || 'Team Lead',
      });
    }
  }, [fetchedEmployee, user]);

  const handleSaveContactInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const response = await apiClient.put('/employees/me', editForm);
      const updatedData = response.data?.data || response.data;

      // Update React Query Cache immediately with saved profile data
      queryClient.setQueryData(['employee-me'], (old: any) => ({
        ...(old || {}),
        ...(updatedData || {}),
      }));

      toast.success('Profile details updated and saved to database!');
      setIsEditModalOpen(false);

      // Re-fetch database record and update local session store
      await refetchEmployee();
      if (setUser) {
        setUser({
          ...user,
          firstName: editForm.firstName,
          lastName: editForm.lastName,
          email: editForm.email,
          mobile: editForm.mobile,
          employeeCode: editForm.employeeCode,
          ...(updatedData || {}),
        });
      }
    } catch (err: any) {
      toast.error(err?.message || err?.response?.data?.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const fullName = `${emp.firstName || emp.first_name || editForm.firstName || user?.firstName || 'Team'} ${emp.lastName || emp.last_name || editForm.lastName || user?.lastName || 'Lead'}`.trim();
  const initials = `${(emp.firstName || editForm.firstName || user?.firstName || 'T')[0]}${(emp.lastName || editForm.lastName || user?.lastName || 'L')[0]}`.toUpperCase();
  const roleTitle = emp.jobTitle || emp.job_title || roleInfo.roleTitle || 'Team Lead';
  const orgName = user?.organizationName || user?.organizationCode || (user as any)?.organization?.name || 'Organization';
  const empCode = emp.employeeCode || emp.employee_code || emp.code || editForm.employeeCode || (employeeId ? `EMP-${employeeId}` : 'TL-1001');

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* ── Main Cover & Profile Card ── */}
      <Card className="overflow-hidden border border-border/80 shadow-2xs rounded-2xl bg-card">
        {/* Cover Banner */}
        <div className="h-32 sm:h-40 bg-gradient-to-r from-primary/90 via-primary/80 to-primary/70 relative overflow-hidden">
          <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:14px_14px]" />
          <div className="absolute top-3.5 right-4 flex items-center gap-2">
            <Badge className="bg-black/30 text-white backdrop-blur-md border-0 text-[10px] font-bold px-3 py-0.5 rounded-full gap-1.5">
              <Sparkles className="w-3 h-3 text-primary-foreground" />
              Team Lead Profile
            </Badge>
          </div>
        </div>

        {/* Profile Details Container */}
        <div className="px-6 sm:px-8 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-14 sm:-mt-16 mb-4">
            <div
              className="relative group cursor-pointer shrink-0"
              onClick={() => setIsPhotoModalOpen(true)}
              title="Click to update photo"
            >
              <Avatar className="h-28 w-28 sm:h-32 sm:w-32 border-4 border-card shadow-md bg-card transition-transform group-hover:scale-[1.02]">
                <AvatarImage src={emp.avatarUrl || emp.avatar_url || user?.avatarUrl} alt={fullName} />
                <AvatarFallback className="text-2xl sm:text-3xl font-black bg-primary text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold gap-1 backdrop-blur-[1px]">
                <Camera className="w-4 h-4" />
                <span>Upload</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => setIsEditModalOpen(true)}
                className="text-xs font-bold gap-1.5 rounded-xl shadow-2xs bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <Edit2 className="w-3.5 h-3.5" /> Edit Profile & Contact Info
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                  {fullName}
                </h1>
                <CheckCircle2 className="w-5 h-5 text-primary fill-primary/20" />
                <Badge variant="outline" className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-muted text-foreground border-border/80">
                  {empCode}
                </Badge>
              </div>

              <p className="text-xs sm:text-sm font-semibold text-foreground/80 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>{roleTitle} · {departmentName} Department at <strong>{orgName}</strong></span>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-primary/10 text-primary border-primary/20 text-[11px] font-bold py-0.5 px-3 rounded-full gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                Level 5 · Team Lead Authorization
              </Badge>
              <Badge variant="secondary" className="text-[11px] font-semibold bg-muted/80 text-foreground px-3 py-0.5 rounded-full">
                <Building2 className="w-3 h-3 mr-1 text-primary" />
                {departmentName}
              </Badge>
              <Badge variant="outline" className="text-[11px] font-medium border-primary/20 text-primary bg-primary/5 px-3 py-0.5 rounded-full">
                Active Staff
              </Badge>
            </div>

            <div className="pt-3 border-t border-border/60 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
              {(emp.email || editForm.email) && (
                <span className="inline-flex items-center gap-1.5 font-medium text-foreground/90">
                  <Mail className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <a href={`mailto:${emp.email || editForm.email}`} className="hover:underline hover:text-emerald-600">
                    {emp.email || editForm.email}
                  </a>
                </span>
              )}
              {(emp.mobile || emp.phone || editForm.mobile) && (
                <span className="inline-flex items-center gap-1.5 font-medium text-foreground/90">
                  <Phone className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span>{emp.mobile || emp.phone || editForm.mobile}</span>
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 font-medium text-foreground/90">
                <Users className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                <span>Team Size: <strong>{members.length} Direct Reports</strong></span>
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* ── Grid Sections ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Column (About & Experience) */}
        <div className="lg:col-span-2 space-y-6">


          {/* Position & Hierarchy */}
          <Card className="border border-border/80 bg-card shadow-2xs">
            <CardHeader className="pb-3 border-b border-border/60 px-5 pt-5">
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-primary" />
                Professional Position & Hierarchy
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-start gap-3.5">
                <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-foreground">{roleTitle}</h3>
                    <Badge variant="outline" className="text-[9px] font-bold uppercase bg-primary/10 text-primary border-primary/20">
                      Present Role
                    </Badge>
                  </div>
                  <p className="text-xs font-semibold text-primary">{orgName}</p>
                  <p className="text-xs text-muted-foreground">{departmentName} Department · Full-Time</p>
                </div>
              </div>

              {/* Hierarchy Tree Card */}
              <div className="bg-muted/40 p-3.5 rounded-xl border border-border/60 space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-primary" /> Management Reporting Line
                </p>
                <div className="flex items-center gap-2 text-xs font-bold text-foreground pt-0.5">
                  <span className="text-foreground/80">Department Head (Mgr)</span>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-primary">{fullName} (Team Lead)</span>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">{members.length} Direct Staff (Emps)</span>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Right Column (Direct Reports & Credentials) */}
        <div className="space-y-6">

          {/* Assigned Team Roster */}
          <Card className="border border-border/80 bg-card shadow-2xs">
            <CardHeader className="pb-3 border-b border-border/60 px-5 pt-5">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  Direct Reports
                </CardTitle>
                <Badge variant="secondary" className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-border/60">
                  {members.length} Members
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {isMembersLoading ? (
                <div className="py-8 text-center text-xs text-muted-foreground">Loading team roster...</div>
              ) : members.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground px-4">No team members assigned</div>
              ) : (
                <div className="divide-y divide-border/50 max-h-[360px] overflow-y-auto">
                  {members.map((m: any) => {
                    const firstName = m.firstName || m.first_name || '';
                    const lastName = m.lastName || m.last_name || '';
                    const fullName = `${firstName} ${lastName}`.trim() || m.name || m.email || `Employee #${m.id}`;
                    const mInitials = `${firstName[0] || fullName[0] || 'E'}${lastName[0] || ''}`.toUpperCase();

                    return (
                      <div key={m.id} className="flex items-center gap-3 p-3.5 hover:bg-muted/40 transition-colors">
                        <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0 border border-primary/20">
                          {mInitials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-foreground truncate">{fullName}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{m.designation || 'Specialist'}</p>
                        </div>
                        <Badge variant="outline" className="text-[9px] font-mono shrink-0 uppercase bg-muted/60 text-muted-foreground border-border/80">
                          {m.employeeCode || m.code || `EMP-${m.id}`}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Account Credentials Card */}
          <Card className="border border-border/80 bg-card shadow-2xs">
            <CardHeader className="pb-3 border-b border-border/60 px-5 pt-5">
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" />
                Account Credentials
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-3 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-medium">Employee Code</span>
                <span className="font-mono font-bold text-foreground">{empCode}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-medium">Access Scope</span>
                <span className="font-bold text-primary">Team Lead Portal</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-medium">Organization</span>
                <span className="font-bold text-foreground truncate max-w-[160px] text-right">{orgName}</span>
              </div>
            </CardContent>
          </Card>

        </div>

      </div>

      {/* Profile Photo Upload Modal */}
      {employeeId > 0 && (
        <ProfilePhotoUploadModal
          open={isPhotoModalOpen}
          onOpenChange={setIsPhotoModalOpen}
          employee={{ id: employeeId, firstName: editForm.firstName, lastName: editForm.lastName } as any}
          onSuccess={() => refetchEmployee()}
        />
      )}

      {/* Edit Profile Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[480px] rounded-2xl p-6 bg-card border border-border shadow-2xl">
          <DialogHeader className="pb-3 border-b">
            <DialogTitle className="text-lg font-bold">Edit Profile & Contact Info</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Update your personal info, contact details, and leadership bio saved in the database
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveContactInfo} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground block">First Name</label>
                <input
                  type="text"
                  value={editForm.firstName}
                  onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                  className="w-full h-9 px-3 text-xs bg-background border border-input rounded-xl focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground block">Last Name</label>
                <input
                  type="text"
                  value={editForm.lastName}
                  onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                  className="w-full h-9 px-3 text-xs bg-background border border-input rounded-xl focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground block">Employee Code</label>
                <input
                  type="text"
                  value={editForm.employeeCode}
                  onChange={(e) => setEditForm({ ...editForm, employeeCode: e.target.value })}
                  className="w-full h-9 px-3 text-xs bg-background border border-input rounded-xl focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground block">Job Title / Role</label>
                <input
                  type="text"
                  value={editForm.jobTitle}
                  onChange={(e) => setEditForm({ ...editForm, jobTitle: e.target.value })}
                  className="w-full h-9 px-3 text-xs bg-background border border-input rounded-xl focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Team Lead / Senior Specialist"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground block">Official Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full h-9 px-3 text-xs bg-background border border-input rounded-xl focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground block">Mobile / Phone</label>
                <input
                  type="text"
                  value={editForm.mobile}
                  onChange={(e) => setEditForm({ ...editForm, mobile: e.target.value })}
                  className="w-full h-9 px-3 text-xs bg-background border border-input rounded-xl focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="+1 234 567 890"
                />
              </div>
            </div>


            <div className="pt-3 border-t flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditModalOpen(false)}
                className="rounded-xl text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="rounded-xl text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 shadow"
              >
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save Changes
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
