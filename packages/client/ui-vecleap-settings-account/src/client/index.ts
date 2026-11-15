/**
 * VecLeap Hub account sidebar launcher and settings section (web and desktop).
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type { AccountView } from '@deepseek-ai/dsh-deepseek-account/types'
import type { RemoteResult } from '@deepseek-ai/dsh-api-remotes/client'
import type {} from '@deepseek-ai/dsh-api-vecleap-hub-controller/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type { MainPanelId } from '@deepseek-ai/dsh-client-ui-layout/client' // layout slot types
import { CloudSyncPanel } from './CloudSyncPanel.tsx'
import { CloudSyncPanelIcon } from './CloudSyncPanelIcon.tsx'
import { HubAccountMenu } from './HubAccountMenu.tsx'
import { HubAccountSection } from './HubAccountSection.tsx'
import { en, NS, zh, type VecleapAccountKey } from './locales.ts'
import type { HubAccountInjected, HubAccountSnapshot } from './state.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    'vecleap.account': VecleapAccountKey
  }
}

const CLOUD_PANEL_ID = 'vecleap-cloud' as MainPanelId

function unwrapRemote<T>(result: T | RemoteResult<T>): T {
  if (typeof result === 'object' && result !== null && 'ok' in result) {
    const envelope = result as RemoteResult<T>
    if (!envelope.ok) throw envelope.error
    return envelope.value
  }
  return result
}

export const inject = ['slots', 'locale', 'remote', 'remote.account', 'remote.vecleapHub']

function clientMetadata(localeId: string, version: string | undefined): {
  version: string
  locale: 'en' | 'zh_CN'
  timezoneOffsetSeconds: number
} {
  return {
    version: version ?? '0.0.0',
    locale: localeId.startsWith('zh') ? 'zh_CN' : 'en',
    timezoneOffsetSeconds: -new Date().getTimezoneOffset() * 60,
  }
}

/** Register VecLeap Hub account UI for browser and Desktop renderers. */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'vecleap-account: dictionaries')
  const t = ctx.locale.bind(NS)
  let snapshot: HubAccountSnapshot = { view: undefined, details: undefined, failed: false, loginVisible: false }
  const listeners = new Set<() => void>()
  const publish = (value: HubAccountSnapshot) => { snapshot = value; for (const listener of listeners) listener() }
  const client = () => clientMetadata(ctx.locale.getSnapshot().active, process.env.DSH_CLIENT_VERSION)

  const refreshProfile = async (): Promise<void> => {
    if (snapshot.view?.status !== 'credential-stored') return
    try {
      const result = await ctx.remote.account.getProfile(client())
      if (!result.ok || result.value === null) throw new Error('profile failed')
      publish({ ...snapshot, details: { ...snapshot.details, profile: result.value } })
    } catch {
      publish({ ...snapshot, details: { ...snapshot.details, profile: { status: 'failed' } } })
    }
  }

  const stream = ctx.remote.$stream<AccountView>({
    name: 'vecleap-account',
    open: signal => ctx.remote.account.watch(signal),
    ended: () => new Error('account stream ended'),
  })
  let disposed = false
  ctx.effect(() => () => { disposed = true; return stream.dispose() }, 'vecleap-account: stream')

  void (async () => {
    for await (const frame of stream) {
      const stored = frame.value.status === 'credential-stored'
      publish({ ...snapshot, view: frame.value, details: stored ? snapshot.details : undefined, failed: false })
      frame.accept()
      if (stored) void refreshProfile()
    }
  })().catch(() => { if (!disposed) publish({ ...snapshot, failed: true }) })

  ctx.effect(() => ctx.remote.$on('deepseek-account/session-expired', () => {
    publish({ view: { status: 'signed-out', links: snapshot.view?.links ?? { usageUrl: '/', topUpUrl: '/' }, attempt: null },
      details: undefined, failed: false, loginVisible: true })
  }), 'vecleap-account: expiry')

  const operations: HubAccountInjected = {
    hooks: {
      account: {
        getSnapshot: () => snapshot,
        subscribe: (listener) => { listeners.add(listener); return () => { listeners.delete(listener) } },
      },
    },
    refreshAccount: refreshProfile,
    showLogin(visible) { publish({ ...snapshot, loginVisible: visible }) },
    async hubLogin(email, password) {
      const result = await ctx.remote.vecleapHub.loginWithPassword(email, password)
      if (!result.ok) throw new Error('hub login failed')
      publish({ ...snapshot, loginVisible: false })
      await refreshProfile()
    },
    async hasRunningAccountTasks() {
      const result = await ctx.remote.account.hasRunningAccountTasks()
      if (!result.ok) throw new Error('task query failed')
      return result.value
    },
    async signOut() {
      const result = await ctx.remote.account.signOut(client())
      if (!result.ok) throw result.error
    },
    listChatSessions: async () => unwrapRemote(await ctx.remote.vecleapHub.listChatSessions()),
    loadChatSession: async id => unwrapRemote(await ctx.remote.vecleapHub.loadChatSession(id)),
  }

  ctx.slots.inject('settings.launcher', () => ctx.slots.register({
    name: 'settings.launcher', locale: NS, inject: () => operations,
  }, HubAccountMenu))

  ctx.slots.inject('settings.section', () => {
    let unregister: (() => void) | undefined
    const update = () => {
      if (snapshot.view?.status === 'credential-stored') {
        unregister ??= ctx.slots.register({
          name: 'settings.section', id: 'vecleap-account', order: -10, label: () => t('nav'),
          locale: NS, inject: () => operations,
        }, HubAccountSection)
      } else {
        unregister?.()
        unregister = undefined
      }
    }
    listeners.add(update)
    update()
    return () => { listeners.delete(update); unregister?.() }
  })

  ctx.slots.inject('main', () => {
    let unregister: (() => void) | undefined
    const update = () => {
      if (snapshot.view?.status === 'credential-stored') {
        unregister ??= ctx.slots.register({
          name: 'main',
          key: CLOUD_PANEL_ID,
          locale: NS,
          inject: () => ({
            listChatSessions: operations.listChatSessions,
            loadChatSession: operations.loadChatSession,
          }),
        }, CloudSyncPanel)
      } else {
        unregister?.()
        unregister = undefined
      }
    }
    listeners.add(update)
    update()
    return () => { listeners.delete(update); unregister?.() }
  })

  ctx.slots.inject('sidebar.panellist', () => {
    let unregister: (() => void) | undefined
    const update = () => {
      if (snapshot.view?.status === 'credential-stored') {
        unregister ??= ctx.slots.register({
          name: 'sidebar.panellist',
          id: CLOUD_PANEL_ID,
          order: 3,
          locale: NS,
          label: () => t('cloudPanel'),
        }, CloudSyncPanelIcon)
      } else {
        unregister?.()
        unregister = undefined
      }
    }
    listeners.add(update)
    update()
    return () => { listeners.delete(update); unregister?.() }
  })
}
