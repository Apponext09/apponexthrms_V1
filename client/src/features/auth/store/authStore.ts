import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
          const rawApiUrl = (import.meta as any).env.VITE_API_URL || 'http://localhost:5000/api/v1';
          const baseUrl = rawApiUrl.endsWith('/v1') ? rawApiUrl : `${rawApiUrl}/v1`;
          const response = await fetch(`${baseUrl}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          });

          if (!response.ok) throw new Error('Login failed');

          const apiResponse = await response.json();
          const loginData = apiResponse.data;

          const user: User = {
            id: loginData.user.id,
            email: loginData.user.email,
            firstName: loginData.user.firstName || '',
            lastName: loginData.user.lastName || '',
            organizationId: loginData.user.organizationId,
            organizationName: loginData.organization?.name || '',
            organizationCode: loginData.organization?.code || '',
            organizationLocation: loginData.organization?.location || '',
            roles: loginData.roles || [],
            permissions: loginData.permissions || [],
            employeeId: loginData.user.employeeId || null,
            avatarUrl: loginData.user.avatarUrl || undefined,
            departmentName: loginData.user.departmentName || loginData.user.deptName || loginData.user.department || undefined,
            deptName: loginData.user.deptName || loginData.user.departmentName || loginData.user.department || undefined,
            designation: loginData.user.designation || undefined,
          };

          localStorage.setItem('accessToken', loginData.accessToken);
          localStorage.setItem('refreshToken', loginData.refreshToken);

          set({ user, isAuthenticated: true });
        } catch (error) {
          console.error('Login error:', error);
          throw error;
        }
      },

      fetchCurrentUser: async () => {
        try {
          const token = localStorage.getItem('accessToken');
          if (!token) return;

          const baseUrl = (import.meta as any).env.VITE_API_URL
            ? `${(import.meta as any).env.VITE_API_URL}/v1`
            : 'http://localhost:5000/api/v1';
          const response = await fetch(`${baseUrl}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (!response.ok) return;

          const apiResponse = await response.json();
          const meData = apiResponse.data;

          if (meData?.user) {
            const updatedUser: User = {
              id: meData.user.id,
              email: meData.user.email,
              firstName: meData.user.firstName || '',
              lastName: meData.user.lastName || '',
              organizationId: meData.user.organizationId,
              organizationName: meData.organization?.name || '',
              organizationCode: meData.organization?.code || '',
              organizationLocation: meData.organization?.location || '',
              roles: meData.roles || [],
              permissions: meData.permissions || [],
              employeeId: meData.user.employeeId || null,
              avatarUrl: meData.user.avatarUrl || undefined,
              departmentName: meData.user.departmentName || meData.user.deptName || meData.user.department || undefined,
              deptName: meData.user.deptName || meData.user.departmentName || meData.user.department || undefined,
              designation: meData.user.designation || undefined,
            };
            set({ user: updatedUser, isAuthenticated: true });
          }
        } catch (err) {
          console.error('Error fetching current user:', err);
        }
      },

      logout: () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        set({ user: null, isAuthenticated: false });
      },
    }),
    {
      name: 'auth-store',
    }
  )
);
