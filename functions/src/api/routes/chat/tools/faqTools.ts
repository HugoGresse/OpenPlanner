import { FaqDao } from '../../../dao/faqDao'
import { Faq as FaqQuestion, FaqCategory } from '../../../../../../src/types'
import { Faq } from '../../faq/faq'
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
    snapshot,
    stringArg,
    toJsonSchema,
    ToolContext,
} from '../toolKit'

const isPublic = (category: FaqCategory) => category.share === true && category.private !== true

// privateId is the secret part of a private FAQ link, and the answers of private or unpublished categories
// stay out of the model's reach (the Slack bot answers anyone in the workspace): ids and questions are enough
// to manage them.
const toToolQuestion = (category: FaqCategory, { id, question, answer, order }: FaqQuestion) =>
    isPublic(category) ? { id, question, answer, order } : { id, question, order }

const toToolCategory = (category: FaqCategory) => ({
    id: category.id,
    name: category.name,
    order: category.order,
    share: category.share ?? false,
    private: category.private ?? false,
    items: (category.items ?? []).map((item) => toToolQuestion(category, item)),
})

const listFaq = async ({ firebaseApp, eventId }: ToolContext) =>
    (await FaqDao.getFullFaqs(firebaseApp, eventId)).map(toToolCategory)

// Proposals resolve the one category (and question) they touch instead of loading the whole FAQ.
const loadCategory = ({ firebaseApp, eventId }: ToolContext, categoryId: string, withItems = false) =>
    FaqDao.getFaqCategory(firebaseApp, eventId, categoryId, { withItems })

const loadQuestion = async ({ firebaseApp, eventId }: ToolContext, category: FaqCategory, questionId: string) => {
    const question = await FaqDao.getFaqQuestion(firebaseApp, eventId, category.id, questionId)
    return question ? toToolQuestion(category, question) : null
}

const categoryParams = {
    categoryId: { type: 'string' },
    expectedCategoryName: expectedParam("category's `name`", 'getFaq'),
}

export const FAQ_TOOLS: ChatTool[] = [
    {
        type: 'read',
        name: 'getFaq',
        capabilities: ['faq.list'],
        description:
            'List every FAQ category of the event with its questions (id, question, answer, order). `share` tells whether the category is on the public site, `private` whether it is only reachable by its private link; answers of private or unshared categories are withheld, never guess them.',
        parameters: objectSchema({}),
        run: (ctx) => listFaq(ctx),
    },
    {
        type: 'proposal',
        name: 'proposeAddFaqQuestion',
        kind: 'addFaqQuestion',
        capabilities: ['faq.add'],
        description:
            'Propose adding a FAQ question (same body as POST /faq). Use an existing categoryId from getFaq, or a new id plus categoryName to create the category. order / categoryOrder position the question and the category. Passing the id of an existing question updates it instead. Does NOT apply: emits a proposal for user review.',
        parameters: objectSchema({ question: toJsonSchema(Faq), rationale: RATIONALE_PARAM }, ['question']),
        build: async (ctx, args) => {
            const parsed = parseBody(Faq, args?.question)
            if (parsed.error !== undefined) return rejected(parsed.error)
            const body = parsed.value
            const category = await loadCategory(ctx, body.categoryId)
            const existing = body.id && category ? await loadQuestion(ctx, category, body.id) : null
            if (body.id && !existing) {
                const ownerId = await FaqDao.findFaqQuestionCategoryId(ctx.firebaseApp, ctx.eventId, body.id)
                if (ownerId && ownerId !== body.categoryId) {
                    return rejected(
                        `FAQ question ${body.id} belongs to category ${ownerId}: pass that categoryId (moving a question is not supported)`
                    )
                }
            }
            if (!category && !body.categoryName) {
                return rejected(`FAQ category ${body.categoryId} does not exist: pass categoryName to create it`)
            }
            const { categoryId: _c, categoryName: _n, categoryOrder: _o, ...fields } = body
            return proposed(args, {
                summary: `${existing ? 'Update' : 'Add'} FAQ question "${body.question}" in ${
                    category?.name ?? body.categoryName
                }`,
                endpoint: endpointFor('faq.add', { eventId: ctx.eventId }, body),
                target: { id: body.id ?? body.categoryId, label: body.question },
                diff: { before: existing ? snapshot(existing, Object.keys(fields)) : {}, after: fields },
            })
        },
    },
    {
        type: 'proposal',
        name: 'proposeDeleteFaqQuestion',
        kind: 'deleteFaqQuestion',
        capabilities: ['faq.deleteQuestion'],
        description:
            'Propose deleting one FAQ question (irreversible). Does NOT apply: the user confirms. Pass expectedQuestion = the question text from getFaq.',
        parameters: objectSchema(
            {
                categoryId: { type: 'string' },
                questionId: { type: 'string' },
                expectedQuestion: expectedParam('`question` text', 'getFaq'),
                rationale: RATIONALE_PARAM,
            },
            ['categoryId', 'questionId', 'expectedQuestion']
        ),
        build: async (ctx, args) => {
            const categoryId = stringArg(args, 'categoryId')
            const questionId = stringArg(args, 'questionId')
            if (!categoryId || !questionId) return rejected('categoryId and questionId are required')
            const category = await loadCategory(ctx, categoryId)
            const question = category ? await loadQuestion(ctx, category, questionId) : null
            if (!category || !question) return rejected(`FAQ question not found: ${categoryId}/${questionId}`)
            const mismatch = expectedMismatch({
                arg: 'expectedQuestion',
                value: args?.expectedQuestion,
                actual: question.question,
                entity: 'FAQ question',
                id: questionId,
                listTool: 'getFaq',
            })
            if (mismatch) return rejected(mismatch)
            return proposed(args, {
                summary: `Delete FAQ question "${question.question}"`,
                endpoint: endpointFor('faq.deleteQuestion', { eventId: ctx.eventId, categoryId, questionId }),
                target: { id: questionId, label: question.question },
                diff: { before: { ...question, category: category.name }, after: null },
            })
        },
    },
    {
        type: 'proposal',
        name: 'proposeDeleteFaqCategory',
        kind: 'deleteFaqCategory',
        capabilities: ['faq.deleteCategory'],
        description:
            'Propose deleting a FAQ category AND all its questions (irreversible). Does NOT apply: the user confirms. Pass expectedCategoryName = the category name from getFaq.',
        parameters: objectSchema({ ...categoryParams, rationale: RATIONALE_PARAM }, [
            'categoryId',
            'expectedCategoryName',
        ]),
        build: async (ctx, args) => {
            const categoryId = stringArg(args, 'categoryId')
            if (!categoryId) return rejected('categoryId is required')
            const loaded = await loadCategory(ctx, categoryId, true)
            if (!loaded) return rejected(`FAQ category not found: ${categoryId}`)
            const category = toToolCategory(loaded)
            const mismatch = expectedMismatch({
                arg: 'expectedCategoryName',
                value: args?.expectedCategoryName,
                actual: category.name,
                entity: 'FAQ category',
                id: categoryId,
                listTool: 'getFaq',
            })
            if (mismatch) return rejected(mismatch)
            const count = category.items.length
            return proposed(args, {
                summary: `Delete FAQ category ${category.name} and its ${count} question${count === 1 ? '' : 's'}`,
                endpoint: endpointFor('faq.deleteCategory', { eventId: ctx.eventId, categoryId }),
                target: { id: categoryId, label: category.name },
                diff: {
                    before: { name: category.name, questions: category.items.map((item) => item.question) },
                    after: null,
                },
            })
        },
    },
]
