# ED COMPASS
### A Governed Digital Front Door for Emergency-Care Navigation
*Academic Prototype — University of Toronto EMHI1001H Course Project*

---

## 1. Product Overview & Purpose
**ED COMPASS** helps patients answer critical emergency navigation questions prior to seeking care:
1. **Emergency Warning Signs**: *Does my current situation contain an emergency warning sign?*
2. **Care Level Recommendation**: *What level of care should I consider next (911, Emergency Department, Same-Day Assessment, 8-1-1 / Primary Care, Home Monitoring)?*
3. **Clinical Rationale**: *Why is that specific recommendation being made?*
4. **Safety Net**: *What specific warning signs should cause me to escalate immediately?*
5. **Usability & Governance**: *Was the guidance understandable, clear, and safe according to governed staff quality review?*

ED Compass complements—and does NOT replace—existing services such as **911**, **HealthLink BC 8-1-1**, **HEiDi**, **Emergency Care BC RTVS**, local emergency departments, and urgent/primary care clinics.

### No-Wrong-Door Demonstration Strategy (v1.1)

The prototype now begins with **“Tell us what is happening”** rather than requiring the patient to know which clinical pathway or healthcare service to choose. For the classroom demonstration, narrative keyword routing recognizes the three supported concerns and then hands the patient to the governed pathway.

The live experience is designed to show:

1. A patient or caregiver being heard in plain language.
2. Agent 1 creating structured facts.
3. A deterministic rule assigning the care level.
4. Agent 2 turning the rule into a practical care-channel plan.
5. Agent 3 sending patient and provider feedback into a synthetic learning dashboard.

> ⚠️ **ACADEMIC DISCLAIMER:** This software is an academic prototype built exclusively for the EMHI1001H course at the University of Toronto. It is **NOT** a production clinical system and must **NOT** be used to diagnose patients or make actual clinical decisions. All external handoffs display: `"Conceptual handoff only—no information has been transmitted."`

---

## 2. Safety Architecture: 3-Agent Collaborative Model

```
Patient Web Interface
       ↓
Agent 1 — Safety & Intake (Converse, Collect, Validate Facts)
       ↓ [Structured Handoff JSON]
VERSIONED DETERMINISTIC CLINICAL RULE ENGINE (Assigns Disposition, Rule ID, Version)
       ↓ [Disposition + Rule ID + Version + Safety Net]
Agent 2 — Care Navigation (Plain Language Rationale & Handoff Instructions)
       ↓
Patient Recommendation & Safety-Net Card
       ↓
Agent 3 — Feedback & Quality (Classify Themes & Identify Safety Concerns)
       ↓
Synthetic Encounter Store (Pre-seeded Demo Encounters + Audit Logs)
       ↓
Staff Quality Review Dashboard
       ↓
Governed Improvement Items Workflow (Clinical Review → Testing → Versioned Release)
```

### Critical Architectural Design Rule
**AI AGENTS MUST NOT INDEPENDENTLY DETERMINE CLINICAL DISPOSITION.**
Only the versioned, deterministic clinical rule engine (`src/clinical/engine.js`) assigns urgency, disposition, timing, destination category, safety-net triggers, rule ID, and rule version.

* **AI Agents May**: Converse, collect information, structure data into JSON, validate fields, explain deterministic outputs in plain language, classify user feedback themes, and flag potential safety concerns.
* **AI Agents May NOT**: Diagnose medical conditions, override clinical rules, invent clinical facts, alter clinical logic, or autonomously deploy rule changes.

---

## 3. The 3 Clinical Scenarios & Pathways

ED Compass implements three core clinical scenarios using the SAME three agents:

### A. Stepping on a Nail / Nail Puncture (`NAIL-E01` .. `NAIL-L01`)
* **Fact Intake**: Injury timing, depth, bleeding, embedded foreign bodies, spreading infection, numbness/circulation issues, high-risk host factors (diabetes/immunosuppression), and tetanus vaccination date.
* 🛑 **ZERO WEIGHT RULE FOR RUST**: "Rust" is collected for context but has **ZERO** independent decision weight. Tetanus prophylaxis depends strictly on wound depth/contamination and immunization history (>5 years), NOT rust.

