/** User-authored delivery playbooks persisted in the browser. */
import { randomUUID } from '@deepseek-ai/dsh-util-crypto'

export interface DeliveryPlaybook {
  readonly id: string
  readonly title: string
  readonly prompt: string
}

const STORAGE_KEY = 'vecleap.delivery.playbooks.v1'

const DEFAULTS: readonly DeliveryPlaybook[] = [
  {
    id: 'seed-queue',
    title: '行李排队匹配',
    prompt: '你是 Vecleap 无人车运营 Agent。按行李 ProcessQueue：为 queued 行李单匹配可用车辆（电量≥15%、无故障），创建 boarding 行程并更新 trip_no 与 VIN。说明匹配依据与 Hub API 步骤（演示可模拟）。',
  },
  {
    id: 'seed-depart',
    title: '提前发车',
    prompt: '你是 Vecleap 无人车运营 Agent。将 boarding 行程推进为 delivering，并同步该 trip_no 下订单状态；说明状态机与 Neolix 任务要点（演示可模拟）。',
  },
  {
    id: 'seed-inspect',
    title: '车队巡检',
    prompt: '你是 Vecleap 无人车运营 Agent。刷新车队遥测，列出低电量、离线/下电、故障车辆，并给出运营处置建议。',
  },
]

/**
 * Load saved playbooks or the default seed set.
 * @returns ordered playbook list.
 */
export function loadPlaybooks(): DeliveryPlaybook[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) return [...DEFAULTS]
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed) || parsed.length === 0) return [...DEFAULTS]
    return parsed.filter(isPlaybook).map(row => ({ ...row }))
  } catch {
    return [...DEFAULTS]
  }
}

/**
 * Persist the playbook list.
 * @param playbooks - ordered rows to store.
 */
export function savePlaybooks(playbooks: readonly DeliveryPlaybook[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(playbooks))
}

/**
 * Build a playbook from dropped or pasted plain text.
 * @param text - file or clipboard body.
 * @returns a new playbook row.
 */
export function playbookFromText(text: string): DeliveryPlaybook {
  const trimmed = text.trim()
  const lines = trimmed.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0)
  const title = lines[0]?.slice(0, 80) ?? '未命名剧本'
  const prompt = lines.length > 1 ? lines.slice(1).join('\n') : trimmed
  return { id: randomUUID(), title, prompt }
}

function isPlaybook(value: unknown): value is DeliveryPlaybook {
  if (typeof value !== 'object' || value === null) return false
  const row = value as Record<string, unknown>
  return typeof row.id === 'string' && typeof row.title === 'string' && typeof row.prompt === 'string'
}
