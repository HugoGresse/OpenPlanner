import { Event } from '../../../types'

export type SlackEventPick = { kind: 'event'; event: Event } | { kind: 'none' } | { kind: 'ambiguous'; events: Event[] }

export const pickEventForSlackChannel = (events: Event[], channelId: string | undefined): SlackEventPick => {
    const byChannel = channelId ? events.find((e) => e.slackChannelId === channelId) : undefined
    if (byChannel) return { kind: 'event', event: byChannel }
    if (events.length === 1) return { kind: 'event', event: events[0] }
    const unassigned = events.filter((e) => !e.slackChannelId)
    if (unassigned.length === 1) return { kind: 'event', event: unassigned[0] }
    return events.length === 0 ? { kind: 'none' } : { kind: 'ambiguous', events }
}

export const describeSlackPickFailure = (pick: Exclude<SlackEventPick, { kind: 'event' }>): string => {
    if (pick.kind === 'none') {
        return 'No OpenPlanner event is linked to this Slack workspace. Open your event → Integration & API → Slack and click "Add to Slack".'
    }
    const names = pick.events.map((e) => `• ${e.name}`).join('\n')
    return `Several OpenPlanner events are linked to this workspace, and none is assigned to this channel. Pick a channel for each event under Integration & API → Slack:\n${names}`
}

export const ACTION_VALUE_SEPARATOR = '|'

export const encodeActionValue = (eventId: string, id: string) => `${eventId}${ACTION_VALUE_SEPARATOR}${id}`

export const decodeActionValue = (value: string | undefined): { eventId: string; id: string } | null => {
    if (!value) return null
    const index = value.indexOf(ACTION_VALUE_SEPARATOR)
    if (index <= 0 || index === value.length - 1) return null
    return { eventId: value.slice(0, index), id: value.slice(index + 1) }
}
