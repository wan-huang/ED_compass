/**
 * ED COMPASS - Single Page Application Interface & Reactive Controller
 * Academic Prototype for EMHI1001H - University of Toronto
 */

import { getAgentProvider } from '../agents/providers/agentProvider.js';
import { INTAKE_QUESTIONS } from '../agents/intakeAgent.js';
import { Scenario, Disposition, DISPOSITION_METADATA } from '../clinical/types.js';
import { SyntheticStore } from '../store/syntheticStore.js';
import { AuditLogger, AuditEventType } from '../store/auditLogger.js';
import { DEMO_CASES } from '../store/demoCases.js';
import { ImprovementStatus } from '../agents/types.js';

export class AppController {
  constructor(rootContainer) {
    this.root = rootContainer;
    this.provider = getAgentProvider();
    
    // Application State
    this.activeTab = 'patient'; // 'patient' | 'staff' | 'improvements' | 'architecture'
    this.patientStep = 'landing'; // 'landing' | 'consent' | 'concern_input' | 'intake' | 'emergency_stop' | 'review' | 'disposition' | 'complete'
    this.narrativeError = '';
    
    // Intake Session State
    this.currentSession = null;
    this.currentHandoff = null;
    this.currentRuleResult = null;
    this.currentNavigation = null;
    this.currentFeedbackAnalysis = null;

    // Staff / Dashboard State
    this.selectedEncounterId = null;
    this.dashboardFilters = {
      scenario: 'ALL',
      disposition: 'ALL',
      safetyFlag: 'ALL',
      reviewStatus: 'ALL'
    };

    // Modals state
    this.activeModal = null; // null | 'encounter_detail' | 'create_improvement'

    this.init();
  }

  init() {
    this.render();
  }

  // --- ACTIONS & NAVIGATION ---

  setTab(tab) {
    this.activeTab = tab;
    this.render();
  }

  startNewPatientSession() {
    const sessionId = `EDC-${Date.now().toString().slice(-6)}`;
    this.currentSession = null;
    this.currentHandoff = null;
    this.currentRuleResult = null;
    this.currentNavigation = null;
    this.currentFeedbackAnalysis = null;
    this.patientStep = 'consent';
    this.render();
  }

  acceptConsent() {
    AuditLogger.logEvent(AuditEventType.CONSENT_GIVEN, 'NEW_SESSION', { consent: true });
    this.patientStep = 'concern_input';
    this.render();
  }

  submitConcernNarrative(narrative) {
    const cleaned = String(narrative || '').trim();
    const normalized = cleaned.toLowerCase();
    let scenario = null;

    if (/\b(nail|puncture|sharp object|stepped on)\b/.test(normalized)) scenario = Scenario.NAIL_PUNCTURE;
    else if (/\b(headache|head pain|migraine|thunderclap)\b/.test(normalized)) scenario = Scenario.HEADACHE;
    else if (/\b(fever|temperature|chills|feverish)\b/.test(normalized)) scenario = Scenario.FEVER;

    if (!scenario) {
      this.narrativeError = 'For this classroom prototype, please describe a nail puncture, headache, or fever.';
      this.render();
      return;
    }

    this.narrativeError = '';
    this.selectScenario(scenario, cleaned);
  }

  selectScenario(scenario, narrative = '') {
    const sessionId = `EDC-${Date.now().toString().slice(-6)}`;
    this.currentSession = this.provider.createIntakeSession(sessionId, scenario, narrative);
    AuditLogger.logEvent(AuditEventType.SCENARIO_SELECTED, sessionId, { scenario, narrative });
    this.patientStep = 'intake';
    this.render();
  }

  answerQuestion(fieldId, value, isUnsure = false) {
    if (!this.currentSession) return;
    
    this.currentSession = this.provider.processAnswer(this.currentSession, fieldId, value, isUnsure);
    AuditLogger.logEvent(AuditEventType.QUESTION_ANSWERED, this.currentSession.sessionId, { fieldId, value, isUnsure });

    if (this.currentSession.emergencyStopDetected) {
      AuditLogger.logEvent(AuditEventType.EMERGENCY_STOP_TRIGGERED, this.currentSession.sessionId, { trigger: this.currentSession.emergencyTriggerField });
      this.evaluateSessionAndShowResults();
      this.patientStep = 'emergency_stop';
    } else if (this.currentSession.isCompleted) {
      this.patientStep = 'review';
    }
    
    this.render();
  }

  reviseAnswers() {
    AuditLogger.logEvent(AuditEventType.ANSWER_REVISED, this.currentSession?.sessionId, { note: 'Patient went back to edit answers' });
    this.currentSession.currentQuestionIndex = 0;
    this.currentSession.isCompleted = false;
    this.currentSession.emergencyStopDetected = false;
    this.patientStep = 'intake';
    this.render();
  }

  evaluateSessionAndShowResults() {
    this.currentHandoff = this.provider.generateHandoff(this.currentSession);
    AuditLogger.logEvent(AuditEventType.HANDOFF_VALIDATED, this.currentHandoff.sessionId, { handoff: this.currentHandoff });

    this.currentRuleResult = this.provider.evaluateClinicalRules(this.currentHandoff.scenario, this.currentHandoff.answers);
    AuditLogger.logEvent(AuditEventType.RULE_EVALUATED, this.currentHandoff.sessionId, { ruleResult: this.currentRuleResult });

    this.currentNavigation = this.provider.generateNavigation(this.currentHandoff, this.currentRuleResult);
    AuditLogger.logEvent(AuditEventType.RECOMMENDATION_DISPLAYED, this.currentHandoff.sessionId, { disposition: this.currentRuleResult.disposition });

    // Persist the recommendation immediately. Emergency encounters therefore
    // reach the learning dashboard even if the patient does not submit feedback.
    this.persistCurrentEncounter();

    if (!this.currentSession.emergencyStopDetected) {
      this.patientStep = 'disposition';
    }
    this.render();
  }

  submitPatientFeedback(feedbackForm) {
    if (!this.currentSession || !this.currentRuleResult) return;

    this.currentFeedbackAnalysis = this.provider.processFeedback(
      this.currentSession.sessionId,
      this.currentSession.scenario,
      this.currentRuleResult,
      feedbackForm
    );

    AuditLogger.logEvent(AuditEventType.PATIENT_FEEDBACK_SUBMITTED, this.currentSession.sessionId, { feedback: feedbackForm });

    this.persistCurrentEncounter({
      patientFeedback: this.currentFeedbackAnalysis.patientFeedback,
      feedbackAnalysis: this.currentFeedbackAnalysis.qualityAnalysis,
      completionStatus: 'COMPLETED'
    });
    this.patientStep = 'complete';
    this.render();
  }

  persistCurrentEncounter(extra = {}) {
    if (!this.currentSession || !this.currentRuleResult || !this.currentHandoff) return;
    const encounter = {
      sessionId: this.currentSession.sessionId,
      scenario: this.currentSession.scenario,
      narrative: this.currentSession.narrative || '',
      disposition: this.currentRuleResult.disposition,
      ruleId: this.currentRuleResult.ruleId,
      ruleVersion: this.currentRuleResult.ruleVersion,
      answers: this.currentHandoff.answers,
      ruleResult: this.currentRuleResult,
      navigation: this.currentNavigation,
      staffReview: { status: 'PENDING' },
      completionStatus: 'RECOMMENDATION_DISPLAYED',
      agentVersions: {
        intake: this.currentHandoff.agentVersion,
        navigation: this.currentNavigation?.agentVersion,
        feedback: this.currentFeedbackAnalysis?.agentVersion || null
      },
      ...extra,
      createdAt: new Date().toISOString()
    };
    SyntheticStore.saveEncounter(encounter);
  }

