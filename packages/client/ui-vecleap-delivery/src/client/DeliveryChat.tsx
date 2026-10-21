import { useCallback, useEffect, useRef, useState } from 'react'
import { Button, IconSendOutlineRegular } from '@deepseek-ai/dsh-client-ui-primitives'
import type { DeliveryLocaleKey } from './locales.ts'
import type { DeliveryMessageContext, DeliverySendOutcome } from './delivery-actions.ts'
import css from './DeliveryPanel.module.css'

export interface ChatLine {
  readonly id: string
  readonly role: 'user' | 'system'
  readonly text: string
}

/** Props for the persistent delivery assistant column. */
export interface DeliveryChatProps {
  readonly t: (key: DeliveryLocaleKey) => string
  readonly context: DeliveryMessageContext
  readonly onSend: (text: string, context: DeliveryMessageContext) => Promise<DeliverySendOutcome>
  readonly onOpenConversation: () => void
  readonly initialDraft?: string | undefined
  readonly onConsumeSeed?: () => void
}

/**
 * Side-column chat composer that submits to the delivery session without leaving the panel.
 * @param props - locale, context, and send handlers.
 * @returns chat column element.
 */
export function DeliveryChat({
  t, context, onSend, onOpenConversation, initialDraft, onConsumeSeed,
}: DeliveryChatProps) {
  const [draft, setDraft] = useState('')
  useEffect(() => {
    if (initialDraft === undefined || initialDraft === '') return
    setDraft(initialDraft)
    onConsumeSeed?.()
  }, [initialDraft, onConsumeSeed])
  const [busy, setBusy] = useState(false)
  const [lines, setLines] = useState<ChatLine[]>([])
  const listRef = useRef<HTMLDivElement>(null)

  const pushLine = useCallback((role: ChatLine['role'], text: string) => {
    setLines(prev => [...prev, { id: `${Date.now()}-${prev.length}`, role, text }])
    queueMicrotask(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' }) })
  }, [])

  const submit = useCallback(async () => {
    const text = draft.trim()
    if (text === '' || busy) return
    setBusy(true)
    pushLine('user', text)
    setDraft('')
    const outcome = await onSend(text, context)
    if (outcome === 'accepted') {
      pushLine('system', t('chatAccepted'))
    } else if (outcome === 'no-workspace') {
      pushLine('system', t('chatNoWorkspace'))
    } else {
      pushLine('system', t('chatFailed'))
    }
    setBusy(false)
  }, [busy, context, draft, onSend, pushLine, t])

  return (
    <aside className={css.chatColumn} aria-label={t('chatTitle')}>
      <div className={css.chatHeader}>
        <h2 className={css.chatTitle}>{t('chatTitle')}</h2>
        <Button variant="ghost" size="sm" onClick={onOpenConversation}>{t('chatOpenFull')}</Button>
      </div>
      <p className={css.chatLead}>{t('chatLead')}</p>
      <div ref={listRef} className={css.chatLog}>
        {lines.length === 0
          ? <p className={css.chatEmpty}>{t('chatEmpty')}</p>
          : lines.map(line => (
            <div key={line.id} className={line.role === 'user' ? css.chatLineUser : css.chatLineSystem}>
              {line.text}
            </div>
          ))}
      </div>
      <div className={css.chatComposer}>
        <textarea
          className={css.chatInput}
          rows={3}
          value={draft}
          placeholder={t('chatPlaceholder')}
          onChange={(e) => { setDraft(e.target.value) }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              void submit()
            }
          }}
        />
        <Button variant="primary" icon={<IconSendOutlineRegular size={16} />} disabled={busy || draft.trim() === ''} onClick={() => { void submit() }}>
          {t('chatSend')}
        </Button>
      </div>
    </aside>
  )
}
