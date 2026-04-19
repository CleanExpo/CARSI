import path from 'node:path';

/**
 * Whitelist of files served by the CCW take-home materials page.
 *
 * The download API only serves files whose `key` appears below. This closes
 * path-traversal and arbitrary-file-read attacks — an attacker cannot ask
 * for `../../etc/passwd` or `app/api/.../route.ts` because the lookup is
 * by key, not by arbitrary path.
 */

export interface CcwMaterial {
  key: string;
  filename: string; // actual file on disk under /content/ccw-take-home/
  displayName: string;
  description: string;
  contentType: string;
  /** Byte size — displayed to the user so they know what they're downloading. */
  sizeBytes: number;
}

export const CCW_MATERIALS: readonly CcwMaterial[] = [
  {
    key: 'participant-manual-pdf',
    filename: 'CARSI_Participant_Manual.pdf',
    displayName: 'CARSI Participant Manual (PDF)',
    description:
      '40-page take-home manual — all 10 modules, 15 embedded figures, CARSI Expert Nuggets, pH and fibre reference tables. Opens in any browser or PDF reader.',
    contentType: 'application/pdf',
    sizeBytes: 2_124_479,
  },
  {
    key: 'participant-manual-docx',
    filename: 'CARSI_Participant_Manual.docx',
    displayName: 'CARSI Participant Manual (Word)',
    description:
      'Editable Word-document version of the Participant Manual. Same content as the PDF — use this if you want to make notes inside the manual or export sections to your own job sheets.',
    contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    sizeBytes: 1_971_624,
  },
  {
    key: 'ccw-product-guide',
    filename: 'CARSI_CCW_Product_Guide.docx',
    displayName: 'CARSI × CCW Product Guide',
    description:
      'Field decision matrix for Carpet Cleaners Warehouse chemistry — WoolSafe-checked pH windows, SDS how-to, safe-default mapping by fibre and soil class.',
    contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    sizeBytes: 71_130,
  },
] as const;

export function findMaterial(key: string | null | undefined): CcwMaterial | null {
  if (!key) return null;
  return CCW_MATERIALS.find((m) => m.key === key) ?? null;
}

/**
 * Absolute path to the materials directory. process.cwd() in Next.js server
 * handlers is the project root at both dev-time and on Vercel.
 */
export function ccwMaterialsDir(): string {
  return path.join(process.cwd(), 'content', 'ccw-take-home');
}
