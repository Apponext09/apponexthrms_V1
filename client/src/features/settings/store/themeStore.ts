import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeStore {
  theme: ThemeMode;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

export function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyTheme(theme: ThemeMode): 'light' | 'dark' {
  if (typeof document === 'undefined') return 'light';
  const htmlElement = document.documentElement;
  const isDark =
    theme === 'dark' ||
    (theme === 'system' && getSystemTheme() === 'dark');

  if (isDark) {
    htmlElement.classList.add('dark');
  } else {
    htmlElement.classList.remove('dark');
  }

  return isDark ? 'dark' : 'light';
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      theme: 'system',
      resolvedTheme: typeof window !== 'undefined' ? getSystemTheme() : 'light',
      setTheme: (theme: ThemeMode) => {
        const resolved = applyTheme(theme);
        set({ theme, resolvedTheme: resolved });
      },
      toggleTheme: () => {
        const isDark = get().resolvedTheme === 'dark';
        const next: ThemeMode = isDark ? 'light' : 'dark';
        get().setTheme(next);
      },
    }),
    {
      name: 'theme-store',
      partialize: (state) => ({ theme: state.theme } as ThemeStore),
      onRehydrateStorage: () => (state) => {
        if (state) {
          const resolved = applyTheme(state.theme);
          state.resolvedTheme = resolved;
        }
      },
    }
  )
);

// Initialize theme on app load
if (typeof window !== 'undefined') {
  try {
    const stored = localStorage.getItem('theme-store');
    if (stored) {
      const parsed = JSON.parse(stored);
      applyTheme(parsed?.state?.theme || 'system');
    } else {
      applyTheme('system');
    }
  } catch {
    applyTheme('system');
  }

  // Listen to system preference changes
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const handleSystemChange = (e: MediaQueryListEvent | MediaQueryList) => {
    const store = useThemeStore.getState();
    if (store.theme === 'system') {
      const isDark = 'matches' in e ? e.matches : mediaQuery.matches;
      const resolved: 'light' | 'dark' = isDark ? 'dark' : 'light';
      const htmlElement = document.documentElement;
      if (isDark) {
        htmlElement.classList.add('dark');
      } else {
        htmlElement.classList.remove('dark');
      }
      useThemeStore.setState({ resolvedTheme: resolved });
    }
  };

  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', handleSystemChange);
  } else if ((mediaQuery as any).addListener) {
    (mediaQuery as any).addListener(handleSystemChange);
  }
}

