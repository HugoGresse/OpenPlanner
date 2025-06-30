import { DateTime } from 'luxon'

interface FlattenedObject {
    [key: string]: any
}

export const flattenObject = (obj: any, prefix: string = '', convertDateToISO = true): FlattenedObject => {
    let result: FlattenedObject = {}

    for (let key in obj) {
        if (obj.hasOwnProperty(key)) {
            const value = obj[key]
            const newKey = prefix ? `${prefix}.${key}` : key

            if (typeof value === 'object' && value !== null) {
                if (convertDateToISO && value instanceof Date) {
                    result[newKey] = value.toISOString()
                } else if (convertDateToISO && value instanceof DateTime) {
                    result[newKey] = value.toISO()
                } else if (Array.isArray(value)) {
                    value.forEach((item, index) => {
                        const arrayKey = `${newKey}[${index}]`
                        if (typeof item === 'object' && item !== null) {
                            result = { ...result, ...flattenObject(item, arrayKey) }
                        } else {
                            result[arrayKey] = item
                        }
                    })
                } else {
                    result = { ...result, ...flattenObject(value, newKey) }
                }
            } else {
                result[newKey] = value
            }
        }
    }

    return result
}
