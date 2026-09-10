import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  Trash2,
  Settings2,
  CheckCircle2,
  XCircle,
  Boxes,
  HelpCircle,
  AlertCircle,
  Image as ImageIcon,
  FileUp,
  FileText,
  RotateCcw,
  Layers,
  ChevronRight,
  Database,
  ExternalLink,
  Phone,
  Mail,
  Building2,
  MapPin,
  Tag,
  FileCheck,
  ShieldCheck,
  Key,
  User,
  Users,
  Sliders,
  Globe,
  Briefcase,
  Award,
  Sparkles,
  LayoutGrid,
  LayoutList,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  masterBuilderApi,
  CustomMasterDetail,
  DynamicRecordItem,
  ChoiceListItem,
  DbLookupOption,
} from '../api/masterBuilderApi';

function detectSectionIcon(title: string): string {
  const t = (title || '').toLowerCase();
  if (t.includes('profile') || t.includes('company') || t.includes('identif') || t.includes('basic') || t.includes('org')) return 'building';
  if (t.includes('address') || t.includes('headquarter') || t.includes('location') || t.includes('branch')) return 'map-pin';
  if (t.includes('statutory') || t.includes('pan') || t.includes('tax') || t.includes('tin') || t.includes('legal') || t.includes('compliance')) return 'file-check';
  if (t.includes('brand') || t.includes('asset') || t.includes('media') || t.includes('logo') || t.includes('stamp') || t.includes('image')) return 'image';
  if (t.includes('status') || t.includes('system') || t.includes('control') || t.includes('setting')) return 'shield';
  if (t.includes('access') || t.includes('credential') || t.includes('security') || t.includes('auth') || t.includes('password') || t.includes('login')) return 'key';
  if (t.includes('contact') || t.includes('phone') || t.includes('communication') || t.includes('call')) return 'phone';
  if (t.includes('email') || t.includes('mail')) return 'mail';
  if (t.includes('user') || t.includes('member') || t.includes('employee') || t.includes('staff')) return 'user';
  return 'tag';
}

