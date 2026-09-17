import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, Phone, Briefcase, MapPin, Camera, CheckCircle2, Calendar, Building2, Edit2, User, Lock as LockIcon, Shield, Layers, FileEdit, Banknote } from 'lucide-react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useEmployee } from '../hooks/useEmployees';
import { useEmployeeProfessionalInfo } from '../hooks/useEmployeeProfile';
import { useProfileEditPermission } from '../hooks/useProfileEditPermission';
import { EmployeeDetailsCombined } from '../components/EmployeeDetailsCombined';
import { EmployeePayrollDetail } from '../components/EmployeePayrollDetail';
import { EmployeeCheckInSetting } from '../components/EmployeeCheckInSetting';
import { EmployeeRolesInfo } from '../components/EmployeeRolesInfo';
import { EmployeeDocuments } from '../components/EmployeeDocuments';
import { EmployeeStatutoryDetails } from '../components/EmployeeStatutoryDetails';
import { ProfilePhotoUploadModal } from '../components/ProfilePhotoUploadModal';
import { ProfileEditRequestModal } from '../components/ProfileEditRequestModal';
import { MyProfileRequestsView } from '../components/MyProfileRequestsView';
import { CoreCircularLoader } from '@/components/ui/core-circular-loader';

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  probation: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30',
  onboarding: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30',
  notice: 'bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/30',
  exit: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30',
  alumni: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/30',
  candidate: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30',
};

