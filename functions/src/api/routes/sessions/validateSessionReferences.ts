import { Event } from '../../../types'

type References = { trackId?: string | null; format?: string | null; category?: string | null }

const LISTS: Array<[keyof References, 'tracks' | 'formats' | 'categories']> = [
    ['trackId', 'tracks'],
    ['format', 'formats'],
    ['category', 'categories'],
]

// Returns a message naming the first reference that is not defined on the event, or null when all resolve.
export const findInvalidSessionReference = (event: Event, references: References): string | null => {
    for (const [field, list] of LISTS) {
        const value = references[field]
        if (!value) continue
        const items = event[list] || []
        if (items.some((item) => item.id === value)) continue
        const valid = items.map((item) => item.id).join(', ') || 'none defined on the event'
        return `Unknown ${field} "${value}". Valid ids: ${valid}`
    }
    return null
}
