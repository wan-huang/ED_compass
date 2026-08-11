/**
 * ED COMPASS - Agent 1: Safety & Intake Agent
 * Academic Prototype for EMHI1001H
 * 
 * Responsibilities:
 * - Welcomes patient, obtains consent & outlines academic boundaries
 * - Administers structured intake questioning (one question at a time)
 * - Identifies emergency stop red flags immediately and interrupts routine flow
 * - Supports "I'm not sure" and answer revisions
 * - Constructs validated structured handoff JSON
 */

import { AgentVersion } from './types.js';
import { Scenario } from '../clinical/types.js';

export const INTAKE_QUESTIONS = {
  [Scenario.NAIL_PUNCTURE]: [
    {
      id: 'uncontrolledBleeding',
      label: 'Is the puncture wound bleeding heavily and failing to stop after continuous firm pressure?',
      type: 'boolean',
      isEmergencyRedFlag: true,
      category: 'Emergency Screening'
    },
    {
      id: 'numbnessOrCirculationIssue',
      label: 'Are you experiencing numbness, weakness, loss of sensation, or cold/pale skin near or below the wound?',
      type: 'boolean',
      isEmergencyRedFlag: true,
      category: 'Neurovascular Assessment'
    },
    {
      id: 'objectEmbedded',
      label: 'Is any piece of the nail or foreign object broken off and embedded deeply inside the skin or foot?',
      type: 'boolean',
      category: 'Foreign Body Assessment'
    },
    {
      id: 'deepPenetration',
      label: 'Did the puncture go deep (for example, through a shoe or boot sole into the foot)?',
      type: 'boolean',
      category: 'Wound Depth'
    },
    {
      id: 'grossContamination',
      label: 'Was the wound contaminated with soil, mud, animal or human waste, saliva, or dirty water?',
      type: 'boolean',
      category: 'Contamination'
    },
    {
      id: 'isRusty',
      label: 'Did the nail or sharp object look rusty?',
      type: 'boolean',
      category: 'Context Only — No Decision Weight'
    },
    {
      id: 'worseningPainOrSwelling',
      label: 'Is there rapidly worsening pain, swelling, or redness spreading around the wound?',
      type: 'boolean',
      category: 'Infection Risk'
    },
    {
      id: 'highRiskHost',
      label: 'Do you have diabetes, poor leg circulation, or a weakened immune system?',
      type: 'boolean',
      category: 'Host Factors'
    },
    {
      id: 'tetanusStatus',
      label: 'When did you receive your last tetanus-containing vaccine shot?',
      type: 'select',
      options: [
        { value: 'up_to_date', label: 'Within the last 5 years' },
        { value: 'over_5_years', label: 'More than 5 years ago (or >10 years ago)' },
        { value: 'never', label: 'Never received a tetanus vaccine' },
        { value: 'unknown', label: 'I do not know / Not sure' }
      ],
      category: 'Tetanus Prophylaxis'
    }
  ],
  [Scenario.HEADACHE]: [
    {
      id: 'thunderclapOnset',
      label: 'Did the headache strike suddenly like a clap of thunder, reaching maximum peak intensity within seconds or minutes?',
      type: 'boolean',
      isEmergencyRedFlag: true,
      category: 'Onset Characteristics'
    },
    {
      id: 'focalNeuroDeficit',
      label: 'Do you have sudden weakness, facial droop, numbness on one side, speech difficulty, or trouble walking?',
      type: 'boolean',
      isEmergencyRedFlag: true,
      category: 'Neurological Screening'
    },
    {
      id: 'seizureOrSyncope',
      label: 'Has there been any fainting (syncope), seizure, or severe sudden confusion?',
      type: 'boolean',
      isEmergencyRedFlag: true,
      category: 'Emergency Red Flags'
    },
    {
      id: 'feverWithStiffNeck',
      label: 'Do you have a fever AND severe neck stiffness (difficulty touching chin to chest)?',
      type: 'boolean',
      isEmergencyRedFlag: true,
      category: 'Meningeal Screening'
    },
    {
      id: 'firstWorstHeadache',
      label: 'Is this the absolute first or worst headache of your life, or completely different from past headaches?',
      type: 'boolean',
      category: 'Pattern Change'
    },
    {
      id: 'recentHeadTrauma',
      label: 'Did you have a head or neck injury recently (within the last days/weeks)?',
      type: 'boolean',
      category: 'Trauma History'
    },
    {
      id: 'anticoagulantUse',
      label: 'Are you taking blood thinner medications (such as warfarin, Eliquis, Xarelto, or high-dose aspirin)?',
      type: 'boolean',
      category: 'Medications'
    },
    {
      id: 'painfulRedEyeWithVisionLoss',
      label: 'Do you have a red, painful eye combined with sudden vision loss or halo visuals?',
      type: 'boolean',
      category: 'Visual Red Flags'
    },
    {
      id: 'immunocompromisedOrCancer',
      label: 'Do you have active cancer or a severely weakened immune system?',
      type: 'boolean',
      category: 'Host Factors'
    },
    {
      id: 'pregnancyOrPostpartum',
      label: 'Are you currently pregnant or have given birth within the past 6 weeks?',
      type: 'boolean',
      category: 'Obstetric Context'
    },
    {
      id: 'age',
      label: 'What is your age?',
      type: 'select',
      options: [
        { value: 25, label: 'Under 50 years old' },
        { value: 55, label: '50 years of age or older' }
      ],
      category: 'Demographics'
    },
    {
      id: 'newOrChangedHeadache',
      label: 'If 50 or older, is this a brand new headache type that started recently?',
      type: 'boolean',
      category: 'Age-Related Risk'
    }
  ],
  [Scenario.FEVER]: [
    {
      id: 'severeBreathingDifficulty',
      label: 'Are you having severe shortness of breath, gasping, or unable to speak full sentences?',
      type: 'boolean',
      isEmergencyRedFlag: true,
      category: 'Airway & Breathing'
    },
    {
      id: 'unresponsiveOrSeverelyConfused',
      label: 'Is the patient unusually lethargic, difficult to wake up, or severely confused?',
      type: 'boolean',
      isEmergencyRedFlag: true,
      category: 'Neurological / Mental Status'
    },
    {
      id: 'blueLipsOrFace',
      label: 'Are the lips, tongue, or face turning pale blue or gray?',
      type: 'boolean',
      isEmergencyRedFlag: true,
      category: 'Circulation / Oxygenation'
    },
    {
      id: 'isInfantUnder3Months',
      label: 'Is the patient an infant under 3 months old with a fever (temperature 38.0°C / 100.4°F or higher)?',
      type: 'boolean',
      isEmergencyRedFlag: true,
      category: 'Pediatric Red Flag'
    },
    {
      id: 'neckStiffnessOrSevereHeadache',
      label: 'Is the fever accompanied by a very stiff neck or severe intense headache?',
      type: 'boolean',
      isEmergencyRedFlag: true,
      category: 'Meningeal Screening'
    },
    {
      id: 'nonBlanchingPurpuricRash',
      label: 'Is there a new rash with dark red/purple spots that do not fade when pressed firmly with a glass?',
      type: 'boolean',
      isEmergencyRedFlag: true,
      category: 'Dermatological Emergency'
    },
    {
      id: 'onChemotherapyOrNeutropenic',
      label: 'Are you currently undergoing chemotherapy or have a known low neutrophil (white blood cell) count?',
      type: 'boolean',
      category: 'Oncology / Immunosuppression'
    },
    {
      id: 'significantImmunosuppression',
      label: 'Have you had an organ transplant, or are you taking high-dose immunosuppressive therapies?',
      type: 'boolean',
      category: 'Immune Risk'
    },
    {
      id: 'unableToKeepFluidsDown',
      label: 'Are you completely unable to keep fluids down due to persistent vomiting?',
      type: 'boolean',
      category: 'Hydration Status'
    },
    {
      id: 'durationDays',
      label: 'How many days has the fever been present?',
      type: 'select',
      options: [
        { value: 1, label: 'Less than 24 hours' },
        { value: 2, label: '1 to 2 days' },
        { value: 3, label: '3 days or longer' }
      ],
      category: 'Duration'
    },
    {
      id: 'pregnancy',
      label: 'Are you currently pregnant?',
      type: 'boolean',
      category: 'Pregnancy Status'
    }
  ]
};

