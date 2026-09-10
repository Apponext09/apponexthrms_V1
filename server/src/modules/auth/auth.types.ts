import type { User, AuthSession } from '@apponexthrms/shared';

export interface LoginRequest {
  email: string;
  password: string;
  organizationSlug?: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  accessToken?: string;
  refreshToken?: string;
  user: any;
  organization?: {
    id: number;
    name: string;
    slug: string;
  };
  permissions?: string[];
  roles: string[];
}

export interface RegisterOrganizationRequest {
  organizationName: string;
  slug: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface RegisterOrganizationResponse {
  user: User;
  organization: {
    id: number;
    uuid: string;
    name: string;
    slug: string;
  };
  accessToken: string;
  refreshToken: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
  deviceId?: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface MeResponse {
  user: User;
  organization: {
    id: number;
    name: string;
    slug: string;
  };
  permissions: string[];
  roles: string[];
}
