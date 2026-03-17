import type { Metadata, Viewport } from 'next';
import { Outfit, DM_Sans } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toast';
import { ThemeProvider } from '@/components/ThemeProvider';
import { AuthProvider } from '@/components/auth/auth-provider';
import { OrganizationSchema, WebsiteSchema } from '@/components/seo';
import { ServiceWorkerRegistration } from '@/components/lms/ServiceWorkerRegistration';

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const siteUrl = process.env.NEXT_PUBLIC_FRONTEND_URL ?? 'https://carsi.com.au';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'CARSI | Restoration Training — IICRC CEC Platform',
    template: '%s | CARSI',
  },
  description:
    'IICRC-aligned CEC training for cleaning and restoration professionals in Australia. Earn recognised credits, track your progress, get certified.',
  keywords: [
    'restoration training',
    'IICRC CECs',
    'water restoration',
    'carpet restoration',
    'fire restoration',
    'CARSI',
    'cleaning training',
    'Australia',
  ],
  authors: [{ name: 'CARSI', url: siteUrl }],
  creator: 'CARSI',
  publisher: 'CARSI Pty Ltd',
  manifest: '/manifest.json',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_AU',
    url: siteUrl,
    siteName: 'CARSI',
    title: 'CARSI | Restoration Training — IICRC CEC Platform',
    description:
      'IICRC-aligned CEC training for cleaning and restoration professionals in Australia. Earn recognised credits, track your progress.',
    images: [
      {
        url: `${siteUrl}/og-image.png`,
        width: 1200,
        height: 630,
        alt: 'CARSI — Professional Restoration Training',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CARSI | Restoration Training — IICRC CEC Platform',
    description:
      'IICRC-aligned CEC training for cleaning and restoration professionals in Australia.',
    images: [`${siteUrl}/og-image.png`],
    creator: '@carsi_au',
  },
  alternates: {
    canonical: siteUrl,
  },
  category: 'Education',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0f1a' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-AU" className="dark" suppressHydrationWarning>
      <head>
        <OrganizationSchema />
        <WebsiteSchema />
      </head>
      <body className={`${outfit.variable} ${dmSans.variable} font-sans`} suppressHydrationWarning>
        <AuthProvider>
          <ThemeProvider initialTheme="dark">
            <ServiceWorkerRegistration />
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-black focus:shadow-lg"
            >
              Skip to main content
            </a>
            {children}
            <Toaster />
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
