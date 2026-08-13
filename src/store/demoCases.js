/**
 * ED COMPASS - Synthetic Demo Case Presets
 * Academic Prototype for EMHI1001H
 * 
 * Provides 1-click test walk-throughs for classroom demonstration:
 * - Demo A: Nail Puncture (Uncertain Tetanus, Rust zero weight)
 * - Demo B: Sudden Severe Headache (Early Emergency Stop)
 * - Demo C: Lower-Risk Adult Fever (Home Monitoring + Safety Net)
 * - Demo D: High-Risk Host Fever (Chemotherapy Escalation, No CTAS/qSOFA)
 */

import { Scenario } from '../clinical/types.js';

export const DEMO_CASES = [
  {
    id: 'DEMO_A',
    title: 'Demo A: Nail Puncture (Uncertain Tetanus)',
    scenario: Scenario.NAIL_PUNCTURE,
    subtitle: 'Demonstrates wound questions, tetanus vaccination review, and proving rust has ZERO weight.',
    description: 'Patient stepped on a dirty, rusty nail through a sneakers sole. Wound is 1 cm deep, bleeding stopped. Tetanus shot was >5 years ago or uncertain.',
    presetAnswers: {
      uncontrolledBleeding: false,
      numbnessOrCirculationIssue: false,
      objectEmbedded: false,
      deepPenetration: true,
      grossContamination: false,
      isRusty: true, // Context only: deliberately ignored by the rules engine
      worseningPainOrSwelling: false,
      highRiskHost: false,
      tetanusStatus: 'over_5_years'
    },
    teachingPoint: 'The clinical engine routes to Same-Day Assessment based on wound depth and outdated tetanus history. Rust is recorded for context but has ZERO independent decision weight.',
    walkthrough: {
      ruleLogic: 'IF deep penetration is Yes OR high-risk host is Yes/Uncertain OR gross contamination is Yes/Uncertain OR pain/swelling is worsening, THEN apply NAIL-U01 and recommend same-day assessment.',
      excludedFactor: 'Rust = Yes is retained as context, but it is not part of the decision condition and has zero independent weight.',
      samplePatientFeedback: '“The next step is clear, but transportation to urgent care may be difficult. I now understand that wound depth and vaccine history matter—not rust by itself.”',
      sampleProviderReview: 'Disposition appropriate; essential questions asked. Consider making the tetanus timing explanation even more prominent.',
      learningOpportunity: 'Track recurring rust/tetanus confusion and access barriers. A wording change may be proposed, clinically reviewed, tested, approved and versioned before release.'
    }
  },
  {
    id: 'DEMO_B',
    title: 'Demo B: Headache Emergency (Thunderclap)',
    scenario: Scenario.HEADACHE,
    subtitle: 'Demonstrates early emergency stop red-flag detection and immediate escalation.',
    description: '42-year-old patient reports a sudden, severe headache reaching 10/10 peak intensity in less than 30 seconds.',
    presetAnswers: {
      thunderclapOnset: true // Triggers immediate early emergency stop
    },
    teachingPoint: 'Agent 1 immediately halts routine interviewing upon detecting thunderclap onset. Routes directly to 911 dispatch without asking 10 unnecessary questions.',
    walkthrough: {
      ruleLogic: 'IF thunderclap onset is Yes/Uncertain OR a major neurological red flag is Yes/Uncertain, THEN apply HEADACHE-E01, stop routine intake and recommend calling 911 immediately.',
      excludedFactor: 'The pathway does not wait for the remaining headache questions and does not name a diagnosis; delay and diagnostic speculation are intentionally avoided.',
      samplePatientFeedback: '“The instruction was clear and immediate. I understood that I should not continue answering questions or drive myself.”',
      sampleProviderReview: 'Emergency disposition appropriate; early stop appropriate; safety message concise and actionable.',
      learningOpportunity: 'Review whether the emergency wording and read-aloud experience remain understandable under stress. Safety-critical changes require human approval and testing.'
    }
  },
  {
    id: 'DEMO_C',
    title: 'Demo C: Lower-Risk Fever (Self-Care)',
    scenario: Scenario.FEVER,
    subtitle: 'Demonstrates concise safety screening, no diagnostic claims, and conservative home monitoring.',
    description: '30-year-old healthy adult with 38.2°C fever for 24 hours, mild body aches, drinking fluids well, no red flags.',
    presetAnswers: {
      severeBreathingDifficulty: false,
      unresponsiveOrSeverelyConfused: false,
      blueLipsOrFace: false,
      neckStiffnessOrSevereHeadache: false,
      nonBlanchingPurpuricRash: false,
      onChemotherapyOrNeutropenic: false,
      organOrStemCellTransplant: false,
      immunosuppressiveTherapies: false,
      unableToKeepFluidsDown: false,
      feverDuration3DaysPlus: false,
      pregnancy: false
    },
    teachingPoint: 'Clear guidance for home monitoring with explicit safety-net triggers. No medical diagnosis (e.g. "viral syndrome") is made.',
    walkthrough: {
      ruleLogic: 'After higher-severity fever rules do not match, IF no emergency warning signs or high-risk host factors are reported and the fever is short duration, THEN apply FEVER-L01 for home monitoring with a safety net.',
      excludedFactor: 'The engine does not infer “viral” or “bacterial,” and it does not ask the patient to calculate CTAS, qSOFA or SIRS.',
      samplePatientFeedback: '“Home monitoring feels realistic. I would like the three-day threshold and the signs that mean I should seek urgent care to stand out more.”',
      sampleProviderReview: 'Disposition appropriate for the synthetic facts; safety-net instructions present; no unsupported diagnosis made.',
      learningOpportunity: 'Compare clarity scores and comments about escalation thresholds. A revised safety-net summary can be tested before a governed content update.'
    }
  },
  {
    id: 'DEMO_D',
    title: 'Demo D: High-Risk Host Fever (Chemotherapy)',
    scenario: Scenario.FEVER,
    subtitle: 'Demonstrates host-risk escalation without asking patient for CTAS/qSOFA/SIRS.',
    description: '58-year-old patient currently undergoing chemotherapy for breast cancer develops a 38.5°C fever.',
    presetAnswers: {
      severeBreathingDifficulty: false,
      unresponsiveOrSeverelyConfused: false,
      blueLipsOrFace: false,
      neckStiffnessOrSevereHeadache: false,
      nonBlanchingPurpuricRash: false,
      onChemotherapyOrNeutropenic: true // High-risk host red flag
    },
    teachingPoint: 'Routes immediately to Emergency Department / Specialist protocol due to febrile neutropenia risk. Does NOT calculate or prompt the patient for qSOFA/SIRS scores.',
    walkthrough: {
      ruleLogic: 'After immediate 911 and other emergency checks do not match, IF chemotherapy/neutropenia is Yes/Uncertain OR significant immunosuppression is Yes/Uncertain, THEN apply FEVER-H01 and recommend going to the ED now.',
      excludedFactor: 'A normal-looking patient report does not lower the route. The patient is not asked to self-score CTAS, qSOFA or SIRS.',
      samplePatientFeedback: '“I understand that chemotherapy changes the urgency. I would also want a reminder to bring my oncology card and contact information.”',
      sampleProviderReview: 'ED disposition appropriate; high-risk-host logic applied; oncology context and triage communication included.',
      learningOpportunity: 'Monitor whether patients understand why host risk changes urgency. Proposed oncology wording or handoff fields remain subject to clinical review and versioned testing.'
    }
  }
];
