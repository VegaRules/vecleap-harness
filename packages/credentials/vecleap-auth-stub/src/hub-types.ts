/** JSON shapes returned by VecLeap Hub and Lab REST APIs. */

/** Hub authentication tokens from login or refresh. */
export interface HubAuthTokens {
  readonly access_token: string
  readonly refresh_token: string
  readonly expires_at: number
  readonly token_type: 'Bearer'
}

/** User object bundled with auth responses. */
export interface HubUser {
  readonly id: number
  readonly email: string
  readonly nickname: string
  readonly avatar_url: string
  readonly role: 'user' | 'superadmin'
}

/** Persisted local session after a successful Hub login. */
export interface HubStoredSession {
  readonly version: 1
  readonly hubBaseURL: string
  readonly tokens: HubAuthTokens
  readonly user: HubUser
}

/** Workspace row from `GET /api/workspaces`. */
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
