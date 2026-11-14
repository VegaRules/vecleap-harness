/** VecLeap Hub account provider: password login, token refresh, and LLM credential sync. */
import { platform, release } from 'node:os'
import { Context } from '@deepseek-ai/cordis'
import Schema from '@deepseek-ai/schemastery'
import { z } from 'zod'
import {
  DeepSeekAccount,
  type AccountBonusBatch,
  type AccountBonusOrderId,
  type AccountClientMetadata,
  type AccountDetails,
  type AccountUserId,
  type AccountView,
  type PlatformSession,
  type SignInAttemptId,
} from '@deepseek-ai/dsh-deepseek-account'
import { credentialKey, credentialRef, type CredentialRef } from '@deepseek-ai/dsh-credentials'
import {
  hubFetch,
  hubFetchAgentConfig,
  hubFetchProfile,
  hubListWorkspaces,
  hubLoginWithPassword,
  hubLlmBaseURL,
  hubRefresh,
  labListDatasets,
  normalizeBaseURL,
  urlUsesHubLlm,
} from './hub-client.ts'
import type { HubDataset, HubStoredSession, HubWorkspace } from './hub-types.ts'

const SESSION_KEY = credentialKey('vecleap-hub', 'session')
const DEFAULT_HUB = 'http://hub.vecleap.internal:8900'
const DEFAULT_LAB = 'http://hub.vecleap.internal:8901'

const storedSessionSchema = z.object({
  version: z.literal(1),
  hubBaseURL: z.string().min(1),
  tokens: z.object({
    access_token: z.string().min(1),
    refresh_token: z.string().min(1),
    expires_at: z.number(),
    token_type: z.literal('Bearer'),
  }),
  user: z.object({
    id: z.number(),
    email: z.string(),
    nickname: z.string(),
    avatar_url: z.string(),
    role: z.enum(['user', 'superadmin']),
  }),
})

/** Deployment URLs and credential reference for the LLM gateway. */
export interface Config {
  /** Hub REST origin (port 8900). */
  hubBaseURL?: string
  /** Lab REST origin (port 8901). */
  labBaseURL?: string
  /** Environment credential reference receiving the Hub access token for LLM calls. */
  apiKeyEnv?: string
  /** Per-request Hub HTTP deadline in milliseconds. */
  requestTimeoutMs?: number
}

export const Config = Schema.object({
  hubBaseURL: Schema.string().default(DEFAULT_HUB),
  labBaseURL: Schema.string().default(DEFAULT_LAB),
  apiKeyEnv: Schema.string().default('VECLEAP_API_KEY'),
  requestTimeoutMs: Schema.number().min(1).max(120_000).default(30_000),
})

/** Desktop main only allows HTTPS or loopback HTTP when opening account links. */
function isDesktopSafeBrowserUrl(href: string): boolean {
  const url = new URL(href)
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
  return !(url.username || url.password) && (url.protocol === 'https:' || (loopback && url.protocol === 'http:'))
}

function accountLinks(hubBaseURL: string): AccountView['links'] {
  const base = normalizeBaseURL(hubBaseURL)
  const direct = { usageUrl: `${base}/`, topUpUrl: `${base}/` }
  if (isDesktopSafeBrowserUrl(direct.usageUrl)) return direct
  // Hub is often plain HTTP on a LAN IP; API traffic still uses hubBaseURL — these links are unused in VecLeap UI.
  const placeholder = 'https://127.0.0.1/vecleap-account-links-placeholder'
  return { usageUrl: placeholder, topUpUrl: placeholder }
}

function signedOutView(hubBaseURL: string): AccountView {
  return { status: 'signed-out', links: accountLinks(hubBaseURL), attempt: null }
}

function storedView(hubBaseURL: string): AccountView {
  return { status: 'credential-stored', links: accountLinks(hubBaseURL), attempt: null }
}

function userId(value: number): AccountUserId {
  return String(value) as AccountUserId
}

/** DeepSeekAccount backed by VecLeap Hub JWT and refresh tokens. */
export default class VecleapHubAccount extends DeepSeekAccount {
  static Config = Config
  static inject = ['credentials'] as const

  private readonly hubBaseURL: string
  private readonly labBaseURL: string
  private readonly apiKeyRef: CredentialRef
  private readonly requestTimeoutMs: number
  private refreshFlight: Promise<void> | undefined
  private readonly watchQueue: AccountView[] = []
  private watchWaiters: Array<() => void> = []

  /** @param ctx - Host context with credential storage. */
  constructor(ctx: Context, config: Config) {
    super(ctx)
    const resolved = config as Required<Config>
    this.hubBaseURL = normalizeBaseURL(resolved.hubBaseURL)
    this.labBaseURL = normalizeBaseURL(resolved.labBaseURL)
    this.apiKeyRef = credentialRef(resolved.apiKeyEnv)
    this.requestTimeoutMs = resolved.requestTimeoutMs
    void this.syncLlmCredentialFromSession()
    void this.syncModelsFromHub()
  }

