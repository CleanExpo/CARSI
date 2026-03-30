import { redirect } from 'next/navigation';

export default async function LegacyQuizRedirectPage({
  params,
}: {
  params: Promise<{ slug: string; quizId: string }>;
}) {
  const { slug } = await params;
  redirect(`/dashboard/learn/${encodeURIComponent(decodeURIComponent(slug))}`);
}
