import { redirect } from 'next/navigation';

import { carsiCoachingPortalPath } from '@/lib/marketing/carsi-coaching-program';

export default function LegacyBusinessCoachingPortalRedirect() {
  redirect(carsiCoachingPortalPath);
}
