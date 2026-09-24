import { useState, useEffect } from 'react';
import {
  Building2,
  Plus,
  Search,
  CheckCircle,
  MoreVertical,
  Shield,
  Users,
  Eye,
  EyeOff,
  Globe,
  Mail,
  Phone,
  MapPin,
  User,
  Lock,
  Edit3,
  Trash2,
  Power,
  CreditCard,
  AlertTriangle,
  Sparkles,
  Zap,
  Check,
  ExternalLink,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { apiClient } from '@/config/api';

export function SuperAdminOrganizationPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Active' | 'Inactive'>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [provisionLoading, setProvisionLoading] = useState(false);
  const [provisionError, setProvisionError] = useState('');

  // Duplicate Organization Warning Modal State
  const [duplicateOrgModalOpen, setDuplicateOrgModalOpen] = useState(false);
  const [duplicateOrgMessage, setDuplicateOrgMessage] = useState('');

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<any>(null);
  const [saveEditLoading, setSaveEditLoading] = useState(false);
  const [saveEditError, setSaveEditError] = useState('');

  // Delete Confirmation Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [orgToDelete, setOrgToDelete] = useState<any>(null);

  const [organizations, setOrganizations] = useState<any[]>([]);
  const [subscriptionPlans, setSubscriptionPlans] = useState<any[]>([]);
  const [isAssignPlanModalOpen, setIsAssignPlanModalOpen] = useState(false);
  const [selectedOrgForPlan, setSelectedOrgForPlan] = useState<any>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [assigningPlanLoading, setAssigningPlanLoading] = useState(false);

  const fetchSubscriptionPlans = async () => {
    try {
      const res = await apiClient.get('/superadmin/subscriptions');
      if (res.data?.data?.plans && Array.isArray(res.data.data.plans)) {
        setSubscriptionPlans(res.data.data.plans);
      }
    } catch (err) {
      console.error('Failed to fetch subscription plans:', err);
    }
  };

  const fetchOrganizations = async () => {
    try {
      const response = await apiClient.get('/superadmin/organizations');
      if (response.data?.data && Array.isArray(response.data.data)) {
        const mapped = response.data.data.map((item: any) => ({
          id: item.id,
          name: item.name,
          code: item.code || `ORG-00${item.id}`,
          ownerName: item.ownerName || item.owner_name || 'Organization Owner',
          location: item.location || 'India',
          email: item.email || 'admin@organization.com',
          phone: item.phone || '+91 9000000000',
          websiteUrl: item.websiteUrl || item.website_url || '',
          industry: item.industry || 'General Services',
          subscriptionPlanId: item.subscriptionPlanId || item.subscription_plan_id || null,
          enabledModules: item.enabledModules || item.enabled_modules || null,
          plan: item.subscriptionPlanName || (item.planTier || item.plan_tier
            ? String(item.planTier || item.plan_tier).charAt(0).toUpperCase() + String(item.planTier || item.plan_tier).slice(1)
            : item.plan || 'Enterprise'),
          status: item.status ? (String(item.status).toLowerCase() === 'active' ? 'Active' : 'Inactive') : 'Active',
          usersCount: item.usersCount || 12,
          createdDate: (item.createdAt || item.created_at) ? String(item.createdAt || item.created_at).split('T')[0] : '2026-07-12',
        }));
        setOrganizations(mapped);
      }
    } catch (err) {
      console.error('Failed to fetch organization listings from backend:', err);
    }
  };

  useEffect(() => {
    fetchOrganizations();
    fetchSubscriptionPlans();
  }, []);

  const [newOrg, setNewOrg] = useState({
    name: '',
    code: `ORG-${Math.floor(100 + Math.random() * 900)}`,
    ownerName: '',
    location: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    websiteUrl: '',
    plan: 'Professional',
    industry: '',
  });

  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setProvisionError('');

    if (newOrg.password !== newOrg.confirmPassword) {
      setPasswordError('Password and Confirm Password do not match');
      return;
    }

    setProvisionLoading(true);
    try {
      await apiClient.post('/superadmin/organizations', newOrg);
      await fetchOrganizations();
      setIsModalOpen(false);
      setNewOrg({
        name: '',
        code: `ORG-${Math.floor(100 + Math.random() * 900)}`,
        ownerName: '',
        location: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        websiteUrl: '',
        plan: 'Professional',
        industry: '',
      });
    } catch (err: any) {
      console.error('Failed to provision organization:', err);
      const errMsg =
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        err?.message ||
        'Failed to provision organization.';
      setProvisionError(errMsg);

      // Open duplicate popup if conflict
      if (
        err?.response?.status === 409 ||
        errMsg.toLowerCase().includes('already exists') ||
        errMsg.toLowerCase().includes('duplicate')
      ) {
        setDuplicateOrgMessage(errMsg);
        setDuplicateOrgModalOpen(true);
      }
    } finally {
      setProvisionLoading(false);
    }
  };

  // Toggle Organization Active/Inactive Status
  const handleToggleStatus = async (org: any) => {
    const newStatus = org.status === 'Active' ? 'Inactive' : 'Active';
    // Optimistic UI update
    setOrganizations((prev) =>
      prev.map((o) => (o.id === org.id ? { ...o, status: newStatus } : o))
    );
    try {
      await apiClient.patch(`/superadmin/organizations/${org.id}/status`, { status: newStatus });
    } catch (err) {
      console.error('Failed to toggle organization status:', err);
      // Rollback on error
      setOrganizations((prev) =>
        prev.map((o) => (o.id === org.id ? { ...o, status: org.status } : o))
      );
    }
  };

  // Plan Assignment Handlers
  const handleOpenAssignPlan = (org: any) => {
    setSelectedOrgForPlan(org);
    setSelectedPlanId(org.subscriptionPlanId || null);
    setIsAssignPlanModalOpen(true);
  };

  const handleSaveAssignPlan = async () => {
    if (!selectedOrgForPlan) return;
    setAssigningPlanLoading(true);
    try {
      await apiClient.post(`/superadmin/subscriptions/assign-to-org/${selectedOrgForPlan.id}`, {
        planId: selectedPlanId ? Number(selectedPlanId) : null,
      });
      await fetchOrganizations();
      setIsAssignPlanModalOpen(false);
      setSelectedOrgForPlan(null);
    } catch (err) {
      console.error('Failed to assign subscription plan:', err);
    } finally {
      setAssigningPlanLoading(false);
    }
  };

  // Edit Organization Handlers
  const handleOpenEdit = (org: any) => {
    setEditingOrg({
      ...org,
      subscriptionPlanId: org.subscriptionPlanId || null,
    });
    setSaveEditError('');
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrg) return;
    setSaveEditLoading(true);
    setSaveEditError('');

    try {
      await apiClient.put(`/superadmin/organizations/${editingOrg.id}`, {
        name: editingOrg.name,
        code: editingOrg.code,
        ownerName: editingOrg.ownerName,
        location: editingOrg.location,
        email: editingOrg.email,
        phone: editingOrg.phone,
        websiteUrl: editingOrg.websiteUrl || '',
        plan: editingOrg.plan,
        subscriptionPlanId: editingOrg.subscriptionPlanId || null,
        industry: editingOrg.industry || 'General Services',
      });
      await fetchOrganizations();
      setIsEditModalOpen(false);
      setEditingOrg(null);
    } catch (err: any) {
      console.error('Failed to save organization edits:', err);
      const errMsg = err?.response?.data?.error?.message || err?.response?.data?.message || 'Failed to save changes. Please check fields.';
      setSaveEditError(errMsg);
    } finally {
      setSaveEditLoading(false);
    }
  };

  // Delete Organization Handlers
  const handleOpenDelete = (org: any) => {
    setOrgToDelete(org);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!orgToDelete) return;

    try {
      await apiClient.delete(`/superadmin/organizations/${orgToDelete.id}`);
      setOrganizations((prev) => prev.filter((o) => o.id !== orgToDelete.id));
    } catch (err) {
      console.error('Failed to delete organization from database:', err);
    } finally {
      setIsDeleteModalOpen(false);
      setOrgToDelete(null);
    }
  };

  const filteredOrgs = organizations.filter((o) => {
    const matchesSearch =
      o.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 text-foreground pb-10">
      {/* Header Controls Banner */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-card dark:bg-slate-900 p-5 rounded-2xl border border-border dark:border-slate-800 shadow-sm dark:shadow-xl">
        <div className="shrink-0">
          <h1 className="text-2xl font-extrabold text-foreground dark:text-white flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white shadow-md">
              <Building2 className="w-6 h-6" />
            </div>
            Organization Management
          </h1>
          <p className="text-xs text-muted-foreground dark:text-slate-400 mt-1">
            Provision, manage, edit, and monitor multi-tenant organizations across the platform.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
          {/* Status Filter Tabs */}
          <div className="flex items-center bg-muted/60 dark:bg-slate-950/80 p-1 rounded-xl border border-border dark:border-slate-800 shrink-0">
            {(['ALL', 'Active', 'Inactive'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  statusFilter === st
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {st === 'ALL' ? 'All Orgs' : st}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative flex-1 sm:w-64 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground dark:text-slate-400" />
            <Input
              placeholder="Search name, code, owner..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-background dark:bg-slate-800/80 border-border dark:border-slate-700 text-foreground dark:text-white text-xs h-9 focus:border-indigo-500 rounded-xl w-full"
            />
          </div>

          {/* Add Org Button */}
          <Button
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-9 px-4 gap-1.5 font-bold shadow-lg shadow-indigo-500/20 rounded-xl whitespace-nowrap shrink-0 ml-auto sm:ml-0"
            onClick={() => setIsModalOpen(true)}
          >
            <Plus className="w-4 h-4" /> Provision Organization
          </Button>
        </div>
      </div>

      {/* Cards Grid */}
      {filteredOrgs.length === 0 ? (
        <Card className="bg-card border-border dark:bg-slate-900 dark:border-slate-800 p-12 text-center text-muted-foreground dark:text-slate-400 rounded-2xl">
          <Building2 className="w-12 h-12 mx-auto text-muted-foreground/60 dark:text-slate-600 mb-3" />
          <h3 className="text-lg font-bold text-foreground dark:text-white mb-1">No Organizations Found</h3>
          <p className="text-xs text-muted-foreground dark:text-slate-500 max-w-sm mx-auto">
            No organization matches your current search term or status filter criteria.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOrgs.map((org) => {
            const isActive = org.status === 'Active';
            const initial = org.name
              ? org.name
                  .split(' ')
                  .map((n: string) => n[0])
                  .join('')
                  .substring(0, 2)
                  .toUpperCase()
              : 'OG';

            return (
              <Card
                key={org.id}
                className="bg-card border border-border/80 dark:bg-slate-900 dark:border-slate-800/80 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 shadow-sm dark:shadow-xl rounded-2xl overflow-hidden transition-all duration-300 flex flex-col justify-between group"
              >
                <CardContent className="p-5 space-y-3.5">
                  {/* Top Header: Circular Avatar Initials + Name & Badge */}
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-full bg-amber-500/10 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 font-extrabold text-sm flex items-center justify-center border border-amber-500/20 shrink-0 shadow-xs">
                      {initial}
                    </div>
                    <div className="overflow-hidden">
                      <h3 className="font-bold text-base text-foreground dark:text-white truncate group-hover:text-amber-500 dark:group-hover:text-amber-400 transition-colors">
                        {org.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          {org.plan}
                        </span>
                        <span className="font-mono text-[10px] text-muted-foreground dark:text-slate-400">
                          {org.code}
                        </span>
                      </div>
                    </div>
                  </div>

                  <hr className="border-border dark:border-slate-800/80" />

                  {/* Details List with Clean Icons */}
                  <div className="space-y-2 text-xs text-foreground dark:text-slate-300 py-0.5">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <User className="w-4 h-4 text-muted-foreground dark:text-slate-400 shrink-0" />
                      <span className="text-muted-foreground dark:text-slate-400 shrink-0">owner name :</span>
                      <span className="font-medium text-foreground dark:text-slate-200 truncate">{org.ownerName}</span>
                    </div>

                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <MapPin className="w-4 h-4 text-muted-foreground dark:text-slate-400 shrink-0" />
                      <span className="text-muted-foreground dark:text-slate-400 shrink-0">location :</span>
                      <span className="font-medium text-foreground dark:text-slate-200 truncate">{org.location}</span>
                    </div>

                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <Mail className="w-4 h-4 text-muted-foreground dark:text-slate-400 shrink-0" />
                      <span className="text-muted-foreground dark:text-slate-400 shrink-0">email :</span>
                      <span className="font-medium text-foreground dark:text-slate-200 truncate">{org.email}</span>
                    </div>

                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <Phone className="w-4 h-4 text-muted-foreground dark:text-slate-400 shrink-0" />
                      <span className="text-muted-foreground dark:text-slate-400 shrink-0">mobile no :</span>
                      <span className="font-medium text-foreground dark:text-slate-200 truncate">{org.phone || 'N/A'}</span>
                    </div>

                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <Globe className="w-4 h-4 text-muted-foreground dark:text-slate-400 shrink-0" />
                      <span className="text-muted-foreground dark:text-slate-400 shrink-0">website :</span>
                      {org.websiteUrl ? (
                        <a
                          href={org.websiteUrl.startsWith('http') ? org.websiteUrl : `https://${org.websiteUrl}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 underline underline-offset-2 truncate flex items-center gap-1"
                          title={org.websiteUrl}
                        >
                          <span className="truncate">{org.websiteUrl.replace(/^https?:\/\//, '')}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      ) : (
                        <span className="font-medium text-muted-foreground dark:text-slate-500 italic">N/A</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <CreditCard className="w-4 h-4 text-muted-foreground dark:text-slate-400 shrink-0" />
                      <span className="text-muted-foreground dark:text-slate-400 shrink-0">plan :</span>
                      <span className="font-medium text-foreground dark:text-slate-200 truncate">{org.plan}</span>
                    </div>
                  </div>
                </CardContent>

                {/* Footer Bar: Status Toggle & Action Icon Buttons */}
                <div className="px-5 py-3.5 bg-muted/40 dark:bg-slate-950/40 border-t border-border dark:border-slate-800/80 flex items-center justify-between">
                  {/* Status Toggle Switch */}
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(org)}
                    className="flex items-center gap-2.5 text-xs font-bold transition-all group/toggle"
                  >
                    <div
                      className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 flex items-center ${
                        isActive ? 'bg-emerald-500 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
                      }`}
                    >
                      <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
                    </div>
                    <span
                      className={`text-[11px] uppercase font-bold tracking-wider ${
                        isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground dark:text-slate-500'
                      }`}
                    >
                      {isActive ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </button>

                  {/* Action Icon Buttons */}
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenAssignPlan(org)}
                      className="h-8 px-2.5 text-xs font-semibold gap-1 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10 border-indigo-500/30 rounded-lg"
                      title="Assign Subscription Plan"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Plan
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleOpenEdit(org)}
                      className="h-8 w-8 text-muted-foreground hover:text-foreground dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 border-border dark:border-slate-700 rounded-lg"
                      title="Edit Details"
                    >
                      <Edit3 className="w-4 h-4" />
                    </Button>

                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleOpenDelete(org)}
                      className="h-8 w-8 text-muted-foreground hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10 border-border dark:border-slate-700 hover:border-red-500/30 rounded-lg"
                      title="Delete Organization"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Provision / Create Organization Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-card dark:bg-slate-900 border-border dark:border-slate-800 text-foreground dark:text-white sm:max-w-[620px] max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-foreground dark:text-white">
              <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-600 dark:text-indigo-400">
                <Building2 className="w-5 h-5" />
              </div>
              Provision Client Organization
            </DialogTitle>
            <DialogDescription className="text-muted-foreground dark:text-slate-400 text-xs">
              Fill in the required tenant organization details and administrator credentials.
            </DialogDescription>
          </DialogHeader>

          {passwordError && (
            <div className="p-3 bg-red-500/20 border border-red-500/40 rounded-xl text-xs text-red-600 dark:text-red-300 font-medium">
              ⚠️ {passwordError}
            </div>
          )}

          {provisionError && (
            <div className="p-3.5 bg-amber-500/15 dark:bg-amber-950/30 border border-amber-500/30 rounded-xl text-xs text-amber-700 dark:text-amber-300 font-medium flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Cannot Create Organization</p>
                <p className="text-[11px] text-muted-foreground dark:text-slate-300 mt-0.5">{provisionError}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleCreateOrganization} className="space-y-4 pt-1">
            {/* Row 1: Organization Name & Code */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="orgName" className="text-foreground dark:text-slate-200 text-xs font-semibold flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" /> Organization Name *
                </Label>
                <Input
                  id="orgName"
                  required
                  placeholder="e.g. Apex Global Corp"
                  value={newOrg.name}
                  onChange={(e) => setNewOrg({ ...newOrg, name: e.target.value })}
                  className="bg-background dark:bg-slate-800 border-border dark:border-slate-700 text-foreground dark:text-white text-xs mt-1 rounded-xl"
                />
              </div>

              <div>
                <Label htmlFor="orgCode" className="text-foreground dark:text-slate-200 text-xs font-semibold flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" /> Organization Code *
                </Label>
                <Input
                  id="orgCode"
                  required
                  placeholder="e.g. ORG-789"
                  value={newOrg.code}
                  onChange={(e) => setNewOrg({ ...newOrg, code: e.target.value })}
                  className="bg-background dark:bg-slate-800 border-border dark:border-slate-700 text-foreground dark:text-white text-xs mt-1 font-mono rounded-xl"
                />
              </div>
            </div>

            {/* Row 2: Owner Name & Location */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="ownerName" className="text-foreground dark:text-slate-200 text-xs font-semibold flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" /> Owner Name *
                </Label>
                <Input
                  id="ownerName"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={newOrg.ownerName}
                  onChange={(e) => setNewOrg({ ...newOrg, ownerName: e.target.value })}
                  className="bg-background dark:bg-slate-800 border-border dark:border-slate-700 text-foreground dark:text-white text-xs mt-1 rounded-xl"
                />
              </div>

              <div>
                <Label htmlFor="location" className="text-foreground dark:text-slate-200 text-xs font-semibold flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" /> Location / City *
                </Label>
                <Input
                  id="location"
                  required
                  placeholder="e.g. Mumbai, Maharashtra"
                  value={newOrg.location}
                  onChange={(e) => setNewOrg({ ...newOrg, location: e.target.value })}
                  className="bg-background dark:bg-slate-800 border-border dark:border-slate-700 text-foreground dark:text-white text-xs mt-1 rounded-xl"
                />
              </div>
            </div>

            {/* Row 3: Email & Phone */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email" className="text-foreground dark:text-slate-200 text-xs font-semibold flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" /> Admin Email Address *
                </Label>
                <Input
                  id="email"
                  type="email"
                  required
                  placeholder="e.g. admin@apexcorp.com"
                  value={newOrg.email}
                  onChange={(e) => setNewOrg({ ...newOrg, email: e.target.value })}
                  className="bg-background dark:bg-slate-800 border-border dark:border-slate-700 text-foreground dark:text-white text-xs mt-1 rounded-xl"
                />
              </div>

              <div>
                <Label htmlFor="phone" className="text-foreground dark:text-slate-200 text-xs font-semibold flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" /> Phone Number *
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  required
                  placeholder="e.g. +91 9876543210"
                  value={newOrg.phone}
                  onChange={(e) => setNewOrg({ ...newOrg, phone: e.target.value })}
                  className="bg-background dark:bg-slate-800 border-border dark:border-slate-700 text-foreground dark:text-white text-xs mt-1 rounded-xl"
                />
              </div>
            </div>

            {/* Row 4: Password & Confirm Password */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="password" className="text-foreground dark:text-slate-200 text-xs font-semibold flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" /> Account Password *
                </Label>
                <div className="relative mt-1">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter strong password"
                    value={newOrg.password}
                    onChange={(e) => setNewOrg({ ...newOrg, password: e.target.value })}
                    className="bg-background dark:bg-slate-800 border-border dark:border-slate-700 text-foreground dark:text-white text-xs pr-10 rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground dark:text-slate-400 dark:hover:text-white transition"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <Label htmlFor="confirmPassword" className="text-foreground dark:text-slate-200 text-xs font-semibold flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" /> Confirm Password *
                </Label>
                <div className="relative mt-1">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    placeholder="Re-enter password"
                    value={newOrg.confirmPassword}
                    onChange={(e) => setNewOrg({ ...newOrg, confirmPassword: e.target.value })}
                    className="bg-background dark:bg-slate-800 border-border dark:border-slate-700 text-foreground dark:text-white text-xs pr-10 rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground dark:text-slate-400 dark:hover:text-white transition"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Row 5: Website URL & Subscription Plan */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="websiteUrl" className="text-foreground dark:text-slate-200 text-xs font-semibold flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" /> Website URL (Optional)
                </Label>
                <Input
                  id="websiteUrl"
                  type="url"
                  placeholder="https://apexcorp.com"
                  value={newOrg.websiteUrl}
                  onChange={(e) => setNewOrg({ ...newOrg, websiteUrl: e.target.value })}
                  className="bg-background dark:bg-slate-800 border-border dark:border-slate-700 text-foreground dark:text-white text-xs mt-1 rounded-xl"
                />
              </div>

              <div>
                <Label htmlFor="orgPlan" className="text-foreground dark:text-slate-200 text-xs font-semibold flex items-center gap-1">
                  <CreditCard className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" /> Subscription Tier
                </Label>
                <select
                  id="orgPlan"
                  className="flex h-9 w-full rounded-xl border border-border dark:border-slate-700 bg-background dark:bg-slate-800 px-3 py-1.5 text-xs text-foreground dark:text-white mt-1 focus:outline-none"
                  value={newOrg.plan}
                  onChange={(e) => setNewOrg({ ...newOrg, plan: e.target.value })}
                >
                  <option value="Enterprise">Full Access (Unrestricted)</option>
                  {subscriptionPlans.map((sp: any) => (
                    <option key={sp.id} value={sp.name}>{sp.name} ({sp.price})</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-2 pt-4 border-t border-border dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                className="border-border dark:border-slate-700 text-muted-foreground hover:text-foreground dark:text-slate-300 dark:hover:text-white rounded-xl"
                onClick={() => setIsModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl">
                Provision Organization
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Organization Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="bg-card dark:bg-slate-900 border-border dark:border-slate-800 text-foreground dark:text-white sm:max-w-[600px] max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-foreground dark:text-white">
              <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-600 dark:text-indigo-400">
                <Edit3 className="w-5 h-5" />
              </div>
              Edit Organization Details
            </DialogTitle>
            <DialogDescription className="text-muted-foreground dark:text-slate-400 text-xs">
              Update client organization configuration, contact info, or subscription plan.
            </DialogDescription>
          </DialogHeader>

          {editingOrg && (
            <form onSubmit={handleSaveEdit} className="space-y-4 pt-1">
              {saveEditError && (
                <div className="p-3 bg-red-500/15 border border-red-500/30 rounded-xl text-xs text-red-600 dark:text-red-300 font-medium">
                  ⚠️ {saveEditError}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="editOrgName" className="text-foreground dark:text-slate-200 text-xs font-semibold">
                    Organization Name *
                  </Label>
                  <Input
                    id="editOrgName"
                    required
                    value={editingOrg.name}
                    onChange={(e) => setEditingOrg({ ...editingOrg, name: e.target.value })}
                    className="bg-background dark:bg-slate-800 border-border dark:border-slate-700 text-foreground dark:text-white text-xs mt-1 rounded-xl"
                  />
                </div>

                <div>
                  <Label htmlFor="editOrgCode" className="text-foreground dark:text-slate-200 text-xs font-semibold">
                    Organization Code *
                  </Label>
                  <Input
                    id="editOrgCode"
                    required
                    value={editingOrg.code}
                    onChange={(e) => setEditingOrg({ ...editingOrg, code: e.target.value })}
                    className="bg-background dark:bg-slate-800 border-border dark:border-slate-700 text-foreground dark:text-white text-xs mt-1 font-mono rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="editOwnerName" className="text-foreground dark:text-slate-200 text-xs font-semibold">
                    Owner Name *
                  </Label>
                  <Input
                    id="editOwnerName"
                    required
                    value={editingOrg.ownerName}
                    onChange={(e) => setEditingOrg({ ...editingOrg, ownerName: e.target.value })}
                    className="bg-background dark:bg-slate-800 border-border dark:border-slate-700 text-foreground dark:text-white text-xs mt-1 rounded-xl"
                  />
                </div>

                <div>
                  <Label htmlFor="editLocation" className="text-foreground dark:text-slate-200 text-xs font-semibold">
                    Location *
                  </Label>
                  <Input
                    id="editLocation"
                    required
                    value={editingOrg.location}
                    onChange={(e) => setEditingOrg({ ...editingOrg, location: e.target.value })}
                    className="bg-background dark:bg-slate-800 border-border dark:border-slate-700 text-foreground dark:text-white text-xs mt-1 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="editEmail" className="text-foreground dark:text-slate-200 text-xs font-semibold">
                    Admin Email *
                  </Label>
                  <Input
                    id="editEmail"
                    type="email"
                    required
                    value={editingOrg.email}
                    onChange={(e) => setEditingOrg({ ...editingOrg, email: e.target.value })}
                    className="bg-background dark:bg-slate-800 border-border dark:border-slate-700 text-foreground dark:text-white text-xs mt-1 rounded-xl"
                  />
                </div>

                <div>
                  <Label htmlFor="editPhone" className="text-foreground dark:text-slate-200 text-xs font-semibold">
                    Phone Number *
                  </Label>
                  <Input
                    id="editPhone"
                    type="tel"
                    required
                    value={editingOrg.phone}
                    onChange={(e) => setEditingOrg({ ...editingOrg, phone: e.target.value })}
                    className="bg-background dark:bg-slate-800 border-border dark:border-slate-700 text-foreground dark:text-white text-xs mt-1 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="editWebsiteUrl" className="text-foreground dark:text-slate-200 text-xs font-semibold">
                    Website URL
                  </Label>
                  <Input
                    id="editWebsiteUrl"
                    type="url"
                    value={editingOrg.websiteUrl || ''}
                    onChange={(e) => setEditingOrg({ ...editingOrg, websiteUrl: e.target.value })}
                    className="bg-background dark:bg-slate-800 border-border dark:border-slate-700 text-foreground dark:text-white text-xs mt-1 rounded-xl"
                  />
                </div>

                <div>
                  <Label htmlFor="editPlan" className="text-foreground dark:text-slate-200 text-xs font-semibold">
                    Subscription Tier
                  </Label>
                  <select
                    id="editPlan"
                    className="flex h-9 w-full rounded-xl border border-border dark:border-slate-700 bg-background dark:bg-slate-800 px-3 py-1.5 text-xs text-foreground dark:text-white mt-1 focus:outline-none"
                    value={editingOrg.subscriptionPlanId ? String(editingOrg.subscriptionPlanId) : 'Enterprise'}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'Enterprise') {
                        setEditingOrg({ ...editingOrg, plan: 'Enterprise', subscriptionPlanId: null });
                      } else {
                        const sp = subscriptionPlans.find((p: any) => String(p.id) === val);
                        setEditingOrg({
                          ...editingOrg,
                          plan: sp ? sp.name : val,
                          subscriptionPlanId: sp ? sp.id : Number(val) || null,
                        });
                      }
                    }}
                  >
                    <option value="Enterprise">Full Access (Unrestricted)</option>
                    {subscriptionPlans.map((sp: any) => (
                      <option key={sp.id} value={String(sp.id)}>{sp.name} ({sp.price})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-border dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  className="border-border dark:border-slate-700 text-muted-foreground hover:text-foreground dark:text-slate-300 dark:hover:text-white rounded-xl"
                  onClick={() => setIsEditModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saveEditLoading} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl">
                  {saveEditLoading ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Organization Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="bg-card dark:bg-slate-900 border-border dark:border-slate-800 text-foreground dark:text-white sm:max-w-[440px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertTriangle className="w-5 h-5" /> Delete Organization
            </DialogTitle>
            <DialogDescription className="text-muted-foreground dark:text-slate-400 text-xs mt-1">
              Are you sure you want to delete <strong className="text-foreground dark:text-white">{orgToDelete?.name}</strong> (
              <span className="font-mono">{orgToDelete?.code}</span>)? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-end gap-3 pt-4 border-t border-border dark:border-slate-800 mt-2">
            <Button
              variant="outline"
              className="border-border dark:border-slate-700 text-muted-foreground hover:text-foreground dark:text-slate-300 dark:hover:text-white rounded-xl"
              onClick={() => setIsDeleteModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl"
            >
              Confirm Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Organization Already Exists Warning Modal ── */}
      <Dialog open={duplicateOrgModalOpen} onOpenChange={setDuplicateOrgModalOpen}>
        <DialogContent className="bg-card dark:bg-slate-900 border-border dark:border-slate-800 text-foreground dark:text-white sm:max-w-[480px] rounded-2xl shadow-2xl p-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 dark:bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-lg">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <DialogTitle className="text-lg font-bold text-foreground dark:text-white">
                Organization Already Exists
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground dark:text-slate-400">
                A registered tenant organization with matching information was detected in the platform.
              </DialogDescription>
            </div>

            <div className="w-full p-4 bg-amber-500/10 dark:bg-amber-950/30 border border-amber-500/30 rounded-xl text-left space-y-2">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                {duplicateOrgMessage || 'An organization with this Name, Email, Code, or Mobile Number already exists.'}
              </p>
              <p className="text-[11px] text-muted-foreground dark:text-slate-400 leading-relaxed">
                💡 <span className="font-semibold text-foreground dark:text-slate-200">Recommended Action:</span> Please change the duplicated field (use a unique Organization Name, Admin Email, Code, or Mobile Number) to create a new organization, or modify the existing organization record.
              </p>
            </div>

            <div className="flex w-full gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1 rounded-xl border-border dark:border-slate-700 text-xs font-semibold"
                onClick={() => setDuplicateOrgModalOpen(false)}
              >
                Dismiss
              </Button>
              <Button
                className="flex-1 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md"
                onClick={() => setDuplicateOrgModalOpen(false)}
              >
                Change Details
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
