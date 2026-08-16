import {
    BuildingBlock,
    BuildingBlockImageValue,
    BuildingBlockItem,
    BuildingBlockLinkValue,
} from '../../../../../../src/types'
import { JsonBlocks } from './jsonTypes'

const orderOf = (order: number | undefined | null, fallback: number): number =>
    typeof order === 'number' && !isNaN(order) ? order : fallback

const serializeItemValue = (block: BuildingBlock, item: BuildingBlockItem): unknown => {
    switch (block.type) {
        case 'markdown':
            return String(item.value ?? '')
        case 'image': {
            const value = (item.value ?? {}) as BuildingBlockImageValue
            return { url: value.url ?? '', alt: value.alt ?? null }
        }
        case 'link': {
            const value = (item.value ?? {}) as BuildingBlockLinkValue
            return {
                label: value.label ?? '',
                href: value.href ?? '',
                icon: value.icon ?? null,
                type: value.type ?? null,
            }
        }
        case 'json':
            try {
                return JSON.parse(String(item.value))
            } catch (error) {
                console.warn(`serializeBlocks: invalid JSON in block "${block.page}/${block.key}", exporting null`)
                return null
            }
    }
}

export const serializeBlockValue = (block: BuildingBlock): unknown => {
    const items = [...(block.items || [])].sort(
        (a, b) => orderOf(a.order, block.items.indexOf(a)) - orderOf(b.order, block.items.indexOf(b))
    )

    switch (block.variant) {
        case 'single':
            return items.length ? serializeItemValue(block, items[0]) : null
        case 'list':
            return items.map((item) => serializeItemValue(block, item))
        case 'map': {
            const out: Record<string, unknown> = {}
            for (const item of items) {
                if (!item.key) {
                    console.warn(`serializeBlocks: item without key in map block "${block.page}/${block.key}", skipped`)
                    continue
                }
                if (item.key in out) {
                    console.warn(
                        `serializeBlocks: duplicate item key "${item.key}" in block "${block.page}/${block.key}", last wins`
                    )
                }
                out[item.key] = serializeItemValue(block, item)
            }
            return out
        }
    }
}

// Builds the exported `blocks` object: blocks.{page}.{key} or blocks.{page}.{group}.{key}.
// Deterministic: blocks are processed in (page, group, order, key) order so key
// collisions (hand-edited data — the UI prevents them) resolve last-wins.
export const serializeBlocks = (blocks: BuildingBlock[]): JsonBlocks => {
    const enabledBlocks = blocks
        .filter((block) => block.enabled !== false)
        .sort(
            (a, b) =>
                a.page.localeCompare(b.page) ||
                (a.group ?? '').localeCompare(b.group ?? '') ||
                orderOf(a.order, 0) - orderOf(b.order, 0) ||
                a.key.localeCompare(b.key)
        )

    const output: JsonBlocks = {}
    const groupKeys = new Set<string>()

    for (const block of enabledBlocks) {
        const page = (output[block.page] ??= {})
        const level = `${block.page}/${block.group ?? ''}`

        let target: Record<string, unknown> = page
        if (block.group) {
            const groupLevel = `${block.page}/${block.group}`
            if (!groupKeys.has(groupLevel) && block.group in page) {
                console.warn(
                    `serializeBlocks: group "${block.group}" collides with a block key in page "${block.page}", group wins`
                )
            }
            groupKeys.add(groupLevel)
            if (typeof page[block.group] !== 'object' || Array.isArray(page[block.group])) {
                page[block.group] = {}
            }
            target = page[block.group] as Record<string, unknown>
        }

        if (block.key in target || (!block.group && groupKeys.has(`${block.page}/${block.key}`))) {
            console.warn(`serializeBlocks: duplicate key "${block.key}" at level "${level}", last wins`)
        }
        target[block.key] = serializeBlockValue(block)
    }

    return output
}
