/**
 * ED COMPASS - Headache Clinical Rules
 * Prototype Version: 1.0
 * Disclaimer: Prototype rule — requires clinical validation before real-world use.
 * 
 * IMPORTANT CLINICAL DESIGN RULE:
 * AI agents do NOT diagnose (e.g. subarachnoid hemorrhage, stroke, meningitis).
 * The rule engine evaluates red-flag criteria and routes to appropriate disposition.
 */

import { Disposition } from '../types.js';

export const HEADACHE_PATHWAY_VERSION = '1.0';

export const headacheRules = [
  {
    id: 'HEADACHE-E01',
    version: HEADACHE_PATHWAY_VERSION,
    name: 'Thunderclap Onset / Major Neurological Red Flag',
    disposition: Disposition.CALL_911_NOW,
    timing: 'Immediate',
    destinationType: 'Emergency Services (911)',
    condition: (facts) => 
      facts.thunderclapOnset === true ||
      facts.focalNeuroDeficit === true ||
      facts.seizureOrSyncope === true ||
      facts.feverWithStiffNeck === true,
    triggeredBy: (facts) => {
      const triggers = [];
      if (facts.thunderclapOnset) triggers.push('thunderclapOnset');
      if (facts.focalNeuroDeficit) triggers.push('focalNeuroDeficit');
      if (facts.seizureOrSyncope) triggers.push('seizureOrSyncope');
      if (facts.feverWithStiffNeck) triggers.push('feverWithStiffNeck');
      return triggers;
    },
    explanationKey: 'A sudden headache reaching maximum intensity within seconds or minutes (thunderclap onset), weakness/numbness/speech changes, fainting/seizure, or fever accompanied by a stiff neck are severe emergency red flags requiring immediate 911 emergency care.',
    safetyNet: [
      'Have someone stay with the patient while waiting for emergency responders.',
      'Do not give food, drink, or pain medications prior to emergency team arrival.',
      'If consciousness declines, place the person in the recovery position on their side.'
    ]
  },
  {
    id: 'HEADACHE-E02',
    version: HEADACHE_PATHWAY_VERSION,
    name: 'High-Risk Secondary Headache Red Flag',
    disposition: Disposition.GO_TO_ED_NOW,
    timing: 'Go Now',
    destinationType: 'Emergency Department',
    condition: (facts) => 
      facts.firstWorstHeadache === true ||
      facts.recentHeadTrauma === true ||
      facts.anticoagulantUse === true ||
      facts.painfulRedEyeWithVisionLoss === true ||
      facts.immunocompromisedOrCancer === true ||
      facts.pregnancyOrPostpartum === true ||
      (facts.age >= 50 && facts.newOrChangedHeadache === true),
    triggeredBy: (facts) => {
      const triggers = [];
      if (facts.firstWorstHeadache) triggers.push('firstWorstHeadache');
      if (facts.recentHeadTrauma) triggers.push('recentHeadTrauma');
      if (facts.anticoagulantUse) triggers.push('anticoagulantUse');
      if (facts.painfulRedEyeWithVisionLoss) triggers.push('painfulRedEyeWithVisionLoss');
      if (facts.immunocompromisedOrCancer) triggers.push('immunocompromisedOrCancer');
      if (facts.pregnancyOrPostpartum) triggers.push('pregnancyOrPostpartum');
      if (facts.age >= 50 && facts.newOrChangedHeadache) triggers.push('age50PlusNewHeadache');
      return triggers;
    },
    explanationKey: 'Certain high-risk context factors—such as the first or worst headache of your life, recent head injury, blood thinner medication, active cancer/immunosuppression, pregnancy/postpartum status, or a brand new headache type over age 50—warrant urgent Emergency Department evaluation.',
    safetyNet: [
      'Do not drive yourself to the Emergency Department; arrange for a driver or emergency transport.',
      'Bring a list of all current medications, including any blood thinners.',
      'Seek immediate 911 help if sudden vision loss, confusion, or weakness develops.'
    ]
  },
  {
    id: 'HEADACHE-U01',
    version: HEADACHE_PATHWAY_VERSION,
    name: 'Progressive / Subacute Secondary Warning Signs',
    disposition: Disposition.SAME_DAY_CLINICAL_ASSESSMENT,
    timing: 'Today (Within 12-24 hours)',
    destinationType: 'Urgent Care Centre / Same-Day Clinic',
    condition: (facts) => 
      facts.progressiveWorsening === true ||
      facts.positionalOnset === true ||
      facts.exertionalOnset === true ||
      facts.persistentVomiting === true,
    triggeredBy: (facts) => {
      const triggers = [];
      if (facts.progressiveWorsening) triggers.push('progressiveWorsening');
      if (facts.positionalOnset) triggers.push('positionalOnset');
      if (facts.exertionalOnset) triggers.push('exertionalOnset');
      if (facts.persistentVomiting) triggers.push('persistentVomiting');
      return triggers;
    },
    explanationKey: 'A headache that progressively worsens over days, changes significantly with posture (coughing, straining, standing), or causes persistent vomiting needs urgent same-day medical assessment.',
    safetyNet: [
      'Rest in a dark, quiet room.',
      'Stay hydrated with small sips of water if tolerated.',
      'Escalate to the Emergency Department immediately if you experience thunderclap onset or neurological symptoms.'
    ]
  },
  {
    id: 'HEADACHE-L01',
    version: HEADACHE_PATHWAY_VERSION,
    name: 'Primary / Routine Low-Risk Headache Pattern',
    disposition: Disposition.HOME_MONITOR_WITH_SAFETY_NET,
    timing: 'Monitor at home',
    destinationType: 'Self-Care at Home / Primary Care',
    condition: (facts) => 
      facts.thunderclapOnset !== true &&
      facts.focalNeuroDeficit !== true &&
      facts.seizureOrSyncope !== true &&
      facts.feverWithStiffNeck !== true &&
      facts.firstWorstHeadache !== true &&
      facts.recentHeadTrauma !== true &&
      facts.anticoagulantUse !== true,
    triggeredBy: () => ['routine_headache_pattern_no_red_flags'],
    explanationKey: 'The screening did not identify emergency red flags based on your reported symptoms.',
    safetyNet: [
      'Rest in a cool, quiet, dark room.',
      'Consider over-the-counter pain relievers if appropriate for your personal health history.',
      'Maintain regular hydration and sleep schedule.',
      'Escalate immediately if the headache suddenly becomes severe ("thunderclap"), or if you experience weakness, vision loss, neck stiffness, or confusion.'
    ]
  }
];
