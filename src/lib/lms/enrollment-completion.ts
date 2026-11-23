/**
 * Display-side completion check for an enrolment (GP-769).
 *
 * Since GP-432 an enrolment is completed only when the server decides so: every lesson done AND
 * the required assessments passed (or an admin force-complete). That decision is stored on
 * `enrollment.status`. Screens must follow it, not the lesson percentage: "all lessons done" is
 * not "complete", and must not show a Certificate button, "Completed" or "IICRC CEC course ready"
 * while the certificate and IICRC routes still refuse the enrolment.
 *
 * Pure and client-safe. It reads the stored status only and never decides or issues anything.
 */
export function isEnrollmentCompleted(status: string | null | undefined): boolean {
  const s = (status ?? '').toLowerCase().trim();
  return s === 'completed' || s === 'complete';
}
