/**
 * ED COMPASS - Agent 2: Care Navigation Agent
 * Academic Prototype for EMHI1001H
 * 
 * CRITICAL SAFETY RULES:
 * 1. Agent 2 receives ONLY the validated handoff facts and rule-engine result.
 * 2. Agent 2 MUST NOT override the disposition computed by the deterministic clinical engine.
 * 3. Agent 2 MUST NOT diagnose conditions (e.g. subarachnoid hemorrhage, tetanus, sepsis, COVID).
 * 4. Explains recommended level of care, triggering facts, and safety net in plain, clear language.
 */

import { AgentVersion } from './types.js';
import { Disposition } from '../clinical/types.js';

export class NavigationAgent {
  /**
   * Generates patient explanation based on deterministic rule engine output.
   */
  static generatePatientExplanation(handoff, ruleResult) {
    // Strict safety check: Never allow null rule engine output
    if (!ruleResult || !ruleResult.disposition) {
      throw new Error('[NavigationAgent] Invalid rule result received. Cannot generate navigation advice.');
    }

    const disposition = ruleResult.disposition;
    const ruleId = ruleResult.ruleId;
    const ruleVersion = ruleResult.ruleVersion;

    let headline = '';
    let summaryText = '';
    let nextStepActions = [];
    let mandatoryDisclaimer = 'ED Compass is an academic prototype for EMHI1001H and does NOT diagnose patients. This recommendation is based on a deterministic clinical protocol.';

    switch (disposition) {
      case Disposition.CALL_911_NOW:
        headline = 'Call 911 Immediately';
        summaryText = ruleResult.explanationKey || 'Your reported symptoms include a severe emergency warning sign requiring immediate emergency assistance.';
        nextStepActions = [
          'Call 911 right now or ask someone nearby to call for you.',
          'Stay calm and sit or lie down in a safe position.',
          'Do not attempt to drive yourself to the hospital.'
        ];
        break;

      case Disposition.GO_TO_ED_NOW:
        headline = 'Go to the Nearest Emergency Department';
        summaryText = ruleResult.explanationKey || 'Your reported symptoms indicate an urgent concern that requires immediate emergency department evaluation.';
        nextStepActions = [
          'Go directly to the nearest hospital Emergency Department.',
          'Have a family member, friend, or taxi drive you.',
          'Do not drive yourself if you are feeling unwell, dizzy, or in severe pain.'
        ];
        break;

      case Disposition.SAME_DAY_CLINICAL_ASSESSMENT:
        headline = 'Seek Same-Day Clinical Assessment';
        summaryText = ruleResult.explanationKey || 'Your symptoms warrant medical evaluation today at an urgent care centre or same-day clinic.';
        nextStepActions = [
          'Visit an Urgent Care Centre or contact your primary care clinic for a same-day appointment.',
          'Bring your identification and current medication list.',
          'Review the safety-net triggers below while awaiting your appointment.'
        ];
        break;

      case Disposition.CONTACT_811_OR_PRIMARY_CARE:
        headline = 'Contact Primary Care or HealthLink BC 8-1-1';
        summaryText = ruleResult.explanationKey || 'Your condition does not show emergency warning signs, but health guidance or non-urgent assessment is recommended.';
        nextStepActions = [
          'Call HealthLink BC at 8-1-1 (free 24/7 registered nurse consultation).',
          'Or schedule an appointment with your family physician / nurse practitioner.',
          'Keep your wound clean and dry (if applicable).'
        ];
        break;

      case Disposition.HOME_MONITOR_WITH_SAFETY_NET:
        headline = 'Home Monitoring with Safety Net';
        summaryText = ruleResult.explanationKey || 'The intake screen did not identify emergency warning signs. You can safely monitor your symptoms at home.';
        nextStepActions = [
          'Rest, stay well hydrated, and follow general self-care principles.',
          'Monitor your symptoms closely over the next 24 to 72 hours.',
          'Follow the safety-net instructions below if your condition changes.'
        ];
        break;

      default:
        headline = 'Consult Healthcare Professional';
        summaryText = ruleResult.explanationKey || 'Please consult a healthcare provider for medical guidance.';
        nextStepActions = ['Contact 8-1-1 or visit your primary care provider.'];
    }

    // Key triggering facts description
    const triggeringFactsFormatted = (ruleResult.triggeredBy || [])
      .map(factKey => formatFactKey(factKey, handoff.answers))
      .filter(Boolean);

    return {
      agentVersion: AgentVersion.NAVIGATION,
      disposition: ruleResult.disposition,
      ruleId: ruleId,
      ruleVersion: ruleVersion,
      headline,
      summaryText,
      triggeringFactsFormatted,
      nextStepActions,
      safetyNetInstructions: ruleResult.safetyNet || [],
      mandatoryDisclaimer,
      conceptualHandoffWarning: 'Conceptual handoff only—no information has been transmitted.'
    };
  }
}

function formatFactKey(factKey, answers) {
  const map = {
    uncontrolledBleeding: 'Uncontrolled bleeding',
    numbnessOrCirculationIssue: 'Numbness or circulation concern',
    objectEmbedded: 'Embedded foreign object',
    severeSpreadingInfection: 'Spreading redness/infection',
    deepPenetration: 'Deep puncture wound',
    highRiskHost: 'Medical condition affecting healing/immune system',
    grossContamination: 'Gross wound contamination',
    worseningPainOrSwelling: 'Rapidly worsening pain or swelling',
    tetanusStatus: `Tetanus vaccination status (${answers?.tetanusStatus || 'unknown'})`,
    thunderclapOnset: 'Sudden "thunderclap" headache onset',
    focalNeuroDeficit: 'Neurological symptoms (weakness/speech/numbness)',
    seizureOrSyncope: 'Seizure or fainting episode',
    feverWithStiffNeck: 'Fever accompanied by stiff neck',
    firstWorstHeadache: 'First or worst headache of life',
    recentHeadTrauma: 'Recent head injury',
    anticoagulantUse: 'Blood thinner medication use',
    painfulRedEyeWithVisionLoss: 'Painful red eye with vision changes',
    immunocompromisedOrCancer: 'History of cancer or immunosuppression',
    pregnancyOrPostpartum: 'Pregnancy or recent delivery',
    age50PlusNewHeadache: 'New headache onset at age 50+',
    progressiveWorsening: 'Progressive worsening headache',
    positionalOnset: 'Positional/straining headache onset',
    persistentVomiting: 'Persistent vomiting',
    severeBreathingDifficulty: 'Severe breathing difficulty',
    unresponsiveOrSeverelyConfused: 'Severe confusion or unresponsiveness',
    blueLipsOrFace: 'Blue lips or facial discoloration',
    isInfantUnder3Months: 'Infant under 3 months old',
    neckStiffnessOrSevereHeadache: 'Neck stiffness with fever',
    nonBlanchingPurpuricRash: 'Dark purple non-fading rash',
    severeRapidDeterioration: 'Rapid systemic deterioration',
    onChemotherapyOrNeutropenic: 'Chemotherapy or low white blood count (neutropenia)',
    significantImmunosuppression: 'Organ transplant / significant immunosuppression',
    unableToKeepFluidsDown: 'Inability to keep fluids down',
    durationDaysGe3: 'Fever present for 3+ days',
    severeLocalizingPain: 'Severe localized pain',
    pregnancy: 'Pregnancy with fever'
  };

  return map[factKey] || factKey.replace(/([A-Z])/g, ' $1').toLowerCase();
}
