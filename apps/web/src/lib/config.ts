/**
 * Environment configuration with validation
 */

const OPTIONAL_ENV_VARS = {
  NEXT_PUBLIC_FRONTEND_URL: 'http://localhost:3000',
  LOG_LEVEL: 'info',
} as const;

/**
 * Validates optional production-only requirements (extend as needed).
 */
function validateEnv(): void {
  if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
    console.warn(
      '[config] JWT_SECRET is not set — using embedded dev default. Set JWT_SECRET in production.'
    );
  }
}

if (typeof window === 'undefined') {
  validateEnv();
}

export const config = {
  backend: {
    url: process.env.NEXT_PUBLIC_BACKEND_URL || '',
  },
  frontend: {
    url: process.env.NEXT_PUBLIC_FRONTEND_URL || OPTIONAL_ENV_VARS.NEXT_PUBLIC_FRONTEND_URL,
  },
  logging: {
    level:
      (process.env.LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') || OPTIONAL_ENV_VARS.LOG_LEVEL,
  },
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
} as const;

export const isClient = typeof window !== 'undefined';
export const isServer = typeof window === 'undefined';

export default config;
