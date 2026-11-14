/**
 * Loopback Hub + Lab fixture for VecLeap integration tests.
 * Implements auth, workspaces, datasets, and OpenAI-compatible LLM streaming.
 */
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import type { HubAuthTokens, HubDataset, HubUser, HubWorkspace } from '../src/hub-types.ts'

/** Scripted chat-completions SSE chunks (OpenAI delta shape). */
export const OPENAI_TEXT_EVENTS = [
  '{"choices":[{"delta":{"role":"assistant","content":""},"index":0,"finish_reason":null}]}',
  '{"choices":[{"delta":{"content":"hello"},"index":0,"finish_reason":null}]}',
  '{"choices":[{"delta":{},"index":0,"finish_reason":"stop"}],"usage":{"prompt_tokens":3,"completion_tokens":1}}',
  '[DONE]',
]

export const VECLEAP_MOCK_EMAIL = 'e2e@vecleap.test'
export const VECLEAP_MOCK_PASSWORD = 'vecleap-hub-mock'
export const VECLEAP_MOCK_ACCESS = 'vecleap-mock-access-token'
export const VECLEAP_MOCK_REFRESH = 'vecleap-mock-refresh-token'

const MOCK_USER: HubUser = {
  id: 42,
  email: VECLEAP_MOCK_EMAIL,
  nickname: 'Vecleap E2E',
  avatar_url: '',
  role: 'user',
}

const MOCK_WORKSPACES: HubWorkspace[] = [{
  id: 7,
  name: 'delivery-e2e',
  type: 'annotation',
  owner_id: 42,
  description: 'mock workspace',
  status: 1,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  my_role: 'owner',
}]

const MOCK_DATASETS: HubDataset[] = [{
  id: 3,
  name: 'routes-demo',
  description: 'mock dataset',
}]

function json(response: import('node:http').ServerResponse, status: number, value: unknown): void {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8' })
  response.end(JSON.stringify(value))
}

function tokens(expiresAt: number): HubAuthTokens {
  return {
    access_token: VECLEAP_MOCK_ACCESS,
    refresh_token: VECLEAP_MOCK_REFRESH,
    expires_at: expiresAt,
    token_type: 'Bearer',
  }
}

function readBody(request: import('node:http').IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    request.on('data', (chunk: Buffer) => { chunks.push(chunk) })
    request.on('end', () => { resolve(Buffer.concat(chunks).toString('utf8')) })
    request.on('error', reject)
  })
}

function bearerAuthorized(request: import('node:http').IncomingMessage): boolean {
  const header = request.headers.authorization
  return header === `Bearer ${VECLEAP_MOCK_ACCESS}`
}

export interface VecleapHubMockOptions {
  /** Assistant text streamed from `/api/llm/v1/chat/completions` (default `hello`). */
  readonly llmReply?: string
  /** `expires_at` for login responses (unix seconds). */
  readonly accessExpiresAt?: number
}

export interface VecleapHubMock {
  readonly hubOrigin: string
  readonly labOrigin: string
  readonly llmPaths: string[]
  readonly llmBodies: unknown[]
  readonly loginAttempts: number
  readonly refreshAttempts: number
  close(): Promise<void>
}

/**
 * Bind Hub (8900-style) and Lab (8901-style) on loopback with shared session state.
 * @param options - optional LLM text and token expiry.
 */
