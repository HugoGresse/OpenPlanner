import { describe, expect, test } from 'vitest'
import { OPENPLANNER_CONTACT_EMAIL, buildSpeakerEmailFooter } from './speakerEmailFooter'

describe('speakerEmailFooter', () => {
    test('OPENPLANNER_CONTACT_EMAIL is the canonical address', () => {
        expect(OPENPLANNER_CONTACT_EMAIL).toBe('contact@email.openplanner.fr')
    })

    test('buildSpeakerEmailFooter interpolates the event name and embeds the contact', () => {
        const out = buildSpeakerEmailFooter('My Conf')
        expect(out).toContain('OpenPlanner')
        expect(out).toContain('My Conf')
        expect(out).toContain(OPENPLANNER_CONTACT_EMAIL)
        // Leading separator line — kept for visual distinction in plain
        // text clients.
        expect(out.startsWith('--\n')).toBe(true)
    })
})
