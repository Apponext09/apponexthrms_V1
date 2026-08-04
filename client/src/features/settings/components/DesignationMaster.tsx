import React, { useState, useMemo } from 'react';
import { useDesignations, useDummyMappings, Designation } from '../hooks/useDesignations';
import { Search, Users, Plus, X, CheckCircle2, XCircle, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface DesignationMasterProps {
  onCancel?: () => void;
}

export function DesignationMaster({ onCancel }: DesignationMasterProps) {
  const { designations, isLoading, createDesignation, updateDesignation, deleteDesignation } = useDesignations();
  const mappings = useDummyMappings();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDesignationFilter, setSelectedDesignationFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedDesignationId, setSelectedDesignationId] = useState<string | number | 'NEW' | null>('NEW');

  const [formData, setFormData] = useState<Partial<Designation>>({
    name: '',
    code: '',
    status: 'active',
    mapped_companies: [],
    mapped_locations: [],
    mapped_departments: [],
    mapped_shifts: [],
    mapped_grades: [],
  });

  const [expandedAccordion, setExpandedAccordion] = useState<string | null>(null);

  const filteredDesignations = useMemo(() => {
    let result = designations;
    
    // Name filter
    if (selectedDesignationFilter) {
      result = result.filter(d => d.name === selectedDesignationFilter);
    }
    
    // Status filter
    if (statusFilter !== 'All') {
      result = result.filter(d => (d.status || 'active').toLowerCase() === statusFilter.toLowerCase());
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(d => d.name.toLowerCase().includes(q) || d.code?.toLowerCase().includes(q));
    }
    
    return result;
  }, [designations, searchQuery, selectedDesignationFilter, statusFilter]);

  const uniqueDesignationNames = useMemo(() => {
    const names = designations.map(d => d.name);
    return Array.from(new Set(names)).sort();
  }, [designations]);

  const handleSelect = (desig: Designation) => {
    setSelectedDesignationId(desig.id);
    setFormData({
      name: desig.name,
      code: desig.code || '',
      status: desig.status || 'active',
      mapped_companies: Array.isArray(desig.mapped_companies) ? desig.mapped_companies : (typeof desig.mapped_companies === 'string' ? JSON.parse(desig.mapped_companies) : []),
      mapped_locations: Array.isArray(desig.mapped_locations) ? desig.mapped_locations : (typeof desig.mapped_locations === 'string' ? JSON.parse(desig.mapped_locations) : []),
      mapped_departments: Array.isArray(desig.mapped_departments) ? desig.mapped_departments : (typeof desig.mapped_departments === 'string' ? JSON.parse(desig.mapped_departments) : []),
      mapped_shifts: Array.isArray(desig.mapped_shifts) ? desig.mapped_shifts : (typeof desig.mapped_shifts === 'string' ? JSON.parse(desig.mapped_shifts) : []),
      mapped_grades: Array.isArray(desig.mapped_grades) ? desig.mapped_grades : (typeof desig.mapped_grades === 'string' ? JSON.parse(desig.mapped_grades) : []),
    });
  };

  const handleAddNew = () => {
    setSelectedDesignationId('NEW');
    setFormData({
      name: '',
      code: `DES-${Math.floor(100 + Math.random() * 900)}`,
      status: 'active',
      mapped_companies: [],
      mapped_locations: [],
      mapped_departments: [],
      mapped_shifts: [],
      mapped_grades: [],
    });
  };

  const toggleAccordion = (name: string) => {
    setExpandedAccordion(prev => prev === name ? null : name);
  };

  const handleCheckbox = (field: keyof Designation, id: string | number) => {
    const strId = String(id);
    const current = (formData[field] as string[]) || [];
    if (current.includes(strId)) {
      setFormData({ ...formData, [field]: current.filter(x => x !== strId) });
    } else {
      setFormData({ ...formData, [field]: [...current, strId] });
    }
  };

  const handleSave = async () => {
    if (!formData.name?.trim()) {
      toast.error('Designation Name is required.');
      return;
    }
    
    try {
      if (selectedDesignationId === 'NEW') {
        await createDesignation(formData);
        toast.success('Designation created successfully!');
        handleAddNew();
      } else if (selectedDesignationId) {
        await updateDesignation({ id: selectedDesignationId, data: formData });
        toast.success('Designation updated successfully!');
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'An error occurred while saving.');
    }
  };

  const renderAccordion = (title: string, field: keyof Designation, dataList: any[]) => {
    const isExpanded = expandedAccordion === title;
    const selectedCount = (formData[field] as string[])?.length || 0;

    return (
      <div className="border border-border/60 rounded-md overflow-hidden bg-background mb-3 shadow-xs">
        <button
          type="button"
          className="w-full flex items-center justify-between p-3 bg-muted/40 hover:bg-muted/60 transition-colors"
          onClick={() => toggleAccordion(title)}
        >
          <div className="flex items-center gap-2">
            <span className="font-mono text-muted-foreground font-bold">{isExpanded ? '[-]' : '[+]'}</span>
            <span className="font-semibold text-sm text-foreground">{title}</span>
          </div>
          {selectedCount > 0 && (
            <Badge className="bg-primary/90 text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center p-0 text-[10px]">
              {selectedCount}
            </Badge>
          )}
        </button>
        {isExpanded && (
          <div className="p-3 bg-background border-t border-border/60 max-h-40 overflow-y-auto space-y-2">
            {dataList.length === 0 ? (
              <p className="text-xs text-muted-foreground">No data available.</p>
            ) : (
              dataList.map(item => {
                const strId = String(item.id);
                const isChecked = ((formData[field] as string[]) || []).includes(strId);
                return (
                  <label key={item.id} className="flex items-center gap-2 cursor-pointer p-1.5 hover:bg-muted/50 rounded-md">
                    <input
                      type="checkbox"
                      className="rounded border-input text-primary focus:ring-primary w-4 h-4"
                      checked={isChecked}
                      onChange={() => handleCheckbox(field, item.id)}
                    />
                    <span className="text-sm font-medium">{item.name}</span>
                  </label>
                );
              })
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 items-start min-h-[calc(100vh-140px)] w-full">
      {/* Right Column (Now on Left) - Form */}
      <div className="w-full md:w-2/3 bg-card border border-border/80 rounded-xl shadow-xs flex flex-col">
        <div className="p-4 border-b border-border/60">
          <h2 className="font-bold flex items-center gap-2 text-foreground">
            <EditIcon className="w-4 h-4 text-muted-foreground" />
            {selectedDesignationId === 'NEW' ? 'Add' : 'Update'} Designation Information
          </h2>
        </div>
        <div className="flex-1 p-5">
              <div className="w-full space-y-5">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">Designation Name <span className="text-rose-500">*</span></label>
                  <Input
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. ACCOUNTANT"
                    className="uppercase h-10 font-medium max-w-md"
                  />
                </div>

                <div className="space-y-2">
                  {renderAccordion('Company', 'mapped_companies', mappings.companies)}
                  {renderAccordion('Location', 'mapped_locations', mappings.locations)}
                  {renderAccordion('Department', 'mapped_departments', mappings.departments)}
                  {renderAccordion('Shift', 'mapped_shifts', mappings.shifts)}
                  {renderAccordion('Grade', 'mapped_grades', mappings.grades)}
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">Active</label>
                  <div className="flex bg-muted/30 rounded-md border border-input w-24 overflow-hidden h-9">
                    <button
                      type="button"
                      className={`flex-1 text-xs font-bold transition-colors ${formData.status === 'active' ? 'bg-[#337b8c] text-white' : 'text-muted-foreground hover:bg-muted/50'}`}
                      onClick={() => setFormData({ ...formData, status: 'active' })}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      className={`flex-1 text-xs font-bold transition-colors ${formData.status === 'inactive' ? 'bg-rose-500 text-white' : 'text-muted-foreground hover:bg-muted/50'}`}
                      onClick={() => setFormData({ ...formData, status: 'inactive' })}
                    >
                      No
                    </button>
                  </div>
                </div>
              </div>
        </div>
        <div className="p-4 border-t border-border/60 bg-muted/10 flex items-center gap-3">
          <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2">
            <Plus className="w-4 h-4" /> {selectedDesignationId === 'NEW' ? 'Save' : 'Update'}
          </Button>
          <Button onClick={handleAddNew} variant="destructive" className="font-bold gap-2">
            <X className="w-4 h-4" /> Cancel
          </Button>
        </div>
      </div>

      {/* Left Column (Now on Right) - List */}
      <div className="w-full md:w-1/3 flex flex-col bg-card border border-border/80 rounded-xl shadow-xs h-[calc(100vh-140px)] overflow-hidden shrink-0 sticky top-4">
        <div className="p-4 border-b border-border/60 space-y-3">
          <div className="flex items-center gap-2 w-full">
            <select
              className="h-9 w-1/3 text-xs rounded-md border border-input bg-background px-2 font-medium truncate"
              value={selectedDesignationFilter}
              onChange={e => setSelectedDesignationFilter(e.target.value)}
            >
              <option value="">All</option>
              {uniqueDesignationNames.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search term..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-8 h-9 text-xs"
              />
            </div>
            <select
              className="h-9 w-1/4 text-xs rounded-md border border-input bg-background px-2 font-medium"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="All">All</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-b border-primary/20 bg-primary/5">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            <h3 className="font-bold text-sm text-foreground">Designation</h3>
          </div>
          <Badge variant="outline" className="font-bold bg-background">{designations.length}</Badge>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {isLoading ? (
            <p className="text-xs text-center text-muted-foreground">Loading...</p>
          ) : (
            filteredDesignations.map(desig => {
              const isSelected = selectedDesignationId === desig.id;
              return (
                <div key={desig.id} className="relative group w-full">
                  <button
                    onClick={() => handleSelect(desig)}
                    className={`w-full flex items-center gap-3 p-3 rounded-md transition-colors text-left border ${
                      isSelected
                        ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                        : 'bg-[#40B5AD] text-white border-transparent hover:brightness-110'
                    }`}
                    style={!isSelected ? { backgroundColor: '#3cb3b5' } : { backgroundColor: '#337b8c' }}
                  >
                    <Users className="w-4 h-4 opacity-90" />
                    <span className="font-bold text-xs uppercase tracking-wide truncate pr-8">{desig.name}</span>
                  </button>
                  <button
                    onClick={(e) => { 
                      e.stopPropagation();
                      if (window.confirm('Are you sure you want to delete this designation?')) {
                        deleteDesignation(desig.id);
                      }
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete Designation"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>
        <div className="p-3 border-t border-border/60">
          <Button onClick={handleAddNew} className="w-full text-xs font-bold gap-2">
            <Plus className="w-4 h-4" /> Add New Designation
          </Button>
        </div>
      </div>
    </div>
  );
}

function EditIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}
