import { z } from 'zod';

export const registerOrganizationSchema = z.object({
  organizationName: z.string().min(2).max(255),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export type RegisterOrganizationInput = z.infer<typeof registerOrganizationSchema>;

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  organizationSlug: z.string().optional(),
  rememberMe: z.boolean().optional().default(false),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const mobileLoginSchema = z.object({
  mobile: z.string().regex(/^\d{10}$/),
  countryCode: z.string().regex(/^\+\d{1,3}$/),
  password: z.string().min(1),
  organizationSlug: z.string().optional(),
});

export type MobileLoginInput = z.infer<typeof mobileLoginSchema>;

export const identifySchema = z.object({
  email: z.string().email(),
});

export type IdentifyInput = z.infer<typeof identifySchema>;

export const otpRequestSchema = z.object({
  identifier: z.string(), // email or mobile
  channel: z.enum(['email', 'sms']),
  purpose: z.enum(['login', 'mfa_backup', 'email_verification', 'mobile_verification', 'password_reset']),
  organizationSlug: z.string().optional(),
});

export type OtpRequestInput = z.infer<typeof otpRequestSchema>;

export const otpVerifySchema = z.object({
  identifier: z.string(),
  code: z.string().regex(/^\d{6}$/),
  purpose: z.enum(['login', 'mfa_backup', 'email_verification', 'mobile_verification', 'password_reset']),
});

export type OtpVerifyInput = z.infer<typeof otpVerifySchema>;

export const mfaChallengeSchema = z.object({
  code: z.string().regex(/^\d{6}$/),
  mfaToken: z.string(),
  rememberDevice: z.boolean().optional().default(false),
});

export type MfaChallengeInput = z.infer<typeof mfaChallengeSchema>;

export const mfaSetupInitiateSchema = z.object({
  password: z.string().min(1),
});

export type MfaSetupInitiateInput = z.infer<typeof mfaSetupInitiateSchema>;

export const mfaSetupConfirmSchema = z.object({
  code: z.string().regex(/^\d{6}$/),
  secret: z.string(),
});

export type MfaSetupConfirmInput = z.infer<typeof mfaSetupConfirmSchema>;

export const mfaDisableSchema = z.object({
  password: z.string().min(1),
});

export type MfaDisableInput = z.infer<typeof mfaDisableSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
  organizationSlug: z.string().optional(),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{6}$/),
  password: z.string().min(8).max(128),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
}).refine((data) => data.currentPassword !== data.newPassword, {
  message: 'New password must be different from current password',
  path: ['newPassword'],
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const refreshTokenSchema = z.object({
  deviceId: z.string().optional(),
});

export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;

export const ssoLinkSchema = z.object({
  provider: z.enum(['google', 'microsoft']),
  code: z.string(),
});

export type SsoLinkInput = z.infer<typeof ssoLinkSchema>;
