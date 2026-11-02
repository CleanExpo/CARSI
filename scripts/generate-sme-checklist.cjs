// SME claim checklist from a course evidence ledger (DECISIONS #24).
// Usage: node scripts/generate-sme-checklist.cjs <v1-draft-dir/> "<course title>" <standard, e.g. S500> <out.md>
const fs = require('fs');
const [, , base, title, std, out] = process.argv;
const r = fs.readFileSync(base + 'evidence/evidence-ledger.jsonl', 'utf8').trim().split('\n').map(JSON.parse);
const c = JSON.parse(fs.readFileSync(base + 'courses-catalog.json', 'utf8')).courses[0];
const les = {};
for (const m of c.modules) for (const l of m.lessons) les[l.id] = m.title.replace(/^Module (\d+):.*/, 'M$1') + ' · ' + l.title;
const order = Object.keys(les);
const g = r.filter((x) => x.status === 'GAP').sort((a, b) => order.indexOf(a.lesson_id) - order.indexOf(b.lesson_id));
const isStd = (x) => x.claim_class === 'standards-citation' || /licensed (text|copy)/i.test(x.reason || '');
const s = g.filter(isStd);
const n = (st) => r.filter((x) => x.status === st).length;
let o = `# SME claim checklist — ${title}

**For:** Phill (SME, DECISIONS #24) · **Generated:** 02/11/2026 from \`${base}evidence/evidence-ledger.jsonl\` · **Ledger:** ${r.length} claims: ${n('VERIFIED')} VERIFIED, ${n('JUSTIFIED')} JUSTIFIED, **${g.length} GAP (listed below)**.

Only the GAP claims need you. VERIFIED and JUSTIFIED claims already carry a source. Tick one box per claim:

- **OK**: the claim is correct as worded.
- **Fix**: write the correct wording beside it. Agents change only the wording you give, then re-run the guards.
- **Cut**: remove the claim from the course.

**Claims marked ${std}:** check each one against your licensed ${std} copy, then tick OK, Fix or Cut. For a Fix, write the corrected wording in your own words rather than quoting it.

**Summary:** ${s.length} standards claims (check against ${std}), ${g.length - s.length} method or practice claims (check from field experience).
`;
let cur = '';
for (const x of g) {
  const L = les[x.lesson_id] || x.lesson_id || 'Course-wide';
  if (L !== cur) { o += `\n## ${L}\n\n`; cur = L; }
  o += `- [ ] OK  [ ] Fix  [ ] Cut — **${x.id}**${isStd(x) ? ` · **${std}**` : ''} — ${x.claim}\n    - _Why it is open:_ ${x.reason}\n`;
}
o += `\n## When you are done\n\nReply with each ID and your OK, Fix or Cut, or send back this file ticked. Agents then apply the edits, re-run the 14-floor audit and the guards, and mark the course signed off. Next, a promotion PR moves the course into \`data/seed/\`, and Rana receives the go-live message (\`docs/runbooks/course-go-live.md\`).\n`;
fs.writeFileSync(out, o);
console.log(g.length, s.length);
