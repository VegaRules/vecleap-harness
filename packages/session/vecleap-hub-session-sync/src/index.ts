/**
 * Push desktop session turns to VecLeap Hub chat sync (`/api/sync/sessions`), using
 * the same `message` event shape as Web and Mobile.
 * @module @deepseek-ai/dsh-vecleap-hub-session-sync
 */
import { randomUUID } from 'node:crypto'
import { Context, Service } from '@deepseek-ai/cordis'
import Schema from '@deepseek-ai/schemastery'
import { credentialKey } from '@deepseek-ai/dsh-credentials'
import type VecleapHubAccount from '@deepseek-ai/dsh-vecleap-auth-stub'
import type { Session, SessionEvent, SessionId } from '@deepseek-ai/dsh-session'
import {
  hubListChatSessions,
  hubLoadChatMessages,
  hubSessionLastSeq,
  HubSessionWriter,
} from './hub-sync-client.ts'
import { latestAssistantText, titleFromSessionEvent, userMessageText } from './extract.ts'
import type {
  HubChatMessage,
  HubChatSessionSummary,
  HubChatMessageEvent,
  HubSyncMap,
} from './hub-sync-types.ts'

export type {
  HubChatMessage,
  HubChatSessionSummary,
} from './hub-sync-types.ts'

export { hubListChatSessions, hubLoadChatMessages, hubSessionLastSeq } from './hub-sync-client.ts'

const MAP_KEY = credentialKey('vecleap-hub', 'chat-sync-map')

export interface Config {
  /** When false, the plugin mounts but does not mirror turns to Hub. */
  enabled?: boolean
  /** Per-request Hub HTTP deadline in milliseconds. */
  requestTimeoutMs?: number
}

export const Config = Schema.object({
  enabled: Schema.boolean().default(true),
  requestTimeoutMs: Schema.number().min(1).max(120_000).default(30_000),
})

declare module '@deepseek-ai/cordis' {
  interface Context {
  /**
     * Mirrors local coding sessions to Hub chat sync when the user is signed in.
     */
    vecleapHubSessionSync: VecleapHubSessionSync
  }
}

function isHubAccount(account: unknown): account is VecleapHubAccount {
  return typeof account === 'object' && account !== null
    && 'loginWithPassword' in account
    && typeof (account as VecleapHubAccount).loginWithPassword === 'function'
    && 'withAuthorizedSession' in account
}

function hubMessage(
  role: 'user' | 'assistant',
  content: string,
  model?: string,
): HubChatMessageEvent {
  return {
    type: 'message',
    role,
    content,
    created_at: Date.now(),
    mode: 'agent',
    ...(model ? { model } : {}),
  }
}

/** Host-owned Hub chat sync mirror for desktop sessions. */
export class VecleapHubSessionSync extends Service {
  static inject = ['deepseekAccount', 'sessions', 'credentials'] as const
  static Config = Config

  private readonly enabled: boolean
  private readonly timeoutMs: number
  private readonly writers = new Map<SessionId, HubSessionWriter>()
  private readonly localToHub = new Map<SessionId, string>()
  private mapLoaded = false
  private persistChain: Promise<void> = Promise.resolve()

  constructor(ctx: Context, config: Config) {
    super(ctx, 'vecleapHubSessionSync')
    this.enabled = config.enabled !== false
    this.timeoutMs = config.requestTimeoutMs ?? 30_000

    if (!this.enabled) return

    ctx.on('session/event', (session, event) => {
      void this.onSessionEvent(session, event).catch((error: unknown) => {
        this.ctx.logger.warn(`vecleap hub sync: ${String(session.id)}: ${String(error)}`)
      })
    })

    ctx.on('deepseek-account/session-expired', () => {
      this.writers.clear()
      this.localToHub.clear()
    })

  }

  /** Cloud session list for settings / Remote callers. */
  async listCloudSessions(): Promise<HubChatSessionSummary[]> {
    const account = this.hubAccount()
    if (account === undefined) return []
    const rows = await account.withAuthorizedSession(session => hubListChatSessions(session, this.timeoutMs))
    return rows ?? []
  }

  /**
   * Map a local DSH session to an existing Hub `session_id` so later turns
   * append to the same cloud thread (Web/Mobile/Desktop).
   */
  async linkLocalSession(localSessionId: SessionId, hubSessionId: string): Promise<void> {
    const account = this.hubAccount()
    if (account === undefined) throw new Error('hub account unavailable')
    const linked = await account.withAuthorizedSession(async (session) => {
      const lastSeq = await hubSessionLastSeq(session, hubSessionId, this.timeoutMs)
      const map = await this.readMap()
      map[String(localSessionId)] = { hubSessionId, lastSeq }
      this.localToHub.set(localSessionId, hubSessionId)
      await this.writeMap(map)
      this.mapLoaded = true
    })
    if (linked === undefined) throw new Error('hub session unavailable')
  }