### B. Severe Headache (`HEADACHE-E01` .. `HEADACHE-L01`)
* **Fact Intake**: Onset speed, maximum intensity, neurological deficits (speech, weakness, facial droop), stiff neck + fever, seizure/syncope, blood thinners, head trauma, age 50+ new headache.
* 🚨 **Early Emergency Stop**: Thunderclap onset (reaching peak intensity in seconds/minutes) or focal neuro deficits trigger an immediate early emergency stop, bypassing non-essential routine questions.
* 🚫 **No Diagnostic Statements**: The system never diagnoses subarachnoid hemorrhage, stroke, or migraine; it reports warning signs requiring emergency evaluation.

### C. Fever & Systemic Infection (`FEVER-E01` .. `FEVER-L01`)
* **Fact Intake**: Age group, infant status (<3 months), respiratory distress, mental status/confusion, stiff neck, dark purple non-blanching rash, chemotherapy/neutropenia, fluid intake ability, duration.
* 🛑 **No Patient-Entered Scoring**: Patients are never asked to calculate or self-report CTAS, qSOFA, or SIRS scores. High-risk hosts (e.g. chemotherapy) trigger escalation based on plain-language host risk.

---

## 4. Explicit Disposition Enum

1. `CALL_911_NOW` *(Red Severe Banner — Immediate Emergency Dispatch)*
2. `GO_TO_ED_NOW` *(Red Banner — Nearest Emergency Department)*
3. `SAME_DAY_CLINICAL_ASSESSMENT` *(Amber Banner — Urgent Care / Same-Day Clinic)*
4. `CONTACT_811_OR_PRIMARY_CARE` *(Blue Banner — HealthLink 8-1-1 / Family Physician)*
5. `HOME_MONITOR_WITH_SAFETY_NET` *(Green Banner — Self-Care at Home)*

---

## 5. Staff Dashboard & Governed Improvement Workflow

### Staff Review Dashboard (`/staff`)
Includes real-time metrics (Total Completed, Emergency Rate, Avg Clarity Score, Staff Agreement Rate, Open Improvement Items), filterable encounter tables, detail modal drawer, patient fact logs, and audit trails.

### Governed Improvement Items Tracker (`/improvements`)
Proposals follow a strict governed lifecycle:
`NEW` &rarr; `UNDER_REVIEW` &rarr; `CLINICAL_REVIEW` &rarr; `APPROVED_FOR_TESTING` &rarr; `TESTING` &rarr; `APPROVED` &rarr; `IMPLEMENTED` &rarr; `REJECTED`.

> **Note**: Creating or updating an improvement proposal does **NOT** alter the live deterministic rule engine until clinically validated and released in a versioned software update.

---

## 6. How to Run the Application

### Option A: Local Dev HTTP Server (Recommended)
Launch the local web server:
```bash
npm run serve
```
Open your browser and navigate to:
```
http://localhost:8080/
```

---

## 7. How to Run Automated Tests

Run the JavaScript integration tests against the production modules:
```bash
npm test
```

The original mirrored Python rule tests remain available:
```bash
python3 tests/test_engine.py
```
Together these verify:
* Emergency presentations across all 3 pathways
* Lower-risk self-care presentations
* Tetanus immunization & rust zero-weight rule logic
* High-risk host (chemotherapy) escalation without CTAS/qSOFA
* Missing fields & "I am not sure" conservative handling
* Agent safety boundary enforcement (Agent 1/2/3 restrictions)
* Narrative demo flow, feedback persistence, staff review, dashboard and architecture rendering
* Rust having zero independent decision weight
* Conservative handling of uncertain safety-critical answers

---

## 8. Classroom Demonstration Script

Use the built-in **⚡ DEMO QUICK LAUNCH** buttons at the top of the application:

