import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  organizationId: number;
  roles: string[];
  permissions: string[];
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
          const response = await fetch('http://localhost:3000/api/v1/auth/login', {
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
