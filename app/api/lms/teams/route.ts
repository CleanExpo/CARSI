import { type NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/lms/teams — create a Teams-tier team.
 *
 * WS0 (GP-440): gated fail-closed. This annual bundle-tier path had no purchase
 * step wired — teams provisioned here never charged a card — so it stays closed
 * until WS1-E2 wires purchase → seats. Existing teams' member/invite/GET
 * operations (elsewhere in this route family) are unaffected; only this unpaid
 * CREATE path is gated.
 */
export async function POST(_request: NextRequest) {
  return NextResponse.json(
    {
      detail:
        'Teams purchasing is coming soon. Team creation is not available yet — contact us if you need Teams access.',
    },
    { status: 403 }
  );
}
