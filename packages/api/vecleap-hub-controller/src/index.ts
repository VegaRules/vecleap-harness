/** Host Remote owner for VecLeap Hub REST integration. */
import { Context } from '@deepseek-ai/cordis'
import { Remote, RemoteError, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'
import type VecleapHubAccount from '@deepseek-ai/dsh-vecleap-auth-stub'
import { hubListChatSessions, hubLoadChatMessages } from '@deepseek-ai/dsh-vecleap-hub-session-sync'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { z } from 'zod'
import type {
  HubChatMessage,
  HubChatSessionSummary,
  HubDataset,
  HubWorkspace,
  VecleapHubEndpoints,
  VecleapHubLoginResult,
} from './types.ts'

export type * from './types.ts'

const loginSchema = z.object({
  email: z.string().min(1).max(320),
  password: z.string().min(1).max(256),
})

const workspaceIdSchema = z.number().int().positive()
const hubSessionIdSchema = z.string().trim().min(1).max(64)
const localSessionIdSchema = z.string().trim().min(1)

const HUB_SYNC_TIMEOUT_MS = 30_000

declare module '@deepseek-ai/cordis' {
  interface Context {
    /** Host owner of the `vecleapHub` Remote namespace. */
    vecleapHubController: VecleapHubController
  }
}

function hubAccount(ctx: Context): VecleapHubAccount {
  const account = ctx.deepseekAccount
  if (!('loginWithPassword' in account) || typeof account.loginWithPassword !== 'function') {
    throw new RemoteError('gateway/bad-request', 'VecLeap Hub account is not mounted', {})
  }
  return account as VecleapHubAccount
}

/** Remote facade over {@link VecleapHubAccount}. */
export class VecleapHubController extends TypertRemoteService {
  static inject = ['deepseekAccount'] as const

  /** @param ctx - Host context with the Hub account provider. */
  constructor(ctx: Context) {
    super(ctx, 'vecleapHubController', { namespace: 'vecleapHub' })
  }

  /**
   * @returns configured Hub, Lab, and LLM gateway base URLs.
   */
  @Remote
  getEndpoints(): Promise<VecleapHubEndpoints> {
    return Promise.resolve(hubAccount(this.ctx).getEndpoints())
  }

  /**
   * @param email - Hub account email.
   * @param password - Hub account password.
   * @returns login outcome without token values.
   */
  @Remote
  async loginWithPassword(email: string, password: string): Promise<VecleapHubLoginResult> {
    const parsed = loginSchema.safeParse({ email, password })
    if (!parsed.success) {
      throw new RemoteError('gateway/bad-request', 'invalid login payload', { issues: parsed.error.issues })
    }
    return hubAccount(this.ctx).loginWithPassword(parsed.data.email, parsed.data.password)
  }

  /**
   * @returns workspaces from Hub for the signed-in user.
   */
  @Remote
  async listWorkspaces(): Promise<HubWorkspace[]> {
    return hubAccount(this.ctx).listWorkspaces()
  }

  /**
   * @param workspaceId - Hub workspace id.
   * @returns datasets from Lab for that workspace.
   */
  @Remote
  async listDatasets(workspaceId: number): Promise<HubDataset[]> {
    const parsed = workspaceIdSchema.safeParse(workspaceId)
    if (!parsed.success) {
      throw new RemoteError('gateway/bad-request', 'invalid workspace id', {})
    }
    return hubAccount(this.ctx).listDatasets(parsed.data)
  }

  /**
   * @returns cloud chat sessions for the signed-in user (Web/Mobile/Desktop share this list).
   */
  @Remote
  async listChatSessions(): Promise<HubChatSessionSummary[]> {
    const account = hubAccount(this.ctx)
    const rows = await account.withAuthorizedSession(session => hubListChatSessions(session, HUB_SYNC_TIMEOUT_MS))
    if (rows === undefined) {
      this.ctx.logger.warn('vecleapHub.listChatSessions: no authorized Hub session (re-login may be required)')
      throw new RemoteError('gateway/bad-request', 'hub session unavailable', {})
    }
    this.ctx.logger.info(`vecleapHub.listChatSessions: ${rows.length} session(s)`)
    return rows
  }

  /**
   * @param sessionId - Hub `session_id` UUID.
   * @returns title and user/assistant messages for read-only preview.
   */
  @Remote
  async loadChatSession(sessionId: string): Promise<{ readonly title: string; readonly messages: HubChatMessage[] }> {
    if (sessionId.trim() === '') {
      throw new RemoteError('gateway/bad-request', 'invalid session id', {})
    }
    const account = hubAccount(this.ctx)
    const loaded = await account.withAuthorizedSession(session =>
      hubLoadChatMessages(session, sessionId, HUB_SYNC_TIMEOUT_MS))
    return loaded ?? { title: '', messages: [] }
  }

  /**
   * @param localSessionId - desktop DSH session id.
   * @param hubSessionId - existing Hub `session_id` to append further turns into.
   */
  @Remote
  async linkChatSession(localSessionId: string, hubSessionId: string): Promise<{ readonly linked: true }> {
    const local = localSessionIdSchema.safeParse(localSessionId)
    const hub = hubSessionIdSchema.safeParse(hubSessionId)
    if (!local.success || !hub.success) {
      throw new RemoteError('gateway/bad-request', 'invalid link payload', {})
    }
    const sync = this.ctx.vecleapHubSessionSync
    if (sync === undefined) {
      throw new RemoteError('gateway/bad-request', 'hub session sync unavailable', {})
    }
    await sync.linkLocalSession(local.data as SessionId, hub.data)
    return { linked: true }
  }
}

export default VecleapHubController
