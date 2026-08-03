'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

import {
  LANDING_DISPLAY_H2_CLASS,
  LANDING_EYEBROW_CLASS,
  LANDING_LEAD_CLASS,
  PUBLIC_SHELL_INNER_CLASS,
} from '@/components/landing/public-shell-width';

interface Faq {
  question: string;
  answer: string;
}

function FaqItem({
  faq,
  isOpen,
  onToggle,
  reduceMotion,
}: {
  faq: Faq;
  isOpen: boolean;
  onToggle: () => void;
  reduceMotion: boolean | null;
}) {
  return (
    <div className="border-b border-slate-200">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="group flex w-full items-center justify-between gap-4 py-5 text-left focus-visible:ring-2 focus-visible:ring-[#2490ed]/35 focus-visible:outline-none"
      >
        <span className="font-[family-name:var(--font-display)] text-base font-semibold text-slate-950 transition-colors group-hover:text-[#146fc2] sm:text-lg">
          {faq.question}
        </span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-[#146fc2] transition-transform duration-300 ${
            isOpen ? 'rotate-180' : ''
          }`}
          aria-hidden
        />
      </button>
      <AnimatePresence initial={false}>
        {isOpen ? (
          <motion.div
            initial={reduceMotion ? undefined : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <p className="pr-8 pb-5 text-sm leading-relaxed text-slate-500">{faq.answer}</p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/**
 * Accessible FAQ accordion. Sticky intro on the left, accordion on the right
 * on desktop; stacked on mobile. Uses the same content array as the FAQ schema.
 */
export function HomeFaqSection({ faqs }: { faqs: Faq[] }) {
  const reduceMotion = useReducedMotion();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section
      aria-labelledby="home-faq-heading"
      className="relative border-t border-slate-200/70 bg-white py-16 md:py-24"
    >
      <div className={PUBLIC_SHELL_INNER_CLASS}>
        <div className="grid gap-12 lg:grid-cols-[minmax(240px,0.8fr)_minmax(0,1.2fr)] lg:gap-20">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <p className={LANDING_EYEBROW_CLASS}>Frequently asked</p>
            <h2 id="home-faq-heading" className={`mt-3 ${LANDING_DISPLAY_H2_CLASS}`}>
              Questions technicians ask before enrolling
            </h2>
            <p className={`mt-4 max-w-sm ${LANDING_LEAD_CLASS}`}>
              Straight answers about CECs, pacing, industries, and in-person events. If anything is
              still unclear, message CARSI support any time.
            </p>
          </div>

          <div>
            {faqs.map((faq, index) => (
              <FaqItem
                key={faq.question}
                faq={faq}
                isOpen={openIndex === index}
                onToggle={() => setOpenIndex(openIndex === index ? null : index)}
                reduceMotion={reduceMotion}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
