import { describe, expect, it } from 'vitest'
import { hubTranscriptFromEvents } from './hub-transcript.ts'

describe('hubTranscriptFromEvents', () => {
  it('merges user messages and agent_task answers', () => {
    const events = [
      { data: { type: 'message', role: 'user', content: 'hello', created_at: 1 } },
      { data: { type: 'agent_task', task_id: 3, result: { answer: 'done' }, created_at: 2 } },
    ]
    expect(hubTranscriptFromEvents(events).map(row => row.content)).toEqual(['hello', 'done'])
  })
})
