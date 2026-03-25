import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';

interface PathwayCourse {
  course_id: string;
  order_index: number;
  is_required: boolean;
  course_slug?: string | null;
  course_title?: string | null;
  iicrc_discipline?: string | null;
  cec_hours?: string | null;
}

interface PathwayDetail {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  iicrc_discipline?: string | null;
  target_certification?: string | null;
  estimated_hours?: string | null;
  courses: PathwayCourse[];
}

async function getPathway(slug: string): Promise<PathwayDetail | null> {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8000';
  try {
    const res = await fetch(`${backendUrl}/api/lms/pathways/${slug}`, {
      cache: 'no-store',
    });
    if (res.status === 404) return null;
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function PathwayDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const pathway = await getPathway(slug);

  if (!pathway) notFound();

  const totalCecs = pathway.courses.reduce((acc, c) => {
    const h = c.cec_hours ? parseFloat(c.cec_hours) : 0;
    return acc + h;
  }, 0);

  return (
    <main className="container mx-auto px-4 py-12">
      <Link
        href="/pathways"
        className="text-muted-foreground hover:text-foreground mb-6 inline-flex items-center text-sm"
      >
        ← All pathways
      </Link>

      <div className="mb-4 flex flex-wrap gap-2">
        {pathway.iicrc_discipline && (
          <Badge variant="default">IICRC {pathway.iicrc_discipline}</Badge>
        )}
        {pathway.target_certification && (
          <Badge variant="outline">→ {pathway.target_certification}</Badge>
        )}
      </div>

      <h1 className="mb-3 text-4xl font-bold">{pathway.title}</h1>

      {pathway.description && (
        <p className="text-muted-foreground mb-6 max-w-2xl text-base leading-relaxed">
          {pathway.description}
        </p>
      )}

      <div className="text-muted-foreground mb-8 flex gap-6 text-sm">
        {pathway.courses.length > 0 && (
          <span>
            {pathway.courses.length} course{pathway.courses.length !== 1 ? 's' : ''}
          </span>
        )}
        {pathway.estimated_hours && <span>{pathway.estimated_hours}h estimated</span>}
        {totalCecs > 0 && <span>{totalCecs.toFixed(1)} CECs total</span>}
      </div>

      {pathway.courses.length > 0 ? (
        <ol className="space-y-3">
          {pathway.courses.map((pc, i) => (
            <li key={pc.course_id} className="flex items-start gap-4">
              <span className="bg-muted text-muted-foreground flex h-7 w-7 shrink-0 items-center justify-center rounded-sm font-mono text-xs font-semibold">
                {i + 1}
              </span>
              <div className="flex-1">
                {pc.course_slug ? (
                  <Link
                    href={`/courses/${pc.course_slug}`}
                    className="hover:text-foreground font-medium underline-offset-4 hover:underline"
                  >
                    {pc.course_title ?? pc.course_slug}
                  </Link>
                ) : (
                  <span className="font-medium">{pc.course_title ?? pc.course_id}</span>
                )}
                <div className="mt-1 flex gap-2">
                  {pc.iicrc_discipline && (
                    <Badge variant="outline" className="text-xs">
                      {pc.iicrc_discipline}
                    </Badge>
                  )}
                  {pc.cec_hours && (
                    <span className="text-muted-foreground text-xs">{pc.cec_hours} CECs</span>
                  )}
                  {!pc.is_required && (
                    <span className="text-muted-foreground text-xs italic">optional</span>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-muted-foreground">No courses added to this pathway yet.</p>
      )}
    </main>
  );
}
