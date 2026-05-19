// Run from /home/user/OpenPlanner/functions:
//   npx ts-node --transpile-only src/serviceApi/checkPdfLocale.ts
//
// Prints what navigator.language and Intl.DateTimeFormat resolve to inside
// the headless browser, plus a sample weekday label. Compare these against
// what you see in the PDF — if Intl here is still `en-US`, the --lang +
// LANG env var combo is being ignored by the local Chromium build.

import puppeteer from 'puppeteer'

const TARGETS = ['fr-FR', 'en-US']

const toPosix = (bcp47: string) => {
    const [lang, region] = bcp47.split('-')
    return region ? `${lang}_${region.toUpperCase()}.UTF-8` : `${lang}.UTF-8`
}

const probe = async (language: string) => {
    const posix = toPosix(language)
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', `--lang=${language}`],
        env: {
            ...process.env,
            LANG: posix,
            LC_ALL: posix,
            LANGUAGE: language,
        },
    })
    try {
        const page = await browser.newPage()
        // Same overrides setupPage does — confirm they are no-ops for Intl.
        await page.evaluateOnNewDocument((locale: string) => {
            Object.defineProperty(navigator, 'language', { get: () => locale })
            Object.defineProperty(navigator, 'languages', { get: () => [locale] })
        }, language)
        await page.goto('about:blank')
        const result = await page.evaluate(() => ({
            navigatorLanguage: navigator.language,
            navigatorLanguages: navigator.languages,
            intlLocale: Intl.DateTimeFormat().resolvedOptions().locale,
            weekday: new Intl.DateTimeFormat(undefined, { weekday: 'long' }).format(new Date('2026-05-18')),
            longDate: new Intl.DateTimeFormat(undefined, { dateStyle: 'full' }).format(new Date('2026-05-18')),
        }))
        console.log(`\n=== requested --lang=${language} (LANG=${posix}) ===`)
        console.log(result)
    } finally {
        await browser.close()
    }
}

;(async () => {
    for (const t of TARGETS) await probe(t)
})()
