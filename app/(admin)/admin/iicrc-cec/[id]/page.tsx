import { AdminIicrcCecSubmissionDetailClient } from '@/components/admin/AdminIicrcCecSubmissionDetailClient';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ id: string }> };

export default async function AdminIicrcCecSubmissionDetailPage({ params }: Props) {
  const { id } = await params;
  return <AdminIicrcCecSubmissionDetailClient submissionId={id} />;
}
