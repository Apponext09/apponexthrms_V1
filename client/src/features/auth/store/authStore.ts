import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiClient } from '@/config/api';
import { policiesApi } from '@/features/policies/api/policiesApi';

export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  organizationId: number;
  organizationName?: string;
  organizationCode?: string;
  organizationLocation?: string;
  roles: string[];
  role?: string;
  accessRole?: string;
  permissions: string[];
  employeeId?: number | null;
  employee_id?: number | null;
  employeeCode?: string;
  mobile?: string;
  phone?: string;
  avatarUrl?: string;
  departmentName?: string;
  deptName?: string;
  designation?: string;
  companyId?: number | null;
  companyName?: string | null;
  policyAccepted?: boolean;
  policyAcceptedAt?: string | null;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  pendingPolicies: any[];
  setUser: (user: User | null) => void;
  updateUser: (partialUser: Partial<User>) => void;
  login: (email: string, password: string) => Promise<void>;
  fetchCurrentUser: () => Promise<void>;
  fetchPendingPolicies: () => Promise<any[]>;
  acceptPendingPolicy: (policyId: number) => Promise<void>;
  acceptPolicy: () => Promise<void>;
  logout: () => void;
}

export function hasStoredAccessToken(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(localStorage.getItem('accessToken'));
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      pendingPolicies: [],

      setUser: (user) => set({ user, isAuthenticated: !!user }),

      updateUser: (partialUser) =>
        set((state) => {
          if (!state.user) return state;
          return { user: { ...state.user, ...partialUser } };
        }),

      fetchPendingPolicies: async () => {
        try {
          const pending = await policiesApi.getPendingPolicies();
          set({ pendingPolicies: pending });
          return pending;
        } catch (error) {
          console.warn('Failed to fetch pending policies:', error);
          set({ pendingPolicies: [] });
          return [];
        }
      },

      login: async (email: string, password: string) => {
        try {
          const response = await apiClient.post('/auth/login', { email, password });
          const loginData = response.data?.data || response.data;

          const userObj = loginData.user || {};
          const orgObj = loginData.organization || {};

          // Generate stable numerical organization ID for non-demo users
          const isDemoKot = (userObj.email || email).toLowerCase().includes('kot@gmail.com') || (userObj.email || email).toLowerCase().includes('pp@gmail.com');
          const computedOrgId = userObj.organizationId || userObj.organization_id || orgObj.id || (isDemoKot ? 1 : Math.abs(Array.from(email).reduce((acc, char) => (acc << 5) - acc + char.charCodeAt(0), 0)) || 2);

          const nameParts = (email.split('@')[0] || 'User').split(/[\._]/);
          const defaultFirstName = nameParts[0] ? nameParts[0].charAt(0).toUpperCase() + nameParts[0].slice(1) : 'User';
          const defaultLastName = nameParts[1] ? nameParts[1].charAt(0).toUpperCase() + nameParts[1].slice(1) : '';

          const compId = userObj.companyId || userObj.company_id || null;
          const compName = userObj.companyName || userObj.company_name || null;

          const user: User = {
            id: userObj.id || Math.abs(Array.from(email).reduce((acc, char) => (acc << 5) - acc + char.charCodeAt(0), 0)),
            email: userObj.email || email,
            firstName: userObj.firstName || userObj.first_name || defaultFirstName,
            lastName: userObj.lastName || userObj.last_name || defaultLastName,
            organizationId: computedOrgId,
            organizationName: orgObj.name || userObj.organizationName || (isDemoKot ? 'Apponext' : `${defaultFirstName}'s Org`),
            organizationCode: orgObj.code || userObj.organizationCode || (isDemoKot ? 'ORG' : `${defaultFirstName.slice(0, 3).toUpperCase()}`),
            organizationLocation: orgObj.location || userObj.organizationLocation || '',
            roles: loginData.roles || userObj.roles || [],
            permissions: loginData.permissions || userObj.permissions || [],
            employeeId: userObj.employeeId || userObj.employee_id || null,
            avatarUrl: userObj.avatarUrl || userObj.avatar_url || undefined,
            departmentName: userObj.departmentName || userObj.department_name || userObj.deptName || userObj.department || (isDemoKot ? 'Finance' : ''),
            deptName: userObj.deptName || userObj.departmentName || userObj.department || (isDemoKot ? 'Finance' : ''),
            designation: userObj.designation || (isDemoKot ? 'Finance Manager' : 'Organization Admin'),
            companyId: compId,
            companyName: compName,
            policyAccepted: Boolean(userObj.policyAccepted ?? userObj.policy_accepted ?? loginData.policyAccepted ?? false),
            policyAcceptedAt: userObj.policyAcceptedAt || userObj.policy_accepted_at || loginData.policyAcceptedAt || null,
          };

          if (loginData.accessToken) {
            localStorage.setItem('accessToken', loginData.accessToken);
          }
          if (loginData.refreshToken) {
            localStorage.setItem('refreshToken', loginData.refreshToken);
          }
          localStorage.removeItem('last-logout-time');

          if (compId) {
            try {
              const { useCompanyStore } = await import('@/features/settings/store/companyStore');
              useCompanyStore.getState().setSelectedCompany(Number(compId), compName);
            } catch (e) {
              console.warn('Unable to auto-set company store context:', e);
            }
          }

          set({ user, isAuthenticated: true });

          // Fetch pending mandatory policies immediately after login
          try {
            const pending = await policiesApi.getPendingPolicies();
            set({ pendingPolicies: pending });
          } catch (e) {
            console.warn('Unable to fetch pending policies on login:', e);
          }
        } catch (error) {
          console.error('Login error:', error);
          throw error;
        }
      },

      fetchCurrentUser: async () => {
        try {
          const response = await apiClient.get('/auth/me');
          const data = response.data?.data || response.data;
          if (data?.user) {
            set((state) => {
              const previous = state.user;
              return {
                isAuthenticated: true,
                user: {
                  ...(previous || {}),
                  ...data.user,
                  id: data.user.id || previous?.id,
                  email: data.user.email || previous?.email,
                  firstName: data.user.firstName || data.user.first_name || previous?.firstName || '',
                  lastName: data.user.lastName || data.user.last_name || previous?.lastName || '',
                  organizationId: data.user.organizationId || data.user.organization_id || previous?.organizationId,
                  roles: data.roles || data.user.roles || previous?.roles || [],
                  permissions: data.permissions || data.user.permissions || previous?.permissions || [],
                  departmentName: data.user.departmentName || previous?.departmentName || '',
                  policyAccepted: Boolean(data.user.policyAccepted ?? data.user.policy_accepted ?? previous?.policyAccepted ?? false),
                  policyAcceptedAt: data.user.policyAcceptedAt || data.user.policy_accepted_at || previous?.policyAcceptedAt || null,
                } as User,
              };
            });

            // Re-fetch pending policies upon fetching current user
            try {
              const pending = await policiesApi.getPendingPolicies();
              set({ pendingPolicies: pending });
            } catch (e) {
              console.warn('Unable to fetch pending policies on fetchCurrentUser:', e);
            }
          }
        } catch (error) {
          console.warn('fetchCurrentUser skipped:', error);
        }
      },

      acceptPendingPolicy: async (policyId: number) => {
        try {
          await policiesApi.acknowledgePolicy(policyId);
          set((state) => {
            const remaining = state.pendingPolicies.filter((p) => p.id !== policyId);
            return {
              pendingPolicies: remaining,
              user: state.user
                ? {
                    ...state.user,
                    policyAccepted: remaining.length === 0,
                    policyAcceptedAt: remaining.length === 0 ? new Date().toISOString() : state.user.policyAcceptedAt,
                  }
                : null,
            };
          });
        } catch (error) {
          console.error('acceptPendingPolicy failed:', error);
          throw error;
        }
      },

      acceptPolicy: async () => {
        try {
          const res = await apiClient.post('/auth/accept-policy');
          if (res.data?.success || res.data?.policyAccepted) {
            set((state) => {
              if (!state.user) return state;
              return {
                user: {
                  ...state.user,
                  policyAccepted: true,
                  policyAcceptedAt: new Date().toISOString(),
                },
                pendingPolicies: [],
              };
            });
          }
        } catch (error) {
          console.error('acceptPolicy failed:', error);
          throw error;
        }
      },

      logout: () => {
        // Clear all tokens and auth data
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('ai-chat-storage');
        localStorage.removeItem('auth-storage');

        // Set logout timestamp to detect session changes
        localStorage.setItem('last-logout-time', Date.now().toString());

        // Clear browser service worker cache
        if ('caches' in window) {
          caches.keys().then(names => {
            names.forEach(name => {
              caches.delete(name).catch(() => {
                // Ignore errors
              });
            });
          });
        }

        // Disable browser back button completely
        // Clear all history by replacing state multiple times
        window.history.replaceState(null, '', '/login');
        window.history.replaceState(null, '', '/login?logout=true');
        window.history.replaceState(null, '', '/login?' + new Date().getTime());

        // Prevent back button by listening to popstate
        const preventBack = (e: PopStateEvent) => {
          window.history.pushState(null, '', '/login?' + new Date().getTime());
        };
        window.addEventListener('popstate', preventBack);

        set({ user: null, isAuthenticated: false });

        // Force hard redirect with cache busting
        const timestamp = new Date().getTime();
        window.location.replace('/login?' + timestamp);

        // Extra safety: prevent any code after logout from running
        return;
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export function useAuthHydrated(): boolean {
  const [hydrated, setHydrated] = useState(() => useAuthStore.persist.hasHydrated());

  useEffect(() => {
    const unsub = useAuthStore.persist.onFinishHydration(() => setHydrated(true));
    if (useAuthStore.persist.hasHydrated()) {
      setHydrated(true);
    }
    return unsub;
  }, []);

  return hydrated;
}
