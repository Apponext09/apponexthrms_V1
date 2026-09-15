import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Boxes,
  Plus,
  Search,
  MoreVertical,
  Edit2,
  Trash2,
  ChevronRight,
  ShieldCheck,
  Zap,
  Filter,
  Key,
  HelpCircle,
  X,
  Layers,
  Building2,
  Table as TableIcon,
  CheckCircle2,
  AlertCircle,
  Inbox
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
  CustomMasterField,
  CustomMasterValidationRule,
  CustomMasterAutofillMapping,
  ChoiceListItem,
  CustomMasterItem
} from '../api/masterBuilderApi';

export function MasterBuilderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const masterId = Number(id);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [master, setMaster] = useState<CustomMasterDetail | null>(null);
  const [allMasters, setAllMasters] = useState<CustomMasterItem[]>([]);
  const [choiceLists, setChoiceLists] = useState<ChoiceListItem[]>([]);
  const [activeTab, setActiveTab] = useState<'fields' | 'autofill' | 'rules' | 'unique' | 'filtering'>('fields');

  // Fields state
  const [fieldSearch, setFieldSearch] = useState('');
  const [selectedFieldId, setSelectedFieldId] = useState<number | null>(null);
  const [isFieldModalOpen, setIsFieldModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<CustomMasterField | null>(null);

  // Field form
  const [fName, setFName] = useState('');
  const [fKey, setFKey] = useState('');
  const [fType, setFType] = useState('text');
  const [fRequired, setFRequired] = useState(false);
  const [fUnique, setFUnique] = useState(false);
  const [fShowInTable, setFShowInTable] = useState(true);
  const [fHelpText, setFHelpText] = useState('');
  const [fPlaceholder, setFPlaceholder] = useState('');
  const [fDefaultValue, setFDefaultValue] = useState('');
  const [fChoiceListId, setFChoiceListId] = useState<number | undefined>(undefined);
  const [fLookupMasterId, setFLookupMasterId] = useState<number | undefined>(undefined);
  // New field type config state
  const [fDbLookupEntity, setFDbLookupEntity] = useState('');
  const [fColSpan, setFColSpan] = useState<1 | 2>(2);
  const [fSectionTitle, setFSectionTitle] = useState('');
  const [fSectionNumber, setFSectionNumber] = useState('');
  const [fSectionIcon, setFSectionIcon] = useState('building');
  const [fSectionDesc, setFSectionDesc] = useState('');
  const [fSectionColor, setFSectionColor] = useState('#0284c7');
  const [fSectionKey, setFSectionKey] = useState('');
  const [fFileAccept, setFFileAccept] = useState('image/*');
  const [fGenderOptions, setFGenderOptions] = useState<string[]>(['Male', 'Female', 'Other', 'Prefer not to say']);
  const [fGenderInputValue, setFGenderInputValue] = useState('');

  // Validation Rules state
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<CustomMasterValidationRule | null>(null);
  const [rName, setRName] = useState('');
  const [rFieldA, setRFieldA] = useState('');
  const [rOperator, setROperator] = useState('>=');
  const [rFieldB, setRFieldB] = useState('');
  const [rCustomValue, setRCustomValue] = useState('');
  const [rErrorMessage, setRErrorMessage] = useState('');
  const [rIsActive, setRIsActive] = useState(true);

  // Autofill Modal state
  const [isAutofillModalOpen, setIsAutofillModalOpen] = useState(false);
  const [afLookupField, setAfLookupField] = useState('');
  const [afSourceField, setAfSourceField] = useState('');
  const [afTargetField, setAfTargetField] = useState('');

  const loadMaster = async () => {
    if (!masterId) return;
    setLoading(true);
    try {
      const [m, cLists, mList] = await Promise.all([
        masterBuilderApi.getMasterById(masterId),
        masterBuilderApi.getChoiceLists(),
        masterBuilderApi.getMasters(),
      ]);
      setMaster(m);
      setChoiceLists(cLists);
      setAllMasters(mList);
      if (m?.fields?.length && !selectedFieldId) {
        setSelectedFieldId(m.fields[0].id);
      }
    } catch (err) {
      console.error('Failed to load master detail:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMaster();
  }, [masterId]);

  const filteredFields = useMemo(() => {
    if (!master?.fields) return [];
    if (!fieldSearch.trim()) return master.fields;
    const q = fieldSearch.toLowerCase().trim();
    return master.fields.filter((f: any) => {
      const name = f.fieldName || f.field_name || '';
      const key = f.fieldKey || f.field_key || '';
      return name.toLowerCase().includes(q) || key.toLowerCase().includes(q);
    });
  }, [master?.fields, fieldSearch]);

  const selectedField = useMemo(() => {
    if (!master?.fields?.length) return null;
    return master.fields.find((f) => f.id === selectedFieldId) || master.fields[0];
  }, [master?.fields, selectedFieldId]);

  const lookupFields = useMemo(() => {
    return (master?.fields || []).filter((f: any) => (f.fieldType || f.field_type) === 'lookup');
  }, [master?.fields]);

  const existingSections = useMemo(() => {
    return (master?.fields || []).filter((f: any) => (f.fieldType || f.field_type) === 'section');
  }, [master?.fields]);

  // Field Handlers
  const handleOpenFieldModal = (field?: any) => {
    if (field) {
      setEditingField(field);
      setFName(field.fieldName || field.field_name || '');
      setFKey(field.fieldKey || field.field_key || '');
      const ft = field.fieldType || field.field_type || 'text';
      setFType(ft);
      setFRequired(Boolean(field.isRequired ?? field.is_required));
      setFUnique(Boolean(field.isUnique ?? field.is_unique));
      setFShowInTable(Boolean(field.showInTable ?? field.show_in_table ?? true));
      setFHelpText(field.helpText || field.help_text || '');
      setFPlaceholder(field.placeholder || '');
      setFDefaultValue(field.defaultValue || field.default_value || '');
      setFChoiceListId(field.choiceListId || field.choice_list_id);
      setFLookupMasterId(field.lookupMasterId || field.lookup_master_id);
      const opts = field.optionsJson || (field as any).options_json || {};
      setFDbLookupEntity(opts.dbLookupEntity || '');
      setFColSpan(opts.colSpan || 2);
      setFSectionTitle(opts.sectionTitle || field.fieldName || '');
      setFSectionNumber(opts.sectionNumber || '');
      setFSectionIcon(opts.sectionIcon || 'building');
      setFSectionDesc(opts.sectionDescription || field.helpText || '');
      setFSectionColor(opts.sectionColor || '#0284c7');
      setFSectionKey(opts.sectionKey || '');
      setFFileAccept(opts.fileAccept || (ft === 'file' ? '*/*' : 'image/*'));
      setFGenderOptions(opts.genderOptions?.length ? opts.genderOptions : ['Male', 'Female', 'Other', 'Prefer not to say']);
      setFGenderInputValue('');
    } else {
      setEditingField(null);
      setFName('');
      setFKey('');
      setFType('text');
      setFRequired(false);
      setFUnique(false);
      setFShowInTable(true);
      setFHelpText('');
      setFPlaceholder('');
      setFDefaultValue('');
      setFChoiceListId(undefined);
      setFLookupMasterId(undefined);
      setFDbLookupEntity('');
      setFColSpan(2);
      setFSectionTitle('');
      setFSectionNumber('');
      setFSectionIcon('building');
      setFSectionDesc('');
      setFSectionColor('#0284c7');
      setFSectionKey('');
      setFFileAccept('image/*');
      setFGenderOptions(['Male', 'Female', 'Other', 'Prefer not to say']);
      setFGenderInputValue('');
    }
    setIsFieldModalOpen(true);
  };

  const handleOpenAddSectionModal = () => {
    handleOpenFieldModal();
    const nextNum = existingSections.length + 1;
    setFType('section');
    setFName(`Section ${nextNum}`);
    setFKey(`sec_${Date.now()}`);
    setFSectionTitle(`Section ${nextNum}`);
    setFSectionNumber(String(nextNum));
    setFSectionIcon('building');
    setFSectionColor('#0284c7');
    setFRequired(false);
    setFUnique(false);
    setFShowInTable(false);
  };

  const handleAddCompanyPresetSections = async () => {
    if (!window.confirm('Create the 6 Standard Company Section Headers in this master?\n\n1. Company Profile & Identification\n2. Registered Headquarters Address\n3. Statutory, Contact & Communication\n4. Branding Assets & Media\n5. Status & System Controls\n6. System Access Credentials')) return;
    const standardSections = [
      { name: '1. Company Profile & Identification', key: 'sec_company_profile', icon: 'building', desc: 'Company Name, Employer Name, Class Of Establishment, Code', color: '#0284c7', num: '1' },
      { name: '2. Registered Headquarters Address', key: 'sec_headquarters_address', icon: 'map-pin', desc: 'Address Line 1, Address Line 2, Country, State, City, ZIP Code', color: '#10b981', num: '2' },
      { name: '3. Statutory, Contact & Communication', key: 'sec_statutory_contact', icon: 'file-check', desc: 'PAN/TIN Number, Contact Number, Corporate Email', color: '#f59e0b', num: '3' },
      { name: '4. Branding Assets & Media', key: 'sec_branding_media', icon: 'image', desc: 'Company Logo, Official Stamp, Signature', color: '#ec4899', num: '4' },
      { name: '5. Status & System Controls', key: 'sec_status_controls', icon: 'shield', desc: 'Active Status, Active Users Access, Login Page Logo', color: '#8b5cf6', num: '5' },
      { name: '6. System Access Credentials', key: 'sec_system_credentials', icon: 'key', desc: 'Full Name, Login Email, System Password', color: '#6366f1', num: '6' },
    ];
    try {
      let order = (master?.fields?.length || 0) + 1;
      for (const s of standardSections) {
        await masterBuilderApi.addField(masterId, {
          fieldName: s.name,
          fieldKey: s.key,
          fieldType: 'section',
          isRequired: false,
          isUnique: false,
          showInTable: false,
          helpText: s.desc,
          displayOrder: order++,
          optionsJson: {
            sectionTitle: s.name,
            sectionNumber: s.num,
            sectionIcon: s.icon,
            sectionDescription: s.desc,
            sectionColor: s.color,
          },
        });
      }
      loadMaster();
    } catch (err: any) {
      alert(err?.message || 'Failed to add preset sections');
    }
  };

  const handleSaveField = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fName.trim() || !fKey.trim()) return;

    try {
      // Build optionsJson from all extended configs
      const builtOptionsJson: Record<string, any> = {};
      if (fDbLookupEntity) builtOptionsJson.dbLookupEntity = fDbLookupEntity;
      if (fColSpan !== 2) builtOptionsJson.colSpan = fColSpan;
      if (fType === 'section') {
        builtOptionsJson.sectionTitle = fSectionTitle || fName.trim();
        builtOptionsJson.sectionNumber = fSectionNumber || '';
        builtOptionsJson.sectionIcon = fSectionIcon || 'building';
        builtOptionsJson.sectionDescription = fSectionDesc || fHelpText.trim();
        builtOptionsJson.sectionColor = fSectionColor || '#0284c7';
      } else if (fSectionKey) {
        builtOptionsJson.sectionKey = fSectionKey;
      }
      if (fType === 'image' || fType === 'file') {
        builtOptionsJson.fileAccept = fFileAccept;
      }
      if (fType === 'gender') {
        builtOptionsJson.genderOptions = fGenderOptions.filter(Boolean);
      }

      const fieldPayload = {
        fieldName: fName.trim(),
        fieldKey: fKey.trim(),
        fieldType: fType,
        isRequired: fType === 'section' ? false : fRequired,
        isUnique: fType === 'section' ? false : fUnique,
        showInTable: fType === 'section' ? false : fShowInTable,
        helpText: fHelpText.trim(),
        placeholder: fPlaceholder.trim(),
        defaultValue: fDefaultValue.trim(),
        choiceListId: fChoiceListId,
        lookupMasterId: fLookupMasterId,
        optionsJson: Object.keys(builtOptionsJson).length > 0 ? builtOptionsJson : undefined,
      };

      if (editingField) {
        await masterBuilderApi.updateField(masterId, editingField.id, fieldPayload);
      } else {
        const created = await masterBuilderApi.addField(masterId, {
          ...fieldPayload,
          displayOrder: (master?.fields?.length || 0) + 1,
        });
        if (created?.id) {
          setSelectedFieldId(created.id);
        }
      }
      setIsFieldModalOpen(false);
      loadMaster();
      window.dispatchEvent(new CustomEvent('custom_masters_updated'));
    } catch (err: any) {
      alert(err?.response?.data?.message || err.message || 'Failed to save field');
    }
  };

  const handleDeleteField = async (fieldId: number, fieldName: string, isCore?: boolean) => {
    if (isCore) {
      alert(`"${fieldName}" is a core system field and cannot be deleted. You can still add new custom fields to this master.`);
      return;
    }
    if (window.confirm(`Delete field "${fieldName}"?`)) {
      try {
        await masterBuilderApi.deleteField(masterId, fieldId);
        loadMaster();
        window.dispatchEvent(new CustomEvent('custom_masters_updated'));
      } catch (err) {
        alert('Failed to delete field');
      }
    }
  };

  // Validation Rule Handlers
  const handleOpenRuleModal = (rule?: CustomMasterValidationRule) => {
    if (rule) {
      setEditingRule(rule);
      setRName(rule.ruleName);
      setRFieldA(rule.fieldA);
      setROperator(rule.operator);
      setRFieldB(rule.fieldB || '');
      setRCustomValue(rule.customValue || '');
      setRErrorMessage(rule.errorMessage || '');
      setRIsActive(rule.isActive);
    } else {
      setEditingRule(null);
      setRName('');
      setRFieldA(master?.fields?.[0]?.fieldKey || '');
      setROperator('>=');
      setRFieldB(master?.fields?.[1]?.fieldKey || '');
      setRCustomValue('');
      setRErrorMessage('');
      setRIsActive(true);
    }
    setIsRuleModalOpen(true);
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rName.trim() || !rFieldA) return;

    try {
      if (editingRule) {
        await masterBuilderApi.updateValidationRule(masterId, editingRule.id, {
          ruleName: rName.trim(),
          fieldA: rFieldA,
          operator: rOperator,
          fieldB: rFieldB || undefined,
          customValue: rCustomValue || undefined,
          errorMessage: rErrorMessage.trim(),
          isActive: rIsActive,
        });
      } else {
        await masterBuilderApi.addValidationRule(masterId, {
          ruleName: rName.trim(),
          fieldA: rFieldA,
          operator: rOperator,
          fieldB: rFieldB || undefined,
          customValue: rCustomValue || undefined,
          errorMessage: rErrorMessage.trim(),
          isActive: rIsActive,
        });
      }
      setIsRuleModalOpen(false);
      loadMaster();
    } catch (err: any) {
      alert(err?.response?.data?.message || err.message || 'Failed to save rule');
    }
  };

  const handleToggleRuleStatus = async (rule: CustomMasterValidationRule) => {
    try {
      await masterBuilderApi.updateValidationRule(masterId, rule.id, {
        isActive: !rule.isActive,
      });
      loadMaster();
    } catch (err) {
      alert('Failed to toggle rule');
    }
  };

  const handleDeleteRule = async (ruleId: number) => {
    if (window.confirm('Delete this validation rule?')) {
      try {
        await masterBuilderApi.deleteValidationRule(masterId, ruleId);
        loadMaster();
      } catch (err) {
        alert('Failed to delete rule');
      }
    }
  };

  // Autofill Handlers
  const handleSaveAutofill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!afLookupField || !afSourceField || !afTargetField) return;
    try {
      await masterBuilderApi.addAutofillMapping(masterId, {
        lookupFieldKey: afLookupField,
        sourceFieldKey: afSourceField,
        targetFieldKey: afTargetField,
        isActive: true,
      });
      setIsAutofillModalOpen(false);
      loadMaster();
    } catch (err: any) {
      alert('Failed to add autofill mapping');
    }
  };

  const handleDeleteAutofill = async (mappingId: number) => {
    if (window.confirm('Delete this autofill mapping?')) {
      await masterBuilderApi.deleteAutofillMapping(masterId, mappingId);
      loadMaster();
    }
  };

  if (loading || !master) {
    return (
      <div className="p-8 max-w-7xl mx-auto flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <Boxes className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Loading master builder configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Link to="/masters" className="hover:text-foreground transition-colors">
          Settings
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link to="/masters/builder" className="hover:text-foreground transition-colors">
          Master Builder
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-semibold">{master.name}</span>
      </div>

      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{master.name}</h1>
            <Badge
              variant="secondary"
              className={
                master.status === 'Active'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                  : 'bg-muted text-muted-foreground'
              }
            >
              {master.status}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {master.description || `Custom Master configuration for ${master.name}`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => navigate(`/masters?tab=${master.code}`)}
            className="gap-2 text-xs h-9"
          >
            <TableIcon className="h-4 w-4" /> View Records ({master.recordsCount || 0})
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 px-3 gap-1.5">
                <MoreVertical className="h-4 w-4" /> More
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => navigate('/masters/builder')}>
                <Boxes className="h-4 w-4 mr-2" /> All Masters
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleOpenFieldModal()}>
                <Plus className="h-4 w-4 mr-2" /> Add Field
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleOpenRuleModal()}>
                <ShieldCheck className="h-4 w-4 mr-2" /> Add Validation Rule
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Detail Tabs */}
      <div className="flex border-b border-border gap-8 text-sm font-semibold overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('fields')}
          className={`pb-3 border-b-2 transition-colors uppercase tracking-wider text-xs font-bold whitespace-nowrap ${activeTab === 'fields'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
        >
          Fields ({master.fields?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('autofill')}
          className={`pb-3 border-b-2 transition-colors uppercase tracking-wider text-xs font-bold whitespace-nowrap ${activeTab === 'autofill'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
        >
          Autofill Mappings
        </button>
        <button
          onClick={() => setActiveTab('rules')}
          className={`pb-3 border-b-2 transition-colors uppercase tracking-wider text-xs font-bold whitespace-nowrap ${activeTab === 'rules'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
        >
          Validation Rules
        </button>
        <button
          onClick={() => setActiveTab('unique')}
          className={`pb-3 border-b-2 transition-colors uppercase tracking-wider text-xs font-bold whitespace-nowrap ${activeTab === 'unique'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
        >
          Unique Constraints
        </button>
        <button
          onClick={() => setActiveTab('filtering')}
          className={`pb-3 border-b-2 transition-colors uppercase tracking-wider text-xs font-bold whitespace-nowrap ${activeTab === 'filtering'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
        >
          Filtering
        </button>
      </div>

      {/* Tab 1: FIELDS (Image 3) */}
      {activeTab === 'fields' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search fields"
                value={fieldSearch}
                onChange={(e) => setFieldSearch(e.target.value)}
                className="pl-9 h-10"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {existingSections.length === 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddCompanyPresetSections}
                  className="gap-1.5 h-10 text-xs border-primary/30 text-primary hover:bg-primary/10 font-semibold"
                  title="Create 6 standard numbered sections like Company Master Form"
                >
                  <Layers className="h-4 w-4" /> 6 Company Sections
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleOpenAddSectionModal}
                className="gap-1.5 h-10 text-xs font-semibold"
              >
                <Plus className="h-4 w-4" /> Add Section
              </Button>
              <Button onClick={() => handleOpenFieldModal()} className="gap-2 h-10 bg-primary font-semibold">
                <Plus className="h-4 w-4" /> Add field
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Fields List */}
            <div className="lg:col-span-7 border border-border rounded-xl bg-card overflow-hidden shadow-sm divide-y divide-border/60">
              {filteredFields.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  No fields configured yet. Click "+ Add field" to create custom fields.
                </div>
              ) : (
                filteredFields.map((field: any) => {
                  const isSelected = field.id === selectedField?.id;
                  const fieldName = field.fieldName || field.field_name || 'Untitled Field';
                  const fieldKey = field.fieldKey || field.field_key || '';
                  const fieldType = field.fieldType || field.field_type || 'text';
                  const isRequired = Boolean(field.isRequired ?? field.is_required);
                  const isUnique = Boolean(field.isUnique ?? field.is_unique);
                  const isCoreField = Boolean(field.isCore ?? field.is_core);
                  return (
                    <div
                      key={field.id}
                      onClick={() => setSelectedFieldId(field.id)}
                      className={`p-4 flex items-center justify-between transition-colors cursor-pointer group ${isSelected ? 'bg-primary/5 border-l-4 border-l-primary' : 'hover:bg-muted/40'
                        }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors">
                            {fieldName}
                          </span>
                          <span className="font-mono text-xs text-muted-foreground">
                            {fieldKey}
                          </span>
                          {isCoreField && (
                            <span title="Core system field — cannot be deleted" className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:text-slate-400">
                              🔒 Core
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <Badge variant="outline" className="text-[11px] font-normal capitalize">
                            {fieldType === 'text'
                              ? 'Text Field'
                              : fieldType === 'choice'
                                ? 'Choice / Dropdown'
                                : fieldType}
                          </Badge>
                          {isRequired && (
                            <Badge variant="secondary" className="text-[11px] bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300">
                              Required
                            </Badge>
                          )}
                          {isUnique && (
                            <Badge variant="secondary" className="text-[11px] bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300">
                              Unique
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenFieldModal(field)}>
                              <Edit2 className="h-4 w-4 mr-2" /> Edit Field
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteField(field.id, fieldName, isCoreField)}
                              className={isCoreField ? 'text-muted-foreground cursor-not-allowed' : 'text-destructive'}
                            >
                              {isCoreField ? (
                                <span className="flex items-center gap-2"><span>🔒</span> Core Field</span>
                              ) : (
                                <><Trash2 className="h-4 w-4 mr-2" /> Delete Field</>
                              )}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Right Column: Field Preview Card (Image 3) */}
            <div className="lg:col-span-5 border border-border rounded-xl bg-card p-6 shadow-sm space-y-6 sticky top-6">
              {selectedField ? (
                <>
                  <div className="flex items-center justify-between pb-4 border-b border-border">
                    <h3 className="text-lg font-bold text-primary">
                      {(selectedField as any).fieldName || (selectedField as any).field_name || 'Untitled Field'}
                    </h3>
                    <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                      Live
                    </Badge>
                  </div>

                  <div className="space-y-4 text-sm">
                    <div>
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Key</span>
                      <span className="font-mono text-sm text-foreground mt-0.5 block">
                        {(selectedField as any).fieldKey || (selectedField as any).field_key || '-'}
                      </span>
                    </div>

                    <div>
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Type</span>
                      <span className="text-sm font-medium text-foreground mt-0.5 capitalize block">
                        {((selectedField as any).fieldType || (selectedField as any).field_type) === 'text'
                          ? 'Text Field'
                          : ((selectedField as any).fieldType || (selectedField as any).field_type)}
                      </span>
                    </div>

                    <div>
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Behaviour</span>
                      <div className="flex flex-wrap gap-1.5">
                        {Boolean((selectedField as any).isRequired ?? (selectedField as any).is_required) ? (
                          <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                            Required
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs text-muted-foreground">
                            Optional
                          </Badge>
                        )}
                        {Boolean((selectedField as any).showInTable ?? (selectedField as any).show_in_table ?? true) && (
                          <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                            Shown in table
                          </Badge>
                        )}
                        {Boolean((selectedField as any).isUnique ?? (selectedField as any).is_unique) && (
                          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                            Unique
                          </Badge>
                        )}
                      </div>
                    </div>

                    {((selectedField as any).helpText || (selectedField as any).help_text) && (
                      <div>
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Help shown on the form</span>
                        <span className="text-sm text-foreground mt-0.5 block">
                          {(selectedField as any).helpText || (selectedField as any).help_text}
                        </span>
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={() => handleOpenFieldModal(selectedField)}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                  >
                    Edit field
                  </Button>
                </>
              ) : (
                <div className="py-12 text-center text-muted-foreground text-sm">
                  Select a field to view its configuration
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: AUTOFILL MAPPINGS (Image 4) */}
      {activeTab === 'autofill' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Fill fields from the record a Lookup points at.
            </p>
            <Button
              onClick={() => setIsAutofillModalOpen(true)}
              disabled={lookupFields.length === 0}
              className="gap-2"
            >
              <Plus className="h-4 w-4" /> Add mapping
            </Button>
          </div>

          {lookupFields.length === 0 ? (
            <div className="border border-dashed border-border rounded-xl p-12 text-center bg-card/40 space-y-3">
              <div className="size-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                <Inbox className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-foreground">Add a Lookup field first</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                Autofill copies values off the record a Lookup field points at — for example a Pincode field that fills in City and State. Add a Lookup field to this master and it will show up here.
              </p>
            </div>
          ) : (
            <div className="border border-border rounded-xl bg-card divide-y divide-border overflow-hidden shadow-sm">
              {master.autofillMappings?.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  No autofill mappings defined yet. Click "+ Add mapping" to configure automatic value resolution.
                </div>
              ) : (
                master.autofillMappings.map((af) => (
                  <div key={af.id} className="p-4 flex items-center justify-between">
                    <div className="space-y-1">
                      <span className="font-semibold text-sm text-foreground">
                        {af.lookupFieldKey}.{af.sourceFieldKey} → {af.targetFieldKey}
                      </span>
                      <p className="text-xs text-muted-foreground">
                        Copies {af.sourceFieldKey} from referenced record into {af.targetFieldKey}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteAutofill(af.id)}
                      className="text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: VALIDATION RULES (Image 5) */}
      {activeTab === 'rules' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Checks across two fields, run every time a record is saved.
            </p>
            <Button onClick={() => handleOpenRuleModal()} className="gap-2 bg-primary font-semibold">
              <Plus className="h-4 w-4" /> Add rule
            </Button>
          </div>

          <div className="border border-border rounded-xl bg-card divide-y divide-border/60 overflow-hidden shadow-sm">
            {master.validationRules?.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                No validation rules defined yet. Click "+ Add rule" to configure cross-field integrity checks.
              </div>
            ) : (
              master.validationRules.map((rule) => (
                <div key={rule.id} className="p-4 flex items-center justify-between hover:bg-muted/40 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-foreground">
                          {rule.ruleName}
                        </span>
                        {!rule.isActive && (
                          <Badge variant="outline" className="text-[11px] text-muted-foreground bg-muted">
                            Turned off
                          </Badge>
                        )}
                      </div>
                      {rule.errorMessage && (
                        <p className="text-xs text-muted-foreground mt-0.5">{rule.errorMessage}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleToggleRuleStatus(rule)}>
                          {rule.isActive ? 'Turn Off Rule' : 'Turn On Rule'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleOpenRuleModal(rule)}>
                          <Edit2 className="h-4 w-4 mr-2" /> Edit Rule
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteRule(rule.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" /> Delete Rule
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 4: UNIQUE CONSTRAINTS */}
      {activeTab === 'unique' && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Configure single-field or compound multi-field uniqueness checks across records in this master.
          </p>
          <div className="border border-border rounded-xl bg-card p-6 space-y-4">
            <h3 className="text-sm font-bold text-foreground">Active Unique Fields</h3>
            <div className="space-y-2">
              {master.fields?.filter((f) => f.isUnique).length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No unique fields specified. Edit any field in the "Fields" tab to enable unique enforcement.
                </p>
              ) : (
                master.fields
                  ?.filter((f) => f.isUnique)
                  .map((f) => (
                    <div key={f.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-background">
                      <div className="flex items-center gap-2">
                        <Key className="h-4 w-4 text-primary" />
                        <span className="font-semibold text-sm text-foreground">{f.fieldName}</span>
                        <span className="font-mono text-xs text-muted-foreground">({f.fieldKey})</span>
                      </div>
                      <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700">
                        Enforced
                      </Badge>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: FILTERING */}
      {activeTab === 'filtering' && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Configure default filter parameters and searchable index attributes for this master.
          </p>
          <div className="border border-border rounded-xl bg-card p-6 space-y-4">
            <h3 className="text-sm font-bold text-foreground">Table Display Columns</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {master.fields?.map((f) => (
                <div key={f.id} className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-background">
                  <span className="text-xs font-medium text-foreground">{f.fieldName}</span>
                  <input
                    type="checkbox"
                    checked={f.showInTable}
                    onChange={async (e) => {
                      await masterBuilderApi.updateField(masterId, f.id, { showInTable: e.target.checked });
                      loadMaster();
                    }}
                    className="h-4 w-4 rounded border-input text-primary focus:ring-primary cursor-pointer"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Field Modal */}
      <Dialog open={isFieldModalOpen} onOpenChange={setIsFieldModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingField ? 'Edit Field' : 'Add Custom Field'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveField} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Field Name *</label>
                <Input
                  placeholder="e.g. Email"
                  value={fName}
                  onChange={(e) => {
                    setFName(e.target.value);
                    if (!editingField) {
                      setFKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'));
                    }
                  }}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground">Field Key *</label>
                  {!editingField && master?.fields?.some((f: any) => (f.fieldKey || f.field_key) === fKey) && fKey && (
                    <span className="text-[10px] text-amber-500 font-medium">Already exists (auto-suffix will be applied)</span>
                  )}
                </div>
                <Input
                  placeholder="e.g. email"
                  value={fKey}
                  onChange={(e) => setFKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                  required
                  className="font-mono text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Field Type</label>
              <select
                value={fType}
                onChange={(e) => {
                  const t = e.target.value;
                  setFType(t);
                  // Auto-set showInTable false for section/image fields
                  if (t === 'section') { setFShowInTable(false); setFRequired(false); setFUnique(false); }
                  if (t === 'image') setFFileAccept('image/*');
                  if (t === 'file') setFFileAccept('*/*');
                  if (t === 'gender' && fGenderOptions.length === 0) {
                    setFGenderOptions(['Male', 'Female', 'Other', 'Prefer not to say']);
                  }
                }}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <optgroup label="Basic">
                  <option value="text">Text Field</option>
                  <option value="number">Number</option>
                  <option value="email">Email</option>
                  <option value="phone">Phone</option>
                  <option value="date">Date</option>
                  <option value="textarea">Textarea (Multi-line)</option>
                  <option value="boolean">Toggle / Switch</option>
                </optgroup>
                <optgroup label="Dropdowns">
                  <option value="choice">Choice / Dropdown (Static List)</option>
                  <option value="lookup">Lookup (Reference another Master)</option>
                  <option value="db_lookup">🗄️ DB Lookup (Live Database)</option>
                </optgroup>
                <optgroup label="Predefined Dropdowns">
                  <option value="gender">⚧ Gender / Sex (Custom Values)</option>
                </optgroup>
                <optgroup label="Media">
                  <option value="image">🖼️ Image Upload</option>
                  <option value="file">📎 File / Document Upload</option>
                </optgroup>
                <optgroup label="Layout">
                  <option value="section">📂 Section Header / Divider</option>
                </optgroup>
              </select>
            </div>

            {fType === 'choice' && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Bind to Choice List</label>
                <select
                  value={fChoiceListId || ''}
                  onChange={(e) => setFChoiceListId(e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">-- Select Choice List --</option>
                  {choiceLists.map((cl) => (
                    <option key={cl.id} value={cl.id}>
                      {cl.name} ({cl.code})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Gender Options Config */}
            {fType === 'gender' && (
              <div className="space-y-3 p-3 rounded-lg border border-pink-200 bg-pink-50 dark:bg-pink-950/20 dark:border-pink-800">
                <div className="flex items-center gap-2">
                  <span className="text-lg">⚧</span>
                  <label className="text-xs font-bold text-pink-700 dark:text-pink-300">Gender / Sex Options</label>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Add or remove values that will appear in the dropdown. Drag order is preserved.
                </p>

                {/* Existing options as tags */}
                <div className="flex flex-wrap gap-1.5 min-h-[36px] p-2 rounded-md border border-input bg-background">
                  {fGenderOptions.map((opt, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-200 border border-pink-200 dark:border-pink-800"
                    >
                      {opt}
                      <button
                        type="button"
                        onClick={() => setFGenderOptions((prev) => prev.filter((_, i) => i !== idx))}
                        className="ml-0.5 hover:text-pink-600 focus:outline-none font-bold leading-none"
                        title="Remove"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  {fGenderOptions.length === 0 && (
                    <span className="text-[11px] text-muted-foreground italic px-1">No options yet — add below</span>
                  )}
                </div>

                {/* Add new option input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={fGenderInputValue}
                    onChange={(e) => setFGenderInputValue(e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.key === 'Enter' || e.key === ',') && fGenderInputValue.trim()) {
                        e.preventDefault();
                        const newVal = fGenderInputValue.trim();
                        if (!fGenderOptions.includes(newVal)) {
                          setFGenderOptions((prev) => [...prev, newVal]);
                        }
                        setFGenderInputValue('');
                      }
                    }}
                    placeholder="Type an option and press Enter"
                    className="flex-1 h-9 px-3 rounded-md border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-pink-400/40"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const newVal = fGenderInputValue.trim();
                      if (newVal && !fGenderOptions.includes(newVal)) {
                        setFGenderOptions((prev) => [...prev, newVal]);
                      }
                      setFGenderInputValue('');
                    }}
                    className="h-9 px-3 rounded-md bg-pink-600 hover:bg-pink-700 text-white text-xs font-semibold transition-colors"
                  >
                    + Add
                  </button>
                </div>

                {/* Quick presets */}
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Quick Presets</p>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: 'Standard (3)', vals: ['Male', 'Female', 'Other'] },
                      { label: 'Inclusive (4)', vals: ['Male', 'Female', 'Non-binary', 'Prefer not to say'] },
                      { label: 'HR Formal', vals: ['Male', 'Female', 'Transgender', 'Other', 'Prefer not to say'] },
                      { label: 'Binary only', vals: ['Male', 'Female'] },
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => { setFGenderOptions(preset.vals); setFGenderInputValue(''); }}
                        className="px-2.5 py-1 rounded-full text-[11px] font-medium border border-pink-300 text-pink-700 bg-white hover:bg-pink-100 dark:bg-transparent dark:text-pink-300 dark:border-pink-700 dark:hover:bg-pink-900/30 transition-colors"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {fType === 'lookup' && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Referenced Master</label>
                <select
                  value={fLookupMasterId || ''}
                  onChange={(e) => setFLookupMasterId(e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">-- Select Master --</option>
                  {allMasters
                    .filter((m) => m.id !== masterId)
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.code})
                      </option>
                    ))}
                </select>
              </div>
            )}

            {/* DB Lookup Entity Selector */}
            {fType === 'db_lookup' && (
              <div className="space-y-1.5 p-3 rounded-lg border border-primary/20 bg-primary/5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  🗄️ Database Entity *
                </label>
                <select
                  value={fDbLookupEntity}
                  onChange={(e) => setFDbLookupEntity(e.target.value)}
                  required
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">-- Select Database Entity --</option>
                  <optgroup label="Core HR Entities">
                    <option value="companies">Companies</option>
                    <option value="departments">Departments</option>
                    <option value="designations">Designations</option>
                    <option value="locations">Locations</option>
                    <option value="employees">Employees</option>
                  </optgroup>
                  <optgroup label="Master Lists">
                    <option value="grades">Grades</option>
                    <option value="employee_status">Employee Status</option>
                    <option value="employment_type">Employment Type</option>
                  </optgroup>
                </select>
                <p className="text-[11px] text-muted-foreground">
                  Dropdown will auto-populate from your live database when filling records.
                </p>
              </div>
            )}

            {/* Image / File Upload Config */}
            {(fType === 'image' || fType === 'file') && (
              <div className="space-y-1.5 p-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
                <label className="text-xs font-semibold text-foreground">Accepted File Types</label>
                <select
                  value={fFileAccept}
                  onChange={(e) => setFFileAccept(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {fType === 'image' ? (
                    <>
                      <option value="image/*">Any Image (PNG, JPG, GIF, WebP)</option>
                      <option value="image/png">PNG Only</option>
                      <option value="image/jpeg">JPEG / JPG Only</option>
                      <option value="image/svg+xml">SVG Only</option>
                    </>
                  ) : (
                    <>
                      <option value="*/*">Any File</option>
                      <option value="application/pdf">PDF Only</option>
                      <option value=".doc,.docx">Word Document</option>
                      <option value=".xls,.xlsx">Excel Spreadsheet</option>
                      <option value="image/*">Images Only</option>
                      <option value="image/*,application/pdf">Images + PDF</option>
                    </>
                  )}
                </select>
                <p className="text-[11px] text-muted-foreground">
                  {fType === 'image' ? 'Image will be stored as base64 — keep files under 2MB for best performance.' : 'File stored as base64 — keep under 2MB.'}
                </p>
              </div>
            )}

            {/* Section Header Config */}
            {fType === 'section' && (
              <div className="space-y-3 p-3 rounded-lg border border-sky-200 bg-sky-50 dark:bg-sky-950/20 dark:border-sky-800">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                  <label className="text-xs font-bold text-sky-700 dark:text-sky-300">
                    Numbered Section Group Config (Company Master Style)
                  </label>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Groups all fields following this section into a dedicated card with number, icon, and title (like Company Master Form).
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="space-y-1 sm:col-span-1">
                    <label className="text-xs font-semibold text-foreground">Section #</label>
                    <input
                      type="text"
                      value={fSectionNumber}
                      onChange={(e) => setFSectionNumber(e.target.value)}
                      placeholder="e.g. 1"
                      className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm font-bold text-center focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-3">
                    <label className="text-xs font-semibold text-foreground">Section Title *</label>
                    <input
                      type="text"
                      value={fSectionTitle}
                      onChange={(e) => setFSectionTitle(e.target.value)}
                      placeholder="e.g. Company Profile & Identification"
                      className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Section Icon</label>
                  <select
                    value={fSectionIcon}
                    onChange={(e) => setFSectionIcon(e.target.value)}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="building">🏢 Building / Company / Profile</option>
                    <option value="map-pin">📍 Map Pin / Headquarters Address / Location</option>
                    <option value="file-check">📄 File Check / Statutory & Contact / PAN</option>
                    <option value="image">🖼️ Image / Branding Assets & Media / Logo</option>
                    <option value="shield">🛡️ Shield / Status & System Controls / Access</option>
                    <option value="key">🔑 Key / System Access Credentials / Auth</option>
                    <option value="user">👤 User / Profile / Employee Master</option>
                    <option value="phone">📞 Phone / Contact Communication</option>
                    <option value="mail">✉️ Mail / Corporate Email</option>
                    <option value="sliders">🎛️ Sliders / Preferences & Configurations</option>
                    <option value="globe">🌐 Globe / International & Online</option>
                    <option value="tag">🏷️ Tag / General Category</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Section Description (optional)</label>
                  <input
                    type="text"
                    value={fSectionDesc}
                    onChange={(e) => setFSectionDesc(e.target.value)}
                    placeholder="e.g. Configure company profile, establishment address and details"
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <label className="text-xs font-semibold text-foreground">Accent Color</label>
                  <input
                    type="color"
                    value={fSectionColor}
                    onChange={(e) => setFSectionColor(e.target.value)}
                    className="h-8 w-14 rounded cursor-pointer border border-input"
                  />
                  <span className="text-xs font-mono text-muted-foreground">{fSectionColor}</span>
                </div>
              </div>
            )}

            {/* Assign to Section Group (For non-section fields) */}
            {fType !== 'section' && existingSections.length > 0 && (
              <div className="space-y-1.5 p-3 rounded-lg border border-border/80 bg-muted/20">
                <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>Assign to Section / Group (Optional)</span>
                  <span className="text-[10px] text-muted-foreground">Company Form Style</span>
                </label>
                <select
                  value={fSectionKey}
                  onChange={(e) => setFSectionKey(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">-- Auto (Follows section header order in list) --</option>
                  {existingSections.map((sec: any) => {
                    const sOpts = sec.optionsJson || sec.options_json || {};
                    const sNum = sOpts.sectionNumber ? `${sOpts.sectionNumber}. ` : '';
                    const sTitle = sOpts.sectionTitle || sec.fieldName || sec.field_name;
                    return (
                      <option key={sec.id} value={sec.fieldKey || sec.field_key}>
                        {sNum}{sTitle}
                      </option>
                    );
                  })}
                </select>
                <p className="text-[11px] text-muted-foreground">
                  Places this field inside the selected section card when viewed in grouped format.
                </p>
              </div>
            )}

            {/* Column Width */}
            {fType !== 'section' && fType !== 'textarea' && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Column Width in Form</label>
                <select
                  value={fColSpan}
                  onChange={(e) => setFColSpan(Number(e.target.value) as 1 | 2)}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value={2}>Half Width (2 columns per row)</option>
                  <option value={1}>Full Width (1 column, entire row)</option>
                </select>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Help Text (Shown on form)</label>
              <Input
                placeholder="e.g. Enter Email in proper Format"
                value={fHelpText}
                onChange={(e) => setFHelpText(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Placeholder</label>
              <Input
                placeholder="e.g. name@company.com"
                value={fPlaceholder}
                onChange={(e) => setFPlaceholder(e.target.value)}
              />
            </div>

            {/* Behaviour check boxes — hidden for section fields */}
            {fType !== 'section' && (
              <div className="space-y-2 pt-2 border-t border-border">
                <label className="text-xs font-semibold text-foreground block">Field Behaviour</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={fRequired}
                      onChange={(e) => setFRequired(e.target.checked)}
                      className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                    />
                    <span>Required field (Must be entered)</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={fUnique}
                      onChange={(e) => setFUnique(e.target.checked)}
                      className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                    />
                    <span>Unique constraint (Values cannot repeat)</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={fShowInTable}
                      onChange={(e) => setFShowInTable(e.target.checked)}
                      className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                    />
                    <span>Show as column in records table</span>
                  </label>
                </div>
              </div>
            )}

            <DialogFooter className="pt-3 border-t border-border">
              <Button type="button" variant="outline" onClick={() => setIsFieldModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingField ? 'Update Field' : 'Add Field'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Validation Rule Modal */}
      <Dialog open={isRuleModalOpen} onOpenChange={setIsRuleModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingRule ? 'Edit Validation Rule' : 'Add Validation Rule'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveRule} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Rule Name *</label>
              <Input
                placeholder="e.g. Email ≥ Establishment Code No"
                value={rName}
                onChange={(e) => setRName(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Primary Field A *</label>
                <select
                  value={rFieldA}
                  onChange={(e) => setRFieldA(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {master.fields?.map((f) => (
                    <option key={f.id} value={f.fieldKey}>
                      {f.fieldName} ({f.fieldKey})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Operator</label>
                <select
                  value={rOperator}
                  onChange={(e) => setROperator(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value=">=">&ge; (Greater than or equal)</option>
                  <option value="<=">&le; (Less than or equal)</option>
                  <option value="==">== (Equals)</option>
                  <option value="!=">!= (Does not equal)</option>
                  <option value="required_if">Required If</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Compare With Field B</label>
              <select
                value={rFieldB}
                onChange={(e) => setRFieldB(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">-- None (Use static custom value) --</option>
                {master.fields?.map((f) => (
                  <option key={f.id} value={f.fieldKey}>
                    {f.fieldName} ({f.fieldKey})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Error Message shown when rule fails</label>
              <Input
                placeholder="e.g. Email must be valid and establishment code formatted"
                value={rErrorMessage}
                onChange={(e) => setRErrorMessage(e.target.value)}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsRuleModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingRule ? 'Update Rule' : 'Save Rule'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default MasterBuilderDetailPage;
