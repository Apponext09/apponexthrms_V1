import { useState } from 'react';
import { Plus, Search, GitBranch, Pencil, Trash2, ToggleLeft, ToggleRight, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { WorkflowSettingsDrawer } from '../components/settings/WorkflowSettingsDrawer';
import { useWorkflowSettings, WORKFLOW_TYPES } from '../hooks/useWorkflowSettings';
import type { WorkflowSetting } from '../hooks/useWorkflowSettings';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

export function WorkflowSettingsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<WorkflowSetting | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WorkflowSetting | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { listQuery, deleteMutation, fetchSetting } = useWorkflowSettings({
    search: search || undefined,
    type: typeFilter || undefined,
  });

  const workflows: WorkflowSetting[] = ((listQuery.data as any)?.items ?? listQuery.data ?? []) as WorkflowSetting[];

  const handleEdit = async (wf: WorkflowSetting) => {
    try {
      const full = await fetchSetting(wf.id);
      setEditingWorkflow(full);
      setDrawerOpen(true);
    } catch {
      toast.error('Failed to load workflow');
    }
  };

  const handleNew = () => {
    setEditingWorkflow(null);
    setDrawerOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast.success('Workflow deleted');
      setDeleteTarget(null);
    } catch {
      toast.error('Failed to delete workflow');
    } finally {
      setDeleting(false);
    }
  };

  const handleSaved = () => {
    queryClient.invalidateQueries({ queryKey: ['workflow-settings'] });
  };

  const getTypeLabel = (type: string) =>
    WORKFLOW_TYPES.find(t => t.value === type)?.label ?? type?.replace(/_/g, ' ') ?? '—';

  return (
    <div className="p-6 space-y-5 min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <GitBranch size={18} className="text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight">Workflow Settings</h1>
            <p className="text-xs text-muted-foreground">Configure approval workflows for all HRMS modules</p>
          </div>
        </div>
        <Button size="sm" onClick={handleNew} className="gap-2">
          <Plus size={14} />
          New Workflow
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search workflows..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[200px] h-9">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Types</SelectItem>
            {WORKFLOW_TYPES.map(t => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border rounded-xl overflow-hidden bg-background shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Workflow Name</th>
              <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Type</th>
              <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Approval Mode</th>
              <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Status</th>
              <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Active</th>
              <th className="text-right text-xs font-semibold text-muted-foreground px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {listQuery.isLoading && (
              <tr>
                <td colSpan={6} className="text-center py-10">
                  <Loader2 size={20} className="animate-spin mx-auto text-muted-foreground" />
                </td>
              </tr>
            )}
            {!listQuery.isLoading && workflows.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-12 text-muted-foreground">
                  <GitBranch size={32} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No workflows configured yet.</p>
                  <Button size="sm" variant="outline" className="mt-3" onClick={handleNew}>
                    <Plus size={13} className="mr-1" /> Create your first workflow
                  </Button>
                </td>
              </tr>
            )}
            {workflows.map((wf) => (
              <tr key={wf.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <GitBranch size={14} className="text-muted-foreground flex-shrink-0" />
                    <span className="text-sm font-medium">{wf.workflow_name}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-muted-foreground">{getTypeLabel(wf.type)}</span>
                </td>
                <td className="px-4 py-3">
                  <Badge
                    variant="secondary"
                    className={`text-xs capitalize ${(wf as any).approval_type === 'auto' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}
                  >
                    {(wf as any).approval_type ?? 'manual'}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge
                    className={`text-xs ${
                      wf.status === 'published' ? 'bg-green-100 text-green-700'
                      : wf.status === 'archived' ? 'bg-gray-100 text-gray-500'
                      : 'bg-amber-100 text-amber-700'
                    }`}
                    variant="secondary"
                  >
                    {wf.status ?? 'draft'}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  {(wf.is_active === 1 || wf.is_active === true)
                    ? <ToggleRight size={20} className="text-green-500" />
                    : <ToggleLeft size={20} className="text-gray-400" />}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(wf)} title="Edit">
                      <Pencil size={13} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive" onClick={() => setDeleteTarget(wf)} title="Delete">
                      <Trash2 size={13} />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Drawer */}
      <WorkflowSettingsDrawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setEditingWorkflow(null); }}
        editingWorkflow={editingWorkflow}
        onSaved={handleSaved}
      />

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-destructive" />
              Delete Workflow?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <strong>{deleteTarget?.workflow_name}</strong>? This cannot be undone.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
