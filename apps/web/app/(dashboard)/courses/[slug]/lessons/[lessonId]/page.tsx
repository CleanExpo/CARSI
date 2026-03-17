'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { LessonPlayer } from '@/components/lms/LessonPlayer';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ClipboardList } from 'lucide-react';
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
  quiz_id: string | null;
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
      {lesson && (
        <>
          <LessonPlayer lesson={lesson} />
          {lesson.quiz_id && (
            <div
              className="mt-6 rounded-sm border p-4"
              style={{ borderColor: 'rgba(36,144,237,0.25)', background: 'rgba(36,144,237,0.06)' }}
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-white">Assessment</p>
                  <p className="mt-0.5 text-xs text-white/50">
                    Test your knowledge for this lesson
                  </p>
                </div>
                <Button
                  onClick={() => router.push(`/courses/${params.slug}/quiz/${lesson.quiz_id}`)}
                  className="shrink-0 gap-2 rounded-sm"
                  style={{ background: '#2490ed', color: '#fff' }}
                >
                  <ClipboardList className="h-4 w-4" />
                  Take Quiz
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
