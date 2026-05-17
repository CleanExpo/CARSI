/** Internal dev/agent routes — hidden on public deploy unless explicitly enabled. */
const INTERNAL_PREFIXES = ['/workflows', '/design-system', '/prd', '/agents'] as const;

export function isInternalToolPath(pathname: string): boolean {
  return INTERNAL_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function internalToolsEnabled(): boolean {
  return process.env.INTERNAL_TOOLS_ENABLED === 'true';
}
