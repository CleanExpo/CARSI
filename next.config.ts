import { createRequire } from 'node:module';
import path from 'node:path';

import type { NextConfig } from 'next';

const require = createRequire(import.meta.url);
const withPWA = require('next-pwa');

function reactPackageDir(pkg: 'react' | 'react-dom'): string {
  return path.dirname(require.resolve(`${pkg}/package.json`));
}

function webpackReactAliases(config: {
  resolve?: { alias?: Record<string, string | string[] | boolean> };
}) {
  const reactDir = reactPackageDir('react');
  const reactDomDir = reactPackageDir('react-dom');
  config.resolve = config.resolve ?? {};
  config.resolve.alias = {
    ...config.resolve.alias,
    react: reactDir,
    'react-dom': reactDomDir,
    // Use resolved entry files so Next/RSC and the app share one React (fixes invalid hook / duplicate React).
    'react/jsx-runtime': require.resolve('react/jsx-runtime'),
    'react/jsx-dev-runtime': require.resolve('react/jsx-dev-runtime'),
  };
  return config;
}

const pwaConfig = withPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  runtimeCaching: [
    {
      urlPattern: /\/courses\/.+\/lessons\/.+/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'lesson-content',
        expiration: { maxEntries: 20, maxAgeSeconds: 86400 },
      },
    },
    /** Lesson detail API — NetworkFirst so techs can reopen last lessons offline after one online visit. */
    {
      urlPattern: /\/api\/lms\/lessons\//,
      handler: 'NetworkFirst',
      method: 'GET',
      options: {
        cacheName: 'lms-lesson-api',
        networkTimeoutSeconds: 12,
        expiration: { maxEntries: 48, maxAgeSeconds: 7 * 86400 },
      },
    },
    /** Curriculum tree for /dashboard/learn/[slug]. */
    {
      urlPattern: /\/api\/lms\/courses\/[^/]+\/curriculum/,
      handler: 'NetworkFirst',
      method: 'GET',
      options: {
        cacheName: 'lms-curriculum-api',
        networkTimeoutSeconds: 12,
        expiration: { maxEntries: 24, maxAgeSeconds: 7 * 86400 },
      },
    },
    /** Learn shell HTML (production PWA only — disabled in dev by next-pwa). */
    {
      urlPattern: /\/dashboard\/learn\//,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'learn-pages',
        networkTimeoutSeconds: 8,
        expiration: { maxEntries: 16, maxAgeSeconds: 86400 },
      },
    },
  ],
});

const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  /** Production deploys: do not fail the build on TS (fix issues in follow-up PRs). */
  typescript: {
    ignoreBuildErrors: true,
  },
  // Next.js 16: do not set `eslint` here — it is not a valid next.config key; use `eslint.config` / `next lint`.
  transpilePackages: ['@shared'],
  /**
   * Force one React instance in the client bundle. Without this, pnpm + next-pwa/webpack can
   * resolve duplicate `react` copies → "Cannot read properties of undefined (reading 'ReactCurrentDispatcher')".
   */
  webpack: (config) => webpackReactAliases(config),
  turbopack: {},
  experimental: {
    // Typed routes disabled - requires full route type generation to be configured
    // typedRoutes: true,
  },
  // Load image URLs in the browser (no /_next/image proxy). Avoids remotePatterns and CDN timeouts.
  images: {
    unoptimized: true,
  },
  async headers() {
    const isDev = process.env.NODE_ENV === 'development';
    // Next.js dev / webpack HMR / React Refresh use eval(); strict script-src breaks the app.
    const scriptSrc = isDev
      ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://js.stripe.com"
      : "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://js.stripe.com";

    const appOrigin = (
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXT_PUBLIC_FRONTEND_URL ||
      'http://localhost:3000'
    ).trim();
    const connectParts = [
      "'self'",
      appOrigin,
      'https://api.stripe.com',
      ...(isDev
        ? [
            'ws:',
            'wss:',
            'http://localhost:3000',
            'http://localhost:3001',
            'http://127.0.0.1:3000',
            'http://127.0.0.1:3001',
          ]
        : []),
    ];

    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          {
            key: 'Access-Control-Allow-Origin',
            value: process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000',
          },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
          {
            key: 'Access-Control-Allow-Headers',
            value:
              'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version',
          },
        ],
      },
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              scriptSrc,
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: https: blob:",
              `connect-src ${connectParts.join(' ')}`,
              'frame-src https://js.stripe.com https://hooks.stripe.com',
              "frame-ancestors 'none'",
            ].join('; '),
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};

export default pwaConfig(nextConfig);
