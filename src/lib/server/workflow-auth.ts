import { NextResponse, type NextRequest } from 'next/server';

import {
  getBearerAuthorizationFromRequest,
  getSessionClaimsFromRequest,
} from '@/lib/server/auth-from-request';

/**
 * Workflows are an internal builder tool (the public page routes were removed in
 * #142). Restrict the proxy to staff roles so an unauthenticated visitor can't
 * read, create, or execute workflows on the upstream backend (issue #12).
 */
const WORKFLOW_ROLES = new Set(['admin', 'instructor']);

export type WorkflowAuth =
  | { ok: true; authorization: string | null }
  | { ok: false; response: NextResponse };

/**
 * Guard for every `/api/workflows/*` proxy handler. Requires an active session
 * in an admin/instructor role; on success returns the caller's bearer token so
 * the upstream backend can enforce its own access control too (defence in depth).
 */
export async function authorizeWorkflowRequest(request: NextRequest): Promise<WorkflowAuth> {
  const claims = await getSessionClaimsFromRequest(request);
  if (!claims) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  if (!WORKFLOW_ROLES.has(claims.role)) {
    return { ok: false, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { ok: true, authorization: getBearerAuthorizationFromRequest(request) };
}

/** Merge the forwarded `Authorization` header into the upstream fetch headers. */
export function withForwardedAuth(
  authorization: string | null,
  headers: Record<string, string> = {}
): Record<string, string> {
  return authorization ? { ...headers, Authorization: authorization } : headers;
}
