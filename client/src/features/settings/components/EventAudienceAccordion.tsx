import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Search, CheckSquare, Square } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { AudienceOption } from '../hooks/useEventAudienceOptions';

interface EventAudienceAccordionProps {
  title: string;
  icon?: React.ReactNode;
  options: AudienceOption[];
  selectedIds: (string | number)[];
  onChange: (selected: (string | number)[]) => void;
  defaultExpanded?: boolean;
}

export function EventAudienceAccordion({
  title,
  icon,
  options = [],
  selectedIds = [],
  onChange,
  defaultExpanded = false,
}: EventAudienceAccordionProps) {
  const [isOpen, setIsOpen] = useState(defaultExpanded);
  const [search, setSearch] = useState('');

  const filteredOptions = options.filter(
    (opt) =>
      opt.label.toLowerCase().includes(search.toLowerCase()) ||
      (opt.code && opt.code.toLowerCase().includes(search.toLowerCase()))
  );

  const isAllSelected =
    options.length > 0 && options.every((opt) => selectedIds.includes(opt.id));
  const selectedCount = selectedIds.length;

  const handleToggleOption = (id: string | number) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((item) => item !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const handleToggleAll = () => {
    if (selectedCount > 0) {
      // Unselect All
      onChange([]);
    } else {
      // Select All
      onChange(options.map((o) => o.id));
    }
  };

  return (
    <div className="border border-border/80 rounded-2xl bg-card overflow-hidden transition-all shadow-2xs">
      {/* Accordion Header */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between bg-muted/20 hover:bg-muted/40 transition-colors text-left font-medium text-xs text-foreground"
      >
        <div className="flex items-center gap-2.5">
          {icon && <span className="text-primary">{icon}</span>}
          <span className="font-semibold text-foreground">{title}</span>
          {selectedCount > 0 ? (
            <Badge variant="default" className="text-[10px] px-2 py-0.5 rounded-full bg-primary text-primary-foreground font-bold">
              {selectedCount} selected
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] px-2 py-0.5 rounded-full text-muted-foreground font-normal">
              All ({options.length})
            </Badge>
          )}
        </div>
        <div className="text-muted-foreground">
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {/* Accordion Content */}
      {isOpen && (
        <div className="p-3.5 space-y-2.5 border-t border-border/60 bg-background">
          {/* Top Controls: Unselect All / Select All + Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border/40">
            <button
              type="button"
              onClick={handleToggleAll}
              className="flex items-center gap-1.5 text-xs text-primary hover:underline font-semibold"
            >
              {selectedCount > 0 ? (
                <>
                  <CheckSquare className="h-3.5 w-3.5" /> Unselect All
                </>
              ) : (
                <>
                  <Square className="h-3.5 w-3.5 text-muted-foreground" /> Select All ({options.length})
                </>
              )}
            </button>

            {options.length > 5 && (
              <div className="relative max-w-xs">
                <Search className="h-3 w-3 absolute left-2.5 top-2.5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder={`Search ${title.toLowerCase()}...`}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-7 text-[11px] pl-7 pr-2.5 bg-muted/20 rounded-lg border-border/60"
                />
              </div>
            )}
          </div>

          {/* Options Grid / List */}
          {filteredOptions.length === 0 ? (
            <p className="text-[11px] text-muted-foreground py-2 text-center">
              No matching options found.
            </p>
          ) : (
            <div className="max-h-48 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5 pr-1">
              {filteredOptions.map((opt) => {
                const checked = selectedIds.includes(opt.id);
                return (
                  <label
                    key={String(opt.id)}
                    className={cn(
                      'flex items-center gap-2 px-2.5 py-1.5 rounded-xl border text-xs cursor-pointer select-none transition-all',
                      checked
                        ? 'border-primary/40 bg-primary/10 text-primary font-semibold'
                        : 'border-border/60 hover:bg-muted/30 text-foreground'
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleToggleOption(opt.id)}
                      className="h-3.5 w-3.5 accent-primary rounded cursor-pointer"
                    />
                    <span className="truncate">{opt.label}</span>
                    {opt.code && (
                      <span className="text-[10px] text-muted-foreground shrink-0 font-mono ml-auto">
                        {opt.code}
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
