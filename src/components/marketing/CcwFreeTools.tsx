import {
  LANDING_DISPLAY_H2_CLASS,
  LANDING_EYEBROW_CLASS,
  PUBLIC_SHELL_INNER_CLASS,
} from '@/components/landing/public-shell-width';
import { ccwFreeTools } from '@/lib/marketing/ccw-free-tools';

/**
 * CCW tools block for CCW-CARSI marketing pages. Never render it in a CEC-approved course.
 * Pages that sell paid entry pass a neutral heading, so "free" never reads as free entry.
 */
export function CcwFreeTools({ heading = 'Free CCW tools' }: { heading?: string }) {
  return (
    <section
      aria-labelledby="ccw-tools-heading"
      className="border-t border-slate-200/70 bg-white py-16 md:py-20"
    >
      <div className={PUBLIC_SHELL_INNER_CLASS}>
        <p className={LANDING_EYEBROW_CLASS}>From Carpet Cleaners Warehouse</p>
        <h2 id="ccw-tools-heading" className={`mt-3 ${LANDING_DISPLAY_H2_CLASS}`}>
          {heading}
        </h2>
        <ul className="mt-8 grid gap-4 md:grid-cols-2">
          {ccwFreeTools.map((tool) => (
            <li key={tool.url} className="rounded-2xl border border-slate-200/80 bg-[#fafbfc] p-6">
              <a
                href={tool.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-base font-semibold text-[#146fc2] hover:underline"
              >
                {tool.title}
              </a>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{tool.description}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
