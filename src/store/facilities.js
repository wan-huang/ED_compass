import { Disposition, Scenario } from '../clinical/types.js';

export const DEMO_COMMUNITIES = {
  victoria: { label: 'Victoria', region: 'Island Health' },
  vancouver: { label: 'Vancouver', region: 'Vancouver Coastal Health' },
  smithers: { label: 'Smithers', region: 'Northern Health' }
};

const facilities = {
  victoria: [
    { name: 'Royal Jubilee Hospital Emergency Department', type: 'Emergency Department', address: 'Victoria, BC', distance: '4 km', capability: ['emergency', 'wound', 'imaging'] },
    { name: 'Victoria Urgent and Primary Care Centre', type: 'Urgent and Primary Care Centre', address: 'Victoria, BC', distance: '3 km', capability: ['same-day', 'wound', 'primary'] },
    { name: 'Community primary care clinic', type: 'Primary Care', address: 'Victoria, BC', distance: '2 km', capability: ['primary'] }
  ],
  vancouver: [
    { name: 'Vancouver General Hospital Emergency Department', type: 'Emergency Department', address: 'Vancouver, BC', distance: '5 km', capability: ['emergency', 'wound', 'imaging'] },
    { name: 'Vancouver City Centre UPCC', type: 'Urgent and Primary Care Centre', address: 'Vancouver, BC', distance: '3 km', capability: ['same-day', 'wound', 'primary'] },
    { name: 'Community primary care clinic', type: 'Primary Care', address: 'Vancouver, BC', distance: '2 km', capability: ['primary'] }
  ],
  smithers: [
    { name: 'Bulkley Valley District Hospital Emergency Department', type: 'Emergency Department', address: 'Smithers, BC', distance: '6 km', capability: ['emergency', 'wound', 'imaging'] },
    { name: 'Community health centre', type: 'Community Health Centre', address: 'Smithers, BC', distance: '4 km', capability: ['same-day', 'wound', 'primary'] },
    { name: 'Northern Health virtual primary care', type: 'Virtual Primary Care', address: 'Virtual service', distance: 'Online', capability: ['virtual', 'primary'] }
  ]
};

export function requiresInPersonAssessment(scenario, disposition, answers = {}) {
  if ([Disposition.CALL_911_NOW, Disposition.GO_TO_ED_NOW].includes(disposition)) return true;
  if (scenario === Scenario.NAIL_PUNCTURE) {
    return disposition !== Disposition.HOME_MONITOR_WITH_SAFETY_NET || Boolean(
      answers.uncontrolledBleeding || answers.objectEmbedded || answers.deepPenetration || answers.numbnessOrCirculationIssue
    );
  }
  return false;
}

export function getCareOptions({ community = 'victoria', disposition, scenario, answers = {} }) {
  const all = facilities[community] || facilities.victoria;
  let matches = [];

  if (disposition === Disposition.CALL_911_NOW) return [];
  if (disposition === Disposition.GO_TO_ED_NOW) {
    matches = all.filter(item => item.type === 'Emergency Department');
  } else if (disposition === Disposition.SAME_DAY_CLINICAL_ASSESSMENT) {
    matches = all.filter(item => item.capability.includes('same-day'));
  } else if (disposition === Disposition.CONTACT_811_OR_PRIMARY_CARE) {
    matches = all.filter(item => item.capability.includes('primary'));
  } else {
    matches = all.filter(item => item.capability.includes('primary')).slice(0, 1);
  }

  if (requiresInPersonAssessment(scenario, disposition, answers)) {
    matches = matches.filter(item => !item.capability.includes('virtual'));
  }

  return matches.map((item, index) => ({ ...item, recommended: index === 0 }));
}
