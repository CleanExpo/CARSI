import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Mail, MapPin, Phone } from 'lucide-react';

import {
  PUBLIC_CHROME_FOOTER_CLASS,
  PUBLIC_SHELL_INNER_CLASS,
} from '@/components/landing/public-shell-width';
import { PublicLogo } from '@/components/landing/PublicLogo';
import { AcronymTooltip } from '@/components/ui/AcronymTooltip';

/**
 * Shared public footer — design-led site closure with full platform navigation.
 * Used in the (public) layout so every public page gets consistent footer content.
 */

const industries = [
  { slug: 'healthcare', label: 'Healthcare' },
  { slug: 'hospitality', label: 'Hotels & Resorts' },
  { slug: 'government-defence', label: 'Government & Defence' },
  { slug: 'commercial-cleaning', label: 'Commercial Cleaning' },
];

const platformLinks = [
  { label: 'Courses', href: '/courses' },
  { label: 'Pathways', href: '/pathways' },
  { label: 'CCW Roadshow', href: '/events/ccw-roadshow' },
  { label: 'CCW Workshop', href: '/ccw-training' },
  { label: 'Start Smart', href: '/start-carpet-cleaning-business' },
  { label: 'Authority Hub', href: '/authority' },
  { label: 'About', href: '/about' },
  { label: 'Testimonials', href: '/testimonials' },
  { label: 'Podcast', href: '/podcast' },
];

const socialLinks = [
  { label: 'Facebook', href: 'https://www.facebook.com/CARSIaus' },
  {
    label: 'YouTube',
    href: 'https://www.youtube.com/channel/UC3HpNvGJXivLGoPo4m7Qleg/featured',
  },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/company/carsiaus' },
  {
    label: 'Spotify',
    href: 'https://open.spotify.com/show/4FVBn8Cfyx2jOx0m4MksuG',
  },
];

function FooterSectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span className="h-px w-6 bg-gradient-to-r from-[#2490ed] to-[#00d4aa]" aria-hidden />
      <p className="text-[10px] font-semibold tracking-[0.2em] text-white/45 uppercase">
        {children}
      </p>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="group inline-flex min-h-8 items-center gap-1 text-sm text-white/62 transition-colors duration-200 hover:text-white"
    >
      <span>{children}</span>
      <ArrowUpRight
        className="h-3 w-3 shrink-0 opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-70"
        aria-hidden
      />
    </Link>
  );
}

function FooterExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group inline-flex min-h-8 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium text-white/65 transition-all duration-200 hover:border-[#2490ed]/35 hover:bg-[#2490ed]/10 hover:text-white"
      aria-label={typeof children === 'string' ? children : undefined}
    >
      {children}
      <ArrowUpRight className="h-3 w-3 shrink-0 opacity-50 group-hover:opacity-90" aria-hidden />
    </a>
  );
}

export function PublicFooter() {
  return (
    <footer className={`relative overflow-hidden ${PUBLIC_CHROME_FOOTER_CLASS}`}>
      {/* Layered atmosphere */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_70%_at_0%_100%,rgba(36,144,237,0.14),transparent_55%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_100%_0%,rgba(237,157,36,0.08),transparent_50%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          maskImage: 'linear-gradient(to bottom, transparent, black 12%, black 88%, transparent)',
        }}
        aria-hidden
      />

      <div className={`relative ${PUBLIC_SHELL_INNER_CLASS} py-14 sm:py-16 lg:py-20`}>
        {/* Brand masthead */}
        <div className="mb-12 grid gap-10 border-b border-white/[0.08] pb-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <div>
            <p className="mb-4 text-[11px] font-semibold tracking-[0.22em] text-[#7ec5ff]/90 uppercase">
              Australian restoration training
            </p>
            <Link href="/" className="inline-block">
              <PublicLogo variant="footer" />
            </Link>
            <p className="mt-5 max-w-md text-sm leading-relaxed text-white/58">
              Australia&apos;s industry training leader.
              <br />
              24/7 online. <AcronymTooltip term="IICRC" />
              <span> CEC-aligned courses.</span>
            </p>
          </div>

          <div className="relative rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 backdrop-blur-sm sm:p-6">
            <div
              className="pointer-events-none absolute -top-px right-8 left-8 h-px bg-gradient-to-r from-transparent via-[#2490ed]/50 to-transparent"
              aria-hidden
            />
            <p className="text-[10px] font-semibold tracking-[0.18em] text-white/35 uppercase">
              Built for the field
            </p>
            <p className="mt-2 text-lg font-semibold leading-snug text-white/90">
              Self-paced learning that fits around the job site.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {['IICRC CEC', '24/7 access', 'Digital credentials'].map((chip) => (
                <span
                  key={chip}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-medium tracking-wide text-white/55 uppercase"
                >
                  {chip}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Link matrix */}
        <div className="mb-12 grid gap-6 lg:grid-cols-12">
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 sm:p-6 lg:col-span-5">
            <FooterSectionLabel>Platform</FooterSectionLabel>
            <ul className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
              {platformLinks.map((item) => (
                <li key={item.label}>
                  <FooterLink href={item.href}>{item.label}</FooterLink>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 sm:p-6 lg:col-span-3">
            <FooterSectionLabel>Industries</FooterSectionLabel>
            <ul className="space-y-1">
              {industries.map((industry) => (
                <li key={industry.slug}>
                  <FooterLink href={`/industries/${industry.slug}`}>{industry.label}</FooterLink>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 sm:p-6 lg:col-span-4">
            <FooterSectionLabel>Contact</FooterSectionLabel>
            <ul className="space-y-3 text-sm text-white/62">
              <li className="flex gap-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#7ec5ff]/70" aria-hidden />
                <span className="leading-relaxed">PO Box 4309, Forest Lake QLD 4078</span>
              </li>
              <li>
                <a
                  href="/contact"
                  className="group inline-flex items-center gap-3 text-white/62 transition-colors hover:text-white"
                >
                  <Mail className="h-4 w-4 shrink-0 text-[#7ec5ff]/70" aria-hidden />
                  <span>Contact CARSI support</span>
                </a>
              </li>
              <li>
                <a
                  href="tel:+61457123005"
                  className="group inline-flex items-center gap-3 text-white/62 transition-colors hover:text-white"
                >
                  <Phone className="h-4 w-4 shrink-0 text-[#7ec5ff]/70" aria-hidden />
                  <span>0457 123 005</span>
                </a>
              </li>
            </ul>

            <div className="mt-6 border-t border-white/[0.06] pt-5">
              <p className="mb-3 text-[10px] font-semibold tracking-[0.16em] text-white/35 uppercase">
                Follow CARSI
              </p>
              <div className="flex flex-wrap gap-2">
                {socialLinks.map((social) => (
                  <FooterExternalLink key={social.label} href={social.href}>
                    {social.label}
                  </FooterExternalLink>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Legal strip */}
        <div className="flex flex-col gap-4 rounded-2xl border border-white/[0.08] bg-[#080c14]/60 px-5 py-5 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="text-[11px] leading-relaxed text-white/50">
            © 2026 CARSI Pty Ltd. All rights reserved. ·{' '}
            <Link
              href="/admin"
              className="font-medium text-white/65 underline-offset-2 transition-colors hover:text-white hover:underline"
            >
              Staff login
            </Link>
          </p>
          <p className="max-w-xl text-[11px] leading-relaxed text-white/45 sm:text-right">
            <AcronymTooltip term="IICRC" />
            <span> CEC continuing education — not an </span>
            <AcronymTooltip term="RTO" />
          </p>
        </div>
      </div>
    </footer>
  );
}
