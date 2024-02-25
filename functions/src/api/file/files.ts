import { FastifyInstance } from 'fastify'
import { Static, Type } from '@sinclair/typebox'
import { extractMultipartFormData } from './parseMultipartFiles'
import { v4 as uuidv4 } from 'uuid'
import firebase from 'firebase-admin'
import { defineString } from 'firebase-functions/params'
import { checkFileTypes } from '../other/checkFileTypes'

export const NewFile = Type.Any()

export type NewFileType = Static<typeof NewFile>

const FilesOutputs = Type.Union(
    Type.Rest(
        Type.Tuple([
            Type.Array(
                Type.Object({
                    originalName: Type.String(),
                    publicFileUrl: Type.String(),
                })
            ),
            Type.String(),
        ])
    )
)

export type FilesOutputsType = Static<typeof FilesOutputs>

export const filesRoutes = (fastify: FastifyInstance, options: any, done: () => any) => {
    fastify.post<{ Body: NewFileType; Reply: FilesOutputsType }>(
        '/v1/:eventId/files',
        {
            schema: {
                tags: ['files'],
                consumes: ['multipart/form-data'],
                summary: 'Upload many files at once and get stored urls',
                body: {
                    type: 'object',
                    properties: {
                        anyKey: {
                            type: 'object',
                            description:
                                "Put any key (will be used as suffix), and add the file as value. It's multipart/form-data",
                        },
                    },
                },
                response: {
                    201: FilesOutputs,
                    400: Type.String(),
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
            const { eventId } = request.params as { eventId: string }
            const result = await extractMultipartFormData(request.raw)

            if (!result || !result.uploads || Object.keys(result.uploads).length === 0) {
                return reply.status(400).send('Missing file(s)')
            }

            const fileUploads = result.uploads

            const output = []

            for (const file in fileUploads) {
                const buffer = fileUploads[file]

                const [success, publicFileUrlOrError] = await uploadBufferToStorage(
                    fastify.firebase,
                    buffer,
                    eventId,
                    file
                )

                if (!success) {
                    return reply.status(400).send(publicFileUrlOrError)
                }

                output.push({
                    originalName: file,
                    publicFileUrl: publicFileUrlOrError,
                })
            }

            reply.status(201).send(output)
        }
    )
    done()
}

export const uploadBufferToStorage = async (
    firebase: firebase.app.App,
    buffer: Buffer,
    eventId: string,
    fileName: string
): Promise<[boolean, string]> => {
    const storageBucketParam = defineString('BUCKET', {
        input: { resource: { resource: { type: 'storage.googleapis.com/Bucket' } } },
        description:
            'This will automatically populate the selector field with the deploying Cloud Project’s  storage buckets',
    })
    const storageBucket = storageBucketParam.value()

    const fileType = await checkFileTypes(buffer, fileName)

    if (!fileType) {
        return [false, 'Invalid file type']
    }

    const { mime, extension } = fileType

    const bucket = firebase.storage().bucket(storageBucket)
    const path = `events/${eventId}/${uuidv4()}_${fileName}.${extension}`
    const bucketFile = bucket.file(path)

    try {
        await bucketFile.save(buffer, {
            contentType: mime,
            predefinedAcl: 'publicRead',
        })
    } catch (error) {
        console.warn('error uploading file', error)
        const errorString = '' + error
        return [false, 'Error uploading file, ' + errorString]
    }
    await bucketFile.makePublic()

    const publicFileUrl = `https://${bucketFile.bucket.name}.storage.googleapis.com/${bucketFile.name}`

    return [true, publicFileUrl]
}
