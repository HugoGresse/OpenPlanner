import firebase from 'firebase-admin'
import { EventDao } from '../../dao/eventDao'
import { SessionDao } from '../../dao/sessionDao'
import { SpeakerDao } from '../../dao/speakerDao'
import { SponsorDao } from '../../dao/sponsorDao'
import { FaqDao } from '../../dao/faqDao'

export type ToolDefinition = {
    type: 'function'
    function: {
        name: string
        description: string
        parameters: object
    }
}

const stripPrivateSpeakerFields = (speaker: any) => {
    const { email, phone, note, ...rest } = speaker
    return rest
}

const stripPrivateSessionFields = (session: any) => {
    const { note, ...rest } = session
    return rest
}

export const READ_ONLY_TOOLS: ToolDefinition[] = [
    {
        type: 'function',
        function: {
            name: 'listSessions',
            description:
                'List all sessions for the current event. Returns title, abstract, speakers IDs, dates, track, format, category. Private notes are stripped.',
            parameters: {
                type: 'object',
                additionalProperties: false,
                properties: {
                    trackId: { type: 'string' },
                    categoryId: { type: 'string' },
                    format: { type: 'string' },
                    language: { type: 'string' },
                    limit: { type: 'integer', minimum: 1, maximum: 500 },
                },
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'getSession',
            description: 'Fetch a single session by ID. Private notes are stripped.',
            parameters: {
                type: 'object',
                additionalProperties: false,
                required: ['sessionId'],
                properties: { sessionId: { type: 'string' } },
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'listSpeakers',
            description: 'List all speakers for the current event. Private fields (email, phone, note) are stripped.',
            parameters: {
                type: 'object',
                additionalProperties: false,
                properties: {
                    limit: { type: 'integer', minimum: 1, maximum: 500 },
                },
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'getSpeaker',
            description: 'Fetch a single speaker by ID. Private fields stripped unless includePrivate=true.',
            parameters: {
                type: 'object',
                additionalProperties: false,
                required: ['speakerId'],
                properties: {
                    speakerId: { type: 'string' },
                    includePrivate: { type: 'boolean' },
                },
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'listSponsors',
            description: 'List sponsor categories with their sponsors for the current event.',
            parameters: { type: 'object', additionalProperties: false, properties: {} },
        },
    },
    {
        type: 'function',
        function: {
            name: 'getEvent',
            description:
                'Fetch the event document (name, dates, location, theme, tracks/formats/categories, custom-field schemas).',
            parameters: { type: 'object', additionalProperties: false, properties: {} },
        },
    },
    {
        type: 'function',
        function: {
            name: 'getFaq',
            description: 'List the full FAQ (categories + their items) for the current event.',
            parameters: { type: 'object', additionalProperties: false, properties: {} },
        },
    },
]

export const executeTool = async (
    firebaseApp: firebase.app.App,
    eventId: string,
    name: string,
    args: Record<string, any>
): Promise<unknown> => {
    switch (name) {
        case 'listSessions': {
            let sessions = await SessionDao.getSessions(firebaseApp, eventId)
            if (args.trackId) sessions = sessions.filter((s: any) => s.trackId === args.trackId)
            if (args.categoryId) sessions = sessions.filter((s: any) => s.category === args.categoryId)
            if (args.format) sessions = sessions.filter((s: any) => s.format === args.format)
            if (args.language) sessions = sessions.filter((s: any) => s.language === args.language)
            const limit = typeof args.limit === 'number' ? Math.min(args.limit, 500) : 200
            return sessions.slice(0, limit).map(stripPrivateSessionFields)
        }
        case 'getSession': {
            const sessions = await SessionDao.getSessions(firebaseApp, eventId)
            const session = sessions.find((s: any) => s.id === args.sessionId)
            if (!session) return { error: 'Session not found' }
            return stripPrivateSessionFields(session)
        }
        case 'listSpeakers': {
            const speakers = await SpeakerDao.getSpeakers(firebaseApp, eventId)
            const limit = typeof args.limit === 'number' ? Math.min(args.limit, 500) : 200
            return speakers.slice(0, limit).map(stripPrivateSpeakerFields)
        }
        case 'getSpeaker': {
            const speakers = await SpeakerDao.getSpeakers(firebaseApp, eventId)
            const speaker = speakers.find((s: any) => s.id === args.speakerId)
            if (!speaker) return { error: 'Speaker not found' }
            return args.includePrivate ? speaker : stripPrivateSpeakerFields(speaker)
        }
        case 'listSponsors':
            return await SponsorDao.getSponsors(firebaseApp, eventId)
        case 'getEvent':
            return await EventDao.getEvent(firebaseApp, eventId)
        case 'getFaq':
            return await FaqDao.getFullFaqs(firebaseApp, eventId)
        default:
            return { error: `Unknown tool: ${name}` }
    }
}
