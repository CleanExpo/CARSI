# GP-567 D4 — Compliance-language sweep

Generated `2026-09-07T07:29:32Z`. Live surfaces read from `.audit-cache/`, access date **2026-09-07**.

## No new linter was written

The repo ships five relevant guards. This sweep records what they say and, more
importantly, what they structurally cannot see. Modifying a guard to change a verdict
is out of scope for an audit run and was not done.

| Guard | Exit | Verdict |
| --- | ---: | --- |
| `check:iicrc-compliance` | 0 | ✓ IICRC/CEC compliance guard passed. |
| `check:iicrc-terminology` | 0 | ✓ IICRC CEC terminology guard passed. |
| `check:cec` | 0 | ✓ CEC approvals registry valid — 38 entries (38 approved). |
| `check:standards-claims` | 0 | ✓ Standards-claim guard passed. |
| `check:designations` | 0 | ✓ CARSI designation registry valid — 9 designations. |
| `check:cec-surfaces` | — | **NOT RUN** — imports `typescript`, absent in a worktree with no `node_modules`. An environment limit, not a repo defect. |

## The blind spot that matters

Every repo guard passes. The live site nevertheless serves prohibited accreditation
language in page metadata, because a guard that scans repo source cannot read a live
response. This is structural, not a missing rule.

**Live `/courses` `<meta name="description">`:**

> What courses does CARSI offer? 80 restoration and cleaning courses across water damage restoration, carpet repair, structural drying, mould remediation, fire &amp; smoke restoration, odour control and carpet cleaning. Study online with CARSI, an IICRC CEC Accredited provider.

**Live `/courses` `<meta property="og:description">`:**

> IICRC CEC Accredited courses for cleaning and restoration professionals in Australia. Earn continuing education credits and track your progress.

Both carry `IICRC CEC Accredited`, and the og description adds `Earn continuing
education credits` — the qualification/accreditation class named licence-critical by
GP-519, GP-525 and GP-526.

### Truth and permission are different axes

The approvals registry now holds **38 approved entries**, so the underlying accreditation
claim is not baseless — it is recorded as `JUSTIFIED` (medium) in the ledger, not as false.
The finding is that this language is **prohibited on a public surface**, whether or not it
is true. Filing a true-but-prohibited claim as a lie would itself be a false finding.

## Live URL slugs still carrying IICRC discipline acronyms

GP-526 fixed the render boundary and was closed Done. The URLs themselves were not in
that fix and remain public surfaces:

- `https://carsi.com.au/courses/cct-commercial-carpet-core`
- `https://carsi.com.au/courses/wrt-water-damage-essentials`
- `https://carsi.com.au/courses/fsrt-fire-smoke-restoration-core`
- `https://carsi.com.au/courses/asd-structural-drying-core`

**4 live course URLs.** Changing a URL needs redirects, so this is a founder-gated
live-copy decision — reported, not attempted.

## GP-525 status change

GP-525 was filed when `cec-approvals.json` held **zero** entries. It now holds **38** —
but `carpet-cleaning` and `carpet-cleaning-basics`, the two courses GP-525 names, are
**still not among them**. The finding survives in sharper form. Do not close GP-525 on
the grounds that the registry is no longer empty.

