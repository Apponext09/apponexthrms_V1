import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Boxes,
  Plus,
  Search,
  MoreVertical,
  Edit2,
  Trash2,
  Layers,
  Building2,
  Users,
  Briefcase,
  Sliders,
  Settings2,
  FileSpreadsheet,
  HelpCircle,
  X,
  ChevronLeft,
  ChevronRight,
  Database,
  ListPlus,
  Table as TableIcon
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
import { masterBuilderApi, CustomMasterItem, ChoiceListItem } from '../api/masterBuilderApi';

export function MasterBuilderPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'masters' | 'choice_lists'>('masters');
  const [loading, setLoading] = useState(true);
  const [masters, setMasters] = useState<CustomMasterItem[]>([]);
  const [choiceLists, setChoiceLists] = useState<ChoiceListItem[]>([]);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Active' | 'all' | 'Inactive'>('Active');
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Modals
  const [isCreateMasterOpen, setIsCreateMasterOpen] = useState(false);
  const [editingMaster, setEditingMaster] = useState<CustomMasterItem | null>(null);

  // Form states for Create/Edit Master
  const [formName, setFormName] = useState('');
  const [formPluralName, setFormPluralName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formEmployeeLinkage, setFormEmployeeLinkage] = useState('none');
  const [formDescription, setFormDescription] = useState('');
  const [formHasHierarchy, setFormHasHierarchy] = useState(false);
  const [formHasHistory, setFormHasHistory] = useState(false);
  const [formSaving, setFormSaving] = useState(false);

  // Choice List Modal
  const [isChoiceListModalOpen, setIsChoiceListModalOpen] = useState(false);
  const [editingChoiceList, setEditingChoiceList] = useState<ChoiceListItem | null>(null);
  const [clName, setClName] = useState('');
  const [clCode, setClCode] = useState('');
  const [clDescription, setClDescription] = useState('');
  const [clOptions, setClOptions] = useState<Array<{ label: string; value: string; color?: string }>>([
    { label: 'Option 1', value: 'opt_1' },
    { label: 'Option 2', value: 'opt_2' },
  ]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [mList, cList] = await Promise.all([
        masterBuilderApi.getMasters(),
        masterBuilderApi.getChoiceLists(),
      ]);
      setMasters(mList);
      setChoiceLists(cList);
    } catch (err) {
      console.error('Failed to load master builder data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredMasters = useMemo(() => {
    let list = masters;
    if (statusFilter !== 'all') {
      list = list.filter((m) => m.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((m) => m.name.toLowerCase().includes(q) || m.code.toLowerCase().includes(q));
    }
    return list;
  }, [masters, statusFilter, searchQuery]);

  const totalPages = Math.ceil(filteredMasters.length / rowsPerPage) || 1;
  const paginatedMasters = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return filteredMasters.slice(start, start + rowsPerPage);
  }, [filteredMasters, page, rowsPerPage]);

  const handleOpenCreateMaster = (master?: CustomMasterItem) => {
    if (master) {
      setEditingMaster(master);
      setFormName(master.name);
      setFormPluralName(master.pluralName || '');
      setFormCode(master.code);
      setFormEmployeeLinkage(master.employeeLinkage || 'none');
      setFormDescription(master.description || '');
      setFormHasHierarchy(Boolean(master.hasHierarchy));
      setFormHasHistory(Boolean(master.hasHistory));
    } else {
      setEditingMaster(null);
      setFormName('');
      setFormPluralName('');
      setFormCode('');
      setFormEmployeeLinkage('none');
      setFormDescription('');
      setFormHasHierarchy(false);
      setFormHasHistory(false);
    }
    setIsCreateMasterOpen(true);
  };

  const handleNameChange = (val: string) => {
    setFormName(val);
    if (!editingMaster) {
      // Auto generate plural and code
      if (!formPluralName || formPluralName === `${formName}s`) {
        setFormPluralName(val ? `${val}s` : '');
      }
      const slug = val.toLowerCase().trim().replace(/[^a-z0-9_]/g, '_');
      setFormCode(slug);
    }
  };

  const handleSaveMaster = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formCode.trim()) return;
    setFormSaving(true);
    try {
      if (editingMaster) {
        await masterBuilderApi.updateMaster(editingMaster.id, {
          name: formName.trim(),
          pluralName: formPluralName.trim(),
          code: formCode.trim(),
          employeeLinkage: formEmployeeLinkage,
          description: formDescription.trim(),
          hasHierarchy: formHasHierarchy,
          hasHistory: formHasHistory,
        });
        setIsCreateMasterOpen(false);
        loadData();
      } else {
        const created = await masterBuilderApi.createMaster({
          name: formName.trim(),
          pluralName: formPluralName.trim(),
          code: formCode.trim(),
          employeeLinkage: formEmployeeLinkage,
          description: formDescription.trim(),
          hasHierarchy: formHasHierarchy,
          hasHistory: formHasHistory,
        });
        setIsCreateMasterOpen(false);
        if (created?.id) {
          navigate(`/masters/builder/${created.id}`);
        } else {
          loadData();
        }
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || err.message || 'Failed to save master');
    } finally {
      setFormSaving(false);
    }
  };

  const handleDeleteMaster = async (id: number, name: string) => {
    if (window.confirm(`Are you sure you want to delete custom master "${name}"? All associated fields and records will be deleted.`)) {
      try {
        await masterBuilderApi.deleteMaster(id);
        loadData();
      } catch (err) {
        alert('Failed to delete master');
      }
    }
  };

  const handleExportCSV = () => {
    const headers = ['Master Name', 'System Code', 'Fields Count', 'Records Count', 'Status'];
    const rows = filteredMasters.map((m) => [
      m.name,
      m.code,
      m.fieldsCount,
      m.recordsCount,
      m.status,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `masters_builder_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Choice List Handlers
  const handleOpenChoiceListModal = (cl?: ChoiceListItem) => {
    if (cl) {
      setEditingChoiceList(cl);
      setClName(cl.name);
      setClCode(cl.code);
      setClDescription(cl.description || '');
      setClOptions(cl.options || []);
    } else {
      setEditingChoiceList(null);
      setClName('');
      setClCode('');
      setClDescription('');
      setClOptions([
        { label: 'Option 1', value: 'opt_1' },
        { label: 'Option 2', value: 'opt_2' },
      ]);
    }
    setIsChoiceListModalOpen(true);
  };

  const handleSaveChoiceList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clName.trim() || !clCode.trim()) return;
    try {
      if (editingChoiceList) {
        await masterBuilderApi.updateChoiceList(editingChoiceList.id, {
          name: clName.trim(),
          code: clCode.trim(),
          description: clDescription.trim(),
          options: clOptions,
        });
      } else {
        await masterBuilderApi.createChoiceList({
          name: clName.trim(),
          code: clCode.trim(),
          description: clDescription.trim(),
          options: clOptions,
        });
      }
      setIsChoiceListModalOpen(false);
      const res = await masterBuilderApi.getChoiceLists();
      setChoiceLists(res);
    } catch (err: any) {
      alert(err?.response?.data?.message || err.message || 'Failed to save choice list');
    }
  };

  const handleDeleteChoiceList = async (id: number) => {
    if (window.confirm('Delete this choice list?')) {
      await masterBuilderApi.deleteChoiceList(id);
      const res = await masterBuilderApi.getChoiceLists();
      setChoiceLists(res);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Boxes className="h-6 w-6 text-primary" />
          Master Builder
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Define your own reference data — cost centres, vendors, asset categories — with their own fields, permissions and reports.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border gap-8 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('masters')}
          className={`pb-3 border-b-2 transition-colors uppercase tracking-wider text-xs font-bold ${
            activeTab === 'masters'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Masters
        </button>
        <button
          onClick={() => setActiveTab('choice_lists')}
          className={`pb-3 border-b-2 transition-colors uppercase tracking-wider text-xs font-bold ${
            activeTab === 'choice_lists'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Choice Lists
        </button>
      </div>

      {activeTab === 'masters' ? (
        <div className="space-y-4">
          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10 bg-background"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="h-10 px-4 rounded-md border border-input bg-primary text-primary-foreground font-medium text-sm focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
              >
                <option value="Active" className="bg-background text-foreground">Active</option>
                <option value="all" className="bg-background text-foreground">All</option>
                <option value="Inactive" className="bg-background text-foreground">Inactive</option>
              </select>

              <Button
                variant="outline"
                size="icon"
                onClick={handleExportCSV}
                title="Export CSV"
                className="h-10 w-10 text-primary border-primary/20 hover:bg-primary/5"
              >
                <FileSpreadsheet className="h-4 w-4" />
              </Button>

              <Button
                onClick={() => handleOpenCreateMaster()}
                className="h-10 px-4 gap-2 bg-primary text-primary-foreground font-semibold hover:bg-primary/90"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Masters Table */}
          <div className="border border-border rounded-xl bg-card overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border/80 bg-primary/5 text-xs uppercase tracking-wider text-muted-foreground font-bold">
                    <th className="py-3.5 px-4 font-bold text-foreground/80">Master ↑↓</th>
                    <th className="py-3.5 px-4 font-bold text-foreground/80">Code ↑↓</th>
                    <th className="py-3.5 px-4 font-bold text-foreground/80">Fields ↑↓</th>
                    <th className="py-3.5 px-4 font-bold text-foreground/80">Records ↑↓</th>
                    <th className="py-3.5 px-4 font-bold text-foreground/80">Status ↑↓</th>
                    <th className="py-3.5 px-4 text-right font-bold text-foreground/80">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-muted-foreground">
                        Loading master definitions...
                      </td>
                    </tr>
                  ) : paginatedMasters.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-muted-foreground">
                        No custom masters found. Click "+" to create your first custom master.
                      </td>
                    </tr>
                  ) : (
                    paginatedMasters.map((m) => (
                      <tr
                        key={m.id}
                        className="hover:bg-muted/40 transition-colors group cursor-pointer"
                        onClick={() => navigate(`/masters/builder/${m.id}`)}
                      >
                        <td className="py-4 px-4 font-medium text-foreground">
                          <div className="flex items-center gap-3">
                            <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                              <Boxes className="h-4 w-4" />
                            </div>
                            <span className="font-semibold text-foreground group-hover:text-primary transition-colors">
                              {m.name}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4 font-mono text-xs text-muted-foreground">
                          {m.code}
                        </td>
                        <td className="py-4 px-4 text-foreground font-medium">
                          {m.fieldsCount}
                        </td>
                        <td className="py-4 px-4 text-foreground font-medium">
                          {m.recordsCount}
                        </td>
                        <td className="py-4 px-4">
                          <Badge
                            variant="secondary"
                            className={
                              m.status === 'Active'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                                : 'bg-muted text-muted-foreground'
                            }
                          >
                            {m.status}
                          </Badge>
                        </td>
                        <td className="py-4 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem onClick={() => navigate(`/masters/builder/${m.id}`)}>
                                <Settings2 className="h-4 w-4 mr-2" />
                                Manage Fields & Rules
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => navigate(`/masters?tab=${m.code}`)}>
                                <TableIcon className="h-4 w-4 mr-2" />
                                View Master Records
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleOpenCreateMaster(m)}>
                                <Edit2 className="h-4 w-4 mr-2" />
                                Edit Master Info
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDeleteMaster(m.id, m.name)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Master
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

            {/* Pagination footer */}
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
                  {filteredMasters.length > 0
                    ? `${(page - 1) * rowsPerPage + 1}-${Math.min(page * rowsPerPage, filteredMasters.length)} of ${filteredMasters.length}`
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
        </div>
      ) : (
        /* Choice Lists Tab */
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Define reusable dropdown options lists that can be bound to choice/dropdown fields across custom masters.
            </p>
            <Button onClick={() => handleOpenChoiceListModal()} className="gap-2">
              <Plus className="h-4 w-4" /> Add Choice List
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {choiceLists.map((cl) => (
              <div key={cl.id} className="border border-border rounded-xl p-4 bg-card shadow-sm space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-foreground">{cl.name}</h3>
                    <span className="font-mono text-xs text-muted-foreground">{cl.code}</span>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleOpenChoiceListModal(cl)}>
                        <Edit2 className="h-4 w-4 mr-2" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDeleteChoiceList(cl.id)} className="text-destructive">
                        <Trash2 className="h-4 w-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {cl.description && <p className="text-xs text-muted-foreground">{cl.description}</p>}

                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border">
                  {(cl.options || []).map((opt, i) => (
                    <Badge key={i} variant="outline" className="text-xs bg-muted/50">
                      {opt.label}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create / Edit Custom Master Modal (Image 2) */}
      <Dialog open={isCreateMasterOpen} onOpenChange={setIsCreateMasterOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0">
          <div className="p-6 border-b border-border bg-card">
            <div className="flex items-center gap-3">
              <div className="size-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-md">
                <Boxes className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-foreground">
                  {editingMaster ? 'Edit custom master' : 'Create custom master'}
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Define the entity, how it keeps history, and how its records are scoped.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSaveMaster} className="p-6 space-y-6">
            {/* Section 1: Basic information */}
            <div className="border border-border/80 rounded-xl p-5 bg-card/60 space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                <Boxes className="h-4 w-4 text-primary" />
                Basic information
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                    Master name <span className="text-destructive">*</span>
                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                  </label>
                  <Input
                    placeholder="e.g. Cost Centre"
                    value={formName}
                    onChange={(e) => handleNameChange(e.target.value)}
                    required
                    className="h-10"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                    Plural name
                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                  </label>
                  <Input
                    placeholder="e.g. Cost Centres"
                    value={formPluralName}
                    onChange={(e) => setFormPluralName(e.target.value)}
                    className="h-10"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                    System code <span className="text-destructive">*</span>
                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                  </label>
                  <Input
                    placeholder="cost_centre"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                    required
                    className="h-10 font-mono text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                    Employee profile linkage
                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                  </label>
                  <select
                    value={formEmployeeLinkage}
                    onChange={(e) => setFormEmployeeLinkage(e.target.value)}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="none">None (stand-alone master)</option>
                    <option value="primary_assignment">Primary Employee Assignment</option>
                    <option value="secondary_linkage">Secondary Attribute Linkage</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  Description
                  <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                </label>
                <textarea
                  placeholder="What this master is for..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={3}
                  className="w-full p-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>
            </div>

            {/* Section 2: Hierarchy & history */}
            <div className="border border-border/80 rounded-xl p-5 bg-card/60 space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                <Sliders className="h-4 w-4 text-primary" />
                Hierarchy & history
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-background">
                <div>
                  <span className="text-sm font-medium text-foreground flex items-center gap-1.5">
                    Parent-child hierarchy
                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                  </span>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Allow records in this master to nest inside parent records of the same master
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={formHasHierarchy}
                  onChange={(e) => setFormHasHierarchy(e.target.checked)}
                  className="h-5 w-5 rounded border-input text-primary focus:ring-primary cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-background">
                <div>
                  <span className="text-sm font-medium text-foreground flex items-center gap-1.5">
                    History & effective dating
                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                  </span>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Keep version history with effective start and end dates
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={formHasHistory}
                  onChange={(e) => setFormHasHistory(e.target.checked)}
                  className="h-5 w-5 rounded border-input text-primary focus:ring-primary cursor-pointer"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border">
              <Button type="button" variant="outline" onClick={() => setIsCreateMasterOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={formSaving} className="bg-primary hover:bg-primary/90">
                {formSaving ? 'Saving...' : editingMaster ? 'Update Master' : 'Create & continue'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Choice List Modal */}
      <Dialog open={isChoiceListModalOpen} onOpenChange={setIsChoiceListModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingChoiceList ? 'Edit Choice List' : 'Create Choice List'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveChoiceList} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">List Name *</label>
              <Input
                placeholder="e.g. Priority Levels"
                value={clName}
                onChange={(e) => {
                  setClName(e.target.value);
                  if (!editingChoiceList) {
                    setClCode(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'));
                  }
                }}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">List Code *</label>
              <Input
                placeholder="priority_levels"
                value={clCode}
                onChange={(e) => setClCode(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">Options</label>
              {clOptions.map((opt, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <Input
                    placeholder="Label (e.g. High)"
                    value={opt.label}
                    onChange={(e) => {
                      const updated = [...clOptions];
                      updated[idx].label = e.target.value;
                      updated[idx].value = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_');
                      setClOptions(updated);
                    }}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setClOptions(clOptions.filter((_, i) => i !== idx))}
                    disabled={clOptions.length <= 1}
                  >
                    <X className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setClOptions([...clOptions, { label: `Option ${clOptions.length + 1}`, value: `opt_${clOptions.length + 1}` }])}
                className="w-full mt-2"
              >
                + Add Option
              </Button>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsChoiceListModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Save Choice List</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default MasterBuilderPage;
