import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useEmployee } from '../hooks/useEmployees';
import { useEmployeeProfessionalInfo } from '../hooks/useEmployeeProfile';
import { useProfileEditPermission } from '../hooks/useProfileEditPermission';
import { apiClient } from '@/config/api';

import {
  User,
  Mail,
  Phone,
  Briefcase,
  Calendar,
  Shield,
  MapPin,
  Building,
  Lock,
  Unlock,
  Camera,
  HeartHandshake,
  Home,
  Save,
  Sparkles,
  CheckCircle2,
  BadgeCheck,
  UserCheck,
  Clock,
  Loader2,
  CheckCircle,
  Building2,
  Globe,
  ShieldCheck,
  Key,
  ChevronRight,
  Palette,
  Check,
  Edit2,
  IndianRupee,
  Layers,
  FileEdit,
  AlertTriangle,
  Info,
} from 'lucide-react';

import { ProfilePhotoUploadModal } from '../components/ProfilePhotoUploadModal';
import { ProfileEditRequestModal } from '../components/ProfileEditRequestModal';
import { EmployeeDetailsCombined } from '../components/EmployeeDetailsCombined';
import { EmployeePayrollDetail } from '../components/EmployeePayrollDetail';
import { EmployeeCheckInSetting } from '../components/EmployeeCheckInSetting';
import { EmployeeRolesInfo } from '../components/EmployeeRolesInfo';
import { EmployeeDocuments } from '../components/EmployeeDocuments';
import { EmployeeStatutoryDetails } from '../components/EmployeeStatutoryDetails';
import { MyProfileRequestsView } from '../components/MyProfileRequestsView';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ── Role Color Theme Presets (4 Themes Per Role) ──────────────────────────────
export interface ThemePreset {
  id: string;
  name: string;
  gradient: string;
  bgAccent: string;
  borderAccent: string;
  textAccent: string;
  badgeBg: string;
  buttonBg: string;
  ringColor: string;
}

