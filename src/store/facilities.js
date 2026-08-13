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

export const FNHA_VIRTUAL_DOCTOR = {
  id: 'fnha-virtual-doctor',
  name: 'First Nations Virtual Doctor of the Day',
  type: 'Virtual Primary Care',
  provider: 'First Nations Health Authority (FNHA)',
  address: 'Province-wide in British Columbia',
  distance: 'Phone or video',
  capability: ['virtual', 'primary'],
  firstNationsSpecific: true,
  additionalSupport: true,
  phone: '1-855-344-3800',
  hours: 'Generally 8:30 a.m.–4:30 p.m. PT, 7 days/week',
  eligibilityNotes: 'For First Nations people and their families living in BC, on or off reserve.',
  suitabilityNotice: 'An additional primary-care option for non-emergency concerns. It does not replace 911, emergency care, or a required hands-on assessment.',
  officialUrl: 'https://fnha.ca/services-and-support/access-and-support/health-and-virtual-services/virtual-doctor-of-the-day/'
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

export function getCareOptions({
  community = 'victoria',
  disposition,
  scenario,
  answers = {},
  firstNationsServicesRequested = false
}) {
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

  const routedOptions = matches.map((item, index) => ({ ...item, recommended: index === 0 }));

  // This option is shown only after an explicit request. Geography is never
  // used to infer First Nations identity or service preference, and the option
  // can never replace emergency or hands-on care.
  if (
    firstNationsServicesRequested &&
    ![Disposition.CALL_911_NOW, Disposition.GO_TO_ED_NOW].includes(disposition) &&
    !requiresInPersonAssessment(scenario, disposition, answers)
  ) {
    routedOptions.push({ ...FNHA_VIRTUAL_DOCTOR, recommended: false });
  }

  return routedOptions;
}
