import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck,
  Plus,
  Search,
  Filter,
  FileText,
  Download,
  Edit2,
  Trash2,
  Users,
  Eye,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Upload,
  Layers,
  Sparkles,
  BarChart3,
  Globe,
  Lock,
  ArrowUpDown,
} from 'lucide-react';
import {
  usePolicies,
  useCreatePolicy,
  useUpdatePolicy,
  useDeletePolicy,
  usePolicyAudit,
  PolicyDocument,
} from '../api/usePolicies';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

const CATEGORIES = [
  'General',
  'Code of Conduct',
  'Information Security',
  'Leaves & Attendance',
  'Health & Safety',
  'Finance & Expenses',
  'Compliance & POSH',
  'Remote Work',
];

const AVAILABLE_ROLES = [
  { code: 'employee', label: 'Employee' },
  { code: 'team_lead', label: 'Team Lead' },
  { code: 'department_head', label: 'Department Head / Manager' },
  { code: 'hr_manager', label: 'HR Manager / Support' },
  { code: 'hr_admin', label: 'HR Admin' },
  { code: 'intern', label: 'Intern' },
  { code: 'consultant', label: 'Consultant' },
];

export function PolicyManagementPage() {
  const { data: policies = [], isLoading } = usePolicies();
  const createPolicyMutation = useCreatePolicy();
  const updatePolicyMutation = useUpdatePolicy();
  const deletePolicyMutation = useDeletePolicy();

  const [activeTab, setActiveTab] = useState<'library' | 'audits'>('library');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<PolicyDocument | null>(null);
  const [selectedAuditPolicyId, setSelectedAuditPolicyId] = useState<number | null>(null);
  const [previewPolicy, setPreviewPolicy] = useState<PolicyDocument | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    category: 'General',
    description: '',
    version: '1.0',
    isActive: true,
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
      category: 'General',
      description: '',
      version: '1.0',
      isActive: true,
      fileUrl: '',
      fileName: '',
      fileSize: 0,
      fileType: '',
      isMandatory: true,
      selectedRoles: ['employee', 'team_lead', 'department_head', 'hr_manager', 'intern', 'consultant'],
    });
    setCreateModalOpen(true);
  };

  const handleOpenEditModal = (policy: PolicyDocument) => {
    setEditingPolicy(policy);
    const roleCodes = policy.roleMappings?.map((rm) => rm.roleCode) || ['employee'];
    const isMandatory = policy.roleMappings?.some((rm) => rm.isMandatory) ?? true;

    setFormData({
      title: policy.title,
      category: policy.category || 'General',
      description: policy.description || '',
      version: policy.version || '1.0',
      isActive: policy.isActive,
      fileUrl: policy.fileUrl || '',
      fileName: policy.fileName || '',
      fileSize: policy.fileSize || 0,
      fileType: policy.fileType || '',
      isMandatory,
      selectedRoles: roleCodes.includes('all')
        ? AVAILABLE_ROLES.map((r) => r.code)
        : roleCodes,
    });
    setCreateModalOpen(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setFormData((prev) => ({
        ...prev,
        fileUrl: reader.result as string,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleToggleRole = (roleCode: string, explicitChecked?: boolean) => {
    setFormData((prev) => {
      const exists = prev.selectedRoles.includes(roleCode);
      const shouldInclude = explicitChecked !== undefined ? explicitChecked : !exists;
      const nextRoles = shouldInclude
        ? exists ? prev.selectedRoles : [...prev.selectedRoles, roleCode]
        : prev.selectedRoles.filter((r) => r !== roleCode);
      return { ...prev, selectedRoles: nextRoles };
    });
  };

  const handleSelectAllRoles = () => {
    if (formData.selectedRoles.length === AVAILABLE_ROLES.length) {
      setFormData((prev) => ({ ...prev, selectedRoles: [] }));
    } else {
      setFormData((prev) => ({ ...prev, selectedRoles: AVAILABLE_ROLES.map((r) => r.code) }));
    }
  };

  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error('Please enter a policy title');
      return;
    }
    if (!formData.fileUrl) {
      toast.error('Please upload a policy document file or PDF');
      return;
    }
    if (formData.selectedRoles.length === 0) {
      toast.error('Please map the policy to at least one role');
      return;
    }

    const roleMappings = formData.selectedRoles.map((roleCode) => ({
      roleCode,
      isMandatory: formData.isMandatory,
    }));

    try {
      if (editingPolicy) {
        await updatePolicyMutation.mutateAsync({
          id: editingPolicy.id,
          payload: {
            title: formData.title,
            category: formData.category,
            description: formData.description,
            version: formData.version,
            isActive: formData.isActive,
            fileUrl: formData.fileUrl,
            fileName: formData.fileName,
            fileSize: formData.fileSize,
            fileType: formData.fileType,
            roleMappings,
          },
        });
      } else {
        await createPolicyMutation.mutateAsync({
          title: formData.title,
          category: formData.category,
          description: formData.description,
          version: formData.version,
          isActive: formData.isActive,
          fileUrl: formData.fileUrl,
          fileName: formData.fileName,
          fileSize: formData.fileSize,
          fileType: formData.fileType,
          roleMappings,
        });
      }
      setCreateModalOpen(false);
    } catch (err) {
      // Error handled by mutation
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this policy? This action will remove the policy document from the library.')) {
      await deletePolicyMutation.mutateAsync(id);
    }
  };

  const handleDownload = (policy: any) => {
    if (!policy.fileUrl) return;
    if (policy.fileUrl.startsWith('data:')) {
      const link = document.createElement('a');
      link.href = policy.fileUrl;
      link.download = policy.fileName || `${policy.title.replace(/\s+/g, '_')}_v${policy.version}.pdf`;
      link.click();
    } else {
      window.open(policy.fileUrl, '_blank');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border/80 rounded-2xl p-5 shadow-2xs">
        <div className="flex items-center gap-3.5">
          <div className="size-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 ring-1 ring-primary/20">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-foreground tracking-tight">Company Policy Management</h1>
              <Badge variant="outline" className="border-primary/30 text-primary bg-primary/10 text-[10px] font-bold">
                Governance & Compliance
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Maintain the organization's policy library, enforce role-based mandatory sign-offs, and track real-time audit logs.
            </p>
          </div>
        </div>

        <Button
          onClick={handleOpenCreateModal}
          className="font-bold text-xs gap-1.5 h-9 rounded-xl shadow-xs bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Create Policy Document
        </Button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border/80 bg-card p-4 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Total Policies</span>
            <FileText className="w-4 h-4 text-primary" />
          </div>
          <p className="text-2xl font-black text-foreground mt-2">{totalPolicies}</p>
          <span className="text-[10px] text-muted-foreground">In organization library</span>
        </Card>

        <Card className="border-border/80 bg-card p-4 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Active Published</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-foreground mt-2">{activePolicies}</p>
          <span className="text-[10px] text-emerald-600 font-semibold">Enforcing compliance</span>
        </Card>

        <Card className="border-border/80 bg-card p-4 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Target Sign-offs</span>
            <Users className="w-4 h-4 text-violet-500" />
          </div>
          <p className="text-2xl font-black text-foreground mt-2">{totalAcceptedUsers} / {totalTargetUsers}</p>
          <span className="text-[10px] text-muted-foreground">Completed / Total required</span>
        </Card>

        <Card className="border-border/80 bg-card p-4 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Compliance Rate</span>
            <BarChart3 className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-foreground mt-2">{overallCompliance}%</p>
          <span className="text-[10px] text-muted-foreground">Organization-wide avg</span>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)}>
        <TabsList className="bg-muted/60 p-1 border border-border/80 rounded-xl h-10">
          <TabsTrigger value="library" className="rounded-lg text-xs font-bold gap-1.5 data-[state=active]:bg-card cursor-pointer">
            <Layers className="w-3.5 h-3.5" /> Policy Library ({policies.length})
          </TabsTrigger>
          <TabsTrigger value="audits" className="rounded-lg text-xs font-bold gap-1.5 data-[state=active]:bg-card cursor-pointer">
            <ShieldCheck className="w-3.5 h-3.5" /> Compliance & Audit Logs
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Library */}
        <TabsContent value="library" className="space-y-4 mt-4">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search policy name or details..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs rounded-xl bg-card border-border/80"
              />
            </div>

            {/* Categories */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <Button
                variant={selectedCategory === 'All' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory('All')}
                className="h-8 text-xs font-bold rounded-lg border-border cursor-pointer"
              >
                All
              </Button>
              {CATEGORIES.map((cat) => (
                <Button
                  key={cat}
                  variant={selectedCategory === cat ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(cat)}
                  className="h-8 text-xs font-semibold rounded-lg whitespace-nowrap border-border cursor-pointer"
                >
                  {cat}
                </Button>
              ))}
            </div>
          </div>

          {/* Policy Cards Grid */}
          {filteredPolicies.length === 0 ? (
            <div className="text-center py-12 bg-card border border-border/80 rounded-2xl p-8">
              <FileText className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-foreground">No Policies Found</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                No policy documents match the current filter. Create a new document to start managing compliance.
              </p>
              <Button onClick={handleOpenCreateModal} size="sm" className="mt-4 font-bold text-xs gap-1.5 cursor-pointer">
                <Plus className="w-3.5 h-3.5" /> Add First Policy
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPolicies.map((policy) => {
                const compliance = policy.stats?.compliancePercentage ?? 100;
                return (
                  <Card
                    key={policy.id}
                    className="border border-border/80 bg-card hover:border-primary/40 transition-all rounded-xl shadow-2xs flex flex-col justify-between"
                  >
                    <CardHeader className="p-4 pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <Badge variant="outline" className="text-[10px] font-bold px-2 py-0.5 bg-muted/50 border-border">
                          {policy.category}
                        </Badge>
                        <div className="flex items-center gap-1.5">
                          <Badge
                            className={`text-[9px] font-bold ${
                              policy.isActive
                                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {policy.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                          <span className="text-[10px] font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            v{policy.version}
                          </span>
                        </div>
                      </div>

                      <CardTitle className="text-sm font-bold text-foreground mt-2 line-clamp-1">
                        {policy.title}
                      </CardTitle>
                      {policy.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                          {policy.description}
                        </p>
                      )}
                    </CardHeader>

                    <CardContent className="p-4 pt-0 space-y-3">
                      {/* Mapped Roles */}
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block mb-1">
                          Mapped Roles:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {policy.roleMappings && policy.roleMappings.length > 0 ? (
                            policy.roleMappings.map((rm, i) => (
                              <span
                                key={i}
                                className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20"
                              >
                                {AVAILABLE_ROLES.find((r) => r.code === rm.roleCode)?.label || rm.roleCode}
                              </span>
                            ))
                          ) : (
                            <span className="text-[10px] text-muted-foreground">All Employees</span>
                          )}
                        </div>
                      </div>

                      {/* Compliance Progress */}
                      <div className="pt-2 border-t border-border/60">
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className="text-muted-foreground font-semibold">Compliance</span>
                          <span className="font-bold text-foreground">
                            {policy.stats?.acceptedUsers || 0} / {policy.stats?.totalTargetUsers || 0} ({compliance}%)
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              compliance >= 90
                                ? 'bg-emerald-500'
                                : compliance >= 60
                                ? 'bg-amber-500'
                                : 'bg-primary'
                            }`}
                            style={{ width: `${compliance}%` }}
                          />
                        </div>
                      </div>

                      {/* Card Actions */}
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/60">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setPreviewPolicy(policy)}
                            className="h-7 px-2 text-[11px] font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" /> View
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedAuditPolicyId(policy.id);
                              setActiveTab('audits');
                            }}
                            className="h-7 px-2 text-[11px] font-semibold text-primary hover:bg-primary/10 cursor-pointer"
                          >
                            <Users className="w-3.5 h-3.5 mr-1" /> Audit
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

            {/* Policy Selector */}
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

          {/* Audit List Table */}
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
                          No employees mapped to this policy.
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

      {/* Create / Edit Policy Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-2xl max-h-[88vh] flex flex-col p-6 overflow-hidden">
          <DialogHeader className="pb-3 border-b border-border flex-shrink-0">
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              {editingPolicy ? 'Edit Policy Document' : 'Create New Policy Document'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Upload compliance documents, configure versioning, and assign mandatory role mappings.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSavePolicy} className="flex-1 overflow-y-auto space-y-4 py-2 pr-2">
            {/* Title & Category */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="title" className="text-xs font-bold">Policy Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g. Information Security & AI Usage Policy"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="h-9 text-xs rounded-xl"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="category" className="text-xs font-bold">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(val) => setFormData({ ...formData, category: val })}
                >
                  <SelectTrigger id="category" className="h-9 text-xs rounded-xl">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c} className="text-xs">
                        {c}
                      </SelectItem>
                    ))}
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
              <div className="border-2 border-dashed border-border hover:border-primary/50 rounded-xl p-4 text-center bg-muted/20 transition-colors">
                <input
                  type="file"
                  id="policy-file"
                  onChange={handleFileUpload}
                  accept=".pdf,.doc,.docx,.png,.jpg"
                  className="hidden"
                />
                <label htmlFor="policy-file" className="cursor-pointer block space-y-1">
                  <Upload className="w-6 h-6 text-primary mx-auto opacity-80" />
                  <span className="text-xs font-bold text-foreground block">
                    {formData.fileName ? formData.fileName : 'Click to upload or drag & drop document'}
                  </span>
                  <span className="text-[10px] text-muted-foreground block">
                    Supports PDF, DOCX, Images (Max 15MB)
                  </span>
                </label>
              </div>
            </div>

            {/* Role-Mapping Matrix */}
            <div className="space-y-2 pt-2 border-t border-border/80">
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
                    {formData.selectedRoles.length === AVAILABLE_ROLES.length ? 'Deselect All' : 'Select All Roles'}
                  </Button>
                </div>
              </div>

              {/* Roles Checkboxes */}
              <div className="grid grid-cols-2 gap-2 bg-muted/20 p-3 rounded-xl border border-border/70">
                {AVAILABLE_ROLES.map((role) => {
                  const isChecked = formData.selectedRoles.includes(role.code);
                  return (
                    <div
                      key={role.code}
                      onClick={() => handleToggleRole(role.code)}
                      className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer select-none transition-colors ${
                        isChecked
                          ? 'bg-primary/10 border-primary/30 text-foreground'
                          : 'bg-card border-border/60 hover:bg-muted/60 text-muted-foreground'
                      }`}
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={(checked) => handleToggleRole(role.code, Boolean(checked))}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span className="text-xs font-semibold">{role.label}</span>
                    </div>
                  );
                })}
              </div>

              {/* Mandatory Sign-off Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs">
                <div>
                  <span className="font-bold text-amber-700 dark:text-amber-400 block">Mandatory Acceptance Gate</span>
                  <span className="text-[10px] text-amber-600/80 dark:text-amber-300/80">
                    Blocks user dashboard until accepted upon login.
                  </span>
                </div>
                <Switch
                  checked={formData.isMandatory}
                  onCheckedChange={(checked) => setFormData({ ...formData, isMandatory: checked })}
                />
              </div>
            </div>

            <DialogFooter className="pt-3 border-t border-border flex-shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateModalOpen(false)}
                className="h-9 text-xs rounded-xl cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="h-9 text-xs font-bold rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer"
              >
                {editingPolicy ? 'Save Changes' : 'Publish Policy Document'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewPolicy} onOpenChange={() => setPreviewPolicy(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-6 overflow-hidden">
          <DialogHeader className="pb-3 border-b border-border flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-base font-bold flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" /> {previewPolicy?.title}
                </DialogTitle>
                <DialogDescription className="text-xs mt-0.5">
                  Version {previewPolicy?.version} • {previewPolicy?.category}
                </DialogDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownload(previewPolicy)}
                className="h-8 text-xs font-semibold gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> Download
              </Button>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto my-4 rounded-xl border border-border bg-muted/20 min-h-[350px] flex items-center justify-center">
            {previewPolicy?.fileUrl ? (
              previewPolicy.fileUrl.startsWith('data:application/pdf') || previewPolicy.fileUrl.endsWith('.pdf') ? (
                <iframe
                  src={previewPolicy.fileUrl}
                  title={previewPolicy.title}
                  className="w-full h-full min-h-[450px] rounded-lg"
                />
              ) : previewPolicy.fileUrl.startsWith('data:image/') || /\.(jpg|jpeg|png|webp)$/i.test(previewPolicy.fileUrl) ? (
                <img
                  src={previewPolicy.fileUrl}
                  alt={previewPolicy.title}
                  className="max-h-[450px] object-contain mx-auto"
                />
              ) : (
                <div className="p-8 text-center space-y-3">
                  <FileText className="w-10 h-10 text-primary mx-auto opacity-70" />
                  <p className="text-xs text-muted-foreground">{previewPolicy.description || 'Document attached.'}</p>
                  <Button onClick={() => handleDownload(previewPolicy)} size="sm" className="font-bold text-xs gap-1.5 cursor-pointer">
                    <Download className="w-4 h-4" /> Download Document
                  </Button>
                </div>
              )
            ) : (
              <p className="text-xs text-muted-foreground">No file attached.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
