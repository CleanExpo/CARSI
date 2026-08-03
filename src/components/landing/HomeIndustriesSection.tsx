'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Building2 } from 'lucide-react';
import Link from 'next/link';

import { PUBLIC_SHELL_INNER_CLASS } from '@/components/landing/public-shell-width';
import { AcronymTooltip } from '@/components/ui/AcronymTooltip';

const INDUSTRIES = [
  { slug: 'healthcare', label: 'Healthcare', span: 'lg:col-span-2 lg:row-span-2', featured: true },
  { slug: 'hospitality', label: 'Hotels & Resorts', span: 'lg:col-span-1', featured: true },
  {
    slug: 'government-defence',
    label: 'Government & Defence',
    span: 'lg:col-span-1',
    featured: true,
  },
  {
    slug: 'commercial-cleaning',
    label: 'Commercial Cleaning',
    span: 'lg:col-span-2',
    featured: true,
  },
  { slug: 'aged-care', label: 'Aged Care', span: '', featured: false },
  { slug: 'mining', label: 'Mining & Resources', span: '', featured: false },
  { slug: 'education', label: 'Education', span: '', featured: false },
  { slug: 'property-management', label: 'Property Management', span: '', featured: false },
  { slug: 'strata', label: 'Strata & Body Corporate', span: '', featured: false },
  { slug: 'retail', label: 'Retail & Shopping Centres', span: '', featured: false },
  { slug: 'childcare', label: 'Childcare', span: '', featured: false },
  { slug: 'construction', label: 'Construction', span: '', featured: false },
] as const;

/**
 * Asymmetric industries bento — featured tiles dominate; not a uniform 4-column grid.
 */
export function HomeIndustriesSection() {
  const reduceMotion = useReducedMotion();

  return (
    <section
      aria-labelledby="home-industries-heading"
      className="relative border-t border-slate-200/80 bg-[#f6f8fb] py-16 md:py-24 dark:border-white/10 dark:bg-[#050505]"
    >
      <div className={PUBLIC_SHELL_INNER_CLASS}>
        <div className="max-w-2xl">
          <p className="text-[11px] font-semibold tracking-[0.18em] text-[#146fc2] uppercase dark:text-[#8fd0ff]">
            Multi-industry training
          </p>
          <h2
            id="home-industries-heading"
            className="mt-3 text-2xl font-bold tracking-tight text-slate-950 md:text-3xl dark:text-white"
          >
            Built for every sector you serve
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-slate-600 md:text-base dark:text-white/70">
            From hospitals to hotels, government facilities to commercial buildings — industry-
            specific pathways for every sector that needs <AcronymTooltip term="IICRC" />{' '}
            credentials.
          </p>
        </div>

        <ul className="mt-12 grid auto-rows-[minmax(5.5rem,auto)] grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
          {INDUSTRIES.map((industry, index) => (
            <motion.li
              key={industry.slug}
              className={industry.span}
              initial={reduceMotion ? false : { opacity: 0, y: 18 }}
              whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.4, delay: Math.min(index * 0.04, 0.32) }}
            >
              <Link
                href={`/industries/${industry.slug}`}
                className={`group relative flex h-full min-h-[5.5rem] flex-col justify-between overflow-hidden rounded-2xl border p-5 transition duration-300 hover:-translate-y-0.5 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-[#2490ed]/40 focus-visible:outline-none ${
                  industry.featured
                    ? 'border-[#2490ed]/40 bg-gradient-to-br from-[#eef7ff] via-white to-[#f8fbff] dark:border-[#2490ed]/35 dark:from-[#0d1a2e] dark:via-[#0a1420] dark:to-[#080c14]'
                    : 'border-slate-200/90 bg-white hover:border-[#2490ed]/35 dark:border-white/10 dark:bg-white/[0.04]'
                } ${industry.featured && industry.span.includes('row-span') ? 'min-h-[14rem] sm:min-h-[16rem]' : ''}`}
              >
                {industry.featured ? (
                  <span
                    className="pointer-events-none absolute -right-6 -bottom-8 h-28 w-28 rounded-full bg-[#2490ed]/10 blur-2xl transition group-hover:bg-[#2490ed]/18"
                    aria-hidden
                  />
                ) : null}
                <span
                  className={`relative flex h-10 w-10 items-center justify-center rounded-xl ${
                    industry.featured
                      ? 'bg-white text-[#146fc2] shadow-sm dark:bg-[#146fc2]/20 dark:text-[#8fd0ff]'
                      : 'bg-[#eef7ff] text-[#146fc2] dark:bg-[#2490ed]/15 dark:text-[#8fd0ff]'
                  }`}
                >
                  <Building2 className="h-5 w-5" aria-hidden />
                </span>
                <span
                  className={`relative mt-4 font-semibold transition-colors group-hover:text-[#146fc2] dark:group-hover:text-[#8fd0ff] ${
                    industry.featured
                      ? 'text-lg text-slate-950 dark:text-white'
                      : 'text-sm text-slate-800 dark:text-white/90'
                  }`}
                >
                  {industry.label}
                </span>
              </Link>
            </motion.li>
          ))}
        </ul>

        <div className="mt-10 text-center">
          <Link
            href="/industries"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#146fc2] transition hover:gap-3 hover:text-[#0f5fa8] dark:text-[#8fd0ff] dark:hover:text-[#b8e2ff]"
          >
            View all industries
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}