export class IntakeAgent {
  /**
   * Initializes a new intake session.
   */
  static createSession(sessionId, scenario, narrative = '') {
    return {
      sessionId,
      scenario,
      narrative,
      answers: {},
      uncertainties: [],
      missingFields: [],
      currentQuestionIndex: 0,
      emergencyStopDetected: false,
      emergencyTriggerField: null,
      isCompleted: false,
      agentVersion: AgentVersion.INTAKE,
      startedAt: new Date().toISOString()
    };
  }

  /**
   * Process a question response and update state.
   */
  static answerQuestion(sessionState, fieldId, value, isUnsure = false) {
    const scenarioQuestions = INTAKE_QUESTIONS[sessionState.scenario] || [];
    const questionDef = scenarioQuestions.find(q => q.id === fieldId);

    const updatedAnswers = { ...sessionState.answers, [fieldId]: value };
    const updatedUncertainties = isUnsure 
      ? [...new Set([...sessionState.uncertainties, fieldId])] 
      : sessionState.uncertainties.filter(id => id !== fieldId);

    // Check emergency red flag condition
    let emergencyStopDetected = sessionState.emergencyStopDetected;
    let emergencyTriggerField = sessionState.emergencyTriggerField;

    // Safety-critical uncertainty is handled conservatively. A patient who
    // cannot rule out an emergency warning sign receives the same early stop
    // as a reported warning sign.
    if (questionDef && questionDef.isEmergencyRedFlag && (value === true || isUnsure)) {
      emergencyStopDetected = true;
      emergencyTriggerField = fieldId;
    }

    const nextIndex = sessionState.currentQuestionIndex + 1;
    const isCompleted = emergencyStopDetected || nextIndex >= scenarioQuestions.length;

    return {
      ...sessionState,
      answers: updatedAnswers,
      uncertainties: updatedUncertainties,
      currentQuestionIndex: nextIndex,
      emergencyStopDetected,
      emergencyTriggerField,
      isCompleted
    };
  }

  /**
   * Build the validated structured JSON handoff for Agent 2 and Clinical Rule Engine.
   */
  static buildHandoff(sessionState) {
    const scenarioQuestions = INTAKE_QUESTIONS[sessionState.scenario] || [];
    const missingFields = scenarioQuestions
      .filter(q => sessionState.answers[q.id] === undefined)
      .map(q => q.id);

    return {
      schemaVersion: '1.1',
      sessionId: sessionState.sessionId,
      scenario: sessionState.scenario,
      pathway: sessionState.scenario,
      pathwayVersion: '1.1',
      narrative: sessionState.narrative || '',
      answers: sessionState.answers,
      missingFields,
      uncertainties: sessionState.uncertainties,
      emergencyStopDetected: sessionState.emergencyStopDetected,
      emergencyTriggerField: sessionState.emergencyTriggerField,
      agentVersion: AgentVersion.INTAKE,
      uncertaintyPresent: sessionState.uncertainties.length > 0,
      completedAt: new Date().toISOString()
    };
  }
}
