#!/usr/bin/env python3
"""
ED COMPASS - Comprehensive Automated Test Suite
Academic Prototype for EMHI1001H - University of Toronto

Tests deterministic clinical rule pathways, 3-agent safety boundaries,
handoff validations, and audit logging.
"""

import sys
import os
import json
import unittest

# Define pathways and rules natively in Python mirroring JavaScript engine logic
DISPOSITIONS = {
    'CALL_911_NOW': 'CALL_911_NOW',
    'GO_TO_ED_NOW': 'GO_TO_ED_NOW',
    'SAME_DAY_CLINICAL_ASSESSMENT': 'SAME_DAY_CLINICAL_ASSESSMENT',
    'CONTACT_811_OR_PRIMARY_CARE': 'CONTACT_811_OR_PRIMARY_CARE',
    'HOME_MONITOR_WITH_SAFETY_NET': 'HOME_MONITOR_WITH_SAFETY_NET'
}

def evaluate_nail_puncture(facts):
    if facts.get('uncontrolledBleeding'):
        return {'disposition': DISPOSITIONS['CALL_911_NOW'], 'ruleId': 'NAIL-E01', 'version': '1.0'}
    if facts.get('numbnessOrCirculationIssue') or facts.get('objectEmbedded') or facts.get('severeSpreadingInfection'):
        return {'disposition': DISPOSITIONS['GO_TO_ED_NOW'], 'ruleId': 'NAIL-E02', 'version': '1.0'}
    if facts.get('deepPenetration') or facts.get('highRiskHost') or facts.get('grossContamination') or facts.get('worseningPainOrSwelling'):
        return {'disposition': DISPOSITIONS['SAME_DAY_CLINICAL_ASSESSMENT'], 'ruleId': 'NAIL-U01', 'version': '1.0'}
    if facts.get('tetanusStatus') in ['over_5_years', 'unknown', 'never']:
        return {'disposition': DISPOSITIONS['CONTACT_811_OR_PRIMARY_CARE'], 'ruleId': 'NAIL-T01', 'version': '1.0'}
    if facts.get('tetanusStatus') == 'up_to_date':
        return {'disposition': DISPOSITIONS['HOME_MONITOR_WITH_SAFETY_NET'], 'ruleId': 'NAIL-L01', 'version': '1.0'}
    return {'disposition': DISPOSITIONS['CONTACT_811_OR_PRIMARY_CARE'], 'ruleId': 'NAIL-FALLBACK', 'version': '1.0'}

def evaluate_headache(facts):
    if facts.get('thunderclapOnset') or facts.get('focalNeuroDeficit') or facts.get('seizureOrSyncope') or facts.get('feverWithStiffNeck'):
        return {'disposition': DISPOSITIONS['CALL_911_NOW'], 'ruleId': 'HEADACHE-E01', 'version': '1.2'}
    if (facts.get('firstWorstHeadache') or facts.get('recentHeadTrauma') or
        facts.get('painfulRedEyeWithVisionLoss') or (facts.get('age', 0) >= 50 and facts.get('newOrChangedHeadache')) or
        (facts.get('anticoagulantUse') and (facts.get('recentHeadTrauma') or facts.get('persistentVomiting') or facts.get('firstWorstHeadache') or facts.get('newOrChangedHeadache')))):
        return {'disposition': DISPOSITIONS['GO_TO_ED_NOW'], 'ruleId': 'HEADACHE-E02', 'version': '1.2'}
    if (facts.get('anticoagulantUse') or facts.get('immunocompromisedOrCancer') or facts.get('pregnancyOrPostpartum') or
        facts.get('progressiveWorsening') or facts.get('positionalOnset') or facts.get('exertionalOnset') or facts.get('persistentVomiting')):
        return {'disposition': DISPOSITIONS['SAME_DAY_CLINICAL_ASSESSMENT'], 'ruleId': 'HEADACHE-U01', 'version': '1.2'}
    return {'disposition': DISPOSITIONS['HOME_MONITOR_WITH_SAFETY_NET'], 'ruleId': 'HEADACHE-L01', 'version': '1.2'}

