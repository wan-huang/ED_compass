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

  createIntakeSession(sessionId, scenario) {
    return IntakeAgent.createSession(sessionId, scenario);
  }

  processAnswer(sessionState, fieldId, value, isUnsure = false) {
    return IntakeAgent.answerQuestion(sessionState, fieldId, value, isUnsure);
  }

  generateHandoff(sessionState) {
    return IntakeAgent.buildHandoff(sessionState);
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
