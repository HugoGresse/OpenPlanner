import { FastifyInstance } from 'fastify'
import { updateSpeakerPATCHSchema, UpdateSpeakerPATCHTypes, updateSpeakerRouteHandler } from './updateSpeakerPATCH'
import { getSpeakersGETSchema, GetSpeakersGETTypes, getSpeakersRouteHandler } from './getSpeakersGET'
import { getSpeakerGETSchema, GetSpeakerGETTypes, getSpeakerRouteHandler } from './getSpeakerGET'
import { deleteSpeakerDELETESchema, DeleteSpeakerDELETETypes, deleteSpeakerRouteHandler } from './deleteSpeakerDELETE'
import { requestEditLinkPOSTSchema, RequestEditLinkPOSTTypes, requestEditLinkRouteHandler } from './requestEditLinkPOST'
import { getSelfSpeakerGETSchema, GetSelfSpeakerGETTypes, getSelfSpeakerRouteHandler } from './getSelfSpeakerGET'
import { submitSelfEditPOSTSchema, SubmitSelfEditPOSTTypes, submitSelfEditRouteHandler } from './submitSelfEditPOST'
import { selfPhotoUploadPOSTSchema, SelfPhotoUploadPOSTTypes, selfPhotoUploadRouteHandler } from './selfPhotoUploadPOST'
import {
    listPendingEditsGETSchema,
    ListPendingEditsGETTypes,
    listPendingEditsRouteHandler,
} from './listPendingEditsGET'
import {
    approvePendingEditPOSTSchema,
    ApprovePendingEditPOSTTypes,
    approvePendingEditRouteHandler,
} from './approvePendingEditPOST'
import {
    rejectPendingEditPOSTSchema,
    RejectPendingEditPOSTTypes,
    rejectPendingEditRouteHandler,
} from './rejectPendingEditPOST'

export const speakersRoutes = (fastify: FastifyInstance, options: any, done: () => any) => {
    fastify.get<GetSpeakersGETTypes>(
        '/v1/:eventId/speakers',
        { schema: getSpeakersGETSchema, preHandler: fastify.auth([fastify.verifyApiKey]) },
        getSpeakersRouteHandler(fastify)
    )

    fastify.get<GetSpeakerGETTypes>(
        '/v1/:eventId/speakers/:speakerId',
        { schema: getSpeakerGETSchema, preHandler: fastify.auth([fastify.verifyApiKey]) },
        getSpeakerRouteHandler(fastify)
    )

    fastify.patch<UpdateSpeakerPATCHTypes>(
        '/v1/:eventId/speakers/:speakerId',
        {
            schema: updateSpeakerPATCHSchema,
            preHandler: fastify.auth([fastify.verifyApiKey]),
        },
        updateSpeakerRouteHandler(fastify)
    )

    fastify.delete<DeleteSpeakerDELETETypes>(
        '/v1/:eventId/speakers/:speakerId',
        { schema: deleteSpeakerDELETESchema, preHandler: fastify.auth([fastify.verifyApiKey]) },
        deleteSpeakerRouteHandler(fastify)
    )

    fastify.post<RequestEditLinkPOSTTypes>(
        '/v1/:eventId/speakers/request-edit-link',
        { schema: requestEditLinkPOSTSchema },
        requestEditLinkRouteHandler(fastify)
    )

    fastify.get<GetSelfSpeakerGETTypes>(
        '/v1/:eventId/speakers/:speakerId/self',
        {
            schema: getSelfSpeakerGETSchema,
            preHandler: fastify.auth([fastify.verifySpeakerEditToken]),
        },
        getSelfSpeakerRouteHandler(fastify)
    )

    fastify.post<SubmitSelfEditPOSTTypes>(
        '/v1/:eventId/speakers/:speakerId/self/submit',
        {
            schema: submitSelfEditPOSTSchema,
            preHandler: fastify.auth([fastify.verifySpeakerEditToken]),
        },
        submitSelfEditRouteHandler(fastify)
    )

    fastify.post<SelfPhotoUploadPOSTTypes>(
        '/v1/:eventId/speakers/:speakerId/self/photo',
        {
            schema: selfPhotoUploadPOSTSchema,
            preHandler: fastify.auth([fastify.verifySpeakerEditToken]),
        },
        selfPhotoUploadRouteHandler(fastify)
    )

    fastify.get<ListPendingEditsGETTypes>(
        '/v1/:eventId/speaker-pending-edits',
        {
            schema: listPendingEditsGETSchema,
            preHandler: fastify.auth([fastify.verifyApiKey]),
        },
        listPendingEditsRouteHandler(fastify)
    )

    fastify.post<ApprovePendingEditPOSTTypes>(
        '/v1/:eventId/speaker-pending-edits/:requestId/approve',
        {
            schema: approvePendingEditPOSTSchema,
            preHandler: fastify.auth([fastify.verifyApiKey]),
        },
        approvePendingEditRouteHandler(fastify)
    )

    fastify.post<RejectPendingEditPOSTTypes>(
        '/v1/:eventId/speaker-pending-edits/:requestId/reject',
        {
            schema: rejectPendingEditPOSTSchema,
            preHandler: fastify.auth([fastify.verifyApiKey]),
        },
        rejectPendingEditRouteHandler(fastify)
    )

    done()
}
