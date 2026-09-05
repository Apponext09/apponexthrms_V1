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

  // Field Handlers
  const handleOpenFieldModal = (field?: any) => {
    if (field) {
      setEditingField(field);
      setFName(field.fieldName || field.field_name || '');
      setFKey(field.fieldKey || field.field_key || '');
      setFType(field.fieldType || field.field_type || 'text');
      setFRequired(Boolean(field.isRequired ?? field.is_required));
      setFUnique(Boolean(field.isUnique ?? field.is_unique));
      setFShowInTable(Boolean(field.showInTable ?? field.show_in_table ?? true));
      setFHelpText(field.helpText || field.help_text || '');
      setFPlaceholder(field.placeholder || '');
      setFDefaultValue(field.defaultValue || field.default_value || '');
      setFChoiceListId(field.choiceListId || field.choice_list_id);
      setFLookupMasterId(field.lookupMasterId || field.lookup_master_id);
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
    }
    setIsFieldModalOpen(true);
  };

  const handleSaveField = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fName.trim() || !fKey.trim()) return;

    try {
      if (editingField) {
        await masterBuilderApi.updateField(masterId, editingField.id, {
          fieldName: fName.trim(),
          fieldKey: fKey.trim(),
          fieldType: fType,
          isRequired: fRequired,
          isUnique: fUnique,
          showInTable: fShowInTable,
          helpText: fHelpText.trim(),
          placeholder: fPlaceholder.trim(),
          defaultValue: fDefaultValue.trim(),
          choiceListId: fChoiceListId,
          lookupMasterId: fLookupMasterId,
        });
      } else {
        const created = await masterBuilderApi.addField(masterId, {
          fieldName: fName.trim(),
          fieldKey: fKey.trim(),
          fieldType: fType,
          isRequired: fRequired,
          isUnique: fUnique,
          showInTable: fShowInTable,
          helpText: fHelpText.trim(),
          placeholder: fPlaceholder.trim(),
          defaultValue: fDefaultValue.trim(),
          choiceListId: fChoiceListId,
          lookupMasterId: fLookupMasterId,
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

  const handleDeleteField = async (fieldId: number, fieldName: string) => {
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
          className={`pb-3 border-b-2 transition-colors uppercase tracking-wider text-xs font-bold whitespace-nowrap ${
            activeTab === 'fields'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Fields ({master.fields?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('autofill')}
          className={`pb-3 border-b-2 transition-colors uppercase tracking-wider text-xs font-bold whitespace-nowrap ${
            activeTab === 'autofill'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Autofill Mappings
        </button>
        <button
          onClick={() => setActiveTab('rules')}
          className={`pb-3 border-b-2 transition-colors uppercase tracking-wider text-xs font-bold whitespace-nowrap ${
            activeTab === 'rules'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Validation Rules
        </button>
        <button
          onClick={() => setActiveTab('unique')}
          className={`pb-3 border-b-2 transition-colors uppercase tracking-wider text-xs font-bold whitespace-nowrap ${
            activeTab === 'unique'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Unique Constraints
        </button>
        <button
          onClick={() => setActiveTab('filtering')}
          className={`pb-3 border-b-2 transition-colors uppercase tracking-wider text-xs font-bold whitespace-nowrap ${
            activeTab === 'filtering'
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
            <Button onClick={() => handleOpenFieldModal()} className="gap-2 h-10 bg-primary font-semibold">
              <Plus className="h-4 w-4" /> Add field
            </Button>
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
                  return (
                    <div
                      key={field.id}
                      onClick={() => setSelectedFieldId(field.id)}
                      className={`p-4 flex items-center justify-between transition-colors cursor-pointer group ${
                        isSelected ? 'bg-primary/5 border-l-4 border-l-primary' : 'hover:bg-muted/40'
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
                              onClick={() => handleDeleteField(field.id, fieldName)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" /> Delete Field
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
                <label className="text-xs font-semibold text-foreground">Field Key *</label>
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
                onChange={(e) => setFType(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="text">Text Field</option>
                <option value="number">Number</option>
                <option value="email">Email</option>
                <option value="phone">Phone</option>
                <option value="date">Date</option>
                <option value="choice">Choice / Dropdown</option>
                <option value="textarea">Textarea (Multi-line)</option>
                <option value="lookup">Lookup (Reference another Master)</option>
                <option value="boolean">Toggle / Switch</option>
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

            {/* Behaviour check boxes */}
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
