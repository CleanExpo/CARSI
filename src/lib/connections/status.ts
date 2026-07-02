export type CarsiConnectionId =
  | "database"
  | "auth"
  | "stripe"
  | "email"
  | "ai_chat"
  | "turnstile"
  | "cloudinary"
  | "rate_limit_redis"
  | "unite_group";

export type CarsiConnectionState = "connected" | "ready" | "mock" | "blocked" | "unknown";

export type CarsiConnection = {
  id: CarsiConnectionId;
  label: string;
  state: CarsiConnectionState;
  safeForMissionControl: boolean;
  detail: string;
  endpoint?: string;
  nextAction?: string;
};

export type CarsiConnectionStatus = {
  source: "carsi:connection-status";
  generatedAt: string;
  project: {
    slug: "carsi";
    repo: "CleanExpo/CARSI";
    service: "carsi-web";
    environment: string;
  };
  summary: Record<CarsiConnectionState, number> & { total: number };
  connections: CarsiConnection[];
};

function envSet(name: string, env: NodeJS.ProcessEnv): boolean {
  return Boolean(env[name]?.trim());
}

function connectionSummary(connections: CarsiConnection[]): CarsiConnectionStatus["summary"] {
  return {
    total: connections.length,
    connected: connections.filter((c) => c.state === "connected").length,
    ready: connections.filter((c) => c.state === "ready").length,
    mock: connections.filter((c) => c.state === "mock").length,
    blocked: connections.filter((c) => c.state === "blocked").length,
    unknown: connections.filter((c) => c.state === "unknown").length,
  };
}

/**
 * Presence-only readiness manifest for Unite-Group Mission Control polling.
 * States are derived from env-var presence, never from secret values, and no
 * secret material is ever included in the payload. "connected" is reserved
 * for infrastructure the app cannot boot without; integrations whose live
 * use is still gated report "ready" at best; integrations that degrade
 * gracefully when unset (Turnstile, Cloudinary, distributed rate limiting)
 * report "unknown" rather than "blocked" since their absence is by design.
 */
