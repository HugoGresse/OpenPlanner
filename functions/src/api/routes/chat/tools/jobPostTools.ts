import { JobPostDao, JobPostResponse } from '../../../dao/jobPostDao'
import { dateToString } from '../../../other/dateConverter'
import { JOB_STATUS_VALUES } from '../../../../../../src/constants/jobStatus'
import { TypeBoxJobPostStatus } from '../../sponsors/approveJobPostPUT'
import {
    ChatTool,
    DraftResult,
    endpointFor,
    expectedMismatch,
    expectedParam,
    fieldsParam,
    listLimit,
    objectSchema,
    parseBody,
    projectFields,
    proposed,
    RATIONALE_PARAM,
    rejected,
    stringArg,
    toJsonSchema,
    ToolArgs,
    ToolContext,
} from '../toolKit'

type ToolJobPost = Omit<JobPostResponse, 'createdAt'> & { createdAt: string | null; status?: string }

const toToolJobPost = (post: JobPostResponse): ToolJobPost => ({
    ...post,
    createdAt: dateToString(post.createdAt as never) || null,
})

const jobPostParams = {
    jobPostId: { type: 'string' },
    expectedJobPostTitle: expectedParam("job post's `title`", 'listJobPosts'),
}

const ALLOWED_JOB_POST_FIELDS = [
    'id',
    'title',
    'sponsorId',
    'status',
    'category',
    'location',
    'createdAt',
    'description',
    'requirements',
    'salary',
    'externalLink',
    'contactEmail',
] as const
const DEFAULT_JOB_POST_FIELDS = ['id', 'title', 'sponsorId', 'status', 'category', 'location', 'createdAt'] as const

// Same lookups as GET /sponsors/jobPosts (by sponsor or for the whole event, optional status filter).
const listJobPosts = async ({ firebaseApp, eventId }: ToolContext, args: ToolArgs) => {
    const status = JOB_STATUS_VALUES.includes(args.status) ? args.status : undefined
    const posts = args.sponsorId
        ? await JobPostDao.getJobPostsBySponsor(firebaseApp, eventId, args.sponsorId, status)
        : await JobPostDao.getAllJobPosts(firebaseApp, eventId, status)
    return posts
        .slice(0, listLimit(args.limit))
        .map((post) =>
            projectFields(toToolJobPost(post), args.fields, ALLOWED_JOB_POST_FIELDS, DEFAULT_JOB_POST_FIELDS)
        )
}

const resolveJobPost = async (ctx: ToolContext, args: ToolArgs) => {
    const jobPostId = stringArg(args, 'jobPostId')
    if (!jobPostId) return { error: 'jobPostId is required' }
    const post = await JobPostDao.getJobPost(ctx.firebaseApp, ctx.eventId, jobPostId).catch(() => null)
    if (!post) return { error: `Job post not found: ${jobPostId}` }
    const mismatch = expectedMismatch({
        arg: 'expectedJobPostTitle',
        value: args?.expectedJobPostTitle,
        actual: post.title,
        entity: 'job post',
        id: jobPostId,
        listTool: 'listJobPosts',
    })
    return mismatch ? { error: mismatch } : { post: toToolJobPost({ ...post, id: jobPostId }), jobPostId }
}

const buildSetStatus = async (ctx: ToolContext, args: ToolArgs): Promise<DraftResult> => {
    const parsed = parseBody(TypeBoxJobPostStatus, { status: args?.status })
    if (parsed.error !== undefined) return rejected(parsed.error)
    const { status } = parsed.value
    const resolved = await resolveJobPost(ctx, args)
    if (resolved.error !== undefined) return rejected(resolved.error)
    const { post, jobPostId } = resolved
    if (post.status === status) return rejected(`Job post ${jobPostId} is already ${status}`)
    return proposed(args, {
        summary: `Set job post ${post.title} to ${status}`,
        endpoint: endpointFor('jobPosts.setStatus', { eventId: ctx.eventId, jobPostId }, { status }),
        target: { id: jobPostId, label: post.title },
        diff: { before: { status: post.status ?? null }, after: { status } },
    })
}

export const JOB_POST_TOOLS: ChatTool[] = [
    {
        type: 'read',
        name: 'listJobPosts',
        capabilities: ['jobPosts.list', 'jobPosts.get'],
        description: `List the sponsor job board posts, newest first, optionally filtered by status (pending, approved, rejected) and/or sponsorId. Returns ${DEFAULT_JOB_POST_FIELDS.join(
            ', '
        )} by default; pass fields[] for the description, requirements, salary, link or contact.`,
        parameters: objectSchema({
            status: { type: 'string', enum: [...JOB_STATUS_VALUES] },
            sponsorId: { type: 'string' },
            limit: { type: 'integer', minimum: 1, maximum: 500 },
            fields: fieldsParam(ALLOWED_JOB_POST_FIELDS),
        }),
        run: listJobPosts,
    },
    {
        type: 'proposal',
        name: 'proposeSetJobPostStatus',
        kind: 'setJobPostStatus',
        capabilities: ['jobPosts.setStatus'],
        description:
            'Propose moderating a job post: approved (visible on the job board), rejected or pending. Does NOT apply: emits a proposal for user review. Pass expectedJobPostTitle = the title from listJobPosts.',
        parameters: objectSchema(
            {
                ...jobPostParams,
                status: toJsonSchema(TypeBoxJobPostStatus).properties.status,
                rationale: RATIONALE_PARAM,
            },
            ['jobPostId', 'expectedJobPostTitle', 'status']
        ),
        build: buildSetStatus,
    },
    {
        type: 'proposal',
        name: 'proposeDeleteJobPost',
        kind: 'deleteJobPost',
        capabilities: ['jobPosts.delete'],
        description:
            'Propose deleting a job post (irreversible; prefer status rejected to hide it). Does NOT apply: the user confirms. Pass expectedJobPostTitle = the title from listJobPosts.',
        parameters: objectSchema({ ...jobPostParams, rationale: RATIONALE_PARAM }, [
            'jobPostId',
            'expectedJobPostTitle',
        ]),
        build: async (ctx, args) => {
            const resolved = await resolveJobPost(ctx, args)
            if (resolved.error !== undefined) return rejected(resolved.error)
            const { post, jobPostId } = resolved
            return proposed(args, {
                summary: `Delete job post ${post.title}`,
                endpoint: endpointFor('jobPosts.delete', { eventId: ctx.eventId, jobPostId }),
                target: { id: jobPostId, label: post.title },
                diff: { before: post, after: null },
            })
        },
    },
]
