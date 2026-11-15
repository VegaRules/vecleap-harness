import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { HubCloudSessions } from './HubCloudSessions.tsx'
import type { HubAccountInjected } from './state.ts'
import css from './CloudSyncPanel.module.css'

export type CloudSyncPanelProps = PropsLocale<'vecleap.account'>
  & PropsRuntime<'main'>
  & Pick<HubAccountInjected, 'listChatSessions' | 'loadChatSession'>

/** Main-area panel listing Hub chat sessions (shared with Web / Mobile). */
export function CloudSyncPanel({ t, listChatSessions, loadChatSession }: CloudSyncPanelProps) {
  return (
    <div className={css.root}>
      <header className={css.header}>
        <h1 className={css.title}>{t('cloudPanelTitle')}</h1>
        <p className={css.lead}>{t('cloudPanelLead')}</p>
      </header>
      <HubCloudSessions t={t} listChatSessions={listChatSessions} loadChatSession={loadChatSession} />
    </div>
  )
}
