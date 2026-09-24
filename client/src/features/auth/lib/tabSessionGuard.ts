/**
 * Tab-session guard — automatic logout when the browser / app tab is closed.
 *
 * Mechanism (no polling of the server, integrates with the existing
 * localStorage-based JWT auth):
 *
 *  - `sessionStorage` holds a per-tab marker. It survives page refreshes,
 *    SPA route changes and same-tab link navigation, but the browser wipes it
 *    when the tab is closed. So "marker present" === "this tab was only
 *    reloaded / navigated", never "reopened after a close".
 *
 *  - A small registry in `localStorage` tracks currently-open tabs (with a
 *    heartbeat) so that opening the app in a *second* tab inherits the running
 *    session instead of being logged out.
 *
 *  - On `pagehide`, a tab removes itself from the registry; the last tab to
 *    leave records an "all closed" flag. On the next boot, if there is no tab
 *    marker and the app was fully closed, the stored tokens are cleared and a
 *    best-effort `POST /auth/logout` revokes the server session.
 *
 * This module must be imported before the app (and before the auth store), so
 * that stale tokens are cleared before Zustand hydrates from localStorage.
 */

const TAB_MARKER_KEY = 'hrms-tab-session';
const OPEN_TABS_KEY = 'hrms-open-tabs';
const ALL_CLOSED_KEY = 'hrms-session-closed';
const HEARTBEAT_MS = 5000;
const STALE_MS = 20000;

type TabRegistry = Record<string, number>;

const tabId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

let initialised = false;

function safeGet(store: Storage, key: string): string | null {
  try {
    return store.getItem(key);
  } catch {
    return null;
  }
}

function readRegistry(): TabRegistry {
  try {
    const raw = localStorage.getItem(OPEN_TABS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeRegistry(reg: TabRegistry): void {
  try {
    localStorage.setItem(OPEN_TABS_KEY, JSON.stringify(reg));
  } catch {
    /* ignore quota / disabled storage */
  }
}

function pruneRegistry(reg: TabRegistry): TabRegistry {
  const now = Date.now();
  const pruned: TabRegistry = {};
  for (const [id, ts] of Object.entries(reg)) {
    if (typeof ts === 'number' && now - ts < STALE_MS) pruned[id] = ts;
  }
  return pruned;
}

function hasStoredToken(): boolean {
  return Boolean(safeGet(localStorage, 'accessToken'));
}

/** Best-effort server-side session revocation + local token cleanup. */
function performLogout(): void {
  const token = safeGet(localStorage, 'accessToken');

  try {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('ai-chat-storage');
    localStorage.removeItem('auth-storage');
  } catch {
    /* ignore */
  }

  if (!token) return;

  try {
    const rawApiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000/api/v1';
    const base = rawApiUrl.endsWith('/v1') ? rawApiUrl : `${rawApiUrl}/v1`;
    void fetch(`${base}/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      credentials: 'include',
      keepalive: true,
    }).catch(() => {
      /* network errors are non-fatal — tokens are already cleared locally */
    });
  } catch {
    /* ignore */
  }
}

function registerTab(): void {
  const reg = pruneRegistry(readRegistry());
  reg[tabId] = Date.now();
  writeRegistry(reg);
}

function deregisterTab(): void {
  const reg = pruneRegistry(readRegistry());
  delete reg[tabId];
  writeRegistry(reg);
  if (Object.keys(reg).length === 0) {
    try {
      localStorage.setItem(ALL_CLOSED_KEY, Date.now().toString());
    } catch {
      /* ignore */
    }
  }
}

/**
 * Runs once at startup. Decides whether the previous browsing session was
 * closed and, if so, logs the user out before the app renders.
 *
 * Invoked as a module side-effect (see the import in `main.tsx`) so that it
 * executes before the auth store module evaluates and hydrates from
 * localStorage.
 */
export function initTabSessionGuard(): void {
  if (typeof window === 'undefined') return;
  if (initialised) return;
  initialised = true;

  const hasMarker = Boolean(safeGet(sessionStorage, TAB_MARKER_KEY));

  if (!hasMarker && hasStoredToken()) {
    // No tab marker => this is a fresh tab, not a reload/navigation.
    const registry = pruneRegistry(readRegistry());
    const siblingAlive = Object.keys(registry).length > 0;
    const wasAllClosed = Boolean(safeGet(localStorage, ALL_CLOSED_KEY));

    // Log out when the whole app was closed, or when we cannot find another
    // live tab to inherit the session from (covers browser restart & crash).
    if (wasAllClosed || !siblingAlive) {
      performLogout();
    }
  }

  try {
    sessionStorage.setItem(TAB_MARKER_KEY, '1');
  } catch {
    /* ignore */
  }
  try {
    localStorage.removeItem(ALL_CLOSED_KEY);
  } catch {
    /* ignore */
  }

  registerTab();

  const heartbeat = window.setInterval(() => {
    const reg = pruneRegistry(readRegistry());
    reg[tabId] = Date.now();
    writeRegistry(reg);
  }, HEARTBEAT_MS);

  const onHide = () => {
    window.clearInterval(heartbeat);
    deregisterTab();
  };

  window.addEventListener('pagehide', onHide);
}

// Run immediately on import (before the auth store hydrates).
initTabSessionGuard();