export async function startVecleapHubMock(options: VecleapHubMockOptions = {}): Promise<VecleapHubMock> {
  const llmReply = options.llmReply ?? 'hello'
  const expiresAt = options.accessExpiresAt ?? Math.floor(Date.now() / 1000) + 3600
  const llmPaths: string[] = []
  const llmBodies: unknown[] = []
  let loginAttempts = 0
  let refreshAttempts = 0
  const servers: Server[] = []

  const llmEvents = [
    '{"choices":[{"delta":{"role":"assistant","content":""},"index":0,"finish_reason":null}]}',
    `{"choices":[{"delta":{"content":${JSON.stringify(llmReply)}},"index":0,"finish_reason":null}]}`,
    '{"choices":[{"delta":{},"index":0,"finish_reason":"stop"}],"usage":{"prompt_tokens":3,"completion_tokens":1}}',
    '[DONE]',
  ]

  const hub = createServer(async (request, response) => {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1')
    const path = url.pathname
    if (request.method === 'POST' && path === '/api/auth/login') {
      loginAttempts += 1
      const raw = await readBody(request)
      const body = raw === '' ? {} : JSON.parse(raw) as { email?: string; password?: string }
      if (body.email !== VECLEAP_MOCK_EMAIL || body.password !== VECLEAP_MOCK_PASSWORD) {
        json(response, 401, { error: 'invalid credentials' })
        return
      }
      json(response, 200, { tokens: tokens(expiresAt), user: MOCK_USER })
      return
    }
    if (request.method === 'POST' && path === '/api/auth/logout') {
      json(response, 200, { ok: true })
      return
    }
    if (request.method === 'POST' && path === '/api/auth/refresh') {
      refreshAttempts += 1
      const raw = await readBody(request)
      const body = raw === '' ? {} : JSON.parse(raw) as { refresh_token?: string }
      if (body.refresh_token !== VECLEAP_MOCK_REFRESH) {
        json(response, 401, { error: 'invalid refresh token' })
        return
      }
      json(response, 200, { tokens: tokens(expiresAt + 3600), user: MOCK_USER })
      return
    }
    if (request.method === 'GET' && path === '/api/auth/profile') {
      if (!bearerAuthorized(request)) {
        json(response, 401, { error: 'unauthorized' })
        return
      }
      json(response, 200, { user: MOCK_USER })
      return
    }
    if (request.method === 'GET' && path === '/api/workspaces') {
      if (!bearerAuthorized(request)) {
        json(response, 401, { error: 'unauthorized' })
        return
      }
      json(response, 200, { workspaces: MOCK_WORKSPACES })
      return
    }
    if (request.method === 'POST' && path === '/api/llm/v1/chat/completions') {
      if (!bearerAuthorized(request)) {
        json(response, 401, { error: 'unauthorized' })
        return
      }
      llmPaths.push(path)
      const raw = await readBody(request)
      llmBodies.push(raw === '' ? undefined : JSON.parse(raw))
      response.writeHead(200, { 'content-type': 'text/event-stream' })
      for (const event of llmEvents) response.write(`data: ${event}\n\n`)
      response.end()
      return
    }
    json(response, 404, { error: 'not found' })
  })

  const lab = createServer(async (request, response) => {
    const match = (request.url ?? '').match(/^\/api\/workspaces\/(\d+)\/datasets$/u)
    if (request.method === 'GET' && match !== null) {
      if (!bearerAuthorized(request)) {
        json(response, 401, { error: 'unauthorized' })
        return
      }
      const workspaceId = Number(match[1])
      if (workspaceId !== MOCK_WORKSPACES[0]!.id) {
        json(response, 404, { error: 'workspace missing' })
        return
      }
      json(response, 200, { datasets: MOCK_DATASETS })
      return
    }
    json(response, 404, { error: 'not found' })
  })

  for (const server of [hub, lab]) {
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject)
      server.listen(0, '127.0.0.1', () => { resolve() })
    })
    servers.push(server)
  }

  const hubPort = (hub.address() as AddressInfo).port
  const labPort = (lab.address() as AddressInfo).port
  return {
    hubOrigin: `http://127.0.0.1:${hubPort}`,
    labOrigin: `http://127.0.0.1:${labPort}`,
    llmPaths,
    llmBodies,
    get loginAttempts() { return loginAttempts },
    get refreshAttempts() { return refreshAttempts },
    close: async () => {
      await Promise.all(servers.map(server => new Promise<void>((resolve, reject) => {
        server.close((error) => { if (error) reject(error); else resolve() })
      })))
    },
  }
}
