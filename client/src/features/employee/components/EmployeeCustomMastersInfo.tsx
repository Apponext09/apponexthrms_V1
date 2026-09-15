import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Layers, Edit2, Check, X, Tag } from 'lucide-react';
import { toast } from 'sonner';
import { 
  useEmployeeLinkedMasters, 
  useEmployeeMasterValues, 
  useSaveEmployeeMasterValues 
} from '@/features/master-builder/hooks/useEmployeeCustomMasters';

interface EmployeeCustomMastersInfoProps {
  employeeId: number | string;
  editUnlocked?: boolean;
}

export function EmployeeCustomMastersInfo({
  employeeId,
  editUnlocked = true,
}: EmployeeCustomMastersInfoProps) {
  const { data: linkedMasters = [], isLoading: isLoadingMasters } = useEmployeeLinkedMasters();
  const { data: assignedValues = [], isLoading: isLoadingValues } = useEmployeeMasterValues(employeeId);
  const saveMutation = useSaveEmployeeMasterValues(employeeId);

  const [isEditing, setIsEditing] = useState(false);
  const [draftAssignments, setDraftAssignments] = useState<Record<number, { recordId?: number | null; recordIds?: number[]; customValue?: string | null }>>({});

  useEffect(() => {
    if (assignedValues.length > 0) {
      const map: Record<number, any> = {};
      assignedValues.forEach((item) => {
        map[item.masterId] = {
          recordId: item.recordId || null,
          recordIds: item.recordIds || [],
          customValue: item.customValue || null,
        };
      });
      setDraftAssignments(map);
    } else {
      setDraftAssignments({});
    }
  }, [assignedValues]);

  if (isLoadingMasters || isLoadingValues) {
    return null;
  }

  // If there are no linked masters defined in the organization, don't show the card
  if (linkedMasters.length === 0) {
    return null;
  }

  const handleSave = async () => {
    try {
      const payload = linkedMasters.map((m) => {
        const val = draftAssignments[m.id];
        return {
          masterId: m.id,
          recordId: val?.recordId ?? null,
          recordIds: val?.recordIds ?? [],
          customValue: val?.customValue ?? null,
        };
      });

      await saveMutation.mutateAsync(payload);
      toast.success('Custom master attributes saved');
      setIsEditing(false);
    } catch (err: any) {
      toast.error('Failed to save master attributes');
    }
  };

  const handleCancel = () => {
    const map: Record<number, any> = {};
    assignedValues.forEach((item) => {
      map[item.masterId] = {
        recordId: item.recordId || null,
        recordIds: item.recordIds || [],
        customValue: item.customValue || null,
      };
    });
    setDraftAssignments(map);
    setIsEditing(false);
  };

  return (
    <Card className="border border-border/80 shadow-2xs rounded-xl overflow-hidden bg-card">
      <CardHeader className="py-3.5 px-5 bg-muted/30 border-b border-border/60 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
              Custom Master Attributes & Organizational Linkages
            </CardTitle>
            <p className="text-[11px] text-muted-foreground">
              Dynamic attributes linked from company Master Builder
            </p>
          </div>
        </div>

        {editUnlocked && !isEditing && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsEditing(true)}
            className="h-7 text-xs font-semibold gap-1.5 px-2.5 rounded-lg border-border hover:bg-muted"
          >
            <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
            Edit Attributes
          </Button>
        )}

        {isEditing && (
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancel}
              className="h-7 text-xs font-semibold px-2.5 rounded-lg border-border hover:bg-muted"
            >
              <X className="w-3.5 h-3.5 mr-1" /> Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="h-7 text-xs font-bold px-3 rounded-lg bg-primary text-primary-foreground gap-1 shadow-2xs"
            >
              <Check className="w-3.5 h-3.5" /> Save
            </Button>
          </div>
        )}
      </CardHeader>

      <CardContent className="p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {linkedMasters.map((master) => {
            const isPrimary = master.employeeLinkage === 'primary_assignment';
            const draft = draftAssignments[master.id] || {};
            const assigned = assignedValues.find((v) => v.masterId === master.id);

            return (
              <div
                key={master.id}
                className="p-3.5 rounded-xl border border-border/70 bg-card hover:border-border transition-colors space-y-2"
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-primary" />
                    {master.name}
                  </span>
                  <Badge variant="outline" className="text-[9px] font-semibold uppercase px-1.5 py-0 bg-muted/60 text-muted-foreground">
                    {isPrimary ? 'Primary' : 'Secondary'}
                  </Badge>
                </div>

                {isEditing ? (
                  isPrimary ? (
                    <select
                      className="flex h-8 w-full rounded-lg border border-input bg-background px-2.5 py-1 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                      value={draft.recordId ? String(draft.recordId) : ''}
                      onChange={(e) => {
                        const val = e.target.value ? Number(e.target.value) : null;
                        setDraftAssignments((prev) => ({
                          ...prev,
                          [master.id]: {
                            ...prev[master.id],
                            recordId: val,
                          },
                        }));
                      }}
                    >
                      <option value="">-- Not Assigned --</option>
                      {master.records.map((rec) => (
                        <option key={rec.id} value={rec.id}>
                          {rec.label} {rec.recordCode ? `(${rec.recordCode})` : ''}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto p-1.5 rounded-lg border border-input bg-background">
                      {master.records.map((rec) => {
                        const isSelected = (draft.recordIds || []).includes(rec.id);
                        return (
                          <button
                            type="button"
                            key={rec.id}
                            onClick={() => {
                              const currentIds = draft.recordIds || [];
                              const nextIds = isSelected
                                ? currentIds.filter((id) => id !== rec.id)
                                : [...currentIds, rec.id];
                              setDraftAssignments((prev) => ({
                                ...prev,
                                [master.id]: {
                                  ...prev[master.id],
                                  recordIds: nextIds,
                                },
                              }));
                            }}
                            className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors border ${
                              isSelected
                                ? 'bg-primary text-primary-foreground border-primary font-bold'
                                : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'
                            }`}
                          >
                            {rec.label}
                          </button>
                        );
                      })}
                      {master.records.length === 0 && (
                        <span className="text-[10px] text-muted-foreground italic">No options</span>
                      )}
                    </div>
                  )
                ) : (
                  <div>
                    {isPrimary ? (
                      assigned?.recordLabel ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                          {assigned.recordLabel}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Not Assigned</span>
                      )
                    ) : (
                      assigned?.recordIds && assigned.recordIds.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {master.records
                            .filter((r) => assigned.recordIds?.includes(r.id))
                            .map((r) => (
                              <span
                                key={r.id}
                                className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-secondary text-secondary-foreground border border-border/60"
                              >
                                {r.label}
                              </span>
                            ))}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">None Linked</span>
                      )
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
