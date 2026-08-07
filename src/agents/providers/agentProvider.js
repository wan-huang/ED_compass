/**
 * ED COMPASS - Agent Provider Factory & Interface
 * Academic Prototype for EMHI1001H
 */

import { LocalDemoAgentProvider } from './localDemoProvider.js';

let currentProviderInstance = new LocalDemoAgentProvider();

export function getAgentProvider() {
  return currentProviderInstance;
}

export function setAgentProvider(providerInstance) {
  currentProviderInstance = providerInstance;
}
