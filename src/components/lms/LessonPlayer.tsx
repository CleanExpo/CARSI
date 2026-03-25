import DOMPurify from 'isomorphic-dompurify';
import { Badge } from '@/components/ui/badge';
import { DriveFileViewer } from '@/components/lms/DriveFileViewer';

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

interface LessonPlayerProps {
  lesson: Lesson;
}

export function LessonPlayer({ lesson }: LessonPlayerProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <h1 className="flex-1 text-2xl font-bold">{lesson.title}</h1>
        <div className="flex shrink-0 gap-2">
          {lesson.is_preview && <Badge variant="outline">Preview</Badge>}
          {lesson.duration_minutes && (
            <span className="text-muted-foreground text-sm">{lesson.duration_minutes} min</span>
          )}
        </div>
      </div>

      <div className="rounded-lg">{renderContent(lesson)}</div>
    </div>
  );
}

function renderContent(lesson: Lesson) {
  switch (lesson.content_type) {
    case 'video':
      return (
        <video controls className="w-full rounded-lg" src={lesson.content_body ?? undefined}>
          Your browser does not support video playback.
        </video>
      );

    case 'pdf':
      return (
        <iframe
          src={lesson.content_body ?? undefined}
          className="h-[700px] w-full rounded-lg border"
          title="PDF viewer"
        />
      );

    case 'drive_file':
      if (!lesson.drive_file_id) return <p className="text-muted-foreground">No file attached.</p>;
      return <DriveFileViewer driveFileId={lesson.drive_file_id} />;

    case 'text':
    default: {
      const safe = DOMPurify.sanitize(lesson.content_body ?? '');
      return (
        <div
          className="prose prose-neutral dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: safe }}
        />
      );
    }
  }
}
