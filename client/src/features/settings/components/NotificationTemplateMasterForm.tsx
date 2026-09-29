import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Bell, Plus, Search, Check, X, Trash2,
  AlertCircle, Code2, Flag, FileText, Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { showToast } from '@/components/ui/toast';
import { apiClient } from '@/lib/api';
import { useCompanyStore } from '@/features/settings/store/companyStore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { TipTapRichTextEditor } from './TipTapRichTextEditor';

// ─── Interfaces ──────────────────────────────────────────────────────────────
export interface NotificationTemplateRecord {
  id: string | number;
  templateName?: string;
  template_name?: string;
  subject?: string;
  emailNotification?: string;
  email_notification?: string;
  isActive?: 'Yes' | 'No';
  is_active?: 'Yes' | 'No';
  createdAt?: string;
  created_at?: string;
}

// Fallback static merge code options if no DB merge codes are available
const MERGE_CODE_OPTIONS = [
  { value: '{{employee_name}}', label: '{{employee_name}} - Employee Full Name' },
  { value: '{{employee_code}}', label: '{{employee_code}} - Employee ID / Code' },
  { value: '{{department_name}}', label: '{{department_name}} - Department Name' },
  { value: '{{designation_name}}', label: '{{designation_name}} - Designation Name' },
  { value: '{{company_name}}', label: '{{company_name}} - Company Name' },
  { value: '{{manager_name}}', label: '{{manager_name}} - Reporting Manager Name' },
  { value: '{{workhour_date}}', label: '{{workhour_date}} - Workhour Application Date' },
  { value: '{{leave_type}}', label: '{{leave_type}} - Leave Type' },
  { value: '{{start_date}}', label: '{{start_date}} - Start Date / Effective Date' },
  { value: '{{end_date}}', label: '{{end_date}} - End Date / Expiry Date' },
  { value: '{{status}}', label: '{{status}} - Application Status' },
  { value: '{{reason}}', label: '{{reason}} - Application / Request Reason' },
  { value: '{{action_url}}', label: '{{action_url}} - Portal Direct Action Link' },
];

interface NotificationTemplateMasterFormProps {
  onCancel?: () => void;
  onSave?: (data: NotificationTemplateRecord) => void;
}

