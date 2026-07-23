import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  organizationId: number;
  roles: string[];
  permissions: string[];
  employeeId?: number | null;
  avatarUrl?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,

      setUser: (user) => set({ user, isAuthenticated: !!user }),

      login: async (email: string, password: string) => {
        try {
          const baseUrl = (import.meta as any).env.VITE_API_URL
            ? `${(import.meta as any).env.VITE_API_URL}/v1`
            : 'http://localhost:3000/api/v1';
          const response = await fetch(`${baseUrl}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          });

          if (!response.ok) throw new Error('Login failed');

          const apiResponse = await response.json();
          const loginData = apiResponse.data;

          const user = {
            id: loginData.user.id,
            email: loginData.user.email,
            firstName: loginData.user.firstName || '',
            lastName: loginData.user.lastName || '',
            organizationId: loginData.user.organizationId,
            roles: loginData.roles || [],
            permissions: loginData.permissions || [],
            employeeId: loginData.user.employeeId || null,
            avatarUrl: loginData.user.avatarUrl || undefined,
          };

          localStorage.setItem('accessToken', loginData.accessToken);
          localStorage.setItem('refreshToken', loginData.refreshToken);

          set({ user, isAuthenticated: true });
        } catch (error) {
          console.error('Login error:', error);
          throw error;
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
