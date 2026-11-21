/**
 * The one definition of "draft course copy" (first-wave spec s15, AC-W0-3, AC-W0-4, AC-W1-6).
 *
 * Courses written to the Course Standard wait in data/courses/<slug>/v1-draft/ for founder
 * sign-off before they move into data/seed. Until 21/11/2026 the AU-English, IICRC-terminology
 * and standards-claims guards scanned only data/seed and the site, so a draft could carry a
 * banned phrase or a US spelling until the go-live PR. Each guard calls this module rather
 * than copying the pattern.
 *
 * Course copy is the draft's .json and .md files. evidence/ is excluded: the ledger holds
 * source quotes word for word (a US source spells "mold"), not CARSI copy.
 */
const DRAFT_FOLDER = /^data\/courses\/[^/]+\/v1-draft\//;

function norm(path) {
  return String(path).replace(/\\/g, '/');
}

/** True when the path is course copy inside a v1-draft folder. */
export function isDraftCopy(path) {
  const p = norm(path);
  if (!DRAFT_FOLDER.test(p)) return false;
  if (p.includes('/evidence/')) return false;
  return /\.(json|md)$/.test(p);
}

/** The v1-draft folders that hold at least one tracked file, e.g. data/courses/mould/v1-draft. */
export function draftFolders(paths) {
  const out = new Set();
  for (const raw of paths) {
    const m = norm(raw).match(/^(data\/courses\/[^/]+\/v1-draft)\//);
    if (m) out.add(m[1]);
  }
  return [...out].sort();
}

/** Draft copy files among `paths`, plus every draft folder that has none (a scope hole). */
export function draftCopyFiles(paths) {
  const list = [...paths].map(norm);
  const files = list.filter(isDraftCopy).sort();
  const folders = draftFolders(list);
  const empty = folders.filter((f) => !files.some((file) => file.startsWith(f + '/')));
  return { files, folders, empty };
}
