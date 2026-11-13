import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { FaqDao } from '../../../dao/faqDao'
import { JobPostDao } from '../../../dao/jobPostDao'
import { SponsorDao } from '../../../dao/sponsorDao'
import { expectProposal, expectRejected, propose, read } from '../../../testUtils/chatTools'

const categories = [
    {
        id: 'gold',
        name: 'Gold',
        order: 1,
        sponsors: [
            { id: 'acme', name: 'ACME', logoUrl: 'https://acme/logo.png', jobPostToken: 'secret' },
            { id: 'globex', name: 'Globex', logoUrl: '' },
        ],
    },
]
const jobPost = { id: 'job1', title: 'Rust dev', status: 'pending', sponsorId: 'acme', createdAt: null }
const faq = [
    {
        id: 'venue',
        name: 'Venue',
        order: 0,
        share: true,
        private: false,
        items: [{ id: 'q1', question: 'Where?', answer: 'Paris', order: 0 }],
    },
    {
        id: 'speakers',
        name: 'Speakers',
        order: 1,
        share: true,
        private: true,
        privateId: 'secret-link',
        items: [{ id: 'q2', question: 'Hotel code?', answer: 'X123', order: 0 }],
    },
]

describe('sponsor and job post tools', () => {
    beforeEach(() => {
        vi.spyOn(SponsorDao, 'getSponsors').mockResolvedValue(categories as never)
        vi.spyOn(SponsorDao, 'getCategory').mockImplementation(
            async (_app, _eventId, id) => (categories.find((category) => category.id === id) ?? null) as never
        )
        vi.spyOn(SponsorDao, 'findCategoryOfSponsor').mockImplementation(
            async (_app, _eventId, sponsorId) =>
                (categories.find((category) => category.sponsors.some((sponsor) => sponsor.id === sponsorId)) ??
                    null) as never
        )
        vi.spyOn(JobPostDao, 'getAllJobPosts').mockResolvedValue([jobPost] as never)
        vi.spyOn(JobPostDao, 'getJobPost').mockResolvedValue(jobPost as never)
    })
    afterEach(() => vi.restoreAllMocks())

    test('listSponsors is the REST DTO without the job-board token', async () => {
        const result = JSON.stringify(await read('listSponsors'))
        expect(result).toContain('"id":"acme"')
        expect(result).not.toContain('secret')
    })

    test('proposeAddSponsor posts the route body and names the category', async () => {
        const proposal = expectProposal(
            await propose('proposeAddSponsor', {
                sponsor: { name: 'Initech', categoryId: 'gold', categoryName: 'Gold', website: 'https://initech.io' },
            })
        )
        expect(proposal.summary).toBe('Add sponsor Initech to Gold')
        expect(proposal.endpoint).toEqual({
            method: 'POST',
            path: '/v1/evt/sponsors',
            body: { name: 'Initech', categoryId: 'gold', categoryName: 'Gold', website: 'https://initech.io' },
        })
        expectRejected(await propose('proposeAddSponsor', { sponsor: { name: 'x' } }), /must have required/)
    })

    test('sponsor and category deletes are guarded by the name and say what goes away', async () => {
        const sponsor = expectProposal(
            await propose('proposeDeleteSponsor', { sponsorId: 'acme', expectedSponsorName: 'ACME' })
        )
        expect(sponsor.endpoint).toEqual({ method: 'DELETE', path: '/v1/evt/sponsors/acme' })
        expect(sponsor.diff.before).not.toHaveProperty('jobPostToken')
        expectRejected(
            await propose('proposeDeleteSponsor', { sponsorId: 'acme', expectedSponsorName: 'Globex' }),
            /does not match the sponsor document at acme/
        )
        const category = expectProposal(
            await propose('proposeDeleteSponsorCategory', { categoryId: 'gold', expectedCategoryName: 'Gold' })
        )
        expect(category.summary).toBe('Delete sponsor category Gold and its 2 sponsors')
        expect(category.endpoint.path).toBe('/v1/evt/sponsors/categories/gold')
        expect(category.diff).toEqual({ before: { name: 'Gold', sponsors: ['ACME', 'Globex'] }, after: null })
    })

    test('sponsor proposals read one category, never the whole collection', async () => {
        const fullRead = vi.mocked(SponsorDao.getSponsors)
        expectProposal(
            await propose('proposeAddSponsor', {
                sponsor: { name: 'Initech', categoryId: 'gold', categoryName: 'Gold' },
            })
        )
        expectProposal(
            await propose('proposeDeleteSponsorCategory', { categoryId: 'gold', expectedCategoryName: 'Gold' })
        )
        expectProposal(
            await propose('proposeDeleteSponsor', {
                sponsorId: 'acme',
                categoryId: 'gold',
                expectedSponsorName: 'ACME',
            })
        )
        expect(fullRead).not.toHaveBeenCalled()
        expect(SponsorDao.findCategoryOfSponsor).toHaveBeenCalledWith(expect.anything(), 'evt', 'acme', 'gold')
    })

    test('job post moderation is a PUT on the approval route', async () => {
        expect(await read('listJobPosts', { status: 'pending' })).toEqual([jobPost])
        const proposal = expectProposal(
            await propose('proposeSetJobPostStatus', {
                jobPostId: 'job1',
                expectedJobPostTitle: 'Rust dev',
                status: 'approved',
            })
        )
        expect(proposal.endpoint).toEqual({
            method: 'PUT',
            path: '/v1/evt/sponsors/jobPosts/job1/approval',
            body: { status: 'approved' },
        })
        expect(proposal.diff).toEqual({ before: { status: 'pending' }, after: { status: 'approved' } })
        expectRejected(
            await propose('proposeSetJobPostStatus', {
                jobPostId: 'job1',
                expectedJobPostTitle: 'Rust dev',
                status: 'live',
            }),
            /status must be equal to one of the allowed values/
        )
        expectRejected(
            await propose('proposeSetJobPostStatus', {
                jobPostId: 'job1',
                expectedJobPostTitle: 'Rust dev',
                status: 'pending',
            }),
            'Job post job1 is already pending'
        )
        const remove = expectProposal(
            await propose('proposeDeleteJobPost', { jobPostId: 'job1', expectedJobPostTitle: 'rust DEV' })
        )
        expect(remove.endpoint).toEqual({ method: 'DELETE', path: '/v1/evt/sponsors/jobPosts/job1' })
    })
})

