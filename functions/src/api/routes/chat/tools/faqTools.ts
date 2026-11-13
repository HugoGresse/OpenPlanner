import { FaqDao } from '../../../dao/faqDao'
import { FaqCategory } from '../../../../../../src/types'
import { Faq } from '../../faq/faq'
import {
    ChatTool,
    endpointFor,
    expectedMismatch,
    expectedParam,
    IRREVERSIBLE,
    objectSchema,
    pickSchemaFields,
    proposed,
    RATIONALE_PARAM,
    rejected,
    snapshot,
    stringArg,
    toJsonSchema,
    ToolContext,
    validateBody,
} from '../toolKit'

// privateId is the secret part of a private FAQ link; the flags are enough for the model.
const toToolCategory = (category: FaqCategory) => ({
    id: category.id,
    name: category.name,
    order: category.order,
    share: category.share ?? false,
    private: category.private ?? false,
    items: (category.items ?? []).map(({ id, question, answer, order }) => ({ id, question, answer, order })),
})

const listFaq = async ({ firebaseApp, eventId }: ToolContext) =>
    (await FaqDao.getFullFaqs(firebaseApp, eventId)).map(toToolCategory)

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
            'List every FAQ category of the event with its questions (id, question, answer, order). `share` tells whether the category is on the public site, `private` whether it is only reachable by its private link.',
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
            const body = pickSchemaFields(args?.question, Faq)
            const invalid = validateBody(Faq, body)
            if (invalid) return rejected(invalid)
            const category = (await listFaq(ctx)).find((item) => item.id === body.categoryId)
            if (!category && !body.categoryName) {
                return rejected(`FAQ category ${body.categoryId} does not exist: pass categoryName to create it`)
            }
            const existing = body.id ? category?.items.find((item) => item.id === body.id) : undefined
            const { categoryId: _c, categoryName: _n, categoryOrder: _o, ...fields } = body
            return proposed('addFaqQuestion', args, {
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
            const category = (await listFaq(ctx)).find((item) => item.id === categoryId)
            const question = category?.items.find((item) => item.id === questionId)
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
            return proposed('deleteFaqQuestion', args, {
                summary: `Delete FAQ question "${question.question}"${IRREVERSIBLE}`,
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
            const category = (await listFaq(ctx)).find((item) => item.id === categoryId)
            if (!category) return rejected(`FAQ category not found: ${categoryId}`)
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
            return proposed('deleteFaqCategory', args, {
                summary: `Delete FAQ category ${category.name} and its ${count} question${
                    count === 1 ? '' : 's'
                }${IRREVERSIBLE}`,
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