  launchDemoCase(demoId) {
    const demo = DEMO_CASES.find(d => d.id === demoId);
    if (!demo) return;

    const sessionId = `DEMO-${demo.id}-${Date.now().toString().slice(-4)}`;
    let session = this.provider.createIntakeSession(sessionId, demo.scenario, demo.description);
    
    // Pre-populate answers
    Object.entries(demo.presetAnswers).forEach(([key, val]) => {
      session = this.provider.processAnswer(session, key, val);
    });

    this.currentSession = session;
    this.evaluateSessionAndShowResults();
    this.activeTab = 'patient';

    if (session.emergencyStopDetected) {
      this.patientStep = 'emergency_stop';
    } else {
      this.patientStep = 'disposition';
    }

    this.render();
  }

  submitStaffReview(sessionId, reviewForm) {
    const encounters = SyntheticStore.getEncounters();
    const enc = encounters.find(e => e.sessionId === sessionId);
    if (enc) {
      enc.staffReview = {
        status: 'COMPLETED',
        ...reviewForm,
        reviewedAt: new Date().toISOString()
      };
      SyntheticStore.saveEncounter(enc);
      AuditLogger.logEvent(AuditEventType.STAFF_REVIEW_SUBMITTED, sessionId, { review: reviewForm }, 'Staff');
      this.render();
    }
  }

  createImprovementProposal(sessionId, proposedChange) {
    const encounters = SyntheticStore.getEncounters();
    const enc = encounters.find(e => e.sessionId === sessionId);
    if (enc) {
      const proposal = this.provider.createImprovementProposal({
        encounter: enc,
        proposedChange,
        proposedBy: 'Staff Clinician'
      });
      SyntheticStore.saveImprovement(proposal);
      AuditLogger.logEvent(AuditEventType.IMPROVEMENT_ITEM_CREATED, sessionId, { proposalId: proposal.improvementId }, 'Staff');
      this.activeModal = null;
      this.activeTab = 'improvements';
      this.render();
    }
  }

  setDashboardFilter(name, value) {
    if (Object.prototype.hasOwnProperty.call(this.dashboardFilters, name)) {
      this.dashboardFilters[name] = value;
      this.render();
    }
  }

  resetDemoData() {
    SyntheticStore.resetToDefaults();
    AuditLogger.clearLogs();
    this.activeModal = null;
    this.selectedEncounterId = null;
    this.dashboardFilters = { scenario: 'ALL', disposition: 'ALL', safetyFlag: 'ALL', reviewStatus: 'ALL' };
    this.render();
  }

  changeImprovementStatus(improvementId, status) {
    SyntheticStore.updateImprovementStatus(improvementId, status, 'Demonstration governance transition');
    AuditLogger.logEvent(AuditEventType.IMPROVEMENT_STATUS_CHANGED, improvementId, { status }, 'Staff');
    this.render();
  }

  // --- RENDERING VIEWS ---

  render() {
    let mainContentHtml = '';

    if (this.activeTab === 'patient') {
      mainContentHtml = this.renderPatientView();
    } else if (this.activeTab === 'staff') {
      mainContentHtml = this.renderStaffDashboard();
    } else if (this.activeTab === 'improvements') {
      mainContentHtml = this.renderGovernanceView();
    } else if (this.activeTab === 'architecture') {
      mainContentHtml = this.renderArchitectureView();
    }

    const html = `
      <header class="app-header">
        <div class="container header-inner">
          <a href="#" class="brand-logo" onclick="window.app.setTab('patient'); window.app.startNewPatientSession(); return false;">
            <div class="brand-icon">EC</div>
            <div>
              <div class="brand-title">ED COMPASS</div>
              <div class="brand-subtitle">Governed Digital Front Door for Emergency Navigation</div>
            </div>
          </a>
          <nav class="nav-tabs">
            <button class="nav-tab ${this.activeTab === 'patient' ? 'active' : ''}" onclick="window.app.setTab('patient')">
              Patient Portal
            </button>
            <button class="nav-tab ${this.activeTab === 'staff' ? 'active' : ''}" onclick="window.app.setTab('staff')">
              Staff Dashboard
            </button>
            <button class="nav-tab ${this.activeTab === 'improvements' ? 'active' : ''}" onclick="window.app.setTab('improvements')">
              Governance QI (${SyntheticStore.calculateMetrics().openImprovementItems})
            </button>
            <button class="nav-tab ${this.activeTab === 'architecture' ? 'active' : ''}" onclick="window.app.setTab('architecture')">
              How It Works
            </button>
          </nav>
        </div>
        <div class="academic-banner">
          <span class="academic-badge">Academic Prototype</span>
          <span>University of Toronto EMHI1001H Project &bull; Does NOT diagnose patients &bull; For a life-threatening emergency, call 911</span>
        </div>
      </header>

      ${this.renderDemoBar()}

      <main class="container" style="padding-top: 2rem; padding-bottom: 4rem; flex: 1;">
        ${mainContentHtml}
      </main>

      <footer style="background-color: var(--color-surface); border-top: 1px solid var(--color-border); padding: 1.5rem 0; font-size: 0.85rem; color: var(--color-text-muted);">
        <div class="container" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
          <div>
            <strong>ED COMPASS Academic Prototype v1.0</strong> &bull; EMHI1001H &bull; Deterministic Clinical Protocol Enabled
          </div>
          <div>
            Conceptual handoff only—no information has been transmitted.
          </div>
        </div>
      </footer>

      ${this.renderModal()}
    `;

    this.root.innerHTML = html;
  }

