export type BuildIdentity = {
  commit: string | null;
  source: 'CARSI_BUILD_SHA' | 'VERCEL_GIT_COMMIT_SHA' | null;
};

/** Only report a full deployment-supplied Git SHA. Unknown stays unknown. */
export function getBuildIdentity(env: NodeJS.ProcessEnv = process.env): BuildIdentity {
  for (const source of ['CARSI_BUILD_SHA', 'VERCEL_GIT_COMMIT_SHA'] as const) {
    const commit = env[source]?.trim();
    if (commit && /^[a-f0-9]{40}$/i.test(commit)) {
      return { commit: commit.toLowerCase(), source };
    }
  }
  return { commit: null, source: null };
}
