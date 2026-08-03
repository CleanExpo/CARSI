'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, MessageCircle } from 'lucide-react';
import Link from 'next/link';
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

const spring = { type: 'spring' as const, stiffness: 120, damping: 22 };

function LedgerItem({
  faq,
  index,
  isOpen,
  onToggle,
  reduceMotion,
}: {
  faq: Faq;
  index: number;
  isOpen: boolean;
  onToggle: () => void;
  reduceMotion: boolean | null;
}) {
  const numeral = String(index + 1).padStart(2, '0');
  const buttonId = `home-faq-question-${index}`;
  const panelId = `home-faq-panel-${index}`;

  return (
    <motion.li
      className="border-b border-slate-200/80 first:border-t"
      initial={reduceMotion ? false : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ ...spring, delay: index * 0.06 }}
    >
      <h3>
        <button
          type="button"
          id={buttonId}
          onClick={onToggle}
          aria-expanded={isOpen}
          aria-controls={panelId}
          className="group grid w-full grid-cols-[auto_1fr_auto] items-center gap-4 py-6 text-left focus-visible:ring-2 focus-visible:ring-[#2490ed]/35 focus-visible:outline-none sm:gap-7 sm:py-7"
        >
          {/* Oversized ghost numeral */}
          <span
            className={`font-[family-name:var(--font-display)] text-[2.4rem] leading-none font-semibold tracking-[-0.04em] tabular-nums transition-colors duration-300 select-none sm:text-[3.2rem] ${
              isOpen ? 'text-[#2490ed]/40' : 'text-slate-200 group-hover:text-[#2490ed]/25'
            }`}
            aria-hidden
          >
            {numeral}
          </span>

          <span
            className={`font-[family-name:var(--font-display)] text-base font-semibold tracking-[-0.01em] transition-colors sm:text-xl ${
              isOpen ? 'text-[#146fc2]' : 'text-slate-950 group-hover:text-[#146fc2]'
            }`}
          >
            {faq.question}
          </span>

          {/* Plus that morphs to minus */}
          <span
            className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors duration-300 sm:h-10 sm:w-10 ${
              isOpen
                ? 'border-[#146fc2] bg-[#146fc2] text-white'
                : 'border-slate-200 text-slate-500 group-hover:border-[#2490ed]/45 group-hover:text-[#146fc2]'
            }`}
            aria-hidden
          >
            <span className="absolute h-px w-3.5 bg-current" />
            <motion.span
              className="absolute h-3.5 w-px bg-current"
              animate={{ rotate: isOpen ? 90 : 0, opacity: isOpen ? 0 : 1 }}
              transition={reduceMotion ? { duration: 0 } : spring}
            />
          </span>
        </button>
      </h3>

      <AnimatePresence initial={false}>
        {isOpen ? (
          <motion.div
            id={panelId}
            role="region"
            aria-labelledby={buttonId}
            initial={reduceMotion ? undefined : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.32, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-[auto_1fr_auto] gap-4 sm:gap-7">
              {/* Invisible numeral keeps the answer aligned under the question */}
              <span
                className="invisible font-[family-name:var(--font-display)] text-[2.4rem] leading-none font-semibold tracking-[-0.04em] tabular-nums select-none sm:text-[3.2rem]"
                aria-hidden
              >
                {numeral}
              </span>
              <p className="max-w-2xl pb-7 text-[15px] leading-relaxed text-slate-500">
                {faq.answer}
              </p>
              <span className="w-9 sm:w-10" aria-hidden />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.li>
  );
}

/**
 * Editorial FAQ ledger. Sticky header column with a support card on the left;
 * on the right, a typographic ledger of questions with oversized ghost
 * numerals, hairline rules, and a plus-to-minus disclosure control.
 */
export function HomeFaqSection({ faqs }: { faqs: Faq[] }) {
  const reduceMotion = useReducedMotion();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section
      aria-labelledby="home-faq-heading"
      className="relative overflow-hidden border-t border-slate-200/70 bg-white py-16 md:py-24"
    >
      {/* Faint stage: glow behind the header column, masked dot grid behind the ledger */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute top-[16%] left-[-12%] h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(closest-side,rgba(36,144,237,0.09),transparent_70%)] blur-2xl" />
        <div className="absolute inset-y-0 right-0 w-[58%] [mask-image:radial-gradient(ellipse_75%_65%_at_70%_40%,black,transparent)] opacity-45">
          <div
            className="h-full w-full"
            style={{
              backgroundImage: 'radial-gradient(rgba(15,23,42,0.13) 1px, transparent 1px)',
              backgroundSize: '22px 22px',
            }}
          />
        </div>
      </div>

      <div className={`relative ${PUBLIC_SHELL_INNER_CLASS}`}>
        <div className="grid gap-12 lg:grid-cols-[minmax(260px,0.8fr)_minmax(0,1.2fr)] lg:gap-20">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <p className={LANDING_EYEBROW_CLASS}>Frequently asked</p>
            <h2 id="home-faq-heading" className={`mt-3 ${LANDING_DISPLAY_H2_CLASS}`}>
              Questions technicians ask before enrolling
            </h2>
            <p className={`mt-4 max-w-sm ${LANDING_LEAD_CLASS}`}>
              Straight answers about CECs, pacing, industries, and in-person events. If anything is
              still unclear, message CARSI support any time.
            </p>

            {/* Support card */}
            <motion.div
              className="relative mt-10 max-w-sm overflow-hidden rounded-2xl border border-slate-200/90 bg-[#fafbfc] p-6 shadow-[0_24px_50px_-38px_rgba(15,23,42,0.35)]"
              initial={reduceMotion ? false : { opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ ...spring, delay: 0.15 }}
            >
              <div
                className="pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full bg-[radial-gradient(closest-side,rgba(36,144,237,0.16),transparent_70%)] blur-xl"
                aria-hidden
              />
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#146fc2] to-[#2490ed] text-white shadow-[0_10px_22px_-10px_rgba(20,111,194,0.7)]">
                <MessageCircle className="h-4.5 w-4.5" aria-hidden />
              </span>
              <p className="mt-4 font-[family-name:var(--font-display)] text-base font-semibold text-slate-950">
                Still unclear?
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
                Real people, Australian hours. Ask about CECs, invoices, or which course fits your
                crew.
              </p>
              <Link
                href="/contact"
                className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#146fc2] transition hover:gap-3 focus-visible:ring-2 focus-visible:ring-[#2490ed]/35 focus-visible:outline-none"
              >
                Message CARSI support
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </motion.div>
          </div>

          <ul>
            {faqs.map((faq, index) => (
              <LedgerItem
                key={faq.question}
                faq={faq}
                index={index}
                isOpen={openIndex === index}
                onToggle={() => setOpenIndex(openIndex === index ? null : index)}
                reduceMotion={reduceMotion}
              />
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