  /** @returns Hub and Lab origins configured for this Host. */
  getEndpoints(): { readonly hubBaseURL: string; readonly labBaseURL: string; readonly llmBaseURL: string } {
    return {
      hubBaseURL: this.hubBaseURL,
      labBaseURL: this.labBaseURL,
      llmBaseURL: hubLlmBaseURL(this.hubBaseURL),
    }
  }

  /** @returns current account snapshot. */
  getState(): Promise<AccountView> {
    return this.readSession().then(session => session === undefined
      ? signedOutView(this.hubBaseURL)
      : storedView(this.hubBaseURL))
  }

  /**
   * Email/password login against Hub; syncs the access token into {@link Config.apiKeyEnv}.
   * @param email - Hub account email.
   * @param password - Hub account password.
   */
  async loginWithPassword(
    email: string,
    password: string,
  ): Promise<{ readonly ok: true } | { readonly ok: false; readonly message: string }> {
    const trimmedEmail = email.trim()
    if (trimmedEmail === '' || password === '') {
      return { ok: false, message: 'email and password required' }
    }
    try {
      const { tokens, user } = await hubLoginWithPassword(
        this.hubBaseURL,
        trimmedEmail,
        password,
        this.requestTimeoutMs,
      )
      await this.commitSession({ version: 1, hubBaseURL: this.hubBaseURL, tokens, user })
      return { ok: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'login failed'
      return { ok: false, message }
    }
  }

  /** @returns workspaces visible to the signed-in user. */
  async listWorkspaces(): Promise<HubWorkspace[]> {
    const session = await this.sessionWithFreshAccessToken()
    if (session === undefined) return []
    return hubListWorkspaces(session, this.requestTimeoutMs)
  }

  /**
   * @param workspaceId - Hub workspace id.
   * @returns datasets from Lab for that workspace.
   */
  async listDatasets(workspaceId: number): Promise<HubDataset[]> {
    const session = await this.sessionWithFreshAccessToken()
    if (session === undefined) return []
    return labListDatasets(session, this.labBaseURL, workspaceId, this.requestTimeoutMs)
  }

  getProfile(_client: AccountClientMetadata): Promise<AccountDetails['profile'] | null> {
    return this.readSession().then(async (session) => {
      if (session === undefined) return null
      try {
        const fresh = await this.sessionWithFreshAccessToken()
        if (fresh === undefined) return null
        const user = await hubFetchProfile(fresh, this.requestTimeoutMs)
        return {
          status: 'ready',
          value: {
            id: userId(user.id),
            name: user.nickname || user.email,
            contact: user.email,
            avatarUrl: user.avatar_url || null,
          },
        }
      } catch {
        return { status: 'failed' }
      }
    })
  }

  getBalance(_client: AccountClientMetadata): Promise<AccountDetails['balance'] | null> {
    return Promise.resolve(null)
  }

  getUnnotifiedBonuses(_client: AccountClientMetadata): Promise<AccountBonusBatch | null> {
    return Promise.resolve(null)
  }

  ackBonusNotified(_accountId: AccountUserId, _orderId: AccountBonusOrderId, _client: AccountClientMetadata): Promise<boolean> {
    return Promise.resolve(false)
  }

  startSignIn(_client: AccountClientMetadata, _callbackOrigin: string, _loginSource: 'web' | 'desktop'): Promise<AccountView> {
    return Promise.resolve({
      ...signedOutView(this.hubBaseURL),
      attempt: {
        id: 'vecleap-hub-oauth-disabled' as SignInAttemptId,
        phase: 'failed',
        errorCode: 'protocol',
      },
    })
  }

  cancelSignIn(_id: SignInAttemptId): Promise<AccountView> {
    return this.getState()
  }

  async signOut(_client: AccountClientMetadata): Promise<AccountView> {
    const session = await this.readSession()
    if (session !== undefined) {
      try {
        await hubFetch(
          session.hubBaseURL,
          '/api/auth/logout',
          { method: 'POST', json: { refresh_token: session.tokens.refresh_token } },
          this.requestTimeoutMs,
        )
      } catch {
        // Local removal proceeds even when Hub logout fails.
      }
    }
    await this.clearSession()
    this.ctx.emit('deepseek-account/signed-out')
    return signedOutView(this.hubBaseURL)
  }

  async *watch(signal: AbortSignal): AsyncIterable<AccountView> {
    yield await this.getState()
    while (!signal.aborted) {
      if (this.watchQueue.length > 0) {
        const next = this.watchQueue.shift()
        if (next !== undefined) {
          yield next
          continue
        }
      }
      await new Promise<void>((resolve) => {
        this.watchWaiters.push(resolve)
        signal.addEventListener('abort', () => { resolve() }, { once: true })
      })
    }
  }

  async resolveToken(url: string): Promise<string | undefined> {
    if (!urlUsesHubLlm(this.hubBaseURL, url)) return undefined
    const session = await this.sessionWithFreshAccessToken()
    return session?.tokens.access_token
  }

  async rejectToken(token: string): Promise<void> {
    const session = await this.readSession()
    if (session === undefined || session.tokens.access_token !== token) return
    await this.clearSession()
    this.ctx.emit('deepseek-account/session-expired')
  }

  getPlatformSession(): Promise<PlatformSession | null> {
    return Promise.resolve(null)
  }

  getDeviceIdentity(): Promise<{ deviceId?: string; userId?: AccountUserId; osVersion: string }> {
    return this.readSession().then(session => ({
      osVersion: `${platform()} ${release()}`,
      ...(session === undefined ? {} : { userId: userId(session.user.id) }),
    }))
  }

  private notifyWatch(view: AccountView): void {
    this.watchQueue.push(view)
    for (const wake of this.watchWaiters.splice(0)) wake()
  }

  private async readSession(): Promise<HubStoredSession | undefined> {
    const record = await this.ctx.credentials.readRecord(SESSION_KEY)
    if (record === undefined || record.kind !== 'grant') return undefined
    const parsed = storedSessionSchema.safeParse(record.payload)
    if (!parsed.success) return undefined
    if (normalizeBaseURL(parsed.data.hubBaseURL) !== this.hubBaseURL) return undefined
    return parsed.data
  }

  private async commitSession(session: HubStoredSession): Promise<void> {
    await this.ctx.credentials.modifyRecord(SESSION_KEY, () => Promise.resolve({
      kind: 'grant',
      payload: session,
    }))
    await this.ctx.credentials.set(this.apiKeyRef, session.tokens.access_token)
    this.notifyWatch(storedView(this.hubBaseURL))
    await this.syncModelsFromHub()
  }

  private async clearSession(): Promise<void> {
    const session = await this.readSession()
    await this.ctx.credentials.deleteRecord(SESSION_KEY)
    if (session !== undefined) {
      try {
        await this.ctx.credentials.unset(this.apiKeyRef)
      } catch {
        // A manually configured key may be environment-shadowed.
      }
    }
    this.notifyWatch(signedOutView(this.hubBaseURL))
  }

  private async syncLlmCredentialFromSession(): Promise<void> {
    const session = await this.readSession()
    if (session === undefined) return
    await this.ctx.credentials.set(this.apiKeyRef, session.tokens.access_token)
    await this.syncModelsFromHub()
  }

  /** Align default model with Hub catalog (same source as Mobile `GET /api/agent/config`). */
  private async syncModelsFromHub(): Promise<void> {
    const session = await this.readSession()
    if (session === undefined) return
    const agentDefaultModel = this.ctx.get('agentDefaultModel')
    if (agentDefaultModel === undefined) return
    try {
      const fresh = await this.sessionWithFreshAccessToken()
      if (fresh === undefined) return
      const config = await hubFetchAgentConfig(
        this.hubBaseURL,
        fresh.tokens.access_token,
        this.requestTimeoutMs,
      )
      if (config.models.length === 0) return
      const firstModel = config.models[0]
      if (firstModel === undefined) return
      const recommended = config.recommended_model ?? firstModel
      const current = agentDefaultModel.currentSelection()
      const legacyAliases = new Set(['deepseek-chat', 'deepseek-reasoner', 'qwen-turbo'])
      if (!config.models.includes(current.model) || legacyAliases.has(current.model)) {
        await agentDefaultModel.saveSelection({ provider: current.provider || 'openai', model: recommended })
      }
    } catch (error) {
      this.ctx.logger.warn('vecleap-hub: could not sync models from /api/agent/config', error)
    }
  }

  private async sessionWithFreshAccessToken(): Promise<HubStoredSession | undefined> {
    const session = await this.readSession()
    if (session === undefined) return undefined
    const now = Math.floor(Date.now() / 1000)
    if (session.tokens.expires_at > now + 60) return session
    if (this.refreshFlight === undefined) {
      this.refreshFlight = this.runRefresh(session).finally(() => { this.refreshFlight = undefined })
    }
    await this.refreshFlight
    return this.readSession()
  }

  private async runRefresh(session: HubStoredSession): Promise<void> {
    try {
      const { tokens, user } = await hubRefresh(
        session.hubBaseURL,
        session.tokens.refresh_token,
        this.requestTimeoutMs,
      )
      await this.commitSession({ ...session, tokens, user })
    } catch {
      await this.clearSession()
      this.ctx.emit('deepseek-account/session-expired')
    }
  }
}
