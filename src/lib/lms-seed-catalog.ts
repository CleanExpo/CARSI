import type { AdminCatalog, AdminCatalogCourse, AdminLesson, AdminModule } from '@/lib/admin/load-admin-catalog';
import type { WpExportCourse } from '@/lib/wordpress-export-courses';

export type SeedLessonModule = {
  title: string;
  lessonTitle: string;
  contentHtml: string;
};

export type SeedCourseFull = {
  export: WpExportCourse;
  modules: SeedLessonModule[];
};

function html(
  sections: Array<{ h: string; p: string[]; bullets?: string[] }>
): string {
  const parts: string[] = [];
  for (const s of sections) {
    parts.push(`<h2>${s.h}</h2>`);
    for (const para of s.p) {
      parts.push(`<p>${para}</p>`);
    }
    if (s.bullets?.length) {
      parts.push('<ul>');
      for (const b of s.bullets) {
        parts.push(`<li>${b}</li>`);
      }
      parts.push('</ul>');
    }
  }
  return parts.join('\n');
}

function mod(
  title: string,
  lessonTitle: string,
  sections: Array<{ h: string; p: string[]; bullets?: string[] }>
): SeedLessonModule {
  return { title, lessonTitle, contentHtml: html(sections) };
}

/** Five pilot courses — full textual curriculum (8 modules each). Replace or extend later. */
const SEED_COURSES: SeedCourseFull[] = [
  {
    export: {
      wp_id: 9001,
      slug: 'wrt-water-damage-essentials',
      title: 'Water Damage Restoration — Essentials',
      short_description:
        'Foundations of water damage assessment, extraction, drying, and documentation for Australian restoration technicians.',
      description:
        'Professional introduction to water damage restoration aligned with IICRC WRT concepts: safety, psychrometry, equipment, and client communication.',
      price_aud: 0,
      is_free: true,
      iicrc_discipline: 'WRT',
      status: 'published',
      level: 'Foundation',
      category: 'Water Restoration',
      thumbnail_url: null,
      meta: { wp_id: 9001 },
    },
    modules: [
      mod(
        'Module 1 — Safety, standards & site control',
        'Orientation and safe work on loss sites',
        [
          {
            h: 'Professional scope',
            p: [
              'Before any drying plan is written, technicians must establish a safe, controlled work zone. This module frames how CARSI aligns practical field procedures with widely recognised industry expectations used in Australia and internationally.',
              'You will treat every site as a dynamic environment: hazards change as materials are disturbed, services are capped, and equipment is introduced.',
            ],
            bullets: [
              'Identify slip/trip risks, electrical hazards, and compromised structures before work begins.',
              'Use appropriate PPE for Category 1–3 conditions as indicated by assessment (gloves, respirators where required, eye protection).',
              'Communicate clearly with occupants about access limits, noise, and equipment placement.',
            ],
          },
          {
            h: 'Documentation mindset',
            p: [
              'Accurate notes and photographs support insurance review, dispute resolution, and defensible technical decisions. Record moisture readings, equipment serials, and changes to the drying strategy as the project evolves.',
            ],
          },
        ]
      ),
      mod(
        'Module 2 — Water categories & material science',
        'Understanding contamination and porous assemblies',
        [
          {
            h: 'Categories of water',
            p: [
              'Industry training commonly classifies water by contamination potential. Clean water can degrade as it contacts soils, waste systems, or exterior flood sources. Your assessment determines what may be dried in place versus removed.',
            ],
            bullets: [
              'Anticipate capillary rise in gypsum, timber framing, and insulation cavities.',
              'Recognise when carpet underlay or porous trim must be removed to protect indoor air quality.',
            ],
          },
        ]
      ),
      mod(
        'Module 3 — Initial inspection & moisture mapping',
        'Systematic inspection and baseline readings',
        [
          {
            h: 'Inspection workflow',
            p: [
              'Start wide, then narrow: building envelope, services, adjoining rooms, and subfloor voids. Use a combination of visual cues, non-penetrating meters, and targeted probing where appropriate.',
              'Sketch or digitise the floor plan with wet zones, dry standards, and equipment locations — this becomes the backbone of your drying log.',
            ],
          },
        ]
      ),
      mod(
        'Module 4 — Water extraction principles',
        'Removing liquid water efficiently',
        [
          {
            h: 'Extraction first',
            p: [
              'Evaporation is slower and more energy-intensive than physical removal. On many losses, improving extraction from carpet and pad (where salvageable) directly reduces drying time and energy cost.',
            ],
            bullets: [
              'Match wand or ride-on tools to pile type and salvage goals.',
              'Document when pad is extracted versus removed.',
            ],
          },
        ]
      ),
      mod(
        'Module 5 — Evaporation & dehumidification',
        'Balancing airflow and grain depression',
        [
          {
            h: 'The drying triangle',
            p: [
              'Increase evaporation rate with controlled airflow to wet surfaces, remove moisture from air via dehumidification, and manage temperature within equipment limits and comfort/safety constraints.',
            ],
          },
        ]
      ),
      mod(
        'Module 6 — Equipment selection & placement',
        'Air movers, LGRs, and heat — when and why',
        [
          {
            h: 'Practical placement',
            p: [
              'Position air movers to create laminar flow across wet materials. Place low-grain-refrigerant dehumidifiers to process the airstream you are conditioning, not short-circuiting outdoor air unless intentional.',
            ],
          },
        ]
      ),
      mod(
        'Module 7 — Monitoring & psychrometry basics',
        'Reading conditions and adjusting the plan',
        [
          {
            h: 'What to log',
            p: [
              'Track temperature and relative humidity at least daily at representative points: affected rooms, unaffected reference, and dehumidifier discharge where useful. Compare to drying goals rather than guessing completion.',
            ],
          },
        ]
      ),
      mod(
        'Module 8 — Completion, handover & reporting',
        'Defensible close-out',
        [
          {
            h: 'Sign-off',
            p: [
              'Define “dry” against material-specific targets and document equipment removal, final readings, and any recommendations for third-party trades (e.g., electrical, cabinetry).',
              'Professional reporting reduces callbacks and supports transparent relationships with insurers and property owners.',
            ],
          },
        ]
      ),
    ],
  },
  {
    export: {
      wp_id: 9002,
      slug: 'asd-structural-drying-core',
      title: 'Applied Structural Drying — Core Concepts',
      short_description:
        'Deepen drying science for structural assemblies: monitoring, vapour pressure, and advanced equipment strategies.',
      description:
        'Builds on water restoration fundamentals with a focus on structural drying, documentation rigour, and complex assemblies.',
      price_aud: 0,
      is_free: true,
      iicrc_discipline: 'ASD',
      status: 'published',
      level: 'Intermediate',
      category: 'Structural Drying',
      thumbnail_url: null,
      meta: { wp_id: 9002 },
    },
    modules: [
      mod(
        'Module 1 — ASD scope & prerequisites',
        'When structural drying differs from general water jobs',
        [{ h: 'Course map', p: ['Structural drying addresses bound water in framing, subfloors, and complex cavities where surface drying alone is insufficient.'] }]
      ),
      mod(
        'Module 2 — Vapour pressure & drying forces',
        'Driving drying potential',
        [{ h: 'Concepts', p: ['Understand how temperature, RH, and airflow interact to move moisture from materials into air processed by dehumidifiers.'] }]
      ),
      mod(
        'Module 3 — Cavities & concealed assemblies',
        'Walls, ceilings, and service penetrations',
        [{ h: 'Inspection tactics', p: ['Use endoscopic tools where justified; plan access points that balance inspection depth with reinstatement cost.'] }]
      ),
      mod(
        'Module 4 — Supplemental heat & conditioning',
        'Controlled acceleration',
        [{ h: 'Application', p: ['Apply heat and targeted airflow where safe and where it measurably improves drying rate without damaging finishes.'] }]
      ),
      mod(
        'Module 5 — Hardwood & engineered flooring',
        'Specialised material behaviour',
        [{ h: 'Wood physics', p: ['Recognise cupping, buckling thresholds, and when specialty drying mats or tenting is appropriate.'] }]
      ),
      mod(
        'Module 6 — Concrete & lightweight slab systems',
        'Slow-release moisture',
        [{ h: 'Reality check', p: ['Concrete drying timelines differ from carpet and plaster; set expectations with stakeholders early.'] }]
      ),
      mod(
        'Module 7 — Monitoring plans & KPIs',
        'Evidence-based adjustments',
        [{ h: 'Metrics', p: ['Define success criteria per assembly and adjust equipment when progress stalls beyond expected curves.'] }]
      ),
      mod(
        'Module 8 — Complex loss coordination',
        'Multi-trade sequencing',
        [{ h: 'Handovers', p: ['Coordinate with electricians, hygienists, and builders where drying intersects make-safe and rebuild scopes.'] }]
      ),
    ],
  },
  {
    export: {
      wp_id: 9003,
      slug: 'amrt-microbial-remediation-core',
      title: 'Microbial Remediation — Core Principles',
      short_description:
        'Assessment, containment, remediation workflow, and post-verification thinking for microbial-affected buildings.',
      description:
        'Introduces professional microbial remediation concepts emphasising safety, containment, cleaning vs removal decisions, and documentation.',
      price_aud: 0,
      is_free: true,
      iicrc_discipline: 'AMRT',
      status: 'published',
      level: 'Intermediate',
      category: 'Microbial',
      thumbnail_url: null,
      meta: { wp_id: 9003 },
    },
    modules: [
      mod(
        'Module 1 — Health, safety & regulatory context',
        'Working professionally around microbial growth',
        [{ h: 'Framework', p: ['Technicians must follow site-specific hygiene plans and respect jurisdictional requirements for assessment and clearance where applicable.'] }]
      ),
      mod(
        'Module 2 — Building science & moisture drivers',
        'Why mould appears',
        [{ h: 'Causation', p: ['Moisture duration and temperature drive microbial colonisation; remediation without fixing the moisture source will fail.'] }]
      ),
      mod(
        'Module 3 — Inspection & sampling concepts',
        'Non-interpretive awareness',
        [{ h: 'Roles', p: ['Understand when inspection indicates further assessment by occupational hygienists or mycologists; do not over-claim laboratory interpretation without qualification.'] }]
      ),
      mod(
        'Module 4 — Containment & negative pressure',
        'Protecting occupants and clean areas',
        [{ h: 'Barriers', p: ['Build containments with appropriate airflow direction, HEPA filtration, and access protocols.'] }]
      ),
      mod(
        'Module 5 — Removal vs cleaning strategies',
        'Porous, semi-porous, non-porous',
        [{ h: 'Decision matrix', p: ['Match method to material: HEPA vacuuming and damp wiping on non-porous; removal when porous materials cannot be reliably cleaned.'] }]
      ),
      mod(
        'Module 6 — Equipment, chemicals & PPE',
        'Professional controls',
        [{ h: 'Discipline', p: ['Follow SDS requirements, label directions, and site risk assessments for respiratory protection.'] }]
      ),
      mod(
        'Module 7 — Cleaning process & sequencing',
        'From source outwards',
        [{ h: 'Workflow', p: ['Work from clean to dirty, detail HEPA vacuuming, damp wipe, and post-clean inspection with documentation.'] }]
      ),
      mod(
        'Module 8 — Post-remediation verification mindset',
        'Clearance-ready site',
        [{ h: 'Close-out', p: ['Prepare records for third-party verification where required; communicate realistic timelines to occupants.'] }]
      ),
    ],
  },
  {
    export: {
      wp_id: 9004,
      slug: 'fsrt-fire-smoke-restoration-core',
      title: 'Fire & Smoke Restoration — Core Principles',
      short_description:
        'Safety on fire-affected sites, soot behaviour, cleaning chemistry, and deodorisation planning.',
      description:
        'Foundational fire and smoke restoration concepts for technicians working on residential and commercial smoke-affected properties.',
      price_aud: 0,
      is_free: true,
      iicrc_discipline: 'FSRT',
      status: 'published',
      level: 'Foundation',
      category: 'Fire & Smoke',
      thumbnail_url: null,
      meta: { wp_id: 9004 },
    },
    modules: [
      mod(
        'Module 1 — Site safety & stabilisation',
        'Make-safe priorities',
        [{ h: 'First principles', p: ['Secure utilities, structural triage, and respiratory protection before aggressive cleaning.'] }]
      ),
      mod(
        'Module 2 — Smoke residue types',
        'Fuel chemistry and residues',
        [{ h: 'Patterns', p: ['Recognise dry particulate, wet smoke, protein residues, and the cleaning implications of each.'] }]
      ),
      mod(
        'Module 3 — Surface cleaning mechanics',
        'Contact time and agitation',
        [{ h: 'Technique', p: ['Choose detergents appropriate to substrate; test in inconspicuous areas; document product usage.'] }]
      ),
      mod(
        'Module 4 — Contents vs structure workflow',
        'Prioritisation',
        [{ h: 'Triage', p: ['Separate total loss, cleanable on-site, and pack-out inventory items with chain-of-custody discipline.'] }]
      ),
      mod(
        'Module 5 — Odour science overview',
        'Adsorption and perception',
        [{ h: 'Basics', p: ['Deodorisation targets source removal first; supplemental methods must be justified and safe.'] }]
      ),
      mod(
        'Module 6 — Equipment for air quality',
        'Filtration and ventilation',
        [{ h: 'Deployment', p: ['Use HEPA air scrubbers to reduce particulate load during cleaning phases.'] }]
      ),
      mod(
        'Module 7 — HVAC considerations',
        'System evaluation concepts',
        [{ h: 'Caution', p: ['Understand when duct inspection and specialist cleaning are indicated; avoid spreading residues.'] }]
      ),
      mod(
        'Module 8 — Documentation & customer communication',
        'Managing expectations',
        [{ h: 'Reporting', p: ['Explain odour persistence factors, realistic timeframes, and next steps for rebuild trades.'] }]
      ),
    ],
  },
  {
    export: {
      wp_id: 9005,
      slug: 'cct-commercial-carpet-core',
      title: 'Commercial Carpet Care — Core Methods',
      short_description:
        'Fibres, soil chemistry, machine methods, and maintenance planning for commercial textile flooring.',
      description:
        'Practical commercial carpet maintenance aligned with professional cleaning expectations in education, retail, and strata settings.',
      price_aud: 0,
      is_free: true,
      iicrc_discipline: 'CCT',
      status: 'published',
      level: 'Foundation',
      category: 'Commercial Carpet',
      thumbnail_url: null,
      meta: { wp_id: 9005 },
    },
    modules: [
      mod(
        'Module 1 — Fibre ID & construction',
        'What you are cleaning',
        [{ h: 'Textiles', p: ['Differentiate cut pile, loop pile, and hybrid constructions; understand how fibre type affects chemistry and agitation limits.'] }]
      ),
      mod(
        'Module 2 — Soil types & traffic patterns',
        'Diagnosis before chemistry',
        [{ h: 'Assessment', p: ['Map high-traffic lanes, entry soils, and food service zones to tailor the cleaning sequence.'] }]
      ),
      mod(
        'Module 3 — Pre-inspection & testing',
        'Colourfastness and pH',
        [{ h: 'Due diligence', p: ['Perform fibre tests where required; document anomalies before applying heat or strong alkalis.'] }]
      ),
      mod(
        'Module 4 — Dry soil removal',
        'Vacuuming as a profit centre',
        [{ h: 'Efficiency', p: ['Thorough dry extraction reduces wet cleaning load and improves appearance consistency.'] }]
      ),
      mod(
        'Module 5 — Hot water extraction methods',
        'Equipment walkthrough',
        [{ h: 'Operation', p: ['Balance water temperature, pressure, and wand speed to avoid over-wetting glue-down carpet.'] }]
      ),
      mod(
        'Module 6 — Low-moisture & interim systems',
        'Encapsulation and bonnet',
        [{ h: 'When to use', p: ['Select interim methods for maintenance cycles between restorative cleans in 24/7 facilities.'] }]
      ),
      mod(
        'Module 7 — Spotting & specialty stains',
        'Controlled progression',
        [{ h: 'Safety', p: ['Work from mild to aggressive; neutralise residues; never mix unknown chemicals.'] }]
      ),
      mod(
        'Module 8 — Maintenance programmes & reporting',
        'Client retention',
        [{ h: 'Programmes', p: ['Propose frequency, KPIs (appearance level, slip risk), and service verification suitable to contract requirements.'] }]
      ),
    ],
  },
  /** Paid add-on — demonstrates non–subscription, per-course purchase in checkout. */
  {
    export: {
      wp_id: 9006,
      slug: 'restoration-project-management-premium',
      title: 'Restoration Project Management & Client Communication — Premium',
      short_description:
        'Scopes, estimates, stakeholder updates, and handover documentation for restoration supervisors and lead technicians.',
      description:
        'A paid professional skills course: translate technical work into clear project plans, commercial communication, and defensible documentation. Purchase once for lifetime access to this title (CARSI Pro subscribers may access the full catalogue separately).',
      price_aud: 179,
      is_free: false,
      iicrc_discipline: 'ASD',
      status: 'published',
      level: 'Professional',
      category: 'Business & Leadership',
      thumbnail_url: null,
      meta: { wp_id: 9006, pricing: 'paid_one_time' },
    },
    modules: [
      mod(
        'Module 1 — Scoping the loss',
        'From first call to site plan',
        [
          {
            h: 'Intake discipline',
            p: [
              'Structure the first conversation: parties involved, policy context, access constraints, and safety flags before mobilisation.',
            ],
          },
        ]
      ),
      mod(
        'Module 2 — Estimating mindset',
        'Labour, equipment, and margin',
        [{ h: 'Commercial basics', p: ['Align technical scope with line items clients expect: drying days, monitoring frequency, allowances for access delays.'] }]
      ),
      mod(
        'Module 3 — Stakeholder mapping',
        'Insurers, strata, and occupants',
        [{ h: 'Communication lanes', p: ['Define who receives what update, in what format, and how often — without over-committing your field team.'] }]
      ),
      mod(
        'Module 4 — Written updates that hold up',
        'Notes that support claims',
        [{ h: 'Documentation', p: ['Timestamp decisions, attach photos to narrative, and cross-reference equipment logs to drying goals.'] }]
      ),
      mod(
        'Module 5 — Change events',
        'Variations and scope creep',
        [{ h: 'Controls', p: ['Recognise when hidden damage or access issues require formal variation before additional cost or time is absorbed.'] }]
      ),
      mod(
        'Module 6 — Handover & defects',
        'Closing the job professionally',
        [{ h: 'Completion', p: ['Checklists for moisture clearance, cleanliness, and customer sign-off suitable for warranty and retention.'] }]
      ),
      mod(
        'Module 7 — Team leadership on site',
        'Crew coordination',
        [{ h: 'Leadership', p: ['Brief subcontractors clearly; manage fatigue and rostering during long drying programmes.'] }]
      ),
      mod(
        'Module 8 — Review & continuous improvement',
        'Lessons learned',
        [{ h: 'Debrief', p: ['Capture what worked for the next loss — templates, photos, and client feedback loops.'] }]
      ),
    ],
  },
];