  renderDemoBar() {
    return `
      <div style="background-color: var(--color-surface-hover); border-bottom: 1px solid var(--color-border); padding: 0.75rem 0;">
        <div class="container" style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem;">
          <div style="font-size: 0.85rem; font-weight: 600; color: var(--color-text-secondary); display: flex; align-items: center; gap: 0.5rem;">
            <span>⚡ DEMO QUICK LAUNCH:</span>
          </div>
          <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
            ${DEMO_CASES.map(demo => `
              <button class="btn btn-secondary" style="font-size: 0.8rem; padding: 0.4rem 0.75rem;" onclick="window.app.launchDemoCase('${demo.id}')">
                ${demo.title.split(':')[0]}
              </button>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  renderPatientView() {
    switch (this.patientStep) {
      case 'landing':
        return `
          <div class="container-narrow text-center" style="text-align: center; padding: 2rem 0;">
            <div style="display: inline-flex; padding: 1rem; background-color: var(--color-primary-light); color: var(--color-primary-dark); border-radius: var(--radius-full); margin-bottom: 1.5rem; font-size: 2rem;">
              🩺
            </div>
            <h1 style="font-family: var(--font-heading); font-size: 2.5rem; font-weight: 700; margin-bottom: 1rem; color: var(--color-text-primary);">
              Emergency Care Navigation
            </h1>
            <p style="font-size: 1.15rem; color: var(--color-text-secondary); margin-bottom: 2rem; max-width: 600px; margin-left: auto; margin-right: auto;">
              ED Compass helps you assess your current symptoms, identify potential emergency warning signs, and navigate to the right level of care.
            </p>

            <div class="card" style="text-align: left; background: var(--color-surface); margin-bottom: 2rem;">
              <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 0.75rem;">ED Compass helps answer:</h3>
              <ul style="padding-left: 1.25rem; color: var(--color-text-secondary); display: flex; flex-direction: column; gap: 0.5rem;">
                <li>Does my situation contain an emergency warning sign?</li>
                <li>What level of care should I consider next?</li>
                <li>Why is that recommendation being made?</li>
                <li>What warning signs should cause me to escalate?</li>
              </ul>
            </div>

            <button class="btn btn-primary btn-lg" onclick="window.app.startNewPatientSession()">
              Start Safety Assessment &rarr;
            </button>
          </div>
        `;

      case 'consent':
        return `
          <div class="container-narrow">
            <div class="card">
              <h2 style="font-family: var(--font-heading); font-size: 1.75rem; margin-bottom: 1rem;">Academic Prototype Terms & Consent</h2>
              <div style="background-color: var(--color-warning-bg); border-left: 4px solid var(--color-warning); padding: 1rem; border-radius: 4px; margin-bottom: 1.5rem; font-size: 0.9rem; color: #78350F;">
                <strong>IMPORTANT NOTICE:</strong> This application is a non-clinical academic prototype built for University of Toronto EMHI1001H. It does NOT replace 911, Emergency Departments, or 8-1-1 HealthLink BC.
              </div>

              <div style="font-size: 0.95rem; color: var(--color-text-secondary); display: flex; flex-direction: column; gap: 1rem; margin-bottom: 2rem;">
                <p>By proceeding, you acknowledge that:</p>
                <ul style="padding-left: 1.25rem; display: flex; flex-direction: column; gap: 0.5rem;">
                  <li>This system provides automated navigation protocol evaluation, not a medical diagnosis.</li>
                  <li>No personal health numbers (PHN) or real names are collected or transmitted.</li>
                  <li>In a life-threatening emergency, you should call 911 immediately.</li>
                </ul>
              </div>

              <div style="display: flex; gap: 1rem;">
                <button class="btn btn-primary btn-lg btn-full" onclick="window.app.acceptConsent()">
                  I Understand & Agree
                </button>
              </div>
            </div>
          </div>
        `;

      case 'concern_input':
        return `
          <div class="container-narrow">
            <div class="eyebrow">NO WRONG DOOR</div>
            <h2 style="font-family: var(--font-heading); font-size: 1.9rem; margin-bottom: 0.5rem;">Tell us what is happening</h2>
            <p style="color: var(--color-text-muted); margin-bottom: 1.5rem;">You do not need to know which healthcare service to choose before asking for help.</p>

            <div class="card narrative-card">
              <form onsubmit="event.preventDefault(); window.app.submitConcernNarrative(this.concern.value);">
                <label class="form-label" for="concern">Describe the main concern in your own words</label>
                <textarea id="concern" name="concern" class="form-textarea" rows="4" required placeholder="For example: I stepped on a nail through my shoe and I am worried about tetanus."></textarea>
                ${this.narrativeError ? `<div class="inline-error" role="alert">${escapeHtml(this.narrativeError)}</div>` : ''}
                <button type="submit" class="btn btn-primary btn-lg btn-full" style="margin-top: 1rem;">Continue with Safety Intake &rarr;</button>
              </form>
            </div>

            <div class="example-grid" aria-label="Classroom example concerns">
              <button class="example-story" onclick="window.app.submitConcernNarrative('I stepped on a nail through my running shoe and I am not sure about my last tetanus shot.')">
                <span>🦶</span><strong>Nail puncture</strong><small>Wound and tetanus next steps</small>
              </button>
              <button class="example-story" onclick="window.app.submitConcernNarrative('I suddenly developed the worst headache of my life.')">
                <span>🤕</span><strong>Sudden headache</strong><small>Emergency warning-sign check</small>
              </button>
              <button class="example-story" onclick="window.app.submitConcernNarrative('I have had a fever since yesterday and do not know where to seek care.')">
                <span>🤒</span><strong>Fever</strong><small>Risk and care-setting navigation</small>
              </button>
            </div>
          </div>
        `;

      case 'intake':
        return this.renderIntakeQuestion();

      case 'emergency_stop':
        return this.renderEmergencyStop();

      case 'review':
        return this.renderReviewAnswers();

      case 'disposition':
        return this.renderDispositionResult();

      case 'complete':
        return `
          <div class="container-narrow text-center" style="padding: 2rem 0; text-align: center;">
            <div style="font-size: 3rem; margin-bottom: 1rem;">✅</div>
            <h2 style="font-family: var(--font-heading); font-size: 2rem; margin-bottom: 1rem;">Assessment Complete</h2>
            <p style="color: var(--color-text-secondary); margin-bottom: 2rem;">
              Thank you for completing the safety navigation assessment and providing feedback.
            </p>
            <div style="display:flex; gap:0.75rem; justify-content:center; flex-wrap:wrap;">
              <button class="btn btn-primary btn-lg" onclick="window.app.setTab('staff')">Open Learning Dashboard &rarr;</button>
              <button class="btn btn-secondary btn-lg" onclick="window.app.startNewPatientSession()">Start Another Assessment</button>
            </div>
          </div>
        `;
    }
  }

  renderIntakeQuestion() {
    if (!this.currentSession) return '';
    const questions = INTAKE_QUESTIONS[this.currentSession.scenario] || [];
    const idx = this.currentSession.currentQuestionIndex;
    const currentQ = questions[idx];

    if (!currentQ) return '';

    const progressPct = Math.round(((idx + 1) / questions.length) * 100);

    return `
      <div class="container-narrow">
        ${this.currentSession.narrative ? `
          <div class="agent-listening-card">
            <div class="agent-avatar">A1</div>
            <div><strong>I hear that you are concerned about:</strong><br>${escapeHtml(this.currentSession.narrative)}</div>
          </div>
        ` : ''}
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem;">
          <span style="font-size: 0.85rem; font-weight: 600; color: var(--color-primary-dark); text-transform: uppercase;">
            ${currentQ.category} &bull; Question ${idx + 1} of ${questions.length}
          </span>
          <button class="btn btn-danger" style="font-size: 0.75rem; padding: 0.3rem 0.6rem;" onclick="alert('In a severe life-threatening emergency, call 911 immediately.')">
            🚨 Emergency Help (911)
          </button>
        </div>

        <div class="progress-bar-container">
          <div class="progress-bar-fill" style="width: ${progressPct}%;"></div>
        </div>

        <div class="card" style="margin-top: 1.5rem;">
          <h2 style="font-family: var(--font-heading); font-size: 1.4rem; font-weight: 600; margin-bottom: 1.5rem;">
            ${currentQ.label}
          </h2>

          ${currentQ.type === 'boolean' ? `
            <div class="option-button-grid">
              <button class="btn btn-secondary btn-lg" onclick="window.app.answerQuestion('${currentQ.id}', true)">
                YES
              </button>
              <button class="btn btn-secondary btn-lg" onclick="window.app.answerQuestion('${currentQ.id}', false)">
                NO
              </button>
              <button class="btn btn-secondary btn-lg" style="grid-column: 1 / -1; background-color: var(--color-bg);" onclick="window.app.answerQuestion('${currentQ.id}', null, true)">
                I'm Not Sure
              </button>
            </div>
          ` : `
            <div style="display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 1.5rem;">
              ${currentQ.options.map(opt => `
                <button class="option-card" onclick="window.app.answerQuestion('${currentQ.id}', '${opt.value}')">
                  <span>${opt.label}</span>
                  <span>&rarr;</span>
                </button>
              `).join('')}
              <button class="btn btn-secondary" style="margin-top: 0.5rem;" onclick="window.app.answerQuestion('${currentQ.id}', 'unknown', true)">
                I'm Not Sure
              </button>
            </div>
          `}
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center;">
          ${idx > 0 ? `
            <button class="btn btn-secondary" onclick="window.app.currentSession.currentQuestionIndex--; window.app.render();">
              &larr; Back
            </button>
          ` : '<div></div>'}
          <span style="font-size: 0.8rem; color: var(--color-text-muted);">ED Compass Agent 1 (Safety Intake)</span>
        </div>
      </div>
    `;
  }

  renderEmergencyStop() {
    const nav = this.currentNavigation;
    const rule = this.currentRuleResult;

    return `
      <div class="container-narrow">
        <div class="disposition-card disposition-danger-severe">
          <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
            <div style="font-size: 2.5rem;">🚨</div>
            <div>
              <span class="badge badge-danger-severe">EMERGENCY STOP TRIGGERED</span>
              <h1 style="font-family: var(--font-heading); font-size: 2rem; margin-top: 0.25rem;">
                ${nav?.headline || 'Call 911 Immediately'}
              </h1>
            </div>
          </div>
          <p style="font-size: 1.1rem; line-height: 1.6; margin-bottom: 1.5rem; opacity: 0.95;">
            ${nav?.summaryText}
          </p>

          <div style="background-color: rgba(0,0,0,0.2); padding: 1.25rem; border-radius: var(--radius-md); margin-bottom: 1.5rem;">
            <h4 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 0.5rem; text-transform: uppercase;">Required Action:</h4>
            <ul style="padding-left: 1.25rem; display: flex; flex-direction: column; gap: 0.5rem;">
              ${nav?.nextStepActions.map(act => `<li>${act}</li>`).join('')}
            </ul>
          </div>

          <div style="font-size: 0.8rem; opacity: 0.8; text-align: center;">
            Rule ID: ${rule?.ruleId} v${rule?.ruleVersion} &bull; Deterministic Engine Evaluation
          </div>
        </div>

        <div class="card">
          <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 0.75rem;">Safety Instructions</h3>
          <ul style="padding-left: 1.25rem; color: var(--color-text-secondary); display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1.5rem;">
            ${nav?.safetyNetInstructions.map(instr => `<li>${instr}</li>`).join('')}
          </ul>
          <div style="background-color: var(--color-bg); padding: 0.75rem; border-radius: var(--radius-sm); font-size: 0.85rem; color: var(--color-text-muted);">
            ⚠️ ${nav?.conceptualHandoffWarning}
          </div>
        </div>

        ${this.renderAgentCollaboration()}
        ${this.renderFeedbackForm(true)}
      </div>
    `;
  }

  renderReviewAnswers() {
    const questions = INTAKE_QUESTIONS[this.currentSession.scenario] || [];
    const answers = this.currentSession.answers;

    return `
      <div class="container-narrow">
        <h2 style="font-family: var(--font-heading); font-size: 1.75rem; margin-bottom: 0.5rem;">Review Your Answers</h2>
        <p style="color: var(--color-text-muted); margin-bottom: 1.5rem;">Please review your answers before receiving your clinical navigation recommendation:</p>

        <div class="card">
          <div style="display: flex; flex-direction: column; gap: 1rem; margin-bottom: 1.5rem;">
            ${questions.map(q => {
              const val = answers[q.id];
              let displayVal = 'Not Answered';
              if (val === true) displayVal = 'Yes';
              else if (val === false) displayVal = 'No';
              else if (val !== undefined && val !== null) displayVal = String(val);

              return `
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--color-border); padding-bottom: 0.75rem;">
                  <div style="font-size: 0.95rem; font-weight: 500; padding-right: 1rem;">${q.label}</div>
                  <span class="badge ${val === true && q.isEmergencyRedFlag ? 'badge-danger' : 'badge-info'}">
                    ${displayVal}
                  </span>
                </div>
              `;
            }).join('')}
          </div>

          <div style="display: flex; gap: 1rem;">
            <button class="btn btn-secondary" onclick="window.app.reviseAnswers()">
              ✏️ Edit Answers
            </button>
            <button class="btn btn-primary btn-lg btn-full" onclick="window.app.evaluateSessionAndShowResults()">
              Get Navigation Result &rarr;
            </button>
          </div>
        </div>
      </div>
    `;
  }