const ROLE_THEMES: Record<string, ThemePreset[]> = {
  intern: [
    {
      id: 'amber-sunset',
      name: 'Amber Sunset',
      gradient: 'from-amber-600 via-orange-500 to-amber-700',
      bgAccent: 'bg-amber-500/10 dark:bg-amber-950/40',
      borderAccent: 'border-amber-300 dark:border-amber-800',
      textAccent: 'text-amber-600 dark:text-amber-400',
      badgeBg: 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30',
      buttonBg: 'bg-amber-600 hover:bg-amber-700 text-white',
      ringColor: 'ring-amber-500/50',
    },
    {
      id: 'golden-sand',
      name: 'Golden Sand',
      gradient: 'from-yellow-600 via-amber-600 to-yellow-700',
      bgAccent: 'bg-yellow-500/10 dark:bg-yellow-950/40',
      borderAccent: 'border-yellow-300 dark:border-yellow-800',
      textAccent: 'text-yellow-600 dark:text-yellow-400',
      badgeBg: 'bg-yellow-500/15 text-yellow-800 dark:text-yellow-300 border-yellow-500/30',
      buttonBg: 'bg-yellow-600 hover:bg-yellow-700 text-white',
      ringColor: 'ring-yellow-500/50',
    },
    {
      id: 'coral-rose',
      name: 'Coral Rose',
      gradient: 'from-rose-600 via-orange-500 to-pink-700',
      bgAccent: 'bg-rose-500/10 dark:bg-rose-950/40',
      borderAccent: 'border-rose-300 dark:border-rose-800',
      textAccent: 'text-rose-600 dark:text-rose-400',
      badgeBg: 'bg-rose-500/15 text-rose-800 dark:text-rose-300 border-rose-500/30',
      buttonBg: 'bg-rose-600 hover:bg-rose-700 text-white',
      ringColor: 'ring-rose-500/50',
    },
    {
      id: 'tangerine-flare',
      name: 'Tangerine Flare',
      gradient: 'from-orange-600 via-amber-500 to-red-600',
      bgAccent: 'bg-orange-500/10 dark:bg-orange-950/40',
      borderAccent: 'border-orange-300 dark:border-orange-800',
      textAccent: 'text-orange-600 dark:text-orange-400',
      badgeBg: 'bg-orange-500/15 text-orange-800 dark:text-orange-300 border-orange-500/30',
      buttonBg: 'bg-orange-600 hover:bg-orange-700 text-white',
      ringColor: 'ring-orange-500/50',
    },
  ],
  consultant: [
    {
      id: 'royal-violet',
      name: 'Royal Violet',
      gradient: 'from-violet-700 via-purple-700 to-indigo-800',
      bgAccent: 'bg-violet-500/10 dark:bg-violet-950/40',
      borderAccent: 'border-violet-300 dark:border-violet-800',
      textAccent: 'text-violet-600 dark:text-violet-400',
      badgeBg: 'bg-violet-500/15 text-violet-800 dark:text-violet-300 border-violet-500/30',
      buttonBg: 'bg-violet-600 hover:bg-violet-700 text-white',
      ringColor: 'ring-violet-500/50',
    },
    {
      id: 'electric-purple',
      name: 'Electric Purple',
      gradient: 'from-purple-700 via-fuchsia-700 to-violet-800',
      bgAccent: 'bg-purple-500/10 dark:bg-purple-950/40',
      borderAccent: 'border-purple-300 dark:border-purple-800',
      textAccent: 'text-purple-600 dark:text-purple-400',
      badgeBg: 'bg-purple-500/15 text-purple-800 dark:text-purple-300 border-purple-500/30',
      buttonBg: 'bg-purple-600 hover:bg-purple-700 text-white',
      ringColor: 'ring-purple-500/50',
    },
    {
      id: 'midnight-indigo',
      name: 'Midnight Indigo',
      gradient: 'from-indigo-800 via-slate-900 to-purple-900',
      bgAccent: 'bg-indigo-500/10 dark:bg-indigo-950/40',
      borderAccent: 'border-indigo-300 dark:border-indigo-800',
      textAccent: 'text-indigo-600 dark:text-indigo-400',
      badgeBg: 'bg-indigo-500/15 text-indigo-800 dark:text-indigo-300 border-indigo-500/30',
      buttonBg: 'bg-indigo-600 hover:bg-indigo-700 text-white',
      ringColor: 'ring-indigo-500/50',
    },
    {
      id: 'slate-steel',
      name: 'Slate Steel',
      gradient: 'from-slate-800 via-cyan-900 to-slate-950',
      bgAccent: 'bg-slate-500/10 dark:bg-slate-950/40',
      borderAccent: 'border-slate-300 dark:border-slate-800',
      textAccent: 'text-slate-600 dark:text-slate-400',
      badgeBg: 'bg-slate-500/15 text-slate-800 dark:text-slate-300 border-slate-500/30',
      buttonBg: 'bg-slate-700 hover:bg-slate-800 text-white',
      ringColor: 'ring-slate-500/50',
    },
  ],
  manager: [
    {
      id: 'crimson-executive',
      name: 'Crimson Executive',
      gradient: 'from-rose-700 via-red-700 to-amber-800',
      bgAccent: 'bg-rose-500/10 dark:bg-rose-950/40',
      borderAccent: 'border-rose-300 dark:border-rose-800',
      textAccent: 'text-rose-600 dark:text-rose-400',
      badgeBg: 'bg-rose-500/15 text-rose-800 dark:text-rose-300 border-rose-500/30',
      buttonBg: 'bg-rose-600 hover:bg-rose-700 text-white',
      ringColor: 'ring-rose-500/50',
    },
    {
      id: 'deep-indigo',
      name: 'Deep Indigo',
      gradient: 'from-indigo-800 via-blue-900 to-purple-900',
      bgAccent: 'bg-indigo-500/10 dark:bg-indigo-950/40',
      borderAccent: 'border-indigo-300 dark:border-indigo-800',
      textAccent: 'text-indigo-600 dark:text-indigo-400',
      badgeBg: 'bg-indigo-500/15 text-indigo-800 dark:text-indigo-300 border-indigo-500/30',
      buttonBg: 'bg-indigo-600 hover:bg-indigo-700 text-white',
      ringColor: 'ring-indigo-500/50',
    },
    {
      id: 'midnight-sapphire',
      name: 'Midnight Sapphire',
      gradient: 'from-slate-900 via-blue-950 to-indigo-950',
      bgAccent: 'bg-blue-500/10 dark:bg-blue-950/40',
      borderAccent: 'border-blue-300 dark:border-blue-800',
      textAccent: 'text-blue-600 dark:text-blue-400',
      badgeBg: 'bg-blue-500/15 text-blue-800 dark:text-blue-300 border-blue-500/30',
      buttonBg: 'bg-blue-600 hover:bg-blue-700 text-white',
      ringColor: 'ring-blue-500/50',
    },
    {
      id: 'forest-emerald',
      name: 'Forest Emerald',
      gradient: 'from-emerald-800 via-teal-900 to-emerald-950',
      bgAccent: 'bg-emerald-500/10 dark:bg-emerald-950/40',
      borderAccent: 'border-emerald-300 dark:border-emerald-800',
      textAccent: 'text-emerald-600 dark:text-emerald-400',
      badgeBg: 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30',
      buttonBg: 'bg-emerald-600 hover:bg-emerald-700 text-white',
      ringColor: 'ring-emerald-500/50',
    },
  ],
  team_lead: [
    {
      id: 'teal-command',
      name: 'Teal Command',
      gradient: 'from-teal-700 via-emerald-700 to-cyan-800',
      bgAccent: 'bg-teal-500/10 dark:bg-teal-950/40',
      borderAccent: 'border-teal-300 dark:border-teal-800',
      textAccent: 'text-teal-600 dark:text-teal-400',
      badgeBg: 'bg-teal-500/15 text-teal-800 dark:text-teal-300 border-teal-500/30',
      buttonBg: 'bg-teal-600 hover:bg-teal-700 text-white',
      ringColor: 'ring-teal-500/50',
    },
    {
      id: 'cyan-breeze',
      name: 'Cyan Breeze',
      gradient: 'from-cyan-600 via-sky-600 to-blue-700',
      bgAccent: 'bg-cyan-500/10 dark:bg-cyan-950/40',
      borderAccent: 'border-cyan-300 dark:border-cyan-800',
      textAccent: 'text-cyan-600 dark:text-cyan-400',
      badgeBg: 'bg-cyan-500/15 text-cyan-800 dark:text-cyan-300 border-cyan-500/30',
      buttonBg: 'bg-cyan-600 hover:bg-cyan-700 text-white',
      ringColor: 'ring-cyan-500/50',
    },
    {
      id: 'royal-blue',
      name: 'Royal Blue',
      gradient: 'from-blue-700 via-indigo-700 to-sky-800',
      bgAccent: 'bg-blue-500/10 dark:bg-blue-950/40',
      borderAccent: 'border-blue-300 dark:border-blue-800',
      textAccent: 'text-blue-600 dark:text-blue-400',
      badgeBg: 'bg-blue-500/15 text-blue-800 dark:text-blue-300 border-blue-500/30',
      buttonBg: 'bg-blue-600 hover:bg-blue-700 text-white',
      ringColor: 'ring-blue-500/50',
    },
    {
      id: 'amber-blaze',
      name: 'Amber Blaze',
      gradient: 'from-amber-600 via-orange-600 to-red-700',
      bgAccent: 'bg-amber-500/10 dark:bg-amber-950/40',
      borderAccent: 'border-amber-300 dark:border-amber-800',
      textAccent: 'text-amber-600 dark:text-amber-400',
      badgeBg: 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30',
      buttonBg: 'bg-amber-600 hover:bg-amber-700 text-white',
      ringColor: 'ring-amber-500/50',
    },
  ],
  employee: [
    {
      id: 'ocean-blue',
      name: 'Ocean Blue',
      gradient: 'from-blue-700 via-indigo-700 to-slate-900',
      bgAccent: 'bg-blue-500/10 dark:bg-blue-950/40',
      borderAccent: 'border-blue-300 dark:border-blue-800',
      textAccent: 'text-blue-600 dark:text-blue-400',
      badgeBg: 'bg-blue-500/15 text-blue-800 dark:text-blue-300 border-blue-500/30',
      buttonBg: 'bg-blue-600 hover:bg-blue-700 text-white',
      ringColor: 'ring-blue-500/50',
    },
    {
      id: 'emerald-green',
      name: 'Emerald Green',
      gradient: 'from-emerald-700 via-teal-700 to-slate-900',
      bgAccent: 'bg-emerald-500/10 dark:bg-emerald-950/40',
      borderAccent: 'border-emerald-300 dark:border-emerald-800',
      textAccent: 'text-emerald-600 dark:text-emerald-400',
      badgeBg: 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30',
      buttonBg: 'bg-emerald-600 hover:bg-emerald-700 text-white',
      ringColor: 'ring-emerald-500/50',
    },
    {
      id: 'sapphire-indigo',
      name: 'Sapphire Indigo',
      gradient: 'from-indigo-700 via-violet-800 to-slate-950',
      bgAccent: 'bg-indigo-500/10 dark:bg-indigo-950/40',
      borderAccent: 'border-indigo-300 dark:border-indigo-800',
      textAccent: 'text-indigo-600 dark:text-indigo-400',
      badgeBg: 'bg-indigo-500/15 text-indigo-800 dark:text-indigo-300 border-indigo-500/30',
      buttonBg: 'bg-indigo-600 hover:bg-indigo-700 text-white',
      ringColor: 'ring-indigo-500/50',
    },
    {
      id: 'amethyst-orchid',
      name: 'Amethyst Orchid',
      gradient: 'from-purple-700 via-pink-700 to-slate-900',
      bgAccent: 'bg-purple-500/10 dark:bg-purple-950/40',
      borderAccent: 'border-purple-300 dark:border-purple-800',
      textAccent: 'text-purple-600 dark:text-purple-400',
      badgeBg: 'bg-purple-500/15 text-purple-800 dark:text-purple-300 border-purple-500/30',
      buttonBg: 'bg-purple-600 hover:bg-purple-700 text-white',
      ringColor: 'ring-purple-500/50',
    },
  ],
};

