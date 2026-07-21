import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeStore {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      theme: 'system',
      setTheme: (theme: ThemeMode) => {
        set({ theme });
        applyTheme(theme);
      },
      toggleTheme: () => {
        const current = get().theme;
        const next: ThemeMode = current === 'light' ? 'dark' : 'light';
        get().setTheme(next);
      },
    }),
    {
      name: 'theme-store',
    }
  )
);

function applyTheme(theme: ThemeMode) {
  const htmlElement = document.documentElement;
  const isDark =
    theme === 'dark' ||
    (theme === 'system' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  if (isDark) {
    htmlElement.classList.add('dark');
  } else {
    htmlElement.classList.remove('dark');
  }
}

// Initialize theme on app load
if (typeof window !== 'undefined') {
  const stored = localStorage.getItem('theme-store');
  if (stored) {
    const parsed = JSON.parse(stored);
    applyTheme(parsed.state.theme);
  } else {
    applyTheme('system');
  }

  // Listen to system preference changes
  window
    .matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', () => {
      const store = useThemeStore.getState();
      if (store.theme === 'system') {
        applyTheme('system');
      }
    });
}
