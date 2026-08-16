import { describe, expect, test, vi } from 'vitest'
import { serializeBlocks } from './serializeBlocks'
import { BuildingBlock, BuildingBlockItem } from '../../../../../../src/types'

const item = (value: BuildingBlockItem['value'], order = 0, key: string | null = null): BuildingBlockItem => ({
    id: `item-${order}-${key}`,
    key,
    order,
    value,
})

const block = (overrides: Partial<BuildingBlock>): BuildingBlock => ({
    id: 'doc-id',
    page: 'home',
    group: null,
    key: 'key',
    name: 'Name',
    type: 'markdown',
    variant: 'single',
    enabled: true,
    order: 0,
    items: [],
    ...overrides,
})

describe('serializeBlocks', () => {
    test('single markdown exports the raw string, or null when empty', () => {
        const out = serializeBlocks([block({ key: 'hero', items: [item('# Welcome')] }), block({ key: 'empty' })])
        expect(out).toEqual({ home: { hero: '# Welcome', empty: null } })
    })

    test('list respects item order and normalizes image shape', () => {
        const out = serializeBlocks([
            block({
                key: 'gallery',
                type: 'image',
                variant: 'list',
                items: [
                    item({ url: 'b.png', alt: null }, 1),
                    item({ url: 'a.png', alt: 'first' }, 0),
                    item({ url: 'c.png' } as any, 2),
                ],
            }),
        ])
        expect(out.home.gallery).toEqual([
            { url: 'a.png', alt: 'first' },
            { url: 'b.png', alt: null },
            { url: 'c.png', alt: null },
        ])
    })

    test('map keys items, skips empty keys and last-wins on duplicates', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
        const out = serializeBlocks([
            block({
                key: 'links',
                type: 'link',
                variant: 'map',
                items: [
                    item({ label: 'CFP', href: 'https://cfp', icon: 'mdiSend', type: 'primary' }, 0, 'cfp'),
                    item({ label: 'Old', href: 'https://old', icon: null, type: null }, 1, 'tickets'),
                    item({ label: 'New', href: 'https://new', icon: null, type: null }, 2, 'tickets'),
                    item({ label: 'Lost', href: 'https://lost', icon: null, type: null }, 3, null),
                ],
            }),
        ])
        expect(out.home.links).toEqual({
            cfp: { label: 'CFP', href: 'https://cfp', icon: 'mdiSend', type: 'primary' },
            tickets: { label: 'New', href: 'https://new', icon: null, type: null },
        })
        expect(warn).toHaveBeenCalledTimes(2)
        warn.mockRestore()
    })

    test('json parses raw string, invalid json exports null', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
        const out = serializeBlocks([
            block({ key: 'config', type: 'json', items: [item('{"a": [1, [2, 3]]}')] }),
            block({ key: 'broken', type: 'json', items: [item('{nope')] }),
        ])
        expect(out.home.config).toEqual({ a: [1, [2, 3]] })
        expect(out.home.broken).toBeNull()
        expect(warn).toHaveBeenCalledOnce()
        warn.mockRestore()
    })

    test('group adds one nesting level', () => {
        const out = serializeBlocks([
            block({ key: 'hero', items: [item('# Hi')] }),
            block({ key: 'links', group: 'footer', variant: 'list', items: [item('a'), item('b', 1)] }),
            block({ page: 'venue', key: 'address', items: [item('Street 1')] }),
        ])
        expect(out).toEqual({
            home: { hero: '# Hi', footer: { links: ['a', 'b'] } },
            venue: { address: 'Street 1' },
        })
    })

    test('disabled blocks are excluded, missing enabled means enabled', () => {
        const out = serializeBlocks([
            block({ key: 'on', items: [item('yes')] }),
            block({ key: 'off', enabled: false, items: [item('no')] }),
            block({ key: 'legacy', enabled: undefined as any, items: [item('legacy')] }),
        ])
        expect(out).toEqual({ home: { on: 'yes', legacy: 'legacy' } })
    })

    test('duplicate block key at the same level resolves last-wins by order', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
        const out = serializeBlocks([
            block({ id: 'b', key: 'hero', order: 1, items: [item('second')] }),
            block({ id: 'a', key: 'hero', order: 0, items: [item('first')] }),
        ])
        expect(out.home.hero).toBe('second')
        expect(warn).toHaveBeenCalledOnce()
        warn.mockRestore()
    })

    test('empty input and empty variants keep stable shapes', () => {
        expect(serializeBlocks([])).toEqual({})
        const out = serializeBlocks([block({ key: 'list', variant: 'list' }), block({ key: 'map', variant: 'map' })])
        expect(out.home.list).toEqual([])
        expect(out.home.map).toEqual({})
    })

    test('missing order falls back without dropping blocks', () => {
        const out = serializeBlocks([
            block({ key: 'a', order: undefined as any, items: [item('a')] }),
            block({ key: 'b', order: 1, items: [item('b')] }),
        ])
        expect(out).toEqual({ home: { a: 'a', b: 'b' } })
    })
})
