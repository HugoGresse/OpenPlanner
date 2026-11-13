import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { Command } from 'commander'
import { describe, expect, test } from 'vitest'
import { bundledSkillDir } from './commands/skill.js'
import { buildProgram } from './program.js'

// capabilities.md is generated from the API's capability inventory (functions/src/api/routes/chat/capabilities/).
const CLI_COLUMN = 3
// Commands about the CLI itself, not event capabilities.
const TOOLING_GROUPS = ['config', 'skill', 'api', 'openapi', 'hello']

const leafCommands = (command: Command, prefix: string[] = []): string[] =>
    command.commands.flatMap((child) => {
        const path = [...prefix, child.name()]
        return child.commands.length > 0 ? leafCommands(child, path) : [path.join(' ')]
    })

const documentedCommands = (): string[] =>
    readFileSync(join(bundledSkillDir(), 'capabilities.md'), 'utf8')
        .split('\n')
        .filter((line) => line.startsWith('|'))
        .slice(2)
        .map((line) => line.split('|').slice(1, -1)[CLI_COLUMN].trim().replaceAll('`', ''))
        .filter((cell) => cell !== '—')

describe('CLI commands and the capability inventory', () => {
    const commands = leafCommands(buildProgram())
    const documented = documentedCommands()

    test('every command the inventory names exists in the CLI', () => {
        expect(documented.length).toBeGreaterThan(40)
        expect(documented.filter((command) => !commands.includes(command))).toEqual([])
    })

    test('every event command of the CLI is in the inventory', () => {
        const undocumented = commands.filter(
            (command) => !TOOLING_GROUPS.includes(command.split(' ')[0]) && !documented.includes(command)
        )
        expect(undocumented, 'add a capability in functions/src/api/routes/chat/capabilities/').toEqual([])
    })
})
