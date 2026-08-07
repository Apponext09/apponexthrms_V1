import { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './config/query';
import { AppRoutes } from './routes';
import { useThemeStore } from './features/settings/store/themeStore';
import { useAuthStore } from './features/auth/store/authStore';
import { useAttendanceStore } from './features/attendance/store/attendanceStore';
import { BreakOverlay } from './features/attendance/components/BreakOverlay';
import { useBreakSync } from './features/attendance/hooks/useBreakSync';

function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Initialize theme and current user on mount
  useEffect(() => {
    useThemeStore.getState(); // Trigger persist middleware initialization
    if (localStorage.getItem('accessToken')) {
      useAuthStore.getState().fetchCurrentUser();
    }
  }, []);

  return <>{children}</>;
}

/**
 * BreakOverlayProvider — syncs break state from DB and renders overlay at root.
 * Mounted at root so the overlay persists across ALL route navigations.
 */
function BreakOverlayProvider({ children }: { children: React.ReactNode }) {
  useBreakSync(); // Sync break state from server on mount
  const { isOnBreak } = useAttendanceStore();

  return (
    <>
      {children}
      {isOnBreak && <BreakOverlay />}
    </>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider>
          <BreakOverlayProvider>
            <AppRoutes />
          </BreakOverlayProvider>
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
