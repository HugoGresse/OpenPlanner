import {
    BuildingBlock,
    BuildingBlockItem,
    BuildingBlockItemType,
    BuildingBlockItemValue,
    BuildingBlockVariant,
} from '../../../types'
import { generateFirestoreId } from '../../../utils/generateFirestoreId'

// utils/slugify is not idempotent (it strips dashes, so re-slugifying 'hero-section'
// gives 'herosection'). Keys get their own idempotent slugifier + regex validation.
export const slugifyBlockKey = (value: string): string =>
    value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')

// The editable subset of a block held in the BlockCard local buffer
export type BlockDraft = Pick<BuildingBlock, 'name' | 'key' | 'group' | 'items'>

export const blockExportPath = (page: string, group: string | null, key: string): string =>
    ['blocks', page, group, key].filter(Boolean).join('.')

export const groupBlocksByPage = (blocks: BuildingBlock[]): [string, BuildingBlock[]][] => {
    const pages = new Map<string, BuildingBlock[]>()
    for (const block of blocks) {
        const pageBlocks = pages.get(block.page) || []
        pageBlocks.push(block)
        pages.set(block.page, pageBlocks)
    }
    return [...pages.entries()].sort(([a], [b]) => a.localeCompare(b))
}

// Segments = the reorder scopes: the ungrouped blocks first, then one segment per group
export const segmentBlocksByGroup = (
    pageBlocks: BuildingBlock[]
): { group: string | null; blocks: BuildingBlock[] }[] => {
    const segments = new Map<string, BuildingBlock[]>()
    for (const block of pageBlocks) {
        const groupKey = block.group || ''
        const segmentBlocks = segments.get(groupKey) || []
        segmentBlocks.push(block)
        segments.set(groupKey, segmentBlocks)
    }
    return [...segments.entries()]
        .sort(([a], [b]) => a.localeCompare(b)) // '' (no group) first, then groups alphabetically
        .map(([group, blocks]) => ({ group: group || null, blocks }))
}

export const emptyItemValue = (type: BuildingBlockItemType): BuildingBlockItemValue => {
    switch (type) {
        case 'markdown':
            return ''
        case 'image':
            return { url: '', alt: null }
        case 'link':
            return { label: '', href: '', icon: null, type: null }
        case 'json':
            return '{}'
    }
}

export const createBlockItem = (
    type: BuildingBlockItemType,
    variant: BuildingBlockVariant,
    order: number
): BuildingBlockItem => ({
    id: generateFirestoreId(),
    key: variant === 'map' ? '' : null,
    order,
    value: emptyItemValue(type),
})

export const isValidSlug = (value: string): boolean => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(value)

export const jsonItemError = (value: BuildingBlockItemValue): string | null => {
    try {
        JSON.parse(String(value))
        return null
    } catch (error) {
        return error instanceof Error ? error.message : 'Invalid JSON'
    }
}

// Keys already used at a (page, group) level: sibling block keys plus, at page level, group names
export const usedKeysAtLevel = (
    blocks: BuildingBlock[],
    page: string,
    group: string | null,
    excludedBlockId: string | null
): Set<string> => {
    const used = new Set<string>()
    for (const block of blocks) {
        if (block.page !== page || block.id === excludedBlockId) continue
        if ((block.group || null) === group) {
            used.add(block.key)
        }
        if (group === null && block.group) {
            used.add(block.group)
        }
    }
    return used
}

export const validateBlockDraft = (
    draft: { page: string; group: string | null; key: string; type: BuildingBlockItemType; items: BuildingBlockItem[] },
    allBlocks: BuildingBlock[],
    excludedBlockId: string | null
): string[] => {
    const errors: string[] = []
    const group = draft.group || null

    if (!isValidSlug(draft.key)) {
        errors.push('Key must be a non-empty slug (lowercase letters, numbers and dashes)')
    }
    if (group && !isValidSlug(group)) {
        errors.push('Group must be a slug (lowercase letters, numbers and dashes)')
    }
    if (usedKeysAtLevel(allBlocks, draft.page, group, excludedBlockId).has(draft.key)) {
        errors.push(`Key "${draft.key}" is already used at this level`)
    }
    if (group) {
        const pageLevelKeys = usedKeysAtLevel(allBlocks, draft.page, null, excludedBlockId)
        if (pageLevelKeys.has(group) && !allBlocks.some((b) => b.page === draft.page && b.group === group)) {
            errors.push(`Group "${group}" collides with a block key on this page`)
        }
    }

    if (draft.type === 'json') {
        for (const item of draft.items) {
            const jsonError = jsonItemError(item.value)
            if (jsonError) {
                errors.push(`Invalid JSON in one item: ${jsonError}`)
                break
            }
        }
    }

    const mapKeys = draft.items.map((item) => item.key).filter((key): key is string => key !== null)
    if (mapKeys.some((key) => !isValidSlug(key))) {
        errors.push('Every map item needs a non-empty slug key')
    }
    if (new Set(mapKeys).size !== mapKeys.length) {
        errors.push('Map item keys must be unique')
    }

    return errors
}
