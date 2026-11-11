/** Host-only per-request MCP credentials. No credential enters tool arguments. */

/** Resolve request headers; forceRefresh is true only after one HTTP 401. */
export type RequestCredentials = (signal: AbortSignal, forceRefresh: boolean) => Promise<Readonly<Record<string, string>>>

/**
 * Bind dynamic credentials to one exact MCP endpoint, refusing redirects.
 * @param endpoint - the configured server URL.
 * @param resolve - owning Host session's credential callback.
 * @param request - HTTP implementation; defaults to the Host fetch.
 * @returns a fetch that retries authentication once, preserving the request body.
 */
export function createCredentialFetch(
  endpoint: string, resolve: RequestCredentials, request: typeof fetch = globalThis.fetch,
): typeof fetch {
  const expected = new URL(endpoint).href
  return async (input, init) => {
    const original = new Request(input, init)
    if (original.url !== expected) throw new Error('MCP credential destination mismatch')
    for (let attempt = 0; attempt < 2; attempt++) {
      original.signal.throwIfAborted()
      const headers = new Headers(original.headers)
      const credential = await resolve(original.signal, attempt > 0)
      original.signal.throwIfAborted()
      for (const [name, value] of Object.entries(credential)) headers.set(name, value)
      const response = await request(new Request(original.clone(), { headers, redirect: 'error' }))
      if (response.status !== 401 || attempt === 1) return response
      await response.body?.cancel()
    }
    throw new Error('MCP authentication failed')
  }
}
