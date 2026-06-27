import { FastifyInstance } from 'fastify'
import Type from 'typebox'
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
    language?: string
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
    language: 'fr-FR',
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
    language: string
}

const LANGUAGE_TO_LOCALE: Record<string, string> = {
    FR: 'fr-FR',
    EN: 'en-US',
}

const normalizeLanguage = (language: string | undefined): string => {
    if (!language) return DEFAULT_SETTINGS.language!
    const upper = language.toUpperCase()
    if (LANGUAGE_TO_LOCALE[upper]) return LANGUAGE_TO_LOCALE[upper]
    // Accept BCP-47 tags like "fr-FR" or "en-GB" verbatim.
    return language
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
    language: normalizeLanguage(settings?.language),
})

// BCP-47 `fr-FR` → POSIX `fr_FR.UTF-8` for the LANG/LC_ALL env vars used
// by Chromium's ICU when picking the default Intl locale.
const toPosixLocale = (bcp47: string): string => {
    const [lang, region] = bcp47.split('-')
    return region ? `${lang}_${region.toUpperCase()}.UTF-8` : `${lang}.UTF-8`
}

// Chromium's --lang flag plus the LANG/LC_ALL env vars are needed to make
// Intl.DateTimeFormat (and therefore Luxon/toLocaleString) default to the
// requested locale. The --lang flag alone is not enough on Cloud Functions
// nor on macOS — ICU still falls back to the process locale.
const launchBrowser = (language: string): Promise<Browser> => {
    const posix = toPosixLocale(language)
    return puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', `--lang=${language}`],
        env: {
            ...process.env,
            LANG: posix,
            LC_ALL: posix,
            LANGUAGE: language,
        },
    })
}

const setupPage = async (browser: Browser, settings: MergedPDFSettings): Promise<Page> => {
    const page = await browser.newPage()
    await page.setViewport({
        width: settings.viewport.width,
        height: settings.viewport.height,
        deviceScaleFactor: settings.viewport.deviceScaleFactor,
    })
    await page.emulateTimezone(settings.timezone)
    await page.setExtraHTTPHeaders({ 'Accept-Language': settings.language })
    // Override navigator.language(s) so client-side `Intl` / `Date` formatting
    // matches the requested locale instead of the headless browser default.
    const language = settings.language
    await page.evaluateOnNewDocument((locale: string) => {
        Object.defineProperty(navigator, 'language', { get: () => locale })
        Object.defineProperty(navigator, 'languages', { get: () => [locale] })
    }, language)
    return page
}

const generatePdfFromPage = async (page: Page, settings: MergedPDFSettings): Promise<Buffer> => {
    const pdfBuffer = await page.pdf({
        format: settings.pdf.format,
        printBackground: true,
        width: settings.pdf.width,
        height: settings.pdf.height,
        scale: settings.pdf.scale,
        landscape: settings.pdf.landscape,
        margin: settings.pdf.margin,
    })
    return Buffer.from(pdfBuffer)
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
        language: Type.Optional(Type.String()),
    })
)

// Map a thrown error to an actionable hint so the 400 body tells the caller what actually went wrong
// (the raw puppeteer message alone is cryptic, e.g. "Could not find Chrome (ver. ...)").
const pdfErrorHint = (message: string): string | undefined => {
    if (/Could not find Chrome|Could not find Chromium|\.puppeteer_cache|browsers install/i.test(message)) {
        return 'Chrome is not installed in the function runtime. The deploy must run the "gcp-build" step (puppeteer browsers install chrome) so the browser is cached in node_modules/.puppeteer_cache.'
    }
    if (/Navigation timeout|TimeoutError|waitUntil/i.test(message)) {
        return 'The page took too long to load. Check the URL is reachable and finishes network activity, or relax the navigation wait.'
    }
    if (/net::ERR|ERR_|ECONNREFUSED|ENOTFOUND|getaddrinfo|DNS/i.test(message)) {
        return 'The URL could not be fetched (network/DNS error). Verify the URL is publicly reachable from the server.'
    }
    if (/Target closed|Protocol error|Session closed|browser has disconnected/i.test(message)) {
        return 'The headless browser crashed mid-render, often due to memory limits. Reduce the page size/number of URLs or increase the function memory.'
    }
    return undefined
}

// Build a richer 400 body: summary, the underlying message, the error class, an actionable hint,
// and the failing context (which URL/index) when available.
const pdfErrorResponse = (
    error: Error,
    summary: string,
    context?: { url?: string; index?: number; total?: number }
): string => {
    const hint = pdfErrorHint(error.message || '')
    return JSON.stringify({
        error: summary,
        details: error.message,
        name: error.name,
        ...(hint ? { hint } : {}),
        ...(context?.url ? { failedUrl: context.url } : {}),
        ...(context && context.index !== undefined ? { failedAt: `${context.index + 1}/${context.total}` } : {}),
    })
}

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

            let browser: Browser | null = null
            let currentIndex = 0
            let currentUrl: string | undefined
            try {
                const mergedSettings = mergeSettings(settings)
                browser = await launchBrowser(mergedSettings.language)
                const merger = new PDFMerger()

                for (const [index, url] of urls.entries()) {
                    currentIndex = index
                    currentUrl = url
                    const page = await setupPage(browser, mergedSettings)
                    await page.goto(url, { waitUntil: 'networkidle0' })
                    const pdfBuffer = await generatePdfFromPage(page, mergedSettings)
                    await merger.add(pdfBuffer as Uint8Array)
                    await page.close()
                }

                const mergedPdf = await merger.saveAsBuffer()

                reply.header('Content-Type', 'application/pdf')
                reply.header('Content-Disposition', 'attachment; filename="document.pdf"')
                reply.send(mergedPdf)
            } catch (err) {
                const error = err as Error
                reply.status(400).send(
                    pdfErrorResponse(error, 'Failed to convert URLs to PDF', {
                        // browser launch fails before any URL is processed; only attach URL context if we got there
                        url: browser ? currentUrl : undefined,
                        index: browser ? currentIndex : undefined,
                        total: urls.length,
                    })
                )
            } finally {
                if (browser) {
                    await browser.close()
                }
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

            let browser: Browser | null = null
            try {
                const mergedSettings = mergeSettings(settings)
                browser = await launchBrowser(mergedSettings.language)
                const merger = new PDFMerger()

                for (const html of htmlContents) {
                    const page = await setupPage(browser, mergedSettings)
                    // puppeteer 25 dropped 'networkidle0' from setContent's waitUntil; wait for the
                    // load event, then for the network to settle to keep the prior behaviour (remote
                    // images/fonts referenced in the HTML finish loading before we render the PDF).
                    await page.setContent(html, { waitUntil: 'load' })
                    await page.waitForNetworkIdle()
                    const pdfBuffer = await generatePdfFromPage(page, mergedSettings)
                    await merger.add(pdfBuffer as Uint8Array)
                    await page.close()
                }

                const mergedPdf = await merger.saveAsBuffer()

                reply.header('Content-Type', 'application/pdf')
                reply.header('Content-Disposition', 'attachment; filename="document.pdf"')
                reply.send(mergedPdf)
            } catch (err) {
                const error = err as Error
                reply.status(400).send(pdfErrorResponse(error, 'Failed to convert HTML to PDF'))
            } finally {
                if (browser) {
                    await browser.close()
                }
            }
        }
    )

    done()
}
