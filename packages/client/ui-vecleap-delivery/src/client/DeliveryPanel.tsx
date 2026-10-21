import { useCallback, useMemo, useState } from 'react'
import clsx from 'clsx'
import { Button } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type { BoardVehicleState, DemoFleetVehicle } from './demo-data.ts'
import {
  DEMO_PROJECTS, boardState, initialFleet, initialQueue, initialTrips,
} from './demo-data.ts'
import type { DeliveryMessageContext, DeliverySendOutcome } from './delivery-actions.ts'
import { DeliveryChat } from './DeliveryChat.tsx'
import { PlaybooksPanel } from './PlaybooksPanel.tsx'
import { loadPlaybooks, type DeliveryPlaybook } from './playbooks-storage.ts'
import css from './DeliveryPanel.module.css'

type TabId = 'board' | 'fleet' | 'playbooks'

/** Actions injected from the browser plugin. */
export interface DeliveryPanelInjected {
  readonly sendDeliveryMessage: (text: string, context: DeliveryMessageContext) => Promise<DeliverySendOutcome>
  readonly openDeliveryConversation: () => void
}

export type DeliveryPanelProps = PropsRuntime<'main'>
  & InjectFace<DeliveryPanelInjected>
  & PropsLocale<'vecleap.delivery'>

function pillClass(state: BoardVehicleState): string {
  const idle = css.pillIdle ?? ''
  switch (state) {
    case 'boarding': return css.pillBoarding ?? idle
    case 'delivering': return css.pillDelivering ?? idle
    case 'fault': return css.pillFault ?? idle
    case 'offline': return css.pillOffline ?? idle
    case 'low_battery': return css.pillLow ?? idle
    default: return idle
  }
}

function stateLabel(state: BoardVehicleState, t: DeliveryPanelProps['t']): string {
  switch (state) {
    case 'boarding': return t('stateBoarding')
    case 'delivering': return t('stateDelivering')
    case 'fault': return t('stateFault')
    case 'offline': return t('stateOffline')
    case 'low_battery': return t('stateLowBattery')
    default: return t('stateIdle')
  }
}

/**
 * Vecleap delivery dashboard with light-theme layout, embedded AI chat, and user playbooks.
 * @param props - locale, injected messaging, and framework runtime props.
 * @returns the panel root.
 */
