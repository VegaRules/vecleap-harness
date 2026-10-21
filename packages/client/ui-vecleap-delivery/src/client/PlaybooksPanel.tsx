import { useCallback, useState } from 'react'
import { Button, IconPlusOutlineRegular } from '@deepseek-ai/dsh-client-ui-primitives'
import { randomUUID } from '@deepseek-ai/dsh-util-crypto'
import type { DeliveryLocaleKey } from './locales.ts'
import type { DeliveryPlaybook } from './playbooks-storage.ts'
import { playbookFromText, savePlaybooks } from './playbooks-storage.ts'
import css from './DeliveryPanel.module.css'

export interface PlaybooksPanelProps {
  readonly t: (key: DeliveryLocaleKey) => string
  readonly playbooks: DeliveryPlaybook[]
  readonly onChange: (next: DeliveryPlaybook[]) => void
  readonly onRun: (playbook: DeliveryPlaybook) => void
  readonly onDraftPlaybookViaChat: (seed: string) => void
}

/**
 * Drag-reorderable playbook list with file drop and AI-assisted authoring hooks.
 * @param props - playbooks state and callbacks.
 * @returns playbooks editor section.
 */
export function PlaybooksPanel({
  t, playbooks, onChange, onRun, onDraftPlaybookViaChat,
}: PlaybooksPanelProps) {
  const [dragId, setDragId] = useState<string | null>(null)
  const [dropHint, setDropHint] = useState(false)

  const persist = useCallback((next: DeliveryPlaybook[]) => {
    onChange(next)
    savePlaybooks(next)
  }, [onChange])

  const reorder = useCallback((fromId: string, toId: string) => {
    if (fromId === toId) return
    const from = playbooks.findIndex(row => row.id === fromId)
    const to = playbooks.findIndex(row => row.id === toId)
    if (from < 0 || to < 0) return
    const next = [...playbooks]
    const [moved] = next.splice(from, 1)
    if (moved === undefined) return
    next.splice(to, 0, moved)
    persist(next)
  }, [persist, playbooks])

  const updateRow = useCallback((id: string, patch: Partial<DeliveryPlaybook>) => {
    persist(playbooks.map(row => row.id === id ? { ...row, ...patch } : row))
  }, [persist, playbooks])

  const addRow = useCallback(() => {
    persist([...playbooks, { id: randomUUID(), title: t('playbookNewTitle'), prompt: '' }])
  }, [persist, playbooks, t])

  const removeRow = useCallback((id: string) => {
    persist(playbooks.filter(row => row.id !== id))
  }, [persist, playbooks])

  const ingestFiles = useCallback(async (files: FileList | File[]) => {
    const list = [...files]
    const additions: DeliveryPlaybook[] = []
    for (const file of list) {
      if (!file.name.match(/\.(md|txt|json)$/i)) continue
      const text = await file.text()
      additions.push(playbookFromText(text))
    }
    if (additions.length > 0) persist([...additions, ...playbooks])
  }, [persist, playbooks])

  return (
    <div className={css.playbooksRoot}>
      <p className={css.lead}>{t('playbookLead')}</p>
      <div className={css.playbookToolbar}>
        <Button variant="outline" icon={<IconPlusOutlineRegular size={16} />} onClick={addRow}>{t('playbookAdd')}</Button>
        <Button
          variant="outline"
          onClick={() => {
            onDraftPlaybookViaChat(t('playbookAiSeed'))
          }}
        >
          {t('playbookAiAuthor')}
        </Button>
      </div>
      <div
        className={dropHint ? css.dropZoneActive : css.dropZone}
        onDragOver={(e) => { e.preventDefault(); setDropHint(true) }}
        onDragLeave={() => { setDropHint(false) }}
        onDrop={(e) => {
          e.preventDefault()
          setDropHint(false)
          void ingestFiles(e.dataTransfer.files)
        }}
      >
        {t('playbookDropHint')}
      </div>
      <ul className={css.playbookList}>
        {playbooks.map(row => (
          <li
            key={row.id}
            className={css.playbookRow}
            draggable
            onDragStart={() => { setDragId(row.id) }}
            onDragOver={(e) => { e.preventDefault() }}
            onDrop={() => {
              if (dragId !== null) reorder(dragId, row.id)
              setDragId(null)
            }}
          >
            <span className={css.dragHandle} aria-hidden="true">⋮⋮</span>
            <div className={css.playbookFields}>
              <input
                className={css.fieldInput}
                value={row.title}
                aria-label={t('playbookTitleLabel')}
                onChange={(e) => { updateRow(row.id, { title: e.target.value }) }}
              />
              <textarea
                className={css.fieldTextarea}
                value={row.prompt}
                aria-label={t('playbookPromptLabel')}
                rows={3}
                onChange={(e) => { updateRow(row.id, { prompt: e.target.value }) }}
              />
              <div className={css.playbookRowActions}>
                <Button variant="primary" size="sm" onClick={() => { onRun(row) }}>{t('playbookRun')}</Button>
                <Button variant="ghost" size="sm" onClick={() => { removeRow(row.id) }}>{t('playbookDelete')}</Button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
