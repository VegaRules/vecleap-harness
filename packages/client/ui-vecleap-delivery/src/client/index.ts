/**
 * Vecleap delivery dashboard: light-theme board, embedded chat, and user playbooks.
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import type {} from '@deepseek-ai/dsh-api-session-controller/client'
import type {} from '@deepseek-ai/dsh-api-workspace-controller/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type {} from '@deepseek-ai/dsh-client-ui-workspace/client'
import type { MainPanelId } from '@deepseek-ai/dsh-client-ui-layout/client'
import { createDeliveryActions } from './delivery-actions.ts'
import { DeliveryPanel, type DeliveryPanelInjected } from './DeliveryPanel.tsx'
import { DeliveryPanelIcon } from './DeliveryPanelIcon.tsx'
import { en, NS, zh, type DeliveryLocaleKey } from './locales.ts'

const PANEL_ID = 'vecleap-delivery' as MainPanelId

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Vecleap unmanned delivery panel copy. */
    'vecleap.delivery': DeliveryLocaleKey
  }
}

/** Required services for layout, workspace navigation, sessions, and Remotes. */
export const inject = [
  'slots', 'locale', 'layout', 'uiWorkspace', 'remote', 'remote.session', 'sessions', 'workspaces',
]

/**
 * Register the delivery main panel and matching sidebar entry.
 * @param ctx - browser root context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-vecleap-delivery: dictionaries')
  const t = ctx.locale.bind(NS)
  const actions = createDeliveryActions(ctx)
  const injected: DeliveryPanelInjected = {
    sendDeliveryMessage: actions.sendDeliveryMessage,
    openDeliveryConversation: actions.openDeliveryConversation,
  }

  ctx.slots.inject('main', () => ctx.slots.register({
    name: 'main',
    key: PANEL_ID,
    locale: NS,
    inject: (): DeliveryPanelInjected => injected,
  }, DeliveryPanel))

  ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
    name: 'sidebar.panellist',
    id: PANEL_ID,
    order: 5,
    locale: NS,
    label: () => t('panel'),
  }, DeliveryPanelIcon))
}
