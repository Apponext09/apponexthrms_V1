import React, { useState, useEffect } from 'react';
import {
  Shield,
  FileText,
  Upload,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Users,
  Eye,
  Edit2,
  Trash2,
  ShieldCheck,
  AlertCircle,
  FileSpreadsheet,
  Download,
  Filter,
  UserCheck,
  FolderPlus,
  Tag,
} from 'lucide-react';
import {
  usePolicies,
  usePolicyCategories,
  useCreatePolicyCategory,
  useDeletePolicyCategory,
  useCreatePolicy,
  useUpdatePolicy,
  useDeletePolicy,
  usePolicyAudit,
  PolicyDocument,
  PolicyCategory,
} from '../api/usePolicies';
import { useDepartments } from '@/features/settings/hooks/useDepartments';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

const DEFAULT_FALLBACK_CATEGORIES = [
  'General',
  'Code of Conduct',
  'Cybersecurity & InfoSec',
  'POSH & Workplace Safety',
  'Leave & Attendance',
  'Payroll & Compensation',
  'Asset & Data Usage',
  'Executive Guidelines',
];

import { apiClient } from '@/config/api';

export function PolicyManagementPage() {
  const { data: policies = [], isLoading } = usePolicies();
  const { data: categories = [], isLoading: categoriesLoading } = usePolicyCategories();
  const { data: deptsQueryResult } = useDepartments(1, 100);
  const departments: Array<{ id: number; name: string }> = Array.isArray(deptsQueryResult)
    ? deptsQueryResult
    : (deptsQueryResult?.items || deptsQueryResult?.data || []);

  const [availableRoles, setAvailableRoles] = useState<Array<{ code: string; label: string }>>([]);

  useEffect(() => {
    apiClient.get('/rbac/roles')
      .then((res) => {
        const list = res.data?.data?.items || res.data?.data || [];
        if (Array.isArray(list) && list.length > 0) {
          setAvailableRoles(list.map((r: any) => ({ code: r.code || String(r.id), label: r.name || r.code })));
        }
      })
      .catch(() => {});
  }, []);

  const createPolicyMutation = useCreatePolicy();
  const updatePolicyMutation = useUpdatePolicy();
  const deletePolicyMutation = useDeletePolicy();

  const createCategoryMutation = useCreatePolicyCategory();
  const deleteCategoryMutation = useDeletePolicyCategory();

  const [activeTab, setActiveTab] = useState<'library' | 'audits'>('library');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const [editingPolicy, setEditingPolicy] = useState<PolicyDocument | null>(null);
  const [selectedAuditPolicyId, setSelectedAuditPolicyId] = useState<number | null>(null);

  // Combine dynamic categories with fallback if empty
  const categoryList: Array<{ id?: number; name: string }> =
    categories.length > 0
      ? categories
      : DEFAULT_FALLBACK_CATEGORIES.map((name) => ({ name }));

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    category: 'General',
    description: '',
    version: '1.0',
    isActive: true,
    applicableGender: 'all' as 'all' | 'male' | 'female' | 'other',
    applicableDepartmentIds: [] as number[],
    fileUrl: '',
    fileName: '',
    fileSize: 0,
    fileType: '',
    isMandatory: true,
    selectedRoles: ['employee', 'team_lead', 'department_head', 'hr_manager', 'intern', 'consultant'],
  });

  const { data: auditData, isLoading: auditLoading } = usePolicyAudit(selectedAuditPolicyId);

  // Filtered policies
  const filteredPolicies = policies.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  // Calculate metrics
  const totalPolicies = policies.length;
  const activePolicies = policies.filter((p) => p.isActive).length;
  const totalTargetUsers = policies.reduce((acc, p) => acc + (p.stats?.totalTargetUsers || 0), 0);
  const totalAcceptedUsers = policies.reduce((acc, p) => acc + (p.stats?.acceptedUsers || 0), 0);
  const overallCompliance =
    totalTargetUsers > 0 ? Math.round((totalAcceptedUsers / totalTargetUsers) * 100) : 100;

  const handleOpenCreateModal = () => {
    setEditingPolicy(null);
    setFormData({
      title: '',
      category: categoryList[0]?.name || 'General',
      description: '',
      version: '1.0',
      isActive: true,
      applicableGender: 'all',
      applicableDepartmentIds: [],
      fileUrl: '',
      fileName: '',
      fileSize: 0,
      fileType: '',
      isMandatory: true,
      selectedRoles: ['employee', 'team_lead', 'department_head', 'hr', 'intern', 'consultant'],
    });
    setCreateModalOpen(true);
  };

  const handleOpenEditModal = (policy: PolicyDocument) => {
    setEditingPolicy(policy);
    const roleCodes = policy.roleMappings?.map((rm) => rm.roleCode) || ['employee'];
    const isMandatory = policy.roleMappings?.some((rm) => rm.isMandatory) ?? true;

    setFormData({
      title: policy.title,
      category: policy.category || categoryList[0]?.name || 'General',
      description: policy.description || '',
      version: policy.version || '1.0',
      isActive: policy.isActive,
      applicableGender: policy.applicableGender || 'all',
      applicableDepartmentIds: policy.applicableDepartmentIds || [],
      fileUrl: policy.fileUrl || '',
      fileName: policy.fileName || '',
      fileSize: policy.fileSize || 0,
      fileType: policy.fileType || '',
      isMandatory,
      selectedRoles: roleCodes,
    });
    setCreateModalOpen(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      toast.error('File size exceeds 15MB limit.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setFormData((prev) => ({
        ...prev,
        fileUrl: base64,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type || 'application/pdf',
      }));
      toast.success(`Attached file: ${file.name}`);
    };
    reader.readAsDataURL(file);
  };

  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error('Policy title is required');
      return;
    }
    if (!formData.fileUrl) {
      toast.error('Please attach a policy document (PDF/file).');
      return;
    }
    if (formData.selectedRoles.length === 0) {
      toast.error('Please select at least one applicable role.');
      return;
    }

    const payload = {
      title: formData.title,
      category: formData.category,
      description: formData.description,
      version: formData.version,
      isActive: formData.isActive,
      applicableGender: formData.applicableGender,
      applicableDepartmentIds: formData.applicableDepartmentIds,
      fileUrl: formData.fileUrl,
      fileName: formData.fileName,
      fileSize: formData.fileSize,
      fileType: formData.fileType,
      roleMappings: formData.selectedRoles.map((roleCode) => ({
        roleCode,
        isMandatory: formData.isMandatory,
      })),
    };

    if (editingPolicy) {
      await updatePolicyMutation.mutateAsync({ id: editingPolicy.id, payload });
    } else {
      await createPolicyMutation.mutateAsync(payload);
    }
    setCreateModalOpen(false);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this policy document?')) {
      await deletePolicyMutation.mutateAsync(id);
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error('Please enter a category name.');
      return;
    }
    try {
      await createCategoryMutation.mutateAsync({ name: newCategoryName.trim() });
      setFormData((prev) => ({ ...prev, category: newCategoryName.trim() }));
      setNewCategoryName('');
      toast.success(`Category "${newCategoryName.trim()}" created!`);
    } catch (e: any) {
      toast.error(e.message || 'Failed to create category');
    }
  };

  const handleDeleteCategory = async (id: number, name: string) => {
    if (confirm(`Are you sure you want to delete category "${name}"?`)) {
      try {
        await deleteCategoryMutation.mutateAsync(id);
        if (formData.category === name) {
          setFormData((prev) => ({ ...prev, category: categoryList[0]?.name || 'General' }));
        }
      } catch (e: any) {
        toast.error(e.message || 'Failed to delete category');
      }
    }
  };

  const handleSelectAllRoles = () => {
    if (formData.selectedRoles.length === availableRoles.length) {
      setFormData((prev) => ({ ...prev, selectedRoles: [] }));
    } else {
      setFormData((prev) => ({
        ...prev,
        selectedRoles: availableRoles.map((r) => r.code),
      }));
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto font-sans antialiased text-foreground">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 p-6 rounded-2xl text-white shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-blue-400" />
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">Policy & Governance Master</h1>
          </div>
          <p className="text-xs text-slate-300 max-w-2xl">
            Upload organizational compliance policies, target by gender & department, set mandatory sign-offs, and monitor real-time audit trails.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setCategoryManagerOpen(true)}
            variant="outline"
            className="border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-white font-bold text-xs px-3 h-10 rounded-xl gap-1.5 cursor-pointer"
          >
            <Tag className="w-4 h-4 text-blue-400" /> Categories
          </Button>

          <Button
            onClick={handleOpenCreateModal}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 h-10 rounded-xl shadow-lg shadow-blue-600/30 gap-2 cursor-pointer transition-all"
          >
            <Plus className="w-4 h-4" /> Create Policy
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Card className="border-border/80 bg-card rounded-xl p-4 shadow-2xs">
          <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Total Library</div>
          <div className="text-2xl font-black text-foreground mt-1">{totalPolicies}</div>
          <p className="text-[10px] text-muted-foreground mt-0.5">{activePolicies} active enforcement</p>
        </Card>

        <Card className="border-border/80 bg-card rounded-xl p-4 shadow-2xs">
          <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Target Signers</div>
          <div className="text-2xl font-black text-foreground mt-1">{totalTargetUsers}</div>
          <p className="text-[10px] text-muted-foreground mt-0.5">Across active roles</p>
        </Card>

        <Card className="border-border/80 bg-card rounded-xl p-4 shadow-2xs">
          <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Accepted Logins</div>
          <div className="text-2xl font-black text-emerald-600 mt-1">{totalAcceptedUsers}</div>
          <p className="text-[10px] text-muted-foreground mt-0.5">Verified sign-offs</p>
        </Card>

        <Card className="border-border/80 bg-card rounded-xl p-4 shadow-2xs">
          <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Overall Compliance</div>
          <div className="text-2xl font-black text-blue-600 mt-1">{overallCompliance}%</div>
          <p className="text-[10px] text-muted-foreground mt-0.5">Organization rate</p>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="w-full">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-3">
          <TabsList className="bg-muted/50 p-1 rounded-xl">
            <TabsTrigger value="library" className="text-xs font-bold px-4 py-1.5 rounded-lg cursor-pointer">
              <FileText className="w-3.5 h-3.5 mr-1.5" /> Policy Library ({policies.length})
            </TabsTrigger>
            <TabsTrigger value="audits" className="text-xs font-bold px-4 py-1.5 rounded-lg cursor-pointer">
              <UserCheck className="w-3.5 h-3.5 mr-1.5" /> Compliance Audits
            </TabsTrigger>
          </TabsList>

          {/* Search & Category Filter */}
          {activeTab === 'library' && (
            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search policies..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-9 text-xs rounded-xl bg-card border-border/80"
                />
              </div>

              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="h-9 text-xs rounded-xl w-44 bg-card border-border/80">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Categories</SelectItem>
                  {categoryList.map((cat) => (
                    <SelectItem key={cat.id || cat.name} value={cat.name}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Tab 1: Policy Library */}
        <TabsContent value="library" className="space-y-4 mt-4">
          {isLoading ? (
            <div className="text-center py-12 text-xs text-muted-foreground font-medium">
              Loading policy library...
            </div>
          ) : filteredPolicies.length === 0 ? (
            <div className="text-center py-16 bg-card border border-border/80 rounded-2xl p-8">
              <FileText className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-foreground">No Policies Found</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto mb-4">
                No policy documents match your criteria. Click below to add a new policy.
              </p>
              <Button onClick={handleOpenCreateModal} size="sm" className="bg-primary text-primary-foreground font-bold text-xs">
                <Plus className="w-3.5 h-3.5 mr-1" /> Create Policy
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPolicies.map((policy) => {
                const stats = policy.stats || {
                  totalTargetUsers: 0,
                  acceptedUsers: 0,
                  compliancePercentage: 100,
                };
                const mappedRoles = policy.roleMappings?.map((rm) => rm.roleCode) || [];

                return (
                  <Card
                    key={policy.id}
                    className="border-border/80 bg-card rounded-2xl shadow-2xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden"
                  >
                    <CardHeader className="p-5 pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <Badge
                          variant="secondary"
                          className="bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded-md"
                        >
                          {policy.category || 'General'}
                        </Badge>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold text-muted-foreground">v{policy.version}</span>
                          {policy.isActive ? (
                            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] font-bold">
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground text-[10px]">
                              Inactive
                            </Badge>
                          )}
                        </div>
                      </div>

                      <CardTitle className="text-base font-bold text-foreground mt-2 line-clamp-1">
                        {policy.title}
                      </CardTitle>
                      {policy.description && (
                        <CardDescription className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {policy.description}
                        </CardDescription>
                      )}
                    </CardHeader>

                    <CardContent className="p-5 pt-0 space-y-4">
                      {/* Targeting Badges: Gender & Department */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {policy.applicableGender === 'female' ? (
                          <Badge className="bg-pink-50 text-pink-700 border-pink-200 text-[10px] font-bold">
                            👩 Female Only (POSH)
                          </Badge>
                        ) : policy.applicableGender === 'male' ? (
                          <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-bold">
                            👨 Male Only
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">
                            👥 All Genders
                          </Badge>
                        )}

                        {policy.applicableDepartmentIds && policy.applicableDepartmentIds.length > 0 ? (
                          <Badge className="bg-amber-50 text-amber-800 border-amber-200 text-[10px] font-bold">
                            🏢 {policy.applicableDepartmentIds.length} Depts
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">
                            🏢 All Depts
                          </Badge>
                        )}
                      </div>

                      {/* Compliance Stats Bar */}
                      <div className="bg-muted/40 p-3 rounded-xl space-y-1.5 border border-border/60">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[11px] font-semibold text-muted-foreground">Sign-off Compliance</span>
                          <span className="font-bold text-foreground">{stats.compliancePercentage}%</span>
                        </div>
                        <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-blue-600 h-full rounded-full transition-all duration-500"
                            style={{ width: `${stats.compliancePercentage}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-0.5">
                          <span>Accepted: {stats.acceptedUsers}</span>
                          <span>Target: {stats.totalTargetUsers}</span>
                        </div>
                      </div>

                      {/* Role Chips */}
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                          Applicable Roles:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {mappedRoles.includes('all') ? (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200">
                              All Roles
                            </span>
                          ) : (
                            mappedRoles.map((r) => (
                              <span
                                key={r}
                                className="text-[10px] font-medium px-2 py-0.5 rounded bg-muted text-muted-foreground"
                              >
                                {r}
                              </span>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="pt-2 flex items-center justify-between border-t border-border/60">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedAuditPolicyId(policy.id);
                              setActiveTab('audits');
                            }}
                            className="h-7 px-2 text-[11px] font-semibold text-primary hover:bg-primary/10 cursor-pointer"
                          >
                            <Users className="w-3.5 h-3.5 mr-1" /> Audit Log
                          </Button>
                        </div>

                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEditModal(policy)}
                            className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(policy.id)}
                            className="h-7 w-7 text-muted-foreground hover:text-destructive cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Tab 2: Compliance Audits */}
        <TabsContent value="audits" className="space-y-4 mt-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-card border border-border/80 rounded-xl p-4">
            <div>
              <h3 className="text-sm font-bold text-foreground">Employee Sign-Off Audit Log</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Audit trail recording employee acceptance timestamps, version snapshots, and IP addresses.
              </p>
            </div>

            <div className="w-full sm:w-72">
              <Select
                value={selectedAuditPolicyId ? String(selectedAuditPolicyId) : ''}
                onValueChange={(val) => setSelectedAuditPolicyId(Number(val))}
              >
                <SelectTrigger className="h-9 text-xs rounded-xl bg-card border-border/80">
                  <SelectValue placeholder="Select a policy to view audit" />
                </SelectTrigger>
                <SelectContent>
                  {policies.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)} className="text-xs">
                      {p.title} (v{p.version})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedAuditPolicyId && auditData ? (
            <Card className="border-border/80 bg-card rounded-xl shadow-2xs overflow-hidden">
              <CardHeader className="p-4 border-b border-border/60 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" /> {auditData.policy.title}
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Target version: <strong className="text-foreground">v{auditData.policy.version}</strong> • {auditData.auditList.length} mapped employees
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/40 border-b border-border/60 text-muted-foreground font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="p-3 pl-4">Employee</th>
                      <th className="p-3">Department</th>
                      <th className="p-3">Role</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Accepted Version</th>
                      <th className="p-3">Accepted Date</th>
                      <th className="p-3 pr-4">IP Address</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {auditData.auditList.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-muted-foreground text-xs">
                          No target employees mapped to this policy rule.
                        </td>
                      </tr>
                    ) : (
                      auditData.auditList.map((user, idx) => (
                        <tr key={idx} className="hover:bg-muted/30 transition-colors">
                          <td className="p-3 pl-4">
                            <div className="font-bold text-foreground">{user.name}</div>
                            <span className="text-[10px] text-muted-foreground">{user.email}</span>
                          </td>
                          <td className="p-3 text-muted-foreground font-medium">{user.departmentName}</td>
                          <td className="p-3">
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-muted text-foreground">
                              {user.roles.join(', ')}
                            </span>
                          </td>
                          <td className="p-3">
                            {user.isAccepted ? (
                              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] font-bold">
                                <CheckCircle2 className="w-3 h-3 mr-1" /> Accepted
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-amber-600 border-amber-500/30 bg-amber-500/10 text-[10px] font-bold">
                                <Clock className="w-3 h-3 mr-1" /> Pending
                              </Badge>
                            )}
                          </td>
                          <td className="p-3 font-semibold text-foreground">
                            {user.acceptedVersion ? `v${user.acceptedVersion}` : '—'}
                          </td>
                          <td className="p-3 text-muted-foreground">
                            {user.acceptedAt ? new Date(user.acceptedAt).toLocaleString() : '—'}
                          </td>
                          <td className="p-3 pr-4 font-mono text-[11px] text-muted-foreground">
                            {user.ipAddress || '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          ) : (
            <div className="text-center py-12 bg-card border border-border/80 rounded-2xl p-8">
              <ShieldCheck className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-foreground">Select a Policy to Inspect Compliance</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                Choose any policy from the dropdown above to view live employee sign-off logs and IP audit trails.
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dynamic Category Manager Modal */}
      <Dialog open={categoryManagerOpen} onOpenChange={setCategoryManagerOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <FolderPlus className="w-5 h-5 text-primary" /> Manage Policy Categories
            </DialogTitle>
            <DialogDescription className="text-xs">
              Create custom policy categories or delete existing ones.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Create New Category */}
            <div className="flex items-center gap-2">
              <Input
                placeholder="New Category Name (e.g. Remote Work)"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="h-9 text-xs rounded-xl"
              />
              <Button
                type="button"
                onClick={handleCreateCategory}
                disabled={createCategoryMutation.isPending || !newCategoryName.trim()}
                className="h-9 text-xs font-bold bg-primary text-primary-foreground shrink-0 cursor-pointer"
              >
                Add
              </Button>
            </div>

            {/* Category List with Delete Button */}
            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                Dynamic Categories ({categoryList.length}):
              </span>
              {categoryList.map((cat) => (
                <div
                  key={cat.id || cat.name}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-muted/30 border border-border/60 hover:bg-muted/50 transition-colors text-xs font-semibold"
                >
                  <span className="text-foreground">{cat.name}</span>
                  {cat.id ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteCategory(cat.id!, cat.name)}
                      className="h-7 w-7 text-muted-foreground hover:text-destructive cursor-pointer"
                      title={`Delete category ${cat.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  ) : (
                    <span className="text-[10px] text-muted-foreground italic px-2 py-0.5 bg-muted rounded">Default</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create / Edit Policy Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-2xl max-h-[88vh] flex flex-col p-6 overflow-hidden">
          <DialogHeader className="pb-3 border-b border-border flex-shrink-0">
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              {editingPolicy ? 'Edit Policy Document' : 'Create New Policy Document'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Upload compliance documents, set gender & department applicability rules, and assign mandatory role mappings.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSavePolicy} className="flex-1 overflow-y-auto space-y-4 py-2 pr-2">
            {/* Title & Category */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="title" className="text-xs font-bold">Policy Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g. POSH & Workplace Conduct Policy"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="h-9 text-xs rounded-xl"
                  required
                />
              </div>

              {/* Dynamic Category Selector */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="category" className="text-xs font-bold">Category</Label>
                  <button
                    type="button"
                    onClick={() => setCategoryManagerOpen(true)}
                    className="text-[10px] font-bold text-primary hover:underline flex items-center gap-0.5 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Manage Categories
                  </button>
                </div>
                <Select
                  value={formData.category}
                  onValueChange={(val) => {
                    if (val === '__ADD_NEW__') {
                      setCategoryManagerOpen(true);
                    } else {
                      setFormData({ ...formData, category: val });
                    }
                  }}
                >
                  <SelectTrigger id="category" className="h-9 text-xs rounded-xl">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryList.map((c) => (
                      <SelectItem key={c.id || c.name} value={c.name} className="text-xs font-medium">
                        {c.name}
                      </SelectItem>
                    ))}
                    <SelectItem value="__ADD_NEW__" className="text-xs font-bold text-primary border-t border-border mt-1 pt-1">
                      + Create New Category...
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="desc" className="text-xs font-bold">Summary / Description</Label>
              <Textarea
                id="desc"
                placeholder="Brief summary of guidelines, scope, and adherence instructions..."
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="text-xs rounded-xl"
              />
            </div>

            {/* Version & Active Switch */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center bg-muted/30 p-3 rounded-xl border border-border/70">
              <div className="space-y-1.5">
                <Label htmlFor="version" className="text-xs font-bold flex items-center gap-1.5">
                  Policy Version
                  <span className="text-[10px] text-muted-foreground font-normal">(e.g. 1.0, 2.0)</span>
                </Label>
                <Input
                  id="version"
                  placeholder="1.0"
                  value={formData.version}
                  onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                  className="h-8 text-xs rounded-lg bg-card"
                />
                <p className="text-[10px] text-muted-foreground">
                  * Incrementing the version prompts previous signers to re-accept.
                </p>
              </div>

              <div className="flex items-center justify-between sm:justify-end sm:gap-4 pt-2 sm:pt-0">
                <div className="text-right">
                  <Label className="text-xs font-bold block">Enforce & Publish</Label>
                  <span className="text-[10px] text-muted-foreground">Active in library</span>
                </div>
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
              </div>
            </div>

            {/* Document Upload */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Policy Document Attachment (PDF or File) *</Label>
              <input
                type="file"
                id="policy-file"
                onChange={handleFileUpload}
                accept=".pdf,.doc,.docx,.png,.jpg"
                className="hidden"
              />

              {formData.fileUrl ? (
                <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-9 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-sm shrink-0">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-foreground block truncate">
                        {formData.fileName || 'Policy Document Attached'}
                      </span>
                      <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 block">
                        ✓ Document Uploaded & Attached ({formData.fileSize ? `${(formData.fileSize / (1024 * 1024)).toFixed(2)} MB` : 'Ready to Publish'})
                      </span>
                    </div>
                  </div>
                  <label
                    htmlFor="policy-file"
                    className="cursor-pointer text-xs font-bold text-primary hover:underline px-3 py-1.5 bg-card border border-border rounded-lg shadow-2xs shrink-0"
                  >
                    Change File
                  </label>
                </div>
              ) : (
                <div className="border-2 border-dashed border-border hover:border-primary/50 rounded-xl p-4 text-center bg-muted/20 transition-colors">
                  <label htmlFor="policy-file" className="cursor-pointer block space-y-1">
                    <Upload className="w-6 h-6 text-primary mx-auto opacity-80" />
                    <span className="text-xs font-bold text-foreground block">
                      Click to upload or drag & drop document
                    </span>
                    <span className="text-[10px] text-muted-foreground block">
                      Supports PDF, DOCX, Images (Max 15MB)
                    </span>
                  </label>
                </div>
              )}
            </div>

            {/* Gender & Department Targeting Rules */}
            <div className="space-y-3 pt-3 border-t border-border/80">
              <div>
                <Label className="text-xs font-bold flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-primary" />
                  Target Audience & Applicability Rules
                </Label>
                <p className="text-[10px] text-muted-foreground">
                  Customize which employee demographics (gender & department) are required to sign this policy.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-muted/20 p-3 rounded-xl border border-border/70">
                {/* Gender Applicability */}
                <div className="space-y-1.5">
                  <Label htmlFor="applicableGender" className="text-xs font-bold text-foreground">
                    Gender Applicability
                  </Label>
                  <Select
                    value={formData.applicableGender}
                    onValueChange={(val: any) => setFormData({ ...formData, applicableGender: val })}
                  >
                    <SelectTrigger id="applicableGender" className="h-9 text-xs rounded-xl bg-card">
                      <SelectValue placeholder="Select Gender Applicability" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs font-medium">
                        👥 All Genders (Everyone)
                      </SelectItem>
                      <SelectItem value="female" className="text-xs font-medium text-pink-600">
                        👩 Female Employees Only (e.g. POSH)
                      </SelectItem>
                      <SelectItem value="male" className="text-xs font-medium text-blue-600">
                        👨 Male Employees Only
                      </SelectItem>
                      <SelectItem value="other" className="text-xs font-medium">
                        🧑 Other / Non-Binary Only
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground">
                    {formData.applicableGender === 'female'
                      ? 'Notice: Male employees will NOT be prompted for this policy.'
                      : formData.applicableGender === 'male'
                      ? 'Notice: Female employees will NOT be prompted for this policy.'
                      : 'Applies to all employees regardless of gender.'}
                  </p>
                </div>

                {/* Department Applicability */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">
                    Department Scope
                  </Label>
                  <Select
                    value={formData.applicableDepartmentIds.length === 0 ? 'all' : 'custom'}
                    onValueChange={(val) => {
                      if (val === 'all') {
                        setFormData({ ...formData, applicableDepartmentIds: [] });
                      } else if (val.startsWith('dept_')) {
                        const deptId = Number(val.replace('dept_', ''));
                        const current = formData.applicableDepartmentIds;
                        if (current.includes(deptId)) {
                          setFormData({
                            ...formData,
                            applicableDepartmentIds: current.filter((id) => id !== deptId),
                          });
                        } else {
                          setFormData({
                            ...formData,
                            applicableDepartmentIds: [...current, deptId],
                          });
                        }
                      }
                    }}
                  >
                    <SelectTrigger className="h-9 text-xs rounded-xl bg-card">
                      <SelectValue
                        placeholder={
                          formData.applicableDepartmentIds.length === 0
                            ? '🏢 All Departments (Company-wide)'
                            : `🏢 ${formData.applicableDepartmentIds.length} Selected Dept(s)`
                        }
                      >
                        {formData.applicableDepartmentIds.length === 0
                          ? '🏢 All Departments (Company-wide)'
                          : `🏢 ${formData.applicableDepartmentIds.length} Selected Dept(s)`}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="max-h-60 overflow-y-auto">
                      <SelectItem value="all" className="text-xs font-bold text-primary">
                        🏢 All Departments (Company-wide)
                      </SelectItem>
                      {departments.map((dept) => {
                        const isSelected = formData.applicableDepartmentIds.includes(dept.id);
                        return (
                          <SelectItem key={dept.id} value={`dept_${dept.id}`} className="text-xs font-medium">
                            {isSelected ? '✓ ' : ''}{dept.name}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground">
                    {formData.applicableDepartmentIds.length === 0
                      ? 'Applies company-wide across all departments.'
                      : `Applies specifically to ${formData.applicableDepartmentIds.length} designated department(s).`}
                  </p>
                </div>
              </div>

              {/* Department Multiselect Buttons */}
              {departments.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase">
                      Select Target Departments (leave empty for All):
                    </span>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, applicableDepartmentIds: [] })}
                      className="text-[10px] font-bold text-primary hover:underline cursor-pointer"
                    >
                      Reset to All Departments
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2 bg-card rounded-lg border border-border/70">
                    {departments.map((dept) => {
                      const isSelected = formData.applicableDepartmentIds.includes(dept.id);
                      return (
                        <button
                          key={dept.id}
                          type="button"
                          onClick={() => {
                            const current = formData.applicableDepartmentIds;
                            if (isSelected) {
                              setFormData({
                                ...formData,
                                applicableDepartmentIds: current.filter((id) => id !== dept.id),
                              });
                            } else {
                              setFormData({
                                ...formData,
                                applicableDepartmentIds: [...current, dept.id],
                              });
                            }
                          }}
                          className={`text-xs px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-primary text-primary-foreground shadow-2xs'
                              : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                          }`}
                        >
                          {isSelected ? '✓ ' : '+ '}
                          {dept.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Role-Mapping Matrix */}
            <div className="space-y-2 pt-3 border-t border-border/80">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-bold">Role Assignment Matrix</Label>
                  <p className="text-[10px] text-muted-foreground">
                    Select which roles must review and acknowledge this policy.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    onClick={handleSelectAllRoles}
                    className="h-auto p-0 text-xs text-primary font-bold hover:underline cursor-pointer"
                  >
                    {formData.selectedRoles.length === availableRoles.length ? 'Deselect All' : 'Select All Roles'}
                  </Button>
                </div>
              </div>

              {/* Roles Checkboxes */}
              <div className="grid grid-cols-2 gap-2 bg-muted/20 p-3 rounded-xl border border-border/70">
                {availableRoles.map((role) => {
                  const isChecked = formData.selectedRoles.includes(role.code);
                  return (
                    <div
                      key={role.code}
                      onClick={() => {
                        if (isChecked) {
                          setFormData({
                            ...formData,
                            selectedRoles: formData.selectedRoles.filter((r) => r !== role.code),
                          });
                        } else {
                          setFormData({
                            ...formData,
                            selectedRoles: [...formData.selectedRoles, role.code],
                          });
                        }
                      }}
                      className="flex items-center space-x-2 cursor-pointer select-none p-1 rounded hover:bg-muted/50 transition-colors"
                    >
                      <Checkbox
                        id={`role-${role.code}`}
                        checked={isChecked}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormData({
                              ...formData,
                              selectedRoles: [...formData.selectedRoles, role.code],
                            });
                          } else {
                            setFormData({
                              ...formData,
                              selectedRoles: formData.selectedRoles.filter((r) => r !== role.code),
                            });
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <label htmlFor={`role-${role.code}`} className="text-xs font-semibold cursor-pointer">
                        {role.label}
                      </label>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="mandatory"
                    checked={formData.isMandatory}
                    onCheckedChange={(checked) => setFormData({ ...formData, isMandatory: Boolean(checked) })}
                  />
                  <label htmlFor="mandatory" className="text-xs font-bold cursor-pointer">
                    Mandatory Policy (Blocks dashboard access until signed)
                  </label>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border flex-shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateModalOpen(false)}
                className="text-xs font-bold h-9"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createPolicyMutation.isPending || updatePolicyMutation.isPending}
                className="bg-primary text-primary-foreground font-bold text-xs h-9"
              >
                {createPolicyMutation.isPending || updatePolicyMutation.isPending
                  ? 'Saving...'
                  : editingPolicy
                  ? 'Update Policy'
                  : 'Publish Policy'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
