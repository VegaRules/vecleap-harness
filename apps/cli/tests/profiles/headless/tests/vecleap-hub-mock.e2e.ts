/**
 * Shipped headless profile with vecleap-product overlay against loopback Hub + LLM mocks.
 */
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import { execa } from 'execa'
import { resolveExampleLaunch } from '@deepseek-ai/dsh-loader-smoke'
import {
  startVecleapHubMock,
  VECLEAP_MOCK_ACCESS,
  type VecleapHubMock,
} from '@deepseek-ai/dsh-vecleap-auth-stub/tests/hub-mock-server'

const repoRoot = fileURLToPath(new URL('../../../../../..', import.meta.url))
const vecleapPatch = join(repoRoot, 'packages/bundle/vecleap-product/cordis.patch.yml')
const launch = resolveExampleLaunch({
  srcBin: fileURLToPath(new URL('../../../../src/bin.ts', import.meta.url)),
  mode: 'lib',
})

let mock: VecleapHubMock | undefined
let home: string | undefined

afterEach(async () => {
  await mock?.close()
  mock = undefined
  if (home !== undefined) rmSync(home, { recursive: true, force: true })
  home = undefined
})

describe('headless profile + vecleap-product patch with Hub mock LLM', () => {
  it('completes one turn through VECLEAP_API_KEY and OpenAI-compatible gateway', async () => {
    mock = await startVecleapHubMock({ llmReply: 'vecleap headless mock ok' })
    home = mkdtempSync(join(tmpdir(), 'vecleap-headless-profile-'))
    writeFileSync(join(home, '.env'), `VECLEAP_HUB_URL=${mock.hubOrigin}\nVECLEAP_LAB_URL=${mock.labOrigin}\n`)
    const result = await execa(launch.command, [
      ...launch.args,
      '--profile', 'headless',
      '--patch', vecleapPatch,
      'Reply with the mock line only.',
    ], {
      cwd: repoRoot,
      env: {
        ...launch.env,
        DSH_HOME: home,
        DSH_TELEMETRY_DISABLED: '1',
        VECLEAP_HUB_URL: mock.hubOrigin,
        VECLEAP_LAB_URL: mock.labOrigin,
        VECLEAP_API_KEY: VECLEAP_MOCK_ACCESS,
        VECLEAP_API_BASE_URL: `${mock.hubOrigin}/api/llm/v1`,
      },
      timeout: 120_000,
      reject: false,
    })
    expect(result.exitCode, result.stderr).toBe(0)
    expect(result.stdout.trim()).toBe('vecleap headless mock ok')
    expect(mock.llmPaths.length).toBeGreaterThan(0)
  }, 130_000)
})
