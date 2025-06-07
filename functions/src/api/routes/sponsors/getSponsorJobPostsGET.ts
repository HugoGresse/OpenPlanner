import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { Type } from '@sinclair/typebox'
import { JobPostDao, JobPostResponse } from '../../dao/jobPostDao'
import { SponsorDao } from '../../dao/sponsorDao'
import { JobStatus, JOB_STATUS_VALUES } from '../../../../../src/constants/jobStatus'

export type GetSponsorJobPostsGETTypes = {
    Params: { eventId: string }
    Querystring: { sponsorToken: string; status?: string }
    Reply: { sponsor: any; jobPosts: JobPostResponse[] } | string
}

export const getSponsorJobPostsGETSchema = {
    tags: ['sponsors'],
    summary: 'Get job posts for a specific sponsor using sponsor token',
    params: {
        type: 'object',
        properties: {
            eventId: {
                type: 'string',
                description: 'Event ID',
            },
        },
        required: ['eventId'],
    },
    querystring: {
        type: 'object',
        additionalProperties: false,
        properties: {
            sponsorToken: {
                type: 'string',
                description: 'Sponsor token for authentication',
            },
            status: {
                type: 'string',
                enum: [...JOB_STATUS_VALUES, 'all'],
                description: 'Filter by job post status',
            },
        },
        required: ['sponsorToken'],
    },
    response: {
        200: Type.Object({
            sponsor: Type.Object({
                id: Type.String(),
                name: Type.String(),
                logoUrl: Type.String(),
                website: Type.Union([Type.String(), Type.Null()]),
            }),
            jobPosts: Type.Array(
                Type.Object({
                    id: Type.String(),
                    sponsorId: Type.String(),
                    title: Type.String(),
                    description: Type.String(),
                    location: Type.String(),
                    externalLink: Type.String(),
                    category: Type.String(),
                    salary: Type.Optional(Type.String()),
                    requirements: Type.Optional(Type.Array(Type.String())),
                    contactEmail: Type.Optional(Type.String()),
                    status: Type.Enum(JobStatus as Record<string, string>),
                    createdAt: Type.Any(),
                })
            ),
        }),
        400: Type.String(),
        401: Type.String(),
    },
}

export const getSponsorJobPostsRouteHandler = (fastify: FastifyInstance) => {
    return async (
        request: FastifyRequest<{
            Params: { eventId: string }
            Querystring: { sponsorToken: string; status?: string }
        }>,
        reply: FastifyReply
    ) => {
        try {
            const { eventId } = request.params
            const { sponsorToken, status } = request.query

            // Find the sponsor by token
            const sponsorData = await SponsorDao.findSponsorByToken(fastify.firebase, eventId, sponsorToken)

            if (!sponsorData) {
                reply.status(401).send('Invalid sponsor token')
                return
            }

            // Get job posts for this sponsor
            const jobPosts = await JobPostDao.getJobPostsBySponsor(
                fastify.firebase,
                eventId,
                sponsorData.sponsor.id,
                status
            )

            reply.status(200).send({
                sponsor: {
                    id: sponsorData.sponsor.id,
                    name: sponsorData.sponsor.name,
                    logoUrl: sponsorData.sponsor.logoUrl,
                    website: sponsorData.sponsor.website,
                },
                jobPosts,
            })
        } catch (error: unknown) {
            console.error('Error retrieving sponsor job posts:', error)
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
            reply.status(400).send(`Failed to retrieve sponsor job posts: ${errorMessage}`)
        }
    }
}
