/** Desktop welcome: VecLeap Hub sign-in or manual API key. */
import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import type { WelcomeApi } from '../welcome-api.ts'

type WelcomeMode = 'hub' | 'apiKey'

/**
 * Render the standalone welcome flow using shell-owned operations and localized copy.
 * @param props.api - isolated preload API; no account credentials reach the renderer.
 * @returns welcome form with fixed bottom actions.
 */
export function Welcome({ api }: { api: WelcomeApi }) {
  const { messages: m } = api
  const [mode, setMode] = useState<WelcomeMode>('hub')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)
  const mounted = useRef(true)
  const hubEmailInput = useRef<HTMLInputElement>(null)
  const keyInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    mounted.current = true
    document.documentElement.lang = api.id
    document.title = m.welcomeTitle
    if (mode === 'hub') hubEmailInput.current?.focus()
    else keyInput.current?.focus()
    return () => { mounted.current = false }
  }, [api, m.welcomeTitle, mode])

  async function submitHub(event: FormEvent) {
    event.preventDefault()
    if (busyRef.current) return
    const trimmedEmail = email.trim()
    if (trimmedEmail === '' || password === '') {
      setError(m.welcomeHubEmailBlank)
      hubEmailInput.current?.focus()
      return
    }
    busyRef.current = true
    setBusy(true)
    setError('')
    try {
      const result = await api.loginWithHub(trimmedEmail, password)
      if (!mounted.current) return
      if (!result.ok) setError(m.welcomeHubFailed)
    } catch {
      if (mounted.current) setError(m.welcomeHubFailed)
    } finally {
      busyRef.current = false
      if (mounted.current) setBusy(false)
    }
  }

  async function saveKey(event: FormEvent) {
    event.preventDefault()
    if (busyRef.current) return
    void api.analytics?.('api_key_save_click', {})
    const value = draft.trim()
    if (!/^[\x21-\x7e]+$/.test(value) || /^[A-Z][A-Z0-9_]*=[^=]/.test(value)
      || ((value.startsWith('"') || value.startsWith("'") || value.charCodeAt(0) === 96) && value.at(-1) === value[0])) {
      setError(value === '' ? m.welcomeKeyBlank : m.welcomeKeyInvalid)
      keyInput.current?.focus()
      return
    }
    busyRef.current = true
    setBusy(true)
    setError('')
    try {
      const result = await api.saveApiKey(value)
      if (!mounted.current) return
      if (result.ok) setDraft('')
      else setError(m.welcomeKeyFailed)
    } catch {
      if (mounted.current) setError(m.welcomeKeyFailed)
    } finally {
      busyRef.current = false
      if (mounted.current) setBusy(false)
    }
  }

  async function skip() {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(true)
    try {
      await api.skip()
      if (mounted.current) {
        setDraft('')
        setEmail('')
        setPassword('')
      }
    } catch {
      if (mounted.current) setError(m.welcomeContinueFailed)
    } finally {
      busyRef.current = false
      if (mounted.current) setBusy(false)
    }
  }

  function switchMode(next: WelcomeMode) {
    setMode(next)
    setError('')
  }

  const hubForm = <>
    <form id="hub-form" className="key-form" noValidate onSubmit={(event) => { void submitHub(event) }} aria-busy={busy}>
      <header className="key-heading">
        <h1 id="hub-title">{m.welcomeHubTitle}</h1>
        <p id="hub-description">{m.welcomeHubDescription}</p>
      </header>
      <div className="key-field">
        <label className="visually-hidden" htmlFor="hub-email">{m.welcomeHubEmail}</label>
        <input ref={hubEmailInput} id="hub-email" type="email" autoComplete="username" spellCheck={false} required
          aria-describedby="hub-description hub-error" placeholder={m.welcomeHubEmail}
          value={email} disabled={busy} onChange={(event) => { setEmail(event.target.value); setError('') }} />
      </div>
      <div className="key-field">
        <label className="visually-hidden" htmlFor="hub-password">{m.welcomeHubPassword}</label>
        <input id="hub-password" type="password" autoComplete="current-password" spellCheck={false} required
          aria-describedby="hub-error" placeholder={m.welcomeHubPassword}
          value={password} disabled={busy} onChange={(event) => { setPassword(event.target.value); setError('') }} />
        <p id="hub-error" className="key-error" role="alert" hidden={error === ''}>{error}</p>
      </div>
    </form>
    <div id="hub-actions" className="actions">
      <button id="hub-submit" className="primary" type="submit" form="hub-form"
        disabled={busy || email.trim() === '' || password === ''}>{m.welcomeHubSubmit}</button>
      <button id="hub-api-key" className="secondary" type="button" disabled={busy}
        onClick={() => { switchMode('apiKey') }}>{m.welcomeApiKey}</button>
      <button id="skip-hub" className="secondary" type="button" disabled={busy} onClick={() => { void skip() }}>{m.welcomeKeyLater}</button>
    </div>
  </>

  const keyForm = <>
    <form id="key-form" className="key-form" noValidate onSubmit={(event) => { void saveKey(event) }} aria-busy={busy}>
      <header className="key-heading"><h1 id="key-title">{m.welcomeKeyTitle}</h1><p id="key-description">{m.welcomeKeyDescription}</p></header>
      <div className="key-field">
        <label className="visually-hidden" htmlFor="key-input">{m.welcomeKeyPlaceholder}</label>
        <input ref={keyInput} id="key-input" type="password" autoComplete="new-password" autoCapitalize="off" spellCheck={false} required
          aria-describedby="key-description key-error" aria-invalid={error !== ''} placeholder={m.welcomeKeyPlaceholder}
          value={draft} disabled={busy} onChange={(event) => { setDraft(event.target.value); setError('') }} />
        <p id="key-error" className="key-error" role="alert" hidden={error === ''}>{error}</p>
      </div>
    </form>
    <div id="key-actions" className="actions">
      <button id="save-key" className="primary" type="submit" form="key-form" disabled={busy || draft.trim() === ''}>{m.welcomeKeySave}</button>
      <button id="back-sign-in" className="secondary" type="button" disabled={busy}
        onClick={() => { switchMode('hub') }}>{m.welcomeKeyBack}</button>
      <button id="skip-key" className="secondary" type="button" disabled={busy} onClick={() => { void skip() }}>{m.welcomeKeyLater}</button>
    </div>
  </>

  return <>
    <div className="titlebar" aria-hidden="true" />
    <main className="welcome" aria-labelledby={mode === 'hub' ? 'hub-title' : 'key-title'}>
      <img className="brand" src="assets/welcome-brand.png" alt={m.welcomeBrand} width="472" height="40" />
      <div id="tagline" className="tagline">
        <h1 id="welcome-heading"><span>{m.welcomeTaglineBefore}</span><em>{m.welcomeTaglineBrand}</em><span>{m.welcomeTaglineAfter}</span></h1>
        <p id="welcome-description">{m.welcomeDescription}</p>
      </div>
      {mode === 'hub' ? hubForm : keyForm}
    </main>
  </>
}
