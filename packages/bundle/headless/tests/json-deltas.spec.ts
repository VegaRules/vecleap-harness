import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { describe, expect, it } from 'vitest'
import { projectJsonRun } from '../src/json-stream.ts'

type StreamListener = (payload: { agent: unknown; frame: Record<string, unknown> }) => void

function deltaHarness(deltas: boolean) {
  const lines: string[] = []
  const streams = new Set<StreamListener>()
  const ctx = {
    on(name: string, handler: unknown) {
      if (name === 'agent/assistant-stream') streams.add(handler as StreamListener)
      return () => { streams.delete(handler as StreamListener) }
    },
  } as unknown as Context
  const agent = { id: 'session-1', session: {} } as unknown as Agent
  const projection = projectJsonRun(ctx, agent, { write: (line: string) => { lines.push(line); return true } }, { cwd: '/', deltas })
  const emit = (subject: unknown, frame: Record<string, unknown>) => { for (const listener of streams) listener({ agent: subject, frame }) }
  return {
    lines,
    projection,
    agent,
    emit,
    parsed: () => lines.map(line => JSON.parse(line) as Record<string, unknown>),
    listeners: () => streams.size,
  }
}

describe('--json deltas', () => {
  it('streams reasoning and reply fragments of its own agent with their turn and step', () => {
    const test = deltaHarness(true)
    test.emit(test.agent, { type: 'start', turn: 2, step: 3 })
    test.emit(test.agent, { type: 'chunk', chunk: { type: 'reasoning-delta', text: 'think' } })
    test.emit(test.agent, { type: 'chunk', chunk: { type: 'text-delta', text: '答' } })
    test.emit(test.agent, { type: 'chunk', chunk: { type: 'text-delta', text: '' } })
    test.emit(test.agent, { type: 'chunk', chunk: { type: 'usage', usage: {} } })
    test.emit({ id: 'other' }, { type: 'chunk', chunk: { type: 'text-delta', text: 'not mine' } })
    expect(test.parsed().slice(1)).toEqual([
      { type: 'delta', kind: 'reasoning', turn: 2, step: 3, text: 'think' },
      { type: 'delta', kind: 'text', turn: 2, step: 3, text: '答' },
    ])
    test.projection.dispose()
    expect(test.listeners()).toBe(0)
  })

  it('emits no deltas unless asked', () => {
    const test = deltaHarness(false)
    test.emit(test.agent, { type: 'chunk', chunk: { type: 'text-delta', text: 'x' } })
    expect(test.parsed()).toEqual([{ type: 'session', sessionId: 'session-1', cwd: '/' }])
  })
})
