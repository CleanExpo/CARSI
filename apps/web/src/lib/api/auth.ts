/**
 * Authentication API
 *
 * Handles login, logout, registration, and user management.
 * Routes are proxied through Next.js API routes (same-origin) or go
 * directly to the LMS backend at /api/lms/auth/*.
 */

import { apiClient } from './client';

export interface User {
  id: string;
  email: string;
  full_name: string;
  roles: string[];
  theme_preference: string;
  is_active: boolean;
  is_verified: boolean;
  iicrc_member_number?: string | null;
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
  access_token: string;
  user_id: string;
  email: string;
  full_name: string;
  role: string;
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
   * Register a new student account.
   * Calls the LMS backend directly — returns a token on success.
   */
  async register(data: RegisterRequest): Promise<RegisterResponse> {
    return apiClient.post<RegisterResponse>('/api/lms/auth/register', {
      email: data.email,
      password: data.password,
      full_name: data.full_name,
      role: 'student',
    });
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
      return await apiClient.get<User>('/api/lms/auth/me');
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
    return apiClient.post('/api/lms/auth/forgot-password', { email });
  },

  /**
   * Consume a reset token and set a new password.
   */
  async confirmPasswordReset(token: string, newPassword: string): Promise<{ message: string }> {
    return apiClient.post('/api/lms/auth/reset-password', {
      token,
      new_password: newPassword,
    });
  },
};
