import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import AgentLoop from '@deepseek-ai/dsh-agent-loop'
import { mountAgentLoopTestDependencies } from '@deepseek-ai/dsh-agent-loop-testkit'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import * as LlmPiAi from '@deepseek-ai/dsh-llm-pi-ai'
import { LocalCredentialProvider } from '@deepseek-ai/dsh-credentials-local'
import { SessionId } from '@deepseek-ai/dsh-session'
import VecleapHubAccount from '../src/hub-account.ts'
import { hubLlmBaseURL } from '../src/hub-client.ts'
import {
  startVecleapHubMock,
  VECLEAP_MOCK_EMAIL,
  VECLEAP_MOCK_PASSWORD,
  type VecleapHubMock,
} from './hub-mock-server.ts'

let home: string | undefined
let workdir: string | undefined
let ctx: Context | undefined
let mock: VecleapHubMock | undefined

afterEach(async () => {
  await ctx?.fiber.dispose()
  await mock?.close()
  if (workdir !== undefined) await rm(workdir, { recursive: true, force: true })
  if (home !== undefined) await rm(home, { recursive: true, force: true })
  ctx = undefined
  mock = undefined
  home = undefined
  workdir = undefined
})

function waitForIdle(context: Context, agent: Agent): Promise<void> {
  return new Promise((resolve) => {
    const dispose = context.on('agent/status', ({ agent: subject, status }) => {
      if (subject === agent && status === 'idle') {
        dispose()
        resolve()
      }
    })
  })
}

function finalText(events: ReturnType<typeof agentEvents>): string {
  const assistant = [...events].reverse().find(event => event.type === 'assistant/message')
  if (assistant === undefined || assistant.type !== 'assistant/message') return ''
  return assistant.data.message.content
    .filter(block => block.type === 'text')
    .map(block => block.text)
    .join('')
}

function agentEvents(agent: Awaited<ReturnType<Context['agentLoop']['create']>>) {
  return agent.session.snapshotEvents()
}

describe('Vecleap Hub mock LLM agent loop', () => {
  it('logs into Hub, calls OpenAI-compatible gateway, and completes one turn', async () => {
    const reply = 'VECLEAP MOCK TURN OK'
    home = await mkdtemp(join(tmpdir(), 'vecleap-agent-loop-home-'))
    workdir = await mkdtemp(join(tmpdir(), 'vecleap-agent-loop-cwd-'))
    mock = await startVecleapHubMock({ llmReply: reply })
    ctx = new Context()
    await mountAgentLoopTestDependencies(ctx, { workingDirectory: true })
    await ctx.plugin(LocalCredentialProvider, { path: join(home, 'credentials.yaml'), watch: false })
    await ctx.plugin(VecleapHubAccount, {
      hubBaseURL: mock.hubOrigin,
      labBaseURL: mock.labOrigin,
      apiKeyEnv: 'VECLEAP_API_KEY',
      requestTimeoutMs: 5_000,
    })
    const account = ctx.deepseekAccount as VecleapHubAccount
    const login = await account.loginWithPassword(VECLEAP_MOCK_EMAIL, VECLEAP_MOCK_PASSWORD)
    expect(login).toEqual({ ok: true })
    const llmBase = hubLlmBaseURL(mock.hubOrigin)
    await ctx.plugin(LlmPiAi, {
      providers: {
        openai: {
          apiKeyEnv: 'VECLEAP_API_KEY',
          baseURL: llmBase,
          api: 'openai-completions',
          models: [{ id: 'deepseek-chat', contextWindow: 128_000, maxTokens: 8_000 }],
        },
      },
    })
    await ctx.plugin(AgentLoop, { agents: [] })
    const agent = await ctx.agentLoop.create(SessionId('vecleap-mock-loop'), {
      provider: 'openai',
      model: 'deepseek-chat',
    }, { cwd: workdir })
    agent.followup(createUserMessage({
      content: [{ type: 'text', text: 'Say the mock line.' }],
      source: { kind: 'user' },
    }))
    await waitForIdle(ctx, agent)
    expect(finalText(agentEvents(agent))).toBe(reply)
    expect(mock.llmPaths).toEqual(['/api/llm/v1/chat/completions'])
    expect(mock.llmBodies.length).toBeGreaterThan(0)
  })
})
