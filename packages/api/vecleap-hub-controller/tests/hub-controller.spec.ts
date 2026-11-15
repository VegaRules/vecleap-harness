import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { LocalCredentialProvider } from '@deepseek-ai/dsh-credentials-local'
import VecleapHubAccount from '@deepseek-ai/dsh-vecleap-auth-stub'
import {
  startVecleapHubMock,
  VECLEAP_MOCK_ACCESS,
  VECLEAP_MOCK_EMAIL,
  VECLEAP_MOCK_PASSWORD,
  type VecleapHubMock,
} from '@deepseek-ai/dsh-vecleap-auth-stub/tests/hub-mock-server'
import VecleapHubController from '../src/index.ts'

let home: string | undefined
let ctx: Context | undefined
let mock: VecleapHubMock | undefined

afterEach(async () => {
  await ctx?.fiber.dispose()
  await mock?.close()
  if (home !== undefined) await rm(home, { recursive: true, force: true })
  ctx = undefined
  mock = undefined
  home = undefined
})

async function boot(): Promise<Context> {
  home = await mkdtemp(join(tmpdir(), 'vecleap-hub-controller-'))
  mock = await startVecleapHubMock()
  ctx = new Context()
  await ctx.plugin(LocalCredentialProvider, { path: join(home, 'credentials.yaml'), watch: false })
  await ctx.plugin(VecleapHubAccount, {
    hubBaseURL: mock.hubOrigin,
    labBaseURL: mock.labOrigin,
    apiKeyEnv: 'VECLEAP_API_KEY',
    requestTimeoutMs: 5_000,
  })
  await ctx.plugin(VecleapHubController)
  return ctx
}

describe('VecleapHubController Remote facade', () => {
  it('exposes endpoints, login, workspaces, and datasets through the Hub account', async () => {
    const context = await boot()
    const endpoints = await context.vecleapHubController.getEndpoints()
    expect(endpoints.hubBaseURL).toBe(mock!.hubOrigin)
    expect(endpoints.labBaseURL).toBe(mock!.labOrigin)
    expect(endpoints.llmBaseURL).toContain('/api/llm/v1')

    const login = await context.vecleapHubController.loginWithPassword(VECLEAP_MOCK_EMAIL, VECLEAP_MOCK_PASSWORD)
    expect(login).toEqual({ ok: true })

    const workspaces = await context.vecleapHubController.listWorkspaces()
    expect(workspaces.map(row => row.name)).toEqual(['delivery-e2e'])

    const datasets = await context.vecleapHubController.listDatasets(7)
    expect(datasets.map(row => row.name)).toEqual(['routes-demo'])

    const badLogin = await context.vecleapHubController.loginWithPassword(
      VECLEAP_MOCK_EMAIL,
      'wrong-password',
    )
    expect(badLogin.ok).toBe(false)

    const sessionsBefore = await context.vecleapHubController.listChatSessions()
    expect(sessionsBefore).toEqual([])

    const seeded = await fetch(`${mock!.hubOrigin}/api/sync/sessions/test-session/events`, {
      method: 'PUT',
      headers: {
        authorization: `Bearer ${VECLEAP_MOCK_ACCESS}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        title: 'web-task',
        events: [{ seq: 0, data: { type: 'message', role: 'user', content: 'hello', created_at: Date.now(), mode: 'agent' } }],
      }),
    })
    expect(seeded.ok).toBe(true)

    const sessionsAfter = await context.vecleapHubController.listChatSessions()
    expect(sessionsAfter.map(row => row.title)).toContain('web-task')
  })
})
