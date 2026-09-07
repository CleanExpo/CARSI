# GP-567 D4 — Compliance-language sweep

Generated `2026-09-07T14:13:37Z`. Live surfaces read from `.audit-cache/`, access date **2026-09-07**.

## No new linter was written

The repo ships 7 relevant guards. This sweep records what they say and, more
importantly, what they structurally cannot see. Modifying a guard to change a verdict
is out of scope for an audit run and was not done.

| Guard | Exit | Verdict |
| --- | ---: | --- |
| `check:iicrc-compliance` | 0 | ✓ IICRC/CEC compliance guard passed. |
| `check:iicrc-terminology` | 0 | ✓ IICRC CEC terminology guard passed. |
| `check:cec` | 0 | ✓ CEC approvals registry valid — 38 entries (38 approved). |
| `check:cec-surfaces` | 0 | ✓ CEC surface-leak guard passed — no raw CEC reads/selects outside the accessor cluster. |
| `check:standards-claims` | 0 | ✓ Standards-claim guard passed. |
| `check:designations` | 0 | ✓ CARSI designation registry valid — 9 designations. |
| `check:au-english` | 0 | ✓ Australian-English course-content guard passed. |

**Coverage: 7 of 7 guards ran and passed.**

`check:cec-surfaces` initially reported NOT RUN — it imports `typescript`, absent in a
fresh git worktree with no `node_modules`. That was recorded as an environment limit
rather than a repo defect, and provisioning the worktree confirmed it: the guard now runs
and passes. Worth keeping as a worked example — a crashing tool is a claim about your
environment until you have proven otherwise.

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

### Two claims, not one — and only one of them is evidenced

The approvals registry holds **38 approved entries**, which evidences that CARSI holds
approved CEC **courses**. It does not evidence that CARSI is an accredited **provider**,
and that is the claim the live copy actually makes. No public IICRC register of approved
CEC providers exists to check it against — IICRC manages approval by submission to
`CECCourse@iicrcnet.org` and directs enquirers to contact IICRC, which is founder-gated.

So the ledger files the per-course claim as `JUSTIFIED` (unavailability evidenced, not
assumed) and the provider-level claim as a `GAP`, along with both live surfaces asserting
it. An earlier revision filed those surfaces as `VERIFIED` on the reasoning that the string
really is on the page; independent review called that a rationalisation, correctly — it let
the ledger preserve the licence-critical claim instead of blocking it.

Note also that only **38 of 80** live courses carry a registry approval, so
"Earn continuing education credits" is unsubstantiated for most of the catalogue.

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

