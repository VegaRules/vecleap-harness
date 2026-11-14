/** Host Remote owner for VecLeap Hub REST integration. */
import { Context } from '@deepseek-ai/cordis'
import { Remote, RemoteError, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'
import type VecleapHubAccount from '@deepseek-ai/dsh-vecleap-auth-stub'
import { z } from 'zod'
import type { HubDataset, HubWorkspace, VecleapHubEndpoints, VecleapHubLoginResult } from './types.ts'

export type * from './types.ts'

const loginSchema = z.object({
  email: z.string().min(1).max(320),
  password: z.string().min(1).max(256),
})

const workspaceIdSchema = z.number().int().positive()

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
}

export default VecleapHubController
