# Course pipeline — proposals (founder brain-dump 2026-11-01)

**Status: PROPOSALS for triage, not built.** This turns the founder's 2026-11-01 course ideas into a
Standard-v1-aligned roadmap. Nothing here is authored, seeded or published. Each becomes a real
course only through the gated pipeline (author → field tools/diagrams → quiz → assessment → audit
14/14 → set `meta.standard` last → SME + founder sign-off → media → seed → publish).

**Rules that bind every course below (non-negotiable):**
- Build to **Course Standard v1** (`docs/content/COURSE_STANDARD.md`): levels, role paths, the
  7-part lesson, the 14 floors.
- **Australian-produced** (AU English, 230 V / AS/NZS, metric, AUD) — the `carsi-course-production`
  skill.
- `cecHours: 0` on every new course; `iicrcDiscipline: null`; designation (if any) in
  `meta.designation`. A CEC claim only after per-course IICRC approval in `cec-approvals.json`
  (founder-gated).
- Cite standards/regulators **nominatively only**; no standard text in courses or AI tooling.
- **Positioning (licence-critical — see the caveat at the end): CARSI sits *beyond the standard*,
  not *against* the IICRC.** Public copy never says CARSI replaces or outranks IICRC/RIA/ISSA/IAQ.

> **Taxonomy note (founder decision needed).** Standard v1's 8 `rolePaths` are restoration-centric
> (`new-technician`, `water-and-drying`, `mould-and-indoor-air`, `biohazard-and-decontamination`,
> `fire-smoke-and-odour`, `carpet-and-floors`, `supervisor-and-estimator`, `adjacent-buyers`). The
> cleaner **verticals** below don't fit those. Expanding into general cleaning means **adding role
> paths** (e.g. `general-and-bond`, `facility`, `aged-care`, `government-and-security`,
> `data-centre`) — that is a Standard-v1 change: update `ROLE_PATHS` in both
> `docs/content/COURSE_STANDARD.md` §3.2 and `scripts/audit-course-depth.mjs` in one reviewed
> commit (the doc says change both together).

---

## A. Science foundations ("the way professional cleaners work")

The shared base every vertical draws on — the science that makes CARSI the deep-knowledge authority.

| Proposed course | Level | AU anchor (nominative) | Research note |
| --- | --- | --- | --- |
| The Science of Cleaning (soils, surfactants, pH, the cleaning circle — time/agitation/chemical/temperature, dwell) | L1-foundation | GHS/Safe Work Australia SDS; AS/NZS | Surfactant & soil-chemistry literature; peer-reviewed cleaning-science |
| Building Science & Moisture basics | L1-foundation | psychrometry; AS/NZS | *existing* `psychrometry-building-science-for-drying` can seed this |
| Microbiology & Infection Prevention basics | L1-foundation | Safe Work Australia; state health; AS 4187-adjacent | infection-control literature, aged-care/health guidance |
| Chemistry & Safe Chemical Use (dilution, GHS, 230 V equipment, PPE) | L1-foundation | GHS, Poisons Info 13 11 26, TGA for disinfectant claims | SDS/TDS; TGA disinfectant claim rules |
| Indoor Air Quality fundamentals | L1-foundation | nominative ANSI/IICRC S520 (mould context only) | *existing* IAQ courses can seed this |

## B. WHS visual-inspection & hazard courses (founder's 4 + additions)

Framed as **hazard identification / visual inspection for WHS** — what a professional sees, how they
assess risk, and when to stop and escalate. High-value, defensible, insurer/employer-relevant.

