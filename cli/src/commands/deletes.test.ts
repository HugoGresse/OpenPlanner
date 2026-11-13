import { Command } from 'commander'
import { describe, expect, test } from 'vitest'
import { registerFaq } from './content.js'
import { registerSessions } from './sessions.js'
import { registerSpeakers } from './speakers.js'
import { registerSponsors } from './sponsors.js'
import { registerTeam } from './team.js'

const DELETES = [
    ['sessions', 'delete', 'sess-1'],
    ['speakers', 'delete', 'spk-1'],
    ['sponsors', 'delete', 'spo-1'],
    ['sponsors', 'delete-category', 'cat-1'],
    ['sponsors', 'job-posts', 'delete', 'job-1'],
    ['team', 'delete', 'ada'],
    ['faq', 'delete-question', 'cat-1', 'q-1'],
    ['faq', 'delete-category', 'cat-1'],
]

const buildProgram = () => {
    const program = new Command().exitOverride().configureOutput({ writeErr: () => {}, writeOut: () => {} })
    for (const register of [registerSessions, registerSpeakers, registerSponsors, registerTeam, registerFaq]) {
        register(program)
    }
    return program
}

describe('every delete command requires --yes', () => {
    test.each(DELETES)('%s %s', async (...args) => {
        const program = buildProgram()
        await expect(program.parseAsync(args, { from: 'user' })).rejects.toMatchObject({
            code: 'commander.missingMandatoryOptionValue',
        })
    })
})