  renderDispositionResult() {
    const nav = this.currentNavigation;
    const rule = this.currentRuleResult;
    const meta = DISPOSITION_METADATA[rule.disposition];

    return `
      <div class="container-narrow">
        <div class="disposition-card ${meta.colorClass}">
          <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
            <div style="font-size: 2.2rem;">${meta.isEmergency ? '🚨' : '🏥'}</div>
            <div>
              <span class="badge ${meta.badgeClass}">${nav.headline}</span>
              <h1 style="font-family: var(--font-heading); font-size: 1.8rem; margin-top: 0.25rem;">
                ${meta.destinationType}
              </h1>
            </div>
          </div>
          <p style="font-size: 1.1rem; line-height: 1.6; margin-bottom: 1.5rem;">
            ${nav.summaryText}
          </p>

          <div style="background-color: rgba(255,255,255,0.7); padding: 1.25rem; border-radius: var(--radius-md); color: var(--color-text-primary); margin-bottom: 1.5rem;">
            <h4 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 0.5rem; text-transform: uppercase;">What To Do Next:</h4>
            <ul style="padding-left: 1.25rem; display: flex; flex-direction: column; gap: 0.5rem;">
              ${nav.nextStepActions.map(act => `<li>${act}</li>`).join('')}
            </ul>
          </div>
        </div>

        ${this.renderCareOptions()}

        <div class="card">
          <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 0.75rem;">Why this recommendation?</h3>
          <div style="font-size: 0.95rem; color: var(--color-text-secondary); margin-bottom: 1rem;">
            Rule Trigger: <strong>${rule.ruleName}</strong> (Rule ID: <code>${rule.ruleId}</code> v${rule.ruleVersion})
          </div>
          ${nav.triggeringFactsFormatted.length > 0 ? `
            <div style="background-color: var(--color-bg); padding: 1rem; border-radius: var(--radius-md); margin-bottom: 1.5rem;">
              <div style="font-size: 0.85rem; font-weight: 600; color: var(--color-text-muted); margin-bottom: 0.5rem;">KEY FACTORS IDENTIFIED:</div>
              <ul style="padding-left: 1.25rem; font-size: 0.9rem; color: var(--color-text-primary);">
                ${nav.triggeringFactsFormatted.map(f => `<li>${f}</li>`).join('')}
              </ul>
            </div>
          ` : ''}

          <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 0.75rem;">Safety-Net Instructions (When to Escalate)</h3>
          <ul style="padding-left: 1.25rem; color: var(--color-text-secondary); display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1.5rem;">
            ${nav.safetyNetInstructions.map(instr => `<li>${instr}</li>`).join('')}
          </ul>

          <div style="background-color: var(--color-info-bg); border-left: 4px solid var(--color-info); padding: 0.75rem 1rem; border-radius: 4px; font-size: 0.85rem; color: #0C4A6E;">
            ℹ️ ${nav.conceptualHandoffWarning}
          </div>
        </div>
        ${this.renderAgentCollaboration()}
        ${this.renderFeedbackForm(false)}
      </div>
    `;
  }

