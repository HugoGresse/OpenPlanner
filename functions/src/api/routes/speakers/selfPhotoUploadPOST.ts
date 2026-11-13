import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import Type from 'typebox'
import { extractMultipartFormData } from '../file/utils/parseMultipartFiles'
import { uploadBufferToStorage } from '../file/utils/uploadBufferToStorage'
import { checkFileTypes } from '../../other/checkFileTypes'
import { EventDao } from '../../dao/eventDao'
import { SpeakerEditRateLimitDao } from '../../dao/speakerEditRateLimitDao'

// Hard whitelist of MIME types speakers may upload as their profile photo.
// SVG is intentionally excluded — it can carry inline <script> and is
// rendered as HTML by many browsers, so allowing it here would let a
// speaker inject script that runs on every page that embeds their photo.
const ALLOWED_PHOTO_MIMES = new Set<string>(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB

export type SelfPhotoUploadPOSTTypes = {
    Params: { eventId: string; speakerId: string }
    Querystring: { t?: string }
    Reply: { success: boolean; publicFileUrl?: string; error?: string }
}

export const selfPhotoUploadPOSTSchema = {
    tags: ['speakers'],
    summary: 'Public: speaker uploads a new photo through magic-link token (stored under pending-edits/)',
    consumes: ['multipart/form-data'],
    params: {
        type: 'object',
        properties: {
            eventId: { type: 'string' },
            speakerId: { type: 'string' },
        },
        required: ['eventId', 'speakerId'],
    },
    querystring: {
        type: 'object',
        properties: { t: { type: 'string' } },
        required: ['t'],
    },
    body: {
        type: 'object',
        properties: {
            anyKey: {
                type: 'object',
                description: 'multipart/form-data — one file (photo) as value',
            },
        },
    },
    response: {
        200: Type.Object({ success: Type.Boolean(), publicFileUrl: Type.String() }),
        400: Type.Object({ success: Type.Boolean(), error: Type.String() }),
        401: Type.Object({ success: Type.Boolean(), error: Type.String() }),
        404: Type.Object({ success: Type.Boolean(), error: Type.String() }),
        429: Type.Object({ success: Type.Boolean(), error: Type.String() }),
    },
}

export const selfPhotoUploadRouteHandler = (fastify: FastifyInstance) => {
    return async (
        request: FastifyRequest<{
            Params: { eventId: string; speakerId: string }
        }>,
        reply: FastifyReply
    ) => {
        const ctx = request.speakerEditTokenContext
        if (!ctx) {
            reply.status(401).send({ success: false, error: 'Unauthorized' })
            return
        }
        if (ctx.usedAt) {
            reply.status(401).send({ success: false, error: 'Token already used' })
            return
        }

        const { eventId, speakerId } = request.params

        // Re-check the feature flag even though we already have a valid token.
        // Disabling self-edit on the event should immediately prevent further
        // storage writes — without this check a previously-issued token could
        // be reused to keep uploading photos and cost storage indefinitely.
        const event = await EventDao.getEvent(fastify.firebase, eventId).catch(() => null)
        if (!event || !event.speakerSelfEdit?.enabled) {
            reply.status(404).send({ success: false, error: 'Feature not enabled' })
            return
        }

        // Per-speaker daily upload cap. The submit token is single-use, but
        // the photo endpoint accepts repeated calls during the 7-day token
        // lifetime — without this check a leaked or shared token could be
        // replayed to fill the storage bucket. Counter is keyed on speakerId
        // so it survives the speaker requesting a fresh magic link.
        const photoLimit = await SpeakerEditRateLimitDao.incrementAndCheckPhotoUpload(
            fastify.firebase,
            eventId,
            speakerId
        )
        if (!photoLimit.allowed) {
            reply.status(429).send({ success: false, error: 'Daily upload limit reached' })
            return
        }

        const result = await extractMultipartFormData(request.raw)
        if (!result || !result.uploads || Object.keys(result.uploads).length === 0) {
            reply.status(400).send({ success: false, error: 'Missing file' })
            return
        }

        const firstKey = Object.keys(result.uploads)[0]
        const buffer = result.uploads[firstKey]

        // Enforce a hard size cap independent of busboy's transport limit:
        // accidental large files waste storage and pending-edit quota.
        if (buffer.length > MAX_PHOTO_SIZE_BYTES) {
            reply.status(400).send({ success: false, error: 'File too large (max 5 MB)' })
            return
        }

        // Sniff the buffer magic bytes (file-type lib) and refuse anything
        // outside the explicit image whitelist. Do NOT trust the client
        // filename or the multipart Content-Type — both are attacker-
        // controlled. This is the only gate that prevents an EXE/PDF/SVG
        // from landing under a `photoUrl` that admins later approve and
        // browsers may render inline.
        const fileType = await checkFileTypes(buffer, firstKey)
        if (!fileType || !ALLOWED_PHOTO_MIMES.has(fileType.mime)) {
            reply.status(400).send({
                success: false,
                error: 'Unsupported file type. Allowed: JPEG, PNG, WebP, GIF.',
            })
            return
        }

        const safeName = `pending-edit-${speakerId}-${Date.now()}`

        const [success, publicFileUrlOrError] = await uploadBufferToStorage(fastify.firebase, buffer, eventId, safeName)

        if (!success) {
            reply.status(400).send({ success: false, error: publicFileUrlOrError })
            return
        }

        reply.status(200).send({ success: true, publicFileUrl: publicFileUrlOrError })
    }
}
