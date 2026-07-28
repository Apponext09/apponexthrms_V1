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

          const user: User = {
            id: userObj.id || 1,
            email: userObj.email || email,
            firstName: userObj.firstName || userObj.first_name || 'pp',
            lastName: userObj.lastName || userObj.last_name || '',
            organizationId: userObj.organizationId || userObj.organization_id || orgObj.id || 1,
            organizationName: orgObj.name || userObj.organizationName || 'Organization',
            organizationCode: orgObj.code || userObj.organizationCode || 'ORG',
            organizationLocation: orgObj.location || userObj.organizationLocation || '',
            roles: loginData.roles || userObj.roles || ['department_head'],
            permissions: loginData.permissions || userObj.permissions || ['*'],
            employeeId: userObj.employeeId || userObj.employee_id || null,
            avatarUrl: userObj.avatarUrl || userObj.avatar_url || undefined,
            departmentName: userObj.departmentName || userObj.department_name || userObj.deptName || userObj.department || 'Finance',
            deptName: userObj.deptName || userObj.departmentName || userObj.department || 'Finance',
            designation: userObj.designation || 'Finance Manager',
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
        set({ user: null, isAuthenticated: false });
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);