  renderCareOptions() {
    const disposition = this.currentRuleResult?.disposition;
    if (disposition === Disposition.CALL_911_NOW) return '';

    const scenario = this.currentSession?.scenario;
    const options = [];
    if (disposition === Disposition.GO_TO_ED_NOW) {
      options.push(['Emergency Department', 'Go now. Do not delay to verify wait times.']);
      options.push(['HealthLink BC 8-1-1', 'Call only if it does not delay emergency care.']);
    } else if (disposition === Disposition.SAME_DAY_CLINICAL_ASSESSMENT) {
      options.push(['Urgent and Primary Care Centre', 'Same-day wound or symptom assessment.']);
      options.push(['Primary care or walk-in clinic', 'Call ahead to confirm same-day capacity.']);
      options.push(['HealthLink BC 8-1-1', 'A registered nurse can help identify an appropriate service.']);
    } else if (disposition === Disposition.CONTACT_811_OR_PRIMARY_CARE) {
      options.push(['HealthLink BC 8-1-1', 'Free registered-nurse advice in British Columbia.']);
      options.push(['Primary care or community clinic', 'Arrange non-emergency assessment.']);
      if (scenario === Scenario.NAIL_PUNCTURE) options.push(['Pharmacy or public-health service', 'Call first to confirm vaccination services.']);
    } else {
      options.push(['Home monitoring', 'Follow the safety-net instructions shown above.']);
      options.push(['HealthLink BC 8-1-1', 'Call if you remain concerned or symptoms change.']);
    }

    const nailSummary = scenario === Scenario.NAIL_PUNCTURE ? `
      <div class="nail-summary-grid">
        <div><span>Wound assessment</span><strong>${disposition === Disposition.SAME_DAY_CLINICAL_ASSESSMENT ? 'Same-day assessment recommended' : 'Follow the care level shown above'}</strong></div>
        <div><span>Tetanus assessment</span><strong>${['over_5_years', 'unknown', 'never'].includes(this.currentHandoff?.answers?.tetanusStatus) ? 'A tetanus-containing vaccine may be recommended' : 'Recent vaccination reported'}</strong></div>
        <div><span>Tetanus immune globulin</span><strong>Healthcare professional to confirm</strong></div>
      </div>
    ` : '';

    return `
      <div class="card care-options-card">
        <div class="section-heading-row">
          <div><div class="eyebrow">AGENT 2 — PRACTICAL NAVIGATION</div><h3>Care options for this demonstration</h3></div>
          <span class="badge badge-info">SYNTHETIC</span>
        </div>
        ${nailSummary}
        <div class="care-option-grid">
          ${options.map(([title, detail]) => `<div class="care-option"><strong>${title}</strong><span>${detail}</span></div>`).join('')}
        </div>
        <p class="demo-caveat">Service availability, opening hours and wait times have not been verified. Conceptual handoff only—no information has been transmitted.</p>
      </div>
    `;
  }

  renderAgentCollaboration() {
    const rule = this.currentRuleResult;
    if (!rule) return '';
    return `
      <div class="card collaboration-card">
        <div class="eyebrow">VISIBLE AGENT COLLABORATION</div>
        <h3>How ED Compass produced this guidance</h3>
        <div class="collaboration-flow">
          <div class="collaboration-step complete"><span>A1</span><strong>Listen & Intake</strong><small>Structured ${Object.keys(this.currentHandoff?.answers || {}).length} reported facts</small></div>
          <div class="flow-arrow">→</div>
          <div class="collaboration-step rule"><span>R</span><strong>Safety Rules</strong><small>Applied ${escapeHtml(rule.ruleId)} v${escapeHtml(rule.ruleVersion)}</small></div>
          <div class="flow-arrow">→</div>
          <div class="collaboration-step complete"><span>A2</span><strong>Care Navigation</strong><small>Explained the approved route and safety net</small></div>
          <div class="flow-arrow">→</div>
          <div class="collaboration-step"><span>A3</span><strong>Feedback & Learning</strong><small>Ready to capture patient and provider feedback</small></div>
        </div>
      </div>
    `;
  }

  renderFeedbackForm(compact = false) {
    return `
      <div class="card feedback-card">
        <div class="eyebrow">AGENT 3 — FEEDBACK & LEARNING</div>
        <h3 style="font-size: 1.2rem; font-weight: 700; margin-bottom: 0.35rem;">Was this guidance understandable and realistic?</h3>
        <p style="color: var(--color-text-muted); margin-bottom: 1rem;">Your feedback becomes a synthetic review item; it never changes a clinical rule automatically.</p>
        <form onsubmit="event.preventDefault(); window.app.submitPatientFeedback({
          helpful: this.helpful.value === 'yes',
          clarityScore: this.clarityScore.value,
          trustScore: this.trustScore.value,
          confidenceScore: this.confidenceScore.value,
          isNextStepClear: this.isNextStepClear.value === 'yes',
          knowsEscalation: this.knowsEscalation.value === 'yes',
          canFollow: this.canFollow.value,
          accessBarrier: this.accessBarrier.value,
          unsafeConcern: this.unsafeConcern.checked,
          confusingItems: this.confusingItems.value,
          comments: this.comments.value
        });">
          <div class="feedback-grid">
            <label class="form-group"><span class="form-label">Helpful?</span><select name="helpful" class="form-select"><option value="yes">👍 Yes</option><option value="no">👎 No</option></select></label>
            <label class="form-group"><span class="form-label">Clarity (1–5)</span><select name="clarityScore" class="form-select">${ratingOptions()}</select></label>
            <label class="form-group"><span class="form-label">Trust (1–5)</span><select name="trustScore" class="form-select">${ratingOptions()}</select></label>
            <label class="form-group"><span class="form-label">Confidence (1–5)</span><select name="confidenceScore" class="form-select">${ratingOptions()}</select></label>
            <label class="form-group"><span class="form-label">Next step clear?</span><select name="isNextStepClear" class="form-select"><option value="yes">Yes</option><option value="no">No</option></select></label>
            <label class="form-group"><span class="form-label">Know when to escalate?</span><select name="knowsEscalation" class="form-select"><option value="yes">Yes</option><option value="no">No</option></select></label>
            <label class="form-group"><span class="form-label">Can you follow this plan?</span><select name="canFollow" class="form-select"><option value="yes">Yes</option><option value="maybe">Maybe</option><option value="no">No</option></select></label>
            <label class="form-group"><span class="form-label">Main access barrier</span><select name="accessBarrier" class="form-select"><option value="">None</option><option value="transportation">Transportation</option><option value="childcare">Childcare</option><option value="distance">Distance</option><option value="cost">Cost</option><option value="language">Language</option><option value="mobility">Mobility or disability</option><option value="trust">Cultural safety or trust</option></select></label>
          </div>
          <label class="safety-checkbox"><input type="checkbox" name="unsafeConcern" /> I believe something about this guidance could be unsafe.</label>
          ${compact ? '<input type="hidden" name="confusingItems" value="" />' : '<label class="form-group"><span class="form-label">Was anything confusing or missing?</span><input type="text" name="confusingItems" class="form-control" placeholder="Optional" /></label>'}
          <label class="form-group"><span class="form-label">Additional comment</span><textarea name="comments" class="form-textarea" rows="2" placeholder="Optional feedback"></textarea></label>
          <button type="submit" class="btn btn-primary btn-lg btn-full">Submit Feedback & Update Dashboard &rarr;</button>
        </form>
      </div>
    `;
  }

  // --- STAFF DASHBOARD & GOVERNANCE VIEWS ---

