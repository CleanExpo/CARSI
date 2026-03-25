import type { NextConfig } from 'next';

const withPWA = require('next-pwa');

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
  ],
});

const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  transpilePackages: ['@shared'],
  turbopack: {},
  experimental: {
    // Typed routes disabled - requires full route type generation to be configured
    // typedRoutes: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'carsi.com.au',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.carsi.com.au',
        pathname: '/**',
      },
      {
        // Google Drive thumbnails served via lh3.googleusercontent.com
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
      {
        // Drive direct download thumbnails
        protocol: 'https',
        hostname: 'drive.google.com',
        pathname: '/**',
      },
      {
        // Unsplash (design-system demo page)
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
    ],
  },
  async headers() {
    const isDev = process.env.NODE_ENV === 'development';
    // Next.js dev / webpack HMR / React Refresh use eval(); strict script-src breaks the app.
    const scriptSrc = isDev
      ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://js.stripe.com"
      : "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://js.stripe.com";

    const appOrigin = (
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      'http://localhost:3000'
    ).trim();
    const connectParts = [
      "'self'",
      appOrigin,
      'https://api.stripe.com',
      ...(isDev
        ? ['ws:', 'wss:', 'http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000', 'http://127.0.0.1:3001']
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
