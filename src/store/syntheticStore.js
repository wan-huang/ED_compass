/**
 * ED COMPASS - Synthetic Encounter & Governance Store
 * Academic Prototype for EMHI1001H
 * 
 * Pre-seeds realistic synthetic encounters for classroom demonstration,
 * manages local storage persistence, calculates top metrics, and supports
 * staff review & governed improvement workflows.
 */

import { Scenario, Disposition } from '../clinical/types.js';
import { FeedbackTheme, ImprovementStatus } from '../agents/types.js';

const ENCOUNTERS_STORAGE_KEY = 'ed_compass_synthetic_encounters';
const IMPROVEMENTS_STORAGE_KEY = 'ed_compass_improvement_items';

// Pre-seeded realistic synthetic encounters
const SEEDED_ENCOUNTERS = [
  {
    sessionId: 'syn-session-101',
    scenario: Scenario.HEADACHE,
    disposition: Disposition.CALL_911_NOW,
    ruleId: 'HEADACHE-E01',
    ruleVersion: '1.0',
    answers: { thunderclapOnset: true },
    ruleResult: {
      disposition: Disposition.CALL_911_NOW,
      ruleId: 'HEADACHE-E01',
      ruleVersion: '1.0',
      ruleName: 'Thunderclap Onset Red Flag',
      triggeredBy: ['thunderclapOnset'],
      explanationKey: 'Thunderclap headache onset requires emergency 911 dispatch.'
    },
    patientFeedback: {
      clarityScore: 5,
      trustScore: 5,
      confidenceScore: 5,
      canFollow: 'yes',
      accessBarrier: '',
      isNextStepClear: true,
      knowsEscalation: true,
      confusingItems: '',
      comments: 'Appreciated the fast 911 alert without wasting time.',
      submittedAt: '2026-08-05T10:15:00Z'
    },
    feedbackAnalysis: {
      classifiedTheme: FeedbackTheme.GENERAL_POSITIVE,
      isSafetyConcern: false,
      feedbackStream: 'PATIENT_EXPERIENCE'
    },
    staffReview: {
      status: 'COMPLETED',
      dispositionAppropriate: 'YES',
      essentialQuestionsAsked: 'YES',
      explanationClear: 'YES',
      reviewerNotes: 'Perfect emergency stop handling.',
      reviewedAt: '2026-08-05T14:20:00Z'
    },
    createdAt: '2026-08-05T10:12:00Z'
  },
  {
    sessionId: 'syn-session-102',
    scenario: Scenario.NAIL_PUNCTURE,
    disposition: Disposition.SAME_DAY_CLINICAL_ASSESSMENT,
    ruleId: 'NAIL-U01',
    ruleVersion: '1.0',
    answers: { deepPenetration: true, grossContamination: false, isRusty: true, tetanusStatus: 'over_5_years' },
    ruleResult: {
      disposition: Disposition.SAME_DAY_CLINICAL_ASSESSMENT,
      ruleId: 'NAIL-U01',
      ruleVersion: '1.0',
      ruleName: 'Deep Puncture / Tetanus Review',
      triggeredBy: ['deepPenetration', 'grossContamination'],
      explanationKey: 'Deep puncture wound requires same-day clinical assessment for tetanus booster.'
    },
    patientFeedback: {
      clarityScore: 4,
      trustScore: 4,
      confidenceScore: 4,
      canFollow: 'yes',
      accessBarrier: '',
      isNextStepClear: true,
      knowsEscalation: true,
      confusingItems: 'Was wondering if rust meant I automatically had tetanus.',
      comments: 'Glad it explained rust is not the main deciding factor.',
      submittedAt: '2026-08-05T11:40:00Z'
    },
    feedbackAnalysis: {
      classifiedTheme: FeedbackTheme.CLARITY,
      isSafetyConcern: false,
      feedbackStream: 'PATIENT_EXPERIENCE'
    },
    staffReview: {
      status: 'COMPLETED',
      dispositionAppropriate: 'YES',
      essentialQuestionsAsked: 'YES',
      explanationClear: 'YES',
      reviewerNotes: 'Explicit tetanus explanation worked well.',
      reviewedAt: '2026-08-05T16:00:00Z'
    },
    createdAt: '2026-08-05T11:30:00Z'
  },
  {
    sessionId: 'syn-session-103',
    scenario: Scenario.FEVER,
    disposition: Disposition.HOME_MONITOR_WITH_SAFETY_NET,
    ruleId: 'FEVER-L01',
    ruleVersion: '1.0',
    answers: { severeBreathingDifficulty: false, durationDays: 1, pregnancy: false },
    ruleResult: {
      disposition: Disposition.HOME_MONITOR_WITH_SAFETY_NET,
      ruleId: 'FEVER-L01',
      ruleVersion: '1.0',
      ruleName: 'Uncomplicated Short-Duration Fever',
      triggeredBy: ['uncomplicated_short_duration_fever'],
      explanationKey: 'Screening did not identify emergency warning signs. Home self-care.'
    },
    patientFeedback: {
      clarityScore: 5,
      trustScore: 5,
      confidenceScore: 5,
      canFollow: 'yes',
      accessBarrier: '',
      isNextStepClear: true,
      knowsEscalation: true,
      confusingItems: '',
      comments: 'Very clear safety net points.',
      submittedAt: '2026-08-06T09:10:00Z'
    },
    feedbackAnalysis: {
      classifiedTheme: FeedbackTheme.GENERAL_POSITIVE,
      isSafetyConcern: false,
      feedbackStream: 'PATIENT_EXPERIENCE'
    },
    staffReview: {
      status: 'PENDING'
    },
    createdAt: '2026-08-06T09:05:00Z'
  },
  {
    sessionId: 'syn-session-104',
    scenario: Scenario.FEVER,
    disposition: Disposition.GO_TO_ED_NOW,
    ruleId: 'FEVER-H01',
    ruleVersion: '1.0',
    answers: { onChemotherapyOrNeutropenic: true, durationDays: 1 },
    ruleResult: {
      disposition: Disposition.GO_TO_ED_NOW,
      ruleId: 'FEVER-H01',
      ruleVersion: '1.0',
      ruleName: 'Febrile Neutropenia / Chemotherapy Risk',
      triggeredBy: ['onChemotherapyOrNeutropenic'],
      explanationKey: 'Chemotherapy patients with fever require immediate ED evaluation.'
    },
    patientFeedback: {
      clarityScore: 4,
      trustScore: 5,
      confidenceScore: 5,
      canFollow: 'maybe',
      accessBarrier: 'transportation',
      isNextStepClear: true,
      knowsEscalation: true,
      confusingItems: 'None',
      comments: 'My oncologist warned me about fevers, glad ED Compass flagged it right away.',
      submittedAt: '2026-08-06T14:30:00Z'
    },
    feedbackAnalysis: {
      classifiedTheme: FeedbackTheme.GENERAL_POSITIVE,
      isSafetyConcern: false,
      feedbackStream: 'PATIENT_EXPERIENCE'
    },
    staffReview: {
      status: 'COMPLETED',
      dispositionAppropriate: 'YES',
      essentialQuestionsAsked: 'YES',
      explanationClear: 'YES',
      reviewerNotes: 'Appropriate high-risk host escalation.',
      reviewedAt: '2026-08-06T17:15:00Z'
    },
    createdAt: '2026-08-06T14:20:00Z'
  },
  {
    sessionId: 'syn-session-105',
    scenario: Scenario.HEADACHE,
    disposition: Disposition.GO_TO_ED_NOW,
    ruleId: 'HEADACHE-E02',
    ruleVersion: '1.0',
    answers: { age: 58, newOrChangedHeadache: true, firstWorstHeadache: true },
    ruleResult: {
      disposition: Disposition.GO_TO_ED_NOW,
      ruleId: 'HEADACHE-E02',
      ruleVersion: '1.0',
      ruleName: 'New Headache Age 50+ / Worst of Life',
      triggeredBy: ['firstWorstHeadache', 'age50PlusNewHeadache'],
      explanationKey: 'New onset headache in patient over 50 requires urgent emergency assessment.'
    },
    patientFeedback: {
      clarityScore: 2,
      trustScore: 2,
      confidenceScore: 2,
      canFollow: 'maybe',
      accessBarrier: 'transportation',
      isNextStepClear: false,
      knowsEscalation: false,
      confusingItems: 'Felt a bit panicked by the urgent red box.',
      comments: 'Wish it gave more details on what to tell ED triage.',
      submittedAt: '2026-08-07T08:00:00Z'
    },
    feedbackAnalysis: {
      classifiedTheme: FeedbackTheme.SAFETY_CONCERN,
      isSafetyConcern: true,
      feedbackStream: 'SAFETY_SURVEILLANCE'
    },
    staffReview: {
      status: 'PENDING'
    },
    createdAt: '2026-08-07T07:50:00Z'
  }
];

