/** Client-side Remote namespace augmentation and mount for VecLeap Hub. */
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-api-gateway/client'
import vecleapHubRemote from '@deepseek-ai/dsh-api-vecleap-hub-controller/remote'
import type { HubDataset, HubWorkspace, VecleapHubEndpoints, VecleapHubLoginResult } from '../types.ts'

/** Generated `vecleapHub` namespace face. */
export interface VecleapHubRemote {
  getEndpoints(): Promise<VecleapHubEndpoints>
  loginWithPassword(email: string, password: string): Promise<VecleapHubLoginResult>
  listWorkspaces(): Promise<HubWorkspace[]>
  listDatasets(workspaceId: number): Promise<HubDataset[]>
}

declare module '@deepseek-ai/dsh-api-gateway/client' {
  interface ClientRemote {
    /** VecLeap Hub login and workspace APIs proxied through the Host. */
    vecleapHub: VecleapHubRemote
  }
}

export const inject = ['remote'] as const

/** Mount the generated `vecleapHub` Remote namespace on the Client carrier. */
export async function apply(ctx: Context): Promise<() => Promise<void>> {
  return ctx.remote.$mount(vecleapHubRemote)
}
