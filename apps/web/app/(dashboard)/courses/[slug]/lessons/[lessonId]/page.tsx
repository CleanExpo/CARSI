'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { LessonPlayer } from '@/components/lms/LessonPlayer';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { apiClient } from '@/lib/api/client';

interface Lesson {
  id: string;
  title: string;
  content_type: string | null;
  content_body: string | null;
  drive_file_id: string | null;
  duration_minutes: number | null;
  is_preview: boolean;
  order_index: number;
  course_id: string;
}

export default function LessonPage() {
  const params = useParams<{ slug: string; lessonId: string }>();
  const router = useRouter();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .get<Lesson>(`/api/lms/lessons/${params.lessonId}`)
      .then((data) => setLesson(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [params.lessonId]);

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push(`/courses/${params.slug}`)}
        className="gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to course
      </Button>

      {loading && <p className="text-muted-foreground">Loading lesson…</p>}
      {error && <p className="text-destructive">{error}</p>}
      {lesson && <LessonPlayer lesson={lesson} />}
    </div>
  );
}
