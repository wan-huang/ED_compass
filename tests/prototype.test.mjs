import test from 'node:test';
import assert from 'node:assert/strict';

import { ClinicalRuleEngine } from '../src/clinical/engine.js';
import { Disposition, Scenario } from '../src/clinical/types.js';
import { IntakeAgent } from '../src/agents/intakeAgent.js';
import { FeedbackAgent } from '../src/agents/feedbackAgent.js';
import { getCareOptions, requiresInPersonAssessment } from '../src/store/facilities.js';
import { t, questionLabel } from '../src/ui/i18n.js';

test('rust has zero independent decision weight', () => {
  const common = {
    uncontrolledBleeding: false,
    numbnessOrCirculationIssue: false,
    objectEmbedded: false,
    deepPenetration: false,
    grossContamination: false,
    worseningPainOrSwelling: false,
    highRiskHost: false,
    tetanusStatus: 'up_to_date'
  };
  const rusty = ClinicalRuleEngine.evaluate(Scenario.NAIL_PUNCTURE, { ...common, isRusty: true });
  const notRusty = ClinicalRuleEngine.evaluate(Scenario.NAIL_PUNCTURE, { ...common, isRusty: false });
  assert.equal(rusty.disposition, notRusty.disposition);
  assert.equal(rusty.ruleId, notRusty.ruleId);
});

test('uncertain safety-critical answers fail conservatively', () => {
  const headache = ClinicalRuleEngine.evaluate(Scenario.HEADACHE, { thunderclapOnset: null });
  const fever = ClinicalRuleEngine.evaluate(Scenario.FEVER, { severeBreathingDifficulty: null });
  assert.equal(headache.disposition, Disposition.CALL_911_NOW);
  assert.equal(fever.disposition, Disposition.CALL_911_NOW);
});

test('intake handoff includes governance metadata and rejects identifiers', () => {
  let session = IntakeAgent.createSession('test-session', Scenario.FEVER, 'I have a fever.');
  session = IntakeAgent.answerQuestion(session, 'severeBreathingDifficulty', false);
  const handoff = IntakeAgent.buildHandoff(session);
  assert.equal(handoff.schemaVersion, '1.1');
  assert.equal(handoff.pathwayVersion, '1.1');

  handoff.answers.profile = { name: 'Test Person', healthNumber: '123' };
  const validation = ClinicalRuleEngine.validateHandoff(handoff);
  assert.equal(validation.isValid, false);
  assert.match(validation.errors.join(' '), /Forbidden identifier/);
});

test('safety-surveillance language is flagged by Agent 3', () => {
  const rule = ClinicalRuleEngine.evaluate(Scenario.FEVER, { durationDays: 1 });
  const result = FeedbackAgent.processPatientFeedback('s1', Scenario.FEVER, rule, {
    clarityScore: 5,
    trustScore: 4,
    confidenceScore: 5,
    isNextStepClear: true,
    knowsEscalation: true,
    comments: 'I should have called 911 because I am getting worse.'
  });
  assert.equal(result.qualityAnalysis.isSafetyConcern, true);
  assert.equal(result.qualityAnalysis.feedbackStream, 'SAFETY_SURVEILLANCE');
});

test('access matching preserves urgency and excludes unsafe substitutes', () => {
  const emergencyOptions = getCareOptions({
    community: 'victoria',
    disposition: Disposition.GO_TO_ED_NOW,
    scenario: Scenario.FEVER
  });
  assert.ok(emergencyOptions.length > 0);
  assert.ok(emergencyOptions.every(option => option.type === 'Emergency Department'));
  assert.equal(emergencyOptions[0].recommended, true);
  assert.equal(getCareOptions({
    community: 'victoria',
    disposition: Disposition.CALL_911_NOW,
    scenario: Scenario.HEADACHE
  }).length, 0);

  const punctureOptions = getCareOptions({
    community: 'smithers',
    disposition: Disposition.SAME_DAY_CLINICAL_ASSESSMENT,
    scenario: Scenario.NAIL_PUNCTURE,
    answers: { deepPenetration: true }
  });
  assert.equal(requiresInPersonAssessment(
    Scenario.NAIL_PUNCTURE,
    Disposition.SAME_DAY_CLINICAL_ASSESSMENT,
    { deepPenetration: true }
  ), true);
  assert.ok(punctureOptions.every(option => option.type !== 'Virtual Primary Care'));
});

