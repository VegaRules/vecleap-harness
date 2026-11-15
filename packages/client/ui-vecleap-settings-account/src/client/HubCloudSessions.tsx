import { useCallback, useEffect, useState } from 'react'
import { Button } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { HubChatMessage, HubChatSessionSummary } from '@deepseek-ai/dsh-api-vecleap-hub-controller/types'
import css from './AccountPanel.module.css'

const AUTO_REFRESH_MS = 45_000

export type HubCloudSessionsProps = PropsLocale<'vecleap.account'> & {
  readonly listChatSessions: () => Promise<HubChatSessionSummary[]>
  readonly loadChatSession: (id: string) => Promise<{ title: string; messages: HubChatMessage[] }>
}

export function HubCloudSessions({ t, listChatSessions, loadChatSession }: HubCloudSessionsProps) {
  const [sessions, setSessions] = useState<HubChatSessionSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [errorDetail, setErrorDetail] = useState('')
  const [previewId, setPreviewId] = useState<string | undefined>()
  const [previewTitle, setPreviewTitle] = useState('')
  const [previewMessages, setPreviewMessages] = useState<HubChatMessage[]>([])

  const refresh = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent === true
    if (!silent) {
      setLoading(true)
      setError(false)
      setErrorDetail('')
    }
    try {
      setSessions(await listChatSessions())
      if (!silent) setError(false)
    } catch (reason: unknown) {
      setError(true)
      setErrorDetail(reason instanceof Error ? reason.message : String(reason))
    } finally {
      if (!silent) setLoading(false)
    }
  }, [listChatSessions])

  useEffect(() => { void refresh() }, [refresh])

  useEffect(() => {
    const timer = setInterval(() => { void refresh({ silent: true }) }, AUTO_REFRESH_MS)
    return () => { clearInterval(timer) }
  }, [refresh])

  const openPreview = useCallback(async (id: string) => {
    setPreviewId(id)
    try {
      const loaded = await loadChatSession(id)
      setPreviewTitle(loaded.title)
      setPreviewMessages(loaded.messages)
    } catch {
      setPreviewTitle('')
      setPreviewMessages([])
    }
  }, [loadChatSession])

  return (
    <div className={css.cloudBlock}>
      <div className={css.row}>
        <span className={css.rowLabel}>{t('cloudSessionsTitle')}</span>
        <Button variant="ghost" size="sm" onClick={() => { void refresh() }} disabled={loading}>{t('cloudRefresh')}</Button>
      </div>
      <p className={css.cloudHint}>{t('cloudSessionsHint')}</p>
      {loading && <p className={css.cloudEmpty}>{t('cloudLoading')}</p>}
      {!loading && error && (
        <p className={css.cloudEmpty}>
          {t('cloudFailed')}
          {errorDetail !== '' && ` (${errorDetail})`}
        </p>
      )}
      {!loading && !error && sessions.length === 0 && <p className={css.cloudEmpty}>{t('cloudEmpty')}</p>}
      {!loading && !error && sessions.length > 0 && (
        <ul className={css.cloudList}>
          {sessions.map(row => (
            <li key={row.session_id}>
              <button type="button" className={css.cloudRow} onClick={() => { void openPreview(row.session_id) }}>
                <span className={css.cloudTitle}>{row.title || t('cloudUntitled')}</span>
                <span className={css.cloudMeta}>{new Date(row.updated_at * 1000).toLocaleString()}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {previewId !== undefined && (
        <div className={css.cloudPreview} role="region" aria-label={previewTitle || t('cloudUntitled')}>
          <div className={css.row}>
            <span className={css.rowLabel}>{previewTitle || t('cloudUntitled')}</span>
            <Button variant="ghost" size="sm" onClick={() => { setPreviewId(undefined) }}>{t('close')}</Button>
          </div>
          <CloudTranscript messages={previewMessages} />
        </div>
      )}
    </div>
  )
}

function CloudTranscript({ messages }: { readonly messages: HubChatMessage[] }) {
  if (messages.length === 0) return <p className={css.cloudEmpty}>—</p>
  return (
    <div className={css.cloudTranscript}>
      {messages.map((message, index) => (
        <p key={`${message.created_at}-${index}`} className={message.role === 'user' ? css.cloudUser : css.cloudAssistant}>
          {message.content}
        </p>
      ))}
    </div>
  )
}