| Proposed course | Level | AU anchor (nominative) | Research / clarify |
| --- | --- | --- | --- |
| Suspected Clandestine Drug Lab & Smoking/Meth Residue — visual WHS inspection | L2-practitioner | Commonwealth *Clandestine Drug Laboratory Remediation Guidelines*; state health; Safe Work Australia | meth-residue exposure literature; AU remediation guidance |
| Visible vs Non-Visible Mould | L2-practitioner | nominative ANSI/IICRC S520; moisture/hygrometry; Safe Work Australia | non-viable vs viable spore science; moisture-mapping |
| VOCs & airborne contaminants (mould, chemicals, residues) — hazard-specific assessment & clearance | L2-practitioner | VOC/PID *screening* (nonspecific — a screening tool, not a clearance test); contaminant-specific sampling; SDS; Safe Work Australia; TGA for any disinfection claim | the "leave nothing behind" goal — but clearance to pre-loss / safe-to-occupy is established **per contaminant** (mould, named chemicals, residues), each with its own sampling, acceptance criteria, baseline and competent sign-off. A PID reading alone never clears a site; split the scope by hazard |
| Electromagnetic exposure ("Electronic Pulse") — awareness & referral for IEQ staff | L1-foundation | building-biology / EMF assessment context; a **defined** specialist qualification; a **separate** health-care referral | **Awareness + triage + referral ONLY — never diagnosis, treatment, or a claim that electromagnetic exposure causes illness.** IEQ staff recognise when an occupant raises it, know it is outside CARSI's remediation scope, and refer on two separate tracks: the **environment** to a defined, auditable specialist (e.g. a licensed electrician for an electrical fault, or a credentialed building-biology/EMF assessor for a field survey — name the qualification), and, **separately, any reported symptoms or request for health advice to a medical practitioner**. Health-effect evidence is contested — state concerns, not causation |
| Sharps & Squalor (hoarding) — biohazard visual inspection | L2-practitioner | Safe Work Australia; state health; needlestick/sharps protocols | squalor/hoarding remediation literature; aged-care & housing links |
| *add:* Asbestos-awareness visual recognition (recognise & not-disturb) | L1-foundation | Safe Work Australia asbestos code; state regulators | non-licensed awareness only; never licensed-removal training |
| *add:* Lead paint & other legacy-building hazards awareness | L1-foundation | Safe Work Australia; NEPM | pre-1970s housing stock |

## C. Cleaner verticals (founder's 6 + additions)

Each is a vertical induction/practitioner course — the standards, the site rules, the WHS, and the
documentation for that setting. These are where CARSI widens from restoration into the whole trade.

| Proposed course | Suggested role path (NEW) | AU anchor (nominative) | Research note |
| --- | --- | --- | --- |
| General & Bond Cleaning (end-of-lease) | `general-and-bond` | state tenancy/REIQ bond-clean expectations; ACL | demand-driven; what agents/landlords require |
| Facility Cleaning | `facility` | AS/NZS; INS cleaning spec; scheduled-cleaning method | commercial cleaning spec & audit literature |
| Aged Care Cleaning | `aged-care` | Aged Care Quality Standards; infection prevention; NDIS | infection-control + aged-care research |
| Government Cleaning | `government-and-security` | Commonwealth/state procurement & security basics | after-hours, access, standards compliance |
| Security & Sensitive-Data Cleaning | `government-and-security` | security-clearance awareness; chain of custody; clean-desk | data-handling-adjacent; **no actual data-destruction claims** |
| Data Centre Cleaning | `data-centre` | nominative ISO 14644 (cleanroom); ESD/anti-static; waterless methods | zinc-whisker, ESD, uptime/access protocols — strong niche |
| *add:* Childcare & School Cleaning | `facility` | state education cleaning; infection control | sensitive-environment overlap with the floor-care onboarding |
| *add:* Healthcare/Hospital Environmental Services | `aged-care` | AS 4187; health cleaning standards | *existing* healthcare SEO pages map here |

## D. The research engine (what makes the above win)

The founder's steer: **deep knowledge and research is the edge** — university papers, Google Scholar,
Google DeepMind, OpenAI Science, white papers, and *discovering what clients are actually asking
for*. CARSI already has the machinery for this — **reuse it, don't rebuild**:

- The **Evidence Engine** (BACKLOG #21–28): ingest → grade (A1–C3) → map → teach → publish, giving
  each lesson a cited evidence layer. Every course above should ship with it.
- The **`course-truth`** skill (resolve each claim to VERIFIED / JUSTIFIED / GAP with a receipt) and
  the **`deep-research`** skill (multi-source synthesis) are the authoring front end.
- The **standards-claim gate** (`verify:standards-claim`) and `check:sources` keep claims honest.
- **Demand discovery** ("what clients are asking for") is a research input, not yet a tracked
  process — candidate for a lightweight weekly research note (BACKLOG #23) feeding this roadmap.

> **Licence-critical positioning caveat (MUST read).** The ambition to lead the category —
> "take over from ISSA, IICRC, RIA, IAQ" — is **internal ambition only**. CARSI's authority is
> *depth on top of* a technician's existing standing, not rivalry. Per `GOAL.md` ("IICRC is the
> referee, not a rival") and the `BACKLOG.md` positioning constraint, **public, marketing, course
> and SEO copy must never say or imply CARSI replaces or outranks IICRC/RIA/ISSA/IAQ certification.**
> The phrase that ships is **"beyond the standard: the science of restoration"**. Breaching this is
> a licence risk, not a style choice.
