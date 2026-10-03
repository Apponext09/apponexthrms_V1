import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { policiesApi } from '../api/policiesApi';
import { ArrowRight, Save, Plus } from 'lucide-react';

interface PolicyInfoData {
  title: string;
  documentRef: string;
  category: string;
  description: string;
  effectiveDate: string;
  reviewDate: string;
  expiryDate: string;
  status: 'draft' | 'published' | 'active' | 'archived' | 'expired' | string;
  signatureMode?: string;
  applicableTo?: string;
  selectedGenders?: string[];
}

interface PolicyInformationStepProps {
  formData: PolicyInfoData;
  onChange: (updated: Partial<PolicyInfoData>) => void;
  onNext: () => void;
  onSaveDraft: () => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export const PolicyInformationStep: React.FC<PolicyInformationStepProps> = ({
  formData,
  onChange,
  onNext,
  onSaveDraft,
  onCancel,
  isSubmitting = false,
}) => {
  const [dbCategories, setDbCategories] = useState<string[]>([]);
  const [isAddingNewCat, setIsAddingNewCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  useEffect(() => {
    policiesApi.getCategories().then((cats) => {
      if (Array.isArray(cats) && cats.length > 0) {
        const catNames = cats.map((c: any) => typeof c === 'string' ? c : c.name);
        setDbCategories(catNames);
        if (!formData.category && catNames.length > 0) {
          onChange({ category: catNames[0] });
        }
      } else {
        const defaults = ['Leave', 'Attendance', 'WFH / Remote Work', 'Code of Conduct', 'IT / Security', 'Travel', 'Expense', 'Payroll', 'Holiday', 'Grievance', 'Workplace Conduct / POSH', 'Data Privacy', 'Employee Handbook', 'Custom'];
        setDbCategories(defaults);
      }
    }).catch(() => {
      setDbCategories(['Leave', 'Attendance', 'WFH / Remote Work', 'Code of Conduct', 'IT / Security', 'Travel', 'Expense', 'Payroll', 'Holiday', 'Grievance', 'Workplace Conduct / POSH', 'Data Privacy', 'Employee Handbook', 'Custom']);
    });
  }, []);

  const handleAddCustomCategory = async () => {
    if (!newCatName.trim()) return;
    const trimmed = newCatName.trim();
    try {
      await policiesApi.createCategory(trimmed);
      setDbCategories((prev) => Array.from(new Set([...prev, trimmed])));
      onChange({ category: trimmed });
      setNewCatName('');
      setIsAddingNewCat(false);
    } catch {
      setDbCategories((prev) => Array.from(new Set([...prev, trimmed])));
      onChange({ category: trimmed });
      setNewCatName('');
      setIsAddingNewCat(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      window.appAlert('Policy Name is required.');
      return;
    }
    if (!formData.documentRef.trim()) {
      window.appAlert('Policy Reference ID is required.');
      return;
    }
    if (!formData.effectiveDate) {
      window.appAlert('Effective Date is required.');
      return;
    }
    onNext();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-card border border-border rounded-xl p-6 shadow-2xs space-y-5">
        <div>
          <h3 className="text-base font-bold text-foreground">Step 1: Policy Information</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Provide core policy metadata, category classification, and enforcement timelines.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-medium">
          {/* Policy Name */}
          <div className="md:col-span-2 space-y-1">
            <label className="block text-foreground font-bold">
              Policy Name <span className="text-rose-500">*</span>
            </label>
            <Input
              value={formData.title}
              onChange={(e) => onChange({ title: e.target.value })}
              placeholder="e.g. Employee Code of Conduct & Remote Work Governance Policy"
              required
              className="h-10 text-xs bg-background"
            />
          </div>

          {/* Reference ID & Category */}
          <div className="space-y-1">
            <label className="block text-foreground font-bold">
              Policy Reference ID <span className="text-rose-500">*</span>
            </label>
            <Input
              value={formData.documentRef}
              onChange={(e) => onChange({ documentRef: e.target.value })}
              placeholder="e.g. POL-2026-008"
              required
              className="h-10 text-xs bg-background font-mono"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-foreground font-bold">
              Policy Category <span className="text-rose-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              <select
                value={formData.category}
                onChange={(e) => onChange({ category: e.target.value })}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-xs font-medium focus:ring-1 focus:ring-primary"
                required
              >
                {dbCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            {isAddingNewCat ? (
              <div className="flex items-center gap-2 mt-1.5">
                <Input
                  placeholder="Enter custom category name..."
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="h-8 text-xs bg-background"
                />
                <Button type="button" size="sm" onClick={handleAddCustomCategory} className="h-8 text-xs font-bold px-3">
                  Add
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setIsAddingNewCat(false)} className="h-8 text-xs px-2">
                  Cancel
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsAddingNewCat(true)}
                className="text-[11px] text-primary hover:underline font-bold flex items-center gap-1 mt-1"
              >
                <Plus className="w-3 h-3" /> Add Custom Category
              </button>
            )}
          </div>

          {/* Short Description */}
          <div className="md:col-span-2 space-y-1">
            <label className="block text-foreground font-bold">Short Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => onChange({ description: e.target.value })}
              placeholder="Brief summary of policy objectives, rules, and governance scope..."
              rows={3}
              className="w-full rounded-md border border-input bg-background p-3 text-xs font-normal focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Effective Date, Review Date, Expiry Date */}
          <div className="space-y-1">
            <label className="block text-foreground font-bold">
              Effective Date <span className="text-rose-500">*</span>
            </label>
            <Input
              type="date"
              value={formData.effectiveDate ? formData.effectiveDate.split('T')[0] : ''}
              onChange={(e) => onChange({ effectiveDate: e.target.value })}
              required
              className="h-10 text-xs bg-background"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-foreground font-bold">Review Date</label>
            <Input
              type="date"
              value={formData.reviewDate ? formData.reviewDate.split('T')[0] : ''}
              onChange={(e) => onChange({ reviewDate: e.target.value })}
              className="h-10 text-xs bg-background"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-foreground font-bold">Expiry Date (Optional)</label>
            <Input
              type="date"
              value={formData.expiryDate ? formData.expiryDate.split('T')[0] : ''}
              onChange={(e) => onChange({ expiryDate: e.target.value })}
              className="h-10 text-xs bg-background"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-foreground font-bold">Initial Status</label>
            <select
              value={formData.status}
              onChange={(e) => onChange({ status: e.target.value })}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-xs font-medium focus:ring-1 focus:ring-primary"
            >
              <option value="draft">Draft (Save for Later)</option>
              <option value="published">Published</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
              <option value="expired">Expired</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-foreground font-bold">Signature / Sign-Off Mode</label>
            <select
              value={(formData as any).signatureMode || 'ACKNOWLEDGEMENT'}
              onChange={(e) => onChange({ signatureMode: e.target.value as any })}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-xs font-medium focus:ring-1 focus:ring-primary font-bold"
            >
              <option value="ACKNOWLEDGEMENT">Checkbox Acknowledgement Only</option>
              <option value="E_SIGNATURE">E-Signature Required (DocuSign/Adobe/Leegality)</option>
              <option value="BOTH">Both Checkbox Acknowledgement + E-Signature</option>
              <option value="NONE">None (Informational Policy)</option>
            </select>
          </div>


          {/* Applicable To Scope & Gender Selector */}
          <div className="md:col-span-2 space-y-3 pt-3 border-t border-border">
            <label className="block text-foreground font-bold">
              Applicable To <span className="text-rose-500">*</span>
            </label>
            <div className="flex items-center gap-6 text-xs font-medium">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="radio"
                  name="applicableTo"
                  value="all"
                  checked={(formData.applicableTo || 'all') === 'all'}
                  onChange={() => onChange({ applicableTo: 'all', selectedGenders: ['all'] })}
                  className="h-4 w-4 text-primary focus:ring-primary"
                />
                <span className="font-bold text-foreground">All Employees</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="radio"
                  name="applicableTo"
                  value="gender_wise"
                  checked={formData.applicableTo === 'gender_wise'}
                  onChange={() => onChange({
                    applicableTo: 'gender_wise',
                    selectedGenders: formData.selectedGenders?.filter(g => g !== 'all').length ? formData.selectedGenders : ['female']
                  })}
                  className="h-4 w-4 text-primary focus:ring-primary"
                />
                <span className="font-bold text-foreground">Gender-wise</span>
              </label>
            </div>

            {formData.applicableTo === 'gender_wise' && (
              <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-2 mt-2">
                <label className="block text-xs font-bold text-foreground">Select Applicable Gender(s):</label>
                <div className="flex items-center gap-5 text-xs font-medium pt-1">
                  {[
                    { id: 'female', label: 'Female' },
                    { id: 'male', label: 'Male' },
                    { id: 'other', label: 'Other / Not Specified' },
                  ].map((g) => {
                    const checked = (formData.selectedGenders || []).includes(g.id);
                    return (
                      <label key={g.id} className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const current = (formData.selectedGenders || []).filter(x => x !== 'all');
                            const next = e.target.checked
                              ? [...current, g.id]
                              : current.filter(x => x !== g.id);
                            onChange({ selectedGenders: next.length ? next : ['female'] });
                          }}
                          className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                        />
                        <span className="text-foreground font-semibold">{g.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel} className="h-9 px-4 text-xs font-bold">
          Cancel
        </Button>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onSaveDraft}
            disabled={isSubmitting}
            className="h-9 px-4 text-xs font-bold gap-1.5"
          >
            <Save className="w-3.5 h-3.5" /> Save as Draft
          </Button>
          <Button type="submit" size="sm" className="h-9 px-4 text-xs font-bold bg-primary text-primary-foreground gap-1.5">
            Next: Policy Content <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </form>
  );
};
