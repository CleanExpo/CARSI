#!/usr/bin/env node
/**
 * Switch industry pages from HTTP fetch to IndustryRecommendedCourses (Postgres).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const industriesDir = path.join(root, 'app/(public)/industries');

const DISCIPLINE_RE = /discipline=([A-Z]+)/g;

function patchFile(filePath) {
  let src = fs.readFileSync(filePath, 'utf8');
  if (src.includes('IndustryRecommendedCourses')) {
    return false;
  }

  const disciplines = [...src.matchAll(DISCIPLINE_RE)].map((m) => m[1]);
  const unique = [...new Set(disciplines)];
  if (unique.length === 0) return false;

  src = src.replace(
    /import \{ getBackendOrigin \} from '@\/lib\/env\/public-url';\n/,
    ''
  );

  if (!src.includes('IndustryRecommendedCourses')) {
    src = src.replace(
      /(import \{[^}]+\} from '@\/components\/industries';)/,
      `$1\nimport { IndustryRecommendedCourses } from '@/components/industries/IndustryRecommendedCourses';`
    );
  }

  src = src.replace(
    /\/\/ -+\n\/\/ Data Fetching\n\/\/ -+\n\nasync function getIndustryCourses\(\)[\s\S]*?}\n\n/,
    ''
  );

  const disciplineListMatch = src.match(/disciplineList="([^"]+)"/);
  const industryNameMatch = src.match(/industryName="([^"]+)"/);
  const disciplineList = disciplineListMatch?.[1] ?? unique.join(', ');
  const industryName = industryNameMatch?.[1] ?? 'Industry';

  src = src.replace(
    /const courses = await getIndustryCourses\(\);\n\n  return \(/,
    'return ('
  );

  src = src.replace(
    /<IndustryCourseSection[\s\S]*?courses=\{courses\}[\s\S]*?\/>/,
    `<IndustryRecommendedCourses
        industryName="${industryName}"
        disciplineList="${disciplineList}"
        disciplines={[${unique.map((d) => `'${d}'`).join(', ')}]}
      />`
  );

  fs.writeFileSync(filePath, src);
  return true;
}

let count = 0;
for (const ent of fs.readdirSync(industriesDir, { withFileTypes: true })) {
  if (!ent.isDirectory() || ent.name === 'page.tsx') continue;
  const page = path.join(industriesDir, ent.name, 'page.tsx');
  if (fs.existsSync(page) && patchFile(page)) {
    count += 1;
    console.log('patched', ent.name);
  }
}
console.log(`Patched ${count} industry pages`);
