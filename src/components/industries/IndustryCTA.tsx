import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

interface IndustryCTAProps {
  title: string;
  subtitle: string;
  price: string;
  description: string;
  ctaText: string;
  ctaHref?: string;
  accentColor: string;
}

export function IndustryCTA({
  title,
  subtitle,
  price,
  description,
  ctaText,
  ctaHref = '/subscribe',
  accentColor,
}: IndustryCTAProps) {
  return (
    <section className="px-6 py-20" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="mx-auto max-w-2xl text-center">
        <p
          className="mb-2 text-xs tracking-wide uppercase"
          style={{ color: 'rgba(255,255,255,0.3)' }}
        >
          {subtitle}
        </p>
        <h2 className="mb-4 text-3xl font-bold" style={{ color: 'rgba(255,255,255,0.95)' }}>
          {title} <span style={{ color: accentColor }}>{price}</span>
        </h2>
        <p className="mb-8 text-base" style={{ color: 'rgba(255,255,255,0.5)' }}>
          {description}
        </p>
        <div className="flex justify-center gap-3">
          <Link
            href={ctaHref}
            className="inline-flex items-center gap-2 rounded-md px-8 py-3 font-medium text-white transition-all duration-200"
            style={{
              background: '#ed9d24',
              transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            {ctaText} <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/courses"
            className="inline-flex items-center gap-2 rounded-md px-8 py-3 font-medium transition-colors duration-200 hover:text-white"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.7)',
              transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            Browse All Courses
          </Link>
        </div>
      </div>
    </section>
  );
}
