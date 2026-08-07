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
    this.activeTab = 'patient'; // 'patient' | 'staff' | 'improvements'
    this.patientStep = 'landing'; // 'landing' | 'consent' | 'scenario_select' | 'intake' | 'emergency_stop' | 'review' | 'disposition' | 'feedback' | 'complete'
    
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
    this.patientStep = 'scenario_select';
    this.render();
  }

  selectScenario(scenario) {
    const sessionId = `EDC-${Date.now().toString().slice(-6)}`;
    this.currentSession = this.provider.createIntakeSession(sessionId, scenario);
    AuditLogger.logEvent(AuditEventType.SCENARIO_SELECTED, sessionId, { scenario });
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

    // Save encounter to synthetic store
    const encounter = {
      sessionId: this.currentSession.sessionId,
      scenario: this.currentSession.scenario,
      disposition: this.currentRuleResult.disposition,
      ruleId: this.currentRuleResult.ruleId,
      ruleVersion: this.currentRuleResult.ruleVersion,
      answers: this.currentHandoff.answers,
      ruleResult: this.currentRuleResult,
      navigation: this.currentNavigation,
      patientFeedback: this.currentFeedbackAnalysis.patientFeedback,
      feedbackAnalysis: this.currentFeedbackAnalysis.qualityAnalysis,
      staffReview: { status: 'PENDING' },
      createdAt: new Date().toISOString()
    };

    SyntheticStore.saveEncounter(encounter);
    this.patientStep = 'complete';
    this.render();
  }

  launchDemoCase(demoId) {
    const demo = DEMO_CASES.find(d => d.id === demoId);
    if (!demo) return;

    const sessionId = `DEMO-${demo.id}-${Date.now().toString().slice(-4)}`;
    let session = this.provider.createIntakeSession(sessionId, demo.scenario);
    
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

  // --- RENDERING VIEWS ---

  render() {
    let mainContentHtml = '';

    if (this.activeTab === 'patient') {
      mainContentHtml = this.renderPatientView();
    } else if (this.activeTab === 'staff') {
      mainContentHtml = this.renderStaffDashboard();
    } else if (this.activeTab === 'improvements') {
      mainContentHtml = this.renderGovernanceView();
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
          </nav>
        </div>
        <div class="academic-banner">
          <span class="academic-badge">Academic Prototype</span>
          <span>University of Toronto EMHI1001H Project &bull; NOT a production clinical system &bull; Does NOT diagnose patients</span>
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

      case 'scenario_select':
        return `
          <div class="container-narrow">
            <h2 style="font-family: var(--font-heading); font-size: 1.75rem; margin-bottom: 0.5rem;">Select What You Are Experiencing</h2>
            <p style="color: var(--color-text-muted); margin-bottom: 1.5rem;">Choose the scenario that best matches your primary concern:</p>

            <div style="display: flex; flex-direction: column; gap: 1rem;">
              <div class="card card-interactive" onclick="window.app.selectScenario('${Scenario.NAIL_PUNCTURE}')" style="cursor: pointer; display: flex; align-items: center; justify-content: space-between;">
                <div>
                  <h3 style="font-size: 1.2rem; font-weight: 700; color: var(--color-primary-dark);">🦶 Stepped on a Nail / Puncture Wound</h3>
                  <p style="font-size: 0.9rem; color: var(--color-text-muted); margin-top: 0.25rem;">Puncture wound to foot or body, rusty/dirty nail, tetanus concerns.</p>
                </div>
                <div style="font-size: 1.5rem; color: var(--color-primary);">&rarr;</div>
              </div>

              <div class="card card-interactive" onclick="window.app.selectScenario('${Scenario.HEADACHE}')" style="cursor: pointer; display: flex; align-items: center; justify-content: space-between;">
                <div>
                  <h3 style="font-size: 1.2rem; font-weight: 700; color: var(--color-primary-dark);">🤕 Headache</h3>
                  <p style="font-size: 0.9rem; color: var(--color-text-muted); margin-top: 0.25rem;">Sudden onset severe headache, neurological symptoms, pattern changes.</p>
                </div>
                <div style="font-size: 1.5rem; color: var(--color-primary);">&rarr;</div>
              </div>

              <div class="card card-interactive" onclick="window.app.selectScenario('${Scenario.FEVER}')" style="cursor: pointer; display: flex; align-items: center; justify-content: space-between;">
                <div>
                  <h3 style="font-size: 1.2rem; font-weight: 700; color: var(--color-primary-dark);">🤒 Fever</h3>
                  <p style="font-size: 0.9rem; color: var(--color-text-muted); margin-top: 0.25rem;">High temperature, infants, respiratory issues, immunocompromised risk.</p>
                </div>
                <div style="font-size: 1.5rem; color: var(--color-primary);">&rarr;</div>
              </div>
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
            <button class="btn btn-primary btn-lg" onclick="window.app.startNewPatientSession()">
              Start Another Assessment
            </button>
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

        <div class="card">
          <h3 style="font-size: 1.2rem; font-weight: 700; margin-bottom: 1rem;">Was this guidance clear and useful?</h3>
          <form onsubmit="event.preventDefault(); window.app.submitPatientFeedback({
            clarityScore: this.clarityScore.value,
            confidenceScore: this.confidenceScore.value,
            isNextStepClear: this.isNextStepClear.value === 'yes',
            knowsEscalation: this.knowsEscalation.value === 'yes',
            confusingItems: this.confusingItems.value,
            comments: this.comments.value
          });">
            <div class="form-group">
              <label class="form-label">How clear was the next step recommendation? (1 = Confusing, 5 = Extremely Clear)</label>
              <select name="clarityScore" class="form-select">
                <option value="5" selected>5 - Extremely Clear</option>
                <option value="4">4 - Clear</option>
                <option value="3">3 - Neutral</option>
                <option value="2">2 - Somewhat Confusing</option>
                <option value="1">1 - Very Confusing</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">How confident are you that you understand what to do? (1-5)</label>
              <select name="confidenceScore" class="form-select">
                <option value="5" selected>5 - Completely Confident</option>
                <option value="4">4 - Moderately Confident</option>
                <option value="3">3 - Neutral</option>
                <option value="2">2 - Uncertain</option>
                <option value="1">1 - Not Confident At All</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Do you know what warning signs should cause you to escalate?</label>
              <div style="display: flex; gap: 1.5rem; margin-top: 0.5rem;">
                <label><input type="radio" name="knowsEscalation" value="yes" checked /> Yes</label>
                <label><input type="radio" name="knowsEscalation" value="no" /> No</label>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Was anything confusing or missing?</label>
              <input type="text" name="confusingItems" class="form-control" placeholder="Optional notes on confusing terms..." />
            </div>

            <div class="form-group">
              <label class="form-label">Additional Feedback Comment</label>
              <textarea name="comments" class="form-textarea" rows="3" placeholder="Optional comments..."></textarea>
            </div>

            <button type="submit" class="btn btn-primary btn-lg btn-full">
              Submit Patient Feedback & Complete &rarr;
            </button>
          </form>
        </div>
      </div>
    `;
  }

  // --- STAFF DASHBOARD & GOVERNANCE VIEWS ---

  renderStaffDashboard() {
    const metrics = SyntheticStore.calculateMetrics();
    const encounters = SyntheticStore.getEncounters();

    return `
      <div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
          <div>
            <h1 style="font-family: var(--font-heading); font-size: 2rem; font-weight: 700;">Staff Quality & Review Dashboard</h1>
            <p style="color: var(--color-text-muted); font-size: 0.9rem;">Review synthetic patient interactions, safety flags, and staff clinical agreement.</p>
          </div>
          <div style="display: flex; gap: 0.5rem;">
            <button class="btn btn-secondary" onclick="SyntheticStore.resetToDefaults(); window.app.render();">
              🔄 Reset Demo Data
            </button>
          </div>
        </div>

        <div style="background-color: var(--color-info-bg); border-left: 4px solid var(--color-info); padding: 0.75rem 1rem; border-radius: 4px; margin-bottom: 1.5rem; font-size: 0.85rem; color: #0C4A6E;">
          📊 <strong>SYNTHETIC DEMONSTRATION DATA:</strong> Dashboard values reflect simulated educational test encounters.
        </div>

        <!-- TOP METRICS GRID -->
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-title">Total Interactions</div>
            <div class="metric-value">${metrics.totalEncounters}</div>
            <div class="metric-subtext">Completed synthetic encounters</div>
          </div>
          <div class="metric-card">
            <div class="metric-title">Emergency Rate</div>
            <div class="metric-value" style="color: var(--color-danger);">${metrics.emergencyEscalationRate}</div>
            <div class="metric-subtext">${metrics.emergencyCount} 911/ED escalations</div>
          </div>
          <div class="metric-card">
            <div class="metric-title">Avg Clarity Score</div>
            <div class="metric-value" style="color: var(--color-success);">${metrics.avgClarity} / 5</div>
            <div class="metric-subtext">Patient clarity rating</div>
          </div>
          <div class="metric-card">
            <div class="metric-title">Staff Agreement</div>
            <div class="metric-value" style="color: var(--color-primary);">${metrics.staffAgreementRate}</div>
            <div class="metric-subtext">Disposition appropriateness</div>
          </div>
          <div class="metric-card">
            <div class="metric-title">Safety Concerns</div>
            <div class="metric-value" style="color: var(--color-warning);">${metrics.safetyConcernCount}</div>
            <div class="metric-subtext">Flagged for QI review</div>
          </div>
        </div>

        <!-- ENCOUNTER TABLE -->
        <div class="card">
          <h3 style="font-size: 1.2rem; font-weight: 700; margin-bottom: 1rem;">Synthetic Encounter Log</h3>

          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Session ID</th>
                  <th>Scenario</th>
                  <th>Disposition</th>
                  <th>Rule ID & Version</th>
                  <th>Clarity</th>
                  <th>Safety Flag</th>
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
                      <td>${enc.patientFeedback?.clarityScore ? `${enc.patientFeedback.clarityScore}/5` : 'N/A'}</td>
                      <td>
                        ${hasSafetyFlag ? '<span class="badge badge-danger">⚠️ SAFETY FLAG</span>' : '<span style="color: var(--color-text-muted);">None</span>'}
                      </td>
                      <td>
                        ${reviewDone ? '<span class="badge badge-success">COMPLETED</span>' : '<span class="badge badge-warning">PENDING</span>'}
                      </td>
                      <td>
                        <button class="btn btn-secondary" style="font-size: 0.75rem; padding: 0.25rem 0.5rem;">View</button>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
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
                    <td style="max-width: 250px;">${imp.proposedChange}</td>
                    <td>
                      <select class="form-select" style="font-size: 0.8rem; padding: 0.25rem;" onchange="SyntheticStore.updateImprovementStatus('${imp.improvementId}', this.value); window.app.render();">
                        ${Object.values(ImprovementStatus).map(st => `
                          <option value="${st}" ${imp.status === st ? 'selected' : ''}>${st}</option>
                        `).join('')}
                      </select>
                    </td>
                    <td>${imp.reviewer}</td>
                    <td>
                      <button class="btn btn-secondary" style="font-size: 0.75rem; padding: 0.25rem 0.5rem;" onclick="alert('Proposal Details:\\n\\nReason: ${imp.reason}\\nLast Updated: ${imp.updatedAt}')">
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
                    <label class="form-label">Reviewer Clinical Notes</label>
                    <textarea name="reviewerNotes" class="form-textarea" rows="2" placeholder="Clinical audit notes...">${enc.staffReview?.reviewerNotes || ''}</textarea>
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

// Global initialization helper
window.initEDCompass = function(elementId) {
  const root = document.getElementById(elementId);
  if (root) {
    window.app = new AppController(root);
  }
};
