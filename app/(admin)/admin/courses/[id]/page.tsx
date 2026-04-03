import { CourseEditorForm } from '@/components/admin/courses/CourseEditorForm';

type Props = { params: Promise<{ id: string }> };

export default async function AdminCoursePage({ params }: Props) {
  const { id } = await params;
  return <CourseEditorForm courseId={id} />;
}

