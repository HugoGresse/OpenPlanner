import { describe, expect, test, vi, beforeEach } from 'vitest'
import { generateStaticJson } from './generateStaticJson'
import { SessionDao } from '../../../dao/sessionDao'
import { SpeakerDao } from '../../../dao/speakerDao'
import { SponsorDao } from '../../../dao/sponsorDao'
import { TeamDao } from '../../../dao/teamDao'
import { FaqDao } from '../../../dao/faqDao'
import { JobPostDao } from '../../../dao/jobPostDao'
import { TicketDao } from '../../../dao/ticketDao'
import { BlockDao } from '../../../dao/blockDao'
import { Event } from '../../../../types'
import { BuildingBlock } from '../../../../../../src/types'

const event = {
    id: 'evt-1',
    name: 'Test Event',
    scheduleVisible: true,
    dates: { start: new Date('2026-01-01T09:00:00Z'), end: new Date('2026-01-02T18:00:00Z') },
    formats: [],
    categories: [],
    tracks: [],
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    timezone: 'Europe/Paris',
    enableVoxxrin: false,
} as unknown as Event

const firebaseApp = {} as any

beforeEach(() => {
    vi.spyOn(SessionDao, 'getSessions').mockResolvedValue([])
    vi.spyOn(SpeakerDao, 'getSpeakers').mockResolvedValue([])
    vi.spyOn(SponsorDao, 'getSponsors').mockResolvedValue([])
    vi.spyOn(TeamDao, 'getTeams').mockResolvedValue({ team: [], teams: [] })
    vi.spyOn(FaqDao, 'getFullFaqs').mockResolvedValue([])
    vi.spyOn(JobPostDao, 'getAllJobPosts').mockResolvedValue([])
    vi.spyOn(BlockDao, 'getBlocks').mockResolvedValue([])
})

describe('generateStaticJson tickets node', () => {
    test('includes tickets in both public and private outputs', async () => {
        vi.spyOn(TicketDao, 'getTickets').mockResolvedValue([
            {
                id: 't1',
                name: 'Early Bird',
                price: 100,
                currency: 'EUR',
                url: 'https://example.com/t1',
                ticketsCount: 50,
                available: true,
                soldOut: false,
                highlighted: true,
                displayNewsletterRegistration: false,
                startDate: '2026-01-01T00:00:00.000+00:00',
                endDate: null,
                message: '',
            },
        ])

        const { outputPublic, outputPrivate } = await generateStaticJson(firebaseApp, event)

        expect(outputPublic.tickets).toHaveLength(1)
        expect(outputPrivate.tickets).toHaveLength(1)
        const ticket = outputPublic.tickets[0]
        expect(ticket.id).toBe('t1')
        expect(ticket.currency).toBe('EUR')
        expect(typeof ticket.startDate).toBe('string')
        expect(ticket.endDate).toBeNull()
    })

    test('normalizes Firestore Timestamp dates to ISO strings', async () => {
        vi.spyOn(TicketDao, 'getTickets').mockResolvedValue([
            {
                id: 't2',
                name: 'Regular',
                price: 200,
                currency: 'USD',
                url: 'https://example.com/t2',
                ticketsCount: 100,
                available: true,
                soldOut: false,
                highlighted: false,
                displayNewsletterRegistration: false,
                startDate: { toDate: () => new Date('2026-02-01T10:00:00Z') } as any,
                endDate: { toDate: () => new Date('2026-02-10T10:00:00Z') } as any,
                message: '',
            },
        ])

        const { outputPublic } = await generateStaticJson(firebaseApp, event)
        const ticket = outputPublic.tickets[0]
        expect(ticket.startDate).toContain('2026-02-01')
        expect(ticket.endDate).toContain('2026-02-10')
    })

    test('emits an empty tickets array when there are no tickets', async () => {
        vi.spyOn(TicketDao, 'getTickets').mockResolvedValue([])

        const { outputPublic, outputPrivate } = await generateStaticJson(firebaseApp, event)
        expect(outputPublic.tickets).toEqual([])
        expect(outputPrivate.tickets).toEqual([])
    })
})

describe('generateStaticJson voxxrin warnings', () => {
    test('surfaces the voxxrin warnings when voxxrin is enabled and logoUrl is missing', async () => {
        vi.spyOn(TicketDao, 'getTickets').mockResolvedValue([])
        vi.spyOn(console, 'warn').mockImplementation(() => undefined)

        const voxxrinEvent = { ...event, enableVoxxrin: true } as unknown as Event
        const { outputVoxxrin, warnings } = await generateStaticJson(firebaseApp, voxxrinEvent)

        expect(outputVoxxrin).toBeNull()
        expect(warnings).toEqual(['Voxxrin: no logoUrl set in the event settings'])
    })

    test('returns no warnings when voxxrin is disabled', async () => {
        vi.spyOn(TicketDao, 'getTickets').mockResolvedValue([])

        const { outputVoxxrin, warnings } = await generateStaticJson(firebaseApp, event)

        expect(outputVoxxrin).toBeNull()
        expect(warnings).toEqual([])
    })
})

describe('generateStaticJson blocks node', () => {
    test('includes serialized blocks identically in public and private outputs', async () => {
        vi.spyOn(TicketDao, 'getTickets').mockResolvedValue([])
        const blocks: BuildingBlock[] = [
            {
                id: 'b1',
                page: 'home',
                group: null,
                key: 'hero',
                name: 'Hero',
                type: 'markdown',
                variant: 'single',
                enabled: true,
                order: 0,
                items: [{ id: 'i1', key: null, order: 0, value: '# Welcome' }],
            },
            {
                id: 'b2',
                page: 'home',
                group: null,
                key: 'hidden',
                name: 'Hidden',
                type: 'markdown',
                variant: 'single',
                enabled: false,
                order: 1,
                items: [{ id: 'i2', key: null, order: 0, value: 'nope' }],
            },
        ]
        vi.spyOn(BlockDao, 'getBlocks').mockResolvedValue(blocks)

        const { outputPublic, outputPrivate } = await generateStaticJson(firebaseApp, event)
        expect(outputPublic.blocks).toEqual({ home: { hero: '# Welcome' } })
        expect(outputPrivate.blocks).toEqual(outputPublic.blocks)
    })

    test('emits an empty blocks object when there are none', async () => {
        vi.spyOn(TicketDao, 'getTickets').mockResolvedValue([])

        const { outputPublic } = await generateStaticJson(firebaseApp, event)
        expect(outputPublic.blocks).toEqual({})
    })
})