function renderSectionIcon(iconName?: string) {
  const icon = (iconName || '').toLowerCase();
  switch (icon) {
    case 'building':
    case 'building2':
      return <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />;
    case 'map-pin':
    case 'location':
      return <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />;
    case 'file-check':
    case 'statutory':
    case 'document':
      return <FileCheck className="h-3.5 w-3.5 text-primary shrink-0" />;
    case 'image':
    case 'media':
    case 'logo':
      return <ImageIcon className="h-3.5 w-3.5 text-primary shrink-0" />;
    case 'shield':
    case 'status':
      return <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />;
    case 'key':
    case 'credential':
    case 'lock':
      return <Key className="h-3.5 w-3.5 text-primary shrink-0" />;
    case 'phone':
    case 'contact':
      return <Phone className="h-3.5 w-3.5 text-primary shrink-0" />;
    case 'mail':
    case 'email':
      return <Mail className="h-3.5 w-3.5 text-primary shrink-0" />;
    case 'user':
    case 'users':
      return <User className="h-3.5 w-3.5 text-primary shrink-0" />;
    case 'sliders':
      return <Sliders className="h-3.5 w-3.5 text-primary shrink-0" />;
    case 'globe':
      return <Globe className="h-3.5 w-3.5 text-primary shrink-0" />;
    case 'briefcase':
      return <Briefcase className="h-3.5 w-3.5 text-primary shrink-0" />;
    case 'award':
      return <Award className="h-3.5 w-3.5 text-primary shrink-0" />;
    default:
      return <Tag className="h-3.5 w-3.5 text-primary shrink-0" />;
  }
}

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
  const [dbLookupOptionsMap, setDbLookupOptionsMap] = useState<Record<string, DbLookupOption[]>>({});

  // Split View Selection States
  const [isNewMode, setIsNewMode] = useState<boolean>(true);
  const [selectedRecordId, setSelectedRecordId] = useState<number | null>(null);

  // Form Fields State
  const [recordCode, setRecordCode] = useState('');
  const [recordStatus, setRecordStatus] = useState<'Active' | 'Inactive'>('Active');
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [searchField, setSearchField] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('All');

  const populateRecordData = (rec: DynamicRecordItem | null, m: CustomMasterDetail | null = master) => {
    if (!rec) return {};
    const recData = typeof rec.data === 'string' ? JSON.parse(rec.data) : (rec.data || {});
    const populated: Record<string, any> = { ...recData };

    // Build normalized map of recData for fast fuzzy matching
    const recKeyMap = new Map<string, any>();
    for (const [k, v] of Object.entries(recData)) {
      recKeyMap.set(k.toLowerCase(), v);
      recKeyMap.set(k.replace(/[-_]/g, '').toLowerCase(), v);
    }
    if (rec.recordCode !== undefined && rec.recordCode !== null) {
      recKeyMap.set('code', rec.recordCode);
      recKeyMap.set('record_code', rec.recordCode);
      recKeyMap.set('recordcode', rec.recordCode);
    }
    if (rec.status !== undefined && rec.status !== null) {
      recKeyMap.set('status', rec.status);
    }

    (m?.fields || []).forEach((f: any) => {
      const k1 = f.fieldKey || '';
      const k2 = f.field_key || '';
      const k3 = f.fieldName || '';
      const k4 = f.field_name || '';
      const colMap = f.columnMap || f.column_map || '';

      const searchKeys = [
        k1,
        k2,
        colMap,
        k3,
        k4,
        k1.toLowerCase(),
        k2.toLowerCase(),
        k1.replace(/[-_]/g, '').toLowerCase(),
        k2.replace(/[-_]/g, '').toLowerCase(),
        colMap.toLowerCase(),
        colMap.replace(/[-_]/g, '').toLowerCase(),
      ].filter(Boolean);

      let matched: any = undefined;
      for (const sk of searchKeys) {
        if (recData[sk] !== undefined) {
          matched = recData[sk];
          break;
        }
        if (recKeyMap.has(sk)) {
          matched = recKeyMap.get(sk);
          break;
        }
      }

      const ft = f.fieldType || f.field_type || 'text';
      const defVal = f.defaultValue ?? f.default_value ?? (ft === 'boolean' ? false : '');
      const finalVal = matched !== undefined ? matched : defVal;

      if (k1) populated[k1] = finalVal;
      if (k2) populated[k2] = finalVal;
      if (k3) populated[k3] = finalVal;
      if (k4) populated[k4] = finalVal;
      if (colMap) populated[colMap] = finalVal;
    });

    return populated;
  };

  const loadMasterAndRecords = async () => {
    setLoading(true);
    setError(null);
    try {
      let resolvedMasterId: number | null = null;
      if (typeof masterIdOrCode === 'number') {
        resolvedMasterId = masterIdOrCode;
      } else {
        const mastersList = await masterBuilderApi.getMasters();
        const found = mastersList.find((m) => m.code === masterIdOrCode || String(m.id) === masterIdOrCode);
        if (found) {
          resolvedMasterId = found.id;
        } else {
          setError(`Master "${masterIdOrCode}" not found. Please configure it via Master Builder first.`);
          return;
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
        const recList = recRes.records || [];
        setRecords(recList);

        // Load lookup records if master has lookup fields
        const lookupFields = (mDetail?.fields || []).filter(
          (f: any) => (f.fieldType === 'lookup' || f.field_type === 'lookup') && (f.lookupMasterId || f.lookup_master_id)
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

        // Load live DB lookup options (e.g. department, designation, company, etc.)
        const dbLookupFields = (mDetail?.fields || []).filter(
          (f: any) =>
            (f.fieldType === 'db_lookup' || f.field_type === 'db_lookup') &&
            (f.optionsJson?.dbLookupEntity || f.options_json?.dbLookupEntity)
        );
        if (dbLookupFields.length > 0) {
          const dbMap: Record<string, DbLookupOption[]> = {};
          await Promise.all(
            dbLookupFields.map(async (df: any) => {
              const opts = df.optionsJson || df.options_json || {};
              const entity = opts.dbLookupEntity;
              if (entity && !dbMap[entity]) {
                try {
                  const o = await masterBuilderApi.getDbLookupOptions(entity);
                  dbMap[entity] = o || [];
                } catch (e) {}
              }
            })
          );
          setDbLookupOptionsMap(dbMap);
        }

        // If records exist, select the first record by default (like Company form), otherwise start new record
        if (recList.length > 0) {
          const firstRec = recList[0];
          setIsNewMode(false);
          setSelectedRecordId(firstRec.id);
          setRecordCode(firstRec.recordCode || '');
          setRecordStatus(firstRec.status || 'Active');
          setFormErrors([]);
          setFormData(populateRecordData(firstRec, mDetail));
        } else {
          initNewRecord(mDetail);
        }
      }
    } catch (err: any) {
      console.error('Failed to load dynamic master records:', err);
      setError(err?.response?.data?.message || err?.message || 'Failed to load master data.');
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

  const initNewRecord = (m: CustomMasterDetail | null = master) => {
    setIsNewMode(true);
    setSelectedRecordId(null);
    setFormErrors([]);
    setRecordCode(`${(m?.code || 'MST').substring(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`);
    setRecordStatus('Active');
    const initial: Record<string, any> = {};
    (m?.fields || []).forEach((f: any) => {
      const k1 = f.fieldKey;
      const k2 = f.field_key;
      const ft = f.fieldType || f.field_type || 'text';
      const def = f.defaultValue ?? f.default_value ?? (ft === 'boolean' ? false : '');
      if (k1) initial[k1] = def;
      if (k2) initial[k2] = def;
    });
    setFormData(initial);
  };

  const handleSelectRecord = (rec: DynamicRecordItem) => {
    setIsNewMode(false);
    setSelectedRecordId(rec.id);
    setRecordCode(rec.recordCode || '');
    setRecordStatus(rec.status || 'Active');
    setFormErrors([]);
    setFormData(populateRecordData(rec, master));
  };

  const handleFieldChange = (key: string, value: any, field?: any) => {
    setFormData((prev) => {
      const next: Record<string, any> = {
        ...prev,
        [key]: value,
      };

      const k1 = field?.fieldKey;
      const k2 = field?.field_key;
      const k3 = field?.fieldName;
      const k4 = field?.field_name;
      if (k1) next[k1] = value;
      if (k2) next[k2] = value;
      if (k3) next[k3] = value;
      if (k4) next[k4] = value;

      // Check if this field triggers any autofill mappings
      const ft = field?.fieldType || field?.field_type;
      if (field && ft === 'lookup') {
        const lookupId = Number(field.lookupMasterId || field.lookup_master_id);
        const lRecords = lookupRecordsMap[lookupId] || [];
        const matched = lRecords.find(
          (lr) =>
            lr.data?.name === value ||
            lr.data?.title === value ||
            lr.recordCode === value ||
            String(lr.id) === String(value)
        );
        if (matched && master?.autofillMappings?.length) {
          master.autofillMappings.forEach((af: any) => {
            const afLookupKey = af.lookupFieldKey || af.lookup_field_key;
            const afSourceKey = af.sourceFieldKey || af.source_field_key;
            const afTargetKey = af.targetFieldKey || af.target_field_key;
            if (afLookupKey === key && matched.data?.[afSourceKey] !== undefined) {
              next[afTargetKey] = matched.data[afSourceKey];
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

    try {
      if (isNewMode || !selectedRecordId) {
        const created = await masterBuilderApi.createRecord(master.id, {
          recordCode: recordCode.trim() || undefined,
          status: recordStatus,
          data: formData,
        });
        const recList = await masterBuilderApi.getRecords(master.id, { limit: 100 });
        const allRecords = recList.records || [];
        setRecords(allRecords);
        if (created?.id) {
          const freshRec = allRecords.find((r) => r.id === created.id) || created;
          handleSelectRecord(freshRec);
        }
      } else {
        const updated = await masterBuilderApi.updateRecord(master.id, selectedRecordId, {
          recordCode: recordCode.trim() || undefined,
          status: recordStatus,
          data: formData,
        });
        const recList = await masterBuilderApi.getRecords(master.id, { limit: 100 });
        const allRecords = recList.records || [];
        setRecords(allRecords);
        const freshRec = allRecords.find((r) => r.id === selectedRecordId) || updated;
        if (freshRec) {
          handleSelectRecord(freshRec);
        }
      }
    } catch (err: any) {
      console.error('Failed to save dynamic record:', err);
      const msg = err?.response?.data?.message || err?.message || 'Failed to save record';
      setFormErrors(Array.isArray(msg) ? msg : [msg]);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRecord = async (e: React.MouseEvent, recordId: number) => {
    e.stopPropagation();
    if (!master) return;
    if (!confirm('Are you sure you want to delete this record?')) return;

    try {
      await masterBuilderApi.deleteRecord(master.id, recordId);
      const recList = await masterBuilderApi.getRecords(master.id, { limit: 100 });
      setRecords(recList.records || []);
      if (selectedRecordId === recordId) {
        initNewRecord();
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Failed to delete record');
    }
  };

  // Filtered records list
  const filteredRecords = useMemo(() => {
    let list = records;
    if (statusFilter !== 'All') {
      list = list.filter((r) => r.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((r) => {
        if (searchField === 'all') {
          if (r.recordCode?.toLowerCase().includes(q)) return true;
          const vals = Object.values(r.data || {}).map((v) => String(v || '').toLowerCase());
          return vals.some((v) => v.includes(q));
        } else {
          const val = String(r.data?.[searchField] || '').toLowerCase();
          return val.includes(q);
        }
      });
    }
    return list;
  }, [records, statusFilter, searchQuery, searchField]);

  const [layoutMode, setLayoutMode] = useState<'grouped' | 'flat'>('grouped');

  const activeFields = useMemo(() => {
    return master?.fields?.filter((f: any) => f.isActive !== false && f.is_active !== false) || [];
  }, [master?.fields]);

  const hasSections = useMemo(() => {
    return activeFields.some((f: any) => (f.fieldType || f.field_type) === 'section');
  }, [activeFields]);

  // Robust Section Groups: Matches explicit sectionKey AND sequential layout without dropping any fields
  const sectionGroups = useMemo(() => {
    if (!hasSections) return [];

    const sectionFields = activeFields.filter((f: any) => (f.fieldType || f.field_type) === 'section');
    const nonSectionFields = activeFields.filter((f: any) => (f.fieldType || f.field_type) !== 'section');

    const groups: Array<{
      id: string | number;
      key: string;
      number?: string | number;
      title: string;
      description?: string;
      icon?: string;
      color?: string;
      fields: any[];
    }> = sectionFields.map((sec: any, idx: number) => {
      const opts = sec.optionsJson || sec.options_json || {};
      const secTitle = opts.sectionTitle || sec.fieldName || sec.field_name || `Section ${idx + 1}`;
      const secNum = opts.sectionNumber || (idx + 1);
      const secIcon = opts.sectionIcon || detectSectionIcon(secTitle);
      const secKey = sec.fieldKey || sec.field_key || `sec_${sec.id || idx}`;
      return {
        id: sec.id || `sec-${idx}`,
        key: secKey,
        number: secNum,
        title: secTitle,
        description: opts.sectionDescription || sec.helpText || sec.help_text,
        icon: secIcon,
        color: opts.sectionColor,
        fields: [],
      };
    });

    // Map each non-section field to its target section group
    nonSectionFields.forEach((field: any) => {
      const opts = field.optionsJson || field.options_json || {};
      const explicitSecKey = opts.sectionKey;

      let targetGroup = null;

      // 1. Explicit section assignment match
      if (explicitSecKey) {
        targetGroup = groups.find(
          (g) =>
            g.key === explicitSecKey ||
            String(g.id) === String(explicitSecKey) ||
            g.title.toLowerCase() === explicitSecKey.toLowerCase()
        );
      }

      // 2. Sequential fallback if not explicitly assigned:
      // Find the latest section that appeared before this field in activeFields
      if (!targetGroup) {
        const fieldIndex = activeFields.indexOf(field);
        for (let i = fieldIndex - 1; i >= 0; i--) {
          const prev: any = activeFields[i];
          if ((prev.fieldType || prev.field_type) === 'section') {
            const prevKey = prev.fieldKey || prev.field_key;
            targetGroup = groups.find((g) => g.key === prevKey || g.id === prev.id);
            if (targetGroup) break;
          }
        }
      }

      // 3. Fallback to first section so no field is ever hidden
      if (!targetGroup && groups.length > 0) {
        targetGroup = groups[0];
      }

      if (targetGroup) {
        targetGroup.fields.push(field);
      }
    });

    return groups;
  }, [activeFields, hasSections]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 space-y-3">
        <div className="w-9 h-9 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-muted-foreground font-medium">Loading {masterIdOrCode} master...</span>
      </div>
    );
  }

  if (error || !master) {
    return (
      <div className="bg-card border border-border rounded-2xl p-8 text-center space-y-4">
        <div className="size-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h3 className="text-base font-bold text-foreground">Master Unavailable</h3>
        <p className="text-xs text-muted-foreground max-w-md mx-auto">{error || 'Master definition not found.'}</p>
        <Button onClick={() => navigate('/masters?tab=master-builder')} variant="outline" className="text-xs gap-2">
          <Settings2 className="h-4 w-4" /> Open Master Builder
        </Button>
      </div>
    );
  }

  const renderFieldInput = (field: any) => {
    const fieldName = field.fieldName || field.field_name || 'Field';
    const fieldKey = field.fieldKey || field.field_key || field.fieldName || field.field_name || '';
    const fieldType = field.fieldType || field.field_type || 'text';
    const isRequired = Boolean(field.isRequired ?? field.is_required);
    const helpText = field.helpText || field.help_text;
    const placeholder = field.placeholder;
    const choiceListId = field.choiceListId || field.choice_list_id;
    const opts = field.optionsJson || field.options_json || {};
    const colSpan = opts.colSpan || (fieldType === 'section' || fieldType === 'textarea' ? 2 : 1);

    const val =
      formData[fieldKey] !== undefined
        ? formData[fieldKey]
        : (field.fieldKey && formData[field.fieldKey] !== undefined)
        ? formData[field.fieldKey]
        : (field.field_key && formData[field.field_key] !== undefined)
        ? formData[field.field_key]
        : (field.fieldName && formData[field.fieldName] !== undefined)
        ? formData[field.fieldName]
        : (field.field_name && formData[field.field_name] !== undefined)
        ? formData[field.field_name]
        : '';
    const choiceList = choiceLists.find((cl) => cl.id === choiceListId);

    // 1. SECTION HEADER / DIVIDER (When rendered in flat mode)
    if (fieldType === 'section') {
      const sectionTitle = opts.sectionTitle || fieldName;
      const sectionDesc = opts.sectionDescription || helpText;
      const sectionColor = opts.sectionColor || '#0284c7';
      const sectionIcon = opts.sectionIcon || detectSectionIcon(sectionTitle);
      const sectionNum = opts.sectionNumber;
      return (
        <div key={field.id} className="col-span-1 sm:col-span-2 pt-3 pb-1 border-b border-border/70 space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {renderSectionIcon(sectionIcon)}
            <span style={{ color: sectionColor || undefined }}>
              {sectionNum ? `${sectionNum}. ` : ''}{sectionTitle}
            </span>
          </div>
          {sectionDesc && <p className="text-[11px] text-muted-foreground">{sectionDesc}</p>}
        </div>
      );
    }

    // 2. IMAGE UPLOAD
    if (fieldType === 'image') {
      const acceptTypes = opts.fileAccept || 'image/*';
      return (
        <div
          key={field.id}
          className={`space-y-1.5 ${colSpan === 2 ? 'sm:col-span-2' : ''}`}
        >
          <label className="text-xs font-semibold text-foreground flex items-center justify-between">
            <span className="flex items-center gap-1">
              {fieldName}
              {isRequired && <span className="text-rose-500">*</span>}
            </span>
            {helpText && (
              <span className="text-[10px] text-muted-foreground font-normal" title={helpText}>
                {helpText}
              </span>
            )}
          </label>

          {val ? (
            <div className="border rounded-2xl p-3 bg-card flex items-center gap-3 border-border">
              <img
                src={String(val)}
                alt="Preview"
                className="w-14 h-14 rounded-xl object-cover border border-border shrink-0 bg-muted"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">
                  {typeof val === 'string' && val.startsWith('data:') ? 'Photo Attached' : String(val)}
                </p>
                <p className="text-[10px] text-emerald-600 font-medium">Ready to save</p>
              </div>
              <div className="flex items-center gap-1.5">
                <label className="cursor-pointer text-xs font-medium px-2.5 py-1.5 rounded-xl border border-border hover:bg-muted text-foreground transition-colors">
                  Change
                  <input
                    type="file"
                    accept={acceptTypes}
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = () => {
                          handleFieldChange(fieldKey, reader.result as string, field);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-lg"
                  onClick={() => handleFieldChange(fieldKey, '', field)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <label className="border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer transition-colors text-center group">
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
                <ImageIcon className="h-5 w-5" />
              </div>
              <span className="text-xs font-semibold text-foreground">Click to upload photo / image</span>
              <span className="text-[10px] text-muted-foreground mt-0.5">PNG, JPG, WebP</span>
              <input
                type="file"
                accept={acceptTypes}
                className="hidden"
                required={isRequired && !val}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = () => {
                      handleFieldChange(fieldKey, reader.result as string, field);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />
            </label>
          )}
        </div>
      );
    }

    // 3. FILE / DOCUMENT UPLOAD
    if (fieldType === 'file') {
      const acceptTypes = opts.fileAccept || '*/*';
      return (
        <div
          key={field.id}
          className={`space-y-1.5 ${colSpan === 2 ? 'sm:col-span-2' : ''}`}
        >
          <label className="text-xs font-semibold text-foreground flex items-center justify-between">
            <span className="flex items-center gap-1">
              {fieldName}
              {isRequired && <span className="text-rose-500">*</span>}
            </span>
            {helpText && (
              <span className="text-[10px] text-muted-foreground font-normal" title={helpText}>
                {helpText}
              </span>
            )}
          </label>

          {val ? (
            <div className="border rounded-2xl p-3 bg-card flex items-center justify-between gap-3 border-border">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">
                    {typeof val === 'object' ? (val.name || 'File Attached') : typeof val === 'string' && val.startsWith('data:') ? 'Document Attached' : String(val)}
                  </p>
                  <p className="text-[10px] text-emerald-600 font-medium">Ready to save</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <label className="cursor-pointer text-xs font-medium px-2.5 py-1.5 rounded-xl border border-border hover:bg-muted text-foreground transition-colors">
                  Replace
                  <input
                    type="file"
                    accept={acceptTypes}
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = () => {
                          handleFieldChange(fieldKey, reader.result as string, field);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-lg"
                  onClick={() => handleFieldChange(fieldKey, '', field)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <label className="border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer transition-colors text-center group">
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
                <FileUp className="h-5 w-5" />
              </div>
              <span className="text-xs font-semibold text-foreground">Click to upload file / document</span>
              <span className="text-[10px] text-muted-foreground mt-0.5">PDF, DOC, XLS, Images</span>
              <input
                type="file"
                accept={acceptTypes}
                className="hidden"
                required={isRequired && !val}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = () => {
                      handleFieldChange(fieldKey, reader.result as string, field);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />
            </label>
          )}
        </div>
      );
    }

    // 4. LIVE DB LOOKUP
    if (fieldType === 'db_lookup') {
      const entity = opts.dbLookupEntity || '';
      const options = (entity && dbLookupOptionsMap[entity]) || [];
      return (
        <div
          key={field.id}
          className={`space-y-1.5 ${colSpan === 2 ? 'sm:col-span-2' : ''}`}
        >
          <label className="text-xs font-semibold text-foreground flex items-center justify-between">
            <span className="flex items-center gap-1">
              {fieldName}
              {isRequired && <span className="text-rose-500">*</span>}
            </span>
            {helpText && (
              <span className="text-[10px] text-muted-foreground font-normal" title={helpText}>
                {helpText}
              </span>
            )}
          </label>
          <select
            value={val}
            onChange={(e) => handleFieldChange(fieldKey, e.target.value, field)}
            required={isRequired}
            className="w-full h-10 px-3 rounded-xl border border-input bg-background text-xs text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">-- Select {fieldName} --</option>
            {options.map((opt: any, i: number) => (
              <option key={i} value={opt.label || opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      );
    }

    // 5. GENDER PILL BUTTONS
    if (fieldType === 'gender') {
      const genderOptions: string[] = opts.genderOptions?.length
        ? opts.genderOptions
        : ['Male', 'Female', 'Other', 'Prefer not to say'];
      return (
        <div
          key={field.id}
          className={`space-y-1.5 ${colSpan === 2 ? 'sm:col-span-2' : 'sm:col-span-2'}`}
        >
          <label className="text-xs font-semibold text-foreground flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span>⚧</span>
              {fieldName}
              {isRequired && <span className="text-rose-500">*</span>}
            </span>
            {helpText && (
              <span className="text-[10px] text-muted-foreground font-normal" title={helpText}>
                {helpText}
              </span>
            )}
          </label>

          {/* Pill button group — same pattern as Company form Yes/No toggles */}
          <div className="flex flex-wrap gap-2">
            {genderOptions.map((opt, i) => {
              const isSelected = val === opt;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    if (isSelected && !isRequired) {
                      handleFieldChange(fieldKey, '', field);
                    } else {
                      handleFieldChange(fieldKey, opt, field);
                    }
                  }}
                  className={cn(
                    'py-2 px-4 text-xs font-bold rounded-xl border transition-all flex items-center gap-1.5',
                    isSelected
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                      : 'bg-background text-muted-foreground border-border hover:bg-accent hover:text-foreground'
                  )}
                >
                  {isSelected && (
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {opt}
                </button>
              );
            })}
            {val && !isRequired && (
              <button
                type="button"
                onClick={() => handleFieldChange(fieldKey, '', field)}
                className="py-2 px-3 text-xs font-medium rounded-xl border border-dashed border-muted-foreground/30 text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-all"
              >
                Clear
              </button>
            )}
          </div>

          {isRequired && (
            <input
              type="text"
              value={val}
              required
              readOnly
              className="sr-only"
              aria-hidden
            />
          )}
        </div>
      );
    }

    return (
      <div
        key={field.id}
        className={`space-y-1.5 ${colSpan === 2 || fieldType === 'textarea' ? 'sm:col-span-2' : ''}`}
      >
        <label className="text-xs font-semibold text-foreground flex items-center justify-between">
          <span className="flex items-center gap-1">
            {fieldName}
            {isRequired && <span className="text-rose-500">*</span>}
          </span>
          {helpText && (
            <span className="text-[10px] text-muted-foreground font-normal" title={helpText}>
              {helpText}
            </span>
          )}
        </label>

        {fieldType === 'choice' && choiceList ? (
          <select
            value={val}
            onChange={(e) => handleFieldChange(fieldKey, e.target.value, field)}
            required={isRequired}
            className="w-full h-10 px-3 rounded-xl border border-input bg-background text-xs text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
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
            className="w-full h-10 px-3 rounded-xl border border-input bg-background text-xs text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
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
            className="w-full p-3 rounded-xl border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
          />
        ) : fieldType === 'boolean' ? (
          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              checked={Boolean(val)}
              onChange={(e) => handleFieldChange(fieldKey, e.target.checked, field)}
              className="h-4 w-4 rounded border-input text-primary focus:ring-primary cursor-pointer"
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
            className="h-10 text-xs bg-background rounded-xl"
          />
        )}
      </div>
    );
  };

  return (
    <div className="w-full space-y-6">
      {/* 2-Column Responsive Layout: Left Form Card (lg:col-span-7), Right Records Directory (lg:col-span-5) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* ========================================================================= */}
        {/* LEFT COLUMN: Entity Dynamic Form (lg:col-span-7)                          */}
        {/* ========================================================================= */}
        <div className="lg:col-span-7 bg-card border border-border/80 rounded-2xl p-6 shadow-xs text-foreground space-y-6">
          
          {/* Form Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                <Boxes className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                  {isNewMode ? `Add New ${master.name}` : `Edit ${master.name}`}
                  {isNewMode ? (
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px]">
                      New
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px]">
                      {recordStatus}
                    </Badge>
                  )}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {master.description || `Configure ${master.name} record details, attributes, and custom metadata.`}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Optional Section Layout Toggle — Only shown when sections exist */}
              {hasSections && (
                <div className="flex items-center bg-muted/60 p-0.5 rounded-xl border border-border/80">
                  <button
                    type="button"
                    onClick={() => setLayoutMode('grouped')}
                    className={cn(
                      'flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all',
                      layoutMode === 'grouped'
                        ? 'bg-background text-primary shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                    title="Company Master Style (Numbered Section Cards)"
                  >
                    <LayoutList className="h-3.5 w-3.5" />
                    <span>Grouped Sections</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLayoutMode('flat')}
                    className={cn(
                      'flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all',
                      layoutMode === 'flat'
                        ? 'bg-background text-primary shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                    title="Standard Flat Layout"
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                    <span>Flat Grid</span>
                  </button>
                </div>
              )}

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => initNewRecord()}
                title="Reset Form"
                className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground rounded-lg"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </Button>
            </div>
          </div>

          {/* Validation / Submission Errors */}
          {formErrors.length > 0 && (
            <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs space-y-1">
              {formErrors.map((err, i) => (
                <div key={i} className="flex items-center gap-2">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{err}</span>
                </div>
              ))}
            </div>
          )}

          {/* Master Record Form */}
          <form onSubmit={handleSaveRecord} className="space-y-6">
            {/* Standard Header Row: Code & Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-border/60">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Record Code</label>
                <Input
                  value={recordCode}
                  onChange={(e) => setRecordCode(e.target.value)}
                  placeholder="e.g. REC-101"
                  className="font-mono text-xs h-10 bg-background rounded-xl uppercase"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Status</label>
                <select
                  value={recordStatus}
                  onChange={(e) => setRecordStatus(e.target.value as any)}
                  className="w-full h-10 px-3 text-xs border border-input rounded-xl bg-background text-foreground font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>

            {/* Dynamic Master Fields: Section Grouped (Company Style) OR Flat Default Grid */}
            {activeFields.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-border space-y-2">
                <p className="font-semibold">No custom fields configured for this master yet.</p>
                <Button
                  type="button"
                  onClick={() => navigate(`/masters/builder/${master.id}`)}
                  variant="outline"
                  size="sm"
                  className="text-xs gap-1.5 mt-2"
                >
                  <Settings2 className="h-3.5 w-3.5" /> Design Fields in Master Builder
                </Button>
              </div>
            ) : hasSections && layoutMode === 'grouped' ? (
              /* ========================================================================= */
              /* OPTION 1: Numbered Section Groups Layout (Company Master Form Style)       */
              /* ========================================================================= */
              <div className="space-y-6">
                {sectionGroups.map((group, groupIdx) => (
                  <div
                    key={group.id || groupIdx}
                    className="space-y-4 pt-2 border-t border-border/60 first:pt-0 first:border-0"
                  >
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      {renderSectionIcon(group.icon)}
                      <span style={{ color: group.color || undefined }}>
                        {group.number ? `${group.number}. ` : `${groupIdx + 1}. `}
                        {group.title}
                      </span>
                    </div>

                    {group.description && (
                      <p className="text-xs text-muted-foreground -mt-2">
                        {group.description}
                      </p>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {group.fields.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic sm:col-span-2 py-2">
                          No fields assigned under this section.
                        </p>
                      ) : (
                        group.fields.map(renderFieldInput)
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* ========================================================================= */
              /* OPTION 2: Standard Flat Grid Layout (Default format)                      */
              /* ========================================================================= */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {activeFields.map(renderFieldInput)}
              </div>
            )}

            {/* Form Footer Action Buttons */}
            <div className="pt-4 border-t border-border flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => initNewRecord()}
                className="text-xs rounded-xl h-10 px-4"
              >
                Cancel / Clear
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="h-10 px-6 font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-xs"
              >
                {saving ? 'Saving...' : isNewMode ? `Create ${master.name}` : `Update ${master.name}`}
              </Button>
            </div>
          </form>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: Entity Records Directory List (lg:col-span-5)               */}
        {/* ========================================================================= */}
        <div className="lg:col-span-5 bg-card border border-border/80 rounded-2xl p-6 shadow-xs text-foreground space-y-4">
          
          {/* Directory Header */}
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center gap-2">
              <Boxes className="h-5 w-5 text-primary" />
              <h3 className="text-base font-bold text-foreground">{master.name} Records</h3>
              <Badge variant="secondary" className="text-xs font-semibold rounded-full px-2.5">
                {filteredRecords.length}
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={() => initNewRecord()}
                size="sm"
                className="text-xs font-semibold h-9 px-3 rounded-xl gap-1.5 shadow-xs bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <Plus className="h-4 w-4" />
                <span>Add New {master.name}</span>
              </Button>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {/* Field filter */}
              <select
                value={searchField}
                onChange={(e) => setSearchField(e.target.value)}
                className="h-9 px-2.5 text-xs border border-input rounded-xl bg-background font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer shadow-2xs"
              >
                <option value="all">All Fields</option>
                {activeFields
                  .filter((f) => f.fieldType !== 'section' && f.fieldType !== 'image' && f.fieldType !== 'file')
                  .map((f) => (
                    <option key={f.id} value={f.fieldKey}>
                      {f.fieldName}
                    </option>
                  ))}
              </select>

              {/* Search Input */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder={`Search ${master.name.toLowerCase()}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 text-xs h-9 bg-background rounded-xl"
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="h-9 px-2.5 text-xs border border-input rounded-xl bg-background font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer shadow-2xs"
              >
                <option value="All">All</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Scrollable Records Directory Cards */}
          <div className="space-y-3 max-h-[720px] overflow-y-auto pr-1">
            {filteredRecords.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground bg-muted/10 rounded-2xl border border-dashed border-border space-y-2">
                <p className="font-semibold">No {master.name.toLowerCase()} records found.</p>
                <p className="text-[11px]">Click "Add New {master.name}" above to register one.</p>
              </div>
            ) : (
              filteredRecords.map((rec) => {
                const isSelected = !isNewMode && rec.id === selectedRecordId;
                
                // Extract representative label / subtitle values from record data
                const firstTextField = activeFields.find(
                  (f: any) =>
                    (f.fieldType || f.field_type) === 'text' ||
                    (f.fieldType || f.field_type) === 'email'
                );
                const pk1 = firstTextField?.fieldKey;
                const pk2 = firstTextField?.field_key;
                const pk3 = firstTextField?.fieldName;
                const pk4 = firstTextField?.field_name;
                const primaryTitle =
                  (pk1 && rec.data?.[pk1]) ||
                  (pk2 && rec.data?.[pk2]) ||
                  (pk3 && rec.data?.[pk3]) ||
                  (pk4 && rec.data?.[pk4]) ||
                  null;
                const displayTitle = primaryTitle || rec.recordCode || `Record #${rec.id}`;

                // Secondary information values
                const secondaryFields = activeFields
                  .filter((f: any) => {
                    const ft = f.fieldType || f.field_type;
                    if (ft === 'section' || ft === 'image' || ft === 'file') return false;
                    const k = f.fieldKey || f.field_key;
                    if (k === pk1 || k === pk2) return false;
                    const val =
                      (f.fieldKey && rec.data?.[f.fieldKey] !== undefined ? rec.data[f.fieldKey] : undefined) ??
                      (f.field_key && rec.data?.[f.field_key] !== undefined ? rec.data[f.field_key] : undefined) ??
                      (f.fieldName && rec.data?.[f.fieldName] !== undefined ? rec.data[f.fieldName] : undefined);
                    return val !== undefined && val !== null && val !== '';
                  })
                  .slice(0, 3);

                return (
                  <div
                    key={rec.id}
                    onClick={() => handleSelectRecord(rec)}
                    className={cn(
                      'p-4 rounded-2xl border cursor-pointer transition-all relative overflow-hidden group shadow-2xs space-y-2',
                      isSelected
                        ? 'bg-primary text-primary-foreground border-primary shadow-md font-medium'
                        : 'bg-card border-border/80 hover:border-primary/50 hover:bg-accent/40 text-foreground'
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className={cn('text-sm font-bold truncate', isSelected ? 'text-primary-foreground' : 'text-foreground')}>
                            {displayTitle}
                          </p>
                          {rec.recordCode && (
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-[10px] font-mono px-1.5 py-0 shrink-0',
                                isSelected
                                  ? 'bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30'
                                  : 'bg-muted/50 text-muted-foreground border-border'
                              )}
                            >
                              {rec.recordCode}
                            </Badge>
                          )}
                        </div>

                        {secondaryFields.length > 0 && (
                          <div className="flex flex-wrap items-center gap-2 text-[11px]">
                            {secondaryFields.map((sf: any) => {
                              const sVal =
                                (sf.fieldKey && rec.data?.[sf.fieldKey] !== undefined ? rec.data[sf.fieldKey] : undefined) ??
                                (sf.field_key && rec.data?.[sf.field_key] !== undefined ? rec.data[sf.field_key] : undefined) ??
                                (sf.fieldName && rec.data?.[sf.fieldName] !== undefined ? rec.data[sf.fieldName] : undefined);
                              return (
                                <span
                                  key={sf.id}
                                  className={cn(
                                    'truncate max-w-[200px]',
                                    isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'
                                  )}
                                >
                                  <span className="opacity-70">{sf.fieldName || sf.field_name}: </span>
                                  {String(sVal)}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={cn(
                            'text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0',
                            isSelected
                              ? 'bg-primary-foreground/20 text-primary-foreground'
                              : rec.status === 'Active'
                                ? 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'
                                : 'bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400'
                          )}
                        >
                          {rec.status}
                        </span>
                        
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={(e) => handleDeleteRecord(e, rec.id)}
                          className={cn(
                            'h-7 w-7 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity',
                            isSelected
                              ? 'text-primary-foreground hover:bg-primary-foreground/20'
                              : 'text-destructive hover:bg-destructive/10'
                          )}
                          title="Delete Record"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Quick Manage Fields Link at Bottom of Right Column */}
          <div className="pt-2 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
            <span>{activeFields.length} configured fields</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/masters/builder/${master.id}`)}
              className="text-xs h-7 gap-1 text-primary hover:text-primary hover:bg-primary/10 rounded-lg"
            >
              <Settings2 className="h-3 w-3" /> Manage Master Builder
            </Button>
          </div>

        </div>

      </div>
    </div>
  );
}

export default DynamicMasterView;
