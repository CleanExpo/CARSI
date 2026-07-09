import type { Metadata } from 'next';
import Link from 'next/link';
import { MessageSquareHeart } from 'lucide-react';

import { MarketingPageShell } from '@/components/marketing/MarketingPageShell';
import { MarketingSectionHeader } from '@/components/marketing/MarketingSectionHeader';
import {
  TestimonialCard,
  type Testimonial,
} from '@/components/marketing/testimonials/TestimonialCard';
import {
  marketingBtnPrimary,
  marketingBtnSecondary,
  marketingEyebrowPill,
  marketingHeading,
  marketingPanel,
  marketingStatCard,
  marketingTextMuted,
} from '@/lib/marketing/marketing-ui';

export const metadata: Metadata = {
  title: 'Student Testimonials | CARSI — Cleaning and Restoration Training',
  description:
    'Hear from restoration and cleaning professionals across Australia who have trained with CARSI. Real reviews from real technicians earning IICRC CECs online.',
};

const TESTIMONIALS: Testimonial[] = [
  {
    name: 'Shannon Benz',
    company: 'Mould Solutions Group',
    quote:
      "CARSI's mould remediation courses gave my team the IICRC CEC knowledge we needed to tackle complex jobs with confidence. The CEC credit tracking is clear and the content is genuinely practical — not just theory.",
    featured: true,
  },
  {
    name: 'Yasser Mohamed',
    company: 'Black Gold Carpet Cleaning',
    quote:
      "Running my own carpet cleaning business means training has to fit around the job. CARSI's 24/7 online access let me complete my CRT preparation between callouts. Worth every dollar.",
  },
  {
    name: 'Klark Brown',
    company: 'Restoration Advisers',
    quote:
      "We've enrolled our entire team through CARSI. The IICRC discipline coverage is comprehensive, the course quality is consistently high, and the platform just works. It's our go-to for keeping technicians certified.",
  },
  {
    name: 'Phillip Wolffe',
    company: 'Armour IT Australia',
    quote:
      'I use CARSI for the business management side of our restoration operation. The admin and compliance courses have made a real difference to how we price jobs and manage client communications.',
  },
  {
    name: 'Kayla McGowan',
    company: 'Restoration and Remediation Magazine',
    quote:
      "As someone who covers the restoration industry professionally, I've seen many training providers. CARSI stands out for the depth of their IICRC CEC course content and their genuine commitment to raising industry standards.",
  },
  {
    name: 'Lisa Lavender',
    company: 'RTI Learning',
    quote:
      'CARSI has set a high benchmark for online restoration training in Australia. Their CEC tracking system is transparent, the courses are well-structured, and the support team actually responds.',
  },
  {
    name: 'Joko Mardiono',
    company: 'AeroAir Australia',
    quote:
      "AeroAir technicians deal with complex air quality and biological contamination scenarios. CARSI's courses on biological contaminants and applied structural drying have been invaluable for keeping our team current.",
  },
  {
    name: 'Toby Bredhauer',
    company: 'Carpet Cleaners Warehouse',
    quote:
      'As a supplier to the carpet cleaning industry, I recommend CARSI to every technician I meet. Their practical, science-based approach is exactly what our industry needs to raise its professional standard.',
  },
];

function StarRatingBanner() {
  return (
    <div
      className={`mb-10 flex flex-col gap-6 rounded-2xl p-6 sm:flex-row sm:items-center sm:justify-between ${marketingPanel}`}
      style={{
        backgroundImage:
          'linear-gradient(135deg, rgba(36,144,237,0.08) 0%, transparent 55%), linear-gradient(225deg, rgba(237,157,36,0.06) 0%, transparent 50%)',
      }}
    >
      <div className="flex flex-wrap gap-8">
        {[
          { value: '5.0', label: 'Average rating' },
          { value: `${TESTIMONIALS.length}`, label: 'Verified reviews' },
          { value: '261+', label: 'Professionals trained' },
        ].map((stat) => (
          <div key={stat.label}>
            <p className="text-2xl font-bold tracking-tight text-[#146fc2] dark:text-[#8fd0ff]">
              {stat.value}
            </p>
            <p className={`mt-0.5 text-xs font-medium uppercase tracking-wide ${marketingTextMuted}`}>
              {stat.label}
            </p>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1" aria-label="5 out of 5 stars">
        {Array.from({ length: 5 }).map((_, i) => (
          <svg key={i} className="h-5 w-5 text-[#a85500] dark:text-[#ed9d24]" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
    </div>
  );
}

export default function TestimonialsPage() {
  const [featured, ...rest] = TESTIMONIALS;

  return (
    <MarketingPageShell id="main-content">
      <header className="pb-8 sm:pb-10">
        <p className={`mb-4 inline-flex items-center gap-2 ${marketingEyebrowPill}`}>
          <MessageSquareHeart className="h-3.5 w-3.5" aria-hidden />
          Student reviews
        </p>
        <h1 className={`max-w-3xl ${marketingHeading}`}>What our students say</h1>
        <p className={`mt-5 max-w-2xl text-base leading-relaxed sm:text-lg ${marketingTextMuted}`}>
          Real feedback from cleaning and restoration professionals across Australia who have trained
          with CARSI and earned IICRC-recognised Continuing Education Credits.
        </p>
      </header>

      <StarRatingBanner />

      <section aria-label="Testimonials">
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <TestimonialCard testimonial={featured} />
          </div>
          <div className={`flex flex-col justify-center gap-3 p-6 ${marketingStatCard}`}>
            <p className="text-[11px] font-semibold tracking-[0.16em] text-[#146fc2] uppercase dark:text-[#8fd0ff]">
              Trusted by teams
            </p>
            <p className="text-2xl font-bold leading-snug text-slate-900 dark:text-white">
              From solo operators to national restoration firms
            </p>
            <p className={`text-sm leading-relaxed ${marketingTextMuted}`}>
              Reviews span carpet cleaning, mould remediation, insurance restoration, and industry
              media — all grounded in practical field experience.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((t) => (
            <TestimonialCard key={t.name} testimonial={t} />
          ))}
        </div>
      </section>

      <section className="mt-14 sm:mt-16" aria-label="Share feedback">
        <MarketingSectionHeader
          eyebrow="Your voice"
          title="Share your experience"
          body="Have you trained with CARSI? We'd love to hear from you."
          align="center"
          className="mx-auto"
        />
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link href="/contact" className={marketingBtnPrimary}>
            Send feedback
          </Link>
          <a
            href="https://www.facebook.com/CARSIaus"
            target="_blank"
            rel="noopener noreferrer"
            className={marketingBtnSecondary}
          >
            Review on Facebook
          </a>
          <a
            href="https://www.linkedin.com/company/carsiaus"
            target="_blank"
            rel="noopener noreferrer"
            className={marketingBtnSecondary}
          >
            Review on LinkedIn
          </a>
        </div>
      </section>
    </MarketingPageShell>
  );
}