export function DeliveryPanel({
  t, sendDeliveryMessage, openDeliveryConversation,
}: DeliveryPanelProps) {
  const [tab, setTab] = useState<TabId>('board')
  const [projectId, setProjectId] = useState(4)
  const [fleet, setFleet] = useState(initialFleet)
  const [trips] = useState(initialTrips)
  const [queue] = useState(initialQueue)
  const [boardTs, setBoardTs] = useState(() => new Date())
  const [playbooks, setPlaybooks] = useState(loadPlaybooks)
  const [chatSeed, setChatSeed] = useState<string | null>(null)

  const projectIds = useMemo(() => Object.keys(DEMO_PROJECTS).map(Number), [])

  const messageContext: DeliveryMessageContext = useMemo(
    () => ({ projectId, tab }),
    [projectId, tab],
  )

  const fleetForProject = useMemo(
    () => fleet.filter(v => v.projectId === projectId),
    [fleet, projectId],
  )

  const activeTrips = useMemo(
    () => trips.filter(tr => tr.projectId === projectId && tr.status !== 'closed'),
    [trips, projectId],
  )

  const refreshTelemetry = useCallback(() => {
    setFleet(prev => prev.map(v => ({
      ...v,
      battery: Math.max(5, Math.min(100, v.battery + (Math.random() * 10 - 3) | 0)),
    })))
    setBoardTs(new Date())
  }, [])

  const togglePower = useCallback(() => {
    setFleet((prev) => {
      const target = prev.find(x => x.projectId === projectId && x.enabled)
      if (target === undefined) return prev
      return prev.map((v) => {
        if (v.vin !== target.vin) return v
        const power = !v.power
        return { ...v, power, battery: power && v.battery === 0 ? 45 : v.battery }
      })
    })
  }, [projectId])

  const runPlaybook = useCallback(async (playbook: DeliveryPlaybook) => {
    await sendDeliveryMessage(playbook.prompt, messageContext)
  }, [messageContext, sendDeliveryMessage])

  const draftPlaybookViaChat = useCallback((seed: string) => {
    setChatSeed(seed)
  }, [])

  const renderBoard = () => (
    <>
      <p className={css.lead}>{t('boardLead')}</p>
      <div className={css.toolbar}>
        <label>
          {t('project')}
          {' '}
          <select
            className={css.select}
            value={projectId}
            onChange={(e) => { setProjectId(Number(e.target.value)); setBoardTs(new Date()) }}
          >
            {projectIds.map(id => (
              <option key={id} value={id}>{DEMO_PROJECTS[id]?.name ?? id}</option>
            ))}
          </select>
        </label>
        <Button variant="outline" onClick={() => { refreshTelemetry(); setBoardTs(new Date()) }}>
          {t('refresh')}
        </Button>
      </div>
      <div className={css.card}>
        <table className={css.table}>
          <thead>
            <tr>
              <th>{t('plate')}</th>
              <th>{t('route')}</th>
              <th>{t('battery')}</th>
              <th>{t('participants')}</th>
            </tr>
          </thead>
          <tbody>
            {fleetForProject.map((v) => {
              const trip = activeTrips.find(tr => tr.vin === v.vin)
              const st = boardState(v, trip)
              return (
                <tr key={v.vin}>
                  <td>
                    {v.code}
                    <span className={pillClass(st)}>{stateLabel(st, t)}</span>
                  </td>
                  <td>{trip !== undefined ? `${trip.from} → ${trip.to}` : '—'}</td>
                  <td>
                    {v.battery}
                    %
                  </td>
                  <td>{trip?.participants ?? 0}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <p className={css.meta}>
          {t('queue')}
          :
          {' '}
          {projectId === 4 && queue.length > 0
            ? queue.map(q => `#${q.queueNo} ${q.from}→${q.to} (${q.wait}min)`).join('; ')
            : t('queueEmpty')}
          {' · '}
          {t('updatedAt')}
          {' '}
          {boardTs.toLocaleTimeString()}
        </p>
      </div>
    </>
  )

  const renderFleet = () => (
    <>
      <p className={css.lead}>{t('fleetLead')}</p>
      <div className={css.toolbar}>
        <label>
          {t('project')}
          {' '}
          <select
            className={css.select}
            value={projectId}
            onChange={(e) => { setProjectId(Number(e.target.value)) }}
          >
            {projectIds.map(id => (
              <option key={id} value={id}>{DEMO_PROJECTS[id]?.name ?? id}</option>
            ))}
          </select>
        </label>
        <Button variant="outline" onClick={refreshTelemetry}>{t('refreshTelemetry')}</Button>
        <Button variant="outline" onClick={togglePower}>{t('togglePower')}</Button>
      </div>
      <div className={css.card}>
        <table className={css.table}>
          <thead>
            <tr>
              <th>{t('plate')}</th>
              <th>{t('vin')}</th>
              <th>{t('park')}</th>
              <th>{t('enabled')}</th>
              <th>{t('battery')}</th>
              <th>{t('power')}</th>
              <th>{t('online')}</th>
              <th>{t('fault')}</th>
            </tr>
          </thead>
          <tbody>
            {fleetForProject.length === 0
              ? (
                <tr>
                  <td colSpan={8}>{t('noFleet')}</td>
                </tr>
              )
              : fleetForProject.map((v: DemoFleetVehicle) => {
                const online = v.power || v.battery > 0
                return (
                  <tr key={v.vin}>
                    <td>{v.code}</td>
                    <td>
                      <code>
                        …
                        {v.vin.slice(-8)}
                      </code>
                    </td>
                    <td>{v.park}</td>
                    <td>{v.enabled ? t('yes') : t('no')}</td>
                    <td>
                      {v.battery}
                      %
                    </td>
                    <td>{v.power ? t('powerOn') : t('powerOff')}</td>
                    <td>{online ? t('onlineCloud') : t('offlineCloud')}</td>
                    <td>{v.fault ? t('yes') : t('no')}</td>
                  </tr>
                )
              })}
          </tbody>
        </table>
      </div>
    </>
  )

  return (
    <div className={css.page}>
      <div className={css.mainColumn}>
        <div className={css.pageScroll}>
          <div className={css.pageContent}>
            <div className={css.pageHeading}>
              <h1 className={css.title}>{t('title')}</h1>
              <span className={css.badge}>{t('demoBadge')}</span>
            </div>
            <nav className={css.tabs} aria-label={t('panel')}>
              {(['board', 'fleet', 'playbooks'] as const).map(id => (
                <button
                  key={id}
                  type="button"
                  className={clsx(id === tab ? css.tabActive : css.tab)}
                  aria-current={id === tab ? 'page' : undefined}
                  onClick={() => { setTab(id) }}
                >
                  {id === 'board' ? t('tabBoard') : id === 'fleet' ? t('tabFleet') : t('tabPlaybooks')}
                </button>
              ))}
            </nav>
            {tab === 'board' && renderBoard()}
            {tab === 'fleet' && renderFleet()}
            {tab === 'playbooks' && (
              <PlaybooksPanel
                t={t}
                playbooks={playbooks}
                onChange={setPlaybooks}
                onRun={(row) => { void runPlaybook(row) }}
                onDraftPlaybookViaChat={draftPlaybookViaChat}
              />
            )}
          </div>
        </div>
      </div>
      <DeliveryChat
        t={t}
        context={messageContext}
        onSend={sendDeliveryMessage}
        onOpenConversation={openDeliveryConversation}
        initialDraft={chatSeed ?? undefined}
        onConsumeSeed={() => { setChatSeed(null) }}
      />
    </div>
  )
}
