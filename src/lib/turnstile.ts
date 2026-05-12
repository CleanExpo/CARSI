// src/lib/turnstile.ts — RA-3022.
//
// Server-side verification of Cloudflare Turnstile tokens.
// Required for any unauthenticated public POST endpoint that accepts
// PII or causes server-side work.
//
// Caller contract:
//   1. Frontend renders <Turnstile> widget; user solves; widget posts a
//      token via the form payload (`cf-turnstile-response` field).
//   2. This module's `verifyTurnstile()` POSTs the token + remoteIP to
//      Cloudflare's siteverify endpoint and returns true iff valid.
//   3. `TURNSTILE_SECRET_KEY` must be set. If missing → returns false +
//      logs a warning (fails closed — the route should already 503).
//
// Docs: https://developers.cloudflare.com/turnstile/get-started/server-side-validation/

const SITEVERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

interface TurnstileVerifyResponse {
  success: boolean;
  "error-codes"?: string[];
  challenge_ts?: string;
  hostname?: string;
  action?: string;
  cdata?: string;
}

export async function verifyTurnstile(
  token: string,
  remoteIp: string | null,
): Promise<{ success: boolean; reason?: string }> {
  if (!token) {
    return { success: false, reason: "missing_token" };
  }

  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret?.trim()) {
    console.warn(
      "[turnstile] TURNSTILE_SECRET_KEY not set — failing closed",
    );
    return { success: false, reason: "not_configured" };
  }

  const formData = new URLSearchParams();
  formData.append("secret", secret);
  formData.append("response", token);
  if (remoteIp) {
    formData.append("remoteip", remoteIp);
  }

  try {
    const res = await fetch(SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
      signal: AbortSignal.timeout(5_000),
    });

    if (!res.ok) {
      return { success: false, reason: `siteverify_http_${res.status}` };
    }

    const data = (await res.json()) as TurnstileVerifyResponse;
    if (data.success) return { success: true };
    return {
      success: false,
      reason: (data["error-codes"] ?? []).join(",") || "siteverify_rejected",
    };
  } catch (err) {
    console.warn("[turnstile] siteverify request failed:", err);
    return { success: false, reason: "siteverify_unreachable" };
  }
}
