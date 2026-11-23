import type { InteractiveExperience } from '@/lib/lms/interactive-experience-types';

const DIAGRAM = '/courses/water-damage-restoration-fundamentals/diagrams/hazard-map.svg';

/**
 * Pilot bundle for Module 3 — safety & hazards (Melbourne garage scenario from course copy).
 * Attached via API merge and catalog `experienceId: water-damage-module-3-pilot`.
 */
export const WATER_DAMAGE_INTERACTIVE_PILOT: InteractiveExperience = {
  id: 'water-damage-module-3-pilot',
  title: 'Job-site investigation: flooded garage–rumpus',
  subtitle: 'Practise hazard-led thinking before drying equipment comes out.',
  disclaimer:
    'This is an educational simulation. It does not replace supervised on-site competency, licensed electrical work, or your organisation’s Safe Work Method Statement (SWMS).',
  activities: [
    {
      id: 'arrival-scenario',
      type: 'scenario',
      title: 'Discover — walk the threshold',
      xp: 20,
      intro:
        'You arrive at a Melbourne home where a hot-water system burst in a garage-turned-rumpus room. Standing water covers the floor. A power board with leads to a bar fridge and TV sits just above the water line.',
      steps: [
        {
          prompt: 'What is your first action at the doorway?',
          choices: [
            {
              id: 'extract',
              label: 'Connect the extractor and start removing water',
              feedback:
                'Bulk water removal matters, but not before you control what can kill someone. Water and 230 V mains are a fatal combination — identify and isolate electrical hazards first.',
            },
            {
              id: 'threshold',
              label: 'Stop at the threshold, scan for hazards, and control them',
              correct: true,
              feedback:
                'Correct. Under Australian WHS principles, hazards are identified and controlled before work begins. Electrical risk is the priority when live fittings are near standing water.',
            },
            {
              id: 'photos',
              label: 'Photograph everything, then walk through the water',
              feedback:
                'Documentation matters, but entering standing water near a power board puts you in the hazard zone. Control electrical risk and make the space safe to enter before you move in.',
            },
          ],
        },
        {
          prompt: 'The power board sits above standing water with leads still plugged in. What do you do next?',
          choices: [
            {
              id: 'unplug',
              label: 'Unplug the bar fridge leads while standing in the water',
              feedback:
                'Never reach into standing water near live 230 V equipment. Isolation must be done by a competent person with the supply confirmed dead — not by wading in.',
            },
            {
              id: 'isolate',
              label: 'Isolate the circuit at the switchboard and confirm dead before any equipment',
              correct: true,
              feedback:
                'Correct. Elimination and isolation sit above PPE in the hierarchy of controls. Only then connect extraction gear through a tested-and-tagged lead and a portable RCD.',
            },
            {
              id: 'rcd-only',
              label: 'Plug in a portable RCD and start extracting — the RCD will protect you',
              feedback:
                'An RCD is part of safe portable setup, but it does not replace isolating unknown live circuits near water. Make the supply safe first.',
            },
          ],
        },
        {
          prompt: 'Before drying begins, what belongs in the first job-file entries?',
          choices: [
            {
              id: 'quote',
              label: 'Final quote and equipment list only',
              feedback:
                'Commercial detail comes later. The first entries document safety controls, loss size, and starting conditions — evidence for insurers and supervisors.',
            },
            {
              id: 'hazard-size-air',
              label: 'Hazards controlled, affected area (m²), and starting air temperature and %RH',
              correct: true,
              feedback:
                'Correct. Safety controls, metric sizing, and ambient readings set the baseline for every later drying decision and support a defensible file.',
            },
            {
              id: 'drying-plan',
              label: 'Number of air movers planned overnight',
              feedback:
                'Equipment counts come after hazard control, moisture assessment, and a dry goal. Sizing without data risks under- or over-resourcing.',
            },
          ],
        },
      ],
    },
    {
      id: 'hazard-diagram',
      type: 'diagram',
      title: 'Understand — explore the hazard map',
      xp: 20,
      imageSrc: DIAGRAM,
      imageAlt:
        'Hazard map of a flooded room marking electrical, biological, slip, structural, chemical and confined-space hazards.',
      hotspots: [
        {
          id: 'electrical',
          label: 'Electrical',
          markerNumber: 1,
          x: 43.75,
          y: 17.2,
          w: 6,
          h: 8.3,
          detail:
            '230 V power board and GPO beside standing water. First control: isolate supply, confirm dead, then use tested-and-tagged leads through a portable RCD.',
        },
        {
          id: 'biological',
          label: 'Biological',
          markerNumber: 2,
          x: 23.25,
          y: 64.5,
          w: 6,
          h: 8.3,
          detail:
            'Category 2 and 3 water carries micro-organisms; sewage is a biohazard. Match PPE to the category and record what was worn.',
        },
        {
          id: 'slip',
          label: 'Slips & trips',
          markerNumber: 3,
          x: 20.75,
          y: 34.8,
          w: 6,
          h: 8.3,
          detail:
            'Standing water, trailing leads and equipment hoses create slip and trip risk. Keep leads routed, barricade wet zones, and wear appropriate footwear.',
        },
        {
          id: 'structural',
          label: 'Structural',
          markerNumber: 4,
          x: 15.75,
          y: 48.3,
          w: 6,
          h: 8.3,
          detail:
            'Wet ceiling holding water overhead can collapse. Do not stand under saturated plaster — contain the area and escalate if the structure is uncertain.',
        },
        {
          id: 'chemical',
          label: 'Chemical',
          markerNumber: 5,
          x: 46.5,
          y: 37.2,
          w: 6,
          h: 8.3,
          detail:
            'Cleaning and antimicrobial products need SDS awareness, ventilation and compatible PPE. The label and SDS beat habit.',
        },
        {
          id: 'confined',
          label: 'Confined / heat',
          markerNumber: 6,
          x: 46.5,
          y: 71,
          w: 6,
          h: 8.3,
          detail:
            'Subfloors, roof voids and hot drying environments need entry planning. If a hazard cannot be controlled, stop and escalate.',
        },
      ],
    },
    {
      id: 'hidden-hazards',
      type: 'hazard-spot',
      title: 'Practice — spot every present hazard',
      xp: 20,
      prompt:
        'On this job, which hazards are genuinely present before you step in? Select all that apply.',
      options: [
        { id: 'elec', label: 'Electrical — live fittings near standing water' },
        { id: 'bio', label: 'Biological — burst hot-water (likely Category 1 at first glance, still assess)' },
        { id: 'slip', label: 'Slips and trips — wet floor and future trailing leads' },
        { id: 'struct', label: 'Structural — wet ceiling overhead' },
        { id: 'noise', label: 'Noise — motorway traffic outside' },
        { id: 'chemical', label: 'Chemical — antimicrobial products you may apply later' },
      ],
      correctIds: ['elec', 'bio', 'slip', 'struct', 'chemical'],
      successFeedback:
        'You identified the job-site hazards that drive controls and PPE. Traffic noise is real on some jobs, but it is not the primary hazard in this room.',
    },
    {
      id: 'first-decision',
      type: 'decision',
      title: 'Decide — your first professional move',
      xp: 20,
      scene:
        'The homeowner asks you to “just start drying” while children are still in the adjacent room. Water is across the rumpus floor and the power board is live.',
      prompt: 'What do you say and do first?',
      choices: [
        {
          id: 'comply',
          label: 'Agree and start extracting to keep the customer happy',
          feedback:
            'Customer pressure is common, but safety and WHS duties are not negotiable. You explain the electrical risk and the steps to make the room safe before equipment runs.',
          followUp:
            'A professional explains why the delay protects everyone — then documents the hazard control in the job file.',
        },
        {
          id: 'safe',
          label: 'Pause work, isolate electrical risk, brief the household, and document',
          correct: true,
          feedback:
            'Correct. You communicate the risk, control it, and record what you did. Drying only starts once the space is safe to enter and power is managed.',
        },
        {
          id: 'ppe-only',
          label: 'Wear rubber boots and gloves and start — that is enough PPE',
          feedback:
            'PPE is the last line of defence. It does not make water near 230 V safe. Isolation and engineering controls come first.',
        },
      ],
    },
    {
      id: 'arc-sequence',
      type: 'sequence',
      title: 'Explore — restoration arc order',
      xp: 15,
      prompt: 'Put the first site actions in the order a professional follows on arrival (tap to build the sequence).',
      items: [
        'Make it safe and control hazards',
        'Understand the water category and extent',
        'Control the source and remove bulk water',
        'Assess moisture and set a dry goal',
        'Deploy drying and monitor',
      ],
      correctOrder: [0, 1, 2, 3, 4],
      successFeedback:
        'You matched the restoration arc from the course: safe first, then understand, control, assess, dry and monitor.',
    },
    {
      id: 'category-knowledge',
      type: 'knowledge',
      title: 'Assess — water category judgement',
      xp: 5,
      prompt:
        'Before category changes, the burst hot-water line starts as which category (assuming a sanitary source, no contamination yet)?',
      options: [
        { id: 'c1', label: 'Category 1 — clean water' },
        { id: 'c2', label: 'Category 2 — grey water' },
        { id: 'c3', label: 'Category 3 — black water' },
      ],
      correctId: 'c1',
      successFeedback:
        'Correct. A sanitary hot-water source with no substantial contamination is Category 1 — still reassess if it contacts dirty materials or time passes.',
      incorrectFeedback:
        'Grey and black water describe rising contamination. A fresh sanitary burst starts as Category 1 until evidence pushes it higher.',
    },
  ],
};