describe('FAQ tools', () => {
    beforeEach(() => {
        vi.spyOn(FaqDao, 'getFullFaqs').mockResolvedValue(faq as never)
        vi.spyOn(FaqDao, 'getFaqCategory').mockImplementation(
            async (_app, _eventId, id) => (faq.find((category) => category.id === id) ?? null) as never
        )
        vi.spyOn(FaqDao, 'findFaqQuestionCategoryId').mockImplementation(
            async (_app, _eventId, questionId) =>
                faq.find((category) => category.items.some((item) => item.id === questionId))?.id ?? null
        )
    })
    afterEach(() => vi.restoreAllMocks())

    test('getFaq lists every category but withholds private answers and the private link id', async () => {
        const [venue, speakers] = (await read('getFaq')) as Array<Record<string, unknown>>
        expect(venue).toMatchObject({ id: 'venue', items: [{ id: 'q1', question: 'Where?', answer: 'Paris' }] })
        expect(speakers).toMatchObject({
            id: 'speakers',
            private: true,
            items: [{ id: 'q2', question: 'Hotel code?' }],
        })
        expect(JSON.stringify(speakers)).not.toContain('X123')
        expect(JSON.stringify(speakers)).not.toContain('secret-link')
    })

    test('proposeAddFaqQuestion needs a categoryName for a new category and spots updates', async () => {
        expectRejected(
            await propose('proposeAddFaqQuestion', {
                question: { categoryId: 'new', question: 'Q?', answer: 'A', order: 0, categoryOrder: 1 },
            }),
            /pass categoryName to create it/
        )
        const update = expectProposal(
            await propose('proposeAddFaqQuestion', {
                question: {
                    id: 'q1',
                    categoryId: 'venue',
                    question: 'Where?',
                    answer: 'Lyon',
                    order: 0,
                    categoryOrder: 0,
                },
            })
        )
        expect(update.summary).toBe('Update FAQ question "Where?" in Venue')
        expect(update.endpoint.method).toBe('POST')
        expect(update.diff.before).toMatchObject({ answer: 'Paris' })
    })

    test('proposeAddFaqQuestion refuses to copy an existing question into another category', async () => {
        expectRejected(
            await propose('proposeAddFaqQuestion', {
                question: {
                    id: 'q1',
                    categoryId: 'speakers',
                    question: 'Where?',
                    answer: 'Lyon',
                    order: 0,
                    categoryOrder: 1,
                },
            }),
            'FAQ question q1 belongs to category venue: pass that categoryId (moving a question is not supported)'
        )
    })

    test('FAQ proposals read one category, never the whole FAQ', async () => {
        const fullRead = vi.mocked(FaqDao.getFullFaqs)
        expectProposal(
            await propose('proposeAddFaqQuestion', {
                question: { categoryId: 'venue', question: 'Wifi?', answer: 'Yes', order: 1, categoryOrder: 0 },
            })
        )
        expectProposal(
            await propose('proposeDeleteFaqCategory', { categoryId: 'venue', expectedCategoryName: 'Venue' })
        )
        expect(fullRead).not.toHaveBeenCalled()
        expect(FaqDao.findFaqQuestionCategoryId).not.toHaveBeenCalled()
        expect(FaqDao.getFaqCategory).toHaveBeenCalledWith(expect.anything(), 'evt', 'venue')
    })

    test('FAQ deletes target the category routes, guarded by the text', async () => {
        const question = expectProposal(
            await propose('proposeDeleteFaqQuestion', {
                categoryId: 'venue',
                questionId: 'q1',
                expectedQuestion: 'where?',
            })
        )
        expect(question.endpoint).toEqual({ method: 'DELETE', path: '/v1/evt/faq/categories/venue/questions/q1' })
        expectRejected(
            await propose('proposeDeleteFaqQuestion', {
                categoryId: 'venue',
                questionId: 'q1',
                expectedQuestion: 'When?',
            }),
            /Re-run getFaq/
        )
        const category = expectProposal(
            await propose('proposeDeleteFaqCategory', { categoryId: 'venue', expectedCategoryName: 'Venue' })
        )
        expect(category.summary).toBe('Delete FAQ category Venue and its 1 question')
        expect(category.endpoint.path).toBe('/v1/evt/faq/categories/venue')
    })
})
