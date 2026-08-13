/**
 * ED COMPASS - Fever Clinical Rules
 * Prototype Version: 1.2
 * Disclaimer: Prototype rule — requires clinical validation before real-world use.
 * 
 * IMPORTANT CLINICAL DESIGN RULE:
 * Patients must NOT self-report CTAS, qSOFA, or SIRS scores.
 * The rule engine does NOT diagnose etiology (e.g. viral vs bacterial infection).
 */

import { Disposition } from '../types.js';

export const FEVER_PATHWAY_VERSION = '1.2';

export const feverRules = [
  {
    id: 'FEVER-E01',
    version: FEVER_PATHWAY_VERSION,
    name: 'Severe Respiratory Distress / Shock / Lethargy',
    disposition: Disposition.CALL_911_NOW,
    timing: 'Immediate',
    destinationType: 'Emergency Services (911)',
    condition: (facts) => 
      facts.severeBreathingDifficulty === true ||
      facts.unresponsiveOrSeverelyConfused === true ||
      facts.blueLipsOrFace === true,
    triggeredBy: (facts) => {
      const triggers = [];
      if (facts.severeBreathingDifficulty === true) triggers.push('severeBreathingDifficulty');
      if (facts.unresponsiveOrSeverelyConfused === true) triggers.push('unresponsiveOrSeverelyConfused');
      if (facts.blueLipsOrFace === true) triggers.push('blueLipsOrFace');
      return triggers;
    },
    explanationKey: 'Severe respiratory distress (gasping, unable to speak full words), severe confusion/lethargy, or blue lips/skin indicate critical physiological instability requiring emergency dispatch.',
    safetyNet: [
      'Call 911 immediately and keep the patient calm and sitting upright.',
      'Ensure the entrance to your home is clear for paramedics.',
      'Do not attempt to feed or administer oral liquids if mental status is altered.'
    ]
  },
  {
    id: 'FEVER-E02',
    version: FEVER_PATHWAY_VERSION,
    name: 'Meningeal Sign / Concerning Rash',
    disposition: Disposition.GO_TO_ED_NOW,
    timing: 'Go Now',
    destinationType: 'Emergency Department',
    condition: (facts) => 
      facts.neckStiffnessOrSevereHeadache === true ||
      facts.nonBlanchingPurpuricRash === true ||
      facts.severeRapidDeterioration === true,
    triggeredBy: (facts) => {
      const triggers = [];
      if (facts.neckStiffnessOrSevereHeadache === true) triggers.push('neckStiffnessOrSevereHeadache');
      if (facts.nonBlanchingPurpuricRash === true) triggers.push('nonBlanchingPurpuricRash');
      if (facts.severeRapidDeterioration === true) triggers.push('severeRapidDeterioration');
      return triggers;
    },
    explanationKey: 'Fever with neck stiffness/photophobia, a dark purple non-fading rash, or rapid systemic collapse require urgent Emergency Department evaluation.',
    safetyNet: [
      'Transport directly to the nearest Emergency Department.',
      'Keep patient comfortable and monitor breathing closely during travel.',
      'If skin color changes or lethargy worsens, call 911 immediately.'
    ]
  },
  {
    id: 'FEVER-H01',
    version: FEVER_PATHWAY_VERSION,
    name: 'High-Risk Host / Neutropenia / Chemotherapy / Transplant / Immunosuppression',
    disposition: Disposition.GO_TO_ED_NOW,
    timing: 'Go Now (Specialist Protocol)',
    destinationType: 'Emergency Department / Cancer Centre On-Call',
    condition: (facts) => 
      facts.onChemotherapyOrNeutropenic === true ||
      facts.organOrStemCellTransplant === true ||
      facts.immunosuppressiveTherapies === true ||
      facts.significantImmunosuppression === true ||
      facts.organTransplantOrBiologic === true,
    triggeredBy: (facts) => {
      const triggers = [];
      if (facts.onChemotherapyOrNeutropenic === true) triggers.push('onChemotherapyOrNeutropenic');
      if (facts.organOrStemCellTransplant === true) triggers.push('organOrStemCellTransplant');
      if (facts.immunosuppressiveTherapies === true) triggers.push('immunosuppressiveTherapies');
      if (facts.significantImmunosuppression === true) triggers.push('significantImmunosuppression');
      if (facts.organTransplantOrBiologic === true) triggers.push('organTransplantOrBiologic');
      return triggers;
    },
    explanationKey: 'Patients receiving chemotherapy, organ/stem-cell transplant recipients, or individuals taking high-dose immunosuppressive therapies with a fever require immediate emergency medical assessment due to high risk of rapid infection progression.',
    safetyNet: [
      'Bring your oncology/transplant emergency wallet card or clinic contact numbers.',
      'Inform ED triage staff immediately upon arrival that you are an immunocompromised/chemotherapy/transplant patient.',
      'Wear a surgical mask in waiting areas.'
    ]
  },
  {
    id: 'FEVER-U01',
    version: FEVER_PATHWAY_VERSION,
    name: 'Dehydration Risk / Prolonged Fever (3+ Days) / Primary Care Assessment',
    disposition: Disposition.SAME_DAY_CLINICAL_ASSESSMENT,
    timing: 'Today (Within 12-24 hours)',
    destinationType: 'Urgent Care Centre / Family Doctor / Same-Day Clinic',
    condition: (facts) => 
      facts.unableToKeepFluidsDown === true ||
      facts.feverDuration3DaysPlus === true ||
      (facts.durationDays || 0) >= 3 ||
      facts.severeLocalizingPain === true ||
      facts.pregnancy === true,
    triggeredBy: (facts) => {
      const triggers = [];
      if (facts.unableToKeepFluidsDown === true) triggers.push('unableToKeepFluidsDown');
      if (facts.feverDuration3DaysPlus === true || (facts.durationDays || 0) >= 3) triggers.push('feverDuration3DaysPlus');
      if (facts.severeLocalizingPain === true) triggers.push('severeLocalizingPain');
      if (facts.pregnancy === true) triggers.push('pregnancy');
      return triggers;
    },
    explanationKey: 'A fever lasting 3 days or longer warrants medical evaluation by your family doctor or primary care provider, as well as inability to stay hydrated due to persistent vomiting or pregnancy with fever.',
    safetyNet: [
      'Contact your family doctor or primary care clinic to arrange an assessment.',
      'Take frequent small sips of oral rehydration solution or clear fluids.',
      'Rest in a cool environment.',
      'Escalate to the Emergency Department if confusion, shortness of breath, or dark purple spots appear on the skin.'
    ]
  },
  {
    id: 'FEVER-L01',
    version: FEVER_PATHWAY_VERSION,
    name: 'Uncomplicated Short-Duration Fever in Low-Risk Host',
    disposition: Disposition.HOME_MONITOR_WITH_SAFETY_NET,
    timing: 'Monitor at home',
    destinationType: 'Self-Care at Home / Primary Care',
    condition: (facts) => 
      facts.severeBreathingDifficulty !== true &&
      facts.unresponsiveOrSeverelyConfused !== true &&
      facts.neckStiffnessOrSevereHeadache !== true &&
      facts.onChemotherapyOrNeutropenic !== true &&
      facts.organOrStemCellTransplant !== true &&
      facts.immunosuppressiveTherapies !== true &&
      facts.feverDuration3DaysPlus !== true &&
      (facts.durationDays || 0) < 3,
    triggeredBy: () => ['uncomplicated_short_duration_fever'],
    explanationKey: 'The short safety screen did not identify an emergency warning sign based on your reported symptoms.',
    safetyNet: [
      'Rest adequately and drink plenty of fluids (water, broth, diluted juices).',
      'Use over-the-counter fever reducers (acetaminophen or ibuprofen) if appropriate for your health history.',
      'Monitor temperature and symptom progression.',
      'Contact your family doctor, primary care clinic, or 8-1-1 if fever persists for 3 days or longer or if new warning signs develop.'
    ]
  }
];