export function EmployeeProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const isSelf = !id || id === 'me';
  const targetId: number | string = isSelf ? 'me' : (parseInt(id, 10) || 'me');
  const { employee: loadedEmployee, isLoading, refetch } = useEmployee(targetId);
  const employee = loadedEmployee || ({
    id: typeof targetId === 'number' ? targetId : Number(user?.employeeId || 0),
    firstName: '',
    lastName: '',
    email: '',
    employeeCode: '',
    status: 'active',
  } as any);
  const resolvedEmpId = employee?.id || (typeof targetId === 'number' ? targetId : Number(user?.employeeId || 0));
  const { professionalInfo } = useEmployeeProfessionalInfo(resolvedEmpId);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [isEditRequestModalOpen, setIsEditRequestModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('details');

  // Check user roles to determine if user is Admin/HR
  const userRoles = Array.isArray(user?.roles) ? user.roles : [];
  const singleRole = (user as any)?.role || (user as any)?.accessRole || '';
  const allUserRoles = [...userRoles, singleRole];
  const isAdminOrHR = allUserRoles.some(r =>
    ['organization_admin', 'hr_admin', 'hr', 'hr_manager', 'super_admin', 'support'].includes(r)
  );

  // Employee portal edit lock applies ONLY to non-admin employees accessing /employee/*
  const isEmployeePortal = location.pathname.startsWith('/employee') && !isAdminOrHR;

  // Only fetch edit permission when in employee portal
  const { editUnlocked, approvedRequestId, unlockedSection } = useProfileEditPermission(resolvedEmpId);

  // Universal approval unlock: when an edit request is approved (editUnlocked is true) or for Admin/HR, unlock all sections for editing
  const isPhotoUnlocked = !isEmployeePortal || editUnlocked;
  const isBasicUnlocked = !isEmployeePortal || editUnlocked;
  const isPersonalUnlocked = !isEmployeePortal || editUnlocked;
  const isProfessionalUnlocked = !isEmployeePortal || editUnlocked;
  const isStatutoryUnlocked = !isEmployeePortal || editUnlocked;

  if (isLoading) {
    return <CoreCircularLoader />;
  }

  if (!loadedEmployee || !loadedEmployee.id) {
    return (
      <div className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-700 dark:text-rose-300 text-sm font-semibold">
        Employee profile not found.
      </div>
    );
  }

  const empAny = employee as any;
  const isTargetCeo = Boolean(
    !isSelf && empAny && (
      empAny.isCeo ||
      empAny.is_ceo ||
      empAny.accessRole === 'organization_admin' ||
      (empAny.employeeCode || empAny.employee_code || '').startsWith('CEO-')
    )
  );

  if (isTargetCeo) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 bg-card border border-border rounded-xl text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600 font-bold">
          <Shield className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-foreground">CEO Profile Access Restricted</h3>
        <p className="text-xs text-muted-foreground max-w-sm">
          Executive and CEO profiles are protected and cannot be viewed from the directory.
        </p>
        <Button size="sm" variant="outline" onClick={() => navigate('/employees')} className="h-8 text-xs cursor-pointer">
          Back to Employee Directory
        </Button>
      </div>
    );
  }

  const fullName = [employee.firstName, employee.middleName, employee.lastName]
    .filter(Boolean)
    .join(' ');
  const initials = `${employee.firstName?.[0] || ''}${employee.lastName?.[0] || ''}`.toUpperCase();
  const rawStatus = (employee as any)?.employeeStatus || (employee as any)?.employee_status || employee?.status || 'active';
  const status = String(rawStatus).toLowerCase().replace(/\s+/g, '_');
  const displayStatus = String(rawStatus).charAt(0).toUpperCase() + String(rawStatus).slice(1);
  // Resolve role label: prefer accessRole, then fall back to the first entry in roles[]
  // (mirrors the priority logic in getWithPermissions on the server)
  const empRoleCode = (
    (employee as any).accessRole ||
    ((employee as any).roles?.[0]) ||
    'employee'
  ).toLowerCase();
  const ROLE_LABEL_MAP: Record<string, string> = {
    super_admin: 'Super Admin',
    organization_admin: 'CEO',
    ceo: 'CEO',
    hr_admin: 'HR',
    hr: 'HR',
    hr_manager: 'HR Manager',
    support: 'Support',
    finance: 'Finance',
    finance_manager: 'Finance Manager',
    department_head: 'Department Manager',
    manager: 'Manager',
    team_lead: 'Team Lead',
    consultant: 'Consultant',
    intern: 'Intern',
    employee: 'Employee',
  };
  const roleLabel = ROLE_LABEL_MAP[empRoleCode] ||
    (empRoleCode ? empRoleCode.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) : 'Employee');


  const jobTitle = (professionalInfo as any)?.designation?.name || (professionalInfo as any)?.specialization || (employee as any)?.jobTitle || roleLabel;

  const handleEditProfileClick = () => {
    if (isPhotoUnlocked) {
      setIsPhotoModalOpen(true);
    } else if (isStatutoryUnlocked) {
      setActiveTab('statutory');
    } else {
      setActiveTab('details');
      if (isBasicUnlocked) {
        setIsEditingBasicInfo(true);
      }
    }
  };

  return (
    <div className="flex flex-col gap-4 pb-6 max-w-7xl mx-auto w-full">
      {/* ─── Compact Header Card ─── */}
      <Card className="overflow-hidden border border-border/80 shadow-2xs rounded-xl bg-card">
        {/* Cover Banner */}
        <div className="h-28 sm:h-32 bg-gradient-to-r from-blue-700 via-indigo-700 to-sky-800 relative">
          <div className="absolute inset-0 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px] opacity-15" />
        </div>

        {/* Profile Content Container */}
        <div className="px-4 sm:px-6 pb-4">
          {/* Avatar Row */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 -mt-12 sm:-mt-14 mb-3">
            <div
              className={`relative group self-start shrink-0 ${isPhotoUnlocked ? 'cursor-pointer' : 'cursor-not-allowed'}`}
              onClick={() => {
                if (isPhotoUnlocked) {
                  setIsPhotoModalOpen(true);
                } else {
                  setIsEditRequestModalOpen(true);
                }
              }}
              title={isPhotoUnlocked ? 'Click to change profile picture' : 'Request Profile Edit to change photo'}
            >
              <Avatar className="h-24 w-24 sm:h-28 sm:w-28 border-4 border-card shadow-md bg-card transition-transform group-hover:scale-102">
                <AvatarImage src={(employee as any).avatarUrl || undefined} alt={fullName} />
                <AvatarFallback className="text-xl font-black bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 text-white">
                  {initials || '??'}
                </AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold gap-1 backdrop-blur-[1px]">
                <Camera className="w-3.5 h-3.5" />
                <span>Upload</span>
              </div>
            </div>

            {/* Quick Action Buttons (Admin only) */}
            {!isEmployeePortal && (
              <div className="flex flex-wrap items-center gap-2 pt-1 sm:pt-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleEditProfileClick}
                  className="h-7 text-xs font-semibold gap-1.5 px-3 bg-card hover:bg-muted"
                >
                  {/* <Edit2 className="w-3.5 h-3.5 text-muted-foreground" /> */}
                  {/* Edit Profile */}
                </Button>
              </div>
            )}
          </div>

          {/* User Name & Details */}
          <div className="space-y-2">
            <div className="space-y-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                  {fullName}
                </h1>
                <CheckCircle2 className="w-4 h-4 text-blue-500 fill-blue-500/20" />
                <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-muted text-foreground border border-border/60">
                  {employee.employeeCode || `EMP-${employee.id}`}
                </span>
              </div>

              <p className="text-xs font-semibold text-foreground/80 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>{jobTitle}</span>
              </p>
            </div>

            {/* Badges Strip */}
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="outline" className={`text-[11px] font-bold py-0 ${STATUS_STYLES[status] || (status === 'inactive' ? 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/30' : STATUS_STYLES.active)}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-current mr-1 inline-block" />
                Status: {displayStatus}
              </Badge>
              <Badge variant="secondary" className="text-[11px] font-semibold bg-primary/10 text-primary border-primary/20 py-0">
                <Shield className="w-3 h-3 mr-1" /> Role: {roleLabel}
              </Badge>
              {employee.employmentType && (
                <Badge variant="outline" className="text-[11px] font-medium bg-muted/50 text-foreground/80 py-0">
                  Type: {employee.employmentType.replace(/_/g, ' ')}
                </Badge>
              )}

              {/* Dynamic Pay Slab Badge */}
              {(() => {
                const slabName = (employee as any)?.salarySlabName || (employee as any)?.payrollSlab || (employee as any)?.salary_slab_name || (employee as any)?.salarySlab || (employee as any)?.salary_slab;
                const annualCtc = Number((employee as any)?.annualCtc || (employee as any)?.annual_ctc || (employee as any)?.ctc || 0);

                return (
                  <>
                    <Badge variant="outline" className={`text-[11px] font-bold py-0 ${slabName ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30' : 'bg-muted/50 text-muted-foreground border-border/60'}`}>
                      <Layers className="w-3 h-3 mr-1 text-emerald-600 dark:text-emerald-400" />
                      Slab: {slabName || 'Not Assigned'}
                    </Badge>
                    {annualCtc > 0 && (
                      <Badge variant="outline" className="text-[11px] font-bold bg-primary/10 text-primary border-primary/20 py-0">
                        <Banknote className="w-3 h-3 mr-1" />
                        CTC: ₹{(annualCtc / 100000).toFixed(2)}L/yr
                      </Badge>
                    )}
                  </>
                );
              })()}
            </div>

            {/* Quick Contact Footer Strip */}
            <div className="pt-2 border-t border-border/60 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
              {employee.email && (
                <span className="inline-flex items-center gap-1.5 font-medium text-foreground/90">
                  <Mail className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <a href={`mailto:${employee.email}`} className="hover:underline hover:text-primary">
                    {employee.email}
                  </a>
                </span>
              )}
              {(employee.mobile || employee.phone) && (
                <span className="inline-flex items-center gap-1.5 font-medium text-foreground/90">
                  <Phone className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>{employee.mobile || employee.phone}</span>
                </span>
              )}
              {employee.department && (
                <span className="inline-flex items-center gap-1.5 font-medium text-foreground/90">
                  <Building2 className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                  <span>Dept: <strong>{employee.department}</strong></span>
                </span>
              )}
              {employee.dateOfJoining && (
                <span className="inline-flex items-center gap-1.5 font-medium text-muted-foreground">
                  <Calendar className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>Joined {new Date(employee.dateOfJoining).toLocaleDateString('en-GB', { month: 'short', day: '2-digit', year: 'numeric' })}</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Profile Photo Upload Modal & Edit Request Modal */}
      {employee && (
        <>
          <ProfilePhotoUploadModal
            open={isPhotoModalOpen}
            onOpenChange={setIsPhotoModalOpen}
            employee={employee}
            onSuccess={() => refetch()}
          />
          <ProfileEditRequestModal
            open={isEditRequestModalOpen}
            onOpenChange={setIsEditRequestModalOpen}
            employee={employee}
          />
        </>
      )}

      {/* ─── Compact Tabs Navigation ─── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-3">
        <div className="bg-card border border-border/80 rounded-lg p-1 shadow-2xs">
          <TabsList className={'grid w-full h-auto p-0 bg-transparent gap-1 ' + (isEmployeePortal ? 'grid-cols-2 sm:grid-cols-4 md:grid-cols-7' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-6')}>
            <TabsTrigger
              value="details"
              className="text-xs font-semibold py-1.5 border border-transparent data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:font-bold transition-all cursor-pointer rounded-md flex items-center gap-1.5"
            >
              <User className="w-3.5 h-3.5" />
              Details
            </TabsTrigger>

            <TabsTrigger
              value="payroll"
              className="text-xs font-semibold py-1.5 border border-transparent data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:font-bold transition-all cursor-pointer rounded-md flex items-center gap-1.5"
            >
              <Briefcase className="w-3.5 h-3.5" />
              Payroll
            </TabsTrigger>

            <TabsTrigger
              value="documents"
              className="text-xs font-semibold py-1.5 border border-transparent data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:font-bold transition-all cursor-pointer rounded-md flex items-center gap-1.5"
            >
              <Layers className="w-3.5 h-3.5" />
              Documents
            </TabsTrigger>

            <TabsTrigger
              value="statutory"
              className="text-xs font-semibold py-1.5 border border-transparent data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:font-bold transition-all cursor-pointer rounded-md flex items-center gap-1.5"
            >
              <LockIcon className="w-3.5 h-3.5" />
              Statutory
            </TabsTrigger>

            <TabsTrigger
              value="checkin"
              className="text-xs font-semibold py-1.5 border border-transparent data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:font-bold transition-all cursor-pointer rounded-md flex items-center gap-1.5"
            >
              <MapPin className="w-3.5 h-3.5" />
              Check-In Mode
            </TabsTrigger>

            <TabsTrigger
              value="roles"
              className="text-xs font-semibold py-1.5 border border-transparent data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:font-bold transition-all cursor-pointer rounded-md flex items-center gap-1.5"
            >
              <Shield className="w-3.5 h-3.5" />
              Roles
            </TabsTrigger>

            {isEmployeePortal && (
              <TabsTrigger
                value="requests"
                className="text-xs font-semibold py-1.5 border border-transparent data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:font-bold transition-all cursor-pointer rounded-md flex items-center gap-1.5"
              >
                <FileEdit className="w-3.5 h-3.5" />
                Requests
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        {/* Tab Contents */}
        <TabsContent value="details" className="mt-0 space-y-4">
          <EmployeeDetailsCombined
            employee={employee}
            editUnlocked={!isEmployeePortal || editUnlocked}
            isBasicUnlocked={isBasicUnlocked}
            isPersonalUnlocked={isPersonalUnlocked}
            isProfessionalUnlocked={isProfessionalUnlocked}
            isStatutoryUnlocked={isStatutoryUnlocked}
            approvedRequestId={approvedRequestId}
          />
        </TabsContent>

        <TabsContent value="payroll" className="mt-0 space-y-4">
          <EmployeePayrollDetail employee={employee} />
        </TabsContent>

        <TabsContent value="documents" className="mt-0 space-y-4">
          <EmployeeDocuments
            employeeId={employee.id as number}
            readOnly={isEmployeePortal}
            canEdit={!isEmployeePortal || editUnlocked}
          />
        </TabsContent>

        <TabsContent value="statutory" className="mt-0 space-y-4">
          <EmployeeStatutoryDetails
            employee={employee}
            onUpdate={() => refetch()}
            editUnlocked={isStatutoryUnlocked}
            approvedRequestId={approvedRequestId}
          />
        </TabsContent>

        <TabsContent value="checkin" className="mt-0 space-y-4">
          <EmployeeCheckInSetting employee={employee} readOnly={isEmployeePortal} />
        </TabsContent>

        <TabsContent value="roles" className="mt-0 space-y-4">
          <EmployeeRolesInfo employee={employee} onRoleUpdate={() => refetch()} readOnly={isEmployeePortal} />
        </TabsContent>

        {isEmployeePortal && (
          <TabsContent value="requests" className="mt-0 space-y-4">
            <MyProfileRequestsView employeeId={employee.id as number} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

export default EmployeeProfilePage;
