# Runbook — course-asset-kit engine (GP-488)

`scripts/course-asset-kit.ts` is the one orchestrating authoring tool that lets every
new CARSI course ship its full media kit by default. It consolidates what was done as
one-offs for the launch courses (flashcards, slides, audio-overview script, quiz, image
briefs) behind a single CLI.

It is the **deterministic front-end** of the authoring pipeline. It does two things and
never spends money:

1. **Plans** — reports which kit pieces a course already has vs. is missing.
2. **Scaffolds** — writes _extractive-or-empty_ asset files built from the course's
   already-delivered lesson content.

The cost-bearing generators — thumbnails (`generate-course-thumbnails.ts`), voiceover
(`generate-course-voiceover.ts`), lesson videos — remain their own scripts and run
**after** a human truth-gate authoring pass has filled the scaffolds in.

## The golden rule: never invent

Every scaffold is **extractive or empty**:

- Extracted text comes verbatim from the lesson's delivered `contentBody` HTML (list
  items, blockquotes, headings, paragraph openers).
- Any field that would require authoring judgement — a flashcard _question_, a quiz
  _question/answer_, an audio _script_, an image _prompt_, _speakerNotes_ — is left
  **empty** for the truth-gate pass.
- Every generated file carries a top-level
  `"status": "scaffold — requires truth-gate authoring pass"` banner.

This means a scaffold can only ever contain content that already shipped, or a blank to
be authored. It cannot introduce a new factual claim.

## The workflow

```
   ┌── 1. scaffold ──┐   ┌── 2. truth-gate ──┐   ┌── 3. generate ──┐   ┌── 4. attach ──┐   ┌── 5. seed ──┐
   │ course-asset-kit │→ │ human author fills │→ │ spend scripts    │→ │ resources on   │→ │ deploy runs  │
   │ --generate       │   │ empty fields, SME  │   │ (voice, thumbs,  │   │ lessons in the │   │ db:seed-*    │
   │ (this tool)      │   │ review, AU/IICRC   │   │ video) if needed │   │ catalogue      │   │ on boot      │
   └──────────────────┘   └────────────────────┘   └──────────────────┘   └────────────────┘   └─────────────┘
```

### 1. Plan — see the gaps

```bash
npx tsx scripts/course-asset-kit.ts --slug=<course> --plan
```

Reports the cecHours guard result, an IICRC CEC banned-phrase scan of the extracted
text, which kit files exist, which lesson resources are attached, and a gap report with
the exact `--generate` command to close it.

### 2. Scaffold the missing pieces

```bash
npx tsx scripts/course-asset-kit.ts --slug=<course> --generate \
  --assets=flashcards,slides,audio-script,image-briefs,quiz-scaffold
```

- `--assets` is optional; omit it to scaffold all five.
- **Non-destructive**: an existing asset file is kept, not overwritten. Pass `--force`
  to regenerate.

Output paths:

| Asset          | Path                                                       |
| -------------- | ---------------------------------------------------------- |
| `flashcards`   | `data/seed/flashcards/<slug>.json`                         |
| `slides`       | `data/seed/slides/<slug>.json`                             |
| `audio-script` | `data/seed/audio-overview/<slug>.script.json`              |
| `image-briefs` | `data/seed/image-briefs/<slug>.json`                       |
| `quiz-scaffold`| `data/seed/quiz-scaffolds/<slug>.quiz-scaffold.json`       |

> The quiz scaffold lands in its own `quiz-scaffolds/` subdir so it never collides with
> the hand-authored, shipping quiz files at `data/seed/*.json`. Move it to a real quiz
> file (matching the `seed-all-quizzes.ts` schema) once authored.

### 3. Truth-gate authoring pass (human)

Open each scaffold and fill the empty fields against the `sourceLessonId` it references.
This is where SME review, Australian-English/units/power checks, and IICRC CEC
terminology compliance happen. Follow the `carsi-course-production` skill.

### 4. Generate the spend assets (if needed)

Once scripts are written, run the specialised generators — they call the paid APIs and
upload to Cloudinary:

```bash
npm run voice:plan && npm run voice:generate      # ElevenLabs narration
npm run db:thumbnails:plan && npm run db:thumbnails:generate   # course thumbnail
```

### 5. Attach + seed

Attach the finished flashcards/slides/audio/image/video as lesson `resources` in
`data/seed/courses-catalog.json` (see `src/lib/lms/lesson-resources.ts` for the shapes
the player renders), then let the deploy boot path seed them:

```bash
npm run db:seed-courses    # imports the catalogue (incl. attached resources)
npm run db:seed-quizzes    # imports quiz files
```

## Guardrails (run in both phases)

- **cecHours** (licence-critical, CLAUDE.md § "CEC hours require per-course IICRC
  approval"): the engine **refuses** a course whose catalogue entry has no explicit
  `cecHours`, and **warns loudly** on the legacy `null` (duration-derived) value. A new
  course must ship `cecHours: 0` until the founder confirms IICRC CEC approval.
- **IICRC CEC terminology**: the engine runs the banned-phrase regexes (mirroring
  `scripts/check-iicrc-terminology.mjs`) over all extracted text and reports hits. This
  is a **reporter**, not a release gate — it does not block scaffolding, but any hit in
  delivered content should be fixed before publish. Note it also scans the seed catalogue
  content, which the release guard (source-copy only) does not cover.

## Slice 1 scope

This slice ships the **plan + scaffold** (deterministic, zero-spend) half only. The
spend orchestration (wiring the generators behind this one CLI) is a later slice; today
they stay separate scripts run manually after authoring.
