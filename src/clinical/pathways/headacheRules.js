/**
 * ED COMPASS - Headache Clinical Rules
 * Prototype Version: 1.2
 * Disclaimer: Prototype rule — requires clinical validation before real-world use.
 * 
 * IMPORTANT CLINICAL DESIGN RULE:
 * AI agents do NOT diagnose (e.g. subarachnoid hemorrhage, stroke, meningitis).
 * The rule engine evaluates red-flag criteria and routes to appropriate disposition.
 */

import { Disposition } from '../types.js';

export const HEADACHE_PATHWAY_VERSION = '1.2';

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
      if (facts.thunderclapOnset === true) triggers.push('thunderclapOnset');
      if (facts.focalNeuroDeficit === true) triggers.push('focalNeuroDeficit');
      if (facts.seizureOrSyncope === true) triggers.push('seizureOrSyncope');
      if (facts.feverWithStiffNeck === true) triggers.push('feverWithStiffNeck');
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
    name: 'High-Risk Secondary Headache Red Flag / Anticoagulation Combination',
    disposition: Disposition.GO_TO_ED_NOW,
    timing: 'Go Now',
    destinationType: 'Emergency Department',
    condition: (facts) => 
      facts.firstWorstHeadache === true ||
      facts.recentHeadTrauma === true ||
      facts.painfulRedEyeWithVisionLoss === true ||
      (facts.age >= 50 && facts.newOrChangedHeadache === true) ||
      (facts.anticoagulantUse === true && (
        facts.recentHeadTrauma === true ||
        facts.persistentVomiting === true ||
        facts.firstWorstHeadache === true ||
        facts.newOrChangedHeadache === true
      )),
    triggeredBy: (facts) => {
      const triggers = [];
      if (facts.firstWorstHeadache === true) triggers.push('firstWorstHeadache');
      if (facts.recentHeadTrauma === true) triggers.push('recentHeadTrauma');
      if (facts.painfulRedEyeWithVisionLoss === true) triggers.push('painfulRedEyeWithVisionLoss');
      if (facts.age >= 50 && facts.newOrChangedHeadache === true) triggers.push('age50PlusNewHeadache');
      if (facts.anticoagulantUse === true && facts.recentHeadTrauma === true) triggers.push('anticoagulantUse_plus_headTrauma');
      if (facts.anticoagulantUse === true && facts.persistentVomiting === true) triggers.push('anticoagulantUse_plus_vomiting');
      if (facts.anticoagulantUse === true && (facts.firstWorstHeadache === true || facts.newOrChangedHeadache === true)) triggers.push('anticoagulantUse_plus_newWorstHeadache');
      return triggers;
    },
    explanationKey: 'Certain high-risk context factors—such as the first or worst headache of your life, recent head injury, blood thinner combined with trauma or vomiting, or a brand new headache type over age 50—warrant urgent Emergency Department evaluation.',
    safetyNet: [
      'Do not drive yourself to the Emergency Department; arrange for a driver or emergency transport.',
      'Bring a list of all current medications, including any blood thinners.',
      'Seek immediate 911 help if sudden vision loss, confusion, or weakness develops.'
    ]
  },
  {
    id: 'HEADACHE-U01',
    version: HEADACHE_PATHWAY_VERSION,
    name: 'Same-Day Urgent Care Assessment / Anticoagulated / Immunocompromised / Obstetric Context',
    disposition: Disposition.SAME_DAY_CLINICAL_ASSESSMENT,
    timing: 'Today (Within 12-24 hours)',
    destinationType: 'Urgent Care Centre / Same-Day Clinic',
    condition: (facts) => 
      facts.anticoagulantUse === true ||
      facts.immunocompromisedOrCancer === true ||
      facts.pregnancyOrPostpartum === true ||
      facts.progressiveWorsening === true ||
      facts.positionalOnset === true ||
      facts.exertionalOnset === true ||
      facts.persistentVomiting === true,
    triggeredBy: (facts) => {
      const triggers = [];
      if (facts.anticoagulantUse === true) triggers.push('anticoagulantUse');
      if (facts.immunocompromisedOrCancer === true) triggers.push('immunocompromisedOrCancer');
      if (facts.pregnancyOrPostpartum === true) triggers.push('pregnancyOrPostpartum');
      if (facts.progressiveWorsening === true) triggers.push('progressiveWorsening');
      if (facts.positionalOnset === true) triggers.push('positionalOnset');
      if (facts.exertionalOnset === true) triggers.push('exertionalOnset');
      if (facts.persistentVomiting === true) triggers.push('persistentVomiting');
      return triggers;
    },
    explanationKey: 'Taking blood thinners without major trauma, active cancer/immunosuppression, pregnancy/postpartum status, or a headache that progressively worsens or causes persistent vomiting requires same-day urgent care assessment.',
    safetyNet: [
      'Rest in a dark, quiet room.',
      'Stay hydrated with small sips of water if tolerated.',
      'Escalate to the Emergency Department immediately if you experience thunderclap onset, head trauma, vomiting while on blood thinners, or neurological symptoms.'
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
      facts.painfulRedEyeWithVisionLoss !== true &&
      facts.anticoagulantUse !== true &&
      facts.immunocompromisedOrCancer !== true &&
      facts.pregnancyOrPostpartum !== true,
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
