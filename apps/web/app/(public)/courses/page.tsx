import { BundlePricingCard } from '@/components/lms/BundlePricingCard';
import { CourseGrid } from '@/components/lms/CourseGrid';

interface SearchParams {
  category?: string;
  level?: string;
  discipline?: string;
}

async function getBundles() {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8000';
  try {
    const res = await fetch(`${backendUrl}/api/lms/bundles`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.items ?? data ?? [];
  } catch {
    return [];
  }
}

async function getCourses() {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8000';
  try {
    const res = await fetch(`${backendUrl}/api/lms/courses`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return { items: [], total: 0 };
    return res.json();
  } catch {
    return { items: [], total: 0 };
  }
}

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { discipline } = await searchParams;
  const [bundles, { items: courses, total }] = await Promise.all([getBundles(), getCourses()]);

  return (
    <main className="relative min-h-screen" style={{ background: '#060a14' }}>
      {/* Mesh background */}
      <div className="mesh-bg" aria-hidden="true">
        <div className="mesh-blob mesh-blob-1" />
        <div className="mesh-blob mesh-blob-2" />
      </div>

      <div className="relative z-10 mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1
            className="font-display text-2xl font-bold"
            style={{ color: 'rgba(255,255,255,0.92)' }}
          >
            Restoration Training Courses
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {total} course{total !== 1 ? 's' : ''} across 7 IICRC disciplines
          </p>
        </div>

        {/* Industry Bundles */}
        {bundles.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-4 text-lg font-semibold" style={{ color: 'rgba(255,255,255,0.85)' }}>
              Industry Bundles
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {bundles.map((b: any) => (
                <BundlePricingCard key={b.id} bundle={b} />
              ))}
            </div>
          </section>
        )}

        <div
          className="rounded-xl p-5"
          style={{
            background: 'rgba(255,255,255,0.04)',
            backdropFilter: 'blur(24px) saturate(160%)',
            WebkitBackdropFilter: 'blur(24px) saturate(160%)',
            border: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          <CourseGrid courses={courses} initialTab={discipline ?? 'All'} />
        </div>
      </div>
    </main>
  );
}
