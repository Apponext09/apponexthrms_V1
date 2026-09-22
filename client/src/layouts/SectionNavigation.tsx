import { useEffect, useRef, useState, type ComponentType } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { create } from 'zustand';
//Imports
export type SectionLink = { name: string; href: string; icon?: ComponentType<{ className?: string }>; isLocked?: boolean; children?: SectionLink[]; subItems?: SectionLink[] };
export type SectionGroup = { label: string; icon?: ComponentType<{ className?: string }>; items: SectionLink[] };

const useSectionGroups = create<{ groups: Record<string, SectionGroup[]>; setGroups: (id: string, groups: SectionGroup[]) => void }>(set => ({
  groups: {},
  setGroups: (id, groups) => set(state => ({ groups: { ...state.groups, [id]: groups } })),
}));

function links(group: SectionGroup): SectionLink[] {
  return group.items.flatMap(item => item.children?.length ? item.children : item.subItems?.length ? item.subItems : [item]);
}

function activeLink(groups: SectionGroup[], pathname: string, search: string) {
  const all = groups.flatMap(links);
  return all.filter(item => item.href.includes('?') ? `${pathname}${search}` === item.href : pathname === item.href || pathname.startsWith(item.href + '/'))
    .sort((a, b) => b.href.length - a.href.length)[0];
}

export function renderRailLabel(label: string): React.ReactNode {
  if (!label) return '';
  const cleaned = label.trim();

  const MULTI_LINE_MAP: Record<string, [string, string]> = {
    'CORE HR': ['Core', 'HR'],
    'Core HR': ['Core', 'HR'],
    'CoreHR': ['Core', 'HR'],
    'EMPLOYEE CORE': ['Core', 'HR'],
    'Employee Core': ['Core', 'HR'],
    'SHIFT MANAGEMENT': ['Shift', 'Management'],
    'Shift Management': ['Shift', 'Management'],
    'LEAVE MANAGEMENT': ['Leave', 'Management'],
    'Leave Management': ['Leave', 'Management'],
    'SETTLEMENT MANAGEMENT': ['Exit', 'Settlements'],
    'Settlement Management': ['Exit', 'Settlements'],
    'LOAN MANAGEMENT': ['Loan', 'Management'],
    'Loan Management': ['Loan', 'Management'],
    'LOAN MGMT': ['Loan', 'Management'],
    'Loan Mgmt': ['Loan', 'Management'],
    'EXPENSE MANAGEMENT': ['Expense', 'Management'],
    'Expense Management': ['Expense', 'Management'],
    'EXPENSE & DISBURSAL': ['Expense &', 'Disbursal'],
    'ASSET MANAGEMENT': ['Asset', 'Management'],
    'Asset Management': ['Asset', 'Management'],
    'REPORTS & ANALYTICS': ['Reports &', 'Analytics'],
    'Reports & Analytics': ['Reports &', 'Analytics'],
    'HR OPERATIONS': ['HR', 'Operations'],
    'Hr Operations': ['HR', 'Operations'],
    'HR Operations': ['HR', 'Operations'],
    'HROperations': ['HR', 'Operations'],
    'POLICY GOVERNANCE': ['Policy', 'Governance'],
    'Policy Governance': ['Policy', 'Governance'],
    'OPERATIONAL MASTERS': ['Master', 'Operations'],
    'Operational Masters': ['Master', 'Operations'],
    'Master Operations': ['Master', 'Operations'],
    'MASTER OPERATIONS': ['Master', 'Operations'],
    'MasterOperations': ['Master', 'Operations'],
    'MODULE MANAGEMENT': ['Module', 'Management'],
    'Module Management': ['Module', 'Management'],
    'APPROVALS & GOVERNANCE': ['Approvals &', 'Governance'],
    'Approvals & Governance': ['Approvals &', 'Governance'],
    'DEVELOPMENT & ENGAGEMENT': ['Development &', 'Engagement'],
    'CAREER & OPENINGS': ['Career &', 'Openings'],
    'TOOLS & SUPPORT': ['Tools &', 'Support'],
    'FINANCE & AUDIT': ['Finance &', 'Audit'],
    'MY SELF SERVICE': ['Self', 'Service'],
  };

  if (MULTI_LINE_MAP[cleaned]) {
    const [line1, line2] = MULTI_LINE_MAP[cleaned];
    return (
      <span className="block leading-[1.15] text-center">
        {line1}
        <br />
        {line2}
      </span>
    );
  }

  // If label has 2 words, split with <br />
  const words = cleaned.split(/\s+/);
  if (words.length === 2) {
    return (
      <span className="block leading-[1.15] text-center">
        {words[0]}
        <br />
        {words[1]}
      </span>
    );
  }

  return <span className="block leading-[1.15] text-center">{cleaned}</span>;
}

