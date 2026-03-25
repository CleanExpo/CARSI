import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ProgressBar } from '@/components/lms/ProgressBar';

interface Enrollment {
  id: string;
  course_id: string;
  course_title: string;
  course_slug: string;
  status: string;
  enrolled_at: string;
  completion_percentage: number;
}

interface EnrolledCourseListProps {
  enrollments: Enrollment[];
}

export function EnrolledCourseList({ enrollments }: EnrolledCourseListProps) {
  if (enrollments.length === 0) {
    return (
      <p className="text-muted-foreground">No courses yet — browse the catalogue to get started.</p>
    );
  }

  return (
    <ul className="space-y-4">
      {enrollments.map((enr) => (
        <li key={enr.id}>
          <Link href={`/courses/${enr.course_slug}`}>
            <Card variant="interactive">
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <span className="font-medium">{enr.course_title}</span>
                  {enr.status === 'completed' && <Badge>Completed</Badge>}
                </div>
                {enr.status !== 'completed' && (
                  <div className="mt-3">
                    <ProgressBar percentage={enr.completion_percentage} />
                  </div>
                )}
              </CardContent>
            </Card>
          </Link>
        </li>
      ))}
    </ul>
  );
}
