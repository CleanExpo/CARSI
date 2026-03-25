import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter } from '@/components/ui/card';

interface LearningPathwayCardProps {
  pathway: {
    id: string;
    slug: string;
    title: string;
    description?: string | null;
    iicrc_discipline?: string | null;
    target_certification?: string | null;
    estimated_hours?: number | string | null;
  };
  courseCount?: number;
}

const DISCIPLINE_COLOURS: Record<string, string> = {
  WRT: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  CRT: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  OCT: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  ASD: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  CCT: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
};

export function LearningPathwayCard({ pathway, courseCount }: LearningPathwayCardProps) {
  const disciplineClass = pathway.iicrc_discipline
    ? (DISCIPLINE_COLOURS[pathway.iicrc_discipline] ?? '')
    : '';
  const hours =
    pathway.estimated_hours !== null && pathway.estimated_hours !== undefined
      ? parseFloat(String(pathway.estimated_hours))
      : null;

  return (
    <Card variant="interactive" className="flex flex-col">
      <Link href={`/pathways/${pathway.slug}`} className="flex flex-1 flex-col">
        {/* Discipline stripe */}
        {pathway.iicrc_discipline && (
          <div
            className={`h-1 w-full rounded-t-sm ${disciplineClass.includes('cyan') ? 'bg-cyan-500' : disciplineClass.includes('emerald') ? 'bg-emerald-500' : disciplineClass.includes('amber') ? 'bg-amber-500' : disciplineClass.includes('violet') ? 'bg-violet-500' : 'bg-pink-500'}`}
          />
        )}

        <CardContent className="flex-1 p-5">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {pathway.iicrc_discipline && (
              <span
                className={`inline-flex items-center rounded-sm border px-2 py-0.5 font-mono text-xs font-semibold ${disciplineClass}`}
              >
                IICRC {pathway.iicrc_discipline}
              </span>
            )}
            {typeof courseCount === 'number' && (
              <Badge variant="outline" className="text-xs">
                {courseCount} course{courseCount !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>

          <h3 className="mb-2 text-lg leading-tight font-semibold">{pathway.title}</h3>

          {pathway.description && (
            <p className="text-muted-foreground line-clamp-2 text-sm">{pathway.description}</p>
          )}
        </CardContent>

        <CardFooter className="flex items-center justify-between p-5 pt-0">
          {pathway.target_certification ? (
            <span className="text-muted-foreground text-xs">→ {pathway.target_certification}</span>
          ) : (
            <span />
          )}
          {hours !== null && (
            <span className="text-muted-foreground text-xs">{hours}h estimated</span>
          )}
        </CardFooter>
      </Link>
    </Card>
  );
}
