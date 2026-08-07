/**
 * ED COMPASS - Fever Clinical Rules
 * Prototype Version: 1.0
 * Disclaimer: Prototype rule — requires clinical validation before real-world use.
 * 
 * IMPORTANT CLINICAL DESIGN RULE:
 * Patients must NOT self-report CTAS, qSOFA, or SIRS scores.
 * The rule engine does NOT diagnose etiology (e.g. viral vs bacterial infection).
 */

import { Disposition } from '../types.js';

export const FEVER_PATHWAY_VERSION = '1.0';

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
      if (facts.severeBreathingDifficulty) triggers.push('severeBreathingDifficulty');
      if (facts.unresponsiveOrSeverelyConfused) triggers.push('unresponsiveOrSeverelyConfused');
      if (facts.blueLipsOrFace) triggers.push('blueLipsOrFace');
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
    name: 'Infant / Meningeal Sign / Concerning Rash',
    disposition: Disposition.GO_TO_ED_NOW,
    timing: 'Go Now',
    destinationType: 'Emergency Department',
    condition: (facts) => 
      facts.isInfantUnder3Months === true ||
      facts.neckStiffnessOrSevereHeadache === true ||
      facts.nonBlanchingPurpuricRash === true ||
      facts.severeRapidDeterioration === true,
    triggeredBy: (facts) => {
      const triggers = [];
      if (facts.isInfantUnder3Months) triggers.push('isInfantUnder3Months');
      if (facts.neckStiffnessOrSevereHeadache) triggers.push('neckStiffnessOrSevereHeadache');
      if (facts.nonBlanchingPurpuricRash) triggers.push('nonBlanchingPurpuricRash');
      if (facts.severeRapidDeterioration) triggers.push('severeRapidDeterioration');
      return triggers;
    },
    explanationKey: 'Fever in a young infant (<3 months), fever with neck stiffness/photophobia, a dark purple non-fading rash, or rapid systemic collapse require urgent Emergency Department evaluation.',
    safetyNet: [
      'Transport directly to the nearest Emergency Department.',
      'Keep infant comfortable and monitor breathing closely during travel.',
      'If skin color changes or lethargy worsens, call 911 immediately.'
    ]
  },
  {
    id: 'FEVER-H01',
    version: FEVER_PATHWAY_VERSION,
    name: 'High-Risk Host / Neutropenia / Chemotherapy',
    disposition: Disposition.GO_TO_ED_NOW,
    timing: 'Go Now (Specialist Protocol)',
    destinationType: 'Emergency Department / Cancer Centre On-Call',
    condition: (facts) => 
      facts.onChemotherapyOrNeutropenic === true ||
      facts.significantImmunosuppression === true ||
      facts.organTransplantOrBiologic === true,
    triggeredBy: (facts) => {
      const triggers = [];
      if (facts.onChemotherapyOrNeutropenic) triggers.push('onChemotherapyOrNeutropenic');
      if (facts.significantImmunosuppression) triggers.push('significantImmunosuppression');
      if (facts.organTransplantOrBiologic) triggers.push('organTransplantOrBiologic');
      return triggers;
    },
    explanationKey: 'Patients undergoing chemotherapy, organ transplant recipients, or individuals with severe immunosuppression with a fever require immediate emergency medical assessment due to high risk of rapid infection progression.',
    safetyNet: [
      'Bring your oncology/transplant emergency wallet card or clinic contact numbers.',
      'Inform ED triage staff immediately upon arrival that you are an immunocompromised/chemotherapy patient.',
      'Wear a surgical mask in waiting areas.'
    ]
  },
  {
    id: 'FEVER-U01',
    version: FEVER_PATHWAY_VERSION,
    name: 'Dehydration Risk / Prolonged Fever / Severe Localizing Pain',
    disposition: Disposition.SAME_DAY_CLINICAL_ASSESSMENT,
    timing: 'Today (Within 12-24 hours)',
    destinationType: 'Urgent Care Centre / Same-Day Clinic',
    condition: (facts) => 
      facts.unableToKeepFluidsDown === true ||
      (facts.durationDays || 0) >= 3 ||
      facts.severeLocalizingPain === true ||
      facts.pregnancy === true,
    triggeredBy: (facts) => {
      const triggers = [];
      if (facts.unableToKeepFluidsDown) triggers.push('unableToKeepFluidsDown');
      if (facts.durationDays >= 3) triggers.push('durationDaysGe3');
      if (facts.severeLocalizingPain) triggers.push('severeLocalizingPain');
      if (facts.pregnancy) triggers.push('pregnancy');
      return triggers;
    },
    explanationKey: 'A fever lasting 3+ days, inability to stay hydrated due to persistent vomiting, pregnancy with fever, or severe localized pain (e.g. flank/kidney pain) requires same-day medical assessment.',
    safetyNet: [
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
      facts.isInfantUnder3Months !== true &&
      facts.neckStiffnessOrSevereHeadache !== true &&
      facts.onChemotherapyOrNeutropenic !== true,
    triggeredBy: () => ['uncomplicated_short_duration_fever'],
    explanationKey: 'The short safety screen did not identify an emergency warning sign based on your reported symptoms.',
    safetyNet: [
      'Rest adequately and drink plenty of fluids (water, broth, diluted juices).',
      'Use over-the-counter fever reducers (acetaminophen or ibuprofen) if appropriate for your health history.',
      'Monitor temperature and symptom progression.',
      'Contact primary care or 8-1-1 if fever persists beyond 3 days or if new warning signs develop.'
    ]
  }
];
