import { FastifyInstance } from 'fastify'
import { Type } from '@sinclair/typebox'
import puppeteer from 'puppeteer'
import PDFMerger from '../utils/pdf-merger-ts'

interface PDFSettings {
    viewport?: {
        width: number
        height: number
        deviceScaleFactor: number
    }
    pdf?: {
        format?: 'A4' | 'A3' | 'Letter' | 'Legal' | 'Tabloid'
        width?: string
        height?: string
        scale?: number
        landscape?: boolean
        margin?: {
            top: string
            right: string
            bottom: string
            left: string
        }
    }
    timezone?: string
}

export const pdfRoute = (fastify: FastifyInstance, options: any, done: () => any) => {
    fastify.post<{ Body: { urls: string[]; settings?: PDFSettings } }>(
        '/v1/pdf/convert',
        {
            schema: {
                tags: ['pdf'],
                summary: 'Convert multiple HTML URLs to a single PDF',
                body: Type.Object({
                    urls: Type.Array(Type.String()),
                    settings: Type.Optional(
                        Type.Object({
                            viewport: Type.Optional(
                                Type.Object({
                                    width: Type.Number(),
                                    height: Type.Number(),
                                    deviceScaleFactor: Type.Number(),
                                })
                            ),
                            pdf: Type.Optional(
                                Type.Object({
                                    format: Type.Optional(
                                        Type.Union([
                                            Type.Literal('A4'),
                                            Type.Literal('A3'),
                                            Type.Literal('Letter'),
                                            Type.Literal('Legal'),
                                            Type.Literal('Tabloid'),
                                        ])
                                    ),
                                    width: Type.Optional(Type.String()),
                                    height: Type.Optional(Type.String()),
                                    scale: Type.Optional(Type.Number()),
                                    landscape: Type.Optional(Type.Boolean()),
                                    margin: Type.Optional(
                                        Type.Object({
                                            top: Type.String(),
                                            right: Type.String(),
                                            bottom: Type.String(),
                                            left: Type.String(),
                                        })
                                    ),
                                })
                            ),
                            timezone: Type.Optional(Type.String()),
                        })
                    ),
                }),
                response: {
                    200: Type.Object({
                        type: Type.String(),
                        filename: Type.String(),
                    }),
                    400: Type.String(),
                },
                security: [
                    {
                        apiKey: [],
                    },
                ],
            },
            preHandler: fastify.auth([fastify.verifyServiceApiKey]),
        },
        async (request, reply) => {
            const { urls, settings } = request.body

            if (!urls.length) {
                return reply.status(400).send(
                    JSON.stringify({
                        error: 'At least one URL is required',
                    })
                )
            }

            try {
                const browser = await puppeteer.launch({
                    headless: true,
                    args: ['--no-sandbox', '--disable-setuid-sandbox'],
                })
                const merger = new PDFMerger()

                const defaultSettings = {
                    viewport: {
                        width: 1920,
                        height: 1080,
                        deviceScaleFactor: 2,
                    },
                    pdf: {
                        format: 'A4' as const,
                        width: '1920px',
                        height: '1080px',
                        scale: 1,
                        landscape: false,
                        margin: {
                            top: '20px',
                            right: '20px',
                            bottom: '20px',
                            left: '20px',
                        },
                    },
                    timezone: 'UTC',
                } satisfies PDFSettings

                const mergedSettings: PDFSettings = {
                    viewport: { ...defaultSettings.viewport, ...settings?.viewport },
                    pdf: { ...defaultSettings.pdf, ...settings?.pdf },
                    timezone: settings?.timezone ?? defaultSettings.timezone,
                }

                for (const url of urls) {
                    const page = await browser.newPage()
                    const viewportSettings = {
                        width: mergedSettings.viewport?.width ?? defaultSettings.viewport.width,
                        height: mergedSettings.viewport?.height ?? defaultSettings.viewport.height,
                        deviceScaleFactor:
                            mergedSettings.viewport?.deviceScaleFactor ?? defaultSettings.viewport.deviceScaleFactor,
                    }
                    await page.setViewport(viewportSettings)

                    // Set timezone before loading the page
                    await page.emulateTimezone(mergedSettings.timezone ?? 'UTC')

                    await page.goto(url, { waitUntil: 'networkidle0' })

                    const pdfBuffer = await page.pdf({
                        format: mergedSettings.pdf?.format,
                        printBackground: true,
                        width: mergedSettings.pdf?.width,
                        height: mergedSettings.pdf?.height,
                        scale: mergedSettings.pdf?.scale,
                        landscape: mergedSettings.pdf?.landscape,
                        margin: mergedSettings.pdf?.margin,
                    })

                    await merger.add(Buffer.from(pdfBuffer))
                    await page.close()
                }

                await browser.close()
                const mergedPdf = await merger.saveAsBuffer()

                reply.header('Content-Type', 'application/pdf')
                reply.header('Content-Disposition', 'attachment; filename="document.pdf"')
                reply.send(mergedPdf)
            } catch (err) {
                const error = err as Error
                reply.status(400).send(
                    JSON.stringify({
                        error: 'Failed to convert URLs to PDF',
                        details: error.message,
                    })
                )
            }
        }
    )
    done()
}
