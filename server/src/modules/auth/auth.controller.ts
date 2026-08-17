import type { Request, Response } from 'express';
import { decodeToken } from '../../common/lib/jwt';
import { AuthService } from './auth.service';
import type { ApiResponse } from '@apponexthrms/shared';
import type {
  LoginResponse,
  RegisterOrganizationResponse,
  RefreshTokenResponse,
  MeResponse,
} from './auth.types';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  /**
   * POST /api/v1/auth/register-organization
   */
  async registerOrganization(req: Request, res: Response): Promise<void> {
    const result = await this.authService.registerOrganization(req.body, req);

    const response: ApiResponse<any> = {
      success: true,
      status: 'active',
      data: {
        employeeName: `${(result.user as any)?.firstName || ''} ${(result.user as any)?.lastName || ''}`.trim() || result.user?.email,
        employeeEmail: result.user?.email,
        organizationName: result.organization?.name || '',
        status: 'active',
      },
    };

    res.status(201).json(response);
  }

  /**
   * POST /api/v1/auth/login
   * Controller receives (email, password, req) but AuthService.login now takes (email, password, req)
   */
  async login(req: Request, res: Response): Promise<void> {
    const { email, password } = req.body;
    const result = await this.authService.login(email, password, req);

    const isProduction = process.env.NODE_ENV === 'production';

    // Set secure httpOnly cookies so tokens cannot be stolen or accessed by frontend JS
    if (result.accessToken) {
      res.cookie('accessToken', result.accessToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
    }

    if (result.refreshToken) {
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });
    }

    const response: ApiResponse<any> = {
      success: true,
      data: {
        user: result.user,
        roles: result.roles,
      },
    };

    res.status(200).json(response);
  }

  /**
   * POST /api/v1/auth/refresh
   */
  async refresh(req: Request, res: Response): Promise<void> {
    let { refreshToken } = req.body || {};
    if (!refreshToken && req.headers.cookie) {
      const cookies = Object.fromEntries(
        req.headers.cookie.split(';').map((c) => {
          const [k, ...v] = c.trim().split('=');
          return [k, decodeURIComponent(v.join('='))];
        })
      );
      refreshToken = cookies['refreshToken'];
    }

    if (!refreshToken) {
      throw new Error('Invalid refresh token');
    }

    const decoded = decodeToken(refreshToken);
    if (!decoded) {
      throw new Error('Invalid refresh token');
    }

    const ctx = {
      organizationId: parseInt(decoded.oid, 10),
      userId: parseInt(decoded.sub, 10),
      sessionUuid: decoded.sid,
    };

    const result = await this.authService.refreshAccessToken(ctx, refreshToken);

    const isProduction = process.env.NODE_ENV === 'production';
    if (result.accessToken) {
      res.cookie('accessToken', result.accessToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
    }
    if (result.refreshToken) {
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });
    }

    const response: ApiResponse<any> = {
      success: true,
      data: {
        message: 'Token refreshed successfully',
      },
    };

    res.status(200).json(response);
  }

  /**
   * POST /api/v1/auth/logout
   */
  async logout(req: Request, res: Response): Promise<void> {
    if (req.ctx) {
      await this.authService.logout(req.ctx);
    }
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    const response: ApiResponse = {
      success: true,
    };

    res.status(200).json(response);
  }

  /**
   * GET /api/v1/auth/me
   */
  async getMe(req: Request, res: Response): Promise<void> {
    const result = await this.authService.getMe(req.ctx!);

    const response: ApiResponse<any> = {
      success: true,
      data: result,
    };

    res.status(200).json(response);
  }

  /**
   * PUT /api/v1/auth/profile
   */
  async updateProfile(req: Request, res: Response): Promise<void> {
    const result = await this.authService.updateUserProfile(req.ctx!, req.body);

    const response: ApiResponse<any> = {
      success: true,
      data: result,
    };

    res.status(200).json(response);
  }

  /**
   * POST /api/v1/auth/change-password
   */
  async changePassword(req: Request, res: Response): Promise<void> {
    const { currentPassword, newPassword } = req.body;
    await this.authService.changePassword(req.ctx!, currentPassword, newPassword);

    const response: ApiResponse = {
      success: true,
    };

    res.status(200).json(response);
  }
}
