import { SponsorDao } from '../../../dao/sponsorDao'
import { SponsorCategory } from '../../../../../../src/types'
import { TypeBoxSponsor } from '../../sponsors/addSponsorsPOST'
import { toApiSponsorCategory } from '../../sponsors/getSponsorsGET'
import {
    ChatTool,
    endpointFor,
    expectedMismatch,
    expectedParam,
    objectSchema,
    parseBody,
    proposed,
    RATIONALE_PARAM,
    rejected,
    stringArg,
    toJsonSchema,
    ToolContext,
} from '../toolKit'

// The REST DTO without the sponsor job-board token (a credential the model has no use for).
const toToolCategory = (category: SponsorCategory) => {
    const dto = toApiSponsorCategory(category)
    return { ...dto, sponsors: dto.sponsors.map(({ jobPostToken: _token, ...sponsor }) => sponsor) }
}

const listCategories = async ({ firebaseApp, eventId }: ToolContext) =>
    (await SponsorDao.getSponsors(firebaseApp, eventId)).map(toToolCategory)

// Proposals resolve the one category they touch instead of loading every sponsor.
const loadCategory = async ({ firebaseApp, eventId }: ToolContext, categoryId: string) => {
    const category = await SponsorDao.getCategory(firebaseApp, eventId, categoryId)
    return category ? toToolCategory(category) : null
}

export const SPONSOR_TOOLS: ChatTool[] = [
    {
        type: 'read',
        name: 'listSponsors',
        capabilities: ['sponsors.list'],
        description:
            'List sponsor categories with their sponsors for the current event (ids, names, logo, website, custom fields). Internal tokens are not included.',
        parameters: objectSchema({}),
        run: (ctx) => listCategories(ctx),
    },
    {
        type: 'proposal',
        name: 'proposeAddSponsor',
        kind: 'addSponsor',
        capabilities: ['sponsors.add'],
        description:
            'Propose adding a sponsor to a category (same body as POST /sponsors). Use the categoryId + categoryName of an existing category from listSponsors, or a new id + name to create the category. website and logoUrl must be absolute URLs. Does NOT apply: emits a proposal for user review.',
        parameters: objectSchema({ sponsor: toJsonSchema(TypeBoxSponsor), rationale: RATIONALE_PARAM }, ['sponsor']),
        build: async (ctx, args) => {
            const parsed = parseBody(TypeBoxSponsor, args?.sponsor)
            if (parsed.error !== undefined) return rejected(parsed.error)
            const body = parsed.value
            const category = await loadCategory(ctx, body.categoryId)
            const where = category ? `to ${category.name}` : `to the new category ${body.categoryName}`
            return proposed(args, {
                summary: `Add sponsor ${body.name} ${where}`,
                endpoint: endpointFor('sponsors.add', { eventId: ctx.eventId }, body),
                target: { id: body.categoryId, label: body.name },
                diff: { before: {}, after: body },
            })
        },
    },
    {
        type: 'proposal',
        name: 'proposeDeleteSponsor',
        kind: 'deleteSponsor',
        capabilities: ['sponsors.delete'],
        description:
            'Propose removing a sponsor from its category (irreversible; the category is kept). Does NOT apply: the user confirms. Pass expectedSponsorName = the sponsor name from listSponsors, and categoryId = the id of its category when you have it.',
        parameters: objectSchema(
            {
                sponsorId: { type: 'string' },
                categoryId: { type: 'string', description: 'Id of the category listing the sponsor (optional).' },
                expectedSponsorName: expectedParam("sponsor's `name`", 'listSponsors'),
                rationale: RATIONALE_PARAM,
            },
            ['sponsorId', 'expectedSponsorName']
        ),
        build: async (ctx, args) => {
            const sponsorId = stringArg(args, 'sponsorId')
            if (!sponsorId) return rejected('sponsorId is required')
            const found = await SponsorDao.findCategoryOfSponsor(
                ctx.firebaseApp,
                ctx.eventId,
                sponsorId,
                stringArg(args, 'categoryId') || undefined
            )
            const category = found ? toToolCategory(found) : null
            const sponsor = category?.sponsors.find((item) => item.id === sponsorId)
            if (!category || !sponsor) return rejected(`Sponsor not found: ${sponsorId}`)
            const mismatch = expectedMismatch({
                arg: 'expectedSponsorName',
                value: args?.expectedSponsorName,
                actual: sponsor.name,
                entity: 'sponsor',
                id: sponsorId,
                listTool: 'listSponsors',
            })
            if (mismatch) return rejected(mismatch)
            return proposed(args, {
                summary: `Delete sponsor ${sponsor.name} from ${category.name}`,
                endpoint: endpointFor('sponsors.delete', { eventId: ctx.eventId, sponsorId }),
                target: { id: sponsorId, label: sponsor.name },
                diff: { before: { ...sponsor, category: category.name }, after: null },
            })
        },
    },
    {
        type: 'proposal',
        name: 'proposeDeleteSponsorCategory',
        kind: 'deleteSponsorCategory',
        capabilities: ['sponsors.deleteCategory'],
        description:
            'Propose deleting a sponsor category AND every sponsor in it (irreversible). Does NOT apply: the user confirms. Pass expectedCategoryName = the category name from listSponsors.',
        parameters: objectSchema(
            {
                categoryId: { type: 'string' },
                expectedCategoryName: expectedParam("category's `name`", 'listSponsors'),
                rationale: RATIONALE_PARAM,
            },
            ['categoryId', 'expectedCategoryName']
        ),
        build: async (ctx, args) => {
            const categoryId = stringArg(args, 'categoryId')
            if (!categoryId) return rejected('categoryId is required')
            const category = await loadCategory(ctx, categoryId)
            if (!category) return rejected(`Sponsor category not found: ${categoryId}`)
            const mismatch = expectedMismatch({
                arg: 'expectedCategoryName',
                value: args?.expectedCategoryName,
                actual: category.name,
                entity: 'sponsor category',
                id: categoryId,
                listTool: 'listSponsors',
            })
            if (mismatch) return rejected(mismatch)
            const count = category.sponsors.length
            return proposed(args, {
                summary: `Delete sponsor category ${category.name} and its ${count} sponsor${count === 1 ? '' : 's'}`,
                endpoint: endpointFor('sponsors.deleteCategory', { eventId: ctx.eventId, categoryId }),
                target: { id: categoryId, label: category.name },
                diff: {
                    before: { name: category.name, sponsors: category.sponsors.map((sponsor) => sponsor.name) },
                    after: null,
                },
            })
        },
    },
]
