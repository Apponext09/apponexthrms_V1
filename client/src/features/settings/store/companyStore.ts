import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CompanyContextState {
  selectedCompanyId: number | null; // null represents Organization (Parent) context
  selectedCompanyName: string | null;
  setSelectedCompany: (id: number | null, name?: string | null) => void;
  resetCompanyContext: () => void;
}

export const useCompanyStore = create<CompanyContextState>()(
  persist(
    (set) => ({
      selectedCompanyId: null,
      selectedCompanyName: null,
      setSelectedCompany: (id: number | null, name: string | null = null) =>
        set({ selectedCompanyId: id, selectedCompanyName: name }),
      resetCompanyContext: () => set({ selectedCompanyId: null, selectedCompanyName: null }),
    }),
    {
      name: 'company-context-storage',
    }
  )
);
