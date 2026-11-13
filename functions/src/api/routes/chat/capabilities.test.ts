import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, test } from 'vitest'
import { PROPOSAL_KINDS } from '../../../../../src/events/page/chat/proposalKinds'
import { setupFastify } from '../../setupFastify'
import { Capability, CAPABILITIES, NON_CAPABILITY_ROUTES, routeKey } from './capabilities'
import { assistantGapLines, renderCapabilitiesDoc, renderSkillBlock, toolsForCapability } from './capabilityDocs'
import { buildSystemPrompt } from './chatAgent'
import { CHAT_TOOLS } from './tools'

const ALL: readonly Capability[] = CAPABILITIES
const SKILL_DIR = resolve(__dirname, '../../../../../cli/skills/openplanner')

const registeredRoutes = async (): Promise<string[]> => {
    const routes: string[] = []
    const fastify = setupFastify({
        onRoute: (route) => {
            for (const method of ([] as string[]).concat(route.method)) {
                if (method !== 'HEAD') routes.push(`${method} ${route.url}`)
            }
        },
    })
    await fastify.ready()
    await fastify.close()
    return routes
}

// Prettier re-aligns markdown tables and list markers: compare the content, not the padding.
const normalizeMarkdown = (text: string) =>
    text
        .split('\n')
        .map((line) =>
            line
                .replace(/\s*\|\s*/g, '|')
                .replace(/-{3,}/g, '---')
                .replace(/^-\s+/, '- ')
                .trim()
        )
        .join('\n')

const readSkillFile = (name: string) => normalizeMarkdown(readFileSync(resolve(SKILL_DIR, name), 'utf8'))

describe('capability inventory', () => {
    test('every registered route is a capability or explicitly excluded, and every listed route exists', async () => {
        const routes = await registeredRoutes()
        const inventoried = ALL.flatMap((capability) => (capability.route ? [routeKey(capability.route)] : []))
        const missing = routes.filter((route) => !inventoried.includes(route) && !(route in NON_CAPABILITY_ROUTES))
        expect(missing, 'add these routes to capabilities/ (or NON_CAPABILITY_ROUTES)').toEqual([])
        expect(inventoried.filter((route) => !routes.includes(route))).toEqual([])
        expect(Object.keys(NON_CAPABILITY_ROUTES).filter((route) => !routes.includes(route))).toEqual([])
        expect(inventoried.filter((route) => route in NON_CAPABILITY_ROUTES)).toEqual([])
        expect(new Set(inventoried).size).toBe(inventoried.length)
    })

    test('ids are unique and each capability has an assistant tool or a documented gap, never both', () => {
        const ids = ALL.map((capability) => capability.id)
        expect(new Set(ids).size).toBe(ids.length)
        const inconsistent = ALL.filter(
            (capability) => toolsForCapability(capability.id).length > 0 === Boolean(capability.assistantGap)
        ).map((capability) => capability.id)
        expect(inconsistent, 'give these a tool or an assistantGap (not both)').toEqual([])
    })

    test('every chat tool is unique and points at known capabilities', () => {
        const names = CHAT_TOOLS.map((tool) => tool.name)
        expect(new Set(names).size).toBe(names.length)
        for (const tool of CHAT_TOOLS) {
            expect(tool.capabilities.length, tool.name).toBeGreaterThan(0)
            for (const id of tool.capabilities) expect(ids()).toContain(id)
        }
    })

    test('every proposal kind has exactly one tool and write tools target a write route', () => {
        const writeTools = CHAT_TOOLS.filter((tool) => tool.type === 'proposal')
        expect(writeTools.map((tool) => tool.type === 'proposal' && tool.kind).sort()).toEqual(
            Object.keys(PROPOSAL_KINDS).sort()
        )
        for (const tool of writeTools) {
            const [capability] = tool.capabilities.map((id) => ALL.find((item) => item.id === id))
            expect(capability?.route?.method, tool.name).not.toBe('GET')
        }
    })

    test('the CLI skill docs are generated from the current inventory', () => {
        const hint = 'run `npm run capabilities:docs` in functions/'
        expect(readSkillFile('SKILL.md'), hint).toContain(normalizeMarkdown(renderSkillBlock()))
        expect(readSkillFile('capabilities.md'), hint).toBe(normalizeMarkdown(renderCapabilitiesDoc()))
    })
})

const ids = () => ALL.map((capability) => capability.id)

describe('system prompt generated from the inventory', () => {
    const prompt = buildSystemPrompt('evt', 'DevFest', 'slack')

    test('names every tool and every expected* sanity-check argument', () => {
        for (const tool of CHAT_TOOLS) expect(prompt).toContain(tool.name)
        for (const arg of ['expectedSpeakerName', 'expectedSessionTitle', 'expectedMemberName', 'expectedQuestion']) {
            expect(prompt).toContain(arg)
        }
    })

    test('lists what the assistant cannot do, with the CLI command to use instead', () => {
        expect(prompt).toContain('Not available to you')
        for (const line of assistantGapLines()) expect(prompt).toContain(line)
        expect(prompt).toMatch(/Upload files to the event storage: .*`openplanner files upload`/)
        expect(prompt).toMatch(/WhatsApp tooling is CLI \/ web admin only/)
        expect(prompt).not.toContain('This is the assistant itself')
    })

    test('the gap list is the same on both surfaces', () => {
        const tail = (text: string) => text.slice(text.indexOf('Not available to you'))
        expect(tail(buildSystemPrompt('evt', 'DevFest', 'ui'))).toBe(tail(prompt))
    })
})
