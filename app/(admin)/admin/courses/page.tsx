import { buildAdminCatalogFromSeed } from '@/lib/lms-seed-catalog';

export default async function AdminCoursesCatalogPage() {
  const catalog = buildAdminCatalogFromSeed();
  const sorted = [...catalog.courses].sort((a, b) => a.title.localeCompare(b.title));

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white/95">Courses</h1>
        <p className="mt-1 text-sm text-white/45">
          {sorted.length} pilot courses · {catalog.excelPath}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {sorted.map((c) => (
          <div
            key={c.slug}
            className="rounded-xl border border-white/8 p-4"
            style={{ background: 'rgba(255,255,255,0.03)' }}
          >
            <div className="text-sm font-semibold text-white/90">{c.title}</div>
            <div className="mt-1 font-mono text-xs text-white/40">{c.slug}</div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/50">
              <span>{c.moduleCount} modules</span>
              <span>·</span>
              <span>{c.isFree ? 'Free' : `AUD ${c.priceAud}`}</span>
              {c.categories.length > 0 ? (
                <>
                  <span>·</span>
                  <span>{c.categories.join(', ')}</span>
                </>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