export function formatRailLabel(label: string): string {
  return label;
}

export function SectionRail({ id, groups, open, onNavigate }: { id: string; groups: SectionGroup[]; open: boolean; onNavigate?: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const setGroups = useSectionGroups(state => state.setGroups);
  // Keep the tab strip in the adjacent layout synchronized with role and license filtering.
  usePublishGroups(setGroups, id, groups);
  const selected = activeLink(groups, location.pathname, location.search);
  return <nav aria-label="Main navigation" className="sidebar-scrollbar flex-1 space-y-1 overflow-y-auto px-2.5 py-2 md:px-1.5">
    {groups.map(group => {
      const groupLinks = links(group);
      if (!groupLinks.length) return null;
      const Icon = group.icon || group.items[0]?.icon;
      const active = groupLinks.some(item => item.href === selected?.href);
      return <button key={group.label} type="button" title={group.label} aria-label={group.label}
        aria-current={active ? 'page' : undefined}
        onClick={() => { const target = active ? selected : groupLinks[0]; if (target && !target.isLocked) { navigate(target.href); onNavigate?.(); } }}
        className={cn('flex min-h-10 w-full flex-row items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left transition-colors md:min-h-[54px] md:flex-col md:justify-center md:gap-0.5 md:rounded-xl md:px-1 md:text-center',
          active ? 'bg-primary/10 text-primary dark:bg-primary/20' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}>
        {Icon && <Icon className="size-4 shrink-0 md:size-[18px]" />}
        {open && <span className="w-full text-xs font-semibold md:text-[10px] tracking-tight">{renderRailLabel(group.label)}</span>}
      </button>;
    })}
  </nav>;
}


function usePublishGroups(setGroups: (id: string, groups: SectionGroup[]) => void, id: string, groups: SectionGroup[]) {
  // This is a hook so the rail can publish its filtered sections after rendering.
  useEffect(() => { setGroups(id, groups); }, [setGroups, id, groups]);
}

export function SectionTabs({ id }: { id: string }) {
  const groups = useSectionGroups(state => state.groups[id] || []);
  const location = useLocation();
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollEdges, setScrollEdges] = useState({ left: false, right: false });
  const selected = activeLink(groups, location.pathname, location.search);
  const group = groups.find(group => links(group).some(item => item.href === selected?.href));
  const updateScrollEdges = () => {
    const element = scrollRef.current;
    if (!element) return;
    setScrollEdges({
      left: element.scrollLeft > 2,
      right: element.scrollLeft + element.clientWidth < element.scrollWidth - 2,
    });
  };

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    updateScrollEdges();
    const observer = new ResizeObserver(updateScrollEdges);
    observer.observe(element);
    if (element.firstElementChild) observer.observe(element.firstElementChild);
    return () => observer.disconnect();
  }, [group, groups]);

  const scrollTabs = (direction: -1 | 1) => {
    const element = scrollRef.current;
    if (!element) return;
    element.scrollBy({ left: direction * Math.max(180, element.clientWidth * 0.65), behavior: 'smooth' });
  };

  if (!group || links(group).length < 2) return null;
  return <nav aria-label={`${group.label} pages`} className="shrink-0 border-b border-border bg-card px-4 py-2.5 sm:px-6">
    <div className="flex min-w-0 items-center gap-2">
      {scrollEdges.left && <button type="button" onClick={() => scrollTabs(-1)} aria-label="Scroll tabs left"
        className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50">
        <ChevronLeft className="size-4" />
      </button>}
      <div ref={scrollRef} onScroll={updateScrollEdges} className="no-scrollbar min-w-0 flex-1 overflow-x-auto">
        <div className="flex w-max items-center gap-1 rounded-xl border border-border bg-muted/50 p-1">
          {links(group).map(item => {
            const active = selected?.href === item.href;
            const Icon = item.icon;
            return <button key={item.href} type="button" disabled={item.isLocked}
              onClick={() => navigate(item.href)} aria-current={active ? 'page' : undefined}
              className={cn('inline-flex min-h-9 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 sm:text-[13px]',
                active ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-card hover:text-foreground',
                item.isLocked && 'cursor-not-allowed opacity-50')}>
              {Icon && <Icon className="size-3.5 shrink-0" />}
              <span>{item.name}</span>
            </button>;
          })}
        </div>
      </div>
      {scrollEdges.right && <button type="button" onClick={() => scrollTabs(1)} aria-label="Scroll tabs right"
        className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50">
        <ChevronRight className="size-4" />
      </button>}
    </div>
  </nav>;
}