export function buildCarsiConnectionStatus(
  env: NodeJS.ProcessEnv = process.env,
  now = new Date().toISOString(),
): CarsiConnectionStatus {
  const environment = env.VERCEL_ENV?.trim() || env.NODE_ENV?.trim() || "development";

  const databaseReady = envSet("DATABASE_URL", env);
  const authReady = envSet("JWT_SECRET", env);
  const stripeReady = envSet("STRIPE_SECRET_KEY", env);
  const stripeWebhookReady = envSet("STRIPE_WEBHOOK_SECRET", env);
  const emailReady = envSet("MAILTRAP_API_KEY", env);
  const aiChatReady = envSet("OPENAI_API_KEY", env);
  const turnstileReady = envSet("TURNSTILE_SECRET_KEY", env) && envSet("NEXT_PUBLIC_TURNSTILE_SITE_KEY", env);
  const cloudinaryReady =
    envSet("CLOUDINARY_CLOUD_NAME", env) &&
    envSet("CLOUDINARY_API_KEY", env) &&
    envSet("CLOUDINARY_API_SECRET", env);
  const redisReady = envSet("UPSTASH_REDIS_REST_URL", env) && envSet("UPSTASH_REDIS_REST_TOKEN", env);

  const connections: CarsiConnection[] = [
    {
      id: "database",
      label: "Primary database (Prisma / PostgreSQL)",
      state: databaseReady ? "connected" : "blocked",
      safeForMissionControl: true,
      detail: databaseReady
        ? "DATABASE_URL is configured; metadata only exposed."
        : "DATABASE_URL is not set — Prisma cannot connect.",
      nextAction: databaseReady ? undefined : "Set DATABASE_URL in the deploy environment.",
    },
    {
      id: "auth",
      label: "Authentication (JWT sessions)",
      state: authReady ? "connected" : "blocked",
      safeForMissionControl: true,
      detail: authReady
        ? "JWT_SECRET is present; student session signing/verification is live."
        : "JWT_SECRET is not set — production sign-in throws; dev falls back to an insecure value.",
      nextAction: authReady ? undefined : "Set JWT_SECRET (min 32 chars).",
    },
    {
      id: "stripe",
      label: "Payments (Stripe)",
      state: stripeReady ? "ready" : "blocked",
      safeForMissionControl: true,
      detail: stripeReady
        ? stripeWebhookReady
          ? "Stripe secret and webhook secret present; checkout remains policy-gated."
          : "Stripe secret present but STRIPE_WEBHOOK_SECRET is missing — webhooks will fail."
        : "STRIPE_SECRET_KEY is not set — course checkout is unavailable.",
      nextAction: stripeReady
        ? stripeWebhookReady
          ? undefined
          : "Set STRIPE_WEBHOOK_SECRET."
        : "Set the Stripe key pair.",
    },
    {
      id: "email",
      label: "Transactional email (Mailtrap)",
      state: emailReady ? "ready" : "blocked",
      safeForMissionControl: true,
      detail: emailReady
        ? "Mailtrap API key present; registration/reset/enrolment sends remain policy-gated."
        : "MAILTRAP_API_KEY is not set — no transactional email (registration, reset, enrolment, contact).",
      nextAction: emailReady ? undefined : "Set MAILTRAP_API_KEY and EMAIL_FROM.",
    },
    {
      id: "ai_chat",
      label: "AI assistant (OpenAI)",
      state: aiChatReady ? "ready" : "blocked",
      safeForMissionControl: true,
      detail: aiChatReady
        ? "OpenAI key present; the public/dashboard chat assistant can run (billing applies on use)."
        : "OPENAI_API_KEY is not set — /api/lms/public/chat degrades.",
      nextAction: aiChatReady ? undefined : "Set OPENAI_API_KEY.",
    },
    {
      id: "turnstile",
      label: "Bot protection (Cloudflare Turnstile)",
      state: turnstileReady ? "ready" : "unknown",
      safeForMissionControl: true,
      detail: turnstileReady
        ? "Turnstile site + secret keys present; /contact and /submit are verified."
        : "Turnstile keys are unset — verification is skipped by design; forms still work.",
      nextAction: turnstileReady
        ? undefined
        : "Set NEXT_PUBLIC_TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY to enable bot protection.",
    },
    {
      id: "cloudinary",
      label: "Media hosting (Cloudinary)",
      state: cloudinaryReady ? "ready" : "unknown",
      safeForMissionControl: true,
      detail: cloudinaryReady
        ? "Cloudinary credentials present; admin uploads and generated media are hosted there."
        : "Cloudinary is unset — admin uploads fall back to local disk storage.",
      nextAction: cloudinaryReady ? undefined : "Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.",
    },
    {
      id: "rate_limit_redis",
      label: "Distributed rate limiting (Upstash Redis)",
      state: redisReady ? "ready" : "unknown",
      safeForMissionControl: true,
      detail: redisReady
        ? "Upstash REST credentials present; AI/abuse rate limits are cross-instance."
        : "Upstash is unset — rate limiting falls back to the in-process limiter automatically.",
      nextAction: redisReady ? undefined : "Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.",
    },
    {
      id: "unite_group",
      label: "Unite-Group Mission Control",
      state: "ready",
      safeForMissionControl: true,
      detail:
        "This manifest is designed for Unite-Group to poll and show CARSI readiness without secrets.",
      endpoint: "/api/v1/connections/status",
      nextAction: "Add this endpoint to the Unite-Group project registry.",
    },
  ];

  return {
    source: "carsi:connection-status",
    generatedAt: now,
    project: {
      slug: "carsi",
      repo: "CleanExpo/CARSI",
      service: "carsi-web",
      environment,
    },
    summary: connectionSummary(connections),
    connections,
  };
}
