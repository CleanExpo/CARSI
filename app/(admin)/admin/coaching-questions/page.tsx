import { notFound } from 'next/navigation';

import { AdminCoachingQuestionsClient } from '@/components/admin/AdminCoachingQuestionsClient';
import { isCarsiCoachingAssistantEnabled } from '@/lib/server/carsi-coaching-assistant-flag';

export const dynamic = 'force-dynamic';

/** GP-630 coach inbox. Does not exist (404) while CARSI_COACHING_ASSISTANT_ENABLED is off. */
export default function AdminCoachingQuestionsPage() {
  if (!isCarsiCoachingAssistantEnabled()) notFound();
  return <AdminCoachingQuestionsClient />;
}
