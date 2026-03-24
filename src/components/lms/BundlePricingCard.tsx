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

const tagColors: Record<string, { bg: string; text: string; border: string }> = {
  mining: {
    bg: 'rgba(237,157,36,0.12)',
    text: '#ed9d24',
    border: 'rgba(237,157,36,0.3)',
  },
  'commercial-cleaning': {
    bg: 'rgba(38,196,160,0.12)',
    text: '#26c4a0',
    border: 'rgba(38,196,160,0.3)',
  },
  'aged-care': {
    bg: 'rgba(155,89,182,0.12)',
    text: '#9b59b6',
    border: 'rgba(155,89,182,0.3)',
  },
};

const defaultTagStyle = {
  bg: 'rgba(36,144,237,0.12)',
  text: '#2490ed',
  border: 'rgba(36,144,237,0.3)',
};

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

  const tagStyle = bundle.industry_tag
    ? (tagColors[bundle.industry_tag] ?? defaultTagStyle)
    : defaultTagStyle;

  const visibleCourses = bundle.courses.slice(0, MAX_VISIBLE_COURSES);
  const extraCount = bundle.courses.length - MAX_VISIBLE_COURSES;

  return (
    <div
      className="group flex flex-col overflow-hidden rounded-xl transition-all duration-200 hover:scale-[1.01]"
      style={{
        background: 'rgba(255,255,255,0.04)',
        backdropFilter: 'blur(24px) saturate(160%)',
        WebkitBackdropFilter: 'blur(24px) saturate(160%)',
        border: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      {/* Header */}
      <div className="p-4 pb-3">
        {/* Industry tag badge */}
        {bundle.industry_tag && (
          <span
            className="mb-3 inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium"
            style={{
              background: tagStyle.bg,
              color: tagStyle.text,
              border: `1px solid ${tagStyle.border}`,
            }}
          >
            <Tag className="h-3 w-3" />
            {bundle.industry_tag.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
          </span>
        )}

        {/* Bundle name */}
        <h3
          className="mb-1 text-base leading-snug font-semibold"
          style={{ color: 'rgba(255,255,255,0.92)' }}
        >
          {bundle.name}
        </h3>

        {bundle.description && (
          <p
            className="line-clamp-2 text-xs leading-relaxed"
            style={{ color: 'rgba(255,255,255,0.4)' }}
          >
            {bundle.description}
          </p>
        )}
      </div>

      {/* Course list */}
      <div className="mx-4 border-t px-0 py-3" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <ul className="flex flex-col gap-1.5">
          {visibleCourses.map((course) => (
            <li
              key={course.id}
              className="flex items-center gap-2 text-xs"
              style={{ color: 'rgba(255,255,255,0.55)' }}
            >
              <BookOpen
                className="h-3 w-3 flex-shrink-0"
                style={{ color: 'rgba(255,255,255,0.3)' }}
              />
              <span className="truncate">{course.title}</span>
            </li>
          ))}
          {extraCount > 0 && (
            <li
              className="text-xs font-medium"
              style={{ color: 'rgba(255,255,255,0.3)', paddingLeft: '1.25rem' }}
            >
              +{extraCount} more course{extraCount !== 1 ? 's' : ''}
            </li>
          )}
        </ul>
      </div>

      {/* Pricing + CTA */}
      <div className="mt-auto p-4 pt-2">
        <div className="mb-3 flex items-baseline gap-2">
          {originalPrice != null && originalPrice > price && (
            <span className="text-sm line-through" style={{ color: 'rgba(255,68,68,0.6)' }}>
              ${originalPrice.toFixed(0)}
            </span>
          )}
          <span className="text-xl font-bold" style={{ color: '#ed9d24' }}>
            ${price.toFixed(0)} AUD
          </span>
          {savings != null && savings > 0 && (
            <span
              className="rounded-md px-2 py-0.5 text-xs font-semibold"
              style={{
                color: '#27ae60',
                background: 'rgba(39,174,96,0.12)',
                border: '1px solid rgba(39,174,96,0.3)',
              }}
            >
              Save ${savings.toFixed(0)}
            </span>
          )}
        </div>

        <Link
          href="/subscribe"
          className="flex w-full items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition-all duration-150"
          style={{
            background: 'linear-gradient(135deg, #ed9d24 0%, #d68820 100%)',
            color: '#000',
          }}
        >
          Enrol in Bundle &rarr;
        </Link>
      </div>
    </div>
  );
}
