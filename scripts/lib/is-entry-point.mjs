/**
 * True when the module at `moduleUrl` (pass `import.meta.url`) is the script Node was asked to
 * run. Use it to guard a CLI body so importing the module for a self-test does not run it.
 *
 * Both sides are compared as real paths. Node resolves symlinks for the main module, so
 * import.meta.url holds the real path while process.argv[1] keeps the path the caller typed;
 * the old idiom (import.meta.url compared with pathToFileURL(process.argv[1]).href) was false whenever a guard
 * ran through a symlink (/tmp -> /private/tmp on macOS, a symlinked checkout), the CLI body was
 * skipped, and the guard exited 0 having reported nothing. fileURLToPath also decodes
 * percent-encoding, so a checkout path with a space still matches.
 */
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export function isEntryPoint(moduleUrl, argv1 = process.argv[1]) {
  if (!argv1) return false;
  try {
    return realpathSync(fileURLToPath(moduleUrl)) === realpathSync(argv1);
  } catch {
    return false;
  }
}
