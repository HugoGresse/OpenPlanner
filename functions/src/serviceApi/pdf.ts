import { FastifyInstance } from 'fastify'
import { Type } from '@sinclair/typebox'
import puppeteer, { Browser, Page } from 'puppeteer'
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

const DEFAULT_SETTINGS: PDFSettings = {
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
}

interface MergedPDFSettings {
    viewport: {
        width: number
        height: number
        deviceScaleFactor: number
    }
    pdf: {
        format: 'A4' | 'A3' | 'Letter' | 'Legal' | 'Tabloid'
        width: string
        height: string
        scale: number
        landscape: boolean
        margin: {
            top: string
            right: string
            bottom: string
            left: string
        }
    }
    timezone: string
}

const mergeSettings = (settings?: PDFSettings): MergedPDFSettings => ({
    viewport: {
        width: settings?.viewport?.width ?? DEFAULT_SETTINGS.viewport!.width,
        height: settings?.viewport?.height ?? DEFAULT_SETTINGS.viewport!.height,
        deviceScaleFactor: settings?.viewport?.deviceScaleFactor ?? DEFAULT_SETTINGS.viewport!.deviceScaleFactor,
    },
    pdf: {
        format: settings?.pdf?.format ?? DEFAULT_SETTINGS.pdf!.format!,
        width: settings?.pdf?.width ?? DEFAULT_SETTINGS.pdf!.width!,
        height: settings?.pdf?.height ?? DEFAULT_SETTINGS.pdf!.height!,
        scale: settings?.pdf?.scale ?? DEFAULT_SETTINGS.pdf!.scale!,
        landscape: settings?.pdf?.landscape ?? DEFAULT_SETTINGS.pdf!.landscape!,
        margin: settings?.pdf?.margin ?? DEFAULT_SETTINGS.pdf!.margin!,
    },
    timezone: settings?.timezone ?? DEFAULT_SETTINGS.timezone!,
})

const setupPage = async (browser: Browser, settings: MergedPDFSettings): Promise<Page> => {
    const page = await browser.newPage()
    await page.setViewport({
        width: settings.viewport.width,
        height: settings.viewport.height,
        deviceScaleFactor: settings.viewport.deviceScaleFactor,
    })
    await page.emulateTimezone(settings.timezone)
    return page
}

const generatePdfFromPage = async (page: Page, settings: MergedPDFSettings): Promise<Uint8Array> => {
    const pdfBuffer = await page.pdf({
        format: settings.pdf.format,
        printBackground: true,
        width: settings.pdf.width,
        height: settings.pdf.height,
        scale: settings.pdf.scale,
        landscape: settings.pdf.landscape,
        margin: settings.pdf.margin,
    })
    return new Uint8Array(pdfBuffer)
}

const pdfSettingsSchema = Type.Optional(
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
)

export const pdfRoute = (fastify: FastifyInstance, options: any, done: () => any) => {
    // Convert URLs to PDF
    fastify.post<{ Body: { urls: string[]; settings?: PDFSettings } }>(
        '/v1/pdf/convert',
        {
            schema: {
                tags: ['pdf'],
                summary: 'Convert multiple HTML URLs to a single PDF',
                body: Type.Object({
                    urls: Type.Array(Type.String()),
                    settings: pdfSettingsSchema,
                }),
                response: {
                    200: Type.Object({
                        type: Type.String(),
                        filename: Type.String(),
                    }),
                    400: Type.String(),
                },
                security: [{ apiKey: [] }],
            },
            preHandler: fastify.auth([fastify.verifyServiceApiKey]),
        },
        async (request, reply) => {
            const { urls, settings } = request.body

            if (!urls.length) {
                return reply.status(400).send(JSON.stringify({ error: 'At least one URL is required' }))
            }

            try {
                const browser = await puppeteer.launch({
                    headless: true,
                    args: ['--no-sandbox', '--disable-setuid-sandbox'],
                })
                const merger = new PDFMerger()
                const mergedSettings = mergeSettings(settings)

                for (const url of urls) {
                    const page = await setupPage(browser, mergedSettings)
                    await page.goto(url, { waitUntil: 'networkidle0' })
                    const pdfBuffer = await generatePdfFromPage(page, mergedSettings)
                    await merger.add(pdfBuffer)
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

    // Convert HTML content to PDF
    fastify.post<{ Body: { htmlContents: string[]; settings?: PDFSettings } }>(
        '/v1/pdf/convert-html',
        {
            schema: {
                tags: ['pdf'],
                summary: 'Convert multiple HTML strings to a single PDF',
                body: Type.Object({
                    htmlContents: Type.Array(Type.String(), { description: 'Array of HTML content strings' }),
                    settings: pdfSettingsSchema,
                }),
                response: {
                    200: Type.Object({
                        type: Type.String(),
                        filename: Type.String(),
                    }),
                    400: Type.String(),
                },
                security: [{ apiKey: [] }],
            },
            preHandler: fastify.auth([fastify.verifyServiceApiKey]),
        },
        async (request, reply) => {
            const { htmlContents, settings } = request.body

            if (!htmlContents.length) {
                return reply.status(400).send(JSON.stringify({ error: 'At least one HTML content is required' }))
            }

            try {
                const browser = await puppeteer.launch({
                    headless: true,
                    args: ['--no-sandbox', '--disable-setuid-sandbox'],
                })
                const merger = new PDFMerger()
                const mergedSettings = mergeSettings(settings)

                for (const html of htmlContents) {
                    const page = await setupPage(browser, mergedSettings)
                    await page.setContent(html, { waitUntil: 'networkidle0' })
                    const pdfBuffer = await generatePdfFromPage(page, mergedSettings)
                    await merger.add(pdfBuffer)
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
                        error: 'Failed to convert HTML to PDF',
                        details: error.message,
                    })
                )
            }
        }
    )

    done()
}
