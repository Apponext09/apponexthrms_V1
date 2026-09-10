import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  FileSpreadsheet,
  Settings2,
  MoreVertical,
  CheckCircle2,
  XCircle,
  Boxes,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  masterBuilderApi,
  CustomMasterDetail,
  DynamicRecordItem,
  ChoiceListItem,
} from '../api/masterBuilderApi';

interface DynamicMasterViewProps {
  masterIdOrCode: number | string;
  onManageFields?: () => void;
}

export function DynamicMasterView({ masterIdOrCode, onManageFields }: DynamicMasterViewProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [master, setMaster] = useState<CustomMasterDetail | null>(null);
  const [records, setRecords] = useState<DynamicRecordItem[]>([]);
  const [choiceLists, setChoiceLists] = useState<ChoiceListItem[]>([]);
  const [lookupRecordsMap, setLookupRecordsMap] = useState<Record<number, DynamicRecordItem[]>>({});

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Active' | 'all' | 'Inactive'>('all');
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Add / Edit Modal
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<DynamicRecordItem | null>(null);
  const [recordCode, setRecordCode] = useState('');
  const [recordStatus, setRecordStatus] = useState<'Active' | 'Inactive'>('Active');
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const loadMasterAndRecords = async () => {
    setLoading(true);
    try {
      let resolvedMasterId: number | null = null;
      if (typeof masterIdOrCode === 'number') {
        resolvedMasterId = masterIdOrCode;
      } else {
        // Resolve code to master id
        const mastersList = await masterBuilderApi.getMasters();
        const found = mastersList.find((m) => m.code === masterIdOrCode || String(m.id) === masterIdOrCode);
        if (found) {
          resolvedMasterId = found.id;
        }
      }

      if (resolvedMasterId) {
        const [mDetail, cLists, recRes] = await Promise.all([
          masterBuilderApi.getMasterById(resolvedMasterId),
          masterBuilderApi.getChoiceLists(),
          masterBuilderApi.getRecords(resolvedMasterId, { limit: 100 }),
        ]);
        setMaster(mDetail);
        setChoiceLists(cLists);
        setRecords(recRes.records || []);

        // Load lookup records if master has lookup fields
        const lookupFields = (mDetail?.fields || []).filter(
          (f: any) => (f.fieldType || f.field_type) === 'lookup' && (f.lookupMasterId || f.lookup_master_id)
        );
        if (lookupFields.length > 0) {
          const map: Record<number, DynamicRecordItem[]> = {};
          await Promise.all(
            lookupFields.map(async (lf: any) => {
              const targetId = lf.lookupMasterId || lf.lookup_master_id;
              if (targetId) {
                try {
                  const res = await masterBuilderApi.getRecords(targetId, { limit: 100 });
                  map[targetId] = res.records || [];
                } catch (e) {}
              }
            })
          );
          setLookupRecordsMap(map);
        }
      }
    } catch (err) {
      console.error('Failed to load dynamic master records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMasterAndRecords();

    const handleCustomMastersUpdated = () => {
      loadMasterAndRecords();
    };

    window.addEventListener('custom_masters_updated', handleCustomMastersUpdated);
    return () => {
      window.removeEventListener('custom_masters_updated', handleCustomMastersUpdated);
    };
  }, [masterIdOrCode]);

  // Display columns from master fields
  const displayColumns = useMemo(() => {
    if (!master?.fields) return [];
    return master.fields.filter((f) => f.showInTable && f.isActive);
  }, [master?.fields]);

  const filteredRecords = useMemo(() => {
    let list = records;
    if (statusFilter !== 'all') {
      list = list.filter((r) => r.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((r) => {
        if (r.recordCode?.toLowerCase().includes(q)) return true;
        const vals = Object.values(r.data || {}).map((v) => String(v || '').toLowerCase());
        return vals.some((v) => v.includes(q));
      });
    }
    return list;
  }, [records, statusFilter, searchQuery]);

  const totalPages = Math.ceil(filteredRecords.length / rowsPerPage) || 1;
  const paginatedRecords = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return filteredRecords.slice(start, start + rowsPerPage);
  }, [filteredRecords, page, rowsPerPage]);

  const handleOpenRecordModal = (rec?: DynamicRecordItem) => {
    setFormErrors([]);
    if (rec) {
      setEditingRecord(rec);
      setRecordCode(rec.recordCode || '');
      setRecordStatus(rec.status);
      setFormData({ ...(rec.data || {}) });
    } else {
      setEditingRecord(null);
      setRecordCode(
        `${(master?.code || 'MST').substring(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`
      );
      setRecordStatus('Active');
      const initial: Record<string, any> = {};
      master?.fields?.forEach((f) => {
        const key = f.fieldKey || (f as any).field_key;
        initial[key] = f.defaultValue || (f.fieldType === 'boolean' ? false : '');
      });
      setFormData(initial);
    }
    setIsRecordModalOpen(true);
  };

  const handleFieldChange = (key: string, value: any, field?: any) => {
    setFormData((prev) => {
      const next = {
        ...prev,
        [key]: value,
      };

      // Check if this field triggers any autofill mappings
      if (field && (field.fieldType || field.field_type) === 'lookup') {
        const lookupMasterId = field.lookupMasterId || field.lookup_master_id;
        const lookupRecords = lookupRecordsMap[lookupMasterId] || [];
        const selectedRec = lookupRecords.find(
          (r) => r.recordCode === value || String(r.id) === String(value) || r.data?.name === value || (r.data && Object.values(r.data).includes(value))
        );

        if (selectedRec && master?.autofillMappings?.length) {
          master.autofillMappings.forEach((af) => {
            if (af.isActive && af.lookupFieldKey === key) {
              const sourceVal = selectedRec.data?.[af.sourceFieldKey] ?? (selectedRec as any)[af.sourceFieldKey];
              if (sourceVal !== undefined && sourceVal !== null) {
                next[af.targetFieldKey] = sourceVal;
              }
            }
          });
        }
      }

      return next;
    });
  };

  const handleSaveRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!master) return;
    setSaving(true);
    setFormErrors([]);

    // Client-side required checks
    const errors: string[] = [];
    master.fields?.forEach((f) => {
      const val = formData[f.fieldKey];
      if (f.isRequired && (val === undefined || val === null || val === '')) {
        errors.push(`${f.fieldName} is required.`);
      }
    });

    if (errors.length > 0) {
      setFormErrors(errors);
      setSaving(false);
      return;
    }

    try {
      if (editingRecord) {
        await masterBuilderApi.updateRecord(master.id, editingRecord.id, {
          recordCode,
          status: recordStatus,
          data: formData,
        });
      } else {
        await masterBuilderApi.createRecord(master.id, {
          recordCode,
          status: recordStatus,
          data: formData,
        });
      }
      setIsRecordModalOpen(false);
      loadMasterAndRecords();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.response?.data?.error || err.message || 'Validation error';
      setFormErrors(Array.isArray(msg) ? msg : [msg]);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRecord = async (recordId: number) => {
    if (!master) return;
    if (window.confirm('Delete this record?')) {
      try {
        await masterBuilderApi.deleteRecord(master.id, recordId);
        loadMasterAndRecords();
      } catch (err) {
        alert('Failed to delete record');
      }
    }
  };

  const handleExportCSV = () => {
    if (!master || filteredRecords.length === 0) return;
    const colKeys = displayColumns.map((c) => c.fieldKey);
    const headers = ['Code', ...displayColumns.map((c) => c.fieldName), 'Status', 'Created At'];
    const rows = filteredRecords.map((r) => [
      r.recordCode || '',
      ...colKeys.map((k) => `"${String(r.data?.[k] || '').replace(/"/g, '""')}"`),
      r.status,
      r.createdAt?.split('T')[0] || '',
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${master.code}_records_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading || !master) {
    return (
      <div className="p-8 text-center text-muted-foreground flex items-center justify-center min-h-[300px]">
        <div className="space-y-2">
          <Boxes className="h-7 w-7 animate-spin text-primary mx-auto" />
          <p className="text-sm">Loading master records...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Boxes className="h-5 w-5 text-primary" />
              {master.name}
            </h2>
            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
              Custom Master
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {master.description || `Dynamic master entity with ${master.fields?.length || 0} fields`}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onManageFields ? onManageFields() : navigate(`/masters/builder/${master.id}`)}
            className="gap-1.5 text-xs h-9"
          >
            <Settings2 className="h-4 w-4" /> Manage Fields ({master.fields?.length || 0})
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={handleExportCSV}
            title="Export CSV"
            className="h-9 w-9 text-primary border-primary/20"
          >
            <FileSpreadsheet className="h-4 w-4" />
          </Button>

          <Button onClick={() => handleOpenRecordModal()} className="gap-2 h-9 text-xs font-semibold bg-primary">
            <Plus className="h-4 w-4" /> Add Record
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={`Search ${master.name}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="h-9 px-3 rounded-md border border-input bg-background text-foreground font-medium text-xs focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Dynamic Records Table */}
      <div className="border border-border rounded-xl bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border/80 bg-primary/5 text-xs uppercase tracking-wider text-muted-foreground font-bold">
                <th className="py-3 px-4 font-bold text-foreground/80">Code</th>
                {displayColumns.map((col: any) => (
                  <th key={col.id} className="py-3 px-4 font-bold text-foreground/80">
                    {col.fieldName || col.field_name}
                  </th>
                ))}
                <th className="py-3 px-4 font-bold text-foreground/80">Status</th>
                <th className="py-3 px-4 text-right font-bold text-foreground/80">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={displayColumns.length + 3} className="py-12 text-center text-muted-foreground text-sm">
                    No records found. Click "+ Add Record" to add your first record.
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((rec) => (
                  <tr key={rec.id} className="hover:bg-muted/40 transition-colors">
                    <td className="py-3 px-4 font-mono text-xs font-semibold text-primary">
                      {rec.recordCode || `REC-${rec.id}`}
                    </td>

                    {displayColumns.map((col: any) => {
                      const colKey = col.fieldKey || col.field_key;
                      const colType = col.fieldType || col.field_type;
                      const val = rec.data?.[colKey];
                      return (
                        <td key={col.id} className="py-3 px-4 text-foreground text-sm">
                          {colType === 'boolean' ? (
                            val ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            ) : (
                              <XCircle className="h-4 w-4 text-muted-foreground" />
                            )
                          ) : val !== undefined && val !== null && val !== '' ? (
                            String(val)
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </td>
                      );
                    })}

                    <td className="py-3 px-4">
                      <Badge
                        variant="secondary"
                        className={
                          rec.status === 'Active'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : 'bg-muted text-muted-foreground'
                        }
                      >
                        {rec.status}
                      </Badge>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenRecordModal(rec)}>
                            <Edit2 className="h-4 w-4 mr-2" /> Edit Record
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteRecord(rec.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" /> Delete Record
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 border-t border-border bg-card text-xs text-muted-foreground gap-3">
          <div className="flex items-center gap-2">
            <span>Rows per page</span>
            <select
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setPage(1);
              }}
              className="h-8 px-2 rounded border border-input bg-background text-foreground focus:outline-none"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span>
              {filteredRecords.length > 0
                ? `${(page - 1) * rowsPerPage + 1}-${Math.min(page * rowsPerPage, filteredRecords.length)} of ${filteredRecords.length}`
                : '0 of 0'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="h-8 px-2 gap-1 text-xs"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Previous
            </Button>
            <span className="font-semibold text-primary px-2">{page}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="h-8 px-2 gap-1 text-xs"
            >
              Next <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Dynamic Add / Edit Record Modal */}
      <Dialog open={isRecordModalOpen} onOpenChange={setIsRecordModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRecord ? `Edit ${master.name} Record` : `Add New ${master.name} Record`}
            </DialogTitle>
          </DialogHeader>

          {formErrors.length > 0 && (
            <div className="p-3.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs space-y-1">
              {formErrors.map((err, i) => (
                <div key={i} className="flex items-center gap-2">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{err}</span>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleSaveRecord} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-3 border-b border-border">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Record Code</label>
                <Input
                  value={recordCode}
                  onChange={(e) => setRecordCode(e.target.value)}
                  placeholder="e.g. REC-101"
                  className="font-mono text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Status</label>
                <select
                  value={recordStatus}
                  onChange={(e) => setRecordStatus(e.target.value as any)}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>

            {/* Dynamic fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {master.fields?.filter((f: any) => f.isActive !== false).map((field: any) => {
                const fieldName = field.fieldName || field.field_name || 'Field';
                const fieldKey = field.fieldKey || field.field_key || '';
                const fieldType = field.fieldType || field.field_type || 'text';
                const isRequired = Boolean(field.isRequired ?? field.is_required);
                const helpText = field.helpText || field.help_text;
                const placeholder = field.placeholder;
                const choiceListId = field.choiceListId || field.choice_list_id;

                const val = formData[fieldKey] ?? '';
                const choiceList = choiceLists.find((cl) => cl.id === choiceListId);

                return (
                  <div
                    key={field.id}
                    className={`space-y-1.5 ${fieldType === 'textarea' ? 'sm:col-span-2' : ''}`}
                  >
                    <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        {fieldName}
                        {isRequired && <span className="text-destructive">*</span>}
                      </span>
                      {helpText && (
                        <span className="text-[11px] text-muted-foreground font-normal" title={helpText}>
                          {helpText}
                        </span>
                      )}
                    </label>

                    {fieldType === 'choice' && choiceList ? (
                      <select
                        value={val}
                        onChange={(e) => handleFieldChange(fieldKey, e.target.value, field)}
                        required={isRequired}
                        className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="">-- Select {fieldName} --</option>
                        {choiceList.options?.map((opt, i) => (
                          <option key={i} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    ) : fieldType === 'lookup' ? (
                      <select
                        value={val}
                        onChange={(e) => handleFieldChange(fieldKey, e.target.value, field)}
                        required={isRequired}
                        className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="">-- Select {fieldName} --</option>
                        {(() => {
                          const lookupId = Number(field.lookupMasterId || field.lookup_master_id);
                          const lRecords: DynamicRecordItem[] = (lookupId && lookupRecordsMap[lookupId]) || [];
                          return lRecords.map((lr: DynamicRecordItem) => {
                            const label = lr.data?.name || lr.data?.title || lr.recordCode || `Record #${lr.id}`;
                            return (
                              <option key={lr.id} value={label}>
                                {label} {lr.recordCode ? `(${lr.recordCode})` : ''}
                              </option>
                            );
                          });
                        })()}
                      </select>
                    ) : fieldType === 'textarea' ? (
                      <textarea
                        value={val}
                        onChange={(e) => handleFieldChange(fieldKey, e.target.value, field)}
                        placeholder={placeholder || `Enter ${fieldName}`}
                        required={isRequired}
                        rows={3}
                        className="w-full p-2.5 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                      />
                    ) : fieldType === 'boolean' ? (
                      <div className="flex items-center gap-2 pt-2">
                        <input
                          type="checkbox"
                          checked={Boolean(val)}
                          onChange={(e) => handleFieldChange(fieldKey, e.target.checked, field)}
                          className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                        />
                        <span className="text-xs text-foreground font-medium">Enable {fieldName}</span>
                      </div>
                    ) : (
                      <Input
                        type={
                          fieldType === 'number'
                            ? 'number'
                            : fieldType === 'email'
                            ? 'email'
                            : fieldType === 'date'
                            ? 'date'
                            : fieldType === 'phone'
                            ? 'tel'
                            : 'text'
                        }
                        value={val}
                        onChange={(e) => handleFieldChange(fieldKey, e.target.value, field)}
                        placeholder={placeholder || `Enter ${fieldName}`}
                        required={isRequired}
                        className="h-10 text-sm"
                      />
                    )}
                  </div>
                );
              })}
            </div>

            <DialogFooter className="pt-4 border-t border-border">
              <Button type="button" variant="outline" onClick={() => setIsRecordModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="bg-primary hover:bg-primary/90">
                {saving ? 'Saving...' : editingRecord ? 'Update Record' : 'Create Record'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default DynamicMasterView;
