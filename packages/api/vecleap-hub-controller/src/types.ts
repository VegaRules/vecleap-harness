/** Wire-safe Hub integration types for Remote callers. */

/** Public Hub/Lab origins configured on the Host. */
export interface VecleapHubEndpoints {
  readonly hubBaseURL: string
  readonly labBaseURL: string
  readonly llmBaseURL: string
}

/** Outcome of a password login attempt. */
export type VecleapHubLoginResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly message: string }

/** Workspace row from Hub `GET /api/workspaces`. */
export interface HubWorkspace {
  readonly id: number
  readonly name: string
  readonly type: 'annotation' | 'ingest'
  readonly owner_id: number
  readonly description: string
  readonly status: number
  readonly created_at: string
  readonly updated_at: string
  readonly my_role: 'member' | 'manager' | 'owner'
}

/** Dataset summary from Lab `GET .../datasets`. */
export interface HubDataset {
  readonly id: number
  readonly name: string
  readonly description?: string
}

/** Row from Hub `GET /api/sync/sessions` (shared with Web/Mobile). */
export interface HubChatSessionSummary {
  readonly session_id: string
  readonly title: string
  readonly last_seq: number
  readonly updated_at: number
}

/** Simplified transcript row for settings preview. */
export interface HubChatMessage {
  readonly role: 'user' | 'assistant'
  readonly content: string
  readonly created_at: number
  readonly model?: string
}
