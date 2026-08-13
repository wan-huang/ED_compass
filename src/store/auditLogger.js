/**
 * ED COMPASS - Audit Trail & Event Logging Service
 * Academic Prototype for EMHI1001H
 * 
 * Captures reproducible audit events across patient interaction, rule engine evaluation,
 * patient feedback, staff reviews, and governed improvement workflows.
 */

export const AuditEventType = {
  SCOPE_ELIGIBILITY_CHECKED: 'SCOPE_ELIGIBILITY_CHECKED',
  CONSENT_GIVEN: 'CONSENT_GIVEN',
  LANGUAGE_SELECTED: 'LANGUAGE_SELECTED',
  VOICE_INPUT_STARTED: 'VOICE_INPUT_STARTED',
  VOICE_TRANSCRIPT_CONFIRMED: 'VOICE_TRANSCRIPT_CONFIRMED',
  CONCERN_NARRATIVE_SUBMITTED: 'CONCERN_NARRATIVE_SUBMITTED',
  SCENARIO_SELECTED: 'SCENARIO_SELECTED',
  QUESTION_ANSWERED: 'QUESTION_ANSWERED',
  ANSWER_REVISED: 'ANSWER_REVISED',
  EMERGENCY_STOP_TRIGGERED: 'EMERGENCY_STOP_TRIGGERED',
  HANDOFF_VALIDATED: 'HANDOFF_VALIDATED',
  RULE_EVALUATED: 'RULE_EVALUATED',
  RECOMMENDATION_DISPLAYED: 'RECOMMENDATION_DISPLAYED',
  ACCESS_OPTIONS_DISPLAYED: 'ACCESS_OPTIONS_DISPLAYED',
  FIRST_NATIONS_OPTIONS_SELECTED: 'FIRST_NATIONS_OPTIONS_SELECTED',
  PATIENT_FEEDBACK_SUBMITTED: 'PATIENT_FEEDBACK_SUBMITTED',
  STAFF_REVIEW_SUBMITTED: 'STAFF_REVIEW_SUBMITTED',
  IMPROVEMENT_ITEM_CREATED: 'IMPROVEMENT_ITEM_CREATED',
  IMPROVEMENT_STATUS_CHANGED: 'IMPROVEMENT_STATUS_CHANGED'
};

const AUDIT_STORAGE_KEY = 'ed_compass_audit_logs';

export class AuditLogger {
  static getLogs(sessionId = null) {
    try {
      const stored = localStorage.getItem(AUDIT_STORAGE_KEY);
      const logs = stored ? JSON.parse(stored) : [];
      if (sessionId) {
        return logs.filter(log => log.sessionId === sessionId);
      }
      return logs;
    } catch (e) {
      console.warn('[AuditLogger] Could not read audit logs:', e);
      return [];
    }
  }

  static logEvent(eventType, sessionId, payload = {}, actor = 'Patient') {
    const event = {
      eventId: `AUD-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      eventType,
      sessionId,
      actor,
      timestamp: new Date().toISOString(),
      payload
    };

    try {
      const logs = AuditLogger.getLogs();
      logs.unshift(event); // newest first
      localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(logs.slice(0, 500)));
    } catch (e) {
      console.warn('[AuditLogger] Could not write audit log:', e);
    }

    return event;
  }

  static clearLogs() {
    try {
      localStorage.removeItem(AUDIT_STORAGE_KEY);
    } catch (e) {
      console.warn('[AuditLogger] Could not clear logs:', e);
    }
  }

  static seedDemonstrationLogs() {
    if (AuditLogger.getLogs().length) return;
    const seed = [
      [AuditEventType.CONSENT_GIVEN, 'syn-session-102', { consent: true }, 'Patient'],
      [AuditEventType.QUESTION_ANSWERED, 'syn-session-102', { questionId: 'deepPenetration', value: true }, 'Patient'],
      [AuditEventType.HANDOFF_VALIDATED, 'syn-session-102', { schemaVersion: '1.1', answerCount: 9 }, 'System'],
      [AuditEventType.RULE_EVALUATED, 'syn-session-102', { ruleId: 'NAIL-U01', ruleVersion: '1.0', disposition: 'SAME_DAY_CLINICAL_ASSESSMENT' }, 'Rule engine'],
      [AuditEventType.RECOMMENDATION_DISPLAYED, 'syn-session-102', { disposition: 'SAME_DAY_CLINICAL_ASSESSMENT' }, 'System'],
      [AuditEventType.PATIENT_FEEDBACK_SUBMITTED, 'syn-session-102', { clarityScore: 4, accessBarrier: 'transportation' }, 'Patient']
    ];
    seed.reverse().forEach(([type, session, payload, actor]) => AuditLogger.logEvent(type, session, payload, actor));
  }
}
