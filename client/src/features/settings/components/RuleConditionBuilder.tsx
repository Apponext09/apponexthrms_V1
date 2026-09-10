import React from 'react';
import { Plus, Trash2, GitMerge, Layers, HelpCircle, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HelpHint } from './HelpHint';

export interface ConditionItem {
  id: string;
  fact: string;
  operator: string;
  valueType: 'static' | 'another_fact' | 'duration';
  value: any;
  durationUnit?: 'days' | 'months' | 'years';
}

export interface ConditionGroup {
  id: string;
  conjunction: 'AND' | 'OR' | 'ALL' | 'ANY';
  conditions: (ConditionItem | ConditionGroup)[];
}

interface RuleConditionBuilderProps {
  value?: ConditionGroup | null;
  onChange: (value: ConditionGroup) => void;
  departments?: { id: number; name: string }[];
  locations?: { id: number; name: string }[];
  grades?: { id: number; name: string }[];
}

const FACT_OPTIONS = [
  { value: 'marital_status', label: 'Marital Status', type: 'select', options: ['Single', 'Married', 'Divorced', 'Widowed'] },
  { value: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female', 'Other'] },
  { value: 'tenure_years', label: 'Tenure (Years)', type: 'number' },
  { value: 'tenure_months', label: 'Tenure (Months)', type: 'number' },
  { value: 'date_of_joining', label: 'Date of Joining', type: 'date' },
  { value: 'date_of_birth', label: 'Date of Birth', type: 'date' },
  { value: 'confirmation_date', label: 'Confirmation Date', type: 'date' },
  { value: 'last_working_date', label: 'Last Working Date', type: 'date' },
  { value: 'department_id', label: 'Department', type: 'department' },
  { value: 'location_id', label: 'Location', type: 'location' },
  { value: 'grade_id', label: 'Grade', type: 'grade' },
  { value: 'employment_type', label: 'Employment Type', type: 'select', options: ['Full Time', 'Part Time', 'Contract', 'Intern', 'Probation'] },
];

const OPERATOR_OPTIONS = [
  { value: 'equals', label: 'is equal to (=)' },
  { value: 'not_equals', label: 'is not equal to (!=)' },
  { value: 'greater_than', label: 'is greater than (>)' },
  { value: 'greater_than_or_equal', label: 'is greater than or equal to (>=)' },
  { value: 'less_than', label: 'is less than (<)' },
  { value: 'less_than_or_equal', label: 'is less than or equal to (<=)' },
  { value: 'contains', label: 'contains' },
  { value: 'in_list', label: 'in list (comma separated)' },
];

const VALUE_TYPE_OPTIONS = [
  { value: 'static', label: 'Static value' },
  { value: 'another_fact', label: 'Another fact' },
  { value: 'duration', label: 'Duration' },
];

export const RuleConditionBuilder: React.FC<RuleConditionBuilderProps> = ({
  value,
  onChange,
  departments = [],
  locations = [],
  grades = [],
}) => {
  const rootGroup: ConditionGroup = value && value.conditions
    ? value
    : { id: 'root', conjunction: 'AND', conditions: [] };

  const updateRootGroup = (newGroup: ConditionGroup) => {
    onChange(newGroup);
  };

  const addCondition = (targetGroup: ConditionGroup) => {
    const newCond: ConditionItem = {
      id: 'cond_' + Math.random().toString(36).substring(2, 9),
      fact: 'gender',
      operator: 'equals',
      valueType: 'static',
      value: 'Male',
    };
    const updated = addConditionToGroup(rootGroup, targetGroup.id, newCond);
    updateRootGroup(updated);
  };

  const addSubGroup = (targetGroup: ConditionGroup) => {
    const newSub: ConditionGroup = {
      id: 'grp_' + Math.random().toString(36).substring(2, 9),
      conjunction: targetGroup.conjunction === 'AND' ? 'OR' : 'AND',
      conditions: [
        {
          id: 'cond_' + Math.random().toString(36).substring(2, 9),
          fact: 'tenure_years',
          operator: 'greater_than',
          valueType: 'static',
          value: '1',
        },
      ],
    };
    const updated = addConditionToGroup(rootGroup, targetGroup.id, newSub);
    updateRootGroup(updated);
  };

  const removeNode = (nodeId: string) => {
    const updated = removeNodeFromGroup(rootGroup, nodeId);
    updateRootGroup(updated);
  };

  const updateCondition = (condId: string, updates: Partial<ConditionItem>) => {
    const updated = updateConditionInGroup(rootGroup, condId, updates);
    updateRootGroup(updated);
  };

  const toggleConjunction = (groupId: string) => {
    const updated = toggleConjunctionInGroup(rootGroup, groupId);
    updateRootGroup(updated);
  };

  const renderGroup = (group: ConditionGroup, depth: number = 0) => {
    const isRoot = depth === 0;
    const isAnd = group.conjunction === 'AND' || group.conjunction === 'ALL';

    return (
      <div
        key={group.id}
        className={`rounded-xl border p-3.5 transition-all duration-200 ${
          isRoot
            ? 'bg-muted/30/70 dark:bg-slate-900/40 border-border/60 dark:border-slate-800'
            : 'bg-background dark:bg-slate-950 border-indigo-100 dark:border-indigo-950/60 shadow-xs ml-3 sm:ml-4 mt-3'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-border/60/70 dark:border-slate-800">
          {/* Left: Logic Toggle Pill */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground dark:text-muted-foreground/70">
              Match
            </span>
            <div className="inline-flex rounded-lg bg-muted/80 dark:bg-slate-800 p-0.5 text-xs font-medium border border-border/40 dark:border-slate-700/60 shadow-2xs">
              <button
                type="button"
                onClick={() => toggleConjunction(group.id)}
                className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                  isAnd
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-muted-foreground dark:text-muted-foreground/70 hover:text-foreground dark:hover:text-slate-200'
                }`}
              >
                ALL (AND)
              </button>
              <button
                type="button"
                onClick={() => toggleConjunction(group.id)}
                className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                  !isAnd
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-muted-foreground dark:text-muted-foreground/70 hover:text-foreground dark:hover:text-slate-200'
                }`}
              >
                ANY (OR)
              </button>
            </div>
            <HelpHint
              title="Condition Logic Group"
              titleHi="कंडीशन लॉजिक ग्रुप (नियम समूह)"
              description="ALL (AND): Every single rule in this group must evaluate to true. ANY (OR): If any one rule evaluates to true, the condition passes."
              descriptionHi="ALL (AND): इस ग्रुप के सभी नियमों का सही होना अनिवार्य है। ANY (OR): कोई भी एक नियम सही होने पर कंडीशन पास हो जाएगी।"
              example="ALL (AND): Gender = Female AND Marital Status = Married. ANY (OR): Location = Pune OR Location = Mumbai."
              exampleHi="ALL (AND): जेंडर = महिला और स्थिति = विवाहित। ANY (OR): लोकेशन = पुणे या लोकेशन = मुंबई।"
            />
          </div>

          {/* Right: Action Buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => addCondition(group)}
              className="h-7 px-2.5 rounded-lg text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200/80 dark:border-indigo-800/60 flex items-center gap-1 shadow-2xs transition-all cursor-pointer active:scale-95"
            >
              <Plus className="w-3 h-3" />
              <span>Condition</span>
            </button>
            <button
              type="button"
              onClick={() => addSubGroup(group)}
              className="h-7 px-2.5 rounded-lg text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200/80 dark:border-amber-800/60 flex items-center gap-1 shadow-2xs transition-all cursor-pointer active:scale-95"
            >
              <Layers className="w-3 h-3" />
              <span>Group</span>
            </button>
            {!isRoot && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeNode(group.id)}
                className="h-7 w-7 p-0 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-2.5 pt-2.5">
          {group.conditions.length === 0 ? (
            <div className="py-6 px-4 text-center rounded-xl border border-dashed border-border/60/80 dark:border-slate-800 bg-muted/30/40 dark:bg-slate-900/20 flex flex-col items-center justify-center gap-1.5">
              <div className="p-2 rounded-lg bg-muted/50 dark:bg-slate-800 text-muted-foreground">
                <SlidersHorizontal className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-foreground dark:text-white">No conditions yet</h4>
              <p className="text-[11px] text-muted-foreground max-w-xs">
                Without conditions this always applies. Add one to narrow down when it does.
              </p>
              <button
                type="button"
                onClick={() => addCondition(group)}
                className="mt-1 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-2xs transition-all cursor-pointer active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add condition</span>
              </button>
            </div>
          ) : (
            group.conditions.map((item) => {
              if ('conjunction' in item || 'conditions' in item) {
                return renderGroup(item as ConditionGroup, depth + 1);
              }
              return renderConditionRow(item as ConditionItem);
            })
          )}
        </div>
      </div>
    );
  };

  const renderConditionRow = (cond: ConditionItem) => {
    const selectedFact = FACT_OPTIONS.find((f) => f.value === cond.fact) || FACT_OPTIONS[0];

    return (
      <div
        key={cond.id}
        className="flex flex-wrap items-center gap-2 p-2.5 rounded-lg bg-background dark:bg-slate-950 border border-border/60/80 dark:border-slate-800 shadow-2xs hover:border-border dark:hover:border-slate-700 transition-all"
      >
        <div className="flex items-center gap-1 text-muted-foreground/70">
          <GitMerge className="w-3.5 h-3.5" />
        </div>

        {/* Fact Selector */}
        <select
          value={cond.fact}
          onChange={(e) => {
            const nextFact = e.target.value;
            const factDef = FACT_OPTIONS.find((f) => f.value === nextFact);
            let defaultVal: any = '';
            if (factDef?.options && factDef.options.length > 0) {
              defaultVal = factDef.options[0];
            } else if (factDef?.type === 'number') {
              defaultVal = '1';
            }
            updateCondition(cond.id, { fact: nextFact, value: defaultVal });
          }}
          className="h-8 rounded-md border border-border/60 dark:border-slate-700 bg-muted/30 dark:bg-slate-900 px-2.5 text-xs font-medium text-foreground dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          {FACT_OPTIONS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>

        {/* Operator Selector */}
        <select
          value={cond.operator}
          onChange={(e) => updateCondition(cond.id, { operator: e.target.value })}
          className="h-8 rounded-md border border-border/60 dark:border-slate-700 bg-muted/30 dark:bg-slate-900 px-2.5 text-xs font-medium text-foreground dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          {OPERATOR_OPTIONS.map((op) => (
            <option key={op.value} value={op.value}>
              {op.label}
            </option>
          ))}
        </select>

        {/* Value Type Selector */}
        <select
          value={cond.valueType || 'static'}
          onChange={(e) => updateCondition(cond.id, { valueType: e.target.value as any })}
          className="h-8 rounded-md border border-border/60 dark:border-slate-700 bg-muted/30 dark:bg-slate-900 px-2.5 text-xs text-muted-foreground dark:text-muted-foreground/70 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          {VALUE_TYPE_OPTIONS.map((vt) => (
            <option key={vt.value} value={vt.value}>
              {vt.label}
            </option>
          ))}
        </select>

        {/* Dynamic Value Input */}
        <div className="flex-1 min-w-[160px]">
          {cond.valueType === 'another_fact' ? (
            <select
              value={cond.value || ''}
              onChange={(e) => updateCondition(cond.id, { value: e.target.value })}
              className="w-full h-8 rounded-md border border-border/60 dark:border-slate-700 bg-background dark:bg-slate-900 px-2.5 text-xs text-foreground dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">Select Fact...</option>
              {FACT_OPTIONS.filter((f) => f.value !== cond.fact).map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          ) : cond.valueType === 'duration' ? (
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                value={cond.value ?? ''}
                onChange={(e) => updateCondition(cond.id, { value: e.target.value })}
                placeholder="Value"
                className="w-20 h-8 rounded-md border border-border/60 dark:border-slate-700 bg-background dark:bg-slate-900 px-2 text-xs text-foreground dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <select
                value={cond.durationUnit || 'years'}
                onChange={(e) => updateCondition(cond.id, { durationUnit: e.target.value as any })}
                className="h-8 rounded-md border border-border/60 dark:border-slate-700 bg-muted/30 dark:bg-slate-900 px-2 text-xs text-foreground dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="days">Days</option>
                <option value="months">Months</option>
                <option value="years">Years</option>
              </select>
            </div>
          ) : selectedFact.type === 'select' ? (
            <select
              value={cond.value || ''}
              onChange={(e) => updateCondition(cond.id, { value: e.target.value })}
              className="w-full h-8 rounded-md border border-border/60 dark:border-slate-700 bg-background dark:bg-slate-900 px-2.5 text-xs text-foreground dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">Select Option...</option>
              {selectedFact.options?.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          ) : selectedFact.type === 'department' ? (
            <select
              value={cond.value || ''}
              onChange={(e) => updateCondition(cond.id, { value: e.target.value })}
              className="w-full h-8 rounded-md border border-border/60 dark:border-slate-700 bg-background dark:bg-slate-900 px-2.5 text-xs text-foreground dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">Select Department...</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          ) : selectedFact.type === 'location' ? (
            <select
              value={cond.value || ''}
              onChange={(e) => updateCondition(cond.id, { value: e.target.value })}
              className="w-full h-8 rounded-md border border-border/60 dark:border-slate-700 bg-background dark:bg-slate-900 px-2.5 text-xs text-foreground dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">Select Location...</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          ) : selectedFact.type === 'grade' ? (
            <select
              value={cond.value || ''}
              onChange={(e) => updateCondition(cond.id, { value: e.target.value })}
              className="w-full h-8 rounded-md border border-border/60 dark:border-slate-700 bg-background dark:bg-slate-900 px-2.5 text-xs text-foreground dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">Select Grade...</option>
              {grades.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          ) : selectedFact.type === 'date' ? (
            <input
              type="date"
              value={cond.value ?? ''}
              onChange={(e) => updateCondition(cond.id, { value: e.target.value })}
              className="w-full h-8 rounded-md border border-border/60 dark:border-slate-700 bg-background dark:bg-slate-900 px-2.5 text-xs text-foreground dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          ) : selectedFact.type === 'number' ? (
            <input
              type="number"
              value={cond.value ?? ''}
              onChange={(e) => updateCondition(cond.id, { value: e.target.value })}
              placeholder="Number"
              className="w-full h-8 rounded-md border border-border/60 dark:border-slate-700 bg-background dark:bg-slate-900 px-2.5 text-xs text-foreground dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          ) : (
            <input
              type="text"
              value={cond.value ?? ''}
              onChange={(e) => updateCondition(cond.id, { value: e.target.value })}
              placeholder="Value"
              className="w-full h-8 rounded-md border border-border/60 dark:border-slate-700 bg-background dark:bg-slate-900 px-2.5 text-xs text-foreground dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          )}
        </div>

        {/* Delete Row Button */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => removeNode(cond.id)}
          className="h-8 px-2 text-muted-foreground/70 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    );
  };

  return <div className="w-full">{renderGroup(rootGroup, 0)}</div>;
};

// Helper utilities to immutably manipulate condition trees
function addConditionToGroup(
  root: ConditionGroup,
  targetGroupId: string,
  newChild: ConditionItem | ConditionGroup
): ConditionGroup {
  if (root.id === targetGroupId) {
    return {
      ...root,
      conditions: [...root.conditions, newChild],
    };
  }

  return {
    ...root,
    conditions: root.conditions.map((item) => {
      if ('conjunction' in item || 'conditions' in item) {
        return addConditionToGroup(item as ConditionGroup, targetGroupId, newChild);
      }
      return item;
    }),
  };
}

function removeNodeFromGroup(root: ConditionGroup, nodeId: string): ConditionGroup {
  return {
    ...root,
    conditions: root.conditions
      .filter((item) => item.id !== nodeId)
      .map((item) => {
        if ('conjunction' in item || 'conditions' in item) {
          return removeNodeFromGroup(item as ConditionGroup, nodeId);
        }
        return item;
      }),
  };
}

function updateConditionInGroup(
  root: ConditionGroup,
  condId: string,
  updates: Partial<ConditionItem>
): ConditionGroup {
  return {
    ...root,
    conditions: root.conditions.map((item) => {
      if (item.id === condId) {
        return { ...item, ...updates } as ConditionItem;
      }
      if ('conjunction' in item || 'conditions' in item) {
        return updateConditionInGroup(item as ConditionGroup, condId, updates);
      }
      return item;
    }),
  };
}

function toggleConjunctionInGroup(root: ConditionGroup, groupId: string): ConditionGroup {
  if (root.id === groupId) {
    const isAnd = root.conjunction === 'AND' || root.conjunction === 'ALL';
    return {
      ...root,
      conjunction: isAnd ? 'OR' : 'AND',
    };
  }

  return {
    ...root,
    conditions: root.conditions.map((item) => {
      if ('conjunction' in item || 'conditions' in item) {
        return toggleConjunctionInGroup(item as ConditionGroup, groupId);
      }
      return item;
    }),
  };
}
