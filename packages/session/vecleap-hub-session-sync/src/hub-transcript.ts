import type { HubChatMessage } from './hub-sync-types.ts'

function asLoose(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null
}

/**
 * Rebuild user/assistant lines from Hub session events (Web `message`, Hub
 * `agent_task` / `agent_stream` summaries). Matches Web list/preview semantics
 * in simplified form.
 */
export function hubTranscriptFromEvents(events: ReadonlyArray<{ readonly data: unknown }>): HubChatMessage[] {
  const taskBacked = new Set<number>()
  for (const row of events) {
    const event = asLoose(row.data)
    if (event?.type === 'agent_task' && typeof event.task_id === 'number') taskBacked.add(event.task_id)
  }
  const out: HubChatMessage[] = []
  for (const row of events) {
    const event = asLoose(row.data)
    if (event === null) continue
    if (event.type === 'message' && (event.role === 'user' || event.role === 'assistant')) {
      if (event.role === 'assistant' && typeof event.task_id === 'number' && taskBacked.has(event.task_id)) continue
      const content = typeof event.content === 'string' ? event.content.trim() : ''
      if (content === '') continue
      const created = typeof event.created_at === 'number' ? event.created_at : Date.now()
      out.push({
        role: event.role,
        content,
        created_at: created,
        ...(typeof event.model === 'string' ? { model: event.model } : {}),
      })
      continue
    }
    if (event.type === 'agent_task' && typeof event.task_id === 'number') {
      const result = asLoose(event.result)
      const answer = typeof result?.answer === 'string' ? result.answer.trim() : ''
      if (answer === '') continue
      const created = typeof event.created_at === 'number' ? event.created_at : Date.now()
      out.push({ role: 'assistant', content: answer, created_at: created })
    }
  }
  return out
}
