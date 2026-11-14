import { DEFAULT_HUB_ORIGIN, DEFAULT_LAB_ORIGIN } from './hub-constants.ts'
import { hubLlmBaseURL, normalizeBaseURL, resolveHubOrigin } from './hub-client.ts'

export { DEFAULT_HUB_ORIGIN, DEFAULT_LAB_ORIGIN, DEFAULT_HUB_RESOLVE_IP } from './hub-constants.ts'

/** Hub origin used for HTTP, applying internal-host → IP mapping when configured. */
export function effectiveHubBaseURL(env: NodeJS.ProcessEnv = process.env): string {
  return resolveHubOrigin(normalizeBaseURL(env.VECLEAP_HUB_URL?.trim() || DEFAULT_HUB_ORIGIN))
}

/** Lab origin with the same hostname resolution as Hub. */
export function effectiveLabBaseURL(env: NodeJS.ProcessEnv = process.env): string {
  return resolveHubOrigin(normalizeBaseURL(env.VECLEAP_LAB_URL?.trim() || DEFAULT_LAB_ORIGIN))
}

/** OpenAI-compatible LLM gateway base URL the Host should call (resolved like mobile Hub traffic). */
export function effectiveHubLlmBaseURL(env: NodeJS.ProcessEnv = process.env): string {
  const custom = env.VECLEAP_API_BASE_URL?.trim()
  if (custom !== undefined && custom !== '') return normalizeBaseURL(custom)
  return hubLlmBaseURL(effectiveHubBaseURL(env))
}
