import Link from 'next/link';
import { BookOpen, Tag } from 'lucide-react';

interface BundleCourse {
  id: string;
  title: string;
  slug: string;
  iicrc_discipline?: string | null;
}

interface BundleProps {
  bundle: {
    id: string;
    name: string;
    slug: string;
    description?: string | null;
    price_aud: number | string;
    original_price_aud?: number | string | null;
    savings_aud?: number | string | null;
    industry_tag?: string | null;
    course_count: number;
    courses: BundleCourse[];
  };
}

const tagClasses: Record<string, string> = {
  mining: 'bg-amber-500/10 text-amber-400 border border-amber-500/30',
  'commercial-cleaning': 'bg-teal-400/10 text-teal-400 border border-teal-400/30',
  'aged-care': 'bg-purple-500/10 text-purple-400 border border-purple-500/30',
};

const defaultTagClass = 'bg-blue-400/10 text-blue-400 border border-blue-400/30';

const MAX_VISIBLE_COURSES = 4;

export function BundlePricingCard({ bundle }: BundleProps) {
  const price =
    typeof bundle.price_aud === 'string' ? parseFloat(bundle.price_aud) : bundle.price_aud;
  const originalPrice = bundle.original_price_aud
    ? typeof bundle.original_price_aud === 'string'
      ? parseFloat(bundle.original_price_aud)
      : bundle.original_price_aud
    : null;
  const savings = bundle.savings_aud
    ? typeof bundle.savings_aud === 'string'
      ? parseFloat(bundle.savings_aud)
      : bundle.savings_aud
    : null;

  const tagClass = bundle.industry_tag
    ? (tagClasses[bundle.industry_tag] ?? defaultTagClass)
    : defaultTagClass;

  const visibleCourses = bundle.courses.slice(0, MAX_VISIBLE_COURSES);
  const extraCount = bundle.courses.length - MAX_VISIBLE_COURSES;

  return (
    <div
      className="group flex flex-col overflow-hidden rounded-lg border border-border bg-card transition-all duration-200 hover:scale-[1.01]"
    >
      {/* Header */}
      <div className="p-4 pb-3">
        {/* Industry tag badge */}
        {bundle.industry_tag && (
          <span
            className={`mb-3 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium ${tagClass}`}
          >
            <Tag className="h-3 w-3" />
            {bundle.industry_tag.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
          </span>
        )}

        {/* Bundle name */}
        <h3
          className="mb-1 text-base leading-snug font-semibold text-foreground"
        >
          {bundle.name}
        </h3>

        {bundle.description && (
          <p
            className="line-clamp-2 text-xs leading-relaxed text-muted-foreground/60"
          >
            {bundle.description}
          </p>
        )}
      </div>

      {/* Course list */}
      <div className="mx-4 border-t border-border px-0 py-3">
        <ul className="flex flex-col gap-1.5">
          {visibleCourses.map((course) => (
            <li
              key={course.id}
              className="flex items-center gap-2 text-xs text-muted-foreground"
            >
              <BookOpen
                className="h-3 w-3 flex-shrink-0 text-muted-foreground/60"
              />
              <span className="truncate">{course.title}</span>
            </li>
          ))}
          {extraCount > 0 && (
            <li className="pl-5 text-xs font-medium text-muted-foreground/60">
              +{extraCount} more course{extraCount !== 1 ? 's' : ''}
            </li>
          )}
        </ul>
      </div>

      {/* Pricing + CTA */}
      <div className="mt-auto p-4 pt-2">
        <div className="mb-3 flex items-baseline gap-2">
          {originalPrice != null && originalPrice > price && (
            <span className="text-sm text-destructive line-through">
              ${originalPrice.toFixed(0)}
            </span>
          )}
          <span className="text-xl font-bold text-carsi-orange">
            ${price.toFixed(0)} AUD
          </span>
          {savings != null && savings > 0 && (
            <span
              className="rounded-lg border border-green-500/30 bg-green-500/10 px-2 py-0.5 text-xs font-semibold text-green-500"
            >
              Save ${savings.toFixed(0)}
            </span>
          )}
        </div>

        <Link
          href="/subscribe"
          className="flex w-full items-center justify-center rounded-lg bg-carsi-orange px-4 py-2.5 text-sm font-semibold text-black transition-all duration-150 hover:opacity-90"
        >
          Enrol in Bundle &rarr;
        </Link>
      </div>
    </div>
  );
}
