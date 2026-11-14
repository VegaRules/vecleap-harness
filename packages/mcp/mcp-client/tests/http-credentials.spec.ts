import { describe, expect, it, vi } from 'vitest'
import { createCredentialFetch } from '../src/http-credentials.ts'

describe('dynamic MCP credentials', () => {
  it('refreshes once after 401 and preserves the logical write body', async () => {
    const requests: Request[] = []
    const send = vi.fn(async (req: Request) => {
      requests.push(req)
      return new Response('{}', { status: requests.length === 1 ? 401 : 200 })
    })
    const resolve = vi.fn(async (_signal: AbortSignal, force: boolean) => ({ Authorization: force ? 'Bearer fresh' : 'Bearer first' }))
    const wrapped = createCredentialFetch('https://hub.example/mcp/track', resolve, send as typeof fetch)
    const body = JSON.stringify({ operationId: 'same-operation' })
    expect((await wrapped('https://hub.example/mcp/track', { method: 'POST', body })).status).toBe(200)
    expect(requests.map(r => r.headers.get('Authorization'))).toEqual(['Bearer first', 'Bearer fresh'])
    expect(await requests[0]?.text()).toBe(body)
    expect(await requests[1]?.text()).toBe(body)
    expect(requests.every(r => r.redirect === 'error')).toBe(true)
    expect(resolve.mock.calls.map(call => call[1])).toEqual([false, true])
  })
  it('does not refresh forbidden requests or leak credentials to another destination', async () => {
    const resolve = vi.fn(async () => ({ Authorization: 'Bearer private' }))
    const send = vi.fn(async () => new Response('{}', { status: 403 }))
    const wrapped = createCredentialFetch('https://hub.example/mcp/track', resolve, send)
    expect((await wrapped('https://hub.example/mcp/track')).status).toBe(403)
    expect(send).toHaveBeenCalledTimes(1)
    await expect(wrapped('https://other.example/mcp/track')).rejects.toThrow('destination mismatch')
    expect(resolve).toHaveBeenCalledTimes(1)
  })
  it('does not send a late credential after cancellation', async () => {
    const controller = new AbortController()
    const resolve = vi.fn(async () => { controller.abort(); return { Authorization: 'Bearer private' } })
    const send = vi.fn()
    const wrapped = createCredentialFetch('https://hub.example/mcp/track', resolve, send)
    await expect(wrapped('https://hub.example/mcp/track', { signal: controller.signal })).rejects.toThrow()
    expect(send).not.toHaveBeenCalled()
  })
})
