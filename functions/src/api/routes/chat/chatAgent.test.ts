import { describe, expect, it } from 'vitest'
import { buildSystemPrompt } from './chatAgent'

describe('buildSystemPrompt answer scope', () => {
    it('adds no scope note when answerScope is omitted (in-app chat)', () => {
        const prompt = buildSystemPrompt('evt', 'DevFest', 'ui')
        expect(prompt).not.toContain('Scope:')
        expect(prompt).toContain('helping the user manage the event "DevFest"')
    })

    it('restricts to the event when answerScope is "event"', () => {
        const prompt = buildSystemPrompt('evt', 'DevFest', 'slack', 'event')
        expect(prompt).toContain('only help with this event and OpenPlanner')
        expect(prompt).not.toContain('general assistant')
    })

    it('allows unrelated questions when answerScope is "any"', () => {
        const prompt = buildSystemPrompt('evt', 'DevFest', 'slack', 'any')
        expect(prompt).toContain('answer any other question')
        expect(prompt).not.toContain('do not answer the unrelated question')
    })
})
