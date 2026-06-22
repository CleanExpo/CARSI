import {
  PUBLIC_CHROME_BODY_CLASS,
  PUBLIC_CHROME_FOOTER_CLASS,
  PUBLIC_CHROME_HEADING_CLASS,
  PUBLIC_SHELL_INNER_CLASS,
} from '@/components/landing/public-shell-width';
import { PublicLogo } from '@/components/landing/PublicLogo';
import { AcronymTooltip } from '@/components/ui/AcronymTooltip';
import Link from 'next/link';

/**
 * Shared public footer — identical to the homepage footer.
 * Used in the (public) layout so every public page gets consistent footer content.
 */

const industries = [
  { slug: 'healthcare', label: 'Healthcare' },
  { slug: 'hospitality', label: 'Hotels & Resorts' },
  { slug: 'government-defence', label: 'Government & Defence' },
  { slug: 'commercial-cleaning', label: 'Commercial Cleaning' },
];

const footerLinkClass = `inline-flex min-h-6 items-center ${PUBLIC_CHROME_BODY_CLASS} transition-colors hover:text-white`;

export function PublicFooter() {
  return (
    <footer className={`relative py-12 ${PUBLIC_CHROME_FOOTER_CLASS}`}>
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_100%_100%,rgba(36,144,237,0.1),transparent_62%)]"
        aria-hidden
      />
      <div className={`relative ${PUBLIC_SHELL_INNER_CLASS}`}>
        <div className="mb-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-[1.25fr_1fr_1fr_1fr]">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <PublicLogo variant="footer" />
            </div>
            <p className={`text-xs leading-relaxed ${PUBLIC_CHROME_BODY_CLASS}`}>
              Australia&apos;s industry training leader.
              <br />
              24/7 online. <AcronymTooltip term="IICRC" />
              <span> CEC accredited courses.</span>
            </p>
          </div>

          <div>
            <p className={`mb-3 ${PUBLIC_CHROME_HEADING_CLASS}`}>Platform</p>
            <ul className={`space-y-2 text-xs ${PUBLIC_CHROME_BODY_CLASS}`}>
              {[
                { label: 'Courses', href: '/courses' },
                { label: 'Pathways', href: '/pathways' },
                { label: 'CCW Roadshow', href: '/events/ccw-roadshow' },
                { label: 'CCW Workshop', href: '/ccw-training' },
                { label: 'Start Smart', href: '/start-carpet-cleaning-business' },
                { label: 'Authority Hub', href: '/authority' },
                { label: 'Pricing', href: '/pricing' },
                { label: 'About', href: '/about' },
                { label: 'Testimonials', href: '/testimonials' },
                { label: 'Podcast', href: '/podcast' },
              ].map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className={footerLinkClass}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className={`mb-3 ${PUBLIC_CHROME_HEADING_CLASS}`}>Industries</p>
            <ul className={`space-y-2 text-xs ${PUBLIC_CHROME_BODY_CLASS}`}>
              {industries.slice(0, 4).map((industry) => (
                <li key={industry.slug}>
                  <Link href={`/industries/${industry.slug}`} className={footerLinkClass}>
                    {industry.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className={`mb-3 ${PUBLIC_CHROME_HEADING_CLASS}`}>Contact</p>
            <ul className={`space-y-2 text-xs ${PUBLIC_CHROME_BODY_CLASS}`}>
              <li>PO Box 4309, Forest Lake QLD 4078</li>
              <li>
                <a href="/contact" className={footerLinkClass}>
                  Contact CARSI support
                </a>
              </li>
              <li>
                <a href="tel:+61457123005" className={footerLinkClass}>
                  0457 123 005
                </a>
              </li>
            </ul>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              {[
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
              ].map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex min-h-6 items-center text-[10px] ${PUBLIC_CHROME_BODY_CLASS} transition-colors hover:text-white`}
                  aria-label={social.label}
                >
                  {social.label}
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-2 border-t border-white/[0.08] pt-6 sm:flex-row">
          <p className={`text-[11px] ${PUBLIC_CHROME_BODY_CLASS}`}>
            © 2026 CARSI Pty Ltd. All rights reserved. ·{' '}
            <Link href="/admin" className="transition-colors hover:text-white">
              Staff login
            </Link>
          </p>
          <p className={`text-[11px] ${PUBLIC_CHROME_BODY_CLASS}`}>
            <AcronymTooltip term="IICRC" />
            <span> CEC continuing education — not an </span>
            <AcronymTooltip term="RTO" />
          </p>
        </div>
      </div>
    </footer>
  );
}
