/** VecLeap Hub account provider and REST helpers for Host-side integration. */
export { Config, type Config as VecleapHubConfig } from './hub-account.ts'
export { default } from './hub-account.ts'
export type { HubDataset, HubStoredSession, HubUser, HubWorkspace } from './hub-types.ts'
export {
  hubFetch,
  hubFetchAgentConfig,
  hubLlmBaseURL,
  normalizeBaseURL,
  readHubErrorMessage,
  resolveHubOrigin,
  type HubAgentConfig,
} from './hub-client.ts'
export {
  DEFAULT_HUB_ORIGIN,
  DEFAULT_HUB_RESOLVE_IP,
  effectiveHubBaseURL,
  effectiveHubLlmBaseURL,
  effectiveLabBaseURL,
} from './hub-connectivity.ts'
