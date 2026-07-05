import { PracticalAssessmentReviewClient } from '@/components/admin/PracticalAssessmentReviewClient';

export const dynamic = 'force-dynamic';

/** Instructor review queue for practical (rubric-graded) assessments (GP-457). */
export default function AdminPracticalAssessmentsPage() {
  return <PracticalAssessmentReviewClient />;
}