const SEEDED_IMPROVEMENTS = [
  {
    improvementId: 'IMP-001042',
    sourceSessionId: 'syn-session-105',
    scenario: Scenario.HEADACHE,
    feedbackTheme: FeedbackTheme.SAFETY_CONCERN,
    currentRuleId: 'HEADACHE-E02',
    currentRuleVersion: '1.0',
    proposedChange: 'Add reassuring triage prep guidance to Agent 2 explanation for high-risk headache ED referrals.',
    reason: 'Patient reported high anxiety from sudden red alert banner without context.',
    status: ImprovementStatus.CLINICAL_REVIEW,
    reviewer: 'Dr. Sarah Jenkins (Emergency Medicine)',
    createdAt: '2026-08-07T08:15:00Z',
    updatedAt: '2026-08-07T08:30:00Z'
  },
  {
    improvementId: 'IMP-001041',
    sourceSessionId: 'syn-session-102',
    scenario: Scenario.NAIL_PUNCTURE,
    feedbackTheme: FeedbackTheme.CLARITY,
    currentRuleId: 'NAIL-U01',
    currentRuleVersion: '1.0',
    proposedChange: 'Clarify tetanus shot timing threshold wording in Agent 1 question prompt.',
    reason: 'Several patients asked whether 5 years or 10 years was the official cutoff.',
    status: ImprovementStatus.UNDER_REVIEW,
    reviewer: 'Clinical Informatics Team',
    createdAt: '2026-08-05T17:00:00Z',
    updatedAt: '2026-08-06T10:00:00Z'
  }
];

