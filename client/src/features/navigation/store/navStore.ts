import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface NavStoreState {
  expandedSections: Record<string, boolean>;
  toggleSection: (sectionId: string) => void;
  setSectionExpanded: (sectionId: string, expanded: boolean) => void;
  expandSection: (sectionId: string) => void;
  collapseSection: (sectionId: string) => void;
  collapseAll: () => void;
  expandAll: (sectionIds: string[]) => void;
  expandSectionContainingRoute: (route: string, navigationConfig: any) => void;
}

export const useNavStore = create<NavStoreState>()(
  persist(
    (set, get) => ({
      expandedSections: {},

      toggleSection: (sectionId: string) => {
        set((state) => ({
          expandedSections: {
            ...state.expandedSections,
            [sectionId]: !state.expandedSections[sectionId],
          },
        }));
      },

      setSectionExpanded: (sectionId: string, expanded: boolean) => {
        set((state) => ({
          expandedSections: {
            ...state.expandedSections,
            [sectionId]: expanded,
          },
        }));
      },

      expandSection: (sectionId: string) => {
        set((state) => ({
          expandedSections: {
            ...state.expandedSections,
            [sectionId]: true,
          },
        }));
      },

      collapseSection: (sectionId: string) => {
        set((state) => ({
          expandedSections: {
            ...state.expandedSections,
            [sectionId]: false,
          },
        }));
      },

      collapseAll: () => {
        set({ expandedSections: {} });
      },

      expandAll: (sectionIds: string[]) => {
        const newExpandedSections: Record<string, boolean> = {};
        sectionIds.forEach((id) => {
          newExpandedSections[id] = true;
        });
        set({ expandedSections: newExpandedSections });
      },

      expandSectionContainingRoute: (route: string, navigationConfig: any) => {
        for (const section of navigationConfig) {
          const item = section.items?.find((i: any) => i.href === route);
          if (item && section.id !== 'dashboard' && section.id !== 'platform_admin') {
            get().expandSection(section.id);
            return;
          }
        }
      },
    }),
    {
      name: 'nav-store',
    }
  )
);
