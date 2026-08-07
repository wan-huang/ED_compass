/**
 * ED COMPASS - Clinical Engine Types & Disposition Definitions
 * Academic Prototype for EMHI1001H
 */

export const Disposition = {
  CALL_911_NOW: 'CALL_911_NOW',
  GO_TO_ED_NOW: 'GO_TO_ED_NOW',
  SAME_DAY_CLINICAL_ASSESSMENT: 'SAME_DAY_CLINICAL_ASSESSMENT',
  CONTACT_811_OR_PRIMARY_CARE: 'CONTACT_811_OR_PRIMARY_CARE',
  HOME_MONITOR_WITH_SAFETY_NET: 'HOME_MONITOR_WITH_SAFETY_NET'
};

export const Scenario = {
  NAIL_PUNCTURE: 'nail_puncture',
  HEADACHE: 'headache',
  FEVER: 'fever'
};

export const DISPOSITION_METADATA = {
  [Disposition.CALL_911_NOW]: {
    label: 'Call 911 Immediately',
    urgency: 'Immediate Emergency',
    colorClass: 'disposition-danger-severe',
    badgeClass: 'badge-danger-severe',
    icon: 'phone-call',
    timing: 'Immediate',
    destinationType: 'Emergency Services (911)',
    isEmergency: true
  },
  [Disposition.GO_TO_ED_NOW]: {
    label: 'Go to Nearest Emergency Department',
    urgency: 'Emergency Care Required',
    colorClass: 'disposition-danger',
    badgeClass: 'badge-danger',
    icon: 'alert-triangle',
    timing: 'Go Now',
    destinationType: 'Emergency Department',
    isEmergency: true
  },
  [Disposition.SAME_DAY_CLINICAL_ASSESSMENT]: {
    label: 'Same-Day Clinical Assessment',
    urgency: 'Urgent Care Needed',
    colorClass: 'disposition-warning',
    badgeClass: 'badge-warning',
    icon: 'clock',
    timing: 'Today (Within 12-24 hours)',
    destinationType: 'Urgent Care Centre / Same-Day Clinic',
    isEmergency: false
  },
  [Disposition.CONTACT_811_OR_PRIMARY_CARE]: {
    label: 'Contact 8-1-1 or Primary Care Provider',
    urgency: 'Routine Clinical Advice',
    colorClass: 'disposition-info',
    badgeClass: 'badge-info',
    icon: 'user-check',
    timing: 'Within 24-48 hours',
    destinationType: 'Primary Care / HealthLink BC 8-1-1',
    isEmergency: false
  },
  [Disposition.HOME_MONITOR_WITH_SAFETY_NET]: {
    label: 'Home Monitoring with Safety-Net Guidance',
    urgency: 'Lower Acuity / Self-Care',
    colorClass: 'disposition-success',
    badgeClass: 'badge-success',
    icon: 'shield-check',
    timing: 'Monitor at home',
    destinationType: 'Self-Care at Home',
    isEmergency: false
  }
};