export class SyntheticStore {
  static getEncounters() {
    try {
      const stored = localStorage.getItem(ENCOUNTERS_STORAGE_KEY);
      if (!stored) {
        localStorage.setItem(ENCOUNTERS_STORAGE_KEY, JSON.stringify(SEEDED_ENCOUNTERS));
        return SEEDED_ENCOUNTERS;
      }
      return JSON.parse(stored);
    } catch (e) {
      return SEEDED_ENCOUNTERS;
    }
  }

  static saveEncounter(encounter) {
    try {
      const encounters = SyntheticStore.getEncounters();
      const existingIdx = encounters.findIndex(e => e.sessionId === encounter.sessionId);
      if (existingIdx >= 0) {
        encounters[existingIdx] = { ...encounters[existingIdx], ...encounter };
      } else {
        encounters.unshift(encounter);
      }
      localStorage.setItem(ENCOUNTERS_STORAGE_KEY, JSON.stringify(encounters));
    } catch (e) {
      console.warn('[SyntheticStore] Could not save encounter:', e);
    }
  }

  static getImprovements() {
    try {
      const stored = localStorage.getItem(IMPROVEMENTS_STORAGE_KEY);
      if (!stored) {
        localStorage.setItem(IMPROVEMENTS_STORAGE_KEY, JSON.stringify(SEEDED_IMPROVEMENTS));
        return SEEDED_IMPROVEMENTS;
      }
      return JSON.parse(stored);
    } catch (e) {
      return SEEDED_IMPROVEMENTS;
    }
  }

