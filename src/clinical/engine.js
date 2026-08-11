/**
 * ED COMPASS - Deterministic Clinical Rule Engine
 * Academic Prototype for EMHI1001H
 * 
 * CRITICAL DESIGN RULE:
 * Only this engine assigns urgency, disposition, timing, destination category,
 * rule ID, rule version, and safety-net triggers.
 * AI agents MUST NOT set or override clinical disposition.
 */

import { Disposition, Scenario, DISPOSITION_METADATA } from './types.js';
import { nailPunctureRules, NAIL_PUNCTURE_PATHWAY_VERSION } from './pathways/nailPunctureRules.js';
import { headacheRules, HEADACHE_PATHWAY_VERSION } from './pathways/headacheRules.js';
import { feverRules, FEVER_PATHWAY_VERSION } from './pathways/feverRules.js';

export class ClinicalRuleEngine {
  /**
   * Evaluates validated facts for a scenario using versioned deterministic rules.
   * Uses first-match / highest-severity rule evaluation.
   */
  static evaluate(scenario, facts = {}) {
    let rules = [];
    let defaultVersion = '1.0';

    switch (scenario) {
      case Scenario.NAIL_PUNCTURE:
        rules = nailPunctureRules;
        defaultVersion = NAIL_PUNCTURE_PATHWAY_VERSION;
        break;
      case Scenario.HEADACHE:
        rules = headacheRules;
        defaultVersion = HEADACHE_PATHWAY_VERSION;
        break;
      case Scenario.FEVER:
        rules = feverRules;
        defaultVersion = FEVER_PATHWAY_VERSION;
        break;
      default:
        // Conservative safety fallback for invalid or missing scenario
        return {
          disposition: Disposition.GO_TO_ED_NOW,
          timing: 'Go Now',
          destinationType: 'Emergency Department',
          ruleId: 'FALLBACK-E00',
          ruleVersion: '1.0',
          triggeredBy: ['unrecognized_scenario_safety_fallback'],
          explanationKey: 'Invalid scenario provided to clinical rule engine. Defaulting conservatively to emergency evaluation.',
          safetyNet: ['Seek immediate clinical assessment if unwell.'],
          requiresHumanReview: true,
          evaluatedAt: new Date().toISOString()
        };
    }

    // Match rules sequentially (rules are defined in descending order of severity)
    for (const rule of rules) {
      try {
        if (rule.condition(facts)) {
          const triggeredBy = typeof rule.triggeredBy === 'function' 
            ? rule.triggeredBy(facts) 
            : rule.triggeredBy;
            
          const meta = DISPOSITION_METADATA[rule.disposition] || {};

          return {
            disposition: rule.disposition,
            urgency: meta.urgency,
            timing: rule.timing || meta.timing,
            destinationType: rule.destinationType || meta.destinationType,
            ruleId: rule.id,
            ruleVersion: rule.version || defaultVersion,
            ruleName: rule.name,
            triggeredBy: triggeredBy || [],
            explanationKey: rule.explanationKey,
            safetyNet: rule.safetyNet || [],
            requiresHumanReview: rule.disposition === Disposition.CALL_911_NOW || rule.disposition === Disposition.GO_TO_ED_NOW,
            evaluatedAt: new Date().toISOString(),
            disclaimer: 'Prototype rule — requires clinical validation before real-world use.'
          };
        }
      } catch (err) {
        console.error(`[ClinicalEngine] Error evaluating rule ${rule.id}:`, err);
      }
    }

    // Fallback if no specific rule matched (should not happen with complete pathways)
    const meta = DISPOSITION_METADATA[Disposition.CONTACT_811_OR_PRIMARY_CARE];
    return {
      disposition: Disposition.CONTACT_811_OR_PRIMARY_CARE,
      urgency: meta.urgency,
      timing: 'Within 24 hours',
      destinationType: meta.destinationType,
      ruleId: `${scenario.toUpperCase()}-FALLBACK-U01`,
      ruleVersion: defaultVersion,
      ruleName: 'Default Clinical Handoff Fallback',
      triggeredBy: ['no_explicit_rule_match_fallback'],
      explanationKey: 'Routine clinical consultation recommended.',
      safetyNet: ['Monitor symptoms and contact healthcare provider if worsening.'],
      requiresHumanReview: false,
      evaluatedAt: new Date().toISOString(),
      disclaimer: 'Prototype rule — requires clinical validation before real-world use.'
    };
  }

  /**
   * Validates structured agent handoff payload before passing to rule engine.
   */
  static validateHandoff(handoff) {
    const errors = [];
    if (!handoff) {
      errors.push('Handoff object is null or undefined');
      return { isValid: false, errors };
    }
    if (!handoff.sessionId) errors.push('Missing sessionId');
    if (!handoff.scenario) errors.push('Missing scenario');
    if (!handoff.answers || typeof handoff.answers !== 'object') errors.push('Missing valid answers object');
    if (!handoff.schemaVersion) errors.push('Missing schemaVersion');
    if (!handoff.pathwayVersion) errors.push('Missing pathwayVersion');

    const validScenarios = Object.values(Scenario);
    if (handoff.scenario && !validScenarios.includes(handoff.scenario)) {
      errors.push('Unrecognized scenario');
    }

    // No direct identifiers belong in this synthetic academic prototype.
    const forbiddenKeys = new Set([
      'name', 'fullname', 'firstname', 'lastname', 'phn', 'healthnumber',
      'dateofbirth', 'dob', 'address', 'phone', 'telephone', 'email'
    ]);
    const inspect = (value) => {
      if (!value || typeof value !== 'object') return;
      for (const [key, child] of Object.entries(value)) {
        if (forbiddenKeys.has(key.toLowerCase().replace(/[^a-z]/g, ''))) {
          errors.push(`Forbidden identifier field: ${key}`);
        }
        inspect(child);
      }
    };
    inspect(handoff.answers);

    if (
      handoff.answers &&
      Object.keys(handoff.answers).length === 0 &&
      !handoff.emergencyStopDetected
    ) {
      errors.push('No clinical answers provided');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
