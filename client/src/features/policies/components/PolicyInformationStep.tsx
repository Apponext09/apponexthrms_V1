import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { POLICY_CATEGORIES } from '../types/policy';
import { ArrowRight, Save } from 'lucide-react';

interface PolicyInfoData {
  title: string;
  documentRef: string;
  category: string;
  description: string;
  effectiveDate: string;
  reviewDate: string;
  expiryDate: string;
  status: 'draft' | 'published' | string;
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
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      alert('Policy Name is required.');
      return;
    }
    if (!formData.documentRef.trim()) {
      alert('Policy Reference ID is required.');
      return;
    }
    if (!formData.effectiveDate) {
      alert('Effective Date is required.');
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
            <select
              value={formData.category}
              onChange={(e) => onChange({ category: e.target.value })}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-xs font-medium focus:ring-1 focus:ring-primary"
              required
            >
              {POLICY_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
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
              <option value="published">Publish Immediately</option>
            </select>
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
