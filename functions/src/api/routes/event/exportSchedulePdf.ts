import { Type } from '@sinclair/typebox'
import { FastifyInstance } from 'fastify'
import { EventDao } from '../../dao/eventDao'
import { isDev } from '../../setupFastify'
import { getFirebaseProjectId } from '../../../utils/getFirebaseProjectId'
import { getServiceAPIKey } from '../../../serviceApi/serviceApiKeyPreHandler'
import { getIndividualDays } from '../../../../../src/utils/dates/diffDays'
import { uploadBufferToStorage } from '../file/utils/uploadBufferToStorage'
import { addPdfFileToEvent, getFilesNames, getUploadFilePath } from '../deploy/updateWebsiteActions/getFilesNames'
import { getFileName } from '../../other/getFileName'

const ExportPdfReply = Type.Object({
    pdf: Type.String(),
})

export const exportSchedulePdfRoute = (fastify: FastifyInstance, options: any, done: () => any) => {
    fastify.post<{ Params: { eventId: string }; Body: { apiKey: string } }>(
        '/v1/:eventId/event/export-pdf',
        {
            schema: {
                tags: ['event'],
                summary: 'Export event schedule to PDF',
                description:
                    'Export event schedule to PDF. The PDF will be generated is the event public website is enabled. Do not forget to set the timezone in the event settings. The PDF will be stored in the event storage, and the public file url will be returned. The file will stay the same and will not be deleted if you disable the public website.',
                params: Type.Object({
                    eventId: Type.String(),
                }),
                response: {
                    200: ExportPdfReply,
                    400: Type.String(),
                    401: Type.String(),
                },
                security: [
                    {
                        apiKey: [],
                    },
                ],
            },
            preHandler: fastify.auth([fastify.verifyApiKey]),
        },
        async (request, reply) => {
            const { eventId } = request.params

            const event = await EventDao.getEvent(fastify.firebase, eventId)

            if (!event.publicEnabled) {
                reply.status(401).send(
                    JSON.stringify({
                        error: 'Event is not public',
                    })
                )
                return
            }

            if (!event.files?.public) {
                reply.status(401).send(
                    JSON.stringify({
                        error: 'Missing public file, did you forgot to "Update website" once?',
                    })
                )
                return
            }

            const individualEventDaysAsyearMonthDay = getIndividualDays(event.dates.start, event.dates.end)
            const scheduleUrls = individualEventDaysAsyearMonthDay.map((day) => {
                return `https://openplanner.fr/public/event/${eventId}/schedule/${day.start.toFormat(
                    'yyyy-MM-dd'
                )}?hideHeader=true`
            })

            const timezone = event.timezone

            try {
                const firebaseProjectId = getFirebaseProjectId()
                const serviceApiKey = getServiceAPIKey()
                const pdfServiceUrl = isDev()
                    ? `http://localhost:5001/${firebaseProjectId}/europe-west1/serviceApi`
                    : `https://serviceapi.openplanner.fr`
                const response = await fetch(`${pdfServiceUrl}/v1/pdf/convert?apiKey=${serviceApiKey}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        urls: scheduleUrls,
                        settings: {
                            viewport: {
                                width: 4200,
                                height: 8000,
                                deviceScaleFactor: 4,
                            },
                            pdf: {
                                format: 'A3',
                                landscape: false,
                                scale: 0.65,
                                margin: {
                                    top: '0px',
                                    right: '0px',
                                    bottom: '0px',
                                    left: '0px',
                                },
                            },
                            timezone: timezone,
                        },
                    }),
                })

                if (!response.ok) {
                    console.error(await response.text())
                    throw new Error(`PDF service responded with status: ${response.status}`)
                }

                const pdfFilePath = await addPdfFileToEvent(fastify.firebase, event)
                const pdfFileName = getFileName(pdfFilePath).replace('.pdf', '')

                const pdfArrayBuffer = await response.arrayBuffer()
                const pdfBuffer = Buffer.from(pdfArrayBuffer)

                const [success, publicFileUrlOrError] = await uploadBufferToStorage(
                    fastify.firebase,
                    pdfBuffer,
                    eventId,
                    pdfFileName,
                    false
                )

                if (!success) {
                    return reply.status(400).send(publicFileUrlOrError)
                }

                if (!event.files?.pdf) {
                    const updatedEvent = await EventDao.getEvent(fastify.firebase, eventId)
                    const eventFiles = await getFilesNames(fastify.firebase, updatedEvent)
                    const uploadFilePath = getUploadFilePath(eventFiles)
                    return reply.status(200).send({
                        pdf: uploadFilePath.pdf,
                    })
                }

                reply.status(200).send({
                    pdf: getUploadFilePath(event.files).pdf,
                })
            } catch (err) {
                const error = err as Error
                reply.status(400).send(
                    JSON.stringify({
                        error: 'Failed to generate PDF',
                        details: error.message,
                    })
                )
            }
        }
    )
    done()
}
