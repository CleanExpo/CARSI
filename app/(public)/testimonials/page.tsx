import type { Metadata } from 'next';
import Link from 'next/link';

import { HomeFinalCtaSection } from '@/components/landing/HomeFinalCtaSection';
import { HomeTrustStrip } from '@/components/landing/HomeTrustStrip';
import {
  LANDING_DISPLAY_H2_CLASS,
  LANDING_EYEBROW_CLASS,
  LANDING_LEAD_CLASS,
  PUBLIC_SHELL_INNER_CLASS,
} from '@/components/landing/public-shell-width';
import { PlatformNav } from '@/components/marketing/PlatformNav';
import {
  TestimonialCard,
  type Testimonial,
} from '@/components/marketing/testimonials/TestimonialCard';

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

export default function TestimonialsPage() {
  const [featured, ...rest] = TESTIMONIALS;

  return (
    <>
      <section className="relative overflow-hidden border-b border-slate-200/70 bg-white">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_88%_0%,rgba(36,144,237,0.11),transparent_58%)]"
          aria-hidden
        />
        <div className={`relative ${PUBLIC_SHELL_INNER_CLASS} py-16 md:py-24`}>
          <p className={LANDING_EYEBROW_CLASS}>Student reviews</p>
          <h1 className="mt-3 max-w-3xl font-[family-name:var(--font-display)] text-[2.15rem] leading-[1.1] font-semibold tracking-[-0.02em] text-slate-950 md:text-[3.1rem] md:leading-[1.06]">
            What our students say
          </h1>
          <p className={`mt-5 max-w-2xl text-pretty ${LANDING_LEAD_CLASS}`}>
            Real feedback from cleaning and restoration professionals across Australia who have
            trained with CARSI and earned IICRC Continuing Education Credits.
          </p>
          <PlatformNav current="/testimonials" />
        </div>
      </section>

      <HomeTrustStrip
        stats={[
          { value: '5.0', label: 'Average rating' },
          { value: String(TESTIMONIALS.length), label: 'Verified reviews' },
          { value: '261+', label: 'Professionals trained' },
          { value: 'AU', label: 'Field operators' },
        ]}
      />

      <section className="border-t border-slate-200/70 bg-[#fafbfc] py-16 md:py-24" aria-label="Featured review">
        <div className={`${PUBLIC_SHELL_INNER_CLASS} grid gap-10 lg:grid-cols-[1.2fr_0.8fr]`}>
          <TestimonialCard testimonial={featured} />
          <div>
            <p className={LANDING_EYEBROW_CLASS}>Trusted by teams</p>
            <h2 className={`mt-3 ${LANDING_DISPLAY_H2_CLASS}`}>
              From solo operators to national restoration firms
            </h2>
            <p className={`mt-4 ${LANDING_LEAD_CLASS}`}>
              Reviews span carpet cleaning, mould remediation, insurance restoration, and industry
              media — all grounded in practical field experience.
            </p>
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200/70 bg-white py-16 md:py-24" aria-label="Testimonials">
        <div className={PUBLIC_SHELL_INNER_CLASS}>
          <p className={LANDING_EYEBROW_CLASS}>The field</p>
          <h2 className={`mt-3 ${LANDING_DISPLAY_H2_CLASS}`}>More voices from the industry</h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((t) => (
              <TestimonialCard key={t.name} testimonial={t} />
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200/70 bg-[#fafbfc] py-16 md:py-24" aria-label="Share feedback">
        <div className={`${PUBLIC_SHELL_INNER_CLASS} text-center`}>
          <p className={LANDING_EYEBROW_CLASS}>Your voice</p>
          <h2 className={`mx-auto mt-3 max-w-xl ${LANDING_DISPLAY_H2_CLASS}`}>Share your experience</h2>
          <p className={`mx-auto mt-4 max-w-lg ${LANDING_LEAD_CLASS}`}>
            Have you trained with CARSI? We&apos;d love to hear from you.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/contact"
              className="inline-flex min-h-12 items-center rounded-full bg-[#146fc2] px-7 text-sm font-semibold text-white hover:bg-[#0f5fa8]"
            >
              Send feedback
            </Link>
            <a
              href="https://www.facebook.com/CARSIaus"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-12 items-center rounded-full border border-slate-200 bg-white px-7 text-sm font-semibold text-slate-800 hover:border-[#2490ed]/40 hover:text-[#146fc2]"
            >
              Review on Facebook
            </a>
            <a
              href="https://www.linkedin.com/company/carsiaus"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-12 items-center rounded-full border border-slate-200 bg-white px-7 text-sm font-semibold text-slate-800 hover:border-[#2490ed]/40 hover:text-[#146fc2]"
            >
              Review on LinkedIn
            </a>
          </div>
        </div>
      </section>

      <HomeFinalCtaSection />
    </>
  );
}
