import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiClient } from '@/config/api';

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
  setUser: (user: User | null) => void;
  updateUser: (partialUser: Partial<User>) => void;
  login: (email: string, password: string) => Promise<void>;
  fetchCurrentUser: () => Promise<void>;
  acceptPolicy: () => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,

      setUser: (user) => set({ user, isAuthenticated: !!user }),

      updateUser: (partialUser) =>
        set((state) => {
          if (!state.user) return state;
          return { user: { ...state.user, ...partialUser } };
        }),

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
            // Deny by default: an empty/missing roles or permissions list from
            // the server must never be masked by an admin-level fallback here.
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

          // If logging in as a company/branch admin, set the companyStore active company context automatically
          if (compId) {
            try {
              const { useCompanyStore } = await import('@/features/settings/store/companyStore');
              useCompanyStore.getState().setSelectedCompany(Number(compId), compName);
            } catch (e) {
              console.warn('Unable to auto-set company store context:', e);
            }
          }

          set({ user, isAuthenticated: true });
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
              if (!state.user) return state;
              return {
                user: {
                  ...state.user,
                  ...data.user,
                  roles: data.roles || data.user.roles || state.user.roles || [],
                  permissions: data.permissions || data.user.permissions || state.user.permissions || [],
                  departmentName: data.user.departmentName || state.user.departmentName || 'Finance',
                  policyAccepted: Boolean(data.user.policyAccepted ?? data.user.policy_accepted ?? state.user.policyAccepted ?? false),
                  policyAcceptedAt: data.user.policyAcceptedAt || data.user.policy_accepted_at || state.user.policyAcceptedAt || null,
                },
              };
            });
          }
        } catch (error) {
          console.warn('fetchCurrentUser skipped:', error);
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
              };
            });
          }
        } catch (error) {
          console.error('acceptPolicy failed:', error);
          throw error;
        }
      },

      logout: () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('ai-chat-storage');
        set({ user: null, isAuthenticated: false });
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);
