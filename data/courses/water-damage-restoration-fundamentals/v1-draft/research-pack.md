# Research pack — CARSI Water Restoration Practitioner (v1 DRAFT)

**Status:** DRAFT v1 for Subject-Matter-Expert (SME) verification. This pack lists the Australian
sources used to ground the course's factual claims so the SME can confirm each before publish.
Claims were kept conservative; no statistics were invented. Standards are referenced **by name
only** — no IICRC (or other) standard text was reproduced or entered into any AI tool, per the
IICRC AI Use Policy and CLAUDE.md.

## How to read this pack

Each row maps a claim in the course to where it appears and the source the SME should check.
Figures in the "Do it in metric" worked examples (volumes, current draws, g/kg values, prices)
are **illustrative teaching numbers**, not measured data; they are flagged in-lesson as draft and
should be sanity-checked by the SME against real equipment rating plates and a psychrometric chart.

## Sources used (SME to verify)

1. **Safe Work Australia — model WHS duties, PCBU primary duty, "reasonably practicable".**
   - https://www.safeworkaustralia.gov.au/law-and-regulation/duties-under-whs-laws/duties-pcbu
   - https://www.safeworkaustralia.gov.au/law-and-regulation/duties-under-whs-laws/principles-apply-work-health-and-safety-duties
   - Used in: Module 3 (primary duty of the PCBU; eliminate so far as reasonably practicable, else minimise).
2. **Safe Work Australia — hierarchy of control measures.**
   - https://www.safeworkaustralia.gov.au/duties-tool/construction/pcbu/manage-risks
   - Model Code of Practice: *How to manage work health and safety risks* (Nov 2024 PDF) — hierarchy; PPE/administrative controls are least effective.
   - Used in: Module 3 (elimination strongest; PPE is the last line).
3. **AS/NZS 3760 — in-service safety inspection and testing of electrical equipment and RCDs (test and tag).**
   - SafeWork NSW: https://www.safework.nsw.gov.au/hazards-a-z/electrical-and-power/electrical-inspection-and-testing
   - SafeWork SA: https://www.safework.sa.gov.au/workplaces/electrical/inspection-and-testing-of-electrical-equipment
   - Standards Australia listing: https://store.standards.org.au/product/as-nzs-3760-2022
   - Used in: Module 3 (portable electrical gear inspected, tested and tagged by a competent person).
4. **Australian mains supply and plugs/sockets — 230 V, 50 Hz, 10 A GPO, AS/NZS 3112; RCD under AS/NZS 3000.**
   - AS/NZS 3112 (plugs and socket-outlets); nominal 230 V, 10 A standard domestic socket.
   - RCD / safety switch (type A general RCD mandated by Amendment 2 of AS/NZS 3000:2018 from May 2023) — confirm wording with a licensed electrician / Standards Australia.
   - Used in: Modules 1, 3, 5 (230 V / 50 Hz, 10 A GPO ≈ 2300 W per circuit, RCD, load splitting).
5. **Bureau of Meteorology — humidity, dew point, specific humidity (psychrometry basics).**
   - https://www.bom.gov.au/climate/cdo/about/definitions9and3.shtml (dry-bulb, wet-bulb, dew point, relative humidity definitions)
   - https://media.bom.gov.au/social/blog/1324/ (dew point vs relative humidity; RH depends on temperature)
   - Used in: Module 4 (instruments; °C, %RH, dew point, g/kg) and Module 5 (why g/kg is the honest moisture measure).
   - *SME note:* the specific-humidity values quoted (e.g. 24 °C / 70 %RH ≈ 13 g/kg; 30 °C / 60 %RH ≈ 16 g/kg) are approximate psychrometric-chart readings for teaching — confirm against a chart/calculator for the altitude and pressure used.
6. **ACCC — Australian Consumer Law consumer guarantees for services (due care and skill; fit for purpose).**
   - https://www.accc.gov.au/consumers/buying-products-and-services/consumer-rights-and-guarantees
   - ACL sections 60–63 (services provided with due care and skill, fit for specified purpose, within a reasonable time).
   - Used in: Module 6 (avoid over-claiming; "sterilised"/guaranteed dry time; services with due care and skill).

## Claims deliberately kept conservative / flagged for SME

- **Water categories and classes** are described in plain CARSI wording and aligned nominatively to
  the principles in ANSI/IICRC S500. No S500 text, table or procedure is reproduced. The SME who
  holds the licensed standard should confirm the category/class descriptions match current practice.
- **Respirator selection (P2 and higher) and fit-testing** are described in general terms; the SME
  should confirm the respiratory-protection guidance against AS/NZS 1715/1716 and the relevant state
  health guidance before publish.
- **Instrument brands** (Protimeter, Tramex, Delmhorst, FLIR) are named only as examples available in
  Australia; availability last checked 2026-07-09 — the SME should re-confirm current 230 V/battery
  models and distributors and update the date.
- **Poisons Information Centre 13 11 26** and **000** are the Australian numbers quoted; confirm still current.
- **GST at 10%** and AUD pricing examples are illustrative; confirm the business's current rates.

## Licence / production guardrails honoured

- `iicrcDiscipline: null`, `cecHours: 0`; no claim that the course earns or awards CECs; no bare
  "IICRC Accredited" / "IICRC-accredited course" / "IICRC certification"; credential carried in
  `meta.designation` ("CARSI Water Restoration Practitioner"), a CARSI Southern Hemisphere
  Restoration Designation.
- Australian English, 230 V / 50 Hz / 10 A GPO / RCD, metric units, AUD, and AS/NZS + Safe Work
  Australia framing throughout.
- Standards named only; no standard text entered into any AI tool (IICRC AI Use Policy).