const ROLE_PRIORITY: Record<string, number> = {
  super_admin: 100, organization_admin: 90, ceo: 90, hr_admin: 80, hr: 80,
  hr_manager: 70, support: 70, finance: 70, finance_manager: 70,
  department_head: 60, manager: 60, team_lead: 50, consultant: 20,
  intern: 10, employee: 5,
};

function resolveEffectiveRole(...values: unknown[]): string {
  const candidates = values
    .flatMap((value) => Array.isArray(value) ? value : [value])
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .map((value) => value.trim().toLowerCase().replace(/[\s-]+/g, '_'));
  return candidates.sort((a, b) => (ROLE_PRIORITY[b] ?? 0) - (ROLE_PRIORITY[a] ?? 0))[0] || 'employee';
}

export default function ProfilePage() {
  const { user } = useAuthStore();
  // Always resolve identity through the authenticated employee endpoint.  A
  // users.id is not an employees.id, especially for managers and team leads.
  const { employee, isLoading, refetch } = useEmployee('me');
  const resolvedEmpId = Number(employee?.id || 0);
  const { professionalInfo } = useEmployeeProfessionalInfo(resolvedEmpId);

  const [activeTab, setActiveTab] = useState<
    'details' | 'payroll' | 'documents' | 'statutory' | 'checkin' | 'roles'
  >('details');

  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [isEditRequestModalOpen, setIsEditRequestModalOpen] = useState(false);

  // HR Profile Face Photo Update Request State
  const [hrRequestOpen, setHrRequestOpen] = useState(false);
  const [hrRequestNote, setHrRequestNote] = useState('');
  const [hrRequestSending, setHrRequestSending] = useState(false);
  const [hrRequestSent, setHrRequestSent] = useState(false);

  // Password Security Form State
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  // Role Determination & Theme Switcher
  // Always read from auth store (user) — it is updated on login and reflects the assigned role correctly.
  const roleCode = resolveEffectiveRole(
    employee?.accessRole,
    (employee as any)?.access_role,
    (employee as any)?.roles,
    user?.accessRole,
    user?.role,
    user?.roles,
  );
  const normalizedRole = roleCode.includes('finance')
    ? 'finance'
    : roleCode.includes('intern')
    ? 'intern'
    : roleCode.includes('consultant')
    ? 'consultant'
    : roleCode.includes('manager') || roleCode.includes('department_head')
    ? 'manager'
    : roleCode.includes('team_lead')
    ? 'team_lead'
    : 'employee';

  const availableThemes = ROLE_THEMES[normalizedRole] || ROLE_THEMES.employee;
  const [selectedThemeIndex, setSelectedThemeIndex] = useState<number>(() => {
    const saved = localStorage.getItem(`emp_profile_theme_idx_${normalizedRole}`);
    if (saved !== null) {
      const idx = parseInt(saved, 10);
      if (!isNaN(idx) && idx >= 0 && idx < availableThemes.length) return idx;
    }
    return 0;
  });

  const theme = availableThemes[selectedThemeIndex] || availableThemes[0];

  // Check user roles to determine if user is Admin/HR
  const userRoles = Array.isArray(user?.roles) ? user.roles : [];
  const singleRole = user?.role || user?.accessRole || '';
  const allUserRoles = [...userRoles, singleRole];
  const isAdminOrHR = allUserRoles.some(r =>
    ['organization_admin', 'hr_admin', 'hr', 'hr_manager', 'super_admin', 'support'].includes(r)
  );

  // Employee portal edit lock applies ONLY to non-admin users in self-service portal
  const isEmployeePortal = !isAdminOrHR;

  // ── Profile Edit Permission Hook (Locks Profile Until HR Approval) ──
  const { editUnlocked, approvedRequestId, unlockedSection, refetch: refetchPermissions } = useProfileEditPermission(resolvedEmpId);

  // Lock status definitions:
  // Admin/HR always unlocked; Employees locked by default until editUnlocked is true via approved HR edit request.
  const isPhotoUnlocked = !isEmployeePortal || editUnlocked;
  const isBasicUnlocked = !isEmployeePortal || editUnlocked;
  const isPersonalUnlocked = !isEmployeePortal || editUnlocked;
  const isProfessionalUnlocked = !isEmployeePortal || editUnlocked;
  const isStatutoryUnlocked = !isEmployeePortal || editUnlocked;

  // Change Account Password handler
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordForm.currentPassword) {
      toast.error('Please enter your current password.');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long.');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match!');
      return;
    }

    setIsSavingPassword(true);
    try {
      if (resolvedEmpId) {
        await apiClient.put(`/employees/${resolvedEmpId}`, {
          password: passwordForm.newPassword,
        });
        toast.success('Password updated successfully! Use your new password on next login.');
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update password.');
    } finally {
      setIsSavingPassword(false);
    }
  };

  // HR PROFILE FACE UPDATE REQUEST HANDLER
  const handleSendHRProfileRequest = async () => {
    try {
      setHrRequestSending(true);
      await apiClient.post('/notifications/send', {
        type: 'hr_profile_update_request',
        message: `Employee ${empName} (${empCode}) requested biometric profile photo update approval for face recognition. ${
          hrRequestNote ? `Note: ${hrRequestNote}` : ''
        }`,
        employeeId: resolvedEmpId,
        priority: 'normal',
      }).catch(() => {});

      setHrRequestSent(true);
      setHrRequestNote('');
      toast.success('Request submitted to HR / Admin for approval!', {
        description: 'HR will review your request and update your biometric profile photo.',
        duration: 6000,
      });
      setTimeout(() => {
        setHrRequestSent(false);
        setHrRequestOpen(false);
      }, 3000);
    } catch (err: any) {
      toast.error('Failed to submit request to HR. Please try again.');
    } finally {
      setHrRequestSending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-3">
        <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
        <p className="text-xs text-muted-foreground font-medium">Loading employee profile...</p>
      </div>
    );
  }

  const activeEmp = employee || ({
    id: resolvedEmpId,
    firstName: user?.firstName || 'Employee',
    lastName: user?.lastName || '',
    email: user?.email || '',
    employeeCode: user?.employeeCode || `EMP-${resolvedEmpId}`,
    status: 'active',
  } as any);

  const empName = [activeEmp.firstName, activeEmp.middleName, activeEmp.lastName].filter(Boolean).join(' ');
  const empCode = activeEmp.employeeCode || `EMP-${activeEmp.id}`;
  const initials = `${activeEmp.firstName?.[0] || ''}${activeEmp.lastName?.[0] || ''}`.toUpperCase() || 'EMP';
  const status = (activeEmp.status || 'active').toLowerCase();

  // Use auth store's roleCode (already computed above) — it always reflects the correct assigned role.
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
  const roleLabel = ROLE_LABEL_MAP[roleCode] || (roleCode ? roleCode.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Employee');

  const jobTitle = (professionalInfo as any)?.designation?.name || (professionalInfo as any)?.specialization || (activeEmp as any)?.jobTitle || roleLabel;
  const department = activeEmp.department || (activeEmp as any)?.department_name || (user as any)?.departmentName || 'Engineering & Product';
  const employmentType = activeEmp.employmentType || (activeEmp as any)?.emp_type || 'Full-Time Permanent';

  return (
    <div className="max-w-7xl mx-auto py-4 px-3 sm:px-6 space-y-6 font-sans">

      {/* ─────────────────────────────────────────────────────────────
          HERO BANNER CARD (EXACT SKETCH LAYOUT: LEFT AVATAR OVERLAP)
      ───────────────────────────────────────────────────────────── */}
      <div className="bg-card border border-border/80 rounded-3xl shadow-sm overflow-hidden relative">
        {/* Cover Banner with Dynamic Theme Gradient */}
        <div className={cn("h-32 sm:h-36 w-full bg-gradient-to-r relative overflow-hidden transition-all duration-500", theme.gradient)}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.15),transparent_60%)]" />

          {/* Top Right Controls: 4-Color Theme Selector + Lock Status Badge */}
          <div className="absolute top-3 right-3 flex flex-wrap items-center gap-2 z-10">
            {/* Color Theme Selector Pill */}
            <div className="flex items-center gap-1 bg-black/40 backdrop-blur-md border border-white/20 p-1 rounded-full text-white text-xs">
              <Palette className="w-3.5 h-3.5 ml-1.5 mr-0.5 text-white/80" />
              {availableThemes.map((t, idx) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setSelectedThemeIndex(idx);
                    localStorage.setItem(`emp_profile_theme_idx_${normalizedRole}`, String(idx));
                  }}
                  title={t.name}
                  className={cn(
                    "w-5 h-5 rounded-full border border-white/40 transition-all flex items-center justify-center cursor-pointer",
                    t.buttonBg,
                    selectedThemeIndex === idx && "ring-2 ring-white scale-110 shadow-md font-bold"
                  )}
                >
                  {selectedThemeIndex === idx && <Check className="w-3 h-3 text-white stroke-[3]" />}
                </button>
              ))}
            </div>

           
            
          </div>
        </div>

        {/* Header Content with Left-Aligned Overlapping Avatar */}
        <div className="px-6 pb-6 pt-0 relative flex flex-col sm:flex-row items-start sm:items-end gap-5">
          
          {/* Left Large Avatar Overlapping Banner */}
          <div
            className={cn(
              "-mt-14 sm:-mt-16 relative group shrink-0",
              isPhotoUnlocked ? "cursor-pointer" : "cursor-not-allowed"
            )}
            onClick={() => {
              if (isPhotoUnlocked) {
                setIsPhotoModalOpen(true);
              } else {
                setIsEditRequestModalOpen(true);
              }
            }}
            title={isPhotoUnlocked ? 'Click to upload/change photo' : 'Profile photo is locked. Request edit approval from HR to change.'}
          >
            <div className="p-1 rounded-full bg-card shadow-xl inline-block relative">
              <Avatar className="h-24 w-24 sm:h-28 sm:w-28 border-4 border-card rounded-full overflow-hidden shadow-inner">
                <AvatarImage src={activeEmp.avatarUrl || (activeEmp as any).avatar_url || undefined} alt={empName} className="object-cover" />
                <AvatarFallback className={cn("text-white font-black text-2xl bg-gradient-to-br", theme.gradient)}>
                  {initials}
                </AvatarFallback>
              </Avatar>

              {/* Upload Hover Overlay */}
              <div className="absolute inset-1 rounded-full bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[10px] font-bold gap-0.5 backdrop-blur-xs">
                <Camera className="w-4 h-4" />
                <span>{isPhotoUnlocked ? 'Upload' : 'Request Lock'}</span>
              </div>

              {/* Camera Trigger Icon */}
              <div className={cn("absolute bottom-1 right-1 h-6.5 w-6.5 rounded-full text-white border-2 border-card shadow-sm flex items-center justify-center transition-transform group-hover:scale-110", theme.buttonBg)}>
                {isPhotoUnlocked ? <Camera className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
              </div>
            </div>
          </div>

          {/* Profile Information Beside Avatar */}
          <div className="flex-1 min-w-0 space-y-1 sm:mb-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                {empName}
              </h1>
              <BadgeCheck className={cn("w-5 h-5 fill-current/10 shrink-0", theme.textAccent)} />
              <Badge className={cn("text-xs font-mono font-bold px-2 py-0.5 rounded-md border", theme.badgeBg)}>
                {empCode}
              </Badge>
            </div>

            <p className="text-xs font-semibold text-foreground/80 flex items-center gap-1.5">
              <Briefcase className={cn("w-3.5 h-3.5 shrink-0", theme.textAccent)} />
              <span>{jobTitle}</span>
            </p>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground font-medium pt-0.5">
              <span className="flex items-center gap-1">
                <Building2 className={cn("w-3.5 h-3.5 shrink-0", theme.textAccent)} /> {department}
              </span>
              <span className="text-border">•</span>
              <span className="flex items-center gap-1">
                <Shield className={cn("w-3.5 h-3.5 shrink-0", theme.textAccent)} /> Role: <strong>{roleLabel}</strong>
              </span>
              {activeEmp.email && (
                <>
                  <span className="text-border">•</span>
                  <span className={cn("flex items-center gap-1 font-semibold", theme.textAccent)}>
                    <Mail className="w-3.5 h-3.5 shrink-0" /> {activeEmp.email}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Action Buttons: Request Profile Edit & HR Photo Request */}
          <div className="flex flex-wrap items-center gap-2 sm:mb-1 shrink-0">
            {isEmployeePortal && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsEditRequestModalOpen(true)}
                className={cn("text-xs font-bold h-8.5 px-3.5 rounded-xl border gap-1.5 shadow-xs cursor-pointer", theme.borderAccent, theme.textAccent, theme.bgAccent)}
              >
                <Edit2 className="w-3.5 h-3.5" />
                Request Profile Edit
              </Button>
            )}

            <Button
              size="sm"
              variant="outline"
              onClick={() => setHrRequestOpen(true)}
              className={cn("text-xs font-bold h-8.5 px-3.5 rounded-xl border gap-1.5 shadow-xs cursor-pointer", theme.borderAccent, theme.textAccent, theme.bgAccent)}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Request Photo Update
            </Button>
          </div>

        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          PROFILE LOCK STATUS NOTICE BANNER (when in Employee Portal)
      ───────────────────────────────────────────────────────────── */}
      
      {/* ─────────────────────────────────────────────────────────────
          MAIN CONTENT SPLIT LAYOUT (EXACT SKETCH STRUCTURE)
          LEFT SIDEBAR NAVIGATION TABS (Stacked with Chevrons >)
          RIGHT MAIN DATA PANEL
      ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row gap-6">

        {/* LEFT SIDEBAR NAVIGATION MENU */}
        <div className="w-full md:w-64 lg:w-72 shrink-0 space-y-3">
          <div className="bg-card border border-border/80 rounded-2xl p-2.5 shadow-sm space-y-1.5">
            <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-3 py-1">
              Profile Sections
            </h3>

            {[
              { id: 'details',   label: 'Combined Details',      icon: User,           desc: 'Basic, Contact & Emergency info' },
              { id: 'payroll',   label: 'Payroll & Salary',     icon: IndianRupee,     desc: 'Salary structure & revisions' },
              { id: 'documents', label: 'Documents',            icon: Layers,         desc: 'KYC & Employee certificates' },
              { id: 'statutory', label: 'Statutory Details',    icon: Lock,           desc: 'PF, ESI, PAN & Tax parameters' },
              { id: 'checkin',   label: 'Check-In Mode',        icon: MapPin,         desc: 'Geo & Attendance settings' },
              { id: 'roles',     label: 'Roles & Permissions',  icon: Shield,         desc: 'Access roles & permissions' },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    "w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left group cursor-pointer",
                    isActive
                      ? cn("bg-card shadow-sm border-2 font-bold", theme.borderAccent, theme.bgAccent)
                      : "border-transparent hover:bg-muted/50 text-foreground/80 hover:text-foreground"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn("p-2 rounded-lg transition-colors", isActive ? theme.badgeBg : "bg-muted text-muted-foreground group-hover:bg-muted/80")}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <p className={cn("text-xs font-semibold leading-snug", isActive && theme.textAccent)}>
                        {tab.label}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate font-normal">
                        {tab.desc}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className={cn("w-4 h-4 shrink-0 transition-transform", isActive ? cn("transform translate-x-0.5", theme.textAccent) : "text-muted-foreground/50 group-hover:text-muted-foreground")} />
                </button>
              );
            })}
          </div>

          {/* Employment Summary Sidebar Card */}
          <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-sm text-xs space-y-2.5">
            <h4 className="font-bold text-foreground flex items-center gap-1.5">
              <Shield className={cn("w-4 h-4", theme.textAccent)} /> Employment Summary
            </h4>
            <div className="space-y-2 text-muted-foreground text-[11px]">
              <div className="flex justify-between py-1 border-b border-border/40">
                <span>Role Type:</span>
                <span className="font-semibold text-foreground capitalize">{normalizedRole.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/40">
                <span>Employment:</span>
                <span className="font-semibold text-foreground truncate max-w-[110px]">{employmentType}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/40">
                <span>Profile Lock:</span>
                <span className={cn("font-bold", editUnlocked ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400")}>
                  {editUnlocked ? 'Unlocked 🔓' : 'Locked 🔒'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT MAIN DATA PANEL */}
        <div className="flex-1 min-w-0">

          {/* TAB 1: COMBINED DETAILS (WITH FULL EDIT LOCK LOGIC) */}
          {activeTab === 'details' && (
            <EmployeeDetailsCombined
              employee={activeEmp}
              editUnlocked={isPersonalUnlocked}
              isBasicUnlocked={isBasicUnlocked}
              isPersonalUnlocked={isPersonalUnlocked}
              isProfessionalUnlocked={isProfessionalUnlocked}
              isStatutoryUnlocked={isStatutoryUnlocked}
              approvedRequestId={approvedRequestId}
            />
          )}

          {/* TAB 2: PAYROLL & SALARY DETAILS */}
          {activeTab === 'payroll' && (
            <EmployeePayrollDetail employee={activeEmp} />
          )}

          {/* TAB 3: DOCUMENTS & CERTIFICATES */}
          {activeTab === 'documents' && (
            <EmployeeDocuments employeeId={resolvedEmpId} readOnly={isEmployeePortal} />
          )}

          {/* TAB 4: STATUTORY DETAILS */}
          {activeTab === 'statutory' && (
            <EmployeeStatutoryDetails
              employee={activeEmp}
              onUpdate={() => refetch()}
              editUnlocked={isStatutoryUnlocked}
              approvedRequestId={approvedRequestId}
            />
          )}

          {/* TAB 5: ATTENDANCE & CHECK-IN MODE */}
          {activeTab === 'checkin' && (
            <EmployeeCheckInSetting employee={activeEmp} readOnly={isEmployeePortal} />
          )}

          {/* TAB 6: ROLES & PERMISSIONS */}
          {activeTab === 'roles' && (
            <EmployeeRolesInfo employee={activeEmp} onRoleUpdate={() => refetch()} readOnly={isEmployeePortal} />
          )}



        </div>
      </div>

      {/* HR / ADMIN BIOMETRIC PROFILE UPDATE REQUEST MODAL */}
      <Dialog open={hrRequestOpen} onOpenChange={setHrRequestOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <ShieldCheck className={cn("w-5 h-5", theme.textAccent)} />
              Request Biometric Face Photo Update
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Employees cannot directly change their biometric face profile. Submit this form to request HR / Admin approval to update your profile photo.
            </DialogDescription>
          </DialogHeader>

          {hrRequestSent ? (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-2 py-6">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <h4 className="text-sm font-bold text-emerald-700 dark:text-emerald-300">Request Sent to HR!</h4>
              <p className="text-xs text-muted-foreground">HR / Admin will review your biometric photo update request.</p>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-extrabold text-foreground">Reason / Note for HR:</Label>
                <Input
                  value={hrRequestNote}
                  onChange={(e) => setHrRequestNote(e.target.value)}
                  placeholder="e.g. My face profile photo needs updating for face attendance"
                  className="text-xs rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setHrRequestOpen(false)}
                  className="text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={hrRequestSending}
                  onClick={handleSendHRProfileRequest}
                  className={cn("text-xs font-bold rounded-xl gap-1.5 cursor-pointer", theme.buttonBg)}
                >
                  {hrRequestSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  Submit Request to HR
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* REQUEST PROFILE EDIT MODAL */}
      {activeEmp && (
        <ProfileEditRequestModal
          open={isEditRequestModalOpen}
          onOpenChange={setIsEditRequestModalOpen}
          employee={activeEmp}
        />
      )}

      {/* ── LIVE CAMERA PHOTO CAPTURE MODAL ────────────────────────────── */}
      {activeEmp && (
        <ProfilePhotoUploadModal
          open={isPhotoModalOpen}
          onOpenChange={setIsPhotoModalOpen}
          employee={activeEmp}
          onSuccess={() => {
            refetch();
            refetchPermissions();
          }}
        />
      )}
    </div>
  );
}
