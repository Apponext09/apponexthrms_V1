import React, { useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EligibilityItem {
  id: number;
  name: string;
}

interface EligibilityPanelProps {
  title:          string;
  entityType:     string;
  defaultExpanded?: boolean;
  items:          EligibilityItem[];
  value:          number[];
  onChange:       (ids: number[]) => void;
}

export const EligibilityPanel: React.FC<EligibilityPanelProps> = ({
  title,
  defaultExpanded = false,
  items,
  value,
  onChange,
}) => {
  const [expanded, setExpanded] = useState<boolean>(defaultExpanded);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.checked ? items.map((i) => i.id) : []);
  };

  const handleItemChange = (id: number) => {
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id));
    } else {
      onChange([...value, id]);
    }
  };

  const isAllSelected   = items.length > 0 && value.length === items.length;

  return (
    <div className="border border-border/80 rounded-xl overflow-hidden bg-card transition-all mb-2">
      {/* Panel Header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className={cn(
          "w-full flex items-center justify-between px-3.5 py-2.5 text-left transition-colors cursor-pointer select-none",
          expanded ? "bg-muted/30 border-b border-border" : "hover:bg-muted/20"
        )}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-foreground">
            {title}
          </span>
          {value.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-primary/10 text-primary">
              {value.length} selected
            </span>
          )}
        </div>

        <ChevronDown
          className={cn(
            "w-3.5 h-3.5 text-muted-foreground transition-transform duration-200",
            expanded && "rotate-180"
          )}
        />
      </button>

      {/* Panel Content Body */}
      {expanded && (
        <div className="p-3 max-h-48 overflow-y-auto space-y-1.5 custom-scrollbar">
          {items.length === 0 ? (
            <div className="text-xs font-semibold text-muted-foreground italic py-1">
              No options available
            </div>
          ) : (
            <>
              {/* Select All */}
              <label className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-muted/40 cursor-pointer select-none border-b border-border/50 mb-1 pb-2">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={handleSelectAll}
                  className="w-3.5 h-3.5 rounded border-input text-primary focus:ring-primary/20 accent-primary cursor-pointer"
                />
                <span className="text-xs font-bold text-foreground">
                  Select All
                </span>
              </label>

              {/* Items */}
              {items.map((item) => {
                const checked = value.includes(item.id);
                return (
                  <label
                    key={item.id}
                    className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-muted/40 cursor-pointer select-none"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleItemChange(item.id)}
                      className="w-3.5 h-3.5 rounded border-input text-primary focus:ring-primary/20 accent-primary cursor-pointer"
                    />
                    <span className="text-xs font-medium text-foreground/80">
                      {item.name}
                    </span>
                  </label>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
};
