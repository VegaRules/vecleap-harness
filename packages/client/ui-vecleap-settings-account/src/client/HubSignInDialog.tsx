/** VecLeap Hub email/password sign-in (same credentials as Web). */
import { useState, type FormEvent } from 'react'
import { Button, IconCloseOutlineRegular, Modal } from '@deepseek-ai/dsh-client-ui-primitives'
import type { VecleapAccountKey } from './locales.ts'
import css from './AccountPanel.module.css'

export function HubSignInDialog({ open, close, login, t }: {
  open: boolean
  close: () => void
  login: (email: string, password: string) => Promise<void>
  t: (key: VecleapAccountKey) => string
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)

  const dismiss = () => { if (!busy) close() }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    const trimmed = email.trim()
    if (trimmed === '' || password === '') {
      setError(true)
      return
    }
    setBusy(true)
    setError(false)
    try {
      await login(trimmed, password)
      setEmail('')
      setPassword('')
      close()
    } catch {
      setError(true)
    } finally {
      setBusy(false)
    }
  }

  if (!open) return null

  return (
    <Modal open headless title={t('loginTitle')} onClose={dismiss} className={css.dialog as string}>
      <form onSubmit={(event) => { void submit(event) }}>
        <div className={css.content}>
          <div className={css.header}>
            <h2 className={css.title}>{t('loginTitle')}</h2>
            <button type="button" className={css.close} aria-label={t('close')} onClick={dismiss}>
              <IconCloseOutlineRegular size={14} />
            </button>
          </div>
          <p className={css.description}>{t('loginDescription')}</p>
          <div className={css.field}>
            <label htmlFor="vecleap-hub-email">{t('email')}</label>
            <input id="vecleap-hub-email" className={css.input} type="email" autoComplete="username"
              value={email} disabled={busy} onChange={(event) => { setEmail(event.target.value); setError(false) }} />
          </div>
          <div className={css.field}>
            <label htmlFor="vecleap-hub-password">{t('password')}</label>
            <input id="vecleap-hub-password" className={css.input} type="password" autoComplete="current-password"
              value={password} disabled={busy} onChange={(event) => { setPassword(event.target.value); setError(false) }} />
          </div>
          {error && <p className={css.description} role="alert">{t('loginFailed')}</p>}
        </div>
        <div className={css.actions}>
          <Button variant="outline" disabled={busy} onClick={dismiss}>{t('cancel')}</Button>
          <Button variant="primary" type="submit" disabled={busy}>{t('loginSubmit')}</Button>
        </div>
      </form>
    </Modal>
  )
}
