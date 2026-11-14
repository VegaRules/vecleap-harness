import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_HUB_RESOLVE_IP } from '../src/hub-constants.ts'
import { effectiveHubLlmBaseURL } from '../src/hub-connectivity.ts'
import { urlUsesHubLlm } from '../src/hub-client.ts'

describe('VecLeap Hub connectivity', () => {
  it('routes LLM calls to the resolved Hub IP like mobile', () => {
    vi.stubEnv('VECLEAP_HUB_URL', 'http://hub.vecleap.internal:8900')
    vi.stubEnv('VECLEAP_HUB_RESOLVE_IP', DEFAULT_HUB_RESOLVE_IP)
    expect(effectiveHubLlmBaseURL()).toBe(`http://${DEFAULT_HUB_RESOLVE_IP}:8900/api/llm/v1`)
    const hubBase = 'http://hub.vecleap.internal:8900'
    const llmUrl = `${effectiveHubLlmBaseURL()}/chat/completions`
    expect(urlUsesHubLlm(hubBase, llmUrl)).toBe(true)
    vi.unstubAllEnvs()
  })
})
