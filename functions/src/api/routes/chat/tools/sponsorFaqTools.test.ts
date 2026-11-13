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
        private: true,
        privateId: 'secret-link',
        items: [{ id: 'q1', question: 'Where?', answer: 'Paris', order: 0 }],
    },
]

describe('sponsor and job post tools', () => {
    beforeEach(() => {
        vi.spyOn(SponsorDao, 'getSponsors').mockResolvedValue(categories as never)
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
        expect(category.summary).toBe('Delete sponsor category Gold and its 2 sponsors (cannot be undone)')
        expect(category.endpoint.path).toBe('/v1/evt/sponsors/categories/gold')
        expect(category.diff).toEqual({ before: { name: 'Gold', sponsors: ['ACME', 'Globex'] }, after: null })
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
            /status must be one of/
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
    })
    afterEach(() => vi.restoreAllMocks())

    test('getFaq returns every category with its flags but never the private link id', async () => {
        const [category] = (await read('getFaq')) as Array<Record<string, unknown>>
        expect(category).toMatchObject({ id: 'venue', share: true, private: true })
        expect(JSON.stringify(category)).not.toContain('secret-link')
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
        expect(category.summary).toBe('Delete FAQ category Venue and its 1 question (cannot be undone)')
        expect(category.endpoint.path).toBe('/v1/evt/faq/categories/venue')
    })
})
