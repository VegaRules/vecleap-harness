/** Extract plain text from DSH session events for Hub `message` sync events. */
import type { Session, SessionEvent } from '@deepseek-ai/dsh-session'

function textFromBlocks(content: readonly { readonly type: string; readonly text?: string }[]): string {
  return content
    .filter((block): block is { readonly type: 'text'; readonly text: string } => block.type === 'text' && typeof block.text === 'string')
    .map(block => block.text)
    .join('\n')
    .trim()
}

/** User-visible text from a human `user/message`, when present. */
export function userMessageText(event: SessionEvent): string | undefined {
  if (event.type !== 'user/message' || event.data.source.kind !== 'user') return undefined
  const text = textFromBlocks(event.data.content)
  return text.length > 0 ? text : undefined
}

/** Latest assistant surface text in the session log (for one completed turn). */
export function latestAssistantText(session: Session): string | undefined {
  const events = session.snapshotEvents()
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index]
    if (event?.type !== 'assistant/message') continue
    const text = textFromBlocks(event.data.message.content)
    if (text.length > 0) return text
  }
  return undefined
}

/** Title string from a `session/title` event, when present. */
export function titleFromSessionEvent(event: SessionEvent): string | undefined {
  if ((event as { type: string }).type !== 'session/title') return undefined
  const title = String((event as { data: { title?: string } }).data.title ?? '').trim()
  return title.length > 0 ? title : undefined
}
