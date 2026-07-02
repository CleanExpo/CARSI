---
name: carsi-course-production
description: Use whenever creating, editing, refreshing, or reviewing ANY CARSI course, module, lesson, quiz, course trailer, or course marketing copy. Enforces the non-negotiable Australian-production standard (Australian English, 230V/10A power, metric units, Australian-available products, Australian standards/regulators, AUD) and the course quality bar.
---

# carsi-course-production — CARSI courses are Australian-produced (MUST-HAVE)

CARSI is an **Australian** training company (carsi.com.au), operating in the **Australian**
restoration & cleaning market. Every course, module, lesson, quiz, trailer, thumbnail and piece of
course marketing copy is **AUSTRALIAN-PRODUCED**. This is a hard requirement, not a preference —
US/UK data, spelling, power specs, or products are defects and must be corrected before publish.

## The Australian-production checklist (ALL mandatory)

You MUST create a todo for each of these and verify every one before a course is published or an
edit is saved.

### 1. Language — Australian English
- `-ise`/`-isation` (organise, specialise, minimise, optimise, standardise), `-our` (colour, odour,
  behaviour, labour, vapour), `-re` (metre, litre, centre, fibre), doubled-l (labelling, modelling,
  travelling), **mould** (not mold), **licence** (noun)/**license** (verb), **practise** (verb)/
  **practice** (noun), aluminium, tyre, sceptical, enrol/enrolment.
- BANNED US forms: color, odor, behavior, meter (as a length unit — use metre), liter, aluminum,
  mold, fiber, center, defense, "license" as a noun.

### 2. Electrical & power — Australian
- Mains = **230 V nominal, 50 Hz** single-phase (**400 V** three-phase). Standard outlet = **10 A
  GPO** (general power outlet), AS/NZS 3112 plug. Common circuits **10 A / 16 A / 20 A**.
- **Safety switch / RCD**; portable electrical gear is **test-and-tagged** (AS/NZS 3760).
- Redo ALL amp/circuit/power maths at **230 V** (a device is far fewer amps at 230 V than at 115 V).
- BANNED: 110/115/120 V, US "15 A / 20 A circuit" framing, NEMA plugs, "amps @115V".

### 3. Units — metric first
- Metres, millimetres, m², litres, kilograms, °C, kPa/Pa; airflow in **m³/h or L/s** (CFM only as an
  imported spec, with the metric equivalent). Convert imperial source data (e.g. IICRC S500 spacing
  in feet) to **metric primary**, imperial in parentheses.

### 4. Products & equipment — available in Australia, current
- Reference brands/models **actually sold in Australia** through Australian distributors, in
  **240 V/50 Hz** configuration. **State the date** of the availability check (products change).
- Do NOT cite US-only products, US voltages, or US spec sheets as if locally available. Where a US
  brand sells in Australia, use its **Australian distributor + 240 V model + AU pricing**.

### 5. Standards & regulation — Australian
- **AS/NZS** standards; **Safe Work Australia** + state WHS regulators; state **EPA**; **GHS/Safe
  Work Australia** SDS; Poisons Information **13 11 26**; Australian Consumer Law; TGA for any
  therapeutic/disinfection claims. IICRC standards (S500 etc.) ARE used in Australia — cite them, but
  frame within the **Australian regulatory context**, never as US-only.
- AU terminology: GPO, RCD/safety switch, tag-and-test, SWMS, JSEA, site induction, White Card.

### 6. Market context — Australian
- **AUD** pricing (note "inc GST" where relevant), Australian climate/seasons, Australian job types,
  Australian facilities (schools, childcare, aged care, strata), Australian examples and place names.

### 7. E-E-A-T — Australian authority
- Cite Australian bodies and sources; anchor authority to the Australian industry and the founder
  (Phill McGurk). Honour the SEO/GEO/AEO initiative (see memory `carsi-seo-geo-aeo-initiative`).

## Course quality bar (applies with the AU standard)
- Real, substantive modules (not stubs); consistent structure; correct `iicrcDiscipline` (or neutral
  for general/knowledge courses); CEC only when genuinely accredited (founder decides value).
- Course-card placeholder is data-driven (see `CourseTextThumbnail`); no ad-hoc stock cover images.
- Trailers are branded Remotion renders **with audio** (voiced via the sanctioned Synthex ElevenLabs
  config, single voice) — a silent trailer is a defect.

## Verification (before publish / before saving an edit)
Scan the content and reject on any hit:
- US spellings (color/odor/meter/mold/fiber/center/license-noun).
- `115V` / `15A circuit` / feet / sq ft / inches without a metric primary.
- US-only products or US voltages presented as locally available.
- Silent trailer (no audio stream).
Fix all before the course goes live. Prod publish/unpublish remains founder-gated.

## Governance
Prod DB is unreachable locally; course data changes go via the founder's authed admin session (guarded
full-echo PATCH — preserve modules/price/publish/introVideoUrl). `main = prod` (DO deploy_on_push).
