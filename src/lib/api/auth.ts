/**
 * Authentication API — login, logout, registration via this app’s `/api/auth/*` routes.
 */

import { apiClient } from './client';

export interface IicrcCertificationEntry {
  discipline: string;
  certified_at: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  roles: string[];
  theme_preference: string;
  is_active: boolean;
  is_verified: boolean;
  /** When false/undefined, client may show first-run onboarding. */
  onboarding_completed?: boolean;
  iicrc_member_number?: string | null;
  iicrc_expiry_date?: string | null;
  iicrc_card_image_url?: string | null;
  iicrc_certifications?: IicrcCertificationEntry[] | null;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  user: {
    id: string;
    email: string;
    full_name: string;
    role: string;
  };
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
  iicrc_member_number?: string;
}

export interface RegisterResponse {
  success: boolean;
  user: {
    id: string;
    email: string;
    full_name: string;
    role: string;
  };
}

/**
 * Authentication API methods
 */
export const authApi = {
  /**
   * Login with email and password.
   * Routes through the Next.js proxy which sets httpOnly + readable cookies.
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
      credentials: 'include',
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Login failed' }));
      throw new Error(err.error || 'Login failed');
    }

    return res.json();
  },

  /**
   * Register a new student account (Postgres via Prisma).
   */
  async register(data: RegisterRequest): Promise<RegisterResponse> {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Registration failed' }));
      throw new Error(err.error || 'Registration failed');
    }
    return res.json();
  },

  /**
   * Logout — clears both auth cookies via the Next.js route.
   */
  async logout(): Promise<void> {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
  },

  /**
   * Get the current authenticated user profile.
   * Reads the JWT from the carsi_token cookie via apiClient.
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      return await apiClient.get<User>('/api/auth/me');
    } catch {
      return null;
    }
  },

  /**
   * Update current user profile fields.
   */
  async updateProfile(data: Partial<User>): Promise<User> {
    return apiClient.patch<User>('/api/lms/auth/me', data);
  },

  /**
   * Request a password reset email.
   */
  async requestPasswordReset(email: string): Promise<{ message: string }> {
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
      credentials: 'include',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error((data as { error?: string }).error || 'Failed to send reset link');
    }
    return data as { message: string };
  },

  /**
   * Consume a reset token and set a new password.
   */
  async confirmPasswordReset(token: string, newPassword: string): Promise<{ message: string }> {
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        new_password: newPassword,
      }),
      credentials: 'include',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error((data as { error?: string }).error || 'Reset failed');
    }
    return data as { message: string };
  },
};
