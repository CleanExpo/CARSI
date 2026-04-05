import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * WooCommerce → LMS-shaped export consumed by `db:seed-wp-export` / `db:seed-wp-lessons`.
 * Override path when the file is not under the default repo location (e.g. on App Platform).
 */
export function resolveWpExportCoursesJsonPath(appRoot: string): string {
  const env = process.env.WP_EXPORT_COURSES_PATH?.trim();
  if (env) return env;
  return join(appRoot, 'data', 'wordpress-export', 'courses.json');
}

export function readWpExportCoursesJsonOrThrow(appRoot: string): string {
  const p = resolveWpExportCoursesJsonPath(appRoot);
  if (!existsSync(p)) {
    throw new Error(
      `Missing WooCommerce export JSON: ${p}\n\n` +
        `Set WP_EXPORT_COURSES_PATH to the absolute path of courses.json on this server, or place the file at data/wordpress-export/courses.json under the app root.\n` +
        `After pulling the latest code, courses.json should be in the repo; if your deploy excludes it, use the env var or a build step that copies the export into place.`
    );
  }
  return readFileSync(p, 'utf8');
}
