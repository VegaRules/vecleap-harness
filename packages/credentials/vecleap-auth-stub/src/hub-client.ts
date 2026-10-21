/** Host-side fetch helpers for VecLeap Hub and Lab. */
import type { HubAuthTokens, HubDataset, HubStoredSession, HubUser, HubWorkspace } from './hub-types.ts'

/** Trim trailing slashes from a base URL. */
export function normalizeBaseURL(base: string): string {
  return base.replace(/\/+$/, '')
}

/** OpenAI-compatible LLM gateway base URL for a Hub origin. */
export function hubLlmBaseURL(hubBaseURL: string): string {
  return `${normalizeBaseURL(hubBaseURL)}/api/llm/v1`
}

/** Whether `requestUrl` targets the Hub LLM gateway for `hubBaseURL`. */
export function urlUsesHubLlm(hubBaseURL: string, requestUrl: string): boolean {
  try {
    const target = new URL(requestUrl)
    const llm = new URL(hubLlmBaseURL(hubBaseURL))
    return target.origin === llm.origin && target.pathname.startsWith(llm.pathname)
  } catch {
    return false
  }
}

interface HubErrorBody {
  readonly error?: string | { readonly message?: string }
}

/** Extract a short error message from Hub JSON error bodies. */
export function readHubErrorMessage(body: HubErrorBody, fallback: string): string {
  const err = body.error
  if (typeof err === 'string' && err.length > 0) return err
  if (typeof err === 'object' && err !== null && typeof err.message === 'string' && err.message.length > 0) {
    return err.message
  }
  return fallback
}

/**
 * @param baseURL - Hub or Lab origin without a trailing slash.
 * @param path - absolute path beginning with `/`.
 * @param init - fetch init; JSON body sets `Content-Type` when omitted.
 * @param timeoutMs - abort deadline.
 */
export async function hubFetch(
  baseURL: string,
  path: string,
  init: RequestInit & { readonly json?: unknown } = {},
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => { controller.abort() }, timeoutMs)
  const headers = new Headers(init.headers)
  if (init.json !== undefined && !headers.has('content-type')) {
    headers.set('content-type', 'application/json')
  }
  const { json, ...rest } = init
  const body = json === undefined ? (rest.body ?? null) : JSON.stringify(json)
  try {
    return await fetch(`${normalizeBaseURL(baseURL)}${path}`, {
      ...rest,
      headers,
      body,
      signal: rest.signal ?? controller.signal,
    })
  } finally {
    clearTimeout(timer)
  }
}

/**
 * @param hubBaseURL - Hub origin.
 * @param email - account email.
 * @param password - account password.
 * @param timeoutMs - request deadline.
 */
export async function hubLoginWithPassword(
  hubBaseURL: string,
  email: string,
  password: string,
  timeoutMs: number,
): Promise<{ readonly tokens: HubAuthTokens; readonly user: HubUser }> {
  const response = await hubFetch(hubBaseURL, '/api/auth/login', { method: 'POST', json: { email, password } }, timeoutMs)
  const body: unknown = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(readHubErrorMessage(body as HubErrorBody, `login failed (${response.status})`))
  }
  if (typeof body !== 'object' || body === null || !('tokens' in body) || !('user' in body)) {
    throw new Error('login response invalid')
  }
  const record = body as { tokens: HubAuthTokens; user: HubUser }
  if (typeof record.tokens?.access_token !== 'string' || typeof record.tokens.refresh_token !== 'string') {
    throw new Error('login response missing tokens')
  }
  return { tokens: record.tokens, user: record.user }
}

/**
 * @param hubBaseURL - Hub origin stored with the session.
 * @param refreshToken - current opaque refresh token.
 * @param timeoutMs - request deadline.
 */
export async function hubRefresh(
  hubBaseURL: string,
  refreshToken: string,
  timeoutMs: number,
): Promise<{ readonly tokens: HubAuthTokens; readonly user: HubUser }> {
  const response = await hubFetch(
    hubBaseURL,
    '/api/auth/refresh',
    { method: 'POST', json: { refresh_token: refreshToken } },
    timeoutMs,
  )
  const body: unknown = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(readHubErrorMessage(body as HubErrorBody, `refresh failed (${response.status})`))
  }
  if (typeof body !== 'object' || body === null || !('tokens' in body) || !('user' in body)) {
    throw new Error('refresh response invalid')
  }
  const record = body as { tokens: HubAuthTokens; user: HubUser }
  return { tokens: record.tokens, user: record.user }
}

/**
 * @param session - stored Hub session.
 * @param timeoutMs - request deadline.
 */
export async function hubFetchProfile(
  session: HubStoredSession,
  timeoutMs: number,
): Promise<HubUser> {
  const response = await hubFetch(
    session.hubBaseURL,
    '/api/auth/profile',
    {
      method: 'GET',
      headers: { authorization: `Bearer ${session.tokens.access_token}` },
    },
    timeoutMs,
  )
  const body: unknown = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(readHubErrorMessage(body as HubErrorBody, `profile failed (${response.status})`))
  }
  if (typeof body !== 'object' || body === null || !('user' in body)) throw new Error('profile response invalid')
  return (body as { user: HubUser }).user
}

/**
 * @param session - stored Hub session with a valid access token.
 * @param timeoutMs - request deadline.
 */
export async function hubListWorkspaces(session: HubStoredSession, timeoutMs: number): Promise<HubWorkspace[]> {
  const response = await hubFetch(
    session.hubBaseURL,
    '/api/workspaces',
    {
      method: 'GET',
      headers: { authorization: `Bearer ${session.tokens.access_token}` },
    },
    timeoutMs,
  )
  const body: unknown = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(readHubErrorMessage(body as HubErrorBody, `workspaces failed (${response.status})`))
  }
  if (typeof body !== 'object' || body === null || !Array.isArray((body as { workspaces?: unknown }).workspaces)) {
    throw new Error('workspaces response invalid')
  }
  return (body as { workspaces: HubWorkspace[] }).workspaces
}

/**
 * @param session - stored Hub session.
 * @param labBaseURL - Lab origin.
 * @param workspaceId - workspace id.
 * @param timeoutMs - request deadline.
 */
export async function labListDatasets(
  session: HubStoredSession,
  labBaseURL: string,
  workspaceId: number,
  timeoutMs: number,
): Promise<HubDataset[]> {
  const response = await hubFetch(
    labBaseURL,
    `/api/workspaces/${workspaceId}/datasets`,
    {
      method: 'GET',
      headers: { authorization: `Bearer ${session.tokens.access_token}` },
    },
    timeoutMs,
  )
  const body: unknown = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(readHubErrorMessage(body as HubErrorBody, `datasets failed (${response.status})`))
  }
  const datasets = (body as { datasets?: HubDataset[] }).datasets
  if (!Array.isArray(datasets)) throw new Error('datasets response invalid')
  return datasets
}
