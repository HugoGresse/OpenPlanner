import { Event } from '../../types'

export type EventCategory = 'active' | 'upcoming' | 'past' | 'unscheduled'

export const EVENT_CATEGORY_ORDER: EventCategory[] = ['active', 'upcoming', 'unscheduled', 'past']

export const EVENT_CATEGORY_LABEL: Record<EventCategory, string> = {
    active: 'Happening now',
    upcoming: 'Upcoming',
    unscheduled: 'Without dates',
    past: 'Past',
}

export const getEventCategory = (event: Event, now: Date = new Date()): EventCategory => {
    const startMs = event.dates.start?.getTime() ?? null
    const endMs = event.dates.end?.getTime() ?? null
    if (startMs === null && endMs === null) return 'unscheduled'
    const nowMs = now.getTime()
    if (startMs !== null && endMs !== null) {
        if (startMs <= nowMs && nowMs <= endMs) return 'active'
        return startMs > nowMs ? 'upcoming' : 'past'
    }
    if (startMs !== null) return startMs > nowMs ? 'upcoming' : 'past'
    return endMs! < nowMs ? 'past' : 'upcoming'
}

export const groupEventsByCategory = (events: Event[]): Record<EventCategory, Event[]> => {
    const groups: Record<EventCategory, Event[]> = {
        active: [],
        upcoming: [],
        unscheduled: [],
        past: [],
    }
    const now = new Date()
    for (const event of events) {
        groups[getEventCategory(event, now)].push(event)
    }
    groups.active.sort(byStartAscending)
    groups.upcoming.sort(byStartAscending)
    groups.past.sort(byStartDescending)
    groups.unscheduled.sort(byNameAscending)
    return groups
}

const byStartAscending = (a: Event, b: Event) =>
    (a.dates.start?.getTime() ?? Number.POSITIVE_INFINITY) - (b.dates.start?.getTime() ?? Number.POSITIVE_INFINITY)

const byStartDescending = (a: Event, b: Event) => (b.dates.start?.getTime() ?? 0) - (a.dates.start?.getTime() ?? 0)

const byNameAscending = (a: Event, b: Event) => a.name.localeCompare(b.name)
