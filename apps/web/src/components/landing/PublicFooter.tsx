import Link from 'next/link';
import { AcronymTooltip } from '@/components/ui/AcronymTooltip';

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

export function PublicFooter() {
  return (
    <footer className="px-6 py-12" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 grid gap-8 sm:grid-cols-4">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <div
                className="flex h-6 w-6 items-center justify-center rounded-sm text-xs font-bold text-white"
                style={{ background: '#2490ed' }}
              >
                C
              </div>
              <span className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.8)' }}>
                CARSI
              </span>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Australia&apos;s industry training leader.
              <br />
              24/7 online. <AcronymTooltip term="IICRC" />
              -approved.
            </p>
          </div>

          <div>
            <p
              className="mb-3 text-[10px] font-semibold tracking-wide uppercase"
              style={{ color: 'rgba(255,255,255,0.3)' }}
            >
              Platform
            </p>
            <ul className="space-y-2 text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {[
                { label: 'Courses', href: '/courses' },
                { label: 'Pathways', href: '/pathways' },
                { label: 'Pricing', href: '/pricing' },
                { label: 'About', href: '/about' },
                { label: 'Testimonials', href: '/testimonials' },
                { label: 'Podcast', href: '/podcast' },
                { label: 'Contact', href: '/contact' },
              ].map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className="hover:text-white">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p
              className="mb-3 text-[10px] font-semibold tracking-wide uppercase"
              style={{ color: 'rgba(255,255,255,0.3)' }}
            >
              Industries
            </p>
            <ul className="space-y-2 text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {industries.map((industry) => (
                <li key={industry.slug}>
                  <Link href={`/industries/${industry.slug}`} className="hover:text-white">
                    {industry.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p
              className="mb-3 text-[10px] font-semibold tracking-wide uppercase"
              style={{ color: 'rgba(255,255,255,0.3)' }}
            >
              Contact
            </p>
            <ul className="space-y-2 text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
              <li>PO Box 4309, Forest Lake QLD 4078</li>
              <li>
                <a href="mailto:support@carsi.com.au" className="hover:text-white">
                  support@carsi.com.au
                </a>
              </li>
              <li>
                <a href="tel:+61457123005" className="hover:text-white">
                  0457 123 005
                </a>
              </li>
            </ul>
            <div className="mt-4 flex items-center gap-3">
              {[
                { label: 'Facebook', href: 'https://www.facebook.com/CARSIaus' },
                {
                  label: 'YouTube',
                  href: 'https://www.youtube.com/channel/UC3HpNvGJXivLGoPo4m7Qleg/featured',
                },
                { label: 'LinkedIn', href: 'https://www.linkedin.com/company/carsiaus' },
                {
                  label: 'Podcast',
                  href: 'https://open.spotify.com/show/4FVBn8Cfyx2jOx0m4MksuG',
                },
              ].map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] transition-colors hover:text-white"
                  style={{ color: 'rgba(255,255,255,0.35)' }}
                  aria-label={social.label}
                >
                  {social.label}
                </a>
              ))}
            </div>
          </div>
        </div>

        <div
          className="flex flex-col items-center justify-between gap-2 pt-6 sm:flex-row"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
            &copy; 2026 CARSI Pty Ltd. All rights reserved.
          </p>
          <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
            <AcronymTooltip term="IICRC" />
            -aligned continuing education &mdash; not an <AcronymTooltip term="RTO" />
          </p>
        </div>
      </div>
    </footer>
  );
}
