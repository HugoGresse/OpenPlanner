import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import Type, { Static } from 'typebox'
import { EventDao } from '../../dao/eventDao'
import { SpeakerDao } from '../../dao/speakerDao'
import { SpeakerEditTokenDao } from '../../dao/speakerEditTokenDao'
import { SpeakerEditRateLimitDao } from '../../dao/speakerEditRateLimitDao'
import { verifyCaptchaToken } from '../../other/captchaVerify'
import { sendTriggerEmail } from '../../other/sendTriggerEmail'

const TypeBoxRequestEditLink = Type.Object(
    {
        email: Type.String({ format: 'email', maxLength: 320 }),
        captchaToken: Type.String({ maxLength: 4000 }),
        publicBaseUrl: Type.Optional(Type.String({ format: 'uri', maxLength: 500 })),
    },
    { additionalProperties: false }
)

export type RequestEditLinkType = Static<typeof TypeBoxRequestEditLink>

export type RequestEditLinkPOSTTypes = {
    Params: { eventId: string }
    Body: RequestEditLinkType
    Reply: { success: boolean }
}

export const requestEditLinkPOSTSchema = {
    tags: ['speakers'],
    summary: 'Public: speaker requests a magic edit link by email',
    description:
        'Speaker submits their email and a captcha token. If the email matches a speaker on this event and the feature is enabled, an email is sent containing a magic link. Always returns the same generic success to prevent enumeration.',
    params: {
        type: 'object',
        properties: { eventId: { type: 'string' } },
        required: ['eventId'],
    },
    body: TypeBoxRequestEditLink,
    response: {
        200: Type.Object({ success: Type.Boolean() }),
        400: Type.Object({ success: Type.Boolean(), error: Type.String() }),
        404: Type.String(),
    },
}

const renderEmail = (speakerName: string, eventName: string, link: string, lang: 'fr' | 'en') => {
    if (lang === 'fr') {
        return {
            subject: `Modifier votre profil — ${eventName}`,
            text: `Bonjour ${speakerName},\n\nVous avez demandé un lien pour modifier votre profil public pour l'événement "${eventName}".\n\nCliquez ici (valable 7 jours) :\n${link}\n\nVos modifications seront vérifiées par un administrateur avant d'être publiées.\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez cet email.`,
        }
    }
    return {
        subject: `Edit your profile — ${eventName}`,
        text: `Hello ${speakerName},\n\nYou requested a link to edit your public profile for "${eventName}".\n\nClick here (valid 7 days):\n${link}\n\nYour changes will be reviewed by an administrator before going live.\n\nIf you did not request this, ignore this email.`,
    }
}

export const requestEditLinkRouteHandler = (fastify: FastifyInstance) => {
    return async (
        request: FastifyRequest<{
            Params: { eventId: string }
            Body: RequestEditLinkType
        }>,
        reply: FastifyReply
    ) => {
        const { eventId } = request.params
        const { email, captchaToken, publicBaseUrl } = request.body

        const captchaOk = await verifyCaptchaToken(captchaToken)
        if (!captchaOk) {
            reply.status(400).send({ success: false, error: 'Invalid captcha' })
            return
        }

        const ip = (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || request.ip
        if (ip) {
            const ipCheck = await SpeakerEditRateLimitDao.incrementAndCheckIp(fastify.firebase, eventId, ip)
            if (!ipCheck.allowed) {
                reply.status(200).send({ success: true })
                return
            }
        }

        const emailCheck = await SpeakerEditRateLimitDao.incrementAndCheckEmail(fastify.firebase, eventId, email)
        if (!emailCheck.allowed) {
            reply.status(200).send({ success: true })
            return
        }

        let event
        try {
            event = await EventDao.getEvent(fastify.firebase, eventId)
        } catch {
            reply.status(404).send('Event not found')
            return
        }

        if (!event.speakerSelfEdit?.enabled) {
            reply.status(404).send('Feature not enabled')
            return
        }

        const speakers = await SpeakerDao.getSpeakers(fastify.firebase, eventId)
        const normalized = email.toLowerCase().trim()
        const matching = speakers.find((s) => s.email && s.email.toLowerCase().trim() === normalized)

        if (!matching) {
            reply.status(200).send({ success: true })
            return
        }

        const { rawToken } = await SpeakerEditTokenDao.createToken(fastify.firebase, eventId, matching.id, ip)

        const baseUrl = publicBaseUrl || process.env.PUBLIC_APP_URL || ''
        const link = `${baseUrl.replace(/\/$/, '')}/public/event/${eventId}/speaker-edit/${matching.id}?t=${rawToken}`

        const lang: 'fr' | 'en' = 'en'
        const email_ = renderEmail(matching.name, event.name, link, lang)

        try {
            await sendTriggerEmail(
                fastify.firebase,
                { to: matching.email as string, subject: email_.subject, text: email_.text },
                { eventId, speakerId: matching.id, type: 'speaker-edit-link' }
            )
        } catch (err) {
            console.error('Failed to queue speaker edit email', err)
        }

        reply.status(200).send({ success: true })
    }
}
