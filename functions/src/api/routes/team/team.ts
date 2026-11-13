import { FastifyInstance } from 'fastify'
import { strictBodyValidatorCompiler } from '../../other/strictValidator'
import { getTeamGETSchema, GetTeamGETTypes, getTeamRouteHandler } from './getTeamGET'
import {
    createTeamMemberPOSTSchema,
    CreateTeamMemberPOSTTypes,
    createTeamMemberRouteHandler,
} from './createTeamMemberPOST'
import {
    deleteTeamMemberDELETESchema,
    DeleteTeamMemberDELETETypes,
    deleteTeamMemberRouteHandler,
} from './deleteTeamMemberDELETE'
import {
    updateTeamMemberPATCHSchema,
    UpdateTeamMemberPATCHTypes,
    updateTeamMemberRouteHandler,
} from './updateTeamMemberPATCH'

export const teamRoutes = (fastify: FastifyInstance, options: any, done: () => any) => {
    fastify.get<GetTeamGETTypes>(
        '/v1/:eventId/team',
        { schema: getTeamGETSchema, preHandler: fastify.auth([fastify.verifyApiKey]) },
        getTeamRouteHandler(fastify)
    )

    fastify.post<CreateTeamMemberPOSTTypes>(
        '/v1/:eventId/team',
        {
            schema: createTeamMemberPOSTSchema,
            validatorCompiler: strictBodyValidatorCompiler,
            preHandler: fastify.auth([fastify.verifyApiKey]),
        },
        createTeamMemberRouteHandler(fastify)
    )

    fastify.patch<UpdateTeamMemberPATCHTypes>(
        '/v1/:eventId/team/:memberId',
        {
            schema: updateTeamMemberPATCHSchema,
            validatorCompiler: strictBodyValidatorCompiler,
            preHandler: fastify.auth([fastify.verifyApiKey]),
        },
        updateTeamMemberRouteHandler(fastify)
    )

    fastify.delete<DeleteTeamMemberDELETETypes>(
        '/v1/:eventId/team/:memberId',
        { schema: deleteTeamMemberDELETESchema, preHandler: fastify.auth([fastify.verifyApiKey]) },
        deleteTeamMemberRouteHandler(fastify)
    )

    done()
}
