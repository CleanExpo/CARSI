import { Quote } from 'lucide-react';

import { marketingPanel, marketingTextMuted, marketingTextStrong } from '@/lib/marketing/marketing-ui';

export interface Testimonial {
  name: string;
  company: string;
  quote: string;
  featured?: boolean;
}

function StarRow({ className = '' }: { className?: string }) {
  return (
    <div className={`flex gap-0.5 ${className}`} aria-label="5 out of 5 stars">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} className="h-3.5 w-3.5 text-[#a85500] dark:text-[#ed9d24]" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

export function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  const featured = testimonial.featured;

  return (
    <figure
      className={`relative flex h-full flex-col overflow-hidden p-5 sm:p-6 ${
        featured
          ? 'rounded-2xl border border-[#2490ed]/25 bg-gradient-to-br from-[#eef7ff] via-white to-white shadow-[0_20px_56px_-28px_rgba(36,144,237,0.2)] dark:border-[#2490ed]/30 dark:from-[#2490ed]/12 dark:via-[#0a0f18] dark:to-[#060a14]'
          : marketingPanel
      }`}
    >
      {featured ? (
        <div
          className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-[#2490ed]/10 blur-3xl dark:bg-[#2490ed]/20"
          aria-hidden
        />
      ) : null}
      <Quote
        className={`mb-3 h-5 w-5 ${featured ? 'text-[#146fc2] dark:text-[#8fd0ff]' : 'text-slate-300 dark:text-white/20'}`}
        aria-hidden
      />
      <StarRow className="mb-4" />
      <blockquote className={`flex-1 text-sm leading-relaxed ${marketingTextMuted}`}>
        &ldquo;{testimonial.quote}&rdquo;
      </blockquote>
      <figcaption className="mt-5 border-t border-slate-200/80 pt-4 dark:border-white/[0.08]">
        <p className={`text-sm font-semibold ${marketingTextStrong}`}>{testimonial.name}</p>
        <p className="mt-0.5 text-xs text-slate-600 dark:text-white/55">{testimonial.company}</p>
      </figcaption>
    </figure>
  );
}
