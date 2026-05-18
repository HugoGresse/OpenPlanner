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
    const { start, end } = event.dates
    if (!start && !end) return 'unscheduled'
    if (start && end && start.getTime() <= now.getTime() && now.getTime() <= end.getTime()) return 'active'
    if (start && start.getTime() > now.getTime()) return 'upcoming'
    if (end && end.getTime() < now.getTime()) return 'past'
    return 'unscheduled'
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
