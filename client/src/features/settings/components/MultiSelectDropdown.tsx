import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Search, ChevronDown, ChevronUp, X } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

export interface MultiSelectOption {
  id: string | number;
  label: string;
}

interface MultiSelectDropdownProps {
  placeholder?: string;
  options: MultiSelectOption[];
  selectedIds: (string | number)[];
  onChange: (selectedIds: (string | number)[]) => void;
  className?: string;
}

export const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
  placeholder = 'choose options...',
  options,
  selectedIds = [],
  onChange,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [coords, setCoords] = useState<{ top?: number; bottom?: number; left: number; width: number; isUp: boolean }>({
    left: 0,
    width: 240,
    isUp: false,
  });

  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Filter options based on search query
  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isAllSelected =
    options.length > 0 && selectedIds.length === options.length;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      onChange([]);
    } else {
      onChange(options.map((opt) => opt.id));
    }
  };

  const toggleOption = (id: string | number) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((item) => item !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const removeOption = (e: React.MouseEvent, id: string | number) => {
    e.stopPropagation();
    onChange(selectedIds.filter((item) => item !== id));
  };

  const updatePosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const isUp = spaceBelow < 240 && rect.top > 240;

      setCoords({
        left: Math.min(rect.left, window.innerWidth - 260),
        width: Math.max(rect.width, 240),
        isUp,
        top: isUp ? undefined : rect.bottom + 4,
        bottom: isUp ? window.innerHeight - rect.top + 4 : undefined,
      });
    }
  };

  const handleToggle = () => {
    if (!isOpen) {
      updatePosition();
    }
    setIsOpen((prev) => !prev);
  };

  // Update position on scroll/resize
  useEffect(() => {
    if (!isOpen) return;

    const handleScrollOrResize = () => {
      updatePosition();
    };

    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen]);

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node) &&
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOptions = options.filter((opt) => selectedIds.includes(opt.id));

  return (
    <div className={`relative inline-block align-middle ${className}`}>
      {/* Trigger Box */}
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className="min-h-8 min-w-[180px] max-w-[420px] px-3 py-1 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-slate-800 dark:text-slate-200 flex items-center justify-between gap-2 shadow-2xs transition-all cursor-pointer"
      >
        {selectedOptions.length === 0 ? (
          <span className="text-slate-400 font-normal">{placeholder}</span>
        ) : (
          <div className="flex flex-wrap items-center gap-1 my-0.5 max-w-[340px]">
            {selectedOptions.map((opt) => (
              <span
                key={opt.id}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/60"
              >
                <span>{opt.label}</span>
                <span
                  onClick={(e) => removeOption(e, opt.id)}
                  className="hover:bg-blue-200 dark:hover:bg-blue-900 rounded p-0.5 cursor-pointer text-blue-600 dark:text-blue-300"
                >
                  <X className="w-3 h-3" />
                </span>
              </span>
            ))}
          </div>
        )}
        {isOpen ? (
          <ChevronUp className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        )}
      </button>

      {/* Popover Menu rendered with Portal */}
      {isOpen &&
        ReactDOM.createPortal(
          <div
            ref={popoverRef}
            style={{
              position: 'fixed',
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              top: coords.top !== undefined ? `${coords.top}px` : undefined,
              bottom: coords.bottom !== undefined ? `${coords.bottom}px` : undefined,
              zIndex: 99999,
            }}
            className="p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl animate-in fade-in-50 zoom-in-95 duration-100"
          >
            {/* Search Box */}
            <div className="relative mb-2">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="w-full h-8 pl-8 pr-3 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                autoFocus
              />
            </div>

            {/* Select All */}
            <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer border-b border-slate-100 dark:border-slate-800/80 mb-1">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white cursor-pointer w-full">
                <Checkbox
                  checked={isAllSelected}
                  onCheckedChange={toggleSelectAll}
                />
                <span>Select All</span>
              </label>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-300">
                {selectedIds.length}/{options.length}
              </span>
            </div>

            {/* Options List */}
            <div className="max-h-48 overflow-y-auto space-y-0.5 pr-0.5">
              {filteredOptions.length === 0 ? (
                <div className="py-3 text-center text-[11px] text-slate-400">
                  No items found
                </div>
              ) : (
                filteredOptions.map((opt) => {
                  const isSelected = selectedIds.includes(opt.id);
                  return (
                    <div
                      key={opt.id}
                      onClick={() => toggleOption(opt.id)}
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-blue-600 text-white font-semibold'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 font-medium'
                      }`}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleOption(opt.id)}
                        className={isSelected ? 'border-white bg-white text-blue-600' : ''}
                      />
                      <span className="truncate">{opt.label}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
