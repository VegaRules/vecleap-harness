/** Hub `/api/sync/sessions` client for Host-side session sync. */
import { hubFetch, readHubErrorMessage } from '@deepseek-ai/dsh-vecleap-auth-stub'
import type { HubStoredSession } from '@deepseek-ai/dsh-vecleap-auth-stub'
import type {
  HubChatMessage,
  HubChatMessageEvent,
  HubChatSessionSummary,
  HubSyncEvent,
} from './hub-sync-types.ts'
import { hubTranscriptFromEvents } from './hub-transcript.ts'

const BATCH_LIMIT = 100

const authHeaders = (token: string): HeadersInit => ({ authorization: `Bearer ${token}` })

function sessionPath(id: string): string {
  return `/api/sync/sessions/${encodeURIComponent(id)}`
}

async function parseJson(response: Response): Promise<unknown> {
  return response.json().catch(() => ({}))
}

function asLoose(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null
}

/** @returns Hub `last_seq` for a session (for linking local sessions without event conflicts). */
export async function hubSessionLastSeq(
  session: HubStoredSession,
  sessionId: string,
  timeoutMs: number,
): Promise<number> {
  const response = await hubFetch(
    session.hubBaseURL,
    `${sessionPath(sessionId)}?from_seq=0&limit=1`,
    { method: 'GET', headers: authHeaders(session.tokens.access_token) },
    timeoutMs,
  )
  const body = await parseJson(response)
  if (!response.ok) {
    throw new Error(readHubErrorMessage(body as { error?: string }, `head session failed (${response.status})`))
  }
  const lastSeq = (body as { last_seq?: number }).last_seq
  // Hub `last_seq` is 0 on a new session; the next append uses seq `last_seq + 1` (same as Web/Mobile).
  return typeof lastSeq === 'number' && lastSeq >= 0 ? lastSeq : 0
}

export async function hubListChatSessions(
  session: HubStoredSession,
  timeoutMs: number,
): Promise<HubChatSessionSummary[]> {
  const response = await hubFetch(
    session.hubBaseURL,
    '/api/sync/sessions?limit=50',
    { method: 'GET', headers: authHeaders(session.tokens.access_token) },
    timeoutMs,
  )
  const body = await parseJson(response)
  if (!response.ok) throw new Error(readHubErrorMessage(body as { error?: string }, `list sessions failed (${response.status})`))
  const sessions = (body as { sessions?: HubChatSessionSummary[] }).sessions
  return Array.isArray(sessions) ? sessions : []
}

export async function hubLoadChatMessages(
  session: HubStoredSession,
  sessionId: string,
  timeoutMs: number,
): Promise<{ title: string; messages: HubChatMessage[] }> {
  const events: Array<{ seq: number; data: unknown }> = []
  let fromSeq = 0
  let title = ''
  for (;;) {
    const response = await hubFetch(
      session.hubBaseURL,
      `${sessionPath(sessionId)}?from_seq=${fromSeq}&limit=500`,
      { method: 'GET', headers: authHeaders(session.tokens.access_token) },
      timeoutMs,
    )
    const body = await parseJson(response)
    if (!response.ok) {
      throw new Error(readHubErrorMessage(body as { error?: string }, `load session failed (${response.status})`))
    }
    const record = body as {
      title?: string
      events?: Array<{ seq: number; data: unknown }>
      next_from_seq?: number
      has_more?: boolean
    }
    if (typeof record.title === 'string') title = record.title
    if (Array.isArray(record.events)) events.push(...record.events)
    const hasMore = record.has_more === true
    const next = typeof record.next_from_seq === 'number' ? record.next_from_seq : fromSeq
    if (!hasMore || next <= fromSeq) break
    fromSeq = next
  }
  return { title, messages: hubTranscriptFromEvents(events) }
}

export class HubSessionWriter {
  private nextSeq: number
  private queue: HubSyncEvent[] = []
  private title: string | undefined
  private running: Promise<void> | null = null
  private deleted = false

  constructor(
    readonly hubSessionId: string,
    lastSeq: number,
    private readonly hubSession: () => Promise<HubStoredSession | undefined>,
    private readonly timeoutMs: number,
    private readonly retryDelays: number[] = [1000, 3000],
  ) {
    this.nextSeq = lastSeq + 1
  }

  setTitle(title: string): void {
    if (title) this.title = title
  }

  append(data: HubChatMessageEvent, title?: string): Promise<void> {
    if (this.deleted) return Promise.reject(new Error('hub session deleted'))
    this.queue.push({ seq: this.nextSeq++, data })
    if (title) this.title = title
    return this.flush()
  }

  flush(): Promise<void> {
    this.running ??= this.drain().finally(() => { this.running = null })
    return this.running
  }

  lastCommittedSeq(): number {
    return this.nextSeq - this.queue.length - 1
  }

  private renumber(lastSeq: number): void {
    this.queue = this.queue.map((event, index) => ({ ...event, seq: lastSeq + 1 + index }))
    this.nextSeq = lastSeq + 1 + this.queue.length
  }

  private async drain(): Promise<void> {
    let attempt = 0
    let renumbered = false
    while (this.queue.length > 0) {
      const hub = await this.hubSession()
      if (hub === undefined) throw new Error('hub session unavailable')
      const batch = this.queue.slice(0, BATCH_LIMIT)
      const response = await hubFetch(
        hub.hubBaseURL,
        `${sessionPath(this.hubSessionId)}/events`,
        {
          method: 'PUT',
          headers: authHeaders(hub.tokens.access_token),
          json: { events: batch, ...(this.title ? { title: this.title } : {}) },
        },
        this.timeoutMs,
      ).catch(() => null)
      if (response?.ok) {
        this.queue = this.queue.slice(batch.length)
        this.title = undefined
        attempt = 0
        continue
      }
      const status = response?.status
      if (status === 410) {
        this.deleted = true
        this.queue = []
        throw new Error('hub session deleted')
      }
      if (status === 400 && response !== null && response !== undefined) {
        const detail = await parseJson(response).catch(() => ({}))
        throw new Error(readHubErrorMessage(detail as { error?: string }, 'hub rejected sync events (400)'))
      }
      if (status === 409 && !renumbered && response !== null && response !== undefined) {
        renumbered = true
        let lastSeq: number | undefined
        try {
          const body = asLoose(await parseJson(response))
          if (typeof body?.last_seq === 'number') lastSeq = body.last_seq
        } catch {
          /* read session below */
        }
        if (lastSeq === undefined) {
          const head = await hubFetch(
            hub.hubBaseURL,
            `${sessionPath(this.hubSessionId)}?from_seq=0&limit=1`,
            { method: 'GET', headers: authHeaders(hub.tokens.access_token) },
            this.timeoutMs,
          )
          const headBody = asLoose(await parseJson(head))
          if (typeof headBody?.last_seq === 'number') lastSeq = headBody.last_seq
        }
        if (typeof lastSeq === 'number') this.renumber(lastSeq)
        continue
      }
      attempt += 1
      const delay = this.retryDelays[Math.min(attempt - 1, this.retryDelays.length - 1)] ?? 3000
      await new Promise((resolve) => { setTimeout(resolve, delay) })
    }
  }
}