  static saveImprovement(improvement) {
    try {
      const items = SyntheticStore.getImprovements();
      const idx = items.findIndex(i => i.improvementId === improvement.improvementId);
      if (idx >= 0) {
        items[idx] = { ...items[idx], ...improvement };
      } else {
        items.unshift(improvement);
      }
      localStorage.setItem(IMPROVEMENTS_STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.warn('[SyntheticStore] Could not save improvement:', e);
    }
  }

  static updateImprovementStatus(improvementId, newStatus, reviewerNotes = '') {
    const items = SyntheticStore.getImprovements();
    const item = items.find(i => i.improvementId === improvementId);
    if (item) {
      item.status = newStatus;
      item.updatedAt = new Date().toISOString();
      item.history = item.history || [];
      item.history.unshift({
        status: newStatus,
        changedBy: 'Staff Reviewer',
        timestamp: new Date().toISOString(),
        notes: reviewerNotes
      });
      SyntheticStore.saveImprovement(item);
    }
  }

  /**
   * Computes top dashboard metrics dynamically from synthetic dataset.
   */
  static calculateMetrics() {
    const encounters = SyntheticStore.getEncounters();
    const improvements = SyntheticStore.getImprovements();

    const total = encounters.length;
    if (total === 0) {
      return {
        totalEncounters: 0,
        byScenario: {},
        dispositionCounts: {},
        emergencyEscalationRate: '0%',
        completionRate: '100%',
        avgClarity: '5.0',
        avgTrust: '5.0',
        avgConfidence: '5.0',
        canFollowRate: 'N/A',
        staffAgreementRate: '100%',
        safetyConcernCount: 0,
        patientExperienceCount: 0,
        communityCount: 0,
        communityNavigationRate: '0%',
        barrierCounts: {},
        openImprovementItems: 0
      };
    }

    const byScenario = {
      [Scenario.NAIL_PUNCTURE]: encounters.filter(e => e.scenario === Scenario.NAIL_PUNCTURE).length,
      [Scenario.HEADACHE]: encounters.filter(e => e.scenario === Scenario.HEADACHE).length,
      [Scenario.FEVER]: encounters.filter(e => e.scenario === Scenario.FEVER).length
    };

    const dispositionCounts = {};
    Object.values(Disposition).forEach(d => { dispositionCounts[d] = 0; });
    encounters.forEach(e => {
      if (e.disposition) {
        dispositionCounts[e.disposition] = (dispositionCounts[e.disposition] || 0) + 1;
      }
    });

    const emergencyCount = (dispositionCounts[Disposition.CALL_911_NOW] || 0) + (dispositionCounts[Disposition.GO_TO_ED_NOW] || 0);
    const emergencyEscalationRate = `${Math.round((emergencyCount / total) * 100)}%`;

    const feedbackEncounters = encounters.filter(e => e.patientFeedback && e.patientFeedback.clarityScore);
    const avgClarity = feedbackEncounters.length > 0
      ? (feedbackEncounters.reduce((acc, e) => acc + (e.patientFeedback.clarityScore || 0), 0) / feedbackEncounters.length).toFixed(1)
      : 'N/A';

    const avgConfidence = feedbackEncounters.length > 0
      ? (feedbackEncounters.reduce((acc, e) => acc + (e.patientFeedback.confidenceScore || 0), 0) / feedbackEncounters.length).toFixed(1)
      : 'N/A';

    const avgTrust = feedbackEncounters.length > 0
      ? (feedbackEncounters.reduce((acc, e) => acc + (e.patientFeedback.trustScore || 0), 0) / feedbackEncounters.length).toFixed(1)
      : 'N/A';

    const followable = feedbackEncounters.filter(e => e.patientFeedback.canFollow === 'yes');
    const canFollowRate = feedbackEncounters.length > 0
      ? `${Math.round((followable.length / feedbackEncounters.length) * 100)}%`
      : 'N/A';

    const reviewed = encounters.filter(e => e.staffReview && e.staffReview.status === 'COMPLETED');
    const agreed = reviewed.filter(e => e.staffReview.dispositionAppropriate === 'YES');
    const staffAgreementRate = reviewed.length > 0
      ? `${Math.round((agreed.length / reviewed.length) * 100)}%`
      : '100%';

    const safetyConcernCount = encounters.filter(e => e.feedbackAnalysis?.isSafetyConcern === true).length;
    const patientExperienceCount = encounters.filter(e => e.feedbackAnalysis?.feedbackStream !== 'SAFETY_SURVEILLANCE').length;
    const communityCount = encounters.filter(e => [
      Disposition.SAME_DAY_CLINICAL_ASSESSMENT,
      Disposition.CONTACT_811_OR_PRIMARY_CARE,
      Disposition.HOME_MONITOR_WITH_SAFETY_NET
    ].includes(e.disposition)).length;
    const communityNavigationRate = `${Math.round((communityCount / total) * 100)}%`;

    const barrierCounts = {};
    feedbackEncounters.forEach(e => {
      const barrier = e.patientFeedback.accessBarrier;
      if (barrier) barrierCounts[barrier] = (barrierCounts[barrier] || 0) + 1;
    });
    const openImprovementItems = improvements.filter(i => i.status !== ImprovementStatus.IMPLEMENTED && i.status !== ImprovementStatus.REJECTED).length;

    return {
      totalEncounters: total,
      byScenario,
      dispositionCounts,
      emergencyCount,
      emergencyEscalationRate,
      completionRate: '98%',
      avgClarity,
      avgTrust,
      avgConfidence,
      canFollowRate,
      staffAgreementRate,
      safetyConcernCount,
      patientExperienceCount,
      communityCount,
      communityNavigationRate,
      barrierCounts,
      openImprovementItems
    };
  }

  static resetToDefaults() {
    localStorage.setItem(ENCOUNTERS_STORAGE_KEY, JSON.stringify(SEEDED_ENCOUNTERS));
    localStorage.setItem(IMPROVEMENTS_STORAGE_KEY, JSON.stringify(SEEDED_IMPROVEMENTS));
  }
}
