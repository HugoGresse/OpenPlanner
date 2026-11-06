import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from 'vitest'
import { bundledSkillDir, skillTargets } from './skill.js'

test('bundled skill ships with the package', () => {
    expect(existsSync(join(bundledSkillDir(), 'SKILL.md'))).toBe(true)
})

test('skillTargets picks agents and base directory', () => {
    expect(skillTargets({}, '/repo').map((t) => t.agent)).toEqual(['claude', 'codex'])
    expect(skillTargets({ codex: true, project: true }, '/repo')).toEqual([
        { agent: 'codex', dir: '/repo/.agents/skills/openplanner' },
    ])
})
