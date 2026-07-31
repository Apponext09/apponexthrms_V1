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
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  updateUser: (partialUser: Partial<User>) => void;
  login: (email: string, password: string) => Promise<void>;
  fetchCurrentUser: () => Promise<void>;
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

          const user: User = {
            id: userObj.id || Math.abs(Array.from(email).reduce((acc, char) => (acc << 5) - acc + char.charCodeAt(0), 0)),
            email: userObj.email || email,
            firstName: userObj.firstName || userObj.first_name || defaultFirstName,
            lastName: userObj.lastName || userObj.last_name || defaultLastName,
            organizationId: computedOrgId,
            organizationName: orgObj.name || userObj.organizationName || (isDemoKot ? 'Apponext' : `${defaultFirstName}'s Org`),
            organizationCode: orgObj.code || userObj.organizationCode || (isDemoKot ? 'ORG' : `${defaultFirstName.slice(0, 3).toUpperCase()}`),
            organizationLocation: orgObj.location || userObj.organizationLocation || '',
            roles: loginData.roles || userObj.roles || ['organization_admin'],
            permissions: loginData.permissions || userObj.permissions || ['*'],
            employeeId: userObj.employeeId || userObj.employee_id || null,
            avatarUrl: userObj.avatarUrl || userObj.avatar_url || undefined,
            departmentName: userObj.departmentName || userObj.department_name || userObj.deptName || userObj.department || (isDemoKot ? 'Finance' : ''),
            deptName: userObj.deptName || userObj.departmentName || userObj.department || (isDemoKot ? 'Finance' : ''),
            designation: userObj.designation || (isDemoKot ? 'Finance Manager' : 'Organization Admin'),
          };

          if (loginData.accessToken) {
            localStorage.setItem('accessToken', loginData.accessToken);
          }
          if (loginData.refreshToken) {
            localStorage.setItem('refreshToken', loginData.refreshToken);
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
                  departmentName: data.user.departmentName || state.user.departmentName || 'Finance',
                },
              };
            });
          }
        } catch (error) {
          console.warn('fetchCurrentUser skipped:', error);
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
