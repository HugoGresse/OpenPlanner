import { readFileSync } from 'node:fs'
import { deepMerge, isPlainObject, JsonObject, setPath } from './paths.js'

const readStdin = (): string => readFileSync(0, 'utf8')

export const parseData = (raw: string | undefined, stdin: () => string = readStdin): unknown => {
    if (raw === undefined) return undefined
    const text = raw === '-' ? stdin() : raw.startsWith('@') ? readFileSync(raw.slice(1), 'utf8') : raw
    try {
        return JSON.parse(text)
    } catch (error) {
        throw new Error(
            `--data is not valid JSON (use inline JSON, @file.json or - for stdin): ${(error as Error).message}`
        )
    }
}

const coerceValue = (raw: string): unknown => {
    try {
        return JSON.parse(raw)
    } catch {
        return raw
    }
}

export const parseAssignments = (pairs: string[] = []): JsonObject => {
    const result: JsonObject = {}
    for (const pair of pairs) {
        const index = pair.indexOf('=')
        if (index <= 0) throw new Error(`--set expects key=value, got "${pair}"`)
        setPath(result, pair.slice(0, index), coerceValue(pair.slice(index + 1)))
    }
    return result
}

export type DataOptions = { data?: string; set?: string[] }

export const buildBody = (options: DataOptions, required = true): JsonObject => {
    const fromData = parseData(options.data)
    if (fromData !== undefined && !isPlainObject(fromData)) {
        throw new Error('--data must be a JSON object for this command')
    }
    const body = deepMerge(fromData ?? {}, parseAssignments(options.set))
    if (required && Object.keys(body).length === 0) {
        throw new Error('Nothing to send: pass --data <json|@file|-> and/or --set key=value')
    }
    return body
}

export const parsePairs = (pairs: string[] = [], separator = '='): Record<string, string> =>
    Object.fromEntries(
        pairs.map((pair) => {
            const index = pair.indexOf(separator)
            if (index <= 0) throw new Error(`Expected key${separator}value, got "${pair}"`)
            return [pair.slice(0, index).trim(), pair.slice(index + 1).trim()]
        })
    )

export const collect = (value: string, previous: string[] = []): string[] => [...previous, value]
