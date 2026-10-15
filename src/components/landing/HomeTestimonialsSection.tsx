'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Quote } from 'lucide-react';

import {
  LANDING_DISPLAY_H2_CLASS,
  LANDING_EYEBROW_CLASS,
  LANDING_LEAD_CLASS,
  PUBLIC_SHELL_INNER_CLASS,
} from '@/components/landing/public-shell-width';

/**
 * A homepage review must be real and attributed: a named person, with their consent, quoting
 * what they actually said. The previous quotes were composites "representative of" learners,
 * which is misleading under the Australian Consumer Law, so they were removed. The section
 * renders nothing until attributed reviews are added here (founder input).
 */
export type HomeTestimonial = {
  quote: string;
  /** The reviewer's real name, as they consented to be named. Required. */
  name: string;
  role: string;
  region: string;
};

export const HOME_TESTIMONIALS: readonly HomeTestimonial[] = [];

/** Only attributed reviews are shown; an entry without a name or quote is dropped. */
export function attributedTestimonials(
  items: readonly HomeTestimonial[]
): HomeTestimonial[] {
  return items.filter((t) => t.name.trim() !== '' && t.quote.trim() !== '');
}

const spring = { type: 'spring' as const, stiffness: 120, damping: 22 };

/**
 * Light editorial social proof. One large featured quote, two smaller quotes
 * stacked beside it. Content-object cards are acceptable here.
 */
export function HomeTestimonialsSection({
  testimonials = HOME_TESTIMONIALS,
}: {
  testimonials?: readonly HomeTestimonial[];
} = {}) {
  const reduceMotion = useReducedMotion();
  const [featured, ...secondary] = attributedTestimonials(testimonials);
  if (!featured) return null;

  return (
    <section
      aria-labelledby="home-testimonials-heading"
      className="relative border-t border-slate-200/70 bg-[#fafbfc] py-16 md:py-24"
    >
      <div className={PUBLIC_SHELL_INNER_CLASS}>
        <div className="max-w-xl">
          <p className={LANDING_EYEBROW_CLASS}>What technicians say</p>
          <h2 id="home-testimonials-heading" className={`mt-3 ${LANDING_DISPLAY_H2_CLASS}`}>
            Training that holds up on real jobs
          </h2>
          <p className={`mt-4 ${LANDING_LEAD_CLASS}`}>
            Technicians, managers and owners who study with CARSI, in their own words.
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          <motion.figure
            className="relative flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-8 sm:p-10"
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={spring}
          >
            <Quote className="h-10 w-10 text-[#2490ed]/25" aria-hidden />
            <blockquote className="mt-6 font-[family-name:var(--font-display)] text-2xl leading-snug font-medium text-balance text-slate-900 sm:text-[1.7rem]">
              &ldquo;{featured.quote}&rdquo;
            </blockquote>
            <figcaption className="mt-8 text-sm">
              <span className="block font-semibold text-slate-900">{featured.name}</span>
              <span className="text-slate-500">
                {featured.role}, {featured.region}
              </span>
            </figcaption>
          </motion.figure>

          <div className="flex flex-col gap-6">
            {secondary.map((testimonial, i) => (
              <motion.figure
                key={testimonial.name}
                className="rounded-2xl border border-slate-200/80 bg-white p-6 transition-colors duration-300 hover:border-[#2490ed]/30 sm:p-7"
                initial={reduceMotion ? false : { opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ ...spring, delay: 0.1 + i * 0.08 }}
              >
                <Quote className="h-6 w-6 text-[#2490ed]/20" aria-hidden />
                <blockquote className="mt-4 text-[15px] leading-relaxed text-slate-700">
                  &ldquo;{testimonial.quote}&rdquo;
                </blockquote>
                <figcaption className="mt-4 text-sm">
                  <span className="block font-semibold text-slate-900">{testimonial.name}</span>
                  <span className="text-slate-500">
                    {testimonial.role}, {testimonial.region}
                  </span>
                </figcaption>
              </motion.figure>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
