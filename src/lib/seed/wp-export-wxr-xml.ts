import { existsSync, readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { join } from 'node:path';

const DEFAULT_WXR_BASENAME = 'carsi.WordPress.2026-04-05';

/**
 * LearnDash lesson export (WordPress WXR). Prefer the gzip in repo (~1MB); full XML is optional locally.
 * Override with WXR_PATH (absolute path to `.xml` or `.xml.gz`).
 */
export function resolveWxrXmlPath(appRoot: string): string | null {
  const env = process.env.WXR_PATH?.trim();
  if (env) return env;

  const dir = join(appRoot, 'data', 'wordpress-export');
  const xml = join(dir, `${DEFAULT_WXR_BASENAME}.xml`);
  const gz = join(dir, `${DEFAULT_WXR_BASENAME}.xml.gz`);
  if (existsSync(xml)) return xml;
  if (existsSync(gz)) return gz;
  return null;
}

function readXmlFromPath(resolvedPath: string): string {
  const buf = readFileSync(resolvedPath);
  if (resolvedPath.endsWith('.gz')) {
    return gunzipSync(buf).toString('utf8');
  }
  return buf.toString('utf8');
}

export function readWxrXmlOrThrow(appRoot: string): { xml: string; path: string } {
  const p = resolveWxrXmlPath(appRoot);
  if (!p || !existsSync(p)) {
    const dir = join(appRoot, 'data', 'wordpress-export');
    throw new Error(
      `Missing LearnDash WXR export.\n\n` +
        `Tried:\n` +
        `  ${join(dir, `${DEFAULT_WXR_BASENAME}.xml`)}\n` +
        `  ${join(dir, `${DEFAULT_WXR_BASENAME}.xml.gz`)}\n` +
        `Or set WXR_PATH to your export (.xml or .xml.gz).\n\n` +
        `Pull latest main for the tracked .xml.gz, or upload the WordPress Tools → Export file to the server.`
    );
  }
  return { xml: readXmlFromPath(p), path: p };
}
