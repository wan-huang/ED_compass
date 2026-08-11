/**
 * ED COMPASS - Local Demo Agent Provider
 * Academic Prototype for EMHI1001H
 * 
 * Provides deterministic, offline-capable agent behaviors without requiring
 * external LLM API keys or cloud services.
 */

import { IntakeAgent } from '../intakeAgent.js';
import { NavigationAgent } from '../navigationAgent.js';
import { FeedbackAgent } from '../feedbackAgent.js';
import { ClinicalRuleEngine } from '../../clinical/engine.js';

export class LocalDemoAgentProvider {
  constructor() {
    this.name = 'LocalDemoAgentProvider';
    this.isOfflineCapable = true;
  }

  createIntakeSession(sessionId, scenario, narrative = '') {
    return IntakeAgent.createSession(sessionId, scenario, narrative);
  }

  processAnswer(sessionState, fieldId, value, isUnsure = false) {
    return IntakeAgent.answerQuestion(sessionState, fieldId, value, isUnsure);
  }

  generateHandoff(sessionState) {
    const handoff = IntakeAgent.buildHandoff(sessionState);
    const validation = ClinicalRuleEngine.validateHandoff(handoff);
    if (!validation.isValid) {
      throw new Error(`Invalid intake handoff: ${validation.errors.join('; ')}`);
    }
    return handoff;
  }

  evaluateClinicalRules(scenario, facts) {
    return ClinicalRuleEngine.evaluate(scenario, facts);
  }

  generateNavigation(handoff, ruleResult) {
    return NavigationAgent.generatePatientExplanation(handoff, ruleResult);
  }

  processFeedback(sessionId, scenario, ruleResult, feedbackForm) {
    return FeedbackAgent.processPatientFeedback(sessionId, scenario, ruleResult, feedbackForm);
  }

  createImprovementProposal(params) {
    return FeedbackAgent.createImprovementProposal(params);
  }
}
