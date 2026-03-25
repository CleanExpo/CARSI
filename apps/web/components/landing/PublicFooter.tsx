import Link from 'next/link';
import Image from 'next/image';
import { AcronymTooltip } from '@/components/ui/AcronymTooltip';

const industries = [
  { slug: 'healthcare', label: 'Healthcare' },
  { slug: 'hospitality', label: 'Hotels & Resorts' },
  { slug: 'government-defence', label: 'Government & Defence' },
  { slug: 'commercial-cleaning', label: 'Commercial Cleaning' },
];

export function PublicFooter() {
  return (
    <footer className="border-t border-border px-6 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 grid gap-8 sm:grid-cols-4">
          <div>
            <div className="mb-3">
              <Image
                src="https://carsi.com.au/wp-content/uploads/2021/02/CARSI-LOGO-best-compression-2.png"
                alt="CARSI"
                width={80}
                height={28}
                className="h-5 w-auto opacity-70"
                unoptimized
              />
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Australia&apos;s industry training leader.
              <br />
              24/7 online. <AcronymTooltip term="IICRC" />
              -approved.
            </p>
          </div>

          <div>
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/60">
              Platform
            </p>
            <ul className="space-y-2 text-xs text-muted-foreground">
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
                  <Link href={item.href} className="transition-colors hover:text-foreground">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/60">
              Industries
            </p>
            <ul className="space-y-2 text-xs text-muted-foreground">
              {industries.map((industry) => (
                <li key={industry.slug}>
                  <Link href={`/industries/${industry.slug}`} className="transition-colors hover:text-foreground">
                    {industry.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/60">
              Contact
            </p>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li>PO Box 4309, Forest Lake QLD 4078</li>
              <li>
                <a href="mailto:support@carsi.com.au" className="transition-colors hover:text-foreground">
                  support@carsi.com.au
                </a>
              </li>
              <li>
                <a href="tel:+61457123005" className="transition-colors hover:text-foreground">
                  0457 123 005
                </a>
              </li>
            </ul>
            <div className="mt-4 flex items-center gap-3">
              {[
                { label: 'Facebook', href: 'https://www.facebook.com/CARSIaus' },
                { label: 'YouTube', href: 'https://www.youtube.com/channel/UC3HpNvGJXivLGoPo4m7Qleg/featured' },
                { label: 'LinkedIn', href: 'https://www.linkedin.com/company/carsiaus' },
                { label: 'Podcast', href: 'https://open.spotify.com/show/4FVBn8Cfyx2jOx0m4MksuG' },
              ].map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-muted-foreground/60 transition-colors hover:text-foreground"
                  aria-label={social.label}
                >
                  {social.label}
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-2 border-t border-border pt-6 sm:flex-row">
          <p className="text-[11px] text-muted-foreground/50">
            &copy; 2026 CARSI Pty Ltd. All rights reserved.
          </p>
          <p className="text-[11px] text-muted-foreground/50">
            <AcronymTooltip term="IICRC" />
            -aligned continuing education &mdash; not an <AcronymTooltip term="RTO" />
          </p>
        </div>
      </div>
    </footer>
  );
}
