# Research Pack — Professional Floor Care Onboarding & Operational Readiness

> Stage 1 research artifact. Verified, source-cited ground truth for the onboarding program and the
> LMS course. en-AU throughout. Claims carry a confidence rating; anything that could not clear the
> publish threshold is in **Unverified / excluded** and must not be taught as fact.
>
> This pack **reuses** the verified floor-care research from
> `data/courses/commercial-floor-care-schools-childcare/research.md` (WHS/SDS, slip resistance,
> NQS QA2, WWC checks, stormwater/trade-waste, S100, strip-&-seal, CCW/Actichem products) and **adds**
> research for the onboarding-specific pillars (operational readiness, PPE/handling, conduct,
> confidentiality/CCTV, disruption prevention).

## Program identity

- **Slug:** `floor-care-onboarding-operational-readiness`
- **Title:** Professional Floor Care Onboarding & Operational Readiness
- **Audience:** Internal facilities-management staff — new floor-care technicians, supervisors and
  facilities staff. **Not** a customer-facing contract-winning course (that is the separate
  `commercial-floor-care-schools-childcare` course).
- **Domain:** Floor surface cleaning, polishing, sealing, maintenance and hygiene across schools,
  childcare, education, public buildings, commercial and high-traffic facilities.
- **Accreditation stance:** This is internal training and professional development. **No** IICRC / CEC
  accreditation is claimed; **no** insurer, NRPG or compliance-authority status; **no** medical claims.

---

## A. Reused verified claims (from the commercial-floor-care research pack)

These are carried over and remain the authority for the safety/standards content. See the source pack
for full citations.

- **WHS / hazardous chemicals (model WHS):** a PCBU must obtain and keep **current SDS** (not more than
  5 years old), keep a **hazardous chemicals register**, and correctly **label** all containers
  including decanted ones. ⚠️ **Victoria operates under its own OHS Act/Regulations**, not the model
  WHS framework. *(High)*
- **Slip resistance:** **AS 4586** classifies new surfaces; **AS 4663** measures existing/in-service
  surfaces and is the correct basis to re-verify slip resistance after stripping/sealing. ⚠️ These
  standards **classify/measure only — they do not set cure or re-entry times.** *(High/Medium)*
