import React, { useState, useEffect } from 'react';
import { apiClient } from '@/config/api';
import { showToast } from '@/components/ui/toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Award,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ChevronDown,
  ChevronRight,
  Shield,
  Building,
  MapPin,
  Briefcase,
  Users,
  Check,
  X,
  Code
} from 'lucide-react';

export interface GratuityRuleItem {
  id?: number | string;
  name: string;
  eligibleYearsOperator: string;
  eligibleYearsValue: number;
  roundingRule: string;
  formula: string;
  companies: string[];
  locations: string[];
  departments: string[];
  grades: string[];
  employmentTypes: string[];
  isActive: boolean;
}

export const GratuityConfiguration: React.FC = () => {
  const [rules, setRules] = useState<GratuityRuleItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form State matching Hoshi HRMS 1:1
  const [name, setName] = useState('');
  const [eligibleOperator, setEligibleOperator] = useState('>=');
  const [eligibleYears, setEligibleYears] = useState<number>(5);
  const [roundingRule, setRoundingRule] = useState('round_up');
  const [formula, setFormula] = useState('(15 * [Basic] * [Tenure]) / 26');
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>(['All']);
  const [selectedLocations, setSelectedLocations] = useState<string[]>(['All']);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>(['All']);
  const [selectedGrades, setSelectedGrades] = useState<string[]>(['All']);
  const [selectedEmpTypes, setSelectedEmpTypes] = useState<string[]>(['Regular']);
  const [isActive, setIsActive] = useState(true);

  // Accordion Expand/Collapse States
  const [expandCompanyLocation, setExpandCompanyLocation] = useState(false);
  const [expandDepartment, setExpandDepartment] = useState(false);
  const [expandGrade, setExpandGrade] = useState(false);
  const [expandEmpType, setExpandEmpType] = useState(false);
  const [showMergeCodeModal, setShowMergeCodeModal] = useState(false);

  // Master Data from DB
  const [masterCompanies, setMasterCompanies] = useState<string[]>([]);
  const [masterLocations, setMasterLocations] = useState<string[]>([]);
  const [masterDepartments, setMasterDepartments] = useState<string[]>([]);
  const [masterGrades, setMasterGrades] = useState<string[]>([]);
  const masterEmpTypes = ['Regular', 'Full-time', 'Contract', 'Probation', 'Intern', 'Part-time'];

  // Load rules & masters on mount
  useEffect(() => {
    fetchRules();
    loadMasters();
  }, []);

  const loadMasters = async () => {
    try {
      const [deptRes, locRes, gradeRes, compRes] = await Promise.all([
        apiClient.get('/settings/departments').catch(() => ({ data: [] })),
        apiClient.get('/settings/locations').catch(() => ({ data: [] })),
        apiClient.get('/settings/grades').catch(() => apiClient.get('/settings/pay-grades')).catch(() => ({ data: [] })),
        apiClient.get('/settings/companies').catch(() => ({ data: [] })),
      ]);

      const depts = (deptRes.data?.data || deptRes.data || []).map((d: any) => d.name || d.department_name).filter(Boolean);
      const locs = (locRes.data?.data || locRes.data || [])
        .filter((l: any) => l.status !== 'inactive' && l.status !== 'Inactive' && l.is_active !== 'No' && l.isActive !== 'No')
        .map((l: any) => l.name || l.location_name)
        .filter(Boolean);
      const grades = (gradeRes.data?.data || gradeRes.data || []).map((g: any) => g.name || g.grade_name || g.pay_grade_name).filter(Boolean);
      const comps = (compRes.data?.data || compRes.data || []).map((c: any) => c.name || c.company_name).filter(Boolean);

      setMasterDepartments(depts);
      setMasterLocations(locs);
      setMasterGrades(grades);
      setMasterCompanies(comps);
    } catch {
      // Fallback
    }
  };

  const fetchRules = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/payroll/gratuity-rules');
      const data = res.data?.data || res.data || [];
      setRules(Array.isArray(data) ? data : []);
    } catch {
      setRules([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetForm = () => {
    setName('');
    setEligibleOperator('>=');
    setEligibleYears(5);
    setRoundingRule('round_up');
    setFormula('(15 * [Basic] * [Tenure]) / 26');
    setSelectedCompanies(['All']);
    setSelectedLocations(['All']);
    setSelectedDepartments(['All']);
    setSelectedGrades(['All']);
    setSelectedEmpTypes(['Regular']);
    setIsActive(true);
    setEditingId(null);
  };

  const handleEditRule = (rule: GratuityRuleItem) => {
    setEditingId(Number(rule.id));
    setName(rule.name);
    setEligibleOperator(rule.eligibleYearsOperator || '>=');
    setEligibleYears(Number(rule.eligibleYearsValue || 5));
    setRoundingRule(rule.roundingRule || 'round_up');
    setFormula(rule.formula || '(15 * [Basic] * [Tenure]) / 26');
    setSelectedCompanies(Array.isArray(rule.companies) && rule.companies.length > 0 ? rule.companies : ['All']);
    setSelectedLocations(Array.isArray(rule.locations) && rule.locations.length > 0 ? rule.locations : ['All']);
    setSelectedDepartments(Array.isArray(rule.departments) && rule.departments.length > 0 ? rule.departments : ['All']);
    setSelectedGrades(Array.isArray(rule.grades) && rule.grades.length > 0 ? rule.grades : ['All']);
    setSelectedEmpTypes(Array.isArray(rule.employmentTypes) && rule.employmentTypes.length > 0 ? rule.employmentTypes : ['Regular']);
    setIsActive(rule.isActive !== undefined ? rule.isActive : true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSave = async () => {
    if (!name.trim()) {
      showToast.error('Validation Error', 'Gratuity Name is required.');
      return;
    }
    if (!formula.trim()) {
      showToast.error('Validation Error', 'Calculation Formula is required.');
      return;
    }

    setIsSaving(true);
    try {
      const payload: GratuityRuleItem = {
        id: editingId || undefined,
        name: name.trim(),
        eligibleYearsOperator: eligibleOperator,
        eligibleYearsValue: eligibleYears,
        roundingRule,
        formula: formula.trim(),
        companies: selectedCompanies,
        locations: selectedLocations,
        departments: selectedDepartments,
        grades: selectedGrades,
        employmentTypes: selectedEmpTypes,
        isActive,
      };

      await apiClient.post('/payroll/gratuity-rules', payload);
      showToast.success('Saved Successfully 🎉', `Gratuity Rule "${name}" has been saved.`);
      handleResetForm();
      fetchRules();
    } catch (err: any) {
      showToast.error('Failed to Save', err?.response?.data?.message || err?.message || 'Could not save gratuity rule');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number | string) => {
    if (!confirm('Are you sure you want to delete this Gratuity Rule?')) return;
    try {
      await apiClient.delete(`/payroll/gratuity-rules/${id}`);
      showToast.success('Deleted', 'Gratuity Rule deleted successfully.');
      fetchRules();
    } catch {
      showToast.error('Failed', 'Could not delete gratuity rule.');
    }
  };

  const toggleSelection = (item: string, list: string[], setList: (arr: string[]) => void) => {
    if (item === 'All') {
      setList(['All']);
      return;
    }
    let updated = list.filter(x => x !== 'All');
    if (updated.includes(item)) {
      updated = updated.filter(x => x !== item);
      if (updated.length === 0) updated = ['All'];
    } else {
      updated.push(item);
    }
    setList(updated);
  };

  const appendMergeCode = (code: string) => {
    setFormula(prev => `${prev} ${code}`.trim());
    setShowMergeCodeModal(false);
  };

  return (
    <div className="space-y-6">
      {/* ── Top Configuration Form (Matching Hoshi HRMS) ── */}
      <div className="bg-card border border-border/80 rounded-xl shadow-xs p-6 space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-border/60">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-foreground tracking-tight flex items-center gap-2">
                {editingId ? 'EDIT GRATUITY RULE' : '+ GRATUITY'}
              </h2>
              <p className="text-xs text-muted-foreground">Configure statutory &amp; custom gratuity calculation policies for employee exit settlements</p>
            </div>
          </div>
          {editingId && (
            <Badge variant="outline" className="text-xs font-bold text-amber-600 border-amber-300 bg-amber-50">
              Editing Mode
            </Badge>
          )}
        </div>

        <div className="space-y-5 max-w-4xl">
          {/* Gratuity Name */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
            <label className="sm:col-span-4 text-xs font-bold text-foreground">
              Gratuity Name <span className="text-rose-500">*</span>
            </label>
            <div className="sm:col-span-8">
              <Input
                placeholder="e.g. Standard Statutory Gratuity"
                value={name}
                onChange={e => setName(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          {/* Eligible Years */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
            <label className="sm:col-span-4 text-xs font-bold text-foreground">
              Eligible years <span className="text-rose-500">*</span>
            </label>
            <div className="sm:col-span-8 flex items-center gap-2">
              <span className="bg-neutral-900 text-white text-[11px] font-bold px-3 py-1.5 rounded-md shrink-0">
                Years
              </span>
              <select
                value={eligibleOperator}
                onChange={e => setEligibleOperator(e.target.value)}
                className="h-9 border border-border rounded-md px-3 text-xs bg-background text-foreground font-medium min-w-[140px]"
              >
                <option value=">=">Greater than equal to (&gt;=)</option>
                <option value=">">Greater than (&gt;)</option>
                <option value="=">Equal to (=)</option>
                <option value="<=">Less than equal to (&lt;=)</option>
              </select>
              <select
                value={eligibleYears}
                onChange={e => setEligibleYears(Number(e.target.value))}
                className="h-9 border border-border rounded-md px-3 text-xs bg-background text-foreground font-medium min-w-[110px]"
              >
                <option value={1}>1 Year</option>
                <option value={2}>2 Years</option>
                <option value={3}>3 Years</option>
                <option value={4}>4 Years</option>
                <option value={5}>5 Years (Statutory)</option>
                <option value={6}>6 Years</option>
                <option value={7}>7 Years</option>
                <option value={8}>8 Years</option>
                <option value={10}>10 Years</option>
              </select>
            </div>
          </div>

          {/* Apply round to year while calculation */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
            <label className="sm:col-span-4 text-xs font-bold text-foreground">
              Apply round to year while calculation
            </label>
            <div className="sm:col-span-8">
              <select
                value={roundingRule}
                onChange={e => setRoundingRule(e.target.value)}
                className="h-9 border border-border rounded-md px-3 text-xs bg-background text-foreground font-medium w-full sm:w-[260px]"
              >
                <option value="round_up">Round Up (&gt; 6 months = 1 year)</option>
                <option value="round_down">Round Down (Complete years only)</option>
                <option value="nearest">Round to Nearest Integer</option>
                <option value="no_change">No Change (Exact fraction)</option>
              </select>
            </div>
          </div>

          {/* Formula */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
            <div className="sm:col-span-4 pt-1.5">
              <label className="text-xs font-bold text-foreground block">
                Formula <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setShowMergeCodeModal(true)}
                className="text-[11px] text-primary hover:underline font-semibold flex items-center gap-1 mt-1 cursor-pointer"
              >
                <Code className="w-3 h-3" /> Choose Merge Codes
              </button>
            </div>
            <div className="sm:col-span-8 space-y-1.5">
              <textarea
                rows={3}
                placeholder="Comp1 + Comp2"
                value={formula}
                onChange={e => setFormula(e.target.value)}
                className="w-full border border-border rounded-md p-2.5 text-xs bg-background text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <p className="text-[10px] text-muted-foreground">
                Standard Indian Statutory Formula: <code className="text-primary font-bold">(15 * [Basic] * [Tenure]) / 26</code>
              </p>
              <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                Note: settlements always use this statutory formula. Editing the text above is saved for reference but does not change the calculation — only the eligibility and rounding rules below affect the actual payout.
              </p>
            </div>
          </div>

          {/* ── Collapsible Condition Filters ── */}
          <div className="space-y-2 pt-2">
            {/* 1. Company - Location */}
            <div className="border border-border/80 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setExpandCompanyLocation(!expandCompanyLocation)}
                className="w-full flex items-center justify-between p-2.5 bg-muted/40 hover:bg-muted/60 text-xs font-bold text-foreground transition-all cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                  [+] Company - Location
                </span>
                <span className="text-[11px] text-muted-foreground font-normal">
                  {selectedLocations.includes('All') ? 'All Locations' : `${selectedLocations.length} selected`}
                </span>
              </button>
              {expandCompanyLocation && (
                <div className="p-3 bg-card border-t border-border/60 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedLocations.includes('All')}
                      onChange={() => toggleSelection('All', selectedLocations, setSelectedLocations)}
                      className="rounded text-primary"
                    />
                    <span className="font-bold">All Locations</span>
                  </label>
                  {masterLocations.map(loc => (
                    <label key={loc} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedLocations.includes(loc)}
                        onChange={() => toggleSelection(loc, selectedLocations, setSelectedLocations)}
                        className="rounded text-primary"
                      />
                      <span>{loc}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* 2. Department */}
            <div className="border border-border/80 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setExpandDepartment(!expandDepartment)}
                className="w-full flex items-center justify-between p-2.5 bg-muted/40 hover:bg-muted/60 text-xs font-bold text-foreground transition-all cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Building className="w-3.5 h-3.5 text-muted-foreground" />
                  [+] Department
                </span>
                <span className="text-[11px] text-muted-foreground font-normal">
                  {selectedDepartments.includes('All') ? 'All Departments' : `${selectedDepartments.length} selected`}
                </span>
              </button>
              {expandDepartment && (
                <div className="p-3 bg-card border-t border-border/60 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedDepartments.includes('All')}
                      onChange={() => toggleSelection('All', selectedDepartments, setSelectedDepartments)}
                      className="rounded text-primary"
                    />
                    <span className="font-bold">All Departments</span>
                  </label>
                  {masterDepartments.map(dept => (
                    <label key={dept} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedDepartments.includes(dept)}
                        onChange={() => toggleSelection(dept, selectedDepartments, setSelectedDepartments)}
                        className="rounded text-primary"
                      />
                      <span>{dept}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* 3. Grade */}
            <div className="border border-border/80 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setExpandGrade(!expandGrade)}
                className="w-full flex items-center justify-between p-2.5 bg-muted/40 hover:bg-muted/60 text-xs font-bold text-foreground transition-all cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Briefcase className="w-3.5 h-3.5 text-muted-foreground" />
                  [+] Grade
                </span>
                <span className="text-[11px] text-muted-foreground font-normal">
                  {selectedGrades.includes('All') ? 'All Grades' : `${selectedGrades.length} selected`}
                </span>
              </button>
              {expandGrade && (
                <div className="p-3 bg-card border-t border-border/60 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedGrades.includes('All')}
                      onChange={() => toggleSelection('All', selectedGrades, setSelectedGrades)}
                      className="rounded text-primary"
                    />
                    <span className="font-bold">All Grades</span>
                  </label>
                  {masterGrades.map(grade => (
                    <label key={grade} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedGrades.includes(grade)}
                        onChange={() => toggleSelection(grade, selectedGrades, setSelectedGrades)}
                        className="rounded text-primary"
                      />
                      <span>{grade}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* 4. Employee Type */}
            <div className="border border-border/80 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setExpandEmpType(!expandEmpType)}
                className="w-full flex items-center justify-between p-2.5 bg-muted/40 hover:bg-muted/60 text-xs font-bold text-foreground transition-all cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-muted-foreground" />
                  [+] Employee Type
                </span>
                <span className="text-[11px] text-muted-foreground font-normal">
                  {selectedEmpTypes.join(', ')}
                </span>
              </button>
              {expandEmpType && (
                <div className="p-3 bg-card border-t border-border/60 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  {masterEmpTypes.map(type => (
                    <label key={type} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedEmpTypes.includes(type)}
                        onChange={() => toggleSelection(type, selectedEmpTypes, setSelectedEmpTypes)}
                        className="rounded text-primary"
                      />
                      <span>{type}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Active Switch */}
          <div className="flex items-center gap-3 pt-2">
            <label className="text-xs font-bold text-foreground">Active</label>
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              className={`px-4 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                isActive ? 'bg-[#2b90d9] text-white' : 'bg-muted text-muted-foreground'
              }`}
            >
              {isActive ? 'Yes' : 'No'}
            </button>
          </div>

          {/* Action Buttons (Matching Hoshi HRMS Green/Red buttons) */}
          <div className="flex items-center gap-3 pt-4 border-t border-border/60">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-[#28a745] hover:bg-[#218838] text-white text-xs font-bold px-6 h-9 shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4 mr-1" />
              {isSaving ? 'Saving...' : editingId ? 'Update Rule' : '+ Add'}
            </Button>
            <Button
              variant="destructive"
              onClick={handleResetForm}
              className="bg-[#dc3545] hover:bg-[#c82333] text-white text-xs font-bold px-5 h-9 cursor-pointer"
            >
              <X className="w-4 h-4 mr-1" /> Cancel
            </Button>
          </div>
        </div>
      </div>

      {/* ── Configured Gratuity Rules Table ── */}
      <div className="bg-card border border-border/80 rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 bg-muted/20 border-b border-border/60 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-foreground">Configured Gratuity Policies</h3>
            <p className="text-xs text-muted-foreground">Active gratuity calculation formulas applied automatically during FnF exit settlement</p>
          </div>
          <Badge variant="outline" className="text-xs font-bold">
            {rules.length} Policies Configured
          </Badge>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-xs text-muted-foreground animate-pulse">Loading gratuity rules...</div>
        ) : rules.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <Award className="w-8 h-8 text-muted-foreground/50 mx-auto" />
            <p className="text-xs text-muted-foreground">No gratuity policies configured yet.</p>
            <p className="text-[11px] text-muted-foreground">Default statutory rule (5+ years = 15 days basic / year) applies automatically.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/40 text-[11px] font-bold text-muted-foreground uppercase border-b border-border">
                <tr>
                  <th className="p-3">Policy Name</th>
                  <th className="p-3">Eligibility</th>
                  <th className="p-3">Rounding Rule</th>
                  <th className="p-3">Formula</th>
                  <th className="p-3">Applicable Scope</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {rules.map((r: any) => (
                  <tr key={r.id} className="hover:bg-muted/20 transition-all">
                    <td className="p-3 font-bold text-foreground flex items-center gap-2">
                      <Award className="w-4 h-4 text-emerald-600" />
                      {r.name}
                    </td>
                    <td className="p-3 font-semibold">
                      Tenure {r.eligibleYearsOperator || '>='} {r.eligibleYearsValue || 5} Years
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {r.roundingRule === 'round_up' ? 'Round Up (> 6m = 1y)' : r.roundingRule || 'Standard'}
                    </td>
                    <td className="p-3 font-mono text-[11px] text-primary">
                      {r.formula}
                    </td>
                    <td className="p-3 text-[11px] text-muted-foreground">
                      {r.departments?.length && !r.departments.includes('All') ? `${r.departments.length} Depts` : 'All Depts'} • {r.locations?.length && !r.locations.includes('All') ? `${r.locations.length} Locs` : 'All Locs'}
                    </td>
                    <td className="p-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                        r.isActive ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground'
                      }`}>
                        {r.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="p-3 text-right space-x-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEditRule(r)}
                        className="h-7 w-7 p-0 text-primary hover:bg-primary/10 cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(r.id)}
                        className="h-7 w-7 p-0 text-rose-600 hover:bg-rose-50 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Choose Merge Codes Popup Modal ── */}
      {showMergeCodeModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-xl max-w-md w-full p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Code className="w-4 h-4 text-primary" /> Choose Merge Codes for Formula
              </h3>
              <button
                type="button"
                onClick={() => setShowMergeCodeModal(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">Click a tag below to insert it into your gratuity calculation formula:</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { tag: '[Basic]', desc: 'Last drawn Basic monthly salary' },
                { tag: '[Tenure]', desc: 'Completed years of service' },
                { tag: '[DA]', desc: 'Dearness Allowance' },
                { tag: '[Gross]', desc: 'Last drawn Gross monthly' },
                { tag: '[LeaveBalance]', desc: 'Encashable leave days' },
                { tag: '[Ctc]', desc: 'Annual CTC' }
              ].map(m => (
                <button
                  key={m.tag}
                  type="button"
                  onClick={() => appendMergeCode(m.tag)}
                  className="p-2.5 border border-border hover:border-primary/60 bg-muted/30 hover:bg-primary/5 rounded-lg text-left transition-all cursor-pointer space-y-0.5"
                >
                  <div className="font-mono font-bold text-primary text-xs">{m.tag}</div>
                  <div className="text-[10px] text-muted-foreground">{m.desc}</div>
                </button>
              ))}
            </div>
            <div className="pt-2 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowMergeCodeModal(false)} className="text-xs cursor-pointer">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
