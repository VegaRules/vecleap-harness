import { Button } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale, PropsRuntime, InjectFace } from '@deepseek-ai/dsh-client-ui-slots'
import type { HubAccountInjected, HubAccountSnapshot } from './state.ts'
import { HubCloudSessions } from './HubCloudSessions.tsx'
import css from './AccountPanel.module.css'

export type HubAccountSectionProps =
  PropsRuntime<'settings.section'>
  & PropsLocale<'vecleap.account'>
  & InjectFace<HubAccountInjected>

export function HubAccountSection({
  t, useAccount, signOut, listChatSessions, loadChatSession,
}: HubAccountSectionProps) {
  const snapshot = useAccount((value: HubAccountSnapshot) => value)
  const profile = snapshot.details?.profile?.status === 'ready' ? snapshot.details.profile.value : undefined

  return (
    <div className={css.section}>
      {profile && (
        <>
          <div className={css.row}>
            <span className={css.rowLabel}>{t('profileName')}</span>
            <span className={css.rowValue}>{profile.name ?? profile.contact ?? t('signedIn')}</span>
          </div>
          {profile.contact && (
            <div className={css.row}>
              <span className={css.rowLabel}>{t('profileEmail')}</span>
              <span className={css.rowValue}>{profile.contact}</span>
            </div>
          )}
        </>
      )}
      <HubCloudSessions t={t} listChatSessions={listChatSessions} loadChatSession={loadChatSession} />
      <Button variant="outline" onClick={() => { void signOut() }}>{t('signOut')}</Button>
    </div>
  )
}