export function getLmsSeedExportRows(): WpExportCourse[] {
  return SEED_COURSES.map((c) => ({
    ...c.export,
    lesson_count: 8,
  })) as WpExportCourse[];
}

export function getSeedCourseFull(slug: string): SeedCourseFull | null {
  const t = slug.trim().toLowerCase();
  return SEED_COURSES.find((c) => c.export.slug.toLowerCase() === t) ?? null;
}

export function getAllSeedSlugs(): string[] {
  return SEED_COURSES.map((c) => c.export.slug);
}

export function isSeedSlug(slug: string): boolean {
  return getSeedCourseFull(slug) != null;
}

/** Admin dashboard / workbook-style catalog from the same seed (no Excel). */
export function buildAdminCatalogFromSeed(): AdminCatalog {
  const courses: AdminCatalogCourse[] = SEED_COURSES.map((sc) => {
    const m: AdminModule[] = sc.modules.map((modItem, idx) => ({
      moduleNo: idx + 1,
      title: modItem.title.replace(/^Module \d+ — /, '').trim() || modItem.title,
      lessons: [
        {
          id: `${sc.export.slug}-m${idx + 1}-l1`,
          title: modItem.lessonTitle,
        } satisfies AdminLesson,
      ],
    }));
    return {
      slug: sc.export.slug,
      title: sc.export.title,
      status: sc.export.status ?? 'published',
      priceAud: Number(sc.export.price_aud),
      isFree: !!sc.export.is_free,
      iicrcDiscipline: sc.export.iicrc_discipline ?? null,
      moduleCount: m.length,
      categories: sc.export.category ? [sc.export.category] : [],
      modules: m,
    };
  });

  return {
    courses,
    generatedAt: new Date().toISOString(),
    excelPath: 'lms-seed-catalog.ts',
  };
}
