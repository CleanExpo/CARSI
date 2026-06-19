import { PUBLIC_SHELL_INNER_CLASS } from '@/components/landing/public-shell-width';
import { AcronymTooltip } from '@/components/ui/AcronymTooltip';
import Image from 'next/image';
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

export function PublicFooter() {
  return (
    <footer className="bg-white py-12" style={{ borderTop: '1px solid rgba(15,23,42,0.1)' }}>
      <div className={PUBLIC_SHELL_INNER_CLASS}>
        <div className="mb-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-[1.25fr_1fr_1fr_1fr]">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <Image
                src="/logo/logo1.png"
                alt="CARSI"
                width={480}
                height={96}
                className="h-auto w-auto max-h-20 max-w-[min(360px,60vw)] object-contain object-left"
              />
            </div>
            <p className="text-xs leading-relaxed text-slate-600">
              Australia&apos;s industry training leader.
              <br />
              24/7 online. <AcronymTooltip term="IICRC" />
              <span> CEC accredited courses.</span>
            </p>
          </div>

          <div>
            <p
              className="mb-3 text-[10px] font-semibold tracking-wide uppercase"
              style={{ color: '#64748b' }}
            >
              Platform
            </p>
            <ul className="space-y-2 text-xs text-slate-600">
              {[
                { label: 'Courses', href: '/courses' },
                { label: 'CCW Workshop', href: '/ccw-training' },
                { label: 'Authority Hub', href: '/authority' },
                { label: 'Pathways', href: '/pathways' },
                { label: 'Pricing', href: '/pricing' },
                { label: 'About', href: '/about' },
                { label: 'Testimonials', href: '/testimonials' },
                { label: 'Podcast', href: '/podcast' },
              ].map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className="inline-flex min-h-6 items-center hover:text-slate-950">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p
              className="mb-3 text-[10px] font-semibold tracking-wide uppercase"
              style={{ color: '#64748b' }}
            >
              Industries
            </p>
            <ul className="space-y-2 text-xs text-slate-600">
              {industries.slice(0, 4).map((industry) => (
                <li key={industry.slug}>
                  <Link
                    href={`/industries/${industry.slug}`}
                    className="inline-flex min-h-6 items-center hover:text-slate-950"
                  >
                    {industry.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p
              className="mb-3 text-[10px] font-semibold tracking-wide uppercase"
              style={{ color: '#64748b' }}
            >
              Contact
            </p>
            <ul className="space-y-2 text-xs text-slate-600">
              <li>PO Box 4309, Forest Lake QLD 4078</li>
              <li>
                <a href="/contact" className="inline-flex min-h-6 items-center hover:text-slate-950">
                  Contact CARSI support
                </a>
              </li>
              <li>
                <a
                  href="tel:+61457123005"
                  className="inline-flex min-h-6 items-center hover:text-slate-950"
                >
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
                  className="inline-flex min-h-6 items-center text-[10px] text-slate-600 transition-colors hover:text-slate-950"
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
          style={{ borderTop: '1px solid rgba(15,23,42,0.1)' }}
        >
          <p className="text-[11px] text-slate-500">
            © 2026 CARSI Pty Ltd. All rights reserved. ·{' '}
            <Link href="/admin" className="inline-flex min-h-6 items-center hover:text-slate-950">
              Staff login
            </Link>
          </p>
          <p className="text-[11px] text-slate-500">
            <AcronymTooltip term="IICRC" />
            <span> CEC continuing education — not an </span>
            <AcronymTooltip term="RTO" />
          </p>
        </div>
      </div>
    </footer>
  );
}
