/**
 * Browser e2e: vecleap-product bundle, loopback Hub auth + LLM mocks, one composer turn.
 */
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Browser, Page } from 'playwright'
import { chromium } from 'playwright'
import { afterAll, beforeAll, describe, expect, it, onTestFailed } from 'vitest'
import VecleapHubAccount from '@deepseek-ai/dsh-vecleap-auth-stub'
import {
  startVecleapHubMock,
  VECLEAP_MOCK_EMAIL,
  VECLEAP_MOCK_PASSWORD,
  type VecleapHubMock,
} from '@deepseek-ai/dsh-vecleap-auth-stub/tests/hub-mock-server'
import { launchWebScaffold, watchConsole, webSnapshotMode, type WebScaffold } from './scaffold.ts'
import { connectFreshWorkspace, newEnglishPage, saveFailureShot } from './support.ts'

const MOCK_REPLY = 'VECLEAP WEB MOCK OK'
const MODE = webSnapshotMode()

describe.skipIf(MODE === 'record')('web e2e: vecleap-product Hub mock LLM', () => {
  let mock: VecleapHubMock
  let scaffold: WebScaffold
  let browser: Browser
  let page: Page
  let overlayDir: string | undefined
  let tripwire: ReturnType<typeof watchConsole>

  const originalHubUrl = process.env.VECLEAP_HUB_URL
  const originalLabUrl = process.env.VECLEAP_LAB_URL
  const originalApiBase = process.env.VECLEAP_API_BASE_URL

  beforeAll(async () => {
    mock = await startVecleapHubMock({ llmReply: MOCK_REPLY })
    process.env.VECLEAP_HUB_URL = mock.hubOrigin
    process.env.VECLEAP_LAB_URL = mock.labOrigin
    Reflect.deleteProperty(process.env, 'VECLEAP_API_BASE_URL')

    overlayDir = mkdtempSync(join(tmpdir(), 'vecleap-web-e2e-overlay-'))
    const overlayPath = join(overlayDir, 'overlay.yml')
    writeFileSync(overlayPath, [
      '# Browser smoke focuses on Hub credentials + conversation; skip Vecleap client-only rows here.',
      '- id: vecleap-hub-controller',
      '  disabled: true',
      '- id: ui-vecleap-delivery',
      '  disabled: true',
      '',
    ].join('\n'))
    scaffold = await launchWebScaffold({
      deepSeekMissingCredential: true,
      profile: { packages: [], bundles: ['@deepseek-ai/dsh-vecleap-product'] },
      extraOverlayPath: overlayPath,
    })

    const account = scaffold.ctx.deepseekAccount
    if (!('loginWithPassword' in account) || typeof account.loginWithPassword !== 'function') {
      throw new Error('vecleap e2e: VecLeap Hub account provider is not mounted')
    }
    const login = await (account as VecleapHubAccount).loginWithPassword(VECLEAP_MOCK_EMAIL, VECLEAP_MOCK_PASSWORD)
    expect(login).toEqual({ ok: true })
    expect(mock.loginAttempts).toBe(1)

    const workspaces = await (account as VecleapHubAccount).listWorkspaces()
    expect(workspaces.some(row => row.id === 7)).toBe(true)

    const executablePath = process.env.DSH_PLAYWRIGHT_EXECUTABLE_PATH
    browser = await chromium.launch(executablePath === undefined ? {} : { executablePath })
    page = await newEnglishPage(browser)
    tripwire = watchConsole(page)
    await page.goto(scaffold.authenticatedUrl, { waitUntil: 'load' })
    await page.waitForSelector('[class*="frame"]', { timeout: 60_000 })
    await connectFreshWorkspace(page, scaffold.workspaceCwd)
  }, 180_000)

  afterAll(async () => {
    await browser?.close()
    await scaffold?.close()
    await mock?.close()
    if (overlayDir !== undefined) rmSync(overlayDir, { recursive: true, force: true })
    if (originalHubUrl === undefined) Reflect.deleteProperty(process.env, 'VECLEAP_HUB_URL')
    else process.env.VECLEAP_HUB_URL = originalHubUrl
    if (originalLabUrl === undefined) Reflect.deleteProperty(process.env, 'VECLEAP_LAB_URL')
    else process.env.VECLEAP_LAB_URL = originalLabUrl
    if (originalApiBase === undefined) Reflect.deleteProperty(process.env, 'VECLEAP_API_BASE_URL')
    else process.env.VECLEAP_API_BASE_URL = originalApiBase
  })

  it('streams the mocked assistant reply through the Hub OpenAI gateway', async () => {
    onTestFailed(() => {
      if (tripwire.pageErrors.length > 0) {
        throw new AggregateError(tripwire.pageErrors.map(message => new Error(message)), 'browser page errors')
      }
      return saveFailureShot(page, 'web-e2e-vecleap-hub-mock')
    })
    const input = page.locator('[data-composer-input]').first()
    const settled = scaffold.whenTurnSettled(120_000)
    await input.fill('Reply with the mock line only.')
    await input.press('Enter')
    await settled
    await expect.poll(async () => page.getByText(MOCK_REPLY, { exact: true }).count(), { timeout: 30_000 })
      .toBeGreaterThan(0)
    expect(mock.llmPaths).toEqual(['/api/llm/v1/chat/completions'])
    expect(mock.llmBodies.length).toBe(1)
  }, 130_000)
})