  /** Load one cloud transcript for read-only display. */
  async loadCloudSession(sessionId: string): Promise<{ title: string; messages: HubChatMessage[] } | undefined> {
    const account = this.hubAccount()
    if (account === undefined) return undefined
    return account.withAuthorizedSession(session => hubLoadChatMessages(session, sessionId, this.timeoutMs))
  }

  private hubAccount(): VecleapHubAccount | undefined {
    const account = this.ctx.deepseekAccount
    return isHubAccount(account) ? account : undefined
  }

  private async onSessionEvent(session: Session, event: SessionEvent): Promise<void> {
    const account = this.hubAccount()
    if (account === undefined) return
    if (await account.withAuthorizedSession(s => Promise.resolve(s)) === undefined) return

    await this.ensureMapLoaded()
    const hubSessionId = await this.hubSessionIdFor(session)
    const writer = await this.writerFor(session, hubSessionId, account)

    if (event.type === 'user/message') {
      const text = userMessageText(event)
      if (text === undefined) return
      const header = session.requestHeader()
      const model = header?.config?.model
      const title = text.length > 60 ? `${text.slice(0, 59)}…` : text
      await writer.append(hubMessage('user', text, model), title)
      await this.persistMap()
      return
    }

    if (event.type === 'turn/end' && event.data.reason.kind === 'completed') {
      const text = latestAssistantText(session)
      if (text === undefined) return
      const header = session.requestHeader()
      const model = header?.config?.model
      await writer.append(hubMessage('assistant', text, model))
      await this.persistMap()
      return
    }

    if ((event as { type: string }).type === 'session/title') {
      const title = titleFromSessionEvent(event)
      if (title === undefined) return
      writer.setTitle(title)
      await writer.flush()
    }
  }

  private async hubSessionIdFor(session: Session): Promise<string> {
    const cached = this.localToHub.get(session.id)
    if (cached !== undefined) return cached
    const map = await this.readMap()
    const entry = map[String(session.id)]
    if (entry !== undefined) {
      this.localToHub.set(session.id, entry.hubSessionId)
      return entry.hubSessionId
    }
    const hubSessionId = randomUUID()
    map[String(session.id)] = { hubSessionId, lastSeq: 0 }
    this.localToHub.set(session.id, hubSessionId)
    await this.writeMap(map)
    return hubSessionId
  }

  private async writerFor(
    session: Session,
    hubSessionId: string,
    account: VecleapHubAccount,
  ): Promise<HubSessionWriter> {
    const existing = this.writers.get(session.id)
    if (existing !== undefined) return existing
    const map = await this.readMap()
    const lastSeq = map[String(session.id)]?.lastSeq ?? 0
    const hubSession = () => account.withAuthorizedSession(s => Promise.resolve(s))
    const writer = new HubSessionWriter(hubSessionId, lastSeq, hubSession, this.timeoutMs)
    this.writers.set(session.id, writer)
    return writer
  }

  private async ensureMapLoaded(): Promise<void> {
    if (this.mapLoaded) return
    const map = await this.readMap()
    for (const [localId, entry] of Object.entries(map)) {
      this.localToHub.set(localId as SessionId, entry.hubSessionId)
    }
    this.mapLoaded = true
  }

  private async persistMap(): Promise<void> {
    this.persistChain = this.persistChain.then(async () => {
      const map = await this.readMap()
      let changed = false
      for (const [sessionId, writer] of this.writers) {
        const hubSessionId = this.localToHub.get(sessionId)
        if (hubSessionId === undefined) continue
        const lastSeq = writer.lastCommittedSeq()
        const key = String(sessionId)
        const previous = map[key]
        if (previous === undefined || previous.lastSeq !== lastSeq) {
          map[key] = { hubSessionId, lastSeq }
          changed = true
        }
      }
      if (changed) await this.writeMap(map)
    })
    await this.persistChain
  }

  private async readMap(): Promise<HubSyncMap> {
    const record = await this.ctx.credentials.readRecord(MAP_KEY)
    if (record === undefined || record.kind !== 'grant') return {}
    const payload = record.payload
    if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) return {}
    return payload as HubSyncMap
  }

  private async writeMap(map: HubSyncMap): Promise<void> {
    await this.ctx.credentials.modifyRecord(MAP_KEY, () => Promise.resolve({
      kind: 'grant',
      payload: map,
    }))
  }
}

export default VecleapHubSessionSync
