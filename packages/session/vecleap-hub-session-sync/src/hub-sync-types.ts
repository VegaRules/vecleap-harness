/** Hub chat sync types (aligned with Web `sessionSync.ts` / Mobile `hubSessions.ts`). */

export interface HubChatSessionSummary {
  readonly session_id: string
  readonly title: string
  readonly last_seq: number
  readonly updated_at: number
}

export interface HubChatMessage {
  readonly role: 'user' | 'assistant'
  readonly content: string
  readonly created_at: number
  readonly model?: string
}

export interface HubChatMessageEvent {
  readonly type: 'message'
  readonly role: 'user' | 'assistant'
  readonly content: string
  readonly created_at: number
  readonly mode: 'agent'
  readonly model?: string
}

export interface HubSyncEvent {
  readonly seq: number
  readonly data: HubChatMessageEvent
}

export interface HubSyncMapEntry {
  readonly hubSessionId: string
  lastSeq: number
}

export type HubSyncMap = Record<string, HubSyncMapEntry>
