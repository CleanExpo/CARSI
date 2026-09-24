import { OptimizeCourseReview } from '@/components/admin/courses/OptimizeCourseReview';

type Props = { params: Promise<{ id: string }> };

export default async function AdminOptimizeCoursePage({ params }: Props) {
  const { id } = await params;
  return <OptimizeCourseReview courseId={id} />;
}
