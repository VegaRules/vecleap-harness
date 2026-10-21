// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { Welcome } from '../src/client/WelcomePage.tsx'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { resolveDesktopLocale } from '../src/locale.ts'
import type { WelcomeSaveResult } from '../src/welcome-api.ts'

const html = readFileSync(join(import.meta.dirname, '../renderer/welcome.html'), 'utf8')
afterEach(cleanup)

function mount(language = 'zh-CN') {
  cleanup()
  const api = {
    takeNotice: vi.fn(async () => undefined),
    analytics: vi.fn(async (_event: string, _attributes: object) => {}),
    analyticsEnabled: async () => true,
    onAccountState: vi.fn(() => () => {}),
    startSignIn: vi.fn(),
    cancelSignIn: vi.fn(),
    copySignInLink: vi.fn(),
    ...resolveDesktopLocale(language),
    loginWithHub: vi.fn<(email: string, password: string) => Promise<WelcomeSaveResult>>().mockResolvedValue({ ok: true }),
    saveApiKey: vi.fn<(value: string) => Promise<WelcomeSaveResult>>().mockResolvedValue({ ok: true }),
    skip: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
  }
  render(<Welcome api={api} />)
  const switchToApiKey = () => { fireEvent.click(document.querySelector('#hub-api-key')!) }
  const input = () => document.querySelector('#key-input') as HTMLInputElement
  const hubEmail = () => document.querySelector('#hub-email') as HTMLInputElement
  const button = (id: string) => document.querySelector<HTMLButtonElement>(id)!
  const enterKey = (value: string) => {
    fireEvent.change(input(), { target: { value } })
  }
  const submit = () => fireEvent.submit(document.querySelector('form')!)
  const copy = () => {
    const heading = document.querySelector('main')!.getAttribute('aria-labelledby')!
    const keyInput = input()
    return [
      document.title, document.querySelector('img')!.alt, document.getElementById('welcome-heading')!.textContent,
      document.querySelector('#welcome-description')!.textContent,
      document.getElementById(heading)!.textContent,
      document.querySelector('#key-description')!.textContent, `${keyInput.placeholder} [password]`,
      ...[...document.querySelectorAll('button')].filter(item => item.closest('[hidden]') === null)
        .map(item => `${item.textContent || item.getAttribute('aria-label')}${item.disabled ? ' [disabled]' : ''}`),
      '',
    ].join('\n')
  }
  return { document, api, input, hubEmail, button, enterKey, submit, copy, switchToApiKey }
}

describe('desktop welcome presentation', () => {
  it.each(['zh-CN', 'en'])('renders the %s API-key onboarding step', async (language) => {
    const view = mount(language)
    expect(view.document.documentElement.lang).toBe(language)
    expect(view.document.querySelector('img')!.getAttribute('src')).toBe('assets/welcome-brand.png')
    view.switchToApiKey()
    expect(view.input().type).toBe('password')
    await expect(view.copy()).toMatchFileSnapshot(`./expected/welcome/${language}-api-key.expected.txt`)
  })

  it('sends one trimmed key, prevents competing actions, and clears it after saving', async () => {
    const view = mount()
    view.switchToApiKey()
    const saved = Promise.withResolvers<WelcomeSaveResult>()
    view.api.saveApiKey.mockReturnValue(saved.promise)
    view.enterKey('  sk-desktop-example  ')
    view.submit()
    view.submit()
    fireEvent.click(view.button('#skip-key'))
    expect(view.api.saveApiKey).toHaveBeenCalledExactlyOnceWith('sk-desktop-example')
    expect(view.api.skip).not.toHaveBeenCalled()
    expect(view.button('#save-key').disabled).toBe(true)
    saved.resolve({ ok: true })
    await vi.waitFor(() => { expect(view.input().value).toBe('') })
    expect(view.document.body.textContent).not.toContain('sk-desktop-example')
  })

  it.each(['', 'bad key', '密钥', 'VECLEAP_API_KEY=sk-example', '"sk-example"', '`sk-example`'])(
    'rejects invalid input before sending it: %s', (value) => {
      const view = mount()
      view.switchToApiKey()
      view.enterKey(value)
      view.submit()
      expect(view.api.saveApiKey).not.toHaveBeenCalled()
      expect(view.document.querySelector<HTMLElement>('#key-error')!.hidden).toBe(false)
      expect(view.input().getAttribute('aria-invalid')).toBe('true')
    },
  )

  it('retains an unsaved draft and allows retry after a refused save', async () => {
    const view = mount()
    view.switchToApiKey()
    view.api.saveApiKey.mockResolvedValue({ ok: false })
    view.enterKey('sk-retry')
    view.submit()
    await vi.waitFor(() => { expect(view.button('#save-key').disabled).toBe(false) })
    expect(view.input().value).toBe('sk-retry')
    expect(view.document.querySelector('#key-error')!.textContent).toBe(view.api.messages.welcomeKeyFailed)
    view.api.saveApiKey.mockResolvedValue({ ok: true })
    view.submit()
    await vi.waitFor(() => { expect(view.input().value).toBe('') })
  })

  it('skips without saving and clears the draft', async () => {
    const view = mount()
    view.switchToApiKey()
    const skipped = Promise.withResolvers<undefined>()
    view.api.skip.mockReturnValue(skipped.promise)
    view.enterKey('sk-not-saved')
    fireEvent.click(view.button('#skip-key'))
    expect(view.button('#save-key').disabled).toBe(true)
    expect(view.button('#skip-key').disabled).toBe(true)
    skipped.resolve(undefined)
    await vi.waitFor(() => { expect(view.input().value).toBe('') })
    expect(view.api.skip).toHaveBeenCalledOnce()
    expect(view.api.saveApiKey).not.toHaveBeenCalled()
  })

  it('keeps visible copy in the shell dictionaries and denies network access', () => {
    expect([...html.matchAll(/>([^<]*\p{L}[^<]*)</gu)]).toEqual([])
    expect(html).toContain("default-src 'none'")
    expect(html).toContain("form-action 'none'")
  })
})
