import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Student Testimonials | CARSI — Cleaning and Restoration Training',
  description:
    'Hear from restoration and cleaning professionals across Australia who have trained with CARSI. Real reviews from real technicians earning IICRC CECs online.',
};

interface Testimonial {
  name: string;
  company: string;
  quote: string;
}

const TESTIMONIALS: Testimonial[] = [
  {
    name: 'Shannon Benz',
    company: 'Mould Solutions Group',
    quote:
      "CARSI's mould remediation courses gave my team the IICRC-aligned knowledge we needed to tackle complex jobs with confidence. The CEC credit tracking is clear and the content is genuinely practical — not just theory.",
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
      "As someone who covers the restoration industry professionally, I've seen many training providers. CARSI stands out for the depth of their IICRC-aligned content and their genuine commitment to raising industry standards.",
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
  return (
    <main className="min-h-screen" style={{ background: '#060a14' }}>
      {/* Mesh background */}
      <div className="mesh-bg" aria-hidden="true">
        <div className="mesh-blob mesh-blob-1" />
        <div className="mesh-blob mesh-blob-2" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl px-6 py-20">
        <p
          className="mb-2 text-xs tracking-wide uppercase"
          style={{ color: 'rgba(255,255,255,0.3)' }}
        >
          Student Reviews
        </p>
        <h1
          className="mb-3 text-4xl font-bold tracking-tight"
          style={{ color: 'rgba(255,255,255,0.95)' }}
        >
          What Our Students Say
        </h1>
        <p
          className="mb-12 max-w-2xl text-sm leading-relaxed"
          style={{ color: 'rgba(255,255,255,0.5)' }}
        >
          Real reviews from cleaning and restoration professionals across Australia who have trained
          with CARSI and earned IICRC-recognised Continuing Education Credits.
        </p>

        {/* Aggregate stat row */}
        <div
          className="mb-10 flex flex-wrap gap-6 rounded-lg px-6 py-4"
          style={{
            background: 'rgba(36,144,237,0.05)',
            border: '1px solid rgba(36,144,237,0.15)',
          }}
        >
          {[
            { value: '5.0', label: 'Average Rating' },
            { value: `${TESTIMONIALS.length}`, label: 'Verified Reviews' },
            { value: '261+', label: 'Professionals Trained' },
          ].map((stat) => (
            <div key={stat.label} className="flex items-baseline gap-2">
              <span className="text-2xl font-bold" style={{ color: '#2490ed' }}>
                {stat.value}
              </span>
              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                {stat.label}
              </span>
            </div>
          ))}
          <div className="flex items-center gap-1" aria-label="5 out of 5 stars">
            {Array.from({ length: 5 }).map((_, i) => (
              <svg key={i} className="h-4 w-4" viewBox="0 0 20 20" fill="#ed9d24">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>
        </div>

        {/* Testimonial grid */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <figure
              key={t.name}
              className="flex flex-col rounded-lg p-5"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              {/* Stars */}
              <div className="mb-3 flex gap-0.5" aria-label="5 stars">
                {Array.from({ length: 5 }).map((_, i) => (
                  <svg key={i} className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="#ed9d24">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>

              {/* Quote */}
              <blockquote
                className="mb-4 flex-1 text-xs leading-relaxed"
                style={{ color: 'rgba(255,255,255,0.65)' }}
              >
                &ldquo;{t.quote}&rdquo;
              </blockquote>

              {/* Attribution */}
              <figcaption>
                <p className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.85)' }}>
                  {t.name}
                </p>
                <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  {t.company}
                </p>
              </figcaption>
            </figure>
          ))}
        </div>

        {/* Submit feedback CTA */}
        <div
          className="mt-12 rounded-lg p-6 text-center"
          style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <h2 className="mb-2 text-base font-semibold" style={{ color: 'rgba(255,255,255,0.85)' }}>
            Share Your Experience
          </h2>
          <p className="mb-4 text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
            Have you trained with CARSI? We&apos;d love to hear from you.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <a
              href="/contact"
              className="rounded-sm px-5 py-2.5 text-xs font-semibold transition-opacity hover:opacity-90"
              style={{ background: '#2490ed', color: '#fff' }}
            >
              Send Feedback
            </a>
            <a
              href="https://www.facebook.com/CARSIaus"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-sm px-5 py-2.5 text-xs font-semibold transition-colors"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.6)',
              }}
            >
              Review on Facebook
            </a>
            <a
              href="https://www.linkedin.com/company/carsiaus"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-sm px-5 py-2.5 text-xs font-semibold transition-colors"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.6)',
              }}
            >
              Review on LinkedIn
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