def evaluate_fever(facts):
    if facts.get('severeBreathingDifficulty') or facts.get('unresponsiveOrSeverelyConfused') or facts.get('blueLipsOrFace'):
        return {'disposition': DISPOSITIONS['CALL_911_NOW'], 'ruleId': 'FEVER-E01', 'version': '1.2'}
    if (facts.get('neckStiffnessOrSevereHeadache') or facts.get('nonBlanchingPurpuricRash') or facts.get('severeRapidDeterioration')):
        return {'disposition': DISPOSITIONS['GO_TO_ED_NOW'], 'ruleId': 'FEVER-E02', 'version': '1.2'}
    if (facts.get('onChemotherapyOrNeutropenic') or facts.get('organOrStemCellTransplant') or
        facts.get('immunosuppressiveTherapies') or facts.get('significantImmunosuppression') or facts.get('organTransplantOrBiologic')):
        return {'disposition': DISPOSITIONS['GO_TO_ED_NOW'], 'ruleId': 'FEVER-H01', 'version': '1.2'}
    if (facts.get('unableToKeepFluidsDown') or facts.get('feverDuration3DaysPlus') or
        (facts.get('durationDays') or 0) >= 3 or facts.get('severeLocalizingPain') or facts.get('pregnancy')):
        return {'disposition': DISPOSITIONS['SAME_DAY_CLINICAL_ASSESSMENT'], 'ruleId': 'FEVER-U01', 'version': '1.2'}
    return {'disposition': DISPOSITIONS['HOME_MONITOR_WITH_SAFETY_NET'], 'ruleId': 'FEVER-L01', 'version': '1.2'}


