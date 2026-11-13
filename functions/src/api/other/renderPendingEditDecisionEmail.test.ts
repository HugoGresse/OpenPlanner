import { describe, expect, test } from 'vitest'
import { renderApprovedEmail, renderRejectedEmail } from './renderPendingEditDecisionEmail'

const eventName = 'My Event'

describe('renderApprovedEmail', () => {
    test('lists the applied fields and identifies OpenPlanner as the sender', () => {
        const { subject, text } = renderApprovedEmail('Jane', eventName, {
            name: 'Jane Doe',
            jobTitle: 'Lead Engineer',
        })
        expect(subject).toMatch(/approved/i)
        expect(text).toMatch(/Jane/)
        expect(text).toMatch(/Lead Engineer/)
        // Footer must always carry the OpenPlanner attribution + reply-to
        // contact so the speaker knows who is writing regardless of the
        // From header.
        expect(text).toContain('OpenPlanner')
        expect(text).toContain('contact@email.openplanner.fr')
        expect(text).toContain(eventName)
    })
})

describe('renderRejectedEmail', () => {
    test('mentions the rejection note and identifies OpenPlanner as the sender', () => {
        const { subject, text } = renderRejectedEmail('Jane', eventName, { bio: 'lorem' }, 'Bio too long')
        expect(subject).toMatch(/not applied|rejected/i)
        expect(text).toMatch(/Bio too long/)
        expect(text).toContain('OpenPlanner')
        expect(text).toContain('contact@email.openplanner.fr')
    })

    test('omits the reviewer-note section when none provided', () => {
        const { text } = renderRejectedEmail('Jane', eventName, { bio: 'lorem' })
        expect(text).not.toMatch(/Reviewer note/i)
        expect(text).toContain('contact@email.openplanner.fr')
    })
})
