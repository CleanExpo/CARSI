import { redirect } from 'next/navigation';

import { interactiveLearningPath } from '@/lib/lms/interactive-learning-catalog';

/** Legacy URL → course-agnostic interactive experience route. */
export default function WaterDamageInteractivePilotRedirect() {
  redirect(interactiveLearningPath('water-damage-module-3-pilot'));
}