- **Childcare hygiene:** **NQS Quality Area 2** (children's health & safety) under the NQF/ACECQA —
  minimise risk and protect from harm/injury/infection. *(High)*
- **Working With Children checks:** legislated per state/territory (NSW WWCC, VIC WWC, QLD Blue Card,
  ACT WWVP); generally **not** auto-transferable between jurisdictions. *(High)*
- **Carpet (IICRC S100):** recognised care standard; **hot water extraction vs encapsulation** is a
  dry-time vs soil-removal trade-off in occupied rooms. ⚠️ S100 is an industry standard, not law; **do
  not state fixed dry times.** *(High/Medium)*
- **Vinyl strip & seal:** strip → rinse/neutralise → dry → thin sealer/finish coats; strippers are
  typically alkaline/caustic (ventilation + PPE); ⚠️ **dilution, coat counts, cure & re-entry come from
  the SDS/TDS.** *(Medium)*
- **Pressure-washing run-off:** "the drain is just for rain" — confine, collect and direct wash water to
  **sewer** under a trade-waste agreement; do not let it enter stormwater. *(High)*
- **CCW/Actichem product grounding:** real AU catalogue with current SDS for strippers (Instastrip
  AP400, Power Strip AP404), prep/seal/finish (Pre-Seal AP171, Instaseal AP420, Instagloss AP422),
  carpet prespray/extraction and spotters, and encapsulation equipment. Cite the SDS for any chemical
  claim; where no current SDS exists, instruct staff to "obtain the current SDS from the supplier."
  *(Source: `data/seed/ccw-products.json`.)*

---

## B. New verified claims — onboarding pillars

### 1. PPE & safe chemical handling/storage (model WHS)
- **1.1 (High)** PPE sits at the **bottom of the hierarchy of controls** — a last-resort measure used
  only after elimination, substitution, isolation and engineering controls are considered. PPE
  supplements higher controls; it does not replace them. *SWA — Managing risks of hazardous chemicals
  (CoP); Managing risks.*
- **1.2 (High)** PPE selection is **driven by the product SDS**, which specifies gloves, eye and
  respiratory protection for that chemical. Obtain the SDS before first use and build the safe work
  procedure from it. *SWA — Managing risks of hazardous chemicals; SafeWork SA — SDS.*
- **1.3 (High)** **Segregate incompatible chemicals** (acids vs alkalis, oxidisers) per SDS storage
  advice — on the vehicle and on site. *SWA — Managing risks of hazardous chemicals.*
- **1.4 (High)** **Decanted/transferred containers must be labelled** (GHS / model WHS Regs); label on
  the body of the container, clearly visible. *SWA — Responsibilities for labelling; model CoP —
  Labelling.*
- **1.5 (High)** **"Immediate use" exemption:** labelling is not required only where the chemical is used
  immediately after decanting and the container is then thoroughly cleaned. If a decant is left for
  later or for another worker, it **must** be labelled. *SWA — Hazardous chemicals exempt from
  labelling; model CoP — Labelling.*
- **1.6 (High)** Have a **spill containment/clean-up system** available where a spill risk exists; the
  SDS gives spill/disposal advice; link spill procedures to the SDS and the emergency plan, with trained
  workers. *SWA — Managing risks (emergency plans, spill containment).*
- **1.7 (High)** **SDS/label drive the specifics** (which PPE, storage/incompatibility, first aid,
  spill, exposure data); the **general WHS duty** (minimise risk so far as reasonably practicable,
  hierarchy of controls, register, training, emergency planning) sits over the top regardless of
  product. *SWA — Managing risks of hazardous chemicals.*

### 2. Slip / trip / fall controls during cleaning
- **2.1 (High)** The model **Code of Practice: Managing the work environment and facilities** covers
  floors, contamination and pedestrian routes; cleaning methods must account for slip risk. *SWA —
  Managing the work environment and facilities.*
- **2.2 (High)** Water and cleaning product **reduce grip and increase slip risk**; control wet or
  freshly treated floors with signage, barricading and exclusion in occupied buildings. *SWA — Managing
  the work environment and facilities; SafeWork NSW — preventing slips/trips/falls.*
- **2.3 (High)** Use **wet-floor signage, cones/tape and barricading** to mark pedestrian routes and keep
  people out of wet areas; keep walkways clear. *SWA — Managing the work environment and facilities.*
- **2.4 (Medium)** **Trailing leads and hoses are trip hazards** under housekeeping/obstruction-free
  walkway duties — route and manage them so they do not create a hazard. *SWA — Managing the work
  environment and facilities; SafeWork NSW.*
- **2.5 (High)** Slip/trip control is a **hierarchy-of-controls** exercise — separate pedestrians from wet
  areas where reasonably practicable; **signage is a lower-order (administrative) supplement, not the
  primary control.** *SWA — Managing risks; Managing the work environment and facilities.*

### 3. Electrical safety for portable equipment
- **3.1 (High)** **AS/NZS 3760** (in-service inspection & testing of electrical equipment) is a
  **standard, not legislation** — it sets procedures for inspecting/testing portable lead-connected
  equipment and RCDs. *Standards Australia — AS/NZS 3760:2022.*
- **3.2 (High)** The **general WHS duty** is to keep electrical equipment safe; a test-and-tag program
  (often referencing AS/NZS 3760) is a practical way to demonstrate this, **not** a single universal
  statutory mandate. *SWA — Electrical safety.*
- **3.3 (High)** **RCD (safety switch) protection** is required for hand-held/portable equipment from
  socket outlets (≤30 mA trip for socket outlets up to 20 A); portable equipment includes **floor
  polishers and extension leads** — directly relevant to floor-care gear. *SWA — Electrical risks at the
  workplace.*
- **3.4 (High)** **Operate the test button on a portable RCD each time you plug it in**; RCDs must be
  tested by a competent person. *SWA — Electrical safety; state WorkSafe RCD guidance.*
- **3.5 (High)** ⚠️ **Test-and-tag intervals and RCD obligations vary by jurisdiction** (e.g. NSW WHS;
  QLD Electrical Safety Act/Reg with class-based frequencies; WA own regs). Treat intervals as
  jurisdiction-dependent. *State regulator guidance.*

### 4. Ventilation in occupied / child-occupied rooms
- **4.1 (High)** A PCBU **must ensure no person is exposed to an airborne contaminant above the relevant
  workplace exposure standard** — a general duty when using cleaning chemicals indoors. *SWA — Exposure
  standards for airborne contaminants.*
- **4.2 (High)** The **SDS carries the exposure-standard data**; read it to judge whether ventilation or
  other airborne-contaminant controls are needed. *SWA — Workplace exposure standards; SafeWork SA.*
- **4.3 (High)** **Ventilation is an engineering control** — general dilution ventilation, and local
  exhaust ventilation where general ventilation is inadequate. In occupied/child rooms, control airborne
  contaminants by ventilation, minimising release and product choice. *SWA — Airborne contaminants.*
- **4.4 (High)** ⚠️ Workplace exposure **standards** are being replaced by new **workplace exposure
  limits from 1 December 2026**; until then existing WES apply. Treat any numeric limit as date- and
  product-specific (read the current SDS). *SWA — Workplace exposure standards/limits.*

### 5. Confidentiality, privacy & CCTV for contractors
- **5.1 (High)** **Images/video of an identifiable person are "personal information"** under the
  **Privacy Act 1988**; collect them only where reasonably necessary — underpinning a "do not photograph
  people" default on client sites. *OAIC — Posting photos and videos; APP guidelines.*
- **5.2 (High)** The **Australian Privacy Principles (APPs)** govern handling of personal information;
  contractors should avoid recording personal information (children, people, documents, screens) unless
  authorised by the client for a lawful, necessary purpose. *OAIC — APPs.*
- **5.3 (Medium)** Organisations are expected to **manage/monitor contractor service providers** for
  equivalent privacy protection — the client's obligations flow through to contractor conduct. *OAIC —
  third-party providers.*
- **5.4 (Medium)** **Assume-CCTV conduct:** CCTV footage is itself personal information where individuals
  are identifiable; behave professionally on the basis that sites may be monitored (conduct guidance, not
  a legal mandate on the contractor). *OAIC — CCTV / posting photos.*
- **5.5 (High)** **Child-safe behaviour:** the **National Principles for Child Safe Organisations** expect
  a Child Safe Code of Conduct setting minimum behaviour between workers and children — this applies to
  contractors on child-occupied sites. *National Office for Child Safety; AHRC — example code.*
- **5.6 (High)** A **WWC check/clearance is only one strategy and is not sufficient on its own** — it sits
  alongside codes of conduct, supervision and culture. Treat WWC as a starting point. *Child Safe
  Organisations; National Office for Child Safety.*

### 6. Operational readiness (company-grounded, not external standard)
- **6.1** Job failure is frequently **non-cleaning**: vehicle/TruckMount not ready, machine won't start,
  wrong/missing tool, missing PPE/chemical, flat battery, damaged hose, or a skipped pre-start. This is
  the core "If it is not checked, it can stop the job" principle and is the basis of Pillars 5 & 8 and
  the disruption matrix. *(Operational policy — set by the company, not a regulatory claim.)*

---

## Guardrails (no overclaiming — mirrors `src/lib/brand-video-assistant.ts`)
- Do **not** claim IICRC / insurer / NRPG / regulator/compliance authority. This is internal training
  that **supports** judgement; it does not replace standards, SDS/TDS, qualified professionals, or a
  site's own rules.
- **No medical/health-effect claims.** Use "supports hygiene", "reduces soil load", "helps manage
  contaminants", "contributes to safer indoor environments" — never "kills germs", "sterilises",
  "prevents illness", or any health guarantee.
- Cure/re-entry/dry/dilution times and slip-rating targets come from the **SDS/TDS** and the relevant
  **standard (AS 4663 / HB 198 / NCC)** — never stated as fixed in this material.
- Present WWC checks, SDS, codes of conduct and signage as **elements**, not as complete compliance on
  their own.
- ⚠️ **Victoria = OHS Act 2004**, not model WHS. Child Safe Standards and WWC schemes are state-specific.
  Direct staff to the regulator for the state they work in.

## Unverified / excluded (do NOT assert)
- Fixed **re-entry / dry-back times** for sealed or wet floors → product/site-specific (TDS/SDS).
- **Test-and-tag intervals as universally legally mandated** → derive from AS/NZS 3760 risk categories;
  vary by jurisdiction.
- Specific numeric **exposure-standard values** for any chemical → read the current SDS; changing under
  the 1 Dec 2026 transition.
- That **CCTV will exist / the contractor is being recorded** at a given site → present as professional
  "assume-CCTV" conduct, not fact.
- That a **WWC check, SDS, or code of conduct alone** makes a contractor "compliant" → each is one
  element.
- Any **medical/health-effect** claim about chemical exposure → out of scope.
- **Manifest/placard thresholds** for a vehicle/small site → generally only above Schedule 11 quantities.
- That **model WHS applies in Victoria** → it does not (OHS Act 2004).

## Method / reliability note
New-pillar claims were assembled from WebSearch snippets of SafeWork Australia, state WHS regulators,
Standards Australia, OAIC and the National Office for Child Safety (WebFetch is prone to 403 on
`.gov.au`/Standards domains). Each is corroborated by ≥2 sources or a primary regulator page
title/summary. Before publishing any **directly quoted** clause, current SDS value, or
jurisdiction-specific interval, a human should open the cited primary document to confirm exact wording.
