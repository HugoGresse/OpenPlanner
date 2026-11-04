import { cpSync, existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, rmSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Command } from 'commander'
import { fail, printResult } from '../output.js'

const SKILL_NAME = 'openplanner'

export const bundledSkillDir = (): string =>
    resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', 'skills', SKILL_NAME)

type Target = { agent: 'claude' | 'codex'; dir: string }

export const skillTargets = (
    options: { claude?: boolean; codex?: boolean; project?: boolean },
    cwd = process.cwd()
): Target[] => {
    const both = !options.claude && !options.codex
    const base = options.project ? cwd : homedir()
    const targets: Target[] = []
    if (both || options.claude) targets.push({ agent: 'claude', dir: join(base, '.claude', 'skills', SKILL_NAME) })
    if (both || options.codex) targets.push({ agent: 'codex', dir: join(base, '.agents', 'skills', SKILL_NAME) })
    return targets
}

const installInto = (source: string, target: Target): Target & { status: 'copied' | 'already-linked' } => {
    if (existsSync(target.dir) && realpathSync(target.dir) === realpathSync(source)) {
        return { ...target, status: 'already-linked' }
    }
    mkdirSync(dirname(target.dir), { recursive: true })
    if (existsSync(target.dir) || isDanglingLink(target.dir)) rmSync(target.dir, { recursive: true, force: true })
    cpSync(source, target.dir, { recursive: true })
    return { ...target, status: 'copied' }
}

const isDanglingLink = (path: string): boolean => {
    try {
        return lstatSync(path).isSymbolicLink()
    } catch {
        return false
    }
}

export const registerSkill = (program: Command): void => {
    const skill = program
        .command('skill')
        .description('Agent skill (SKILL.md) teaching Claude Code / Codex how to use this CLI')

    skill
        .command('print')
        .description('Print the bundled SKILL.md')
        .action(() => {
            process.stdout.write(readFileSync(join(bundledSkillDir(), 'SKILL.md'), 'utf8'))
        })

    skill
        .command('install')
        .description('Copy the skill into ~/.claude/skills and ~/.agents/skills (Codex), or into the current project')
        .option('--claude', 'Only Claude Code')
        .option('--codex', 'Only Codex')
        .option('--project', 'Install into ./.claude/skills and ./.agents/skills instead of the home directory')
        .action((options: { claude?: boolean; codex?: boolean; project?: boolean }) => {
            const source = bundledSkillDir()
            if (!existsSync(join(source, 'SKILL.md'))) return fail(new Error(`Bundled skill not found at ${source}`))
            printResult({ installed: skillTargets(options).map((target) => installInto(source, target)) })
        })
}
