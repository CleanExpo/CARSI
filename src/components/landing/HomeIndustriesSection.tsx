'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

import {
  LANDING_DISPLAY_H2_CLASS,
  LANDING_EYEBROW_CLASS,
  LANDING_LEAD_CLASS,
  PUBLIC_SHELL_INNER_CLASS,
} from '@/components/landing/public-shell-width';
import { AcronymTooltip } from '@/components/ui/AcronymTooltip';

const INDUSTRIES = [
  { slug: 'healthcare', label: 'Healthcare', featured: true },
  { slug: 'hospitality', label: 'Hotels & Resorts', featured: true },
  { slug: 'government-defence', label: 'Government & Defence', featured: true },
  { slug: 'commercial-cleaning', label: 'Commercial Cleaning', featured: true },
  { slug: 'aged-care', label: 'Aged Care', featured: false },
  { slug: 'mining', label: 'Mining & Resources', featured: false },
  { slug: 'education', label: 'Education', featured: false },
  { slug: 'property-management', label: 'Property Management', featured: false },
  { slug: 'strata', label: 'Strata & Body Corporate', featured: false },
  { slug: 'retail', label: 'Retail & Shopping Centres', featured: false },
  { slug: 'childcare', label: 'Childcare', featured: false },
  { slug: 'construction', label: 'Construction', featured: false },
] as const;

const spring = { type: 'spring' as const, stiffness: 120, damping: 22 };

/**
 * Light industries index. Typographic list, not a card bento.
 */
export function HomeIndustriesSection() {
  const reduceMotion = useReducedMotion();

  return (
    <section
      aria-labelledby="home-industries-heading"
      className="relative border-t border-slate-200/70 bg-white py-16 md:py-24"
    >
      <div className={PUBLIC_SHELL_INNER_CLASS}>
        <div className="grid gap-12 lg:grid-cols-[minmax(240px,0.7fr)_minmax(0,1.3fr)] lg:gap-20">
          <div>
            <p className={LANDING_EYEBROW_CLASS}>Industries</p>
            <h2 id="home-industries-heading" className={`mt-3 ${LANDING_DISPLAY_H2_CLASS}`}>
              Trained for every sector you serve
            </h2>
            <p className={`mt-4 ${LANDING_LEAD_CLASS}`}>
              From hospitals to hotels, sector-specific pathways prepare crews for the standards
              each workplace expects, including <AcronymTooltip term="IICRC" /> continuing
              education.
            </p>
            <Link
              href="/industries"
              className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-[#146fc2] transition hover:gap-3 focus-visible:ring-2 focus-visible:ring-[#2490ed]/35 focus-visible:outline-none"
            >
              View all industries
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>

          <ul className="columns-1 gap-x-12 sm:columns-2">
            {INDUSTRIES.map((industry, index) => (
              <motion.li
                key={industry.slug}
                className="mb-0 break-inside-avoid"
                initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ ...spring, delay: Math.min(index * 0.03, 0.28) }}
              >
                <Link
                  href={`/industries/${industry.slug}`}
                  className={`group flex items-center justify-between border-b border-slate-100 py-4 transition hover:border-[#2490ed]/30 focus-visible:outline-none ${
                    industry.featured
                      ? 'font-[family-name:var(--font-display)] text-lg font-semibold text-slate-950'
                      : 'text-[15px] font-medium text-slate-700'
                  }`}
                >
                  <span className="group-hover:text-[#146fc2] group-focus-visible:text-[#146fc2]">
                    {industry.label}
                  </span>
                  <ArrowRight
                    className="h-3.5 w-3.5 text-slate-300 opacity-0 transition group-hover:translate-x-0.5 group-hover:text-[#146fc2] group-hover:opacity-100 group-focus-visible:translate-x-0.5 group-focus-visible:text-[#146fc2] group-focus-visible:opacity-100"
                    aria-hidden
                  />
                </Link>
              </motion.li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
