import type React from 'react';
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
    <section className="border-t border-border px-6 py-20">
      <div className="mx-auto max-w-2xl text-center">
        <p className="mb-2 text-xs tracking-wide uppercase text-muted-foreground/60">
          {subtitle}
        </p>
        <h2 className="mb-4 text-3xl font-bold text-foreground">
          {title} <span style={{ color: accentColor } as React.CSSProperties}>{price}</span>
        </h2>
        <p className="mb-8 text-base text-muted-foreground">
          {description}
        </p>
        <div className="flex justify-center gap-3">
          <Link
            href={ctaHref}
            className="inline-flex items-center gap-2 rounded-sm bg-carsi-orange px-8 py-3 font-medium text-white transition-all duration-200"
          >
            {ctaText} <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/courses"
            className="inline-flex items-center gap-2 rounded-sm border border-border bg-secondary px-8 py-3 font-medium text-muted-foreground transition-colors duration-200 hover:text-white"
          >
            Browse All Courses
          </Link>
        </div>
      </div>
    </section>
  );
}
