import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { credentialRef } from '@deepseek-ai/dsh-credentials'
import { LocalCredentialProvider } from '@deepseek-ai/dsh-credentials-local'
import VecleapHubAccount from '../src/hub-account.ts'
import { hubLlmBaseURL } from '../src/hub-client.ts'
import {
  startVecleapHubMock,
  VECLEAP_MOCK_ACCESS,
  VECLEAP_MOCK_EMAIL,
  VECLEAP_MOCK_PASSWORD,
  type VecleapHubMock,
} from './hub-mock-server.ts'

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
  vi.unstubAllEnvs()
})

async function bootAccount(expiresAt?: number): Promise<{ account: VecleapHubAccount; mock: VecleapHubMock }> {
  home = await mkdtemp(join(tmpdir(), 'vecleap-hub-account-'))
  mock = await startVecleapHubMock(expiresAt === undefined ? {} : { accessExpiresAt: expiresAt })
  ctx = new Context()
  await ctx.plugin(LocalCredentialProvider, { path: join(home, 'credentials.yaml'), watch: false })
  await ctx.plugin(VecleapHubAccount, {
    hubBaseURL: mock.hubOrigin,
    labBaseURL: mock.labOrigin,
    apiKeyEnv: 'VECLEAP_API_KEY',
    requestTimeoutMs: 5_000,
  })
  return { account: ctx.deepseekAccount as VecleapHubAccount, mock }
}

describe('VecleapHubAccount against loopback Hub mock', () => {
  it('logs in, syncs LLM credential, lists workspaces and datasets, and resolves LLM tokens', async () => {
    const { account, mock: hub } = await bootAccount()
    const before = await account.getState()
    expect(before.status).toBe('signed-out')

    const login = await account.loginWithPassword(VECLEAP_MOCK_EMAIL, VECLEAP_MOCK_PASSWORD)
    expect(login).toEqual({ ok: true })
    expect(hub.loginAttempts).toBe(1)

    const after = await account.getState()
    expect(after.status).toBe('credential-stored')

    const llmKey = await ctx!.credentials.resolve(credentialRef('VECLEAP_API_KEY'))
    expect(llmKey?.value).toBe(VECLEAP_MOCK_ACCESS)

    const endpoints = account.getEndpoints()
    expect(endpoints.hubBaseURL).toBe(hub.hubOrigin)
    expect(endpoints.labBaseURL).toBe(hub.labOrigin)
    expect(endpoints.llmBaseURL).toBe(hubLlmBaseURL(hub.hubOrigin))

    const workspaces = await account.listWorkspaces()
    expect(workspaces).toEqual([expect.objectContaining({ id: 7, name: 'delivery-e2e' })])

    const datasets = await account.listDatasets(7)
    expect(datasets).toEqual([expect.objectContaining({ id: 3, name: 'routes-demo' })])

    const token = await account.resolveToken(`${hubLlmBaseURL(hub.hubOrigin)}/chat/completions`)
    expect(token).toBe(VECLEAP_MOCK_ACCESS)

    const profile = await account.getProfile({ version: '0.0.0', locale: 'en', timezoneOffsetSeconds: 0 })
    expect(profile?.status).toBe('ready')
    expect(profile?.status === 'ready' && profile.value.name).toBe('Vecleap E2E')
  })

  it('rejects bad passwords without storing a session', async () => {
    const { account, mock: hub } = await bootAccount()
    const login = await account.loginWithPassword(VECLEAP_MOCK_EMAIL, 'wrong-password')
    expect(login.ok).toBe(false)
    expect(hub.loginAttempts).toBe(1)
    expect(await account.getState()).toMatchObject({ status: 'signed-out' })
  })

  it('refreshes an expiring access token before Hub API calls', async () => {
    const expired = Math.floor(Date.now() / 1000) - 10
    const { account, mock: hub } = await bootAccount(expired)
    const login = await account.loginWithPassword(VECLEAP_MOCK_EMAIL, VECLEAP_MOCK_PASSWORD)
    expect(login).toEqual({ ok: true })
    expect(hub.refreshAttempts).toBe(0)

    const workspaces = await account.listWorkspaces()
    expect(workspaces.length).toBe(1)
    expect(hub.refreshAttempts).toBe(1)
  })

  it('signs out and clears the LLM credential', async () => {
    const { account } = await bootAccount()
    await account.loginWithPassword(VECLEAP_MOCK_EMAIL, VECLEAP_MOCK_PASSWORD)
    await account.signOut({ version: '0.0.0', locale: 'en', timezoneOffsetSeconds: 0 })
    expect(await account.getState()).toMatchObject({ status: 'signed-out' })
    expect(await ctx!.credentials.resolve(credentialRef('VECLEAP_API_KEY'))).toBeUndefined()
  })

  it('returns HTTPS placeholder links for remote HTTP Hub (Desktop shell policy)', async () => {
    home = await mkdtemp(join(tmpdir(), 'vecleap-hub-account-'))
    ctx = new Context()
    await ctx.plugin(LocalCredentialProvider, { path: join(home, 'credentials.yaml'), watch: false })
    await ctx.plugin(VecleapHubAccount, {
      hubBaseURL: 'http://47.120.70.241:8900',
      labBaseURL: 'http://47.120.70.241:8901',
      apiKeyEnv: 'VECLEAP_API_KEY',
    })
    const links = (await (ctx.deepseekAccount as VecleapHubAccount).getState()).links
    expect(links.usageUrl).toMatch(/^https:\/\//)
    expect(links.topUpUrl).toMatch(/^https:\/\//)
  })
})
