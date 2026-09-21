import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { policiesApi } from '../api/policiesApi';
import type { RolePolicyRecord, PolicyDashboardStats, PolicyVersionRecord } from '../types/policy';
import { POLICY_CATEGORIES, AVAILABLE_ROLES } from '../types/policy';
import { PolicyStatusBadge } from '../components/PolicyStatusBadge';
import { PolicyReader } from '../components/PolicyReader';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  ShieldCheck,
  Plus,
  BarChart3,
  Search,
  Eye,
  Edit,
  History,
  Archive,
  Users,
  CheckCircle2,
  Clock,
  FileText,
  RefreshCw,
  X,
  Filter,
} from 'lucide-react';
import { toast } from 'sonner';

export const AdminPolicyDashboardPage: React.FC = () => {
  const navigate = useNavigate();

  const [stats, setStats] = useState<PolicyDashboardStats>({
    totalPolicies: 0,
    publishedPolicies: 0,
    draftPolicies: 0,
    archivedPolicies: 0,
    employeesAcknowledgedPercent: 0,
    pendingAcknowledgements: 0,
  });

  const [policies, setPolicies] = useState<RolePolicyRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  // Reader & Version History Modals
  const [selectedReaderPolicy, setSelectedReaderPolicy] = useState<RolePolicyRecord | null>(null);
  const [versionHistoryPolicy, setVersionHistoryPolicy] = useState<RolePolicyRecord | null>(null);
  const [versionsList, setVersionsList] = useState<PolicyVersionRecord[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [statsData, listData] = await Promise.all([
        policiesApi.getDashboardStats(),
        policiesApi.getAdminPolicies({
          search: searchQuery,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          category: categoryFilter !== 'all' ? categoryFilter : undefined,
          role: roleFilter !== 'all' ? roleFilter : undefined,
        }),
      ]);

      setStats(statsData);
      setPolicies(listData);
    } catch (err) {
      console.error('Failed to load policy dashboard:', err);
      toast.error('Could not load policy management data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [statusFilter, categoryFilter, roleFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadDashboardData();
  };

  const handleArchivePolicy = async (id: number) => {
    if (!await window.appConfirm('Are you sure you want to archive this policy document?')) return;
    try {
      await policiesApi.archivePolicy(id);
      toast.success('Policy archived successfully.');
      loadDashboardData();
    } catch (err) {
      toast.error('Failed to archive policy.');
    }
  };

  const handleOpenVersionHistory = async (policy: RolePolicyRecord) => {
    setVersionHistoryPolicy(policy);
    try {
      setLoadingVersions(true);
      const versions = await policiesApi.getVersionHistory(policy.id);
      setVersionsList(versions);
    } catch (err) {
      toast.error('Could not load policy version history.');
    } finally {
      setLoadingVersions(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card border border-border/80 rounded-xl p-5 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-foreground tracking-tight flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" /> Role-Based Policy Management
            </h2>
            <Badge className="bg-primary/10 text-primary border border-primary/20 font-bold uppercase text-[10px]">
              Admin Governance
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Create, assign, version, and monitor enterprise role-based policies across all departments.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            size="sm"
            onClick={() => navigate('/policies/create')}
            className="bg-primary text-primary-foreground font-bold text-xs gap-1.5 h-9"
          >
            <Plus className="w-4 h-4" /> Create & Assign Policy
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate('/policies/reports')}
            className="font-bold text-xs gap-1.5 h-9"
          >
            <BarChart3 className="w-3.5 h-3.5 text-primary" /> Policy Reports
          </Button>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="border-border/80 shadow-2xs">
          <CardContent className="p-3.5 space-y-1">
            <div className="text-[10px] font-bold text-muted-foreground uppercase">Total Policies</div>
            <div className="text-xl font-black text-foreground">{stats.totalPolicies}</div>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-2xs">
          <CardContent className="p-3.5 space-y-1">
            <div className="text-[10px] font-bold text-muted-foreground uppercase">Published</div>
            <div className="text-xl font-black text-emerald-600">{stats.publishedPolicies}</div>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-2xs">
          <CardContent className="p-3.5 space-y-1">
            <div className="text-[10px] font-bold text-muted-foreground uppercase">Drafts</div>
            <div className="text-xl font-black text-amber-600">{stats.draftPolicies}</div>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-2xs">
          <CardContent className="p-3.5 space-y-1">
            <div className="text-[10px] font-bold text-muted-foreground uppercase">Archived</div>
            <div className="text-xl font-black text-slate-500">{stats.archivedPolicies}</div>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-2xs">
          <CardContent className="p-3.5 space-y-1">
            <div className="text-[10px] font-bold text-muted-foreground uppercase">Acknowledged %</div>
            <div className="text-xl font-black text-emerald-500">{stats.employeesAcknowledgedPercent}%</div>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-2xs">
          <CardContent className="p-3.5 space-y-1">
            <div className="text-[10px] font-bold text-muted-foreground uppercase">Pending Sign-Off</div>
            <div className="text-xl font-black text-amber-500">{stats.pendingAcknowledgements}</div>
          </CardContent>
        </Card>
      </div>

      {/* Control Bar: Filters & Search */}
      <div className="bg-card border border-border/80 rounded-xl p-4 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            {['all', 'published', 'draft', 'archived'].map((st) => (
              <Button
                key={st}
                type="button"
                variant={statusFilter === st ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter(st)}
                className="h-8 rounded-lg text-xs font-bold capitalize"
              >
                {st}
              </Button>
            ))}
          </div>

          {/* Search Form & Selects */}
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full md:w-auto">
            {/* Category Select */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-8 rounded-lg border border-input bg-background px-2.5 text-xs font-medium"
            >
              <option value="all">All Categories</option>
              {POLICY_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            {/* Role Select */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="h-8 rounded-lg border border-input bg-background px-2.5 text-xs font-medium"
            >
              <option value="all">All Roles</option>
              {AVAILABLE_ROLES.map((r) => (
                <option key={r.code} value={r.code}>
                  {r.label}
                </option>
              ))}
            </select>

            <Input
              placeholder="Search policy name or ref..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 text-xs w-48 bg-background"
            />
            <Button type="submit" size="sm" variant="secondary" className="h-8 text-xs font-bold">
              <Search className="w-3.5 h-3.5" />
            </Button>
          </form>
        </div>
      </div>

      {/* Main Table View */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-card border border-border rounded-xl space-y-3">
          <div className="h-9 w-9 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-xs font-medium text-muted-foreground">Loading enterprise policy repository...</p>
        </div>
      ) : policies.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 bg-card border border-border rounded-xl space-y-3 text-center">
          <FileText className="w-8 h-8 text-muted-foreground" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-foreground">No Policies Found</h3>
            <p className="text-xs text-muted-foreground max-w-md">
              There are no policies matching your search filters. Click below to create a new governance policy.
            </p>
          </div>
          <Button size="sm" onClick={() => navigate('/policies/create')} className="text-xs font-bold gap-1.5 mt-2">
            <Plus className="w-3.5 h-3.5" /> Create New Policy
          </Button>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl shadow-2xs overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-medium">
            <thead>
              <tr className="bg-muted/40 border-b border-border text-muted-foreground font-bold uppercase text-[10px]">
                <th className="p-3.5">Policy Code & Version</th>
                <th className="p-3.5">Policy Name</th>
                <th className="p-3.5">Category</th>
                <th className="p-3.5">Applicable To</th>
                <th className="p-3.5">Gender</th>
                <th className="p-3.5">Effective Date</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {policies.map((p) => {
                const genderVal = (p.applicableGender || 'all').toLowerCase();
                const isGenderWise = genderVal !== 'all';

                return (
                  <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-3.5 font-mono">
                      <span className="font-bold text-primary">{p.documentRef || `POL-${String(p.id).padStart(3, '0')}`}</span>
                      <Badge variant="outline" className="ml-1.5 text-[9px] font-bold">
                        {p.version || 'v1.0'}
                      </Badge>
                    </td>

                    <td className="p-3.5 max-w-xs">
                      <div className="font-bold text-foreground line-clamp-1">{p.title}</div>
                      <div className="text-[10px] text-muted-foreground line-clamp-1">
                        {p.description || 'No description provided.'}
                      </div>
                    </td>

                    <td className="p-3.5 font-semibold text-foreground whitespace-nowrap">
                      {p.category || 'Code of Conduct'}
                    </td>

                    <td className="p-3.5 whitespace-nowrap">
                      <Badge variant="secondary" className="text-[9px] font-bold uppercase">
                        {isGenderWise ? 'Gender-wise' : 'All Employees'}
                      </Badge>
                    </td>

                    <td className="p-3.5 whitespace-nowrap">
                      <span className="text-xs font-semibold capitalize text-foreground">
                        {isGenderWise ? genderVal.replace(/,/g, ', ') : 'All'}
                      </span>
                    </td>

                    <td className="p-3.5 whitespace-nowrap text-muted-foreground">
                      {p.effectiveDate ? new Date(p.effectiveDate).toLocaleDateString() : 'Immediate'}
                    </td>

                    <td className="p-3.5 whitespace-nowrap">
                      <PolicyStatusBadge status={p.status} />
                    </td>

                    <td className="p-3.5 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setSelectedReaderPolicy(p)}
                        title="Read Policy Document"
                        className="h-7 w-7 text-muted-foreground hover:text-primary"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Button>

                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => navigate(`/policies/edit/${p.id}`)}
                        title="Edit Policy"
                        className="h-7 w-7 text-muted-foreground hover:text-primary"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </Button>

                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleOpenVersionHistory(p)}
                        title="Version History"
                        className="h-7 w-7 text-muted-foreground hover:text-primary"
                      >
                        <History className="w-3.5 h-3.5" />
                      </Button>

                      {p.status !== 'archived' && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleArchivePolicy(p.id)}
                          title="Archive Policy"
                          className="h-7 w-7 text-slate-400 hover:text-rose-600"
                        >
                          <Archive className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            </tbody>
          </table>
        </div>
      )}

      {/* Reader Modal */}
      {selectedReaderPolicy && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="max-w-4xl w-full">
            <PolicyReader
              policy={selectedReaderPolicy}
              canManage={true}
              onEdit={(p) => {
                setSelectedReaderPolicy(null);
                navigate(`/policies/edit/${p.id}`);
              }}
              onViewVersionHistory={(p) => {
                setSelectedReaderPolicy(null);
                handleOpenVersionHistory(p);
              }}
              onClose={() => setSelectedReaderPolicy(null)}
            />
          </div>
        </div>
      )}

      {/* Version History Modal */}
      {versionHistoryPolicy && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-card text-foreground border border-border rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-5">
            <div className="flex items-start justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <History className="w-4 h-4 text-primary" /> Version History
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  {versionHistoryPolicy.title} ({versionHistoryPolicy.documentRef})
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setVersionHistoryPolicy(null)} className="h-7 w-7">
                <X className="w-4 h-4" />
              </Button>
            </div>

            {loadingVersions ? (
              <div className="py-8 text-center text-xs text-muted-foreground">Loading version snapshots...</div>
            ) : versionsList.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground">No historical versions recorded yet.</div>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {versionsList.map((ver) => (
                  <div key={ver.id} className="border border-border/80 rounded-xl p-3 bg-muted/20 space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-primary font-mono">{ver.versionNumber}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {ver.createdAt ? new Date(ver.createdAt).toLocaleString() : ''}
                      </span>
                    </div>
                    <div className="font-bold text-foreground">{ver.title}</div>
                    <p className="text-[11px] text-muted-foreground">{ver.changeDescription || 'Standard policy version update.'}</p>
                    <div className="text-[10px] text-muted-foreground pt-1">
                      Updated By: <strong>{ver.updatedBy}</strong>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
