# Client Implementation Guide

This document provides the complete blueprint for the React frontend. 

## Project Structure

```
client/
├── src/
│   ├── main.tsx                # React 18 entry point
│   ├── App.tsx                 # Main app component
│   ├── app/
│   │   ├── routes.tsx          # Central route manifest (permission metadata)
│   │   ├── AppProviders.tsx    # Context/Provider setup (Auth, React Query, etc.)
│   │   └── queryClient.ts      # TanStack Query configuration
│   ├── lib/
│   │   ├── apiClient.ts        # Axios instance with JWT/refresh interceptors
│   │   ├── socket.ts           # Socket.io client setup
│   │   └── storage.ts          # Local storage abstraction
│   ├── components/
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Modal.tsx
│   │   ├── Card.tsx
│   │   ├── Toast.tsx
│   │   ├── DataTable.tsx
│   │   ├── Pagination.tsx
│   │   └── ... (design system primitives)
│   ├── layouts/
│   │   ├── AuthLayout.tsx      # Login/signup layout
│   │   ├── AppShellLayout.tsx  # Main app layout (sidebar, header)
│   │   └── PublicLayout.tsx    # Marketing pages
│   ├── features/
│   │   ├── auth/
│   │   │   ├── pages/
│   │   │   │   ├── LoginPage.tsx
│   │   │   │   ├── OtpChallengePage.tsx
│   │   │   │   ├── MfaChallengePage.tsx
│   │   │   │   ├── MfaSetupPage.tsx
│   │   │   │   ├── ForgotPasswordPage.tsx
│   │   │   │   ├── ResetPasswordPage.tsx
│   │   │   │   ├── ChangePasswordPage.tsx
│   │   │   │   ├── OrganizationSelectPage.tsx
│   │   │   │   ├── SsoCallbackPage.tsx
│   │   │   │   ├── DeviceManagementPage.tsx
│   │   │   │   └── LoginHistoryPage.tsx
│   │   │   ├── components/
│   │   │   │   ├── LoginForm.tsx
│   │   │   │   ├── OtpInput.tsx
│   │   │   │   ├── MfaSetupWizard.tsx
│   │   │   │   ├── DeviceCard.tsx
│   │   │   │   ├── LoginHistoryTable.tsx
│   │   │   │   └── PasswordStrengthIndicator.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useLogin.ts
│   │   │   │   ├── useRegister.ts
│   │   │   │   ├── useMfa.ts
│   │   │   │   ├── useSso.ts
│   │   │   │   ├── useSessions.ts
│   │   │   │   └── usePassword.ts
│   │   │   ├── store/
│   │   │   │   └── authStore.ts    # Zustand auth state
│   │   │   ├── api/
│   │   │   │   └── auth.api.ts     # API functions
│   │   │   ├── types/
│   │   │   │   └── index.ts
│   │   │   └── __tests__/
│   │   ├── rbac/
│   │   │   ├── pages/
│   │   │   │   ├── RolesListPage.tsx
│   │   │   │   ├── RoleDetailPage.tsx
│   │   │   │   ├── CreateRolePage.tsx
│   │   │   │   ├── PermissionsMatrixPage.tsx
│   │   │   │   └── UserRoleAssignmentPage.tsx
│   │   │   ├── components/
│   │   │   │   ├── RoleCard.tsx
│   │   │   │   ├── PermissionMatrix.tsx
│   │   │   │   ├── PermissionCheckbox.tsx
│   │   │   │   └── UserRoleForm.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useRoles.ts
│   │   │   │   ├── usePermissions.ts
│   │   │   │   └── useUserRoles.ts
│   │   │   ├── api/
│   │   │   │   └── rbac.api.ts
│   │   │   └── __tests__/
│   │   └── ... (other features for Phases 2-18)
│   ├── hooks/
│   │   ├── useDebounce.ts
│   │   ├── usePermission.ts    # Check if user has permission
│   │   ├── useMediaQuery.ts
│   │   ├── useLocalStorage.ts
│   │   └── useAsync.ts
│   ├── styles/
│   │   └── globals.css         # Tailwind + CSS variables
│   ├── test/
│   │   ├── setup.ts            # Vitest setup
│   │   ├── mocks.ts            # MSW setup
│   │   └── utils.ts            # RTL helpers
│   └── types/
│       └── index.ts            # Type definitions (re-export from shared)
├── vite.config.ts
├── tailwind.config.ts
├── postcss.config.js
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── index.html
├── .env.example
└── vitest.config.ts
```

