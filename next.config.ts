import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { NextConfig } from 'next';

const require = createRequire(import.meta.url);
const withPWA = require('next-pwa');

// Pin the workspace root to this project. Without this, Next infers the root
// from the nearest lockfile and can wrongly select a parent directory (e.g. a
// stray ~/package-lock.json), which breaks module resolution such as
// `tailwindcss` during `next dev`.
const projectRoot = path.dirname(fileURLToPath(import.meta.url));

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
  poweredByHeader: false,
  devIndicators: false,
  async redirects() {
    return [
      { source: '/student', destination: '/dashboard/student', permanent: true },
      { source: '/student/:path*', destination: '/dashboard/student/:path*', permanent: true },
      // CCW Business Growth Days convenience redirects → the combined event page.
      // (/ccw-melbourne and /ccw-sydney are real dedicated pages, not redirects.)
      { source: '/ccw-roadshow', destination: '/events/ccw-roadshow', permanent: false },
      { source: '/roadshow', destination: '/events/ccw-roadshow', permanent: false },
    ];
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  transpilePackages: ['@shared'],
  webpack: (config) => webpackReactAliases(config),
  turbopack: { root: projectRoot },
  experimental: {
  },
  images: {
    unoptimized: true,
  },
  async headers() {
    // NOTE: Content-Security-Policy is set per-request (with a nonce) in
    // middleware (src/lib/api/middleware.ts + src/lib/security/csp.ts) so it can
    // use 'nonce-<n>' 'strict-dynamic' instead of 'unsafe-inline'. The remaining
    // static security headers stay here.
    return [
      {
        source: '/privacy',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate',
          },
        ],
      },
      {
        // Static Open Graph / share images are effectively immutable content.
        // Give them a long cache so social crawlers and the CDN don't refetch
        // them on every share. (Scoped to image assets only — NOT '/:path*',
        // which would risk caching authenticated HTML.)
        source: '/og-image.png',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=604800',
          },
        ],
      },
      {
        source: '/images/og/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=604800',
          },
        ],
      },
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
          {
            // Deprecated header; the legacy XSS auditor it enables has its own
            // bugs. Modern guidance is to disable it and rely on CSP.
            key: 'X-XSS-Protection',
            value: '0',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
    ];
  },
};

export default pwaConfig(nextConfig);
