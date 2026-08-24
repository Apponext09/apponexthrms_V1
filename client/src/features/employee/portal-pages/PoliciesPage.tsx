import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/features/auth/store/authStore';
import { apiClient } from '@/config/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ShieldCheck, FileText, Shield, Plus, Eye, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface PolicySection {
  id: string;
  title: string;
  content: string;
}

interface RolePolicyItem {
  id: number;
  roleCode: string;
  documentRef?: string;
  title: string;
  description?: string;
  sections: PolicySection[] | string;
  status?: string;
  effectiveDate?: string | null;
  policyAccepted?: boolean;
  createdAt?: string;
}

export default function PoliciesPage() {
  const { user, acceptPolicy } = useAuthStore();
  const [policies, setPolicies] = useState<RolePolicyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPolicy, setSelectedPolicy] = useState<RolePolicyItem | null>(null);
  const [filterRole, setFilterRole] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Management state for Admin / Super Admin
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newRoleCode, setNewRoleCode] = useState('employee');
  const [newRef, setNewRef] = useState('POL-007');
  const [newDesc, setNewDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const rolesArray = Array.isArray(user?.roles) ? user.roles : (user?.role ? [user.role] : []);
  const isSuperAdmin = rolesArray.some((r) => ['super_admin', 'superadmin', 'owner'].includes(String(r).toLowerCase()));
  const isOrgAdmin = rolesArray.some((r) => ['organization_admin', 'admin'].includes(String(r).toLowerCase())) || (user?.designation || '').toLowerCase().includes('admin');
  const canManage = isSuperAdmin || isOrgAdmin;

  const fetchPolicies = async () => {
    try {
      setLoading(true);
      let loaded: RolePolicyItem[] = [];

      // Primary fetch: role-policies endpoint
      try {
        const res = await apiClient.get('/auth/role-policies');
        const data = res.data?.data || res.data?.policies || res.data;
        if (Array.isArray(data) && data.length > 0) {
          loaded = data;
        }
      } catch (err) {
        console.warn('GET /auth/role-policies failed, falling back to /auth/my-policies:', err);
      }

      // Fallback fetch if role-policies is empty
      if (loaded.length === 0) {
        try {
          const res = await apiClient.get('/auth/my-policies');
          const data = res.data?.data || res.data;
          if (data && data.title) {
            loaded = [data];
          }
        } catch (err) {
          console.error('GET /auth/my-policies failed:', err);
        }
      }

      setPolicies(loaded);
      if (loaded.length > 0) {
        setSelectedPolicy(loaded[0]);
      } else {
        setSelectedPolicy(null);
      }
    } catch (err) {
      console.error('Failed to fetch role policies:', err);
      toast.error('Could not load company policies');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicies();
  }, []);

  const handleAcknowledge = async () => {
    try {
      setSubmitting(true);
      await acceptPolicy();
      toast.success('Policy acknowledged successfully!', {
        description: 'Your compliance record has been saved.',
      });
      fetchPolicies();
    } catch (err) {
      toast.error('Failed to save policy acknowledgement.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreatePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      toast.error('Please enter a policy title');
      return;
    }
    try {
      setSubmitting(true);
      const payload = {
        title: newTitle,
        roleCode: newRoleCode,
        documentRef: newRef,
        description: newDesc,
        status: 'published',
        sections: [
          {
            id: 'sec_1',
            title: '1. POLICY STATEMENT',
            content: `Official governance statement for ${newTitle}.`,
          },
          {
            id: 'sec_2',
            title: '2. ROLE RESPONSIBILITIES',
            content: `Core operational guidelines and responsibilities assigned to ${newRoleCode.replace('_', ' ').toUpperCase()}.`,
          },
        ],
      };
      await apiClient.post('/auth/role-policies', payload);
      toast.success('New role policy created and published successfully!');
      setShowCreateModal(false);
      setNewTitle('');
      setNewDesc('');
      fetchPolicies();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to create policy');
    } finally {
      setSubmitting(false);
    }
  };

  const parseSections = (rawSections: any): PolicySection[] => {
    if (!rawSections) return [];
    let raw = rawSections;
    try {
      while (typeof raw === 'string') {
        raw = JSON.parse(raw);
      }
      if (Array.isArray(raw)) return raw;
    } catch {
      return [];
    }
    return [];
  };

  const filteredPolicies = policies.filter((p) => {
    const titleMatch = (p.title || '').toLowerCase().includes(searchQuery.toLowerCase());
    const descMatch = (p.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    const refMatch = (p.documentRef || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSearch = titleMatch || descMatch || refMatch;
    const matchesRole = filterRole === 'all' || p.roleCode === filterRole;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card border border-border/80 rounded-xl p-5 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-foreground tracking-tight flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" /> Role-Based Company Policies
            </h2>
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-extrabold uppercase">
              {(rolesArray[0] || 'Employee').replace('_', ' ')} Scope
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Access official governance manuals, operational responsibilities, and HR policy frameworks assigned to your role.
          </p>
        </div>

        {canManage && (
          <Button
            size="sm"
            onClick={() => setShowCreateModal(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs gap-1.5 h-9 px-4 shadow-sm"
          >
            <Plus className="w-4 h-4" /> Create & Assign Policy
          </Button>
        )}
      </div>

      {/* Control Bar: Filters & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <Button
            variant={filterRole === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterRole('all')}
            className="h-8 rounded-lg text-xs font-bold"
          >
            All Assigned Policies ({policies.length})
          </Button>
          {canManage && ['organization_admin', 'hr_manager', 'department_head', 'team_lead', 'employee', 'intern'].map((r) => (
            <Button
              key={r}
              variant={filterRole === r ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterRole(r)}
              className="h-8 rounded-lg text-xs font-semibold capitalize"
            >
              {r.replace('_', ' ')}
            </Button>
          ))}
        </div>

        <Input
          placeholder="Search policy name, ref, or keyword..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-8 text-xs max-w-xs bg-card"
        />
      </div>

      {/* Main Content View */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-card border border-border rounded-xl space-y-3">
          <div className="h-9 w-9 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-xs font-medium text-muted-foreground">Loading role-assigned policies...</p>
        </div>
      ) : filteredPolicies.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-16 px-4 bg-card border border-border/80 rounded-xl space-y-3 text-center">
          <div className="h-12 w-12 rounded-2xl bg-muted/60 text-muted-foreground flex items-center justify-center border border-border">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-foreground">No policies have been assigned to your role.</h3>
            <p className="text-xs text-muted-foreground max-w-md">
              Your assigned role currently has no active policies assigned. Check back later or contact your HR Administrator.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={fetchPolicies} className="h-8 text-xs gap-1.5 mt-2 font-semibold">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh List
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Policy List Cards (Left Column) */}
          <div className="lg:col-span-5 space-y-3">
            {filteredPolicies.map((p) => {
              const isSelected = selectedPolicy?.id === p.id;
              return (
                <Card
                  key={p.id}
                  onClick={() => setSelectedPolicy(p)}
                  className={`border rounded-xl shadow-2xs cursor-pointer transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                      : 'border-border/80 bg-card hover:border-primary/40'
                  }`}
                >
                  <CardHeader className="p-4 pb-2 flex flex-row justify-between items-start space-y-0">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                          {p.documentRef || `POL-${String(p.id).padStart(3, '0')}`}
                        </span>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">
                          {(p.roleCode || 'Role').replace('_', ' ')}
                        </span>
                      </div>
                      <CardTitle className="text-sm font-bold text-foreground leading-tight">
                        {p.title}
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-1 space-y-3">
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {p.description || 'Formal governance document defining role obligations and workplace guidelines.'}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground font-semibold pt-1 border-t border-border/50">
                      <span>Status: <strong className="text-emerald-500 uppercase">{p.status || 'published'}</strong></span>
                      <span className="flex items-center gap-1 text-primary font-bold">
                        <Eye className="w-3 h-3" /> View Reader
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Detailed Policy Paper Document Reader (Right Column) */}
          <div className="lg:col-span-7">
            {selectedPolicy ? (
              <div className="bg-card text-foreground border border-border shadow-md rounded-xl p-6 sm:p-8 space-y-6 font-sans">
                
                {/* Header Metadata Box */}
                <div className="text-center space-y-2 border-b-2 border-primary/40 pb-5">
                  <p className="text-[10px] font-extrabold text-primary tracking-widest uppercase">
                    ApponextHRMS Official Role Policy Document
                  </p>
                  <h1 className="text-lg sm:text-xl font-black uppercase text-foreground leading-tight">
                    {selectedPolicy.title}
                  </h1>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 bg-muted/40 rounded-lg text-[11px] font-medium border border-border/60">
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-bold">Doc Ref ID</span>
                    <span className="font-bold text-foreground">{selectedPolicy.documentRef || `POL-${String(selectedPolicy.id).padStart(3, '0')}`}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-bold">Role Scope</span>
                    <span className="font-bold text-foreground uppercase">{(selectedPolicy.roleCode || '').replace('_', ' ')}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-bold">Status</span>
                    <span className="font-bold text-emerald-500 uppercase">{selectedPolicy.status || 'published'}</span>
                  </div>
                </div>

                {selectedPolicy.description && (
                  <p className="text-xs italic text-muted-foreground bg-muted/20 p-3 rounded-lg border-l-4 border-primary leading-relaxed">
                    {selectedPolicy.description}
                  </p>
                )}

                {/* Numbered Formal Sections */}
                <div className="space-y-5 pt-2">
                  {parseSections(selectedPolicy.sections).map((sec, idx) => (
                    <div key={sec.id || idx} className="space-y-1.5">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        {sec.title}
                      </h3>
                      <div className="text-xs leading-relaxed text-muted-foreground pl-5 space-y-1">
                        {sec.content ? (
                          sec.content.split('\n').map((line, lineIdx) => {
                            const trimmed = line.trim();
                            if (trimmed.startsWith('•')) {
                              return (
                                <p key={lineIdx} className="pl-3 text-foreground/90 font-medium">
                                  {line}
                                </p>
                              );
                            }
                            return <p key={lineIdx}>{line}</p>;
                          })
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer Bar & Acknowledgement */}
                <div className="border-t border-border pt-4 space-y-4">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground font-semibold">
                    <span>{selectedPolicy.title}</span>
                    <span>Official Document | Page 1 of 1</span>
                  </div>

                  {!user?.policyAccepted && (
                    <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 space-y-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                        <ShieldCheck className="w-4 h-4 text-primary" /> Mandatory Role Acknowledgement Required
                      </div>
                      <Button
                        size="sm"
                        onClick={handleAcknowledge}
                        disabled={submitting}
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs h-9 gap-1.5"
                      >
                        {submitting ? 'Processing...' : 'Acknowledge Policy & Confirm Compliance'}
                      </Button>
                    </div>
                  )}
                </div>

              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 bg-card border border-border rounded-xl text-center">
                <FileText className="w-8 h-8 text-muted-foreground mb-2" />
                <p className="text-xs font-medium text-muted-foreground">Select a policy card to view details.</p>
              </div>
            )}
          </div>

        </div>
      )}

      {/* Admin Create Policy Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4">
          <div className="bg-background border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" /> Create & Assign Role Policy
            </h3>
            <form onSubmit={handleCreatePolicy} className="space-y-3 text-xs font-medium">
              <div>
                <label className="block text-muted-foreground font-bold mb-1">Policy Title</label>
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. WORK FROM HOME & REMOTE POLICY"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted-foreground font-bold mb-1">Target Role</label>
                  <select
                    value={newRoleCode}
                    onChange={(e) => setNewRoleCode(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs"
                  >
                    <option value="organization_admin">Organization Admin</option>
                    <option value="hr_manager">HR Manager</option>
                    <option value="department_head">Department Head</option>
                    <option value="team_lead">Team Lead</option>
                    <option value="employee">Employee</option>
                    <option value="intern">Intern</option>
                  </select>
                </div>
                <div>
                  <label className="block text-muted-foreground font-bold mb-1">Document Ref</label>
                  <Input
                    value={newRef}
                    onChange={(e) => setNewRef(e.target.value)}
                    placeholder="POL-007"
                  />
                </div>
              </div>

              <div>
                <label className="block text-muted-foreground font-bold mb-1">Description</label>
                <Input
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Brief summary of operational rules..."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={submitting} className="bg-primary text-primary-foreground font-bold">
                  {submitting ? 'Creating...' : 'Publish & Assign'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
