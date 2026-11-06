export type JsonObject = Record<string, unknown>

const FORBIDDEN_SEGMENTS = new Set(['__proto__', 'constructor', 'prototype'])

export const splitPath = (path: string): string[] => {
    const keys = path.split('.').filter(Boolean)
    if (keys.length === 0) throw new Error(`Empty key in "${path}"`)
    const forbidden = keys.find((key) => FORBIDDEN_SEGMENTS.has(key))
    if (forbidden) throw new Error(`"${forbidden}" is not allowed in key "${path}"`)
    return keys
}

export const isPlainObject = (value: unknown): value is JsonObject =>
    typeof value === 'object' && value !== null && !Array.isArray(value)

export const setPath = (target: JsonObject, path: string, value: unknown): void => {
    const keys = splitPath(path)
    let cursor = target
    for (const key of keys.slice(0, -1)) {
        const next = cursor[key]
        if (next === undefined) cursor[key] = {}
        else if (!isPlainObject(next)) {
            throw new Error(`Cannot set "${path}": "${key}" is already a ${Array.isArray(next) ? 'list' : typeof next}`)
        }
        cursor = cursor[key] as JsonObject
    }
    cursor[keys[keys.length - 1]] = value
}

export const deepMerge = (base: JsonObject, patch: JsonObject): JsonObject => {
    const merged: JsonObject = { ...base }
    for (const [key, value] of Object.entries(patch)) {
        merged[key] = isPlainObject(value) && isPlainObject(merged[key]) ? deepMerge(merged[key], value) : value
    }
    return merged
}
