import { ApiError } from './client.js'
import { splitPath } from './paths.js'

export type OutputOptions = {
    compact?: boolean
    fields?: string[]
}

type FieldTree = { [key: string]: FieldTree }

const toTree = (fields: string[]): FieldTree => {
    const root: FieldTree = {}
    for (const field of fields) {
        let node = root
        for (const key of splitPath(field)) node = Object.hasOwn(node, key) ? node[key] : (node[key] = {})
    }
    return root
}

const isArrayAddress = (key: string): boolean => key === 'length' || /^\d+$/.test(key)

const project = (value: unknown, tree: FieldTree): unknown => {
    const keys = Object.keys(tree)
    if (keys.length === 0 || value === null || value === undefined) return value
    if (Array.isArray(value)) {
        if (!keys.every(isArrayAddress)) return value.map((item) => project(item, tree))
        if (keys.length === 1 && keys[0] === 'length') return value.length
        return Object.fromEntries(
            keys.map((key) => [key, key === 'length' ? value.length : project(value[Number(key)], tree[key])])
        )
    }
    if (typeof value !== 'object') return value
    const source = value as Record<string, unknown>
    const picked: Record<string, unknown> = {}
    for (const key of keys) {
        if (!Object.hasOwn(source, key)) continue
        const found = project(source[key], tree[key])
        if (found !== undefined) picked[key] = found
    }
    return picked
}

export const pickFields = (value: unknown, fields: string[]): unknown =>
    fields.length === 0 ? value : project(value, toTree(fields))

export const parseFieldList = (raw?: string): string[] =>
    (raw ?? '')
        .split(',')
        .map((field) => field.trim())
        .filter(Boolean)

export const formatOutput = (value: unknown, options: OutputOptions = {}): string => {
    const shaped = pickFields(value, options.fields ?? [])
    if (typeof shaped === 'string') return shaped
    return options.compact ? JSON.stringify(shaped) : JSON.stringify(shaped, null, 2)
}

export const printResult = (value: unknown, options: OutputOptions = {}): void => {
    if (value === undefined) return
    process.stdout.write(formatOutput(value, options) + '\n')
}

export const describeError = (error: unknown): { error: string; status?: number; details?: unknown; url?: string } => {
    if (error instanceof ApiError)
        return { error: error.message, status: error.status, details: error.body, url: error.url }
    if (error instanceof Error) return { error: error.message, details: error.cause }
    return { error: String(error) }
}

export const fail = (error: unknown): never => {
    process.stderr.write(JSON.stringify(describeError(error), null, 2) + '\n')
    process.exit(1)
}

export const exitQuietlyOnClosedStdout = (): void => {
    process.stdout.on('error', (error: NodeJS.ErrnoException) => {
        if (error.code === 'EPIPE') process.exit(0)
        throw error
    })
}