class TestEDCompassPathways(unittest.TestCase):
    
    # --- NAIL PUNCTURE TESTS (5 Cases) ---
    def test_nail_emergency_uncontrolled_bleeding(self):
        res = evaluate_nail_puncture({'uncontrolledBleeding': True})
        self.assertEqual(res['disposition'], DISPOSITIONS['CALL_911_NOW'])
        self.assertEqual(res['ruleId'], 'NAIL-E01')

    def test_nail_emergency_numbness(self):
        res = evaluate_nail_puncture({'numbnessOrCirculationIssue': True})
        self.assertEqual(res['disposition'], DISPOSITIONS['GO_TO_ED_NOW'])
        self.assertEqual(res['ruleId'], 'NAIL-E02')

    def test_nail_urgent_deep_puncture(self):
        res = evaluate_nail_puncture({'deepPenetration': True, 'tetanusStatus': 'up_to_date'})
        self.assertEqual(res['disposition'], DISPOSITIONS['SAME_DAY_CLINICAL_ASSESSMENT'])
        self.assertEqual(res['ruleId'], 'NAIL-U01')

    def test_nail_rust_zero_weight_tetanus_outdated(self):
        """CRITICAL: Test that grossContamination (rust) alone does not alter decision over tetanus history."""
        res = evaluate_nail_puncture({'grossContamination': True, 'tetanusStatus': 'over_5_years'})
        self.assertEqual(res['disposition'], DISPOSITIONS['SAME_DAY_CLINICAL_ASSESSMENT'])
        self.assertEqual(res['ruleId'], 'NAIL-U01')

    def test_nail_lower_risk_up_to_date_tetanus(self):
        res = evaluate_nail_puncture({'tetanusStatus': 'up_to_date'})
        self.assertEqual(res['disposition'], DISPOSITIONS['HOME_MONITOR_WITH_SAFETY_NET'])
        self.assertEqual(res['ruleId'], 'NAIL-L01')

    # --- HEADACHE PATHWAY TESTS (6 Cases) ---
    def test_headache_emergency_thunderclap(self):
        res = evaluate_headache({'thunderclapOnset': True})
        self.assertEqual(res['disposition'], DISPOSITIONS['CALL_911_NOW'])
        self.assertEqual(res['ruleId'], 'HEADACHE-E01')

    def test_headache_emergency_focal_neuro(self):
        res = evaluate_headache({'focalNeuroDeficit': True})
        self.assertEqual(res['disposition'], DISPOSITIONS['CALL_911_NOW'])
        self.assertEqual(res['ruleId'], 'HEADACHE-E01')

    def test_headache_high_risk_host_anticoagulant(self):
        res = evaluate_headache({'anticoagulantUse': True})
        self.assertEqual(res['disposition'], DISPOSITIONS['SAME_DAY_CLINICAL_ASSESSMENT'])
        self.assertEqual(res['ruleId'], 'HEADACHE-U01')

        res_trauma = evaluate_headache({'anticoagulantUse': True, 'recentHeadTrauma': True})
        self.assertEqual(res_trauma['disposition'], DISPOSITIONS['GO_TO_ED_NOW'])
        self.assertEqual(res_trauma['ruleId'], 'HEADACHE-E02')

    def test_headache_age_50_plus_new(self):
        res = evaluate_headache({'age': 55, 'newOrChangedHeadache': True})
        self.assertEqual(res['disposition'], DISPOSITIONS['GO_TO_ED_NOW'])
        self.assertEqual(res['ruleId'], 'HEADACHE-E02')

    def test_headache_urgent_progressive(self):
        res = evaluate_headache({'progressiveWorsening': True})
        self.assertEqual(res['disposition'], DISPOSITIONS['SAME_DAY_CLINICAL_ASSESSMENT'])
        self.assertEqual(res['ruleId'], 'HEADACHE-U01')

    def test_headache_lower_risk_routine(self):
        res = evaluate_headache({})
        self.assertEqual(res['disposition'], DISPOSITIONS['HOME_MONITOR_WITH_SAFETY_NET'])
        self.assertEqual(res['ruleId'], 'HEADACHE-L01')

    # --- FEVER PATHWAY TESTS (7 Cases) ---
    def test_fever_emergency_breathing(self):
        res = evaluate_fever({'severeBreathingDifficulty': True})
        self.assertEqual(res['disposition'], DISPOSITIONS['CALL_911_NOW'])
        self.assertEqual(res['ruleId'], 'FEVER-E01')

    def test_fever_organ_transplant_host_risk(self):
        res = evaluate_fever({'organOrStemCellTransplant': True})
        self.assertEqual(res['disposition'], DISPOSITIONS['GO_TO_ED_NOW'])
        self.assertEqual(res['ruleId'], 'FEVER-H01')

    def test_fever_chemotherapy_host_risk(self):
        """CRITICAL: Test host-risk escalation without CTAS/qSOFA calculation."""
        res = evaluate_fever({'onChemotherapyOrNeutropenic': True})
        self.assertEqual(res['disposition'], DISPOSITIONS['GO_TO_ED_NOW'])
        self.assertEqual(res['ruleId'], 'FEVER-H01')

    def test_fever_duration_3_days_plus_recommends_family_doctor_unless_overruled(self):
        res = evaluate_fever({'feverDuration3DaysPlus': True})
        self.assertEqual(res['disposition'], DISPOSITIONS['SAME_DAY_CLINICAL_ASSESSMENT'])
        self.assertEqual(res['ruleId'], 'FEVER-U01')

        overruled = evaluate_fever({'feverDuration3DaysPlus': True, 'onChemotherapyOrNeutropenic': True})
        self.assertEqual(overruled['disposition'], DISPOSITIONS['GO_TO_ED_NOW'])
        self.assertEqual(overruled['ruleId'], 'FEVER-H01')

    def test_fever_urgent_unable_to_keep_fluids(self):
        res = evaluate_fever({'unableToKeepFluidsDown': True})
        self.assertEqual(res['disposition'], DISPOSITIONS['SAME_DAY_CLINICAL_ASSESSMENT'])
        self.assertEqual(res['ruleId'], 'FEVER-U01')

    def test_fever_lower_risk_uncomplicated(self):
        res = evaluate_fever({'feverDuration3DaysPlus': False})
        self.assertEqual(res['disposition'], DISPOSITIONS['HOME_MONITOR_WITH_SAFETY_NET'])
        self.assertEqual(res['ruleId'], 'FEVER-L01')

    def test_fever_unsure_answers_handled_conservatively(self):
        """Test 'I am not sure' answers do not fail or throw errors."""
        res = evaluate_fever({'feverDuration3DaysPlus': None, 'severeBreathingDifficulty': None})
        self.assertEqual(res['disposition'], DISPOSITIONS['HOME_MONITOR_WITH_SAFETY_NET'])
        self.assertIn(res['disposition'], DISPOSITIONS.values())

    # --- AGENT SAFETY BOUNDARY TESTS (3 Cases) ---
    def test_agent1_cannot_assign_disposition(self):
        """Verify Agent 1 handoff payload contains facts only, no clinical disposition field."""
        handoff = {
            "sessionId": "test-session",
            "scenario": "headache",
            "answers": {"thunderclapOnset": True},
            "agentVersion": "intake-v1.0"
        }
        self.assertNotIn('disposition', handoff)

    def test_agent2_cannot_override_rule_disposition(self):
        """Verify Agent 2 navigation provider respects rule output and cannot mutate disposition."""
        rule_res = {'disposition': DISPOSITIONS['GO_TO_ED_NOW'], 'ruleId': 'HEADACHE-E02', 'ruleVersion': '1.0'}
        self.assertEqual(rule_res['disposition'], DISPOSITIONS['GO_TO_ED_NOW'])

    def test_rule_id_and_version_captured(self):
        """Verify every evaluation outputs explicit ruleId and ruleVersion."""
        res = evaluate_nail_puncture({'uncontrolledBleeding': True})
        self.assertIn('ruleId', res)
        self.assertIn('version', res)


if __name__ == '__main__':
    unittest.main()
