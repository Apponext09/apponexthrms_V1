import { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './config/query';
import { AppRoutes } from './routes';
import { useThemeStore } from './features/settings/store/themeStore';

function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Initialize theme on mount
  useEffect(() => {
    useThemeStore.getState(); // Trigger persist middleware initialization
  }, []);

  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider>
          <AppRoutes />
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