1. **Demo A (Nail Puncture)**: Click `Demo A`. Shows wound depth, rusty nail, and outdated tetanus shot. Explains how Same-Day Assessment is assigned based on depth + tetanus shot date, demonstrating rust has 0 decision weight.
2. **Demo B (Headache Emergency)**: Click `Demo B`. Patient reports sudden thunderclap onset. Demonstrates early emergency stop, bypassing remaining questions, and showing immediate 911 red warning card.
3. **Demo C (Lower-Risk Fever)**: Click `Demo C`. Stable adult with 24h fever drinking fluids well. Demonstrates concise screening, home monitoring disposition, and safety-net triggers.
4. **Demo D (High-Risk Fever)**: Click `Demo D`. Chemotherapy patient with fever. Demonstrates host-risk escalation to Emergency Department without prompting for CTAS/qSOFA scores.
5. **Staff Dashboard Review**: Submit patient feedback, open the Learning System Dashboard, review the new encounter, submit a provider review, and launch a QI Improvement Proposal.
6. **Architecture Close**: Open `How It Works` to show the patient-facing, safety, conceptual-routing, synthetic-data and human-governance boundaries.

---

## 9. Project Directory Structure

```
AG_ED-Compass/
├── index.html                    # Main HTML Entry Point
├── package.json                  # Local serve and JavaScript test commands
├── README.md                     # Comprehensive Academic & Technical Guide
├── src/
│   ├── css/
│   │   └── styles.css            # Healthcare Design System & Responsive CSS
│   ├── clinical/
│   │   ├── types.js              # Dispositions, Metadata, Scenario Enums
│   │   ├── engine.js             # Deterministic Rule Engine & Handoff Validator
│   │   └── pathways/
│   │       ├── nailPunctureRules.js
│   │       ├── headacheRules.js
│   │       └── feverRules.js
│   ├── agents/
│   │   ├── types.js              # Agent Versions & Quality Enums
│   │   ├── intakeAgent.js        # Agent 1: Safety & Intake State Machine
│   │   ├── navigationAgent.js    # Agent 2: Navigation Explanation & Rationale
│   │   ├── feedbackAgent.js      # Agent 3: Feedback Classifier & Quality
│   │   └── providers/
│   │       ├── agentProvider.js  # Provider Factory
│   │       └── localDemoProvider.js
│   ├── store/
│   │   ├── syntheticStore.js     # Pre-seeded Encounters & Metrics Store
│   │   ├── auditLogger.js        # Reproducible Audit Event Logger
│   │   └── demoCases.js          # Preset 1-Click Demo Scenarios
│   └── ui/
│       └── app.js                # Single-Page Reactive Application Controller
└── tests/
    ├── prototype.test.mjs        # Tests the actual JavaScript modules and demo flow
    └── test_engine.py            # Original mirrored Python rule tests
```

---

## 10. Known Limitations & Outstanding TODOs
* **Local Browser Storage**: Classroom prototype uses local storage for synthetic data persistence; production deployment would connect to a secure cloud database.
* **Narrative routing**: Classroom keyword routing supports only nail puncture, headache and fever. It is not a general-purpose symptom interpreter.
* **Synthetic service options**: Clinic availability, opening hours and wait times are not verified or connected to a live service directory.
* **Local demo provider**: Uses `LocalDemoAgentProvider` for a reliable offline classroom demonstration; no browser-exposed API key or runtime language model is required.

---

## 11. Future Production Considerations
For real-world clinical deployment, the following governance milestones are mandatory:
1. **Clinical Validation**: Formal prospective clinical trial validation across emergency department populations.
2. **Privacy Impact Assessment (PIA)**: Full compliance with provincial health information protection acts (e.g. PHIPA/FOIPPA).
3. **Security & Authentication**: OAuth2/SAML2 enterprise staff authentication and encrypted FHIR data persistence.
4. **Service Directory Integration**: Integration with provincial health service directories (e.g. HealthLink BC directory) for real-time clinic hours and capacity.
5. **FHIR / EHR Interoperability**: Handoff export via HL7 FHIR `Composition` / `ServiceRequest` resources.
6. **Regulatory Assessment**: Software as a Medical Device (SaMD) regulatory approval via Health Canada.
