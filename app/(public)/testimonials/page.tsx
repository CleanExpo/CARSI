import type { Metadata } from 'next';
import Link from 'next/link';

import { LANDING_LEAD_CLASS } from '@/components/landing/public-shell-width';
import {
  PlatformBentoFeatured,
  PlatformContextualNext,
  PlatformPageHeroFromSurface,
  PlatformPageSection,
} from '@/components/marketing/platform/PlatformPagePattern';
import { StaticMarketingClosingCta } from '@/components/marketing/StaticMarketingClosingCta';
import {
  TestimonialCard,
  type Testimonial,
} from '@/components/marketing/testimonials/TestimonialCard';
import { socialProfileUrl } from '@/lib/brand/social-profiles';

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
      "Running my own carpet cleaning business means training has to fit around the job. CARSI's 24/7 online access let me complete carpet cleaning modules between callouts. Worth every dollar.",
  },
  {
    name: 'Klark Brown',
    company: 'Restoration Advisers',
    quote:
      "We've enrolled our entire team through CARSI. The restoration and cleaning topics are comprehensive, the course quality is consistently high, and the platform just works. It's our go-to for keeping technicians current.",
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
      <PlatformPageHeroFromSurface
        current="/testimonials"
        variant="centered"
        glow="center"
        stats={[
          { value: '5.0', label: 'Average rating' },
          { value: String(TESTIMONIALS.length), label: 'Verified reviews' },
          { value: '261+', label: 'Professionals trained' },
          { value: 'AU', label: 'Field operators' },
        ]}
      />

      <PlatformPageSection
        id="featured-review"
        eyebrow="Featured"
        title="From solo operators to national firms"
        tone="muted"
        layout="wide"
      >
        <PlatformBentoFeatured
          featured={<TestimonialCard testimonial={featured} />}
          aside={
            <>
              <p className={LANDING_LEAD_CLASS}>
                Reviews span carpet cleaning, mould remediation, insurance restoration, and industry
                media — grounded in practical field experience, not marketing filler.
              </p>
              <p className={`mt-4 text-sm text-slate-500`}>
                Scroll the grid below for more voices, or share your own experience at the bottom.
              </p>
            </>
          }
        />
      </PlatformPageSection>

      <PlatformPageSection
        id="more-reviews"
        eyebrow="The field"
        title="More voices"
        tone="white"
        layout="wide"
      >
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((t) => (
            <TestimonialCard key={t.name} testimonial={t} />
          ))}
        </div>
      </PlatformPageSection>

      <PlatformPageSection
        id="share-feedback"
        eyebrow="Your voice"
        title="Share your experience"
        lead="Have you trained with CARSI? We'd love to hear from you."
        tone="accent"
        align="center"
        layout="wide"
      >
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/contact"
            className="inline-flex min-h-12 items-center rounded-full bg-[#146fc2] px-7 text-sm font-semibold text-white hover:bg-[#0f5fa8]"
          >
            Send feedback
          </Link>
          <a
            href={socialProfileUrl('facebook')}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-12 items-center rounded-full border border-slate-200 bg-white px-7 text-sm font-semibold text-slate-800 hover:border-[#2490ed]/40 hover:text-[#146fc2]"
          >
            Review on Facebook
          </a>
          <a
            href={socialProfileUrl('linkedin')}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-12 items-center rounded-full border border-slate-200 bg-white px-7 text-sm font-semibold text-slate-800 hover:border-[#2490ed]/40 hover:text-[#146fc2]"
          >
            Review on LinkedIn
          </a>
        </div>
      </PlatformPageSection>

      <PlatformContextualNext current="/testimonials" />
      <StaticMarketingClosingCta />
            >
              Review on Facebook
            </a>
            <a
              href={socialProfileUrl('linkedin')}
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
