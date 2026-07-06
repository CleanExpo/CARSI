import { NextResponse } from 'next/server';

import {
  getProfessionalDirectoryStatus,
  getVerifiedProfessionals,
} from '@/lib/server/professional-directory';

export async function GET() {
  const status = await getProfessionalDirectoryStatus();
  const professionals = await getVerifiedProfessionals();

  return NextResponse.json({
    ...status,
    stubBlocked: professionals.every((p) => !p.id.startsWith('stub-')),
    checkedAt: new Date().toISOString(),
  });
}
