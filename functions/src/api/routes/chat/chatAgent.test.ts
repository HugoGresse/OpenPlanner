import { describe, expect, it } from 'vitest'
import { buildSystemPrompt } from './chatAgent'

describe('buildSystemPrompt answerAnyQuestion', () => {
    it('leaves the prompt untouched when the flag is off (in-app chat and default Slack)', () => {
        const prompt = buildSystemPrompt('evt', 'DevFest', 'ui')
        expect(prompt).toBe(buildSystemPrompt('evt', 'DevFest', 'ui', false))
        expect(prompt).not.toContain('Scope:')
        // No stray blank line where the optional paragraph would go.
        expect(prompt).toContain('(id: evt).\n\nRead tools (')
    })

    it('adds the general-assistant paragraph when the flag is on', () => {
        const prompt = buildSystemPrompt('evt', 'DevFest', 'slack', true)
        expect(prompt).toContain('(id: evt).\n\nScope: besides managing the event, you may answer any other question')
        expect(prompt).toContain('about the event.\n\nRead tools (')
    })
})