## State Management Pattern

### Zustand Auth Store (Critical)
```typescript
// features/auth/store/authStore.ts
import create from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  user: User | null;
  organization: Organization | null;
  permissions: string[];
  roles: string[];
  accessToken: string | null;
  status: 'idle' | 'authenticating' | 'authenticated' | 'unauthenticated';
  error: string | null;
  mfaChallenge: { token: string; method: 'totp' | 'recovery' } | null;

  // Actions
  setSession: (user: User, org: Organization, perms: string[], roles: string[], token: string) => void;
  clearSession: () => void;
  setMfaChallenge: (challenge: AuthState['mfaChallenge']) => void;
  setError: (error: string | null) => void;

  // Helpers
  hasPermission: (code: string) => boolean;
  hasAnyPermission: (codes: string[]) => boolean;
  hasRole: (code: string) => boolean;
}

const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      organization: null,
      permissions: [],
      roles: [],
      accessToken: null,
      status: 'unauthenticated',
      error: null,
      mfaChallenge: null,

      setSession: (user, org, perms, roles, token) => {
        set({
          user,
          organization: org,
          permissions: perms,
          roles: roles,
          accessToken: token,
          status: 'authenticated',
          error: null,
        });
      },

      clearSession: () => {
        set({
          user: null,
          organization: null,
          permissions: [],
          roles: [],
          accessToken: null,
          status: 'unauthenticated',
          error: null,
        });
      },

      setMfaChallenge: (challenge) => {
        set({ mfaChallenge: challenge });
      },

      setError: (error) => {
        set({ error });
      },

      hasPermission: (code) => {
        return get().permissions.includes(code);
      },

      hasAnyPermission: (codes) => {
        const userPerms = get().permissions;
        return codes.some(code => userPerms.includes(code));
      },

      hasRole: (code) => {
        return get().roles.includes(code);
      },
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({
        // IMPORTANT: Do NOT persist the access token (XSS risk)
        // Only persist what's necessary for UI before silent refresh
        user: state.user,
        organization: state.organization,
        roles: state.roles,
        status: state.status,
      }),
    }
  )
);

export default useAuthStore;
```

**Key points:**
- `accessToken` is **memory-only** (never persisted)
- `user`, `organization`, `roles` are persisted for instant UI boot
- On app mount, run `useCurrentUser()` query to fetch fresh token and sync store
- If token fetch fails, clear session

### API Client with Refresh Interceptor
```typescript
// lib/apiClient.ts
import axios, { AxiosInstance } from 'axios';
import useAuthStore from '@/features/auth/store/authStore';

const axiosInstance: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 30000,
});

let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

const onRefreshed = (token: string) => {
  refreshSubscribers.forEach(cb => cb(token));
  refreshSubscribers = [];
};

// Request interceptor: attach access token
axiosInstance.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: handle 401, attempt silent refresh
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const response = await axios.post(`${import.meta.env.VITE_API_URL}/auth/refresh`, {}, {
            withCredentials: true,
          });
          const { data } = response;
          const newToken = data.data.accessToken;

          useAuthStore.getState().setSession(
            data.data.user,
            data.data.organization,
            data.data.permissions,
            data.data.roles,
            newToken
          );

          onRefreshed(newToken);
          isRefreshing = false;
        } catch (refreshError) {
          useAuthStore.getState().clearSession();
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      }

      return new Promise((resolve) => {
        refreshSubscribers.push((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          resolve(axiosInstance(originalRequest));
        });
      });
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
```

## Routing & Protected Routes

```typescript
// app/routes.tsx
import { RouteObject } from 'react-router-dom';
import ProtectedRoute from '@/components/ProtectedRoute';

export interface ProtectedRouteMetadata {
  permission?: string;
  roles?: string[];
  requireMfa?: boolean;
}

export const routes: (RouteObject & { meta?: ProtectedRouteMetadata })[] = [
  // Public routes
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/auth/sso/:provider/callback',
    element: <SsoCallbackPage />,
  },
  {
    path: '/forgot-password',
    element: <ForgotPasswordPage />,
  },

  // Protected routes
  {
    path: '/dashboard',
    element: (
      <ProtectedRoute>
        <Dashboard />
      </ProtectedRoute>
    ),
    meta: { permission: 'auth.profile.read' },
  },
  {
    path: '/rbac/roles',
    element: (
      <ProtectedRoute permission="rbac.roles.read">
        <RolesListPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/rbac/roles/:id',
    element: (
      <ProtectedRoute permission="rbac.roles.update">
        <RoleDetailPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/auth/devices',
    element: (
      <ProtectedRoute>
        <DeviceManagementPage />
      </ProtectedRoute>
    ),
  },

  // 404
  {
    path: '*',
    element: <NotFoundPage />,
  },
];
```

