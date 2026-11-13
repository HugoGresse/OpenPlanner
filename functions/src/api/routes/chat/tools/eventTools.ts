import { EventDao } from '../../../dao/eventDao'
import { Event } from '../../../../types'
import { toEventDetails } from '../../event/getEventDetailsGET'
import { TypeBoxPatchEvent } from '../../event/patchEventPATCH'
import {
    ChatTool,
    checkDateBounds,
    endpointFor,
    objectSchema,
    parseBody,
    proposed,
    RATIONALE_PARAM,
    rejected,
    snapshot,
    toJsonSchema,
} from '../toolKit'

// The GET /event/details DTO without `files`: the private export path is a capability URL to speaker contacts.
const toToolEvent = (event: Event) => {
    const { files: _files, ...details } = toEventDetails(event)
    return details
}

export const EVENT_TOOLS: ChatTool[] = [
    {
        type: 'read',
        name: 'getEvent',
        capabilities: ['event.get'],
        description:
            'Fetch the event settings, same as GET /event/details: name, dates, timezone, location, theme, tracks / formats / categories (their ids are what sessions reference), custom-field schemas, public flags. Secrets and export paths are never included.',
        parameters: objectSchema({}),
        run: async ({ firebaseApp, eventId }) => toToolEvent(await EventDao.getEvent(firebaseApp, eventId)),
    },
    {
        type: 'proposal',
        name: 'proposePatchEvent',
        kind: 'patchEvent',
        capabilities: ['event.update'],
        description:
            'Propose a partial update to event-level settings (name, dates, location, theme, tracks/formats/categories, custom-field schemas, public flags). Array fields REPLACE the stored list: read them with getEvent, edit, and send the full list back unchanged apart from your edit. Dates are ISO 8601 with a UTC offset. Does NOT apply the change: emits a proposal for user review.',
        parameters: objectSchema({ patch: toJsonSchema(TypeBoxPatchEvent), rationale: RATIONALE_PARAM }, ['patch']),
        build: async ({ firebaseApp, eventId }, args) => {
            const parsed = parseBody(TypeBoxPatchEvent, args?.patch, { nonEmpty: true })
            if (parsed.error !== undefined) return rejected(parsed.error)
            const patch = parsed.value
            const dateError = checkDateBounds(patch.dates)
            if (dateError) return rejected(dateError)
            const event = toToolEvent(await EventDao.getEvent(firebaseApp, eventId))
            return proposed(args, {
                summary: `Update event ${event.name || eventId}`,
                endpoint: endpointFor('event.update', { eventId }, patch),
                target: { id: eventId, label: event.name || eventId },
                diff: { before: snapshot(event, Object.keys(patch)), after: patch },
            })
        },
    },
    {
        type: 'proposal',
        name: 'proposeDeployEvent',
        kind: 'deployEvent',
        capabilities: ['publish.deploy'],
        description:
            'Propose "Update website": regenerate the public/private JSON exports and call the event webhooks, so the public site shows the latest changes. Does NOT apply: the user confirms. Propose it once, after the content changes are applied, never in the same batch as the changes it should publish.',
        parameters: objectSchema({ rationale: RATIONALE_PARAM }),
        build: async ({ firebaseApp, eventId }, args) => {
            const event = await EventDao.getEvent(firebaseApp, eventId)
            return proposed(args, {
                summary: `Update the website of ${event.name || eventId}`,
                endpoint: endpointFor('publish.deploy', { eventId }),
                target: { id: eventId, label: event.name || eventId },
                diff: { before: {}, after: {} },
            })
        },
    },
]
