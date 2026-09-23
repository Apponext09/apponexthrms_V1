import React, { useEffect, Component, useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './config/query';
import { AppRoutes } from './routes';
import { useThemeStore } from './features/settings/store/themeStore';
import { useAuthStore } from './features/auth/store/authStore';
import { useAttendanceStore } from './features/attendance/store/attendanceStore';
import { BreakOverlay } from './features/attendance/components/BreakOverlay';
import { useBreakSync } from './features/attendance/hooks/useBreakSync';
import { LoadingScreen } from './components/LoadingScreen';

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

// function ThemeProvider({ children }: { children: React.ReactNode }) {
//   const [isLoading, setIsLoading] = useState(false);

//   // Disable DevTools and Inspection - Multiple methods
//   useEffect(() => {
//     // 1. Block right-click context menu
//     const disableRightClick = (e: MouseEvent) => {
//       e.preventDefault();
//       return false;
//     };

//     // 2. Block keyboard shortcuts for DevTools
//     const disableKeys = (e: KeyboardEvent) => {
//       // F12 - DevTools
//       if (e.key === 'F12') {
//         e.preventDefault();
//         return false;
//       }
//       // Ctrl+Shift+I - Inspect (Chrome)
//       if (e.ctrlKey && e.shiftKey && e.key === 'I') {
//         e.preventDefault();
//         return false;
//       }
//       // Ctrl+Shift+C - Inspect (Firefox)
//       if (e.ctrlKey && e.shiftKey && e.key === 'C') {
//         e.preventDefault();
//         return false;
//       }
//       // Ctrl+Shift+J - Console (Chrome)
//       if (e.ctrlKey && e.shiftKey && e.key === 'J') {
//         e.preventDefault();
//         return false;
//       }
//       // Ctrl+Shift+K - Console (Firefox)
//       if (e.ctrlKey && e.shiftKey && e.key === 'K') {
//         e.preventDefault();
//         return false;
//       }
//       // Ctrl+I - Inspect (some browsers)
//       if (e.ctrlKey && e.key === 'I') {
//         e.preventDefault();
//         return false;
//       }
//     };

//     // 3. Block copy/paste
//     const disableCopyPaste = (e: ClipboardEvent) => {
//       e.preventDefault();
//       return false;
//     };

//     // 4. Detect if DevTools is opened (via size check - immediately close)
//     let isDevToolsOpen = false;
//     const checkDevToolsSize = () => {
//       const threshold = 160;
//       const isOpen = window.outerWidth - window.innerWidth > threshold ||
//                      window.outerHeight - window.innerHeight > threshold;

//       if (isOpen && !isDevToolsOpen) {
//         isDevToolsOpen = true;
//         // Immediately redirect to prevent any access
//         window.location.href = '/login';
//         return;
//       }
//       isDevToolsOpen = isOpen;
//     };

//     // Setup event listeners
//     document.addEventListener('contextmenu', disableRightClick, { passive: false });
//     document.addEventListener('keydown', disableKeys, { capture: true, passive: false });
//     document.addEventListener('copy', disableCopyPaste, { passive: false });
//     document.addEventListener('cut', disableCopyPaste, { passive: false });
//     document.addEventListener('paste', disableCopyPaste, { passive: false });

//     // Check for DevTools every 100ms (very aggressive)
//     const devToolsCheckInterval = setInterval(checkDevToolsSize, 100);

//     // Disable text selection
//     document.body.style.userSelect = 'none';
//     document.body.style.webkitUserSelect = 'none';
//     (document.body as any).style.msUserSelect = 'none';
//     (document.body as any).style.mozUserSelect = 'none';

//     // Block inspect element via developer tools protocol
//     try {
//       (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__ = undefined;
//       (window as any).__REDUX_DEVTOOLS_EXTENSION__ = undefined;
//     } catch (e) {
//       // Ignore errors
//     }

//     return () => {
//       document.removeEventListener('contextmenu', disableRightClick);
//       document.removeEventListener('keydown', disableKeys, true);
//       document.removeEventListener('copy', disableCopyPaste);
//       document.removeEventListener('cut', disableCopyPaste);
//       document.removeEventListener('paste', disableCopyPaste);
//       clearInterval(devToolsCheckInterval);
//     };
//   }, []);

//   // Initialize theme and current user on mount
//   useEffect(() => {
//     useThemeStore.getState(); // Trigger persist middleware initialization

//     // Show loading screen while fetching user data
//     const token = localStorage.getItem('accessToken');
//     if (token) {
//       setIsLoading(true);
//       // Fetch user data in background without blocking navigation
//       useAuthStore.getState().fetchCurrentUser()
//         .catch((err) => {
//           console.warn('Failed to fetch user:', err);
//         })
//         .finally(() => {
//           setIsLoading(false);
//         });
//     }

//     // Track last user ID and logout time to detect session changes
//     let lastUserId: number | null = null;
//     let lastLogoutTime = localStorage.getItem('last-logout-time');

//     // Re-validate auth when tab becomes visible (back from other tab)
//     const handleVisibilityChange = () => {
//       if (document.visibilityState === 'visible') {
//         const { isAuthenticated, user, fetchCurrentUser, logout } = useAuthStore.getState();

//         // Check if logout happened in another tab
//         const currentLogoutTime = localStorage.getItem('last-logout-time');
//         if (currentLogoutTime && currentLogoutTime !== lastLogoutTime) {
//           // Logout happened elsewhere - logout this session too
//           logout();
//           return;
//         }

//         // Check if different user logged in
//         if (user && lastUserId && user.id !== lastUserId) {
//           // Different user - force redirect
//           window.location.href = '/login?' + new Date().getTime();
//           return;
//         }

//         if (lastUserId === null && user) {
//           lastUserId = user.id;
//         }

//         if (isAuthenticated && localStorage.getItem('accessToken')) {
//           // Re-validate token is still valid
//           fetchCurrentUser().catch(() => {
//             // Token invalid, logout
//             logout();
//           });
//         }
//       }
//     };

//     // Check on window focus
//     const handleFocus = () => {
//       const { isAuthenticated, user, fetchCurrentUser, logout } = useAuthStore.getState();

//       // Check if logout happened
//       const currentLogoutTime = localStorage.getItem('last-logout-time');
//       if (currentLogoutTime && currentLogoutTime !== lastLogoutTime) {
//         logout();
//         return;
//       }

//       // Check if different user logged in
//       if (user && lastUserId && user.id !== lastUserId) {
//         window.location.href = '/login?' + new Date().getTime();
//         return;
//       }

//       if (lastUserId === null && user) {
//         lastUserId = user.id;
//       }

//       if (isAuthenticated && localStorage.getItem('accessToken')) {
//         fetchCurrentUser().catch(() => {
//           logout();
//         });
//       }
//     };

//     // Prevent back button navigation
//     const handlePopState = (e: PopStateEvent) => {
//       const { isAuthenticated } = useAuthStore.getState();
//       if (!isAuthenticated) {
//         window.history.pushState(null, '', '/login');
//       }
//     };

//     document.addEventListener('visibilitychange', handleVisibilityChange);
//     window.addEventListener('focus', handleFocus);
//     window.addEventListener('popstate', handlePopState);

//     return () => {
//       document.removeEventListener('visibilitychange', handleVisibilityChange);
//       window.removeEventListener('focus', handleFocus);
//       window.removeEventListener('popstate', handlePopState);
//     };
//   }, []);

//   return (
//     <>
//       {isLoading && <LoadingScreen />}
//       {children}
//     </>
//   );
// }

function AuthInitializer({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    useThemeStore.getState();

    const token = localStorage.getItem('accessToken');
    if (token && !useAuthStore.getState().user) {
      useAuthStore.getState().fetchCurrentUser()
        .catch((err) => {
          console.warn('[AuthInitializer] Failed to fetch current user:', err);
          if (err?.response?.status === 401 || err?.status === 401) {
            useAuthStore.getState().logout();
          }
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, []);

  if (isLoading && Boolean(localStorage.getItem('accessToken')) && !useAuthStore.getState().user) {
    return <LoadingScreen />;
  }

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
          <AuthInitializer>
            <BreakOverlayProvider>
              <AppRoutes />
            </BreakOverlayProvider>
          </AuthInitializer>
        </BrowserRouter>
      </QueryClientProvider>
    </AppErrorBoundary>
  );
}
