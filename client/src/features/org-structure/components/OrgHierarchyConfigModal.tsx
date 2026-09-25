import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Settings, ShieldCheck, Plus, Trash2, RotateCcw, Save } from 'lucide-react';
import { toast } from 'sonner';
import type { HierarchyRule } from '../types/orgHierarchy';
import { DEFAULT_HIERARCHY_RULES } from '../utils/orgHierarchyEngine';

interface OrgHierarchyConfigModalProps {
  open: boolean;
  onClose: () => void;
  rules: HierarchyRule[];
  onSaveRules: (updatedRules: HierarchyRule[]) => Promise<void>;
}

export function OrgHierarchyConfigModal({
  open,
  onClose,
  rules,
  onSaveRules,
}: OrgHierarchyConfigModalProps) {
  const [localRules, setLocalRules] = useState<HierarchyRule[]>([]);
  const [newParentInputs, setNewParentInputs] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setLocalRules(JSON.parse(JSON.stringify(rules?.length ? rules : DEFAULT_HIERARCHY_RULES)));
      setNewParentInputs({});
    }
  }, [open, rules]);

  const handleAddParent = (ruleId: string) => {
    const val = (newParentInputs[ruleId] || '').trim();
    if (!val) return;

    setLocalRules((prev) =>
      prev.map((r) => {
        if (r.id === ruleId) {
          if (r.allowedParentDesignations.some((p) => p.toLowerCase() === val.toLowerCase())) {
            toast.info(`Parent position "${val}" already exists for ${r.designationOrRole}`);
            return r;
          }
          return { ...r, allowedParentDesignations: [...r.allowedParentDesignations, val] };
        }
        return r;
      })
    );

    setNewParentInputs((prev) => ({ ...prev, [ruleId]: '' }));
  };

  const handleRemoveParent = (ruleId: string, parentToRemove: string) => {
    setLocalRules((prev) =>
      prev.map((r) => {
        if (r.id === ruleId) {
          return {
            ...r,
            allowedParentDesignations: r.allowedParentDesignations.filter((p) => p !== parentToRemove),
          };
        }
        return r;
      })
    );
  };

  const handleResetToDefault = () => {
    setLocalRules(JSON.parse(JSON.stringify(DEFAULT_HIERARCHY_RULES)));
    toast.success('Reset hierarchy configuration to default rules!');
  };

  const handleSave = async () => {
    if (!localRules.every((rule) => rule.designationOrRole.trim() && Number.isFinite(rule.hierarchyLevel))) {
      toast.error('Each hierarchy rule needs a position name and level.');
      return;
    }
    setIsSaving(true);
    try {
      await onSaveRules(localRules);
      toast.success('Organization hierarchy rules updated successfully!');
      onClose();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to save hierarchy rules.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-2xl border border-border rounded-xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-4 border-b border-border/80 bg-muted/20 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-extrabold text-foreground">
                Configure Organization Reporting Hierarchy
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Set allowed immediate parent positions and reporting constraints for each designation/role.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
          <div className="flex items-center justify-between bg-amber-500/10 border border-amber-500/30 p-2.5 rounded-lg text-xs text-amber-800 dark:text-amber-300 font-medium">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>Strict Drag-and-Drop validation enforces these reporting parent requirements.</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleResetToDefault}
              className="h-7 text-[11px] font-bold gap-1 border-amber-500/30 text-amber-800 dark:text-amber-300 hover:bg-amber-500/20"
            >
              <RotateCcw className="w-3 h-3" /> Reset Default
            </Button>
          </div>

          <div className="space-y-3">
            {localRules.map((rule) => (
              <div
                key={rule.id}
                className="p-3 border border-border/80 rounded-xl bg-card hover:border-primary/40 transition-colors space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-foreground">{rule.designationOrRole}</span>
                    <Badge variant="outline" className="text-[9.5px] font-semibold py-0">
                      Level {rule.hierarchyLevel}
                    </Badge>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono">ID: {rule.id}</span>
                </div>

                <div className="text-[11px] text-muted-foreground font-medium">Allowed Immediate Parent Positions:</div>

                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  {rule.allowedParentDesignations.length === 0 ? (
                    <span className="text-[11px] text-muted-foreground italic">— None (Root Level Position) —</span>
                  ) : (
                    rule.allowedParentDesignations.map((parent) => (
                      <Badge
                        key={parent}
                        variant="secondary"
                        className="text-xs font-semibold py-0.5 px-2 gap-1 bg-primary/10 text-primary border border-primary/20"
                      >
                        {parent}
                        <button
                          type="button"
                          onClick={() => handleRemoveParent(rule.id, parent)}
                          className="text-muted-foreground hover:text-destructive ml-0.5"
                          title={`Remove ${parent}`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))
                  )}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Input
                    placeholder="Add allowed parent designation..."
                    value={newParentInputs[rule.id] || ''}
                    onChange={(e) => setNewParentInputs((prev) => ({ ...prev, [rule.id]: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddParent(rule.id);
                    }}
                    className="h-7 text-xs flex-1 bg-background"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAddParent(rule.id)}
                    className="h-7 text-xs font-bold gap-1 px-2.5"
                  >
                    <Plus className="w-3 h-3" /> Add
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-3 border-t border-border/80 bg-muted/20 flex items-center justify-end gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isSaving} className="h-8 text-xs font-semibold">
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="h-8 text-xs font-bold gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Save className="w-3.5 h-3.5" /> {isSaving ? 'Saving…' : 'Save Hierarchy Rules'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
