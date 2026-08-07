/**
 * ED COMPASS - Agent 3: Feedback & Quality Agent
 * Academic Prototype for EMHI1001H
 * 
 * Responsibilities:
 * - Collects patient feedback (clarity, next steps, confidence, missing/confusing items, free-text)
 * - Classifies feedback into quality themes and flags potential safety concerns
 * - Attaches feedback metadata to session ID, scenario, disposition, rule ID, and rule version
 * - Provides staff review classification and improvement item generation
 * - CRITICAL: NEVER modifies clinical rules or alters deterministic pathway logic
 */

import { AgentVersion, FeedbackTheme, ImprovementStatus } from './types.js';

export class FeedbackAgent {
  /**
   * Process patient feedback submission and classify themes & safety concerns.
   */
  static processPatientFeedback(sessionId, scenario, ruleResult, feedbackForm) {
    const clarityScore = Number(feedbackForm.clarityScore) || 5;
    const confidenceScore = Number(feedbackForm.confidenceScore) || 5;
    const isNextStepClear = feedbackForm.isNextStepClear !== false;
    const knowsEscalation = feedbackForm.knowsEscalation !== false;
    const comments = feedbackForm.comments || '';
    const confusingItems = feedbackForm.confusingItems || '';

    // Classify feedback theme based on patient input
    const classifiedTheme = classifyTheme(clarityScore, isNextStepClear, knowsEscalation, confusingItems, comments);

    // Identify if safety concern exists
    const isSafetyConcern = checkSafetyConcern(clarityScore, confidenceScore, knowsEscalation, comments, confusingItems);

    return {
      agentVersion: AgentVersion.FEEDBACK,
      sessionId,
      scenario,
      disposition: ruleResult.disposition,
      ruleId: ruleResult.ruleId,
      ruleVersion: ruleResult.ruleVersion,
      patientFeedback: {
        clarityScore,
        confidenceScore,
        isNextStepClear,
        knowsEscalation,
        confusingItems,
        comments,
        submittedAt: new Date().toISOString()
      },
      qualityAnalysis: {
        classifiedTheme,
        isSafetyConcern,
        summary: generateFeedbackSummary(classifiedTheme, isSafetyConcern, clarityScore)
      }
    };
  }

  /**
   * Generates a governed improvement item proposal from an encounter and feedback.
   */
  static createImprovementProposal({
    encounter,
    proposedChange,
    proposedBy = 'Staff Reviewer',
    reason = 'Patient feedback / Quality review flag'
  }) {
    const timestamp = new Date().toISOString();
    const improvementId = `IMP-${Date.now().toString().slice(-6)}`;

    return {
      improvementId,
      sourceSessionId: encounter.sessionId,
      scenario: encounter.scenario,
      feedbackTheme: encounter.feedbackAnalysis?.classifiedTheme || FeedbackTheme.OTHER,
      currentRuleId: encounter.ruleResult?.ruleId || 'N/A',
      currentRuleVersion: encounter.ruleResult?.ruleVersion || '1.0',
      proposedChange,
      reason,
      status: ImprovementStatus.NEW,
      reviewer: proposedBy,
      createdAt: timestamp,
      updatedAt: timestamp,
      history: [
        {
          status: ImprovementStatus.NEW,
          changedBy: proposedBy,
          timestamp,
          notes: 'Improvement proposal created from encounter review.'
        }
      ]
    };
  }
}

function classifyTheme(clarity, nextStepClear, knowsEscalation, confusingItems, comments) {
  const text = `${confusingItems} ${comments}`.toLowerCase();

  if (text.includes('unsafe') || text.includes('dangerous') || text.includes('wrong hospital') || text.includes('emergency')) {
    return FeedbackTheme.SAFETY_CONCERN;
  }
  if (!knowsEscalation || text.includes('when to go') || text.includes('worsen')) {
    return FeedbackTheme.SAFETY_NET_MISSING;
  }
  if (!nextStepClear || clarity <= 2 || text.includes('confused') || text.includes('unclear')) {
    return FeedbackTheme.CLARITY;
  }
  if (text.includes('too many questions') || text.includes('order') || text.includes('repeated')) {
    return FeedbackTheme.QUESTION_ORDER;
  }
  if (text.includes('disposition') || text.includes('level of care') || text.includes('unnecessary')) {
    return FeedbackTheme.DISPOSITION_FEEDBACK;
  }
  if (clarity >= 4 && nextStepClear) {
    return FeedbackTheme.GENERAL_POSITIVE;
  }

  return FeedbackTheme.OTHER;
}

function checkSafetyConcern(clarity, confidence, knowsEscalation, comments, confusingItems) {
  const text = `${confusingItems} ${comments}`.toLowerCase();
  if (!knowsEscalation) return true;
  if (clarity <= 2 && confidence <= 2) return true;
  if (text.includes('unsafe') || text.includes('severe pain') || text.includes('delayed')) return true;
  return false;
}

function generateFeedbackSummary(theme, isSafety, clarity) {
  if (isSafety) {
    return `[SAFETY FLAG] Feedback classified under ${theme}. Low confidence/clarity or potential safety concern flagged for staff review.`;
  }
  return `Feedback classified under ${theme} (Clarity Rating: ${clarity}/5).`;
}
