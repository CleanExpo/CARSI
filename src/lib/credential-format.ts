/** Public credential reference shown on certificates (enrollment UUID). */
export function formatCredentialRef(enrollmentId: string): string {
  const compact = enrollmentId.replace(/-/g, '').slice(0, 12).toUpperCase();
  return `CARSI-${compact}`;
}
