import { OnboardingSupervisorClient } from '@/components/onboarding/OnboardingSupervisorClient';

export default async function OnboardingSupervisorPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <OnboardingSupervisorClient slug={slug} />;
}
