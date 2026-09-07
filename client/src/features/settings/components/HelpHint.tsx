import React, { useState, useRef, useEffect, useId } from 'react';
import { HelpCircle, Info, Sparkles, X } from 'lucide-react';

export interface HelpHintProps {
  title: string;
  titleHi?: string;
  description: string;
  descriptionHi?: string;
  effect?: string;
  effectHi?: string;
  example?: string;
  exampleHi?: string;
  className?: string;
}

// Global active hint tracker to ensure ONLY 1 hint is ever open at a time
let currentActiveHintId: string | null = null;

// Global language state hook synced with localStorage
export function useHintLanguage() {
  const [lang, setLang] = useState<'en' | 'hi'>(() => {
    return (localStorage.getItem('hrms_hint_lang') as 'en' | 'hi') || 'en';
  });

  const changeLang = (newLang: 'en' | 'hi') => {
    setLang(newLang);
    localStorage.setItem('hrms_hint_lang', newLang);
    window.dispatchEvent(new Event('hrms_hint_lang_change'));
  };

  useEffect(() => {
    const handleSync = () => {
      const stored = (localStorage.getItem('hrms_hint_lang') as 'en' | 'hi') || 'en';
      setLang(stored);
    };
    window.addEventListener('hrms_hint_lang_change', handleSync);
    return () => window.removeEventListener('hrms_hint_lang_change', handleSync);
  }, []);

  return { lang, changeLang };
}

export const HelpHint: React.FC<HelpHintProps> = ({
  title,
  titleHi,
  description,
  descriptionHi,
  effect,
  effectHi,
  example,
  exampleHi,
  className = '',
}) => {
  const hintId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [placement, setPlacement] = useState<'top' | 'bottom'>('top');
  const hintRef = useRef<HTMLDivElement>(null);
  const { lang, changeLang } = useHintLanguage();

  // Dynamic clearance check on open
  useEffect(() => {
    if (!isOpen || !hintRef.current) return;
    const rect = hintRef.current.getBoundingClientRect();
    if (rect.top < 240) {
      setPlacement('bottom');
    } else {
      setPlacement('top');
    }
  }, [isOpen]);

  // Listen to global open hint events
  useEffect(() => {
    const handleGlobalHintChange = (e: CustomEvent<string | null>) => {
      if (e.detail !== hintId) {
        setIsOpen(false);
      }
    };

    window.addEventListener('hrms_active_hint_change' as any, handleGlobalHintChange);
    return () => {
      window.removeEventListener('hrms_active_hint_change' as any, handleGlobalHintChange);
    };
  }, [hintId]);

  // Close when clicking outside, focusing an input, or pressing Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e: MouseEvent) => {
      if (hintRef.current && !hintRef.current.contains(e.target as Node)) {
        closeHint();
      }
    };

    const handleFocusIn = (e: FocusEvent) => {
      if (hintRef.current && !hintRef.current.contains(e.target as Node)) {
        closeHint();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeHint();
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const openHint = () => {
    currentActiveHintId = hintId;
    window.dispatchEvent(new CustomEvent('hrms_active_hint_change', { detail: hintId }));
    setIsOpen(true);
  };

  const closeHint = () => {
    if (currentActiveHintId === hintId) {
      currentActiveHintId = null;
    }
    setIsOpen(false);
  };

  const toggleHint = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOpen) {
      closeHint();
    } else {
      openHint();
    }
  };

  const activeTitle = (lang === 'hi' && titleHi) ? titleHi : title;
  const activeDesc = (lang === 'hi' && descriptionHi) ? descriptionHi : description;
  const activeEffect = (lang === 'hi' && effectHi) ? effectHi : (effect || effectHi);
  const activeExample = (lang === 'hi' && exampleHi) ? exampleHi : (example || exampleHi);

  return (
    <div className={`relative inline-flex items-center align-middle ${className}`} ref={hintRef}>
      <button
        type="button"
        onClick={toggleHint}
        className={`inline-flex items-center justify-center w-4 h-4 rounded-full transition-all cursor-pointer focus:outline-none ml-1.5 shrink-0 ${
          isOpen
            ? 'text-indigo-600 bg-indigo-100 dark:bg-indigo-900/60 dark:text-indigo-300 ring-2 ring-indigo-500/30'
            : 'text-muted-foreground/70 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 dark:text-muted-foreground dark:hover:text-indigo-400'
        }`}
        title="Click to view setting guidance (English & Hindi)"
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </button>

      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={`absolute z-50 left-0 sm:left-1/2 sm:-translate-x-1/2 w-72 sm:w-84 max-w-[90vw] p-3.5 bg-slate-900/95 text-white dark:bg-slate-900 dark:text-slate-100 rounded-2xl shadow-2xl border border-slate-700/60 backdrop-blur-md text-left transition-all animate-in fade-in-0 zoom-in-95 pointer-events-auto ${
            placement === 'bottom' ? 'top-full mt-2' : 'bottom-full mb-2'
          }`}
        >
          {/* Header with EN / HI Language Switcher & Close Button */}
          <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-800">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="p-1 rounded-md bg-indigo-500/20 text-indigo-400 shrink-0">
                <Info className="w-3.5 h-3.5" />
              </span>
              <span className="text-xs font-bold text-slate-100 truncate">{activeTitle}</span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Language Switcher Badge */}
              <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg p-0.5 text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => changeLang('en')}
                  className={`px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                    lang === 'en'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-muted-foreground/70 hover:text-white'
                  }`}
                  title="Switch to English"
                >
                  EN
                </button>
                <button
                  type="button"
                  onClick={() => changeLang('hi')}
                  className={`px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                    lang === 'hi'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-muted-foreground/70 hover:text-white'
                  }`}
                  title="हिंदी में देखें"
                >
                  हिन्दी
                </button>
              </div>

              <button
                type="button"
                onClick={closeHint}
                className="text-muted-foreground/70 hover:text-white p-0.5 rounded-md focus:outline-none cursor-pointer"
                title="Close Hint"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Description Content */}
          <div className="pt-2.5 space-y-2 text-[11px] leading-relaxed max-h-[60vh] overflow-y-auto">
            <p className="text-slate-300 font-medium">{activeDesc}</p>

            {/* Impact / Effect */}
            {activeEffect && (
              <div className="p-2 rounded-xl bg-slate-800/80 border border-slate-700/50 space-y-1">
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                  {lang === 'hi' ? '⚙️ Change karne par kya hoga:' : '⚙️ What happens when changed:'}
                </span>
                <p className="text-slate-300 text-[11px] leading-normal">{activeEffect}</p>
              </div>
            )}

            {/* Example */}
            {activeExample && (
              <div className="p-2 rounded-xl bg-indigo-950/40 border border-indigo-800/40 space-y-1">
                <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-indigo-400" />
                  {lang === 'hi' ? 'Example / Udaharan:' : 'Example:'}
                </span>
                <p className="text-indigo-200 text-[11px] leading-normal">{activeExample}</p>
              </div>
            )}
          </div>

          {/* Pointer Arrow */}
          <div
            className={`absolute left-4 sm:left-1/2 sm:-translate-x-1/2 border-4 border-transparent ${
              placement === 'bottom'
                ? 'bottom-full border-b-slate-900/95'
                : 'top-full border-t-slate-900/95'
            }`}
          />
        </div>
      )}
    </div>
  );
};
