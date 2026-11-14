import { useEffect, useRef, useState } from 'react'
import { Menu, IconEllipsisOutlineMedium, IconSettingsOutlineMedium, IconUserOutlineMedium, Toast } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { HubSignInDialog } from './HubSignInDialog.tsx'
import type { HubAccountInjected, HubAccountSnapshot } from './state.ts'
import css from './AccountPanel.module.css'

export type HubAccountMenuProps =
  PropsRuntime<'settings.launcher'>
  & PropsLocale<'vecleap.account'>
  & InjectFace<HubAccountInjected>

export function HubAccountMenu({
  wide, settingsShortcut, openSettings, settingsOpen, refreshAccount,
  useAccount, showLogin, hubLogin, hasRunningAccountTasks, signOut, t,
}: HubAccountMenuProps) {
  const snapshot = useAccount((value: HubAccountSnapshot) => value)
  const signedIn = snapshot.view?.status === 'credential-stored'
  const profile = snapshot.details?.profile
  const label = profile === undefined ? null : profile.status === 'ready'
    ? profile.value.name ?? profile.value.contact ?? t('signedIn') : t('signedIn')
  const [open, setOpen] = useState(false)
  const [expiryNotice, setExpiryNotice] = useState(false)
  const settingsWasOpen = useRef(false)

  useEffect(() => {
    if (settingsOpen && !settingsWasOpen.current) void refreshAccount()
    settingsWasOpen.current = settingsOpen
  }, [refreshAccount, settingsOpen])

  const requestSignOut = async () => {
    setOpen(false)
    let impact: boolean | 'unknown' = false
    try { impact = await hasRunningAccountTasks() }
    catch { impact = 'unknown' }
    const confirmed = window.confirm(t(
      impact === true ? 'signOutRunningDescription' : impact === 'unknown'
        ? 'signOutUnknownDescription' : 'signOutDescription',
    ))
    if (confirmed) await signOut()
  }

  return (
    <div className={css.menuRoot}>
      {expiryNotice && <Toast text={t('sessionExpired')} onDone={() => { setExpiryNotice(false) }} />}
      <Menu
        open={open}
        side="top"
        portal
        autoFocus
        anchor={(
          <button type="button" className={css.menuTrigger} data-collapsed={!wide}
            aria-label={t('menu')} aria-haspopup="menu" aria-expanded={open}
            onClick={() => { setOpen(value => !value) }}>
            <IconEllipsisOutlineMedium size={14} />
            {wide && <span className={css.menuLabel}>{signedIn ? label : t('more')}</span>}
          </button>
        )}
        items={[
          { id: 'settings', label: t('settings'), icon: <IconSettingsOutlineMedium size={16} />,
            ...(settingsShortcut === undefined ? {} : { shortcut: settingsShortcut }) },
          ...(signedIn
            ? [{ id: 'signout', label: t('signOut') }]
            : [{ id: 'signin', label: t('signIn'), icon: <IconUserOutlineMedium size={16} /> }]),
        ]}
        onClose={() => { setOpen(false) }}
        onSelect={(id) => {
          if (id === 'settings') { setOpen(false); openSettings() }
          else if (id === 'signin') { setOpen(false); showLogin(true) }
          else if (id === 'signout') { void requestSignOut() }
        }}
      />
      <HubSignInDialog open={snapshot.loginVisible} close={() => { showLogin(false) }} login={hubLogin} t={t} />
    </div>
  )
}
