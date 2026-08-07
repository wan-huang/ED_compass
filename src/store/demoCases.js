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
      grossContamination: true, // Rusty nail
      worseningPainOrSwelling: false,
      highRiskHost: false,
      tetanusStatus: 'over_5_years'
    },
    teachingPoint: 'The clinical engine routes to Same-Day Assessment based on wound depth & outdated tetanus history (>5 yrs). The rusty condition is recorded but has ZERO independent decision weight.'
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
    teachingPoint: 'Agent 1 immediately halts routine interviewing upon detecting thunderclap onset. Routes directly to 911 dispatch without asking 10 unnecessary questions.'
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
      isInfantUnder3Months: false,
      neckStiffnessOrSevereHeadache: false,
      nonBlanchingPurpuricRash: false,
      onChemotherapyOrNeutropenic: false,
      significantImmunosuppression: false,
      unableToKeepFluidsDown: false,
      durationDays: 1,
      pregnancy: false
    },
    teachingPoint: 'Clear guidance for home monitoring with explicit safety-net triggers. No medical diagnosis (e.g. "viral syndrome") is made.'
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
      isInfantUnder3Months: false,
      neckStiffnessOrSevereHeadache: false,
      nonBlanchingPurpuricRash: false,
      onChemotherapyOrNeutropenic: true // High-risk host red flag
    },
    teachingPoint: 'Routes immediately to Emergency Department / Specialist protocol due to febrile neutropenia risk. Does NOT calculate or prompt the patient for qSOFA/SIRS scores.'
  }
];