## Theme System

```typescript
// styles/globals.css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --bg-surface: 242, 242, 242;
  --bg-surface-secondary: 255, 255, 255;
  --text-primary: 26, 26, 26;
  --text-secondary: 100, 100, 100;
  --border-color: 220, 220, 220;
  --success: 34, 197, 94;
  --error: 239, 68, 68;
  --warning: 251, 146, 60;
  --primary: 59, 130, 246;
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg-surface: 23, 23, 23;
    --bg-surface-secondary: 31, 31, 31;
    --text-primary: 240, 240, 240;
    --text-secondary: 160, 160, 160;
    --border-color: 60, 60, 60;
  }
}

body {
  background-color: rgb(var(--bg-surface));
  color: rgb(var(--text-primary));
  transition: background-color 0.2s, color 0.2s;
}

@layer components {
  .btn-primary {
    @apply px-4 py-2 rounded-lg bg-blue-500 text-white font-medium hover:bg-blue-600 transition;
  }

  .btn-secondary {
    @apply px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900 transition;
  }

  .input-field {
    @apply w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500;
  }
}
```

## Form Validation Pattern

```typescript
// features/auth/components/LoginForm.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema } from '@apponexthrms/shared';

export default function LoginForm({ onSubmit }: { onSubmit: (data: LoginInput) => Promise<void> }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur',
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Email</label>
        <input
          {...register('email')}
          type="email"
          className={`input-field ${errors.email ? 'border-red-500' : ''}`}
        />
        {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Password</label>
        <input
          {...register('password')}
          type="password"
          className={`input-field ${errors.password ? 'border-red-500' : ''}`}
        />
        {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>}
      </div>

      <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
        {isSubmitting ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
}
```

## Testing Strategy

### Component Tests (RTL)
```typescript
// features/auth/__tests__/LoginForm.test.tsx
import { render, screen, userEvent } from '@testing-library/react';
import LoginForm from '../components/LoginForm';

describe('LoginForm', () => {
  it('submits form with valid credentials', async () => {
    const onSubmit = vi.fn();
    render(<LoginForm onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText('Email'), 'test@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'Password123!');
    await userEvent.click(screen.getByRole('button', { name: /login/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'Password123!',
    });
  });

  it('shows validation error for invalid email', async () => {
    render(<LoginForm onSubmit={vi.fn()} />);

    await userEvent.type(screen.getByLabelText('Email'), 'invalid');
    await userEvent.blur(screen.getByLabelText('Email'));

    expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
  });
});
```

### API Mocking (MSW)
```typescript
// test/mocks.ts
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

export const server = setupServer(
  http.post('/api/auth/login', async ({ request }) => {
    const body = await request.json() as any;

    if (body.email === 'test@example.com' && body.password === 'Password123!') {
      return HttpResponse.json({
        success: true,
        data: {
          user: { id: 1, uuid: '...', email: 'test@example.com' },
          organization: { id: 1, name: 'Test Org' },
          permissions: ['auth.profile.read'],
          roles: ['employee'],
          accessToken: 'jwt_token',
        },
      });
    }

    return HttpResponse.json({
      success: false,
      error: { code: 'INVALID_CREDENTIALS' },
    }, { status: 401 });
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

## Environment Configuration

**client/.env.example:**
```
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
VITE_GOOGLE_OAUTH_CLIENT_ID=your-google-client-id
VITE_MICROSOFT_OAUTH_CLIENT_ID=your-microsoft-client-id
```

**vite.config.ts:**
Ensure `define` doesn't leak secrets:
```typescript
export default defineConfig({
  define: {
    'process.env': JSON.stringify({
      VITE_API_URL: process.env.VITE_API_URL,
      VITE_SOCKET_URL: process.env.VITE_SOCKET_URL,
    }),
  },
});
```

## Next Steps

1. Create the Vite+React+TS project structure
2. Install dependencies
3. Implement auth store + API client first
4. Build auth pages (LoginPage, OtpChallengePage, MfaChallengePage, etc.)
5. Build RBAC pages (RolesListPage, PermissionsMatrix, etc.)
6. Build design system components
7. Write tests alongside features

Follow the patterns above for consistency across all future features (Phases 2-18).