  renderStaffDashboard() {
    const metrics = SyntheticStore.calculateMetrics();
    const encounters = SyntheticStore.getEncounters().filter(enc => {
      if (this.dashboardFilters.scenario !== 'ALL' && enc.scenario !== this.dashboardFilters.scenario) return false;
      if (this.dashboardFilters.disposition !== 'ALL' && enc.disposition !== this.dashboardFilters.disposition) return false;
      if (this.dashboardFilters.safetyFlag !== 'ALL' && (enc.feedbackAnalysis?.feedbackStream || 'PATIENT_EXPERIENCE') !== this.dashboardFilters.safetyFlag) return false;
      if (this.dashboardFilters.reviewStatus !== 'ALL' && (enc.staffReview?.status || 'PENDING') !== this.dashboardFilters.reviewStatus) return false;
      return true;
    });
    const topBarriers = Object.entries(metrics.barrierCounts || {}).sort((a, b) => b[1] - a[1]);

    return `
      <div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
          <div>
            <div class="eyebrow">PROVIDER + HEALTH-SYSTEM VIEW</div>
            <h1 style="font-family: var(--font-heading); font-size: 2rem; font-weight: 700;">Learning System Dashboard</h1>
            <p style="color: var(--color-text-muted); font-size: 0.9rem;">Learn from patient experience, provider review and system-level navigation patterns.</p>
          </div>
          <div style="display: flex; gap: 0.5rem;">
            <button class="btn btn-secondary" onclick="window.app.resetDemoData();">
              🔄 Reset Demo Data
            </button>
          </div>
        </div>

        <div style="background-color: var(--color-info-bg); border-left: 4px solid var(--color-info); padding: 0.75rem 1rem; border-radius: 4px; margin-bottom: 1.5rem; font-size: 0.85rem; color: #0C4A6E;">
          📊 <strong>SYNTHETIC DEMONSTRATION DATA:</strong> Dashboard values reflect simulated educational test encounters.
        </div>

        <div class="perspective-grid">
          <div class="perspective-card"><span>01</span><strong>Patient experience</strong><small>Clarity, trust, confidence and barriers to following the recommendation.</small></div>
          <div class="perspective-card"><span>02</span><strong>Provider learning</strong><small>Agreement, missed questions, safety concerns and qualitative review.</small></div>
          <div class="perspective-card"><span>03</span><strong>System learning</strong><small>Care destinations, pathway demand, access barriers and improvement opportunities.</small></div>
        </div>

        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-title">Filtered Interactions</div>
            <div class="metric-value">${encounters.length}</div>
            <div class="metric-subtext">${metrics.totalEncounters} total synthetic records</div>
          </div>
          <div class="metric-card">
            <div class="metric-title">Community Navigation</div>
            <div class="metric-value" style="color: var(--color-primary);">${metrics.communityNavigationRate}</div>
            <div class="metric-subtext">Not a claim of avoided ED visits</div>
          </div>
          <div class="metric-card">
            <div class="metric-title">Avg Clarity</div>
            <div class="metric-value" style="color: var(--color-success);">${metrics.avgClarity} / 5</div>
            <div class="metric-subtext">Patient-reported understanding</div>
          </div>
          <div class="metric-card">
            <div class="metric-title">Avg Trust</div>
            <div class="metric-value" style="color: var(--color-primary);">${metrics.avgTrust} / 5</div>
            <div class="metric-subtext">Patient trust rating</div>
          </div>
          <div class="metric-card">
            <div class="metric-title">Plan Feasible</div>
            <div class="metric-value">${metrics.canFollowRate}</div>
            <div class="metric-subtext">Patients reporting “Yes”</div>
          </div>
          <div class="metric-card">
            <div class="metric-title">Safety Concerns</div>
            <div class="metric-value" style="color: var(--color-warning);">${metrics.safetyConcernCount}</div>
            <div class="metric-subtext">Flagged for QI review</div>
          </div>
        </div>

        <div class="dashboard-insight-grid">
          <div class="card"><div class="eyebrow">CARE DESTINATIONS</div><h3>${metrics.emergencyCount} emergency · ${metrics.communityCount} community/home</h3><p>Shows where the governed pathways recommended care—not whether an ED visit was definitively avoided.</p></div>
          <div class="card"><div class="eyebrow">ACCESS BARRIERS</div><h3>${topBarriers.length ? topBarriers.map(([key, count]) => `${escapeHtml(key)} (${count})`).join(' · ') : 'No barriers reported'}</h3><p>Barriers help planners understand whether a recommendation is realistically actionable.</p></div>
          <div class="card"><div class="eyebrow">PROVIDER AGREEMENT</div><h3>${metrics.staffAgreementRate}</h3><p>Disposition agreement among completed synthetic staff reviews.</p></div>
        </div>

        <div class="card">
          <div class="section-heading-row"><div><div class="eyebrow">REVIEW QUEUE</div><h3>Synthetic encounter log</h3></div></div>
          <div class="filter-grid">
            <label><span>Pathway</span><select class="form-select" onchange="window.app.setDashboardFilter('scenario', this.value)"><option value="ALL">All</option>${Object.values(Scenario).map(v => `<option value="${v}" ${this.dashboardFilters.scenario === v ? 'selected' : ''}>${v.replace('_', ' ')}</option>`).join('')}</select></label>
            <label><span>Disposition</span><select class="form-select" onchange="window.app.setDashboardFilter('disposition', this.value)"><option value="ALL">All</option>${Object.values(Disposition).map(v => `<option value="${v}" ${this.dashboardFilters.disposition === v ? 'selected' : ''}>${DISPOSITION_METADATA[v].label}</option>`).join('')}</select></label>
            <label><span>Feedback stream</span><select class="form-select" onchange="window.app.setDashboardFilter('safetyFlag', this.value)"><option value="ALL">All</option><option value="PATIENT_EXPERIENCE" ${this.dashboardFilters.safetyFlag === 'PATIENT_EXPERIENCE' ? 'selected' : ''}>Patient experience</option><option value="SAFETY_SURVEILLANCE" ${this.dashboardFilters.safetyFlag === 'SAFETY_SURVEILLANCE' ? 'selected' : ''}>Safety surveillance</option></select></label>
            <label><span>Review status</span><select class="form-select" onchange="window.app.setDashboardFilter('reviewStatus', this.value)"><option value="ALL">All</option><option value="PENDING" ${this.dashboardFilters.reviewStatus === 'PENDING' ? 'selected' : ''}>Pending</option><option value="COMPLETED" ${this.dashboardFilters.reviewStatus === 'COMPLETED' ? 'selected' : ''}>Completed</option></select></label>
          </div>

          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Session ID</th>
                  <th>Scenario</th>
                  <th>Disposition</th>
                  <th>Rule ID & Version</th>
                  <th>Patient Feedback</th>
                  <th>Feedback Stream</th>
                  <th>Staff Review</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                ${encounters.map(enc => {
                  const meta = DISPOSITION_METADATA[enc.disposition];
                  const hasSafetyFlag = enc.feedbackAnalysis?.isSafetyConcern;
                  const reviewDone = enc.staffReview?.status === 'COMPLETED';

                  return `
                    <tr onclick="window.app.openEncounterModal('${enc.sessionId}')">
                      <td><code>${enc.sessionId}</code></td>
                      <td style="text-transform: capitalize;">${enc.scenario?.replace('_', ' ')}</td>
                      <td>
                        <span class="badge ${meta?.badgeClass}">${meta?.label || enc.disposition}</span>
                      </td>
                      <td><code>${enc.ruleId}</code> v${enc.ruleVersion}</td>
                      <td>${enc.patientFeedback?.clarityScore ? `Clarity ${enc.patientFeedback.clarityScore}/5 · Trust ${enc.patientFeedback.trustScore || 'N/A'}/5` : 'Awaiting feedback'}</td>
                      <td>
                        ${hasSafetyFlag ? '<span class="badge badge-danger">⚠️ SAFETY SURVEILLANCE</span>' : '<span class="badge badge-info">PATIENT EXPERIENCE</span>'}
                      </td>
                      <td>
                        ${reviewDone ? '<span class="badge badge-success">COMPLETED</span>' : '<span class="badge badge-warning">PENDING</span>'}
                      </td>
                      <td>
                        <button class="btn btn-secondary" style="font-size: 0.75rem; padding: 0.25rem 0.5rem;">View</button>
                      </td>
                    </tr>
                  `;
                }).join('') || '<tr><td colspan="8" style="text-align:center; padding:2rem;">No encounters match the selected filters.</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  renderArchitectureView() {
    return `
      <div class="architecture-page">
        <div class="architecture-hero">
          <div class="eyebrow">NO WRONG DOOR + GOVERNED LEARNING</div>
          <h1>One front door, several safe care destinations</h1>
          <p>ED Compass listens first, separates conversational support from clinical disposition, and turns patient and provider feedback into governed improvement—not automatic rule changes.</p>
        </div>

        <div class="architecture-lanes">
          <section class="architecture-lane patient-lane">
            <div class="lane-title"><span>Patient-facing layer</span><small>Listen · assess · explain · navigate</small></div>
            <div class="architecture-flow">
              <div class="architecture-node"><b>Patient or caregiver</b><small>Describes the concern in their own words</small></div>
              <div class="architecture-arrow">→</div>
              <div class="architecture-node agent-node"><b>Agent 1</b><small>Safety intake and structured facts</small></div>
              <div class="architecture-arrow">→</div>
              <div class="architecture-node safety-node"><b>Deterministic rules</b><small>Only source of disposition and safety net</small></div>
              <div class="architecture-arrow">→</div>
              <div class="architecture-node agent-node"><b>Agent 2</b><small>Plain-language care navigation</small></div>
            </div>
          </section>

          <section class="architecture-lane routing-lane">
            <div class="lane-title"><span>Conceptual care-routing layer</span><small>No live information is transmitted</small></div>
            <div class="destination-grid">
              <div>Call 911 now</div><div>Emergency department</div><div>Same-day urgent care</div><div>8-1-1 / primary care</div><div>Home monitoring</div>
            </div>
          </section>

          <section class="architecture-lane learning-lane">
            <div class="lane-title"><span>Learning and governance layer</span><small>Patient · provider · health system</small></div>
            <div class="architecture-flow">
              <div class="architecture-node agent-node"><b>Agent 3</b><small>Classifies experience and safety feedback</small></div>
              <div class="architecture-arrow">→</div>
              <div class="architecture-node"><b>Synthetic dashboard</b><small>Shows navigation, trust, barriers and review</small></div>
              <div class="architecture-arrow">→</div>
              <div class="architecture-node governance-node"><b>Human governance</b><small>Review → test → approve → monitor</small></div>
              <div class="architecture-loop">↺ Versioned pathway update only after approval</div>
            </div>
          </section>
        </div>

        <div class="boundary-grid">
          <div class="card"><div class="eyebrow">SAFETY BOUNDARY</div><h3>Agents cannot override the rule engine</h3><p>Conversational components may listen, structure, explain and classify. They cannot change urgency, route, rule ID, version or safety-net instructions.</p></div>
          <div class="card"><div class="eyebrow">DATA BOUNDARY</div><h3>Synthetic local demonstration data</h3><p>No names, health numbers, addresses or real clinical-system connections are used in this academic prototype.</p></div>
          <div class="card"><div class="eyebrow">INTEGRATION BOUNDARY</div><h3>Conceptual service routing</h3><p>911, HealthLink BC 8-1-1, HEiDi, RTVS, EHRs and service directories are not connected.</p></div>
        </div>
      </div>
    `;
  }

  renderGovernanceView() {
    const improvements = SyntheticStore.getImprovements();

    return `
      <div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
          <div>
            <h1 style="font-family: var(--font-heading); font-size: 2rem; font-weight: 700;">Governed Improvement Workflow</h1>
            <p style="color: var(--color-text-muted); font-size: 0.9rem;">Track pathway change proposals, clinical review stages, and version releases.</p>
          </div>
        </div>

        <div class="card">
          <h3 style="font-size: 1.2rem; font-weight: 700; margin-bottom: 1rem;">Quality Improvement Proposals</h3>

          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Improvement ID</th>
                  <th>Source Session</th>
                  <th>Scenario</th>
                  <th>Current Rule</th>
                  <th>Proposed Change</th>
                  <th>Status</th>
                  <th>Reviewer</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${improvements.map(imp => `
                  <tr>
                    <td><code>${imp.improvementId}</code></td>
                    <td><code>${imp.sourceSessionId}</code></td>
                    <td style="text-transform: capitalize;">${imp.scenario}</td>
                    <td><code>${imp.currentRuleId}</code> v${imp.currentRuleVersion}</td>
                    <td style="max-width: 250px;">${escapeHtml(imp.proposedChange)}</td>
                    <td>
                      <select class="form-select" style="font-size: 0.8rem; padding: 0.25rem;" onchange="window.app.changeImprovementStatus('${imp.improvementId}', this.value);">
                        ${Object.values(ImprovementStatus).map(st => `
                          <option value="${st}" ${imp.status === st ? 'selected' : ''}>${st}</option>
                        `).join('')}
                      </select>
                    </td>
                    <td>${escapeHtml(imp.reviewer)}</td>
                    <td>
                      <button class="btn btn-secondary" style="font-size: 0.75rem; padding: 0.25rem 0.5rem;" onclick="alert('This synthetic proposal remains subject to human clinical review, testing and approval.')">
                        Audit
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  // --- MODALS ---

  openEncounterModal(sessionId) {
    this.selectedEncounterId = sessionId;
    this.activeModal = 'encounter_detail';
    this.render();
  }

  closeModal() {
    this.activeModal = null;
    this.selectedEncounterId = null;
    this.render();
  }

  renderModal() {
    if (!this.activeModal) return '';

    if (this.activeModal === 'encounter_detail') {
      const encounters = SyntheticStore.getEncounters();
      const enc = encounters.find(e => e.sessionId === this.selectedEncounterId);
      if (!enc) return '';

      const auditLogs = AuditLogger.getLogs(enc.sessionId);

      return `
        <div class="modal-overlay" onclick="if (event.target === this) window.app.closeModal();">
          <div class="modal-content">
            <div class="modal-header">
              <div>
                <span class="badge badge-info">ENCOUNTER REVIEW</span>
                <h2 style="font-family: var(--font-heading); font-size: 1.5rem; margin-top: 0.25rem;">
                  Session <code>${enc.sessionId}</code>
                </h2>
              </div>
              <button class="close-btn" onclick="window.app.closeModal()">&times;</button>
            </div>

            <div style="display: flex; flex-direction: column; gap: 1.25rem;">
              <!-- FACT SUMMARY -->
              <div style="background-color: var(--color-bg); padding: 1rem; border-radius: var(--radius-md);">
                <h4 style="font-size: 0.9rem; font-weight: 700; text-transform: uppercase; color: var(--color-text-muted); margin-bottom: 0.5rem;">Patient Answer Facts:</h4>
                <pre style="font-size: 0.85rem; font-family: monospace; white-space: pre-wrap; background: #FFF; padding: 0.75rem; border-radius: 4px; border: 1px solid var(--color-border);">${JSON.stringify(enc.answers, null, 2)}</pre>
              </div>

              <!-- RULE ENGINE RESULT -->
              <div style="background-color: var(--color-primary-light); padding: 1rem; border-radius: var(--radius-md);">
                <h4 style="font-size: 0.9rem; font-weight: 700; color: var(--color-primary-dark); margin-bottom: 0.25rem;">
                  Rule Engine Evaluation Output:
                </h4>
                <div style="font-size: 0.95rem; font-weight: 600;">
                  Disposition: ${enc.disposition} &bull; Rule ID: ${enc.ruleId} v${enc.ruleVersion}
                </div>
              </div>

              <div class="review-feedback-summary">
                <div class="eyebrow">PATIENT FEEDBACK</div>
                ${enc.patientFeedback ? `
                  <div class="feedback-summary-grid">
                    <span>Clarity <strong>${enc.patientFeedback.clarityScore}/5</strong></span>
                    <span>Trust <strong>${enc.patientFeedback.trustScore || 'N/A'}/5</strong></span>
                    <span>Can follow <strong>${escapeHtml(enc.patientFeedback.canFollow || 'N/A')}</strong></span>
                    <span>Barrier <strong>${escapeHtml(enc.patientFeedback.accessBarrier || 'None')}</strong></span>
                  </div>
                  <p><strong>Comment:</strong> ${escapeHtml(enc.patientFeedback.comments || 'No comment provided.')}</p>
                  <p><strong>Feedback stream:</strong> ${escapeHtml(enc.feedbackAnalysis?.feedbackStream || 'PATIENT_EXPERIENCE')}</p>
                ` : '<p>Patient feedback has not yet been submitted. The recommendation was still retained for quality review.</p>'}
              </div>

              <!-- STAFF REVIEW FORM -->
              <div style="border: 1px solid var(--color-border); padding: 1rem; border-radius: var(--radius-md);">
                <h4 style="font-size: 1rem; font-weight: 700; margin-bottom: 0.75rem;">Staff Clinical Quality Review</h4>
                <form onsubmit="event.preventDefault(); window.app.submitStaffReview('${enc.sessionId}', {
                  dispositionAppropriate: this.dispositionAppropriate.value,
                  essentialQuestionsAsked: this.essentialQuestionsAsked.value,
                  explanationClear: this.explanationClear.value,
                  reviewerNotes: this.reviewerNotes.value
                });">
                  <div class="form-group">
                    <label class="form-label">Was disposition appropriate?</label>
                    <select name="dispositionAppropriate" class="form-select">
                      <option value="YES" ${enc.staffReview?.dispositionAppropriate === 'YES' ? 'selected' : ''}>YES - Appropriate</option>
                      <option value="TOO_CAUTIOUS" ${enc.staffReview?.dispositionAppropriate === 'TOO_CAUTIOUS' ? 'selected' : ''}>TOO CAUTIOUS</option>
                      <option value="TOO_LOW" ${enc.staffReview?.dispositionAppropriate === 'TOO_LOW' ? 'selected' : ''}>TOO LOW / POTENTIALLY UNSAFE</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label class="form-label">Were essential questions asked?</label>
                    <select name="essentialQuestionsAsked" class="form-select">
                      <option value="YES" ${enc.staffReview?.essentialQuestionsAsked === 'YES' ? 'selected' : ''}>YES</option>
                      <option value="NO" ${enc.staffReview?.essentialQuestionsAsked === 'NO' ? 'selected' : ''}>NO</option>
                      <option value="UNSURE" ${enc.staffReview?.essentialQuestionsAsked === 'UNSURE' ? 'selected' : ''}>UNSURE</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label class="form-label">Was the explanation clear?</label>
                    <select name="explanationClear" class="form-select">
                      <option value="YES" ${enc.staffReview?.explanationClear === 'YES' ? 'selected' : ''}>YES</option>
                      <option value="NO" ${enc.staffReview?.explanationClear === 'NO' ? 'selected' : ''}>NO</option>
                      <option value="UNSURE" ${enc.staffReview?.explanationClear === 'UNSURE' ? 'selected' : ''}>UNSURE</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label class="form-label">Reviewer Clinical Notes</label>
                    <textarea name="reviewerNotes" class="form-textarea" rows="2" placeholder="Clinical audit notes...">${escapeHtml(enc.staffReview?.reviewerNotes || '')}</textarea>
                  </div>
                  <div style="display: flex; gap: 0.75rem;">
                    <button type="submit" class="btn btn-primary">Save Review</button>
                    <button type="button" class="btn btn-secondary" onclick="window.app.openCreateImprovementModal('${enc.sessionId}')">
                      💡 Propose Improvement Item
                    </button>
                  </div>
                </form>
              </div>

              <!-- AUDIT LOG TRAIL -->
              <div>
                <h4 style="font-size: 0.9rem; font-weight: 700; text-transform: uppercase; color: var(--color-text-muted); margin-bottom: 0.5rem;">Audit Trail Events:</h4>
                <div style="max-height: 150px; overflow-y: auto; font-size: 0.8rem; background: var(--color-bg); padding: 0.5rem; border-radius: 4px;">
                  ${auditLogs.length > 0 ? auditLogs.map(log => `
                    <div style="padding: 0.25rem 0; border-bottom: 1px dashed var(--color-border);">
                      <code>${log.timestamp.slice(11, 19)}</code> &bull; <strong>${log.eventType}</strong> by ${log.actor}
                    </div>
                  `).join('') : '<div style="color: var(--color-text-muted);">No audit events recorded for this session yet.</div>'}
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    if (this.activeModal === 'create_improvement') {
      const encounters = SyntheticStore.getEncounters();
      const enc = encounters.find(e => e.sessionId === this.selectedEncounterId);

      return `
        <div class="modal-overlay" onclick="if (event.target === this) window.app.closeModal();">
          <div class="modal-content">
            <div class="modal-header">
              <h2 style="font-family: var(--font-heading); font-size: 1.5rem;">Propose Pathway Improvement</h2>
              <button class="close-btn" onclick="window.app.closeModal()">&times;</button>
            </div>
            <form onsubmit="event.preventDefault(); window.app.createImprovementProposal('${enc?.sessionId}', this.proposedChange.value);">
              <p style="font-size: 0.9rem; color: var(--color-text-muted); margin-bottom: 1rem;">
                Source Session: <code>${enc?.sessionId}</code> (Rule: <code>${enc?.ruleId}</code> v${enc?.ruleVersion})
              </p>
              <div class="form-group">
                <label class="form-label">Proposed Rule / Pathway Change Description</label>
                <textarea name="proposedChange" class="form-textarea" rows="4" required placeholder="Describe the recommended update to questions, rules, or explanations..."></textarea>
              </div>
              <button type="submit" class="btn btn-primary btn-lg btn-full">
                Submit Proposal to Governance Queue &rarr;
              </button>
            </form>
          </div>
        </div>
      `;
    }

    return '';
  }

  openCreateImprovementModal(sessionId) {
    this.selectedEncounterId = sessionId;
    this.activeModal = 'create_improvement';
    this.render();
  }
}

function ratingOptions() {
  return [5, 4, 3, 2, 1]
    .map(value => `<option value="${value}" ${value === 5 ? 'selected' : ''}>${value}</option>`)
    .join('');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

// Global initialization helper
window.initEDCompass = function(elementId) {
  const root = document.getElementById(elementId);
  if (root) {
    window.app = new AppController(root);
  }
};
