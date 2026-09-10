import React, { useState, useMemo } from 'react';
import { Building2, ChevronDown, Check, Search, ShieldCheck, Layers, Sparkles, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useCompanies, Company } from '@/features/settings/hooks/useCompanies';
import { useCompanyStore } from '@/features/settings/store/companyStore';
import { useQueryClient } from '@tanstack/react-query';
import { showToast } from '@/components/ui/toast';

export function CompanySelector() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const { user } = useAuthStore();
  const { data: companies = [], isLoading } = useCompanies();
  const { selectedCompanyId, setSelectedCompany } = useCompanyStore();
  const queryClient = useQueryClient();

  // Child company logins (e.g. abc@gmail.com) have user.companyId & role company_admin -> LOCKED to branch
  // Parent organization admins have no user.companyId -> UNLOCKED (can switch to any sub-company & back to parent)
  const isBranchLocked = Boolean(
    user?.companyId && user?.roles?.includes('company_admin') && !user?.roles?.includes('super_admin')
  );

  // Derive org name from the actual parent company record in DB; fall back to /me user data
  const parentCompany = useMemo(() => companies.find((c) => c.isParent), [companies]);

  const organizationName =
    parentCompany?.name ||
    user?.organizationName ||
    user?.organizationCode ||
    (user as any)?.organization?.name ||
    '';

  // Identify sub-companies (non-parent entries)
  const subCompanies = useMemo(() => {
    return companies.filter((c) => !c.isParent);
  }, [companies]);

  // Find active entity
  const activeCompany = useMemo(() => {
    if (selectedCompanyId) {
      const match = companies.find((c) => c.id === selectedCompanyId);
      if (match) return match;
    }
    return null; // null means Organization context is active
  }, [companies, selectedCompanyId]);

  const activeLabel = activeCompany ? activeCompany.name : organizationName;
  const isOrgActive = Boolean(selectedCompanyId === null || (activeCompany && activeCompany.isParent));

  // Filter sub-companies based on search query
  const filteredSubCompanies = useMemo(() => {
    if (!search.trim()) return subCompanies;
    const term = search.toLowerCase();
    return subCompanies.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        (c.code && c.code.toLowerCase().includes(term))
    );
  }, [subCompanies, search]);

  const handleSelectOrganization = () => {
    if (isOrgActive) return; // Prevent switching to the same active context
    setSelectedCompany(null, organizationName);
    setOpen(false);
    queryClient.invalidateQueries();
    showToast.success('Organization Switched', ` ${organizationName} `);
  };

  const handleSelectSubCompany = (company: Company) => {
    if (selectedCompanyId === company.id) return; // Prevent switching to the same active context
    setSelectedCompany(company.id, company.name);
    setOpen(false);
    queryClient.invalidateQueries();
    showToast.success('Company Switched', `${company.name} `);
  };

  // If user is locked to a specific branch/company (e.g. company_admin login), block context switching completely
  if (isBranchLocked) {
    const label = user?.companyName || activeLabel;
    return (
      <div className="h-9 max-w-[240px] flex items-center gap-2 rounded-lg border border-border/80 bg-muted/40 px-3 text-xs font-bold text-foreground shadow-xs cursor-default">
        <Building2 className="size-3.5 flex-shrink-0 text-primary" />
        <span className="truncate">{label}</span>
        <Badge
          variant="outline"
          className="h-4 px-1.5 text-[9px] font-extrabold uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 flex items-center gap-1 shrink-0"
        >
          <Lock className="size-2.5" /> Branch Locked
        </Badge>
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9 max-w-[220px] gap-2 rounded-lg border-border bg-muted/60 px-3 text-xs font-bold text-foreground hover:bg-muted hover:text-foreground transition-all shadow-xs"
        >
          <Building2 className="size-3.5 flex-shrink-0 text-primary" />
          <span className="truncate">{activeLabel}</span>
          <Badge
            variant="outline"
            className={cn(
              'h-4 px-1 text-[9px] font-extrabold uppercase border-transparent',
              isOrgActive
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30'
            )}
          >
            {isOrgActive ? 'Org' : 'Sub'}
          </Badge>
          <ChevronDown className="size-3 flex-shrink-0 text-muted-foreground transition-transform duration-200" />
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80 p-0 shadow-xl border-border bg-card">
        {/* Header */}
        
        
          {/* Search */}
          {subCompanies.length > 3 && (
            <div className="relative mt-2.5">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search sub-companies..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 pl-8 text-xs bg-card"
              />
            </div>
          )}
        

        {/* Scrollable Content */}
        <div className="max-h-72 overflow-y-auto p-1.5 space-y-3">
          {/* Section 1: Main Parent Organization */}
          <div>
            <p className="px-2 pt-1 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <ShieldCheck className="size-3 text-amber-500" />
             Organization
            </p>

            <button
              type="button"
              disabled={isOrgActive}
              onClick={handleSelectOrganization}
              className={cn(
                'w-full flex items-center justify-between p-2.5 rounded-lg text-xs transition-all text-left group',
                isOrgActive
                  ? 'bg-amber-500/10 text-amber-900 dark:text-amber-200 border border-amber-500/30 cursor-not-allowed font-semibold opacity-90'
                  : 'hover:bg-muted text-foreground border border-transparent cursor-pointer'
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="size-7 rounded-md bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black text-xs border border-amber-500/30">
                  {organizationName.substring(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold truncate">{organizationName}</span>
                    <Badge variant="outline" className="h-3.5 px-1 text-[9px] font-bold border-amber-500/40 text-amber-600 dark:text-amber-400">
                      Organization
                    </Badge>
                  </div>
                  
                </div>
              </div>

              {isOrgActive ? (
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[10px] font-extrabold">
                  <Check className="size-3" />
                  <span>Active</span>
                </div>
              ) : (
                <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                  Switch
                </span>
              )}
            </button>
          </div>

          {/* Section 2: Sub-Companies */}
          <div>
            <p className="px-2 pt-1 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Layers className="size-3 text-blue-500" />
              Companies ({subCompanies.length})
            </p>

            {isLoading ? (
              <div className="p-3 text-center text-xs text-muted-foreground">Loading sub-companies...</div>
            ) : filteredSubCompanies.length === 0 ? (
              <div className="p-3 text-center text-xs text-muted-foreground italic">
                {search ? 'No sub-company matching search' : 'No sub-companies created yet'}
              </div>
            ) : (
              <div className="space-y-1">
                {filteredSubCompanies.map((company) => {
                  const isCurrentActive = selectedCompanyId === company.id;

                  return (
                    <button
                      key={company.id || (company as any).uuid || company.name}
                      type="button"
                      disabled={isCurrentActive}
                      onClick={() => handleSelectSubCompany(company)}
                      className={cn(
                        'w-full flex items-center justify-between p-2.5 rounded-lg text-xs transition-all text-left group',
                        isCurrentActive
                          ? 'bg-blue-500/10 text-blue-900 dark:text-blue-200 border border-blue-500/30 cursor-not-allowed font-semibold opacity-90'
                          : 'hover:bg-muted text-foreground border border-transparent cursor-pointer'
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {company.logo ? (
                          <img
                            src={company.logo}
                            alt={company.name}
                            className="size-7 rounded-md object-cover border border-border"
                          />
                        ) : (
                          <div className={cn(
                            'size-7 rounded-md flex items-center justify-center text-[11px] font-bold border',
                            isCurrentActive
                              ? 'bg-blue-500/20 border-blue-500/40 text-blue-600 dark:text-blue-400'
                              : 'bg-muted border-border text-muted-foreground group-hover:border-primary/30'
                          )}>
                            {company.name.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold truncate">{company.name}</span>
                            <Badge variant="outline" className="h-3.5 px-1 text-[9px] font-bold border-blue-500/40 text-blue-600 dark:text-blue-400">
                              Company
                            </Badge>
                          </div>
                        
                        </div>
                      </div>

                      {isCurrentActive ? (
                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-700 dark:text-blue-300 text-[10px] font-extrabold">
                          <Check className="size-3" />
                          <span>Active</span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                          Switch
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
