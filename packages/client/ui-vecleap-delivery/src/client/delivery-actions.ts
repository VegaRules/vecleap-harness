/** Host-side delivery session messaging without leaving the dashboard panel. */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type { IWorkspaces, WorkspaceSnapshot } from '@deepseek-ai/dsh-api-workspace-controller/client'
import type { ISessions } from '@deepseek-ai/dsh-api-session-controller/client'
import type { SessionRequestId } from '@deepseek-ai/dsh-api-session-controller/types'
import type { UiWorkspace } from '@deepseek-ai/dsh-client-ui-workspace/client'
import type { ILayout } from '@deepseek-ai/dsh-client-ui-layout/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { randomUUID } from '@deepseek-ai/dsh-util-crypto'
import { DEMO_PROJECTS } from './demo-data.ts'

const SESSION_STORAGE_KEY = 'vecleap.delivery.sessionId'

/** Board context appended to each operator message. */
export interface DeliveryMessageContext {
  readonly projectId: number
  readonly tab: 'board' | 'fleet' | 'playbooks'
}

/** Outcome of a dashboard chat submit. */
export type DeliverySendOutcome = 'accepted' | 'no-workspace' | 'failed'

type DeliveryContext = ClientContext & {
  readonly layout: ILayout
  readonly uiWorkspace: UiWorkspace
  readonly remote: ClientContext['remote'] & { session: { prompt: (request: {
    requestId: SessionRequestId
    sessionId: SessionId
    mode: 'queue' | 'steer'
    content: readonly { type: 'text'; text: string }[]
    clientTimeZone?: string
  }) => Promise<{ ok: boolean }> } }
  readonly sessions: ISessions
  readonly workspaces: IWorkspaces
}

/**
 * Create delivery-panel agent actions bound to the browser context.
 * @param ctx - Cordis client context with session and workspace services.
 * @returns send and navigation helpers.
 */
export function createDeliveryActions(ctx: DeliveryContext) {
  /**
   * Resolve the dedicated delivery session, creating one when missing.
   * @returns session id or null when no workspace is ready.
   */
  async function ensureDeliverySession(): Promise<SessionId | null> {
    const stored = localStorage.getItem(SESSION_STORAGE_KEY)
    if (stored !== null && sessionExists(stored, ctx.sessions, ctx.workspaces.list.getSnapshot())) {
      return stored as SessionId
    }
    const workspaceId = pickWorkspaceId(ctx.workspaces.list.getSnapshot())
    if (workspaceId === undefined) return null
    try {
      const sessionId = await ctx.uiWorkspace.connectWorkspace(workspaceId)
      localStorage.setItem(SESSION_STORAGE_KEY, sessionId)
      return sessionId
    } catch {
      return null
    }
  }

  /**
   * Queue an operator message on the delivery session without switching panels.
   * @param text - user instruction.
   * @param context - current board context for the model.
   * @returns admission outcome.
   */
  async function sendDeliveryMessage(text: string, context: DeliveryMessageContext): Promise<DeliverySendOutcome> {
    const body = text.trim()
    if (body === '') return 'failed'
    const sessionId = await ensureDeliverySession()
    if (sessionId === null) return 'no-workspace'
    const project = DEMO_PROJECTS[context.projectId]?.name ?? String(context.projectId)
    const tabLabel = context.tab === 'board' ? '运营看板' : context.tab === 'fleet' ? '车队' : '剧本'
    const framed = `[Vecleap 无人车配送 · ${tabLabel} · 项目：${project}]\n${body}`
    const result = await ctx.remote.session.prompt({
      requestId: randomUUID() as SessionRequestId,
      sessionId,
      mode: 'queue',
      content: [{ type: 'text', text: framed }],
      clientTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    })
    return result.ok ? 'accepted' : 'failed'
  }

  /** Open the delivery session in the main conversation view. */
  function openDeliveryConversation(): void {
    const stored = localStorage.getItem(SESSION_STORAGE_KEY)
    if (stored !== null && sessionExists(stored, ctx.sessions, ctx.workspaces.list.getSnapshot())) {
      ctx.uiWorkspace.openSession(stored as SessionId)
    } else {
      ctx.uiWorkspace.startSession(undefined, {
        prompt: '你是 Vecleap 无人车运营助手，我会在此会话中处理配送看板上的事务。',
        clearPreviousDraft: true,
      })
    }
    ctx.layout.selectPanel(null)
  }

  return { sendDeliveryMessage, openDeliveryConversation, ensureDeliverySession }
}

function pickWorkspaceId(snapshot: WorkspaceSnapshot): WorkspaceSnapshot['items'][number]['workspaceId'] | undefined {
  if (snapshot.phase !== 'ready' || snapshot.items.length === 0) return undefined
  return snapshot.items[0]?.workspaceId
}

function sessionExists(
  id: string,
  sessions: ISessions,
  workspaces: WorkspaceSnapshot,
): boolean {
  const list = sessions.list.getSnapshot()
  if (list.phase !== 'ready' || list.byId[id as SessionId] === undefined) return false
  if (workspaces.phase !== 'ready') return true
  return !workspaces.archivedSessionIds.includes(id as SessionId)
}
