import React, { useState } from 'react';
import { Search, Plus, Loader2 } from 'lucide-react';
import { RuleCard } from './RuleCard';
import { useOTRules, useDeleteOTRule } from '../../hooks/useOTRules';
import { cn } from '@/lib/utils';

interface SidebarProps {
  selectedRuleId: number | null;
  onSelect: (id: number) => void;
  onNew: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ selectedRuleId, onSelect, onNew }) => {
  const [search, setSearch]       = useState('');
  const [statusFilter, setStatus] = useState<'all' | 'active' | 'inactive'>('active');

  const { data, isLoading } = useOTRules({
    search: search || undefined,
    isActive: statusFilter === 'all' ? undefined : statusFilter === 'active',
  });
  const deleteMutation = useDeleteOTRule();

  const rules = data?.items ?? [];
  const total = data?.total ?? 0;

  return (
    <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-xs flex flex-col h-full min-h-[500px]">
      
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          Overtime Policies
        </h3>
        <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-primary/10 text-primary">
          {total}
        </span>
      </div>

      {/* Filter Controls */}
      <div className="py-3 flex flex-col gap-2 border-b border-border">
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatus(e.target.value as any)}
            className="h-8 text-xs font-bold bg-background border border-input rounded-xl px-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer flex-1"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-8 pl-8 pr-2 text-xs bg-background border border-input rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        {/* Add New OT Rule Button */}
        <button
          type="button"
          onClick={onNew}
          className={cn(
            "w-full h-9 flex items-center justify-center gap-2 rounded-xl text-xs font-bold border border-dashed transition-all cursor-pointer",
            selectedRuleId === null
              ? "bg-primary/10 border-primary text-primary shadow-xs"
              : "bg-muted/30 border-border text-muted-foreground hover:bg-muted/60 hover:text-foreground"
          )}
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          Add New OT Rule
        </button>
      </div>

      {/* Rule List */}
      <div className="flex-1 overflow-y-auto pt-3 space-y-2 pr-1 custom-scrollbar">
        {isLoading && (
          <div className="py-8 flex items-center justify-center text-xs font-semibold text-muted-foreground gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            Loading policies...
          </div>
        )}

        {!isLoading && rules.length === 0 && (
          <div className="py-8 text-center text-xs font-semibold text-muted-foreground">
            No OT rules found
          </div>
        )}

        {rules.map((rule: any) => (
          <RuleCard
            key={rule.id}
            title={rule.ruleName ?? rule.rule_name ?? 'Unnamed Rule'}
            selected={selectedRuleId === rule.id}
            onClick={() => onSelect(rule.id)}
            onDelete={async () => {
              const name = rule.ruleName ?? rule.rule_name ?? 'this rule';
              if (await window.appConfirm(`Are you sure you want to delete "${name}"?`)) {
                await deleteMutation.mutateAsync(rule.id);
                if (selectedRuleId === rule.id) {
                  onNew();
                }
              }
            }}
          />
        ))}
      </div>
    </div>
  );
};