export function NotificationTemplateMasterForm({ onCancel, onSave }: NotificationTemplateMasterFormProps) {
  const { selectedCompanyId } = useCompanyStore();
  const [templates, setTemplates] = useState<NotificationTemplateRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | number>('');
  const [isNewMode, setIsNewMode] = useState<boolean>(true);

  // Form State
  const [templateName, setTemplateName] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [emailNotification, setEmailNotification] = useState<string>('');
  const [isActive, setIsActive] = useState<'Yes' | 'No'>('Yes');

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('All');

  // Merge Code Modal State
  const [isMergeModalOpen, setIsMergeModalOpen] = useState<boolean>(false);
  const [mergeTargetField, setMergeTargetField] = useState<'subject' | 'email'>('email');
  const [selectedMergeCode, setSelectedMergeCode] = useState<string>('');
  const [dbMergeCodes, setDbMergeCodes] = useState<any[]>([]);

  const subjectInputRef = useRef<HTMLInputElement>(null);

  // ─── Fetch Templates from API ─────────────────────────────────────────────
  const fetchTemplates = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const res = await apiClient.get('/settings/notification-templates?pageSize=100');
      const items: NotificationTemplateRecord[] = res.data?.data || [];
      setTemplates(items);
    } catch (err: any) {
      setLoadError(err?.response?.data?.message || 'Failed to load notification templates.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, [selectedCompanyId]);

  // Fetch live stored merge codes from API
  const fetchMergeCodes = async () => {
    try {
      const res = await apiClient.get('/settings/merge-codes?pageSize=200');
      const items = res.data?.data || [];
      setDbMergeCodes(items);
    } catch {
      /* fallback */
    }
  };

  useEffect(() => {
    fetchMergeCodes();
  }, [selectedCompanyId]);

  // Group stored merge codes by Module Name (e.g. Employee, Workhour, Leave, etc.)
  // STRICTLY only include active merge codes (is_active === 'Yes')
  const groupedMergeCodes = useMemo(() => {
    const map: Record<string, Array<{ id: string | number; subModule: string; code: string; desc: string }>> = {};

    if (dbMergeCodes.length > 0) {
      dbMergeCodes.forEach((item: any) => {
        const rawActive = item.isActive !== undefined ? item.isActive : (item.is_active !== undefined ? item.is_active : 'Yes');
        const isItemActive = rawActive === 'Yes' || rawActive === 'yes' || rawActive === true || rawActive === 1 || rawActive === '1';

        // Skip any inactive merge codes so they NEVER appear in the Choose Fields dropdown
        if (!isItemActive) return;

        const mod = (item.moduleName || item.module_name || 'General').trim();
        const subMod = (item.subModuleName || item.sub_module_name || '').trim();
        const desc = (item.description || '').trim();
        const tag = item.mergeCode || item.merge_code || `{{${(mod + '_' + subMod).toLowerCase().replace(/\s+/g, '_')}}}`;

        if (!map[mod]) map[mod] = [];
        map[mod].push({
          id: item.id,
          subModule: subMod || mod,
          code: tag.startsWith('{{') ? tag : `{{${tag}}}`,
          desc,
        });
      });
    }
    return map;
  }, [dbMergeCodes]);

  const selectedRecord = useMemo(() => {
    return templates.find((t) => t.id === selectedId) || null;
  }, [templates, selectedId]);

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const getTemplateName = (item: NotificationTemplateRecord) =>
    item.templateName || item.template_name || '';
  const getEmailNotification = (item: NotificationTemplateRecord) =>
    item.emailNotification || item.email_notification || '';
  const getIsActive = (item: NotificationTemplateRecord): 'Yes' | 'No' =>
    (item.isActive || item.is_active || 'Yes') as 'Yes' | 'No';

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleAddNewClick = () => {
    setIsNewMode(true);
    setSelectedId('');
    setTemplateName('');
    setSubject('');
    setEmailNotification('');
    setIsActive('Yes');
  };

  const handleSelectRecord = (item: NotificationTemplateRecord) => {
    setIsNewMode(false);
    setSelectedId(item.id);
    setTemplateName(getTemplateName(item));
    setSubject(item.subject || '');
    setEmailNotification(getEmailNotification(item));
    setIsActive(getIsActive(item));
  };

  const handleReset = () => {
    if (isNewMode) {
      handleAddNewClick();
    } else if (selectedRecord) {
      handleSelectRecord(selectedRecord);
    }
    showToast.info('Form Reset', 'Form fields restored.');
  };

  // Open Merge Codes Modal & fetch fresh data
  const openMergeCodeModal = (target: 'subject' | 'email') => {
    setMergeTargetField(target);
    setSelectedMergeCode('');
    fetchMergeCodes();
    setIsMergeModalOpen(true);
  };

  // Confirm Merge Code insertion
  const handleInsertMergeCode = () => {
    if (!selectedMergeCode) {
      showToast.error('Selection Error', 'Please select a merge code tag.');
      return;
    }

    if (mergeTargetField === 'subject') {
      setSubject((prev) => (prev ? `${prev} ${selectedMergeCode}` : selectedMergeCode));
    } else {
      setEmailNotification((prev) => `${prev || ''} ${selectedMergeCode}`);
    }

    showToast.success('Merge Code Added', `Inserted ${selectedMergeCode} into ${mergeTargetField === 'subject' ? 'Subject' : 'Email Notification'}.`);
    setIsMergeModalOpen(false);
  };

  // ─── Submit (Create or Update) ────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!templateName.trim()) {
      showToast.error('Validation Error', 'Template Name is required.');
      return;
    }
    if (!subject.trim()) {
      showToast.error('Validation Error', 'Subject is required.');
      return;
    }
    if (!emailNotification.trim() || emailNotification.trim() === '<p></p>') {
      showToast.error('Validation Error', 'Email Notification content is required.');
      return;
    }

    const payload = {
      template_name: templateName.trim(),
      subject: subject.trim(),
      email_notification: emailNotification.trim(),
      is_active: isActive,
    };

    try {
      setSaving(true);
      let savedItem: NotificationTemplateRecord;

      if (isNewMode) {
        const res = await apiClient.post('/settings/notification-templates', payload);
        savedItem = res.data?.data;
        setTemplates((prev) => [savedItem, ...prev]);
        setIsNewMode(false);
        setSelectedId(savedItem.id);
        showToast.success('Template Added', `Notification template "${templateName}" created.`);
      } else {
        const res = await apiClient.patch(`/settings/notification-templates/${selectedId}`, payload);
        savedItem = res.data?.data;
        setTemplates((prev) => prev.map((item) => (item.id === savedItem.id ? savedItem : item)));
        showToast.success('Template Updated', `Notification template "${templateName}" updated.`);
      }

      if (onSave) onSave(savedItem);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to save notification template.';
      showToast.error('Save Failed', msg);
    } finally {
      setSaving(false);
    }
  };

  // ─── Delete ───────────────────────────────────────────────────────────────
  const handleDelete = async (id: string | number, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiClient.delete(`/settings/notification-templates/${id}`);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      if (selectedId === id) {
        handleAddNewClick();
      }
      showToast.info('Template Deleted', `Template "${name}" removed.`);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to delete notification template.';
      showToast.error('Delete Failed', msg);
    }
  };

  // ─── Filtered Templates List ──────────────────────────────────────────────
  const filteredTemplates = useMemo(() => {
    return templates.filter((t) => {
      const activeVal = getIsActive(t);
      if (statusFilter === 'Active' && activeVal !== 'Yes') return false;
      if (statusFilter === 'Inactive' && activeVal !== 'No') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const name = getTemplateName(t);
        const subj = t.subject || '';
        const plainTextEmail = getEmailNotification(t).replace(/<[^>]*>/g, ' ');
        return (
          name.toLowerCase().includes(q) ||
          subj.toLowerCase().includes(q) ||
          plainTextEmail.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [templates, statusFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Top Section / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-foreground">Notification Templates</h2>
            
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Configure automated email & in-app notification templates with dynamic merge tags.
          </p>
        </div>

        <Button
          type="button"
          onClick={handleAddNewClick}
          size="sm"
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold gap-1.5 shadow-xs cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>New Notification Template</span>
        </Button>
      </div>

      {/* Main 2-Column Swapped Layout: Left = Form, Right = Templates Directory List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* ── LEFT COLUMN: Add / Edit Notification Template Form (7 Cols) ─────── */}
        <div className="lg:col-span-7 bg-card border border-border rounded-2xl p-5 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Plus className="h-4 w-4 text-primary" />
              <span>{isNewMode ? 'Add Notification Template' : 'Edit Notification Template'}</span>
            </h3>
            {!isNewMode && (
              <Badge variant="secondary" className="text-[10px] font-semibold">
                ID: #{selectedId}
              </Badge>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Template Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                <span>Template Name</span>
                <span className="text-rose-500">*</span>
              </label>
              <Input
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                disabled={saving}
                placeholder="e.g. Workhour Application"
                className="h-10 text-xs border-input rounded-xl focus:ring-2 focus:ring-primary/20 bg-background"
                required
              />
            </div>

            {/* Subject */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                <span>Subject</span>
                <span className="text-rose-500">*</span>
              </label>
              <Input
                ref={subjectInputRef}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                disabled={saving}
                placeholder="e.g. Workhour Application Submitted by {{employee_name}}"
                className="h-10 text-xs border-input rounded-xl focus:ring-2 focus:ring-primary/20 bg-background font-medium"
                required
              />
              <div className="flex items-center justify-between text-[11px] pt-0.5">
                <button
                  type="button"
                  onClick={() => openMergeCodeModal('subject')}
                  className="text-primary hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Code2 className="h-3.5 w-3.5" />
                  <span>Choose Merge Codes</span>
                </button>
                <span className="text-muted-foreground italic text-[10px]">
                  Insert dynamic merge tags into subject
                </span>
              </div>
            </div>

            {/* Email Notification (TipTap Rich Text Editor) */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                <span>Email Notification</span>
                <span className="text-rose-500">*</span>
              </label>
              <TipTapRichTextEditor
                content={emailNotification}
                onChange={(html) => setEmailNotification(html)}
              />
              <div className="pt-0.5">
                <button
                  type="button"
                  onClick={() => openMergeCodeModal('email')}
                  className="text-primary hover:underline text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Code2 className="h-3.5 w-3.5" />
                  <span>Choose Merge Codes</span>
                </button>
              </div>
            </div>

            {/* Active Toggle Switch */}
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-semibold text-foreground block">Active</label>
              <div className="flex items-center gap-2 max-w-[160px]">
                <button
                  type="button"
                  onClick={() => setIsActive('Yes')}
                  disabled={saving}
                  className={cn(
                    'flex-1 h-9 text-xs font-bold rounded-xl border transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50',
                    isActive === 'Yes'
                      ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                      : 'bg-background text-muted-foreground border-border hover:bg-accent/50'
                  )}
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>Yes</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsActive('No')}
                  disabled={saving}
                  className={cn(
                    'flex-1 h-9 text-xs font-bold rounded-xl border transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50',
                    isActive === 'No'
                      ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                      : 'bg-background text-muted-foreground border-border hover:bg-accent/50'
                  )}
                >
                  <X className="h-3.5 w-3.5" />
                  <span>No</span>
                </button>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex items-center gap-3 pt-4 border-t border-border">
              <Button
                type="submit"
                disabled={saving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold h-10 px-6 rounded-xl text-xs gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                <span>{isNewMode ? 'Add Template' : 'Update Template'}</span>
              </Button>

              <Button
                type="button"
                variant="destructive"
                onClick={handleReset}
                disabled={saving}
                className="bg-rose-600 hover:bg-rose-700 text-white font-semibold h-10 px-5 rounded-xl text-xs gap-1.5 cursor-pointer ml-auto disabled:opacity-50"
              >
                <X className="h-4 w-4" />
                <span>Cancel</span>
              </Button>
            </div>
          </form>
        </div>

        {/* ── RIGHT COLUMN: Notification Templates Directory List (5 Cols) ─────── */}
        <div className="lg:col-span-5 space-y-4">

          {/* Filter & Search Header */}
          <div className="bg-card border border-border rounded-2xl p-4 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search template name, subject..."
                  className="pl-9 h-9 text-xs border-input rounded-xl bg-background"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <select
                value={statusFilter}
                onChange={(e: any) => setStatusFilter(e.target.value)}
                className="h-9 text-xs px-2.5 border border-input rounded-xl bg-background text-foreground font-semibold cursor-pointer focus:outline-none"
              >
                <option value="All">All</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            {/* Title Bar */}
            <div className="flex items-center justify-between pt-1 border-t border-border/60">
              <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                <FileText className="h-4 w-4 text-primary" />
                <span>Notification Templates</span>
              </div>
              <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[11px] font-bold px-2 py-0.5 rounded-full">
                {filteredTemplates.length}
              </Badge>
            </div>
          </div>

          {/* Templates Card Stack */}
          <div className="space-y-2.5 max-h-[640px] overflow-y-auto pr-1">
            {/* Loading */}
            {loading && (
              <div className="p-8 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="text-xs font-medium">Loading notification templates...</p>
              </div>
            )}

            {/* Error */}
            {!loading && loadError && (
              <div className="p-5 rounded-2xl border border-rose-500/20 bg-rose-500/5 flex items-start gap-3">
                <AlertCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-rose-600">Failed to load templates</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{loadError}</p>
                  <button
                    onClick={fetchTemplates}
                    className="text-[11px] text-primary font-semibold mt-1 hover:underline cursor-pointer"
                  >
                    Retry
                  </button>
                </div>
              </div>
            )}

            {/* Empty State */}
            {!loading && !loadError && filteredTemplates.length === 0 && (
              <div className="bg-card border border-border rounded-2xl p-8 text-center space-y-2">
                <Bell className="h-8 w-8 text-muted-foreground mx-auto opacity-40" />
                <p className="text-xs font-semibold text-foreground">No notification templates found.</p>
                <p className="text-[11px] text-muted-foreground">Try adjusting filters or add a new template.</p>
              </div>
            )}

            {/* Template Cards */}
            {!loading && !loadError && filteredTemplates.map((item) => {
              const isSelected = selectedId === item.id;
              const activeStatus = getIsActive(item);
              const name = getTemplateName(item);

              return (
                <div
                  key={item.id}
                  onClick={() => handleSelectRecord(item)}
                  className={cn(
                    'p-3.5 rounded-2xl border transition-all cursor-pointer group space-y-1.5 relative shadow-2xs',
                    isSelected
                      ? 'bg-primary text-primary-foreground border-primary shadow-md font-medium'
                      : 'bg-card border-border/80 hover:border-primary/50 hover:bg-accent/40 text-foreground'
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Flag className={cn('h-4 w-4 shrink-0', isSelected ? 'text-primary-foreground' : 'text-primary')} />
                      <h4 className="text-xs font-bold truncate leading-tight">
                        {name}
                      </h4>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={cn(
                        'text-[10px] font-bold px-2.5 py-0.5 rounded-full border transition-colors',
                        isSelected
                          ? 'bg-background/20 text-white border-white/30'
                          : activeStatus === 'Yes'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                      )}>
                        {activeStatus === 'Yes' ? 'Active' : 'Inactive'}
                      </span>

                      <button
                        type="button"
                        onClick={(e) => handleDelete(item.id, name, e)}
                        title="Delete Template"
                        className={cn(
                          'p-1.5 rounded-lg transition-colors cursor-pointer',
                          isSelected
                            ? 'text-primary-foreground/80 hover:text-white hover:bg-background/10'
                            : 'text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                        )}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Subject preview */}
                  {item.subject && (
                    <p className={cn(
                      'text-[11px] leading-snug line-clamp-1 pl-6',
                      isSelected ? 'text-white/80' : 'text-muted-foreground'
                    )}>
                      {item.subject}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* ─── POPUP MODAL: Select a Merge Code (Image 2 exact match) ──────────── */}
      <Dialog open={isMergeModalOpen} onOpenChange={setIsMergeModalOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border p-0 rounded-2xl shadow-xl overflow-hidden">
          {/* Header Bar matching image ("Choose Fields" blue header) */}
          <div className="bg-primary px-5 py-3 text-primary-foreground flex items-center justify-between">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <Code2 className="h-4 w-4" />
              <span>Choose Fields</span>
            </h3>
            <button
              type="button"
              onClick={() => setIsMergeModalOpen(false)}
              className="text-primary-foreground/80 hover:text-primary-foreground transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-5 space-y-4">
            {/* Quick Select Dropdown with Optgroups */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground block">
                Select Field
              </label>
              <select
                value={selectedMergeCode}
                onChange={(e) => setSelectedMergeCode(e.target.value)}
                className="w-full h-10 px-3 text-xs border border-input rounded-xl bg-background text-foreground font-semibold cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Choose Fields</option>
                {Object.entries(groupedMergeCodes).map(([modName, items]) => (
                  <optgroup key={modName} label={modName} className="font-bold text-foreground bg-muted/40">
                    {items.map((item) => (
                      <option key={item.id} value={item.code} className="font-normal text-foreground">
                        {item.subModule}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {/* Tag preview */}
            {selectedMergeCode && (
              <div className="p-3 bg-primary/5 rounded-xl border border-primary/20 text-xs flex items-center justify-between">
                <span className="text-muted-foreground font-medium">Selected tag:</span>
                <code className="bg-primary text-primary-foreground font-mono font-bold px-2.5 py-0.5 rounded text-xs">
                  {selectedMergeCode}
                </code>
              </div>
            )}
          </div>

          <DialogFooter className="flex items-center justify-end gap-3 px-5 py-3 border-t border-border bg-muted/10">
            <Button
              type="button"
              variant="destructive"
              onClick={() => setIsMergeModalOpen(false)}
              className="bg-rose-600 hover:bg-rose-700 text-white font-semibold h-9 px-4 rounded-xl text-xs cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleInsertMergeCode}
              disabled={!selectedMergeCode}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-9 px-5 rounded-xl text-xs cursor-pointer disabled:opacity-50"
            >
              Choose
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
