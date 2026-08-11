/**
 * ED COMPASS - Nail Puncture Clinical Rules
 * Prototype Version: 1.0
 * Disclaimer: Prototype rule — requires clinical validation before real-world use.
 * 
 * IMPORTANT CLINICAL DESIGN RULE:
 * Rust has ZERO independent decision weight. Tetanus prophylaxis depends on wound
 * characteristics (clean/dirty/deep) and immunization history (time since last dose), NOT rust.
 */

import { Disposition } from '../types.js';

export const NAIL_PUNCTURE_PATHWAY_VERSION = '1.1';

export const nailPunctureRules = [
  {
    id: 'NAIL-E01',
    version: NAIL_PUNCTURE_PATHWAY_VERSION,
    name: 'Uncontrolled Bleeding / Massive Trauma',
    disposition: Disposition.CALL_911_NOW,
    timing: 'Immediate',
    destinationType: 'Emergency Services (911)',
    condition: (facts) => facts.uncontrolledBleeding === true || facts.uncontrolledBleeding === null,
    triggeredBy: ['uncontrolledBleeding'],
    explanationKey: 'Uncontrolled severe bleeding from a puncture wound requires immediate emergency care.',
    safetyNet: [
      'Apply firm, continuous pressure with a clean cloth or bandage.',
      'Keep the injured extremity elevated if possible.',
      'Do not attempt to apply a tourniquet unless instructed by a emergency call dispatcher.'
    ]
  },
  {
    id: 'NAIL-E02',
    version: NAIL_PUNCTURE_PATHWAY_VERSION,
    name: 'Vascular / Nerve Compromise or Retained Foreign Body Deep',
    disposition: Disposition.GO_TO_ED_NOW,
    timing: 'Go Now',
    destinationType: 'Emergency Department',
    condition: (facts) => 
      facts.numbnessOrCirculationIssue === true ||
      facts.numbnessOrCirculationIssue === null ||
      facts.objectEmbedded === true ||
      facts.objectEmbedded === null ||
      facts.severeSpreadingInfection === true,
    triggeredBy: (facts) => {
      const triggers = [];
      if (facts.numbnessOrCirculationIssue === true || facts.numbnessOrCirculationIssue === null) triggers.push('numbnessOrCirculationIssue');
      if (facts.objectEmbedded === true || facts.objectEmbedded === null) triggers.push('objectEmbedded');
      if (facts.severeSpreadingInfection) triggers.push('severeSpreadingInfection');
      return triggers;
    },
    explanationKey: 'Numbness, coldness/discoloration, an embedded object (e.g. nail broken off in foot), or rapid spreading redness indicates potential nerve/vascular involvement or retained foreign body needing immediate Emergency Department evaluation.',
    safetyNet: [
      'Do not try to remove a deeply embedded object yourself as it may cause severe bleeding.',
      'Avoid bearing weight on the affected foot.',
      'If you notice spreading redness with red streaks traveling up the leg, seek emergency care without delay.'
    ]
  },
  {
    id: 'NAIL-U01',
    version: NAIL_PUNCTURE_PATHWAY_VERSION,
    name: 'Deep Puncture / High-Risk Host / Dirty Contamination',
    disposition: Disposition.SAME_DAY_CLINICAL_ASSESSMENT,
    timing: 'Today (Within 12-24 hours)',
    destinationType: 'Urgent Care Centre / Same-Day Clinic',
    condition: (facts) => 
      facts.deepPenetration === true ||
      facts.deepPenetration === null ||
      facts.highRiskHost === true ||
      facts.highRiskHost === null ||
      facts.grossContamination === true ||
      facts.grossContamination === null ||
      facts.worseningPainOrSwelling === true,
    triggeredBy: (facts) => {
      const triggers = [];
      if (facts.deepPenetration) triggers.push('deepPenetration');
      if (facts.highRiskHost) triggers.push('highRiskHost');
      if (facts.grossContamination) triggers.push('grossContamination');
      if (facts.worseningPainOrSwelling) triggers.push('worseningPainOrSwelling');
      if (['over_5_years', 'unknown', 'never'].includes(facts.tetanusStatus)) triggers.push('tetanusStatus');
      return triggers;
    },
    explanationKey: 'Deep puncture wounds (especially through footwear into bone/joint), gross contamination (soil/manure), worsening local pain, or high-risk medical conditions (diabetes, immunosuppression) require urgent medical evaluation for infection prevention and joint/bone surveillance.',
    safetyNet: [
      'Clean the superficial wound gently with mild soap and water.',
      'Elevate the foot while resting.',
      'Escalate to the Emergency Department immediately if you develop high fever, chills, or rapidly expanding redness.'
    ]
  },
  {
    id: 'NAIL-T01',
    version: NAIL_PUNCTURE_PATHWAY_VERSION,
    name: 'Tetanus Immunization Assessment Needed',
    disposition: Disposition.CONTACT_811_OR_PRIMARY_CARE,
    timing: 'Within 24-48 hours',
    destinationType: 'Primary Care / Clinic / HealthLink BC 8-1-1',
    condition: (facts) => 
      facts.tetanusStatus === 'over_5_years' ||
      facts.tetanusStatus === 'unknown' ||
      facts.tetanusStatus === 'never',
    triggeredBy: (facts) => ['tetanusStatus'],
    explanationKey: 'Your tetanus vaccination status is unknown, outdated (>5 years for a dirty/puncture wound), or incomplete. Clinical guidelines recommend a booster shot within 48 hours for puncture wounds.',
    safetyNet: [
      'Contact your primary care clinic, public health clinic, or 8-1-1 to check vaccine records.',
      'Keep the wound clean and covered with a dry sterile dressing.',
      'Monitor twice daily for signs of infection (pus, warmth, increasing pain).'
    ]
  },
  {
    id: 'NAIL-L01',
    version: NAIL_PUNCTURE_PATHWAY_VERSION,
    name: 'Superficial Low-Risk Puncture with Up-to-Date Tetanus',
    disposition: Disposition.HOME_MONITOR_WITH_SAFETY_NET,
    timing: 'Monitor at home',
    destinationType: 'Self-Care at Home',
    condition: (facts) => 
      facts.tetanusStatus === 'up_to_date' &&
      facts.deepPenetration !== true &&
      facts.objectEmbedded !== true &&
      facts.uncontrolledBleeding !== true &&
      facts.numbnessOrCirculationIssue !== true &&
      facts.highRiskHost !== true,
    triggeredBy: () => ['superficial_wound_up_to_date_tetanus'],
    explanationKey: 'The puncture appears superficial without emergency signs, and your tetanus vaccination is up-to-date (within the past 5-10 years).',
    safetyNet: [
      'Wash gently with warm water and soap for 5 minutes.',
      'Apply plain petroleum jelly or antibiotic ointment and cover with a sterile bandage.',
      'Watch for warning signs over the next 7 days: worsening redness, warmth, swelling, pus drainage, or fever.'
    ]
  }
];
