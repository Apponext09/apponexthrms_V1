import React, { useEffect, Component } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './config/query';
import { AppRoutes } from './routes';
import { useThemeStore } from './features/settings/store/themeStore';
import { useAuthStore } from './features/auth/store/authStore';
import { useAttendanceStore } from './features/attendance/store/attendanceStore';
import { BreakOverlay } from './features/attendance/components/BreakOverlay';
import { useBreakSync } from './features/attendance/hooks/useBreakSync';

// ── Global Error Boundary ──────────────────────────────────────────────────
// Catches any unhandled React render errors and shows a readable message
// instead of a completely blank white page (which is impossible to debug).
class AppErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[AppErrorBoundary] Caught render error:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#0f172a', color: '#f1f5f9', fontFamily: 'monospace', padding: '2rem'
        }}>
          <div style={{ maxWidth: 720, width: '100%' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#f87171', marginBottom: 12 }}>
              ⚠️ Application Error — React render crashed
            </div>
            <div style={{
              background: '#1e293b', border: '1px solid #334155', borderRadius: 8,
              padding: '1rem', fontSize: 12, color: '#e2e8f0', whiteSpace: 'pre-wrap', wordBreak: 'break-all'
            }}>
              <strong style={{ color: '#fb923c' }}>{this.state.error?.name}: </strong>
              {this.state.error?.message}
              {'\n\n'}
              {this.state.error?.stack}
            </div>
            <button
              onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
              style={{
                marginTop: 16, padding: '8px 20px', background: '#3b82f6', color: '#fff',
                border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: 'pointer'
              }}
            >
              🔄 Reload App
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

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
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ThemeProvider>
            <BreakOverlayProvider>
              <AppRoutes />
            </BreakOverlayProvider>
          </ThemeProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </AppErrorBoundary>
  );
}
