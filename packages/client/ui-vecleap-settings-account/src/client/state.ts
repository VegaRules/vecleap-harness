import type { AccountDetails, AccountView } from '@deepseek-ai/dsh-deepseek-account/types'
import type { HubChatMessage, HubChatSessionSummary } from '@deepseek-ai/dsh-api-vecleap-hub-controller/types'
import type { HostObservable } from '@deepseek-ai/dsh-client-ui-slots'

/** Safe account snapshot for VecLeap Hub settings. */
export interface HubAccountSnapshot {
  view: AccountView | undefined
  details: Partial<AccountDetails> | undefined
  failed: boolean
  loginVisible: boolean
}

/** Operations injected into account UI occupants. */
export interface HubAccountInjected {
  hooks: { account: HostObservable<HubAccountSnapshot> }
  refreshAccount: () => Promise<void>
  showLogin: (visible: boolean) => void
  hubLogin: (email: string, password: string) => Promise<void>
  hasRunningAccountTasks: () => Promise<boolean>
  signOut: () => Promise<void>
  listChatSessions: () => Promise<HubChatSessionSummary[]>
  loadChatSession: (sessionId: string) => Promise<{ title: string; messages: HubChatMessage[] }>
}