test('patient interface supports French labels without changing canonical facts', () => {
  assert.equal(t('fr', 'patientPortal'), 'Vue patient');
  assert.match(questionLabel('fr', { id: 'severeBreathingDifficulty', label: 'Fallback' }), /respirer/);
  assert.equal(
    questionLabel('en', { id: 'severeBreathingDifficulty', label: 'Original clinical label' }),
    'Original clinical label'
  );
});

test('demo path reaches feedback, dashboard and staff review', async () => {
  const data = new Map();
  globalThis.localStorage = {
    getItem: key => data.has(key) ? data.get(key) : null,
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: key => data.delete(key)
  };
  globalThis.window = {};
  globalThis.document = {
    body: { classList: { toggle: () => {} } },
    getElementById: () => null
  };

  const { AppController } = await import('../src/ui/app.js');
  const { SyntheticStore } = await import('../src/store/syntheticStore.js');
  const root = { innerHTML: '' };
  const app = new AppController(root);
  globalThis.window.app = app;

  app.launchDemoCase('DEMO_A');
  assert.equal(app.patientStep, 'disposition');
  assert.equal(app.activeTab, 'presenter');
  assert.match(root.innerHTML, /INTERACTIVE DECISION WALKTHROUGH/);
  assert.match(root.innerHTML, /Patient’s synthetic opening statement/);
  assert.match(root.innerHTML, /NAIL-U01/);

  app.toggleCollaborationStep('rules');
  assert.match(root.innerHTML, /DETERMINISTIC FIRST-MATCH LOGIC/);
  assert.match(root.innerHTML, /Readable decision condition/);
  assert.match(root.innerHTML, /Disposition output/);
  assert.match(root.innerHTML, /Rust = Yes is retained as context/);
  app.toggleCollaborationStep('navigation');
  assert.match(root.innerHTML, /RULE OUTPUT → ACTIONABLE CARE PLAN/);
  assert.match(root.innerHTML, /Agent 2 boundary/);
  app.toggleCollaborationStep('learning');
  assert.match(root.innerHTML, /DUAL FEEDBACK → GOVERNED IMPROVEMENT/);
  assert.match(root.innerHTML, /Possible learning opportunity/);

  app.setTab('patient');
  assert.doesNotMatch(root.innerHTML, /INTERACTIVE DECISION WALKTHROUGH/);
  assert.doesNotMatch(root.innerHTML, /Inspect structured handoff JSON/);
  assert.match(root.innerHTML, /Find an appropriate care option/);
  assert.match(root.innerHTML, /Tetanus vaccination status/);

  app.submitPatientFeedback({
    helpful: true,
    clarityScore: 5,
    trustScore: 4,
    confidenceScore: 5,
    isNextStepClear: true,
    knowsEscalation: true,
    canFollow: 'yes',
    accessBarrier: '',
    unsafeConcern: false,
    comments: 'Clear next step.',
    confusingItems: ''
  });
  assert.equal(app.patientStep, 'complete');

  const saved = SyntheticStore.getEncounters().find(e => e.sessionId === app.currentSession.sessionId);
  assert.equal(saved.patientFeedback.trustScore, 4);
  assert.equal(saved.feedbackAnalysis.feedbackStream, 'PATIENT_EXPERIENCE');

  app.submitStaffReview(saved.sessionId, {
    dispositionAppropriate: 'YES',
    essentialQuestionsAsked: 'YES',
    explanationClear: 'YES',
    reviewerNotes: 'Appropriate synthetic route.'
  });
  const reviewed = SyntheticStore.getEncounters().find(e => e.sessionId === saved.sessionId);
  assert.equal(reviewed.staffReview.status, 'COMPLETED');

  app.openEncounterModal(saved.sessionId);
  assert.match(root.innerHTML, /Were essential questions asked/);
  assert.match(root.innerHTML, /Was the explanation clear/);
  app.closeModal();

  app.setTab('staff');
  assert.match(root.innerHTML, /Learning System Dashboard/);
  app.setTab('architecture');
  assert.match(root.innerHTML, /One front door, several safe care destinations/);

  app.launchDemoCase('DEMO_B');
  assert.equal(app.patientStep, 'emergency_stop');
  app.setTab('patient');
  const emergency = SyntheticStore.getEncounters().find(e => e.sessionId === app.currentSession.sessionId);
  assert.equal(emergency.disposition, Disposition.CALL_911_NOW);
  assert.equal(emergency.completionStatus, 'RECOMMENDATION_DISPLAYED');
  assert.match(root.innerHTML, /Submit feedback/);
});
