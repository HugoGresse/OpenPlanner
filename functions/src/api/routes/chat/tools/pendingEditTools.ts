import { SpeakerDao } from '../../../dao/speakerDao'
import { SpeakerPendingEdit, SpeakerPendingEditDao } from '../../../dao/speakerPendingEditDao'
import { dateToString } from '../../../other/dateConverter'
import {
    BuildProposalResult,
    ChatTool,
    endpointFor,
    expectedParam,
    objectSchema,
    proposed,
    RATIONALE_PARAM,
    rejected,
    snapshot,
    stringArg,
    ToolArgs,
    ToolContext,
} from '../toolKit'
import { checkExpectedSpeakerName, loadSpeaker } from './speakerTools'

const STATUSES = ['pending', 'approved', 'rejected'] as const
type PendingStatus = (typeof STATUSES)[number]
// Same cap as the reject route body.
const MAX_REVIEW_NOTE_LENGTH = 2000

// The token id and submitter IP stay server-side.
const toToolPendingEdit = (edit: SpeakerPendingEdit, speakerName: string | undefined) => ({
    id: edit.id,
    speakerId: edit.speakerId,
    speakerName: speakerName ?? null,
    status: edit.status,
    submittedAt: dateToString(edit.submittedAt as never) || null,
    patch: edit.patch,
    reviewNote: edit.reviewNote ?? null,
})

const requestParams = {
    requestId: { type: 'string', description: 'Pending edit id from listPendingEdits.' },
    expectedSpeakerName: expectedParam('`speakerName`', 'listPendingEdits'),
}

// Loads the request and its speaker and runs the sanity checks shared by approve and reject.
const resolveRequest = async (ctx: ToolContext, args: ToolArgs) => {
    const requestId = stringArg(args, 'requestId')
    if (!requestId) return { error: 'requestId is required' }
    const edit = await SpeakerPendingEditDao.get(ctx.firebaseApp, ctx.eventId, requestId)
    if (!edit) return { error: `Pending edit not found: ${requestId}` }
    if (edit.status !== 'pending') return { error: `Pending edit ${requestId} is already ${edit.status}` }
    const speaker = await loadSpeaker(ctx, edit.speakerId)
    if (!speaker) return { error: `Speaker not found: ${edit.speakerId}` }
    const mismatch = checkExpectedSpeakerName(speaker, args, 'listPendingEdits')
    if (mismatch) return { error: mismatch }
    return { edit, speaker, requestId }
}

const buildDecision = async (
    ctx: ToolContext,
    args: ToolArgs,
    decision: 'approve' | 'reject'
): Promise<BuildProposalResult> => {
    const resolved = await resolveRequest(ctx, args)
    if (resolved.error !== undefined) return rejected(resolved.error)
    const { edit, speaker, requestId } = resolved
    const target = { id: requestId, label: speaker.name }
    if (decision === 'approve') {
        return proposed('approvePendingEdit', args, {
            summary: `Approve the profile edit of ${speaker.name}`,
            endpoint: endpointFor('pendingEdits.approve', { eventId: ctx.eventId, requestId }, {}),
            target,
            diff: { before: snapshot(speaker, Object.keys(edit.patch ?? {})), after: { ...edit.patch } },
        })
    }
    const reviewNote = stringArg(args, 'reviewNote').trim()
    if (reviewNote.length > MAX_REVIEW_NOTE_LENGTH)
        return rejected(`reviewNote is longer than ${MAX_REVIEW_NOTE_LENGTH}`)
    const body = reviewNote ? { reviewNote } : {}
    return proposed('rejectPendingEdit', args, {
        summary: `Reject the profile edit of ${speaker.name}`,
        endpoint: endpointFor('pendingEdits.reject', { eventId: ctx.eventId, requestId }, body),
        target,
        diff: { before: { status: 'pending', patch: edit.patch }, after: { status: 'rejected', ...body } },
    })
}

export const PENDING_EDIT_TOOLS: ChatTool[] = [
    {
        type: 'read',
        name: 'listPendingEdits',
        capabilities: ['pendingEdits.list'],
        description:
            'List the profile changes speakers submitted through their edit link (default: status pending). Each item has the requested patch and the speaker name to pass to the approve / reject tools.',
        parameters: objectSchema({ status: { type: 'string', enum: [...STATUSES] } }),
        run: async ({ firebaseApp, eventId }, args) => {
            const status: PendingStatus = STATUSES.includes(args.status) ? args.status : 'pending'
            const [edits, speakers] = await Promise.all([
                SpeakerPendingEditDao.list(firebaseApp, eventId, status),
                SpeakerDao.getSpeakers(firebaseApp, eventId),
            ])
            const names = new Map(speakers.map((speaker) => [speaker.id, speaker.name]))
            return edits.map((edit) => toToolPendingEdit(edit, names.get(edit.speakerId)))
        },
    },
    {
        type: 'proposal',
        name: 'proposeApprovePendingEdit',
        kind: 'approvePendingEdit',
        capabilities: ['pendingEdits.approve'],
        description:
            'Propose approving a pending speaker edit: once the user confirms, the patch is applied to the speaker and the speaker is emailed. Does NOT apply. Pass expectedSpeakerName = speakerName from listPendingEdits.',
        parameters: objectSchema({ ...requestParams, rationale: RATIONALE_PARAM }, [
            'requestId',
            'expectedSpeakerName',
        ]),
        build: (ctx, args) => buildDecision(ctx, args, 'approve'),
    },
    {
        type: 'proposal',
        name: 'proposeRejectPendingEdit',
        kind: 'rejectPendingEdit',
        capabilities: ['pendingEdits.reject'],
        description:
            'Propose rejecting a pending speaker edit: once the user confirms, the request is closed and the speaker is emailed (with reviewNote when given). Does NOT apply. Pass expectedSpeakerName = speakerName from listPendingEdits.',
        parameters: objectSchema(
            {
                ...requestParams,
                reviewNote: {
                    type: 'string',
                    maxLength: MAX_REVIEW_NOTE_LENGTH,
                    description: 'Optional note sent to the speaker.',
                },
                rationale: RATIONALE_PARAM,
            },
            ['requestId', 'expectedSpeakerName']
        ),
        build: (ctx, args) => buildDecision(ctx, args, 'reject'),
    },
